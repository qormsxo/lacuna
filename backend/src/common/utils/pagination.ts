import { BadRequestException } from '@nestjs/common';

export function parseOffset(raw: string | undefined): number {
  if (raw === undefined || raw.trim().length === 0) {
    return 0;
  }

  const value = Number(raw);

  if (!Number.isInteger(value) || value < 0) {
    throw new BadRequestException('offset must be a non-negative integer');
  }

  return value;
}
