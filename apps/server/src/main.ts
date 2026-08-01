import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('SERVER_PORT', 3000);
  const prefix = config.get<string>('SERVER_GLOBAL_PREFIX', 'api');
  const corsOrigin = config.get<string>('SERVER_CORS_ORIGIN', 'http://localhost:5173');
  const swaggerEnabled = config.get<string>('SWAGGER_ENABLED', 'true') === 'true';
  const swaggerPath = config.get<string>('SWAGGER_PATH', 'docs');

  // 显式声明 body parser 用 UTF-8（PowerShell / 部分客户端默认会发 Latin-1，导致中文乱码）
  app.use((req: any, _res: any, next: any) => {
    const ct = req.headers['content-type'];
    if (typeof ct === 'string' && ct.toLowerCase().includes('application/json') && !ct.toLowerCase().includes('charset')) {
      req.headers['content-type'] = 'application/json; charset=utf-8';
    }
    next();
  });

  app.setGlobalPrefix(prefix);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  app.enableCors({
    origin: corsOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  });

  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CMDB API')
      .setDescription('CMDB 平台接口文档')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document, {
      jsonDocumentUrl: `${swaggerPath}/json`,
    });
  }

  await app.listen(port);
  Logger.log(`🚀 Server running on http://localhost:${port}/${prefix}`, 'Bootstrap');
  if (swaggerEnabled) {
    Logger.log(`📘 Swagger:    http://localhost:${port}/${swaggerPath}`, 'Bootstrap');
  }
}

bootstrap();
