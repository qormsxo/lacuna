import { TaskRecord, TaskRunnerService } from './task-runner.service';

export type BackgroundAccepted = { taskId: string; task: TaskRecord };

export function isBackgroundRequested(raw: string | undefined): boolean {
  return raw === 'true' || raw === '1';
}

/**
 * background=true면 작업을 TaskRunner에 넘기고 taskId를 즉시 반환한다.
 * 아니면 기존처럼 결과가 나올 때까지 기다린다.
 */
export async function runMaybeInBackground<T>(
  taskRunner: TaskRunnerService,
  background: boolean,
  kind: string,
  work: () => Promise<T>,
): Promise<T | BackgroundAccepted> {
  if (!background) {
    return work();
  }

  const task = taskRunner.start(kind, work);

  return { taskId: task.id, task };
}
