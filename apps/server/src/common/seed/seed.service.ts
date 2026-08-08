/**
 * Seed 服务
 * 应用启动时调用,自动 seed 预置数据
 * 各个 collection 只 seed 一次(isSystem 标记),不覆盖用户已修改的数据
 */
import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RELATION_TYPE_SEEDS } from './relation-types.seed';
import { APPROVAL_POLICY_SEEDS } from './approval-policies.seed';
import { MODEL_TEMPLATE_SEEDS } from './model-templates.seed';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(@InjectConnection() private readonly conn: Connection) {}

  async onApplicationBootstrap(): Promise<void> {
    // 仅在非测试环境 seed
    if (process.env.NODE_ENV === 'test' || process.env.SKIP_SEED === 'true') {
      return;
    }
    try {
      await this.seedRelationTypes();
      await this.seedApprovalPolicies();
      await this.seedModelTemplates();
    } catch (e) {
      this.logger.warn(`Seed skipped: ${(e as Error).message}`);
    }
  }

  private async seedRelationTypes(): Promise<void> {
    const db = this.conn.db;
    if (!db) return;
    const exists = await db.listCollections({ name: 'relation_types' }).hasNext();
    if (!exists) return;
    const count = await this.conn.collection('relation_types').countDocuments({ isSystem: true });
    if (count > 0) return;
    await this.conn.collection('relation_types').insertMany(RELATION_TYPE_SEEDS as any);
    this.logger.log(`Seeded ${RELATION_TYPE_SEEDS.length} relation types`);
  }

  private async seedApprovalPolicies(): Promise<void> {
    const db = this.conn.db;
    if (!db) return;
    const exists = await db.listCollections({ name: 'approval_policies' }).hasNext();
    if (!exists) return;
    const count = await this.conn.collection('approval_policies').countDocuments({ isSystem: true });
    if (count > 0) return;
    await this.conn.collection('approval_policies').insertMany(APPROVAL_POLICY_SEEDS as any);
    this.logger.log(`Seeded ${APPROVAL_POLICY_SEEDS.length} approval policies`);
  }

  private async seedModelTemplates(): Promise<void> {
    const db = this.conn.db;
    if (!db) return;
    const exists = await db.listCollections({ name: 'model_templates' }).hasNext();
    if (!exists) return;
    const count = await this.conn.collection('model_templates').countDocuments({ isSystem: true });
    if (count > 0) return;
    await this.conn.collection('model_templates').insertMany(MODEL_TEMPLATE_SEEDS as any);
    this.logger.log(`Seeded ${MODEL_TEMPLATE_SEEDS.length} model templates`);
  }
}
