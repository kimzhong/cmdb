/**
 * Reporting 应用服务
 * 简单聚合查询
 */
import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { LifecycleState } from '@cmdb/shared/types';

@Injectable()
export class ReportingService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  /** 仪表盘总览 */
  async getSummary() {
    const db = this.conn.db;
    if (!db) return null;
    const collections = await db.listCollections().toArray();
    const modelCollections = collections.filter((c) => /^m_/.test(c.name));
    let totalResources = 0;
    const lifecycleDistribution: { group: string; count: number }[] = [];
    for (const c of modelCollections) {
      const count = await db.collection(c.name).countDocuments();
      totalResources += count;
      // 统计 lifecycle.state 分布
      const states = await db.collection(c.name).aggregate([
        { $group: { _id: { $ifNull: ['$lifecycle.state', 'unknown'] }, count: { $sum: 1 } } },
      ]).toArray();
      for (const s of states) {
        lifecycleDistribution.push({ group: `${c.name}.${s._id}`, count: s.count });
      }
    }
    const pendingApprovals = await db.collection('approvals').countDocuments({ status: 'pending' });
    const relations = await db.collection('relations').countDocuments({ status: 'active' });
    return { totalResources, totalRelations: relations, pendingApprovals, lifecycleDistribution };
  }

  /** 生命周期分布 */
  async getLifecycleDistribution() {
    const db = this.conn.db;
    if (!db) return [];
    const collections = (await db.listCollections().toArray()).filter((c) => /^m_/.test(c.name));
    const result: { state: string; count: number }[] = [];
    for (const c of collections) {
      const docs = await db.collection(c.name).aggregate([
        { $group: { _id: { $ifNull: ['$lifecycle.state', 'unknown'] }, count: { $sum: 1 } } },
      ]).toArray();
      for (const d of docs) {
        const existing = result.find((r) => r.state === d._id);
        if (existing) existing.count += d.count;
        else result.push({ state: d._id, count: d.count });
      }
    }
    return result;
  }

  /** 审批待办统计 */
  async getApprovalPending() {
    const db = this.conn.db;
    if (!db) return null;
    const byType = await db.collection('approvals').aggregate([
      { $match: { status: 'pending' } },
      { $group: { _id: '$type', count: { $sum: 1 } } },
    ]).toArray();
    const total = await db.collection('approvals').countDocuments({ status: 'pending' });
    return { byType, total };
  }

  /** IPAM 使用率 */
  async getIpamUsage() {
    const db = this.conn.db;
    if (!db) return [];
    const subnets = await db.collection('ipam_subnets').find().toArray();
    return subnets.map((s) => ({
      subnetId: s._id.toString(),
      cidr: s.cidr,
      total: s.totalAddresses,
      allocated: s.allocatedAddresses ?? 0,
      utilizationPercent: s.totalAddresses > 0 ? Math.round(((s.allocatedAddresses ?? 0) / s.totalAddresses) * 100) : 0,
    }));
  }

  /** 发现执行统计 */
  async getDiscoveryStats(): Promise<any[]> {
    const db = this.conn.db;
    if (!db) return [];
    return db.collection('discovery_tasks').find().toArray();
  }
}
