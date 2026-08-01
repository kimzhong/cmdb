import { Schema, Connection, Model as MongooseModel } from 'mongoose';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ModelsService } from '../meta-model/models/models.service';
import { FieldType, ModelDef, FieldDef } from '../meta-model/models/schemas/model.schema';

/**
 * 动态 Schema 工厂：按 meta_models 里的字段定义，
 * 为每个 ModelDef 动态创建对应的 mongoose Model（集合 m_<uid>）。
 *
 * 关键点：
 * 1. 懒加载：首次访问模型时再创建
 * 2. text 索引：{$**:"text"} 满足全局搜索需求（阶段二）
 * 3. uid 字段建 unique 索引
 * 4. password 字段在 set 时加密、在 get 时脱敏
 * 5. relation 字段：belongsTo 存 ObjectId，connects 存 [ObjectId]
 */
@Injectable()
export class DynamicSchemaFactory implements OnModuleInit {
  private readonly logger = new Logger(DynamicSchemaFactory.name);
  private readonly cache = new Map<string, MongooseModel<any>>();

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly modelsService: ModelsService,
  ) {}

  async onModuleInit() {
    // 启动时把已有模型全部预热（让集合和索引就绪）
    const all = await this.modelsService.findAll();
    for (const m of all) {
      try {
        await this.getModelFor(m);
      } catch (e) {
        this.logger.warn(`预热模型 ${m.uid} 失败: ${(e as Error).message}`);
      }
    }
    this.logger.log(`动态模型工厂就绪，共 ${this.cache.size} 个模型`);
  }

  /** 获取（或创建）指定模型的 mongoose Model */
  async getModelFor(modelDef: ModelDef): Promise<MongooseModel<any>> {
    const uid = modelDef.uid;
    if (this.cache.has(uid)) {
      return this.cache.get(uid)!;
    }

    const collectionName = `m_${uid}`;
    const existing = this.conn.models[uid];
    if (existing) {
      this.cache.set(uid, existing);
      return existing;
    }

    const schema = this.buildSchema(modelDef, collectionName);
    const M: MongooseModel<any> = this.conn.model(uid, schema, collectionName);
    await this.ensureIndexes(M, modelDef);
    this.cache.set(uid, M);
    return M;
  }

  /** 字段定义 → mongoose Schema */
  private buildSchema(modelDef: ModelDef, collectionName: string): Schema {
    const schema: Schema = new Schema({}, {
      collection: collectionName,
      strict: false, // 允许任意字段（业务字段是动态的）
      timestamps: true,
      minimize: false,
    });

    // 为每个字段加 setter / getter
    for (const f of modelDef.fields ?? []) {
      this.applyFieldHook(schema, f);
    }

    return schema;
  }

  private applyFieldHook(schema: Schema, f: FieldDef) {
    if (f.type === FieldType.Password) {
      // 写入时加密；读取时返回密文标记
      schema.path(f.uid).set(function (v: unknown) {
        if (typeof v !== 'string' || v === '' || v.startsWith('enc:')) return v;
        return `enc:${encryptPasswordSafe(v)}`;
      });
      schema.path(f.uid).get(function (v: unknown) {
        // 默认对外暴露密文（前端拿到 'enc:xxx' 自己知道是密文）
        return v;
      });
    }
    // 其他类型在文档层不做特殊处理，统一 strict:false
  }

  private async ensureIndexes(M: MongooseModel<any>, modelDef: ModelDef) {
    const indexes: Array<{ key: Record<string, unknown>; unique?: boolean; name: string }> = [];

    // uid 字段唯一索引
    const uidField = modelDef.fields.find((f) => f.uid === 'uid');
    if (uidField) {
      indexes.push({ key: { uid: 1 }, unique: true, name: 'idx_uid_unique' });
    }

    // 全文索引（阶段二搜索用）
    try {
      indexes.push({ key: { '$**': 'text' }, name: 'idx_fulltext' });
    } catch {
      // 忽略：某些老版本 MongoDB 不支持
    }

    for (const idx of indexes) {
      try {
        await M.collection.createIndex(idx.key as Record<string, 1 | -1>, {
          unique: !!idx.unique,
          name: idx.name,
        });
      } catch (e) {
        this.logger.warn(`索引 ${idx.name} 创建失败: ${(e as Error).message}`);
      }
    }
  }

  /** 模型元数据变更后清掉缓存（让工厂下次重新生成） */
  invalidate(uid: string) {
    this.cache.delete(uid);
  }
}

// 顶层 import（ESM 友好，避免 require）
import { encryptPassword as encryptPasswordSafe } from './crypto.util';
