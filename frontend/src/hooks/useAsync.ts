import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../lib/format';

export type AsyncState<T> =
  | { kind: 'loading' }
  | { kind: 'ready'; data: T }
  | { kind: 'failed'; message: string };

/**
 * deps가 바뀔 때마다 loader를 다시 실행한다. 늦게 도착한 이전 응답은 버린다.
 * reload()는 같은 deps로 다시 불러오며, 이미 데이터가 있으면 로딩 표시 없이 교체한다.
 */
export function useAsync<T>(
  loader: () => Promise<T>,
  deps: ReadonlyArray<unknown>,
  failureMessage = '불러오기 실패',
) {
  const [state, setState] = useState<AsyncState<T>>({ kind: 'loading' });
  const requestId = useRef(0);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const run = useCallback(
    async (showLoading: boolean) => {
      const id = ++requestId.current;

      if (showLoading) {
        setState({ kind: 'loading' });
      }

      try {
        const data = await loaderRef.current();

        if (id === requestId.current) {
          setState({ kind: 'ready', data });
        }
      } catch (error) {
        if (id === requestId.current) {
          setState({
            kind: 'failed',
            message: errorMessage(error, failureMessage),
          });
        }
      }
    },
    [failureMessage],
  );

  useEffect(() => {
    void run(true);

    return () => {
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback(() => run(false), [run]);

  return { state, reload };
}
