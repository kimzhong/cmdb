import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TerminusModule } from '@nestjs/terminus';
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
  ],
})
export class AppModule {}
