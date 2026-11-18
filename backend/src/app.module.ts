import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalysisModule } from './analysis/analysis.module';
import { CommonModule } from './common/common.module';
import configuration from './config/configuration';
import { DashboardModule } from './dashboard/dashboard.module';
import { FactsModule } from './facts/facts.module';
import { HealthModule } from './health/health.module';
import { HypothesisModule } from './hypotheses/hypothesis.module';
import { LlmModule } from './llm/llm.module';
import { NewsModule } from './news/news.module';

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
        logging: configService.getOrThrow<boolean>('database.logging'),
      }),
    }),
    CommonModule,
    LlmModule,
    HealthModule,
    NewsModule,
    FactsModule,
    AnalysisModule,
    HypothesisModule,
    DashboardModule,
  ],
})
export class AppModule {}
