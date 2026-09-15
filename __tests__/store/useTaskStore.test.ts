import { useTaskStore } from '../../src/store/useTaskStore';
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
    syncStatus: 'synced',
    ...overrides,
  };
}

describe('useTaskStore updateTask', () => {
  beforeEach(() => {
    useTaskStore.setState({
      tasks: [],
      history: [],
      hydrated: true,
      isOnline: true,
      syncing: false,
      darkMode: false,
      serverUrl: 'http://localhost:3001',
      notificationNotice: undefined,
      lastSyncAt: undefined,
      lastSyncError: undefined,
    });
  });

  it('updates the task status when the draft status changes', async () => {
    const initial = makeTask();
    useTaskStore.setState({ tasks: [initial] });

    await useTaskStore.getState().updateTask(initial.id, {
      title: initial.title,
      description: initial.description,
      dueDate: new Date(initial.dueDate),
      location: initial.location,
      attachments: initial.attachments,
      status: 'completed',
    });

    const updated = useTaskStore.getState().tasks[0];
    expect(updated.status).toBe('completed');
  });
});
