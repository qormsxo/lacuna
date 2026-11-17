import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { HealthResponseDto } from './dto/health-response.dto';

@Injectable()
export class HealthService {
  constructor(private readonly dataSource: DataSource) {}

  async getHealth(): Promise<HealthResponseDto> {
    const databaseOk = await this.checkDatabase();

    if (!databaseOk) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        timestamp: new Date().toISOString(),
      });
    }

    return {
      status: 'ok',
      database: 'up',
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');

      return true;
    } catch {
      return false;
    }
  }
}
