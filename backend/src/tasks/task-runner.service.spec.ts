import { NotFoundException } from '@nestjs/common';
import { TaskRunnerService } from './task-runner.service';

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('TaskRunnerService', () => {
  it('runs work in background and stores the result', async () => {
    const runner = new TaskRunnerService();
    const task = runner.start('demo', () => Promise.resolve({ ok: 1 }));

    expect(task.status).toBe('running');
    expect(runner.hasRunning('demo')).toBe(true);

    await flush();

    const done = runner.get(task.id);
    expect(done.status).toBe('completed');
    expect(done.result).toEqual({ ok: 1 });
    expect(done.finishedAt).not.toBeNull();
    expect(runner.hasRunning('demo')).toBe(false);
  });

  it('records failures with the error message', async () => {
    const runner = new TaskRunnerService();
    const task = runner.start('demo', () => Promise.reject(new Error('boom')));

    await flush();

    expect(runner.get(task.id).status).toBe('failed');
    expect(runner.get(task.id).error).toBe('boom');
  });

  it('throws NotFound for unknown ids and lists newest first', () => {
    const runner = new TaskRunnerService();
    const first = runner.start('a', () => new Promise(() => undefined));
    const second = runner.start('b', () => new Promise(() => undefined));

    expect(() => runner.get('nope')).toThrow(NotFoundException);
    expect(runner.list(10).map((t) => t.id)).toEqual([second.id, first.id]);
  });
});
