import 'reflect-metadata';
import { config as loadEnv } from 'dotenv';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

// TypeORM CLI(migration:generate/run/revert) 전용 데이터 소스.
// 앱 런타임 설정(app.module.ts)과 같은 엔티티·마이그레이션 경로를 쓴다.
loadEnv({ path: '.env', quiet: true });

loadEnv({ path: '../.env', quiet: true });

export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST ?? 'localhost',
  port: Number(process.env.POSTGRES_PORT ?? '5432'),
  username: process.env.POSTGRES_USER ?? 'postgres',
  password: process.env.POSTGRES_PASSWORD ?? 'postgres',
  database: process.env.POSTGRES_DB ?? 'lacuna',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
