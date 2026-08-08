/**
 * IPAM 应用服务
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Subnet, SubnetDocument, IpAddress, IpAddressDocument } from '../infra/ipam.schema';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '@cmdb/shared/types/error-code';

@Injectable()
export class IpamService {
  constructor(
    @InjectModel(Subnet.name) private readonly subnetModel: Model<SubnetDocument>,
    @InjectModel(IpAddress.name) private readonly ipModel: Model<IpAddressDocument>,
  ) {}

  // ========== Subnet ==========
  async listSubnets(filter: { scope?: string; environment?: string } = {}) {
    const q: any = {};
    if (filter.scope) q.scope = filter.scope;
    if (filter.environment) q.environment = filter.environment;
    const docs = await this.subnetModel.find(q).sort({ cidr: 1 }).exec();
    return docs.map((d) => this.toSubnetDto(d.toObject()));
  }

  async createSubnet(dto: any) {
    if (!this.validateCidr(dto.cidr)) {
      throw new BusinessException(ErrorCode.IPAM_INVALID_CIDR);
    }
    const total = this.countAddresses(dto.cidr);
    const doc = await this.subnetModel.create({ ...dto, totalAddresses: total });
    // 初始化 IP 表(可选,生产可懒加载)
    return this.toSubnetDto(doc.toObject());
  }

  async getSubnet(id: string) {
    const doc = await this.subnetModel.findById(id);
    if (!doc) throw new NotFoundException(`子网 ${id} 不存在`);
    return this.toSubnetDto(doc.toObject());
  }

  async getSubnetUsage(id: string) {
    const sub = await this.getSubnet(id);
    const counts = await this.ipModel.aggregate([
      { $match: { subnetId: new Types.ObjectId(id) } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byStatus: Record<string, number> = {};
    for (const c of counts) byStatus[c._id] = c.count;
    return {
      ...sub,
      breakdown: byStatus,
      utilizationPercent: sub.totalAddresses > 0 ? Math.round((sub.allocatedAddresses / sub.totalAddresses) * 100) : 0,
    };
  }

  // ========== IP ==========
  async allocate(subnetId: string, ip: string, resourceId: string, actor: string) {
    const addr = await this.ipModel.findOneAndUpdate(
      { subnetId: new Types.ObjectId(subnetId), ip, status: 'available' },
      { $set: { status: 'allocated', resourceId, allocatedAt: new Date(), allocatedBy: actor }, $push: { history: { action: 'allocate', by: actor, at: new Date() } } },
      { new: true },
    );
    if (!addr) {
      // 检查 IP 是否存在
      const exists = await this.ipModel.findOne({ subnetId: new Types.ObjectId(subnetId), ip });
      if (!exists) throw new BusinessException(ErrorCode.IPAM_IP_NOT_FOUND, `IP ${ip} 不在子网内`);
      if (exists.status === 'allocated') throw new BusinessException(ErrorCode.IPAM_IP_CONFLICT, `IP ${ip} 已被分配`);
      throw new BusinessException(ErrorCode.IPAM_IP_NOT_AVAILABLE, `IP ${ip} 状态为 ${exists.status}`);
    }
    await this.subnetModel.findByIdAndUpdate(subnetId, { $inc: { allocatedAddresses: 1 } });
    return addr.toObject();
  }

  async release(subnetId: string, ip: string, actor: string) {
    const addr = await this.ipModel.findOneAndUpdate(
      { subnetId: new Types.ObjectId(subnetId), ip, status: 'allocated' },
      { $set: { status: 'available', resourceId: null, allocatedAt: null, allocatedBy: null }, $push: { history: { action: 'release', by: actor, at: new Date() } } },
      { new: true },
    );
    if (!addr) throw new BusinessException(ErrorCode.IPAM_IP_NOT_FOUND, `IP ${ip} 未分配`);
    await this.subnetModel.findByIdAndUpdate(subnetId, { $inc: { allocatedAddresses: -1 } });
    return addr.toObject();
  }

  async listAddresses(subnetId: string, filter: { status?: string; page?: number; pageSize?: number } = {}) {
    const page = Math.max(1, filter.page ?? 1);
    const pageSize = Math.min(200, filter.pageSize ?? 50);
    const q: any = { subnetId: new Types.ObjectId(subnetId) };
    if (filter.status) q.status = filter.status;
    const [list, total] = await Promise.all([
      this.ipModel.find(q).sort({ ip: 1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
      this.ipModel.countDocuments(q),
    ]);
    return { list, total, page, pageSize };
  }

  async listConflicts() {
    const list = await this.ipModel.find({ status: 'conflict' }).lean();
    return list;
  }

  // ========== Helpers ==========
  private validateCidr(cidr: string): boolean {
    const re = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!re.test(cidr)) return false;
    const [ip, prefix] = cidr.split('/');
    const octets = ip.split('.').map(Number);
    if (octets.some((o) => o < 0 || o > 255)) return false;
    const p = parseInt(prefix, 10);
    return p >= 0 && p <= 32;
  }

  private countAddresses(cidr: string): number {
    const prefix = parseInt(cidr.split('/')[1], 10);
    return Math.pow(2, 32 - prefix) - 2; // 减去网络号和广播
  }

  private toSubnetDto(d: any) {
    return {
      id: d._id?.toString(),
      cidr: d.cidr,
      name: d.name,
      parentId: d.parentId?.toString(),
      vlanId: d.vlanId,
      gateway: d.gateway,
      dns: d.dns,
      scope: d.scope,
      environment: d.environment,
      totalAddresses: d.totalAddresses,
      allocatedAddresses: d.allocatedAddresses,
      reservedAddresses: d.reservedAddresses,
      tags: d.tags,
      notes: d.notes,
      createdBy: d.createdBy,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    };
  }
}
