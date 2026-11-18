import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from './api-key.guard';

function contextFor(path: string, key?: string): ExecutionContext {
  const request = {
    path,
    headers: key === undefined ? {} : { 'x-api-key': key },
  };

  return {
    getType: () => 'http',
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guardWith(apiKey: string): ApiKeyGuard {
  const config = new ConfigService({ api: { apiKey } });

  return new ApiKeyGuard(config);
}

describe('ApiKeyGuard', () => {
  it('allows everything when API_KEY is empty', () => {
    expect(guardWith('').canActivate(contextFor('/api/v1/facts'))).toBe(true);
  });

  it('requires the matching header when API_KEY is set', () => {
    const guard = guardWith('secret');

    expect(guard.canActivate(contextFor('/api/v1/facts', 'secret'))).toBe(true);
    expect(() => guard.canActivate(contextFor('/api/v1/facts'))).toThrow(
      UnauthorizedException,
    );
    expect(() =>
      guard.canActivate(contextFor('/api/v1/facts', 'wrong!')),
    ).toThrow(UnauthorizedException);
  });

  it('keeps the health endpoint open', () => {
    expect(guardWith('secret').canActivate(contextFor('/api/v1/health'))).toBe(
      true,
    );
  });
});
