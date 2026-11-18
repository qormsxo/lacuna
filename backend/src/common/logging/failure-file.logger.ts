import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export type FailureLogKind = 'collect' | 'crawl' | 'llm';

export type FailureLogEntry = {
  at: string;
  kind: FailureLogKind;
  retryable: boolean;
  message: string;
  errorCode?: string;
  category?: string;
  source?: string;
  stage?: string;
  articleId?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
};

@Injectable()
export class FailureFileLogger {
  private readonly logger = new Logger(FailureFileLogger.name);
  private readonly logsDir: string;

  constructor(configService: ConfigService) {
    this.logsDir =
      configService.get<string>('logging.dir') ??
      join(process.cwd(), 'logs');
  }

  async append(entry: Omit<FailureLogEntry, 'at'>): Promise<void> {
    const record: FailureLogEntry = {
      at: new Date().toISOString(),
      ...entry,
    };

    try {
      await mkdir(this.logsDir, { recursive: true });
      const filePath = join(this.logsDir, `${entry.kind}-failures.jsonl`);
      await appendFile(filePath, `${JSON.stringify(record)}\n`, 'utf8');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to write failure log';
      this.logger.error(`Could not write ${entry.kind} failure log: ${message}`);
    }
  }

  async readRecent(
    kind: FailureLogKind,
    limit = 50,
  ): Promise<FailureLogEntry[]> {
    const filePath = join(this.logsDir, `${kind}-failures.jsonl`);

    try {
      const raw = await readFile(filePath, 'utf8');
      const lines = raw.split(/\r?\n/u);
      const entries: FailureLogEntry[] = [];

      for (let index = lines.length - 1; index >= 0; index -= 1) {
        const line = lines[index]?.trim();
        if (line === undefined || line.length === 0) {
          continue;
        }

        try {
          const parsed = JSON.parse(line) as FailureLogEntry;
          entries.push(parsed);
        } catch {
          continue;
        }

        if (entries.length >= limit) {
          break;
        }
      }

      return entries;
    } catch {
      return [];
    }
  }
}
