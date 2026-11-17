import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { config as loadEnv } from 'dotenv';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { validateEnv } from './config/env.validation';

loadEnv({ path: '.env' });

loadEnv({ path: '../.env' });

validateEnv();

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  const port = configService.getOrThrow<number>('api.port');
  const prefix = configService.getOrThrow<string>('api.prefix');
  const version = configService.getOrThrow<string>('api.version');
  const corsOrigin = configService.getOrThrow<string>('api.corsOrigin');

  app.enableCors({ origin: corsOrigin });
  app.setGlobalPrefix(prefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: version,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Lacuna API')
    .setDescription(
      'News fact extraction and cross-article hypothesis generation API',
    )
    .setVersion(version)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(port);
  logger.log(`API listening on http://localhost:${port}/${prefix}/v${version}`);
  logger.log(`Swagger available at http://localhost:${port}/docs`);
}

void bootstrap();
