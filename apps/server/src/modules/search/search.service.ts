import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ModelsService } from '../meta-model/models/models.service';

export interface SearchHit {
  modelUid: string;
  _id: string;
  uid?: string;
  name?: string;
  score: number;
  raw: Record<string, unknown>;
}

/**
 * 解析用户输入的关键字，支持：
 *  - AND（默认空格分隔）："word1 word2" → 必须同时包含
 *  - OR：/word1/word2 → 任一即可
 *  - 排除：-word → 排除包含该词的文档
 *  - 短语："foo bar" → 整体作为一个词
 *
 * MongoDB $text 的 $search 语法：
 *  - "foo bar"  → 空格 AND
 *  - "foo bar" +  -baz   → 排除
 *  - 用空格分隔的多个词相当于 AND；但若用户显式写了 "/"，我们改用 $or 多路合并
 */
function parseQuery(q: string): { mongoText: string; orTerms: string[] } {
  const trimmed = q.trim();
  if (!trimmed) throw new BadRequestException('keyword 不能为空');

  // 提取 /.../ 风格的 OR 段
  const orParts: string[] = [];
  const re = /\/([^/]+)\//g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(trimmed)) !== null) {
    orParts.push(m[1]);
  }
  const rest = trimmed.replace(re, ' ').trim();
  return { mongoText: rest, orTerms: orParts };
}

@Injectable()
export class SearchService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly modelsService: ModelsService,
  ) {}

  /** 全局搜索：跨所有 m_<uid> 集合 */
  async globalSearch(params: { keyword: string; modelUid?: string; limit?: number }): Promise<SearchHit[]> {
    const { keyword, modelUid, limit = 50 } = params;
    const { mongoText, orTerms } = parseQuery(keyword);

    // 决定要查的集合
    let models: Array<{ uid: string; name: string }>;
    if (modelUid) {
      const m = await this.modelsService.findByUid(modelUid);
      models = [{ uid: m.uid, name: m.name }];
    } else {
      const all = await this.modelsService.findAll();
      models = all.map((m) => ({ uid: m.uid, name: m.name }));
    }
    if (models.length === 0) return [];

    const hits: SearchHit[] = [];

    for (const m of models) {
      const collectionName = `m_${m.uid}`;
      const coll = this.conn.collection(collectionName);

      // OR term 走 $regex 任意字段
      const orRegexClauses = orTerms.flatMap((t) => [
        { uid: { $regex: t, $options: 'i' } },
        { name: { $regex: t, $options: 'i' } },
      ]);

      let docs: Array<Record<string, unknown> & { _score?: number }> = [];

      if (mongoText) {
        const cursor = coll
          .find({ $text: { $search: mongoText } }, { projection: { score: { $meta: 'textScore' } } })
          .sort({ score: { $meta: 'textScore' } } as never)
          .limit(limit);
        docs = (await cursor.toArray()) as never;
        // 把 _score 拷出来
        for (const d of docs) {
          (d as { _score?: number })._score = (d as unknown as { score?: number }).score ?? 1;
        }
      }

      // 额外 OR 命中
      if (orRegexClauses.length > 0) {
        const more = (await coll
          .find({ $or: orRegexClauses })
          .limit(limit)
          .toArray()) as Array<Record<string, unknown>>;
        for (const d of more) {
          if (!docs.find((x) => String((x as { _id: { toString(): string } })._id) === String((d as { _id: { toString(): string } })._id))) {
            (d as { _score?: number })._score = 0.5;
            docs.push(d as never);
          }
        }
      }

      for (const d of docs) {
        hits.push({
          modelUid: m.uid,
          _id: String((d as { _id: unknown })._id),
          uid: (d as { uid?: string }).uid,
          name: (d as { name?: string }).name,
          score: (d as { _score?: number })._score ?? 0,
          raw: d,
        });
      }
    }

    // 按 score 降序
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }
}
