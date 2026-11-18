import { Module } from '@nestjs/common';
import { join } from 'node:path';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisModule } from './analysis/analysis.module';
import { CommonModule } from './common/common.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import configuration from './config/configuration';
import { DashboardModule } from './dashboard/dashboard.module';
import { FactsModule } from './facts/facts.module';
import { HealthModule } from './health/health.module';
import { HypothesisModule } from './hypotheses/hypothesis.module';
import { LlmModule } from './llm/llm.module';
import { StaleRunRecoveryService } from './maintenance/stale-run-recovery.service';
import { NewsModule } from './news/news.module';
import { PipelineModule } from './pipeline/pipeline.module';
import { TasksModule } from './tasks/tasks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres' as const,
        host: configService.getOrThrow<string>('database.host'),
        port: configService.getOrThrow<number>('database.port'),
        username: configService.getOrThrow<string>('database.username'),
        password: configService.getOrThrow<string>('database.password'),
        database: configService.getOrThrow<string>('database.name'),
        autoLoadEntities: true,
        synchronize: configService.getOrThrow<boolean>('database.synchronize'),
        migrations: [join(__dirname, 'database', 'migrations', '*.{ts,js}')],
        migrationsRun:
          configService.get<boolean>('database.migrationsRun') === true,
        logging: configService.getOrThrow<boolean>('database.logging'),
      }),
    }),
    CommonModule,
    TasksModule,
    LlmModule,
    HealthModule,
    NewsModule,
    FactsModule,
    AnalysisModule,
    HypothesisModule,
    DashboardModule,
    PipelineModule,
  ],
  providers: [
    StaleRunRecoveryService,
    { provide: APP_GUARD, useClass: ApiKeyGuard },
  ],
})
export class AppModule {}
