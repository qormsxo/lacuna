import dataSource from './data-source';
import { InitialSchema1794978606185 } from './migrations/1794978606185-InitialSchema';

/**
 * TYPEORM_SYNCHRONIZE=true로 이미 테이블이 만들어진 DB를 마이그레이션 방식으로 옮길 때 한 번 실행한다.
 * 초기 스키마 마이그레이션을 "이미 적용됨"으로 기록만 하고 SQL은 실행하지 않는다.
 */
async function main(): Promise<void> {
  await dataSource.initialize();

  try {
    const runner = dataSource.createQueryRunner();
    const hasArticles = await runner.hasTable('news_articles');

    if (!hasArticles) {
      console.log(
        'news_articles 테이블이 없습니다. 빈 DB라면 baseline 대신 `npm run migration:run`을 쓰세요.',
      );

      return;
    }

    await runner.query(
      `CREATE TABLE IF NOT EXISTS "migrations" ("id" SERIAL NOT NULL, "timestamp" bigint NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY ("id"))`,
    );

    const name = new InitialSchema1794978606185().name;

    const existing = await dataSource
      .createQueryBuilder()
      .select('m.id', 'id')
      .from('migrations', 'm')
      .where('m.name = :name', { name })
      .getRawMany<{ id: number }>();

    if (existing.length > 0) {
      console.log(`${name} 은(는) 이미 기록돼 있습니다.`);

      return;
    }

    await runner.query(
      'INSERT INTO "migrations" ("timestamp", "name") VALUES ($1, $2)',
      [1794978606185, name],
    );
    console.log(`${name} 을(를) 적용됨으로 기록했습니다.`);
  } finally {
    await dataSource.destroy();
  }
}

void main();
