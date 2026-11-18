import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

describe('Lacuna API (e2e, read-only)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists facts with paging metadata', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/facts?limit=2&offset=0',
    );

    // SAFETY: supertest body is untyped; /facts returns { facts, total }.
    const body = response.body as { facts: unknown[]; total: number };

    expect(response.status).toBe(200);
    expect(Array.isArray(body.facts)).toBe(true);
    expect(body.facts.length).toBeLessThanOrEqual(2);
    expect(typeof body.total).toBe('number');
  });

  it('rejects invalid paging and filters', async () => {
    const server = app.getHttpServer();

    expect((await request(server).get('/api/v1/facts?offset=-1')).status).toBe(
      400,
    );
    expect(
      (await request(server).get('/api/v1/facts?reviewStatus=nope')).status,
    ).toBe(400);
    expect(
      (await request(server).get('/api/v1/analysis/relations?relationType=x'))
        .status,
    ).toBe(400);
    expect(
      (await request(server).get('/api/v1/hypotheses?status=x')).status,
    ).toBe(400);
  });

  it('returns relations with fact summaries', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/analysis/relations?limit=3',
    );

    // SAFETY: supertest body is untyped; relations carry optional factA/factB.
    const body = response.body as {
      relations: Array<{ factA?: unknown; factB?: unknown }>;
      total: number;
    };

    expect(response.status).toBe(200);
    expect(typeof body.total).toBe('number');

    for (const relation of body.relations) {
      expect(relation).toHaveProperty('factA');
      expect(relation).toHaveProperty('factB');
    }
  });

  it('exposes tasks and pipeline status', async () => {
    const server = app.getHttpServer();
    const tasks = await request(server).get('/api/v1/tasks');
    const pipeline = await request(server).get('/api/v1/pipeline/status');
    const missing = await request(server).get('/api/v1/tasks/does-not-exist');

    expect(tasks.status).toBe(200);
    expect(pipeline.status).toBe(200);
    expect(pipeline.body).toMatchObject({ running: false });
    expect(missing.status).toBe(404);
  });

  it('only accepts POST for collect', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/v1/news/collect?category=정치',
    );

    expect(response.status).toBe(404);
  });
});
