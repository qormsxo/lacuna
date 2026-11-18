import type { TaskView } from '../../hooks/useBackgroundTask';
import { StatusBadge } from './StatusBadge';

/** 백그라운드 작업 진행 상태 한 줄 표시 */
export function TaskProgress(props: { view: TaskView; label: string }) {
  const { view, label } = props;

  if (view.running) {
    return (
      <p className="task-progress" role="status">
        <span className="spinner" aria-hidden="true" />
        {label} 실행 중… {view.elapsedSec > 0 ? `${view.elapsedSec}초 경과` : ''}
        <span className="meta"> (페이지를 떠나도 서버에서 계속 실행됩니다)</span>
      </p>
    );
  }

  if (view.error !== null) {
    return (
      <p className="task-progress">
        <StatusBadge label="실패" tone="error" /> {view.error}
      </p>
    );
  }

  return null;
}
