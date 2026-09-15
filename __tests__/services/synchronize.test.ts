import { mergeTasks, synchronize } from '../../src/services/syncService';
import { apiFetch, ApiError } from '../../src/api/client';
import type { Task } from '../../src/types';

// In-memory json-server double. The important behavior: POST ignores the client-provided
// id and generates its own, like json-server v1 does.
const mockServerDb = new Map<string, Task>();

jest.mock('../../src/api/client', () => {
  const { ApiError: MockApiError } = jest.requireActual<{ ApiError: typeof ApiError }>(
    '../../src/api/client',
  );
  return {
    ApiError: MockApiError,
    apiFetch: jest.fn(
    async (_baseUrl: string, path: string, options: { method?: string; body?: Task } = {}) => {
      const method = options.method ?? 'GET';
      if (method === 'GET' && path === '/tasks') {
        return Array.from(mockServerDb.values());
      }
      const match = path.match(/^\/tasks\/(.+)$/);
      if (match && method === 'PUT') {
        if (!mockServerDb.has(match[1])) throw new MockApiError("not found", 404);
        mockServerDb.set(match[1], options.body as Task);
        return options.body;
      }
      if (match && method === 'DELETE') {
        if (!mockServerDb.has(match[1])) throw new MockApiError("not found", 404);
        mockServerDb.delete(match[1]);
        return undefined;
      }
      if (method === 'POST' && path === '/tasks') {
        const created = { ...(options.body as Task), id: 'server_generated_id' };
        mockServerDb.set(created.id, created);
        return created;
      }
      throw new MockApiError(`unexpected request ${method} ${path}`);
    },
    ),
  };
});

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task_local_1',
    title: 'Theatre',
    description: 'Go to the theatre',
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

describe('synchronize', () => {
  beforeEach(() => {
    mockServerDb.clear();
    jest.clearAllMocks();
  });

  it('does not duplicate a task when the server regenerates its id on POST', async () => {
    const local = [makeTask()];
    const outcome = await synchronize('http://server', local);

    expect(apiFetch).toHaveBeenCalled();
    expect(outcome.failedCount).toBe(0);
    expect(mockServerDb.size).toBe(1);

    // Simulates the store merge after a sync: pushed + pulled must collapse into ONE task
    // that keeps the LOCAL id, otherwise the pulled copy shows up as a duplicate.
    const { merged, pulled } = mergeTasks(outcome.pushed, outcome.pulled);
    expect(pulled.map((t) => t.id)).toEqual(['task_local_1']);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('task_local_1');
    expect(merged[0].syncStatus).toBe('synced');
    // ...and the store must adopt the server id so later DELETEs hit the right resource.
    expect(outcome.idChanges).toEqual([{ from: 'task_local_1', to: 'server_generated_id' }]);
  });

  it('after id adoption, updates and deletes address the server resource directly', async () => {
    const local = [makeTask()];
    const first = await synchronize('http://server', local);
    const serverId = first.idChanges[0].to;
    expect(serverId).toBe('server_generated_id');

    // Adopted local state: same task under the server id, then edited.
    const adopted = { ...makeTask({ id: serverId, title: 'Theatre (edited)' }), syncStatus: 'pending' as const };
    const second = await synchronize('http://server', [adopted]);
    expect(second.failedCount).toBe(0);
    expect(second.idChanges).toEqual([]);
    expect(mockServerDb.get(serverId)?.title).toBe('Theatre (edited)');

    // And a delete under the adopted id actually removes the server resource.
    const tombstone = { ...adopted, deleted: true };
    const third = await synchronize('http://server', [tombstone]);
    expect(third.failedCount).toBe(0);
    expect(mockServerDb.size).toBe(0);
  });

  it('updates existing server tasks via PUT without id remapping', async () => {
    mockServerDb.set('task_local_1', makeTask({ syncStatus: 'synced' as never }));
    const local = [makeTask({ title: 'Theatre (updated)', syncStatus: 'pending' })];

    const outcome = await synchronize('http://server', local);
    expect(outcome.failedCount).toBe(0);
    expect(mockServerDb.get('task_local_1')?.title).toBe('Theatre (updated)');
    const { merged } = mergeTasks(outcome.pushed, outcome.pulled);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('task_local_1');
  });
});
