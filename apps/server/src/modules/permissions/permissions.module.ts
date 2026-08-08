/**
 * Permissions 限界上下文 (F10)
 */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Permission, PermissionSchema } from './infra/permission.schema';
import { PermissionsService } from './application/permissions.service';
import { PermissionsController } from './application/permissions.controller';
import { PolicyEvaluator } from './domain/policy-evaluator';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Permission.name, schema: PermissionSchema }]),
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, PolicyEvaluator],
  exports: [PermissionsService, PolicyEvaluator],
})
export class PermissionsModule {}
