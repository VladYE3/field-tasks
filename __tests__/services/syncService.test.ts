import { mergeTasks } from '../../src/services/syncService';
import type { Task } from '../../src/types';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_1',
    title: 'Task',
    description: 'Desc',
    dueDate: '2026-02-10T09:00:00.000Z',
    location: { address: 'Somewhere' },
    attachments: [],
    status: 'new',
    createdAt: '2026-02-01T08:00:00.000Z',
    updatedAt: '2026-02-01T08:00:00.000Z',
    deleted: false,
    syncStatus: 'pending',
    ...overrides,
  };
}

describe('mergeTasks (last-write-wins)', () => {
  it('keeps local-only tasks', () => {
    const local = makeTask({ id: 'a' });
    const { merged } = mergeTasks([local], []);
    expect(merged.map((t) => t.id)).toEqual(['a']);
  });

  it('adds remote-only tasks as synced', () => {
    const remote = makeTask({ id: 'b', syncStatus: 'synced' as never });
    const { merged, pulled } = mergeTasks([], [remote]);
    expect(merged.map((t) => t.id)).toEqual(['b']);
    expect(merged[0].syncStatus).toBe('synced');
    expect(pulled).toHaveLength(1);
  });

  it('remote wins when its updatedAt is newer', () => {
    const local = makeTask({ id: 'a', title: 'Local', updatedAt: '2026-02-01T08:00:00.000Z' });
    const remote = makeTask({ id: 'a', title: 'Remote', updatedAt: '2026-02-02T08:00:00.000Z' });
    const { merged } = mergeTasks([local], [remote]);
    expect(merged[0].title).toBe('Remote');
    expect(merged[0].syncStatus).toBe('synced');
  });

  it('local wins when its updatedAt is newer', () => {
    const local = makeTask({ id: 'a', title: 'Local', updatedAt: '2026-02-03T08:00:00.000Z', syncStatus: 'pending' });
    const remote = makeTask({ id: 'a', title: 'Remote', updatedAt: '2026-02-02T08:00:00.000Z' });
    const { merged } = mergeTasks([local], [remote]);
    expect(merged[0].title).toBe('Local');
    expect(merged[0].syncStatus).toBe('pending');
  });

  it('remote wins ties so a fresh install converges toward the server', () => {
    const ts = '2026-02-02T08:00:00.000Z';
    const local = makeTask({ id: 'a', title: 'Local', updatedAt: ts });
    const remote = makeTask({ id: 'a', title: 'Remote', updatedAt: ts });
    const { merged } = mergeTasks([local], [remote]);
    expect(merged[0].title).toBe('Remote');
  });

  it('never resurrects a locally deleted task from a remote copy', () => {
    const tombstone = makeTask({
      id: 'a',
      deleted: true,
      syncStatus: 'pending',
      updatedAt: '2026-02-03T08:00:00.000Z',
    });
    // The server still holds the pre-delete copy (a sync re-created it before DELETE landed).
    const remote = makeTask({ id: 'a', updatedAt: '2026-02-02T08:00:00.000Z' });
    const { merged, pulled } = mergeTasks([tombstone], [remote]);
    expect(merged).toHaveLength(1);
    expect(merged[0].deleted).toBe(true);
    expect(merged[0].syncStatus).toBe('pending');
    expect(pulled).toHaveLength(0);
  });
});
