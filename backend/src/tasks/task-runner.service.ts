import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

export type TaskStatus = 'running' | 'completed' | 'failed';

export type TaskRecord = {
  id: string;
  kind: string;
  status: TaskStatus;
  startedAt: string;
  finishedAt: string | null;
  result: unknown;
  error: string | null;
};

const MAX_TASKS = 200;

/**
 * 오래 걸리는 LLM/크롤 작업을 HTTP 요청과 분리해 백그라운드로 실행한다.
 * 상태는 프로세스 메모리에만 보관한다. 재시작 시 DB에 남은 running 레코드는
 * StaleRunRecoveryService가 정리한다.
 */
@Injectable()
export class TaskRunnerService {
  private readonly logger = new Logger(TaskRunnerService.name);
  private readonly tasks = new Map<string, TaskRecord>();

  start<T>(kind: string, work: () => Promise<T>): TaskRecord {
    const record: TaskRecord = {
      id: randomUUID(),
      kind,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      result: null,
      error: null,
    };

    this.tasks.set(record.id, record);
    this.prune();

    void work()
      .then((result) => {
        record.status = 'completed';
        record.result = result;
      })
      .catch((error: unknown) => {
        record.status = 'failed';
        record.error = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Task ${kind} (${record.id}) failed: ${record.error}`);
      })
      .finally(() => {
        record.finishedAt = new Date().toISOString();
      });

    return record;
  }

  get(id: string): TaskRecord {
    const record = this.tasks.get(id);

    if (record === undefined) {
      throw new NotFoundException(`Task not found: ${id}`);
    }

    return record;
  }

  list(limit: number): TaskRecord[] {
    return [...this.tasks.values()].reverse().slice(0, limit);
  }

  hasRunning(kind: string): boolean {
    for (const record of this.tasks.values()) {
      if (record.kind === kind && record.status === 'running') {
        return true;
      }
    }

    return false;
  }

  private prune(): void {
    if (this.tasks.size <= MAX_TASKS) {
      return;
    }

    for (const [id, record] of this.tasks) {
      if (this.tasks.size <= MAX_TASKS) {
        return;
      }

      if (record.status !== 'running') {
        this.tasks.delete(id);
      }
    }
  }
}
