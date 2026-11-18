import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTask } from '../api/lacuna';
import type { TaskRecord } from '../api/types';
import { errorMessage } from '../lib/format';

const POLL_INTERVAL_MS = 2000;

export type TaskView = {
  running: boolean;
  task: TaskRecord | null;
  elapsedSec: number;
  error: string | null;
};

/**
 * 백엔드 백그라운드 작업(taskId)을 시작하고 끝날 때까지 폴링한다.
 * 탭을 떠나도 서버 작업은 계속되며, 다시 돌아오면 작업 목록에서 확인할 수 있다.
 */
export function useBackgroundTask<T>(options: {
  onDone?: (result: T) => void | Promise<void>;
}) {
  const [view, setView] = useState<TaskView>({
    running: false,
    task: null,
    elapsedSec: 0,
    error: null,
  });

  const mounted = useRef(true);
  const onDoneRef = useRef(options.onDone);
  onDoneRef.current = options.onDone;

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  const start = useCallback(
    async (starter: () => Promise<{ taskId: string }>): Promise<T | null> => {
      const startedAt = Date.now();
      setView({ running: true, task: null, elapsedSec: 0, error: null });

      try {
        const { taskId } = await starter();

        for (;;) {
          await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));

          if (!mounted.current) {
            return null;
          }

          const task = await fetchTask(taskId);
          const elapsedSec = Math.round((Date.now() - startedAt) / 1000);

          if (task.status === 'running') {
            setView({ running: true, task, elapsedSec, error: null });
            continue;
          }

          if (task.status === 'failed') {
            setView({
              running: false,
              task,
              elapsedSec,
              error: task.error ?? '작업 실패',
            });

            return null;
          }

          setView({ running: false, task, elapsedSec, error: null });
          // SAFETY: the caller pairs this hook with the endpoint whose task result is T.
          const result = task.result as T;
          await onDoneRef.current?.(result);

          return result;
        }
      } catch (error) {
        if (mounted.current) {
          setView((prev) => ({
            ...prev,
            running: false,
            error: errorMessage(error, '작업 시작 실패'),
          }));
        }

        return null;
      }
    },
    [],
  );

  return { view, start };
}
