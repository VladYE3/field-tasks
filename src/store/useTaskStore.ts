import { create } from 'zustand';
import { DEFAULT_SERVER_URL } from '../constants';
import { appendHistory, loadHistory } from '../storage/historyRepository';
import { loadSettings, loadTasks, saveSettings, saveTasks } from '../storage/taskRepository';
import type { HistoryEntry, SyncStatus, Task, TaskDraft, TaskStatus } from '../types';
import { generateId } from '../utils/id';
import {
  cancelTaskReminder,
  scheduleDemoNotification,
  scheduleTaskReminder,
  type ReminderScheduleResult,
} from '../services/notificationService';
import { checkOnline, subscribeToConnectivity } from '../services/networkService';
import { mergeTasks, synchronize } from '../services/syncService';
import { removeAttachmentFile } from '../services/attachmentService';

interface TaskStoreState {
  tasks: Task[];
  history: HistoryEntry[];
  hydrated: boolean;
  isOnline: boolean;
  syncing: boolean;
  lastSyncAt?: string;
  lastSyncError?: string;
  darkMode: boolean;
  serverUrl: string;
  notificationNotice?: string;

  hydrate: () => Promise<void>;
  subscribeNetwork: () => () => void;
  createTask: (draft: TaskDraft) => Promise<Task>;
  updateTask: (id: string, draft: TaskDraft) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  setTaskStatus: (id: string, status: TaskStatus) => Promise<void>;
  syncNow: () => Promise<void>;
  setDarkMode: (value: boolean) => void;
  setServerUrl: (value: string) => void;
  clearNotificationNotice: () => void;
  scheduleDemoReminder: (taskId: string) => Promise<ReminderScheduleResult | undefined>;
}

function makeHistory(
  action: HistoryEntry['action'],
  description: string,
  task?: Task,
): HistoryEntry {
  return {
    id: generateId('hist'),
    taskId: task?.id,
    taskTitle: task?.title,
    action,
    description,
    timestamp: new Date().toISOString(),
  };
}

/** Never let a misbehaving native module (notifications) block task saving. */
function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

const REMINDER_TIMEOUT_RESULT = {
  scheduled: false,
  reason: 'Reminder scheduling timed out — the task was saved.',
} as const;

export const useTaskStore = create<TaskStoreState>((set, get) => {
  async function persist(nextTasks: Task[], newHistory: HistoryEntry[]): Promise<HistoryEntry[]> {
    set({ tasks: nextTasks });
    await saveTasks(nextTasks);
    const history = await appendHistory(newHistory);
    set({ history });
    return history;
  }

  function baseUrl(): string {
    const raw = get().serverUrl.trim() || DEFAULT_SERVER_URL;
    // Be forgiving when the user omits the scheme.
    return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  }

  return {
    tasks: [],
    history: [],
    hydrated: false,
    isOnline: true,
    syncing: false,
    darkMode: false,
    serverUrl: '',

    hydrate: async () => {
      const [tasks, history, settings] = await Promise.all([loadTasks(), loadHistory(), loadSettings()]);
      const online = await checkOnline();
      set({
        tasks,
        history,
        darkMode: settings.darkMode,
        serverUrl: settings.serverUrl,
        hydrated: true,
        isOnline: online,
      });
    },

    subscribeNetwork: () => {
      return subscribeToConnectivity((online) => {
        const wasOffline = !get().isOnline;
        set({ isOnline: online });
        if (online && wasOffline) {
          void get().syncNow();
        }
      });
    },

    createTask: async (draft) => {
      const now = new Date().toISOString();
      const task: Task = {
        id: generateId('task'),
        title: draft.title.trim(),
        description: draft.description.trim(),
        dueDate: draft.dueDate.toISOString(),
        location: draft.location,
        attachments: draft.attachments,
        status: draft.status,
        createdAt: now,
        updatedAt: now,
        deleted: false,
        syncStatus: 'pending',
      };
      await persist([...get().tasks, task], [makeHistory('created', 'Task created', task)]);

      const reminder = await withTimeout(scheduleTaskReminder(task), 8000, REMINDER_TIMEOUT_RESULT);
      if (!reminder.scheduled && reminder.reason) {
        set({ notificationNotice: reminder.reason });
      }
      void get().syncNow();
      return task;
    },

    updateTask: async (id, draft) => {
      const current = get().tasks.find((t) => t.id === id);
      if (!current) return;

      const history: HistoryEntry[] = [];
      const next: Task = {
        ...current,
        title: draft.title.trim(),
        description: draft.description.trim(),
        dueDate: draft.dueDate.toISOString(),
        location: draft.location,
        attachments: draft.attachments,
        status: draft.status,
        updatedAt: new Date().toISOString(),
        syncStatus: 'pending',
      };
      history.push(makeHistory('updated', 'Task details updated', next));

      const removed = current.attachments.filter((a) => !next.attachments.some((b) => b.id === a.id));
      for (const att of removed) {
        removeAttachmentFile(att.uri);
        history.push(makeHistory('attachment_removed', `Attachment removed: ${att.fileName}`, next));
      }
      const added = next.attachments.filter((a) => !current.attachments.some((b) => b.id === a.id));
      for (const att of added) {
        history.push(makeHistory('attachment_added', `Attachment added: ${att.fileName}`, next));
      }

      const nextTasks = get().tasks.map((t) => (t.id === id ? next : t));
      await persist(nextTasks, history);

      void cancelTaskReminder(id);
      const reminder = await withTimeout(scheduleTaskReminder(next), 8000, REMINDER_TIMEOUT_RESULT);
      if (!reminder.scheduled && reminder.reason) {
        set({ notificationNotice: reminder.reason });
      }
      void get().syncNow();
    },

    deleteTask: async (id) => {
      try {
        const current = get().tasks.find((t) => t.id === id);
        if (!current) return;
        void cancelTaskReminder(id);
        for (const att of current.attachments) removeAttachmentFile(att.uri);

        const tombstone: Task = { ...current, deleted: true, syncStatus: 'pending', updatedAt: new Date().toISOString() };
        const nextTasks = get().tasks.map((t) => (t.id === id ? tombstone : t));
        await persist(nextTasks, [makeHistory('deleted', 'Task deleted', current)]);
        void get().syncNow();
      } catch (error) {
        set({
          notificationNotice: `Could not delete the task: ${error instanceof Error ? error.message : 'unknown error'}`,
        });
      }
    },

    setTaskStatus: async (id, status) => {
      const current = get().tasks.find((t) => t.id === id);
      if (!current || current.status === status) return;
      const next: Task = { ...current, status, updatedAt: new Date().toISOString(), syncStatus: 'pending' };
      const nextTasks = get().tasks.map((t) => (t.id === id ? next : t));
      await persist(nextTasks, [
        makeHistory('status_changed', `Status changed to “${status.replace('_', ' ')}”`, next),
      ]);
      void get().syncNow();
    },

    syncNow: async () => {
      const { syncing, isOnline, tasks } = get();
      if (syncing) return;
      if (!isOnline) {
        set({ lastSyncError: 'Offline — changes will sync when the connection returns.' });
        return;
      }
      set({ syncing: true, lastSyncError: undefined });
      try {
        const outcome = await synchronize(baseUrl(), tasks);
        let merged = get().tasks.map((t) => {
          // Never resurrect a task the user just deleted while this sync was in flight:
          // the pushed snapshot may still hold the pre-delete copy.
          if (t.deleted) return t;
          const pushed = outcome.pushed.find((p) => p.id === t.id);
          return pushed ?? t;
        });

        const history: HistoryEntry[] = [];
        if (outcome.pulled.length > 0 || outcome.pushed.length > 0) {
          const merge = mergeTasks(merged, outcome.pulled);
          merged = merge.merged;
          for (const task of merge.pulled) {
            history.push(makeHistory('synced', `Task pulled from server: ${task.title}`, task));
          }
          // Purge tombstones that the server accepted.
          const purgedIds = outcome.pushed.filter((p) => p.deleted && p.syncStatus === 'synced').map((p) => p.id);
          merged = merged.filter((t) => !purgedIds.includes(t.id));
          if (outcome.pushed.length > 0) {
            history.push(
              makeHistory('synced', `Sync completed: ${outcome.pushed.length} change(s) pushed`),
            );
          }
        }
        if (outcome.failedCount > 0) {
          history.push(makeHistory('sync_failed', `Sync failed for ${outcome.failedCount} item(s)`));
        }

        // json-server regenerates ids on POST — adopt the server id as the canonical
        // local id so future updates/deletes address the same resource on the server.
        for (const change of outcome.idChanges) {
          merged = merged.map((t) => (t.id === change.from ? { ...t, id: change.to } : t));
          void cancelTaskReminder(change.from);
          const adopted = merged.find((t) => t.id === change.to);
          if (adopted) {
            void withTimeout(scheduleTaskReminder(adopted), 8000, REMINDER_TIMEOUT_RESULT);
          }
        }

        set({
          tasks: merged,
          syncing: false,
          lastSyncAt: new Date().toISOString(),
          lastSyncError: outcome.error ?? (outcome.failedCount > 0 ? 'Some changes failed to sync.' : undefined),
        });
        await saveTasks(merged);
        if (history.length > 0) {
          const h = await appendHistory(history);
          set({ history: h });
        }
      } catch (error) {
        set({
          syncing: false,
          lastSyncError: error instanceof Error ? error.message : 'Synchronization failed',
        });
      }
    },

    setDarkMode: (value) => {
      set({ darkMode: value });
      void saveSettings({ darkMode: value, serverUrl: get().serverUrl });
    },

    setServerUrl: (value) => {
      set({ serverUrl: value });
      void saveSettings({ darkMode: get().darkMode, serverUrl: value });
    },

    clearNotificationNotice: () => set({ notificationNotice: undefined }),

    scheduleDemoReminder: async (taskId) => {
      const task = get().tasks.find((t) => t.id === taskId);
      if (!task) return undefined;
      const result = await scheduleDemoNotification(task);
      set({
        notificationNotice: result.scheduled
          ? `Demo notification scheduled — it will fire in about 30 seconds for “${task.title}”.`
          : (result.reason ?? 'Could not schedule the demo notification.'),
      });
      return result;
    },
  };
});

export function selectVisibleTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.deleted);
}

export function syncStatusLabel(task: Task): string {
  const map: Record<SyncStatus, string> = {
    pending: 'Pending Sync',
    synced: 'Synced',
    failed: 'Sync Failed',
  };
  return map[task.syncStatus];
}
