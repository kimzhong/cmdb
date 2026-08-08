/**
 * IPAM Subnet + IPAddress Schemas
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({ collection: 'ipam_subnets', timestamps: true })
export class Subnet {
  @Prop({ type: String, required: true, unique: true, index: true })
  cidr!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subnet', index: true })
  parentId?: any;

  @Prop({ type: Number })
  vlanId?: number;

  @Prop({ type: String })
  gateway?: string;

  @Prop({ type: [String], default: [] })
  dns!: string[];

  @Prop({ type: String, required: true, index: true })
  scope!: string;

  @Prop({ type: String, enum: ['production', 'staging', 'dev', 'test', 'office'], required: true })
  environment!: string;

  @Prop({ type: Number, required: true })
  totalAddresses!: number;

  @Prop({ type: Number, default: 0 })
  allocatedAddresses!: number;

  @Prop({ type: Number, default: 0 })
  reservedAddresses!: number;

  @Prop({ type: [String], default: [] })
  tags!: string[];

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: String, required: true })
  createdBy!: string;
}

export type SubnetDocument = HydratedDocument<Subnet>;
export const SubnetSchema = SchemaFactory.createForClass(Subnet);
SubnetSchema.index({ scope: 1, environment: 1 });

@Schema({ collection: 'ipam_addresses', timestamps: true })
export class IpAddress {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subnet', required: true, index: true })
  subnetId!: any;

  @Prop({ type: String, required: true })
  ip!: string;

  @Prop({ type: String, enum: ['available', 'allocated', 'reserved', 'expired', 'conflict'], default: 'available', index: true })
  status!: string;

  @Prop({ type: String, index: true })
  resourceId?: string;

  @Prop({ type: String })
  reservedBy?: string;

  @Prop({ type: Date })
  reservedUntil?: Date;

  @Prop({ type: String })
  notes?: string;

  @Prop({ type: Date })
  allocatedAt?: Date;

  @Prop({ type: String })
  allocatedBy?: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  history!: any[];
}

export type IpAddressDocument = HydratedDocument<IpAddress>;
export const IpAddressSchema = SchemaFactory.createForClass(IpAddress);
IpAddressSchema.index({ subnetId: 1, ip: 1 }, { unique: true });
