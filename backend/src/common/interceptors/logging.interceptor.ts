import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const { method, url } = request;
    const startedAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - startedAt;
        this.logger.log(`${method} ${url} ${durationMs}ms`);
      }),
    );
  }
}
