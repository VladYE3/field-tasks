import type { Task } from '../types';
import { readJSON, writeJSON, StorageKeys } from './storage';

export async function loadTasks(): Promise<Task[]> {
  return readJSON<Task[]>(StorageKeys.tasks, []);
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await writeJSON(StorageKeys.tasks, tasks);
}

export async function loadSettings(): Promise<{ darkMode: boolean; serverUrl: string }> {
  return readJSON(StorageKeys.settings, { darkMode: false, serverUrl: '' });
}

export async function saveSettings(settings: { darkMode: boolean; serverUrl: string }): Promise<void> {
  await writeJSON(StorageKeys.settings, settings);
}
