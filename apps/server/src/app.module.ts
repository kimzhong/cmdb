import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { validateConfig } from './config/configuration';
import { HealthModule } from './modules/health/health.module';
import { MetaModelModule } from './modules/meta-model/meta-model.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { TagsModule } from './modules/tags/tags.module';
import { SearchModule } from './modules/search/search.module';
import { AppsModule } from './modules/apps/apps.module';
import { SyncModule } from './modules/sync/sync.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditModule } from './modules/audit/audit.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { RelationsModule } from './modules/relations/relations.module';
import { LifecycleModule } from './modules/lifecycle/lifecycle.module';
import { ApprovalModule } from './modules/approval/approval.module';
import { BulkIoModule } from './modules/bulk-io/bulk-io.module';
import { DiscoveryModule } from './modules/discovery/discovery.module';
import { IpamModule } from './modules/ipam/ipam.module';
import { RoomModule } from './modules/room/room.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { ModelTemplatesModule } from './modules/model-templates/model-templates.module';
import { SeedModule } from './common/seed/seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateConfig,
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cmdb',
        autoCreate: true,
      }),
    }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    TerminusModule,
    HealthModule,
    MetaModelModule,
    ResourcesModule,
    TagsModule,
    SearchModule,
    AppsModule,
    SyncModule,
    AuthModule,
    AuditModule,
    MetricsModule,
    SeedModule,
    // v0.2 新增 BC (F1-F12)
    RelationsModule,
    LifecycleModule,
    ApprovalModule,
    BulkIoModule,
    DiscoveryModule,
    IpamModule,
    RoomModule,
    PermissionsModule,
    ReportingModule,
    ModelTemplatesModule,
  ],
})
export class AppModule {}
