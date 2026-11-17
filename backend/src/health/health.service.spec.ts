import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { HealthService } from './health.service';

class HealthyDataSource {
  query(): Promise<number[][]> {
    return Promise.resolve([[1]]);
  }
}

class UnhealthyDataSource {
  query(): Promise<number[][]> {
    return Promise.reject(new Error('connection refused'));
  }
}

describe('HealthService', () => {
  it('returns ok when the database responds', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DataSource,
          useClass: HealthyDataSource,
        },
      ],
    }).compile();

    const service = module.get(HealthService);
    const result = await service.getHealth();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('up');
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('throws when the database is unavailable', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: DataSource,
          useClass: UnhealthyDataSource,
        },
      ],
    }).compile();

    const service = module.get(HealthService);

    await expect(service.getHealth()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
