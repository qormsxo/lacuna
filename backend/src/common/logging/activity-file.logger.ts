import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, appendFile } from 'node:fs/promises';
import { join } from 'node:path';

export type ActivityChannel = 'collect' | 'crawl';
export type ActivityLevel = 'info' | 'warn' | 'error';

export type ActivityLogEntry = {
  at: string;
  channel: ActivityChannel;
  level: ActivityLevel;
  message: string;
  details?: Record<string, unknown>;
};

@Injectable()
export class ActivityFileLogger {
  private readonly nestLogger = new Logger(ActivityFileLogger.name);
  private readonly logsDir: string;

  constructor(configService: ConfigService) {
    this.logsDir =
      configService.get<string>('logging.dir') ??
      join(process.cwd(), 'logs');
  }

  async info(
    channel: ActivityChannel,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.write(channel, 'info', message, details);
  }

  async warn(
    channel: ActivityChannel,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.write(channel, 'warn', message, details);
  }

  async error(
    channel: ActivityChannel,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    await this.write(channel, 'error', message, details);
  }

  private async write(
    channel: ActivityChannel,
    level: ActivityLevel,
    message: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const entry: ActivityLogEntry = {
      at: new Date().toISOString(),
      channel,
      level,
      message,
      details,
    };

    const line = `${entry.at} [${level.toUpperCase()}] ${message}${
      details === undefined ? '' : ` ${JSON.stringify(details)}`
    }\n`;

    try {
      await mkdir(this.logsDir, { recursive: true });
      await appendFile(join(this.logsDir, `${channel}.log`), line, 'utf8');
      await appendFile(
        join(this.logsDir, `${channel}.jsonl`),
        `${JSON.stringify(entry)}\n`,
        'utf8',
      );
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Failed to write activity log';
      this.nestLogger.error(`Could not write ${channel} activity log: ${detail}`);
    }
  }
}
