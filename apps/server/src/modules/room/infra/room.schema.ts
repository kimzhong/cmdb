/**
 * Room / Cabinet / RackUnit Schemas
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({ collection: 'rooms', timestamps: true })
export class Room {
  @Prop({ type: String, required: true, unique: true, index: true })
  code!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String })
  address?: string;

  @Prop({ type: Number })
  totalPowerKVA?: number;

  @Prop({ type: Number, default: 0 })
  totalCabinets!: number;

  @Prop({ type: Number, default: 0 })
  totalU!: number;

  @Prop({ type: Number, default: 0 })
  usedU!: number;

  @Prop({ type: Number, default: 0 })
  usedPowerW!: number;

  @Prop({ type: String })
  layoutImageUrl?: string;
}
export type RoomDocument = HydratedDocument<Room>;
export const RoomSchema = SchemaFactory.createForClass(Room);

@Schema({ collection: 'cabinets', timestamps: true })
export class Cabinet {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Room', required: true, index: true })
  roomId!: any;

  @Prop({ type: String, required: true })
  code!: string;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: Number, required: true, default: 42 })
  totalU!: number;

  @Prop({ type: Number, required: true, default: 0 })
  maxPowerW!: number;

  @Prop({ type: Number, default: 0 })
  usedU!: number;

  @Prop({ type: Number, default: 0 })
  usedPowerW!: number;

  @Prop({ type: MongooseSchema.Types.Mixed })
  position?: { row: number; col: number; x?: number; y?: number };

  @Prop({ type: String, enum: ['active', 'maintenance', 'decommissioned'], default: 'active' })
  status!: string;
}
export type CabinetDocument = HydratedDocument<Cabinet>;
export const CabinetSchema = SchemaFactory.createForClass(Cabinet);
CabinetSchema.index({ roomId: 1, code: 1 }, { unique: true });

@Schema({ collection: 'rack_units', timestamps: true })
export class RackUnit {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Cabinet', required: true, index: true })
  cabinetId!: any;

  @Prop({ type: Number, required: true })
  startU!: number;

  @Prop({ type: Number, required: true })
  heightU!: number;

  @Prop({ type: Number, required: true })
  endU!: number;

  @Prop({ type: String, enum: ['empty', 'occupied', 'reserved', 'disabled'], default: 'empty' })
  status!: string;

  @Prop({ type: String, index: true })
  resourceId?: string;
}
export type RackUnitDocument = HydratedDocument<RackUnit>;
export const RackUnitSchema = SchemaFactory.createForClass(RackUnit);
RackUnitSchema.index({ cabinetId: 1, startU: 1, endU: 1 }, { unique: true });
