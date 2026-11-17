import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { HealthResponseDto } from './../src/health/dto/health-response.dto';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/v1/health', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health');
    // SAFETY: supertest body is untyped; the health endpoint returns HealthResponseDto.
    const body = response.body as HealthResponseDto;

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.database).toBe('up');
  });
});
