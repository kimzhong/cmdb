import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type AuditLogDocument = AuditLog & Document;

@Schema({ collection: 'audit_logs', timestamps: true, id: false })
export class AuditLog {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @ApiProperty()
  @Prop()
  username?: string;

  @ApiProperty()
  @Prop({ required: true, index: true })
  method!: string;

  @ApiProperty()
  @Prop({ required: true })
  path!: string;

  @ApiProperty({ description: 'HTTP 状态码' })
  @Prop({ required: true })
  status!: number;

  @ApiProperty({ description: '请求 body（截断）' })
  @Prop()
  body?: string;

  @ApiProperty({ description: 'IP' })
  @Prop()
  ip?: string;

  @ApiProperty({ description: '耗时 ms' })
  @Prop({ default: 0 })
  durationMs!: number;
}
export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
