import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

/**
 * API_KEY가 설정돼 있으면 모든 요청에 `x-api-key` 헤더를 요구한다.
 * 비어 있으면(로컬 기본값) 아무것도 막지 않는다. health 체크는 항상 열어 둔다.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly apiKey: Buffer | null;

  constructor(configService: ConfigService) {
    const raw = configService.get<string>('api.apiKey') ?? '';
    this.apiKey = raw.trim().length === 0 ? null : Buffer.from(raw.trim());
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.apiKey === null || context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    if (request.path.endsWith('/health')) {
      return true;
    }

    const header = request.headers['x-api-key'];
    const provided = Buffer.from(typeof header === 'string' ? header : '');

    if (
      provided.length !== this.apiKey.length ||
      !timingSafeEqual(provided, this.apiKey)
    ) {
      throw new UnauthorizedException('Invalid or missing x-api-key header');
    }

    return true;
  }
}
