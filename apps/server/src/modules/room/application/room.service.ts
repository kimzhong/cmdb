/**
 * Room 应用服务
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument, Cabinet, CabinetDocument, RackUnit, RackUnitDocument } from '../infra/room.schema';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { ErrorCode } from '@cmdb/shared/types/error-code';

@Injectable()
export class RoomService {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Cabinet.name) private readonly cabinetModel: Model<CabinetDocument>,
    @InjectModel(RackUnit.name) private readonly unitModel: Model<RackUnitDocument>,
  ) {}

  // ===== Room =====
  async listRooms() {
    const docs = await this.roomModel.find().sort({ code: 1 }).exec();
    return docs.map((d) => d.toObject());
  }

  async createRoom(dto: any) {
    return (await this.roomModel.create(dto)).toObject();
  }

  async getRoom(id: string) {
    const doc = await this.roomModel.findById(id);
    if (!doc) throw new NotFoundException(`机房 ${id} 不存在`);
    return doc.toObject();
  }

  // ===== Cabinet =====
  async listCabinets(roomId: string) {
    return this.cabinetModel.find({ roomId: new Types.ObjectId(roomId) }).sort({ code: 1 }).lean();
  }

  async createCabinet(roomId: string, dto: any) {
    return (await this.cabinetModel.create({ ...dto, roomId: new Types.ObjectId(roomId) })).toObject();
  }

  async getCabinet(id: string) {
    const doc = await this.cabinetModel.findById(id);
    if (!doc) throw new NotFoundException(`机柜 ${id} 不存在`);
    return doc.toObject();
  }

  // ===== U 位 =====
  async listUnits(cabinetId: string) {
    return this.unitModel.find({ cabinetId: new Types.ObjectId(cabinetId) }).sort({ startU: 1 }).lean();
  }

  /** 在指定 U 位范围放资源 */
  async allocateUnit(cabinetId: string, startU: number, heightU: number, resourceId: string) {
    const endU = startU + heightU - 1;
    // 查冲突
    const conflict = await this.unitModel.findOne({
      cabinetId: new Types.ObjectId(cabinetId),
      status: { $in: ['occupied', 'reserved'] },
      $or: [
        { startU: { $lte: endU }, endU: { $gte: startU } },
      ],
    });
    if (conflict) {
      throw new BusinessException(ErrorCode.RACK_UNIT_OCCUPIED, `U 位 ${conflict.startU}-${conflict.endU} 已被占用`);
    }
    const unit = await this.unitModel.create({
      cabinetId: new Types.ObjectId(cabinetId),
      startU,
      endU,
      heightU,
      status: 'occupied',
      resourceId,
    });
    // 更新 cabinet usedU
    await this.cabinetModel.findByIdAndUpdate(cabinetId, { $inc: { usedU: heightU } });
    return unit.toObject();
  }

  /** 释放 U 位 */
  async deallocateUnit(cabinetId: string, startU: number) {
    const unit = await this.unitModel.findOneAndUpdate(
      { cabinetId: new Types.ObjectId(cabinetId), startU, status: 'occupied' },
      { $set: { status: 'empty', resourceId: null } },
      { new: true },
    );
    if (!unit) throw new NotFoundException('U 位未占用');
    await this.cabinetModel.findByIdAndUpdate(cabinetId, { $inc: { usedU: -unit.heightU } });
    return unit.toObject();
  }
}
