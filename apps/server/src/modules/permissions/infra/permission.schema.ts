/**
 * Permission Mongoose Schema
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({ collection: 'permissions', timestamps: true })
export class Permission {
  @Prop({ type: String, enum: ['role', 'user'], required: true })
  subjectType!: string;

  @Prop({ type: String, required: true, index: true })
  subjectId!: string;

  @Prop({ type: String, enum: ['model', 'resource', 'menu', 'route'], required: true })
  objectType!: string;

  @Prop({ type: String, index: true })
  objectId?: string;

  @Prop({ type: [String], required: true })
  actions!: string[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  conditions?: any[];

  @Prop({ type: String, enum: ['allow', 'deny'], default: 'allow' })
  effect!: string;

  @Prop({ type: Number, default: 0 })
  priority!: number;

  @Prop({ type: String, required: true })
  grantedBy!: string;

  @Prop({ type: Date })
  expiresAt?: Date;
}

export type PermissionDocument = HydratedDocument<Permission>;
export const PermissionSchema = SchemaFactory.createForClass(Permission);
PermissionSchema.index({ subjectType: 1, subjectId: 1, objectType: 1, objectId: 1 });
PermissionSchema.index({ expiresAt: 1 });
