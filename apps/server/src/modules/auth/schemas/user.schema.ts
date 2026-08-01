import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

export enum UserRole {
  Admin = 'admin',
  Operator = 'operator',
  Viewer = 'viewer',
}

@Schema({ collection: 'users', timestamps: true, id: false })
export class User {
  @ApiProperty()
  @Prop({ required: true, unique: true, trim: true })
  username!: string;

  @ApiProperty()
  @Prop({ required: true })
  passwordHash!: string;

  @ApiProperty({ description: '显示名' })
  @Prop()
  displayName?: string;

  @ApiProperty({ enum: UserRole })
  @Prop({ enum: Object.values(UserRole), default: UserRole.Viewer })
  role!: UserRole;

  @ApiProperty({ description: '是否内置' })
  @Prop({ default: false })
  builtin!: boolean;
}
export const UserSchema = SchemaFactory.createForClass(User);
