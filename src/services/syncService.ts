import { apiFetch, ApiError } from '../api/client';
import type { Task } from '../types';

export interface SyncOutcome {
  pushed: Task[];
  pulled: Task[];
  purgedIds: string[];
  failedCount: number;
  error?: string;
  /** Ids the server regenerated on POST — the store adopts them as the canonical local ids. */
  idChanges: { from: string; to: string }[];
}

/**
 * Pure merge used by the store and unit tests. Last-write-wins by `updatedAt`;
 * the remote copy wins ties so re-installing the app converges toward the server.
 */
export function mergeTasks(local: Task[], remote: Task[]): { merged: Task[]; pulled: Task[] } {
  const byId = new Map<string, Task>();
  const pulled: Task[] = [];

  for (const task of local) byId.set(task.id, task);
  for (const task of remote) {
    const existing = byId.get(task.id);
    if (!existing) {
      byId.set(task.id, { ...task, syncStatus: 'synced' });
      pulled.push(task);
    } else if (existing.deleted) {
      // A local tombstone is authoritative: a server copy (e.g. one a concurrent sync
      // re-created before the DELETE landed) must never resurrect a deleted task.
      continue;
    } else if (task.updatedAt >= existing.updatedAt) {
      byId.set(task.id, { ...task, syncStatus: 'synced', deleted: task.deleted ?? false });
      pulled.push(task);
    }
  }
  return { merged: Array.from(byId.values()), pulled };
}

/**
 * Pushes every locally changed task to the mock server, then pulls the remote list and merges.
 * Tombstones (deleted tasks) are removed from local storage once the server accepted the deletion.
 */
export async function synchronize(baseUrl: string, localTasks: Task[]): Promise<SyncOutcome> {
  let pushed: Task[] = [];
  let failedCount = 0;

  try {
    const dirty = localTasks.filter((t) => t.syncStatus !== 'synced');
    // json-server generates its own ids on POST and ignores the client-provided one,
    // so remember the mapping to avoid pulling the just-created task back as "new".
    const idRemap = new Map<string, string>();
    const idChanges: { from: string; to: string }[] = [];
    for (const task of dirty) {
      try {
        if (task.deleted) {
          try {
            await apiFetch(baseUrl, `/tasks/${task.id}`, { method: 'DELETE' });
          } catch (error) {
            // A 404 means the server never knew this task — treat deletion as done.
            if (!(error instanceof ApiError && error.status === 404)) throw error;
          }
        } else {
          const { syncStatus: _s, ...payload } = task;
          try {
            await apiFetch(baseUrl, `/tasks/${task.id}`, { method: 'PUT', body: payload });
          } catch (error) {
            // PUT fails for tasks the server doesn't have yet — create them instead.
            if (error instanceof ApiError && error.status === 404) {
              const created = await apiFetch<Task>(baseUrl, `/tasks`, { method: 'POST', body: payload });
              if (created && created.id && created.id !== task.id) {
                idRemap.set(created.id, task.id);
                idChanges.push({ from: task.id, to: created.id });
              }
            } else {
              throw error;
            }
          }
        }
        pushed.push({ ...task, syncStatus: 'synced', lastSyncedAt: new Date().toISOString() });
      } catch (error) {
        failedCount += 1;
        pushed.push({ ...task, syncStatus: 'failed' });
        console.warn(`Failed to sync task ${task.id}`, error);
      }
    }

    const remote = await apiFetch<Task[]>(baseUrl, '/tasks');
    const remapped = remote.map((task) => {
      const localId = idRemap.get(task.id);
      return localId ? { ...task, id: localId } : task;
    });
    return { pushed, pulled: remapped, purgedIds: [], failedCount, idChanges };
  } catch (error) {
    return {
      pushed,
      pulled: [],
      purgedIds: [],
      failedCount: failedCount + 1,
      idChanges: [],
      error: error instanceof Error ? error.message : 'Synchronization failed',
    };
  }
}
