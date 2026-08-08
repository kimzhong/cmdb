/**
 * ModelTemplate Mongoose Schema
 */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({ collection: 'model_templates', timestamps: true })
export class ModelTemplate {
  @Prop({ type: String, required: true, unique: true, index: true })
  code!: string;

  @Prop({ type: String, required: true })
  name!: string;

  @Prop({ type: String, enum: ['compute', 'network', 'storage', 'database', 'middleware', 'application', 'service'], required: true })
  category!: string;

  @Prop({ type: String })
  icon?: string;

  @Prop({ type: [MongooseSchema.Types.Mixed], required: true })
  fields!: any[];

  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] })
  relations?: any[];

  @Prop({ type: Boolean, default: false })
  isSystem!: boolean;
}

export type ModelTemplateDocument = HydratedDocument<ModelTemplate>;
export const ModelTemplateSchema = SchemaFactory.createForClass(ModelTemplate);
