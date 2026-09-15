import type { HistoryEntry } from '../types';
import { readJSON, writeJSON, StorageKeys } from './storage';

const MAX_ENTRIES = 500;

export async function loadHistory(): Promise<HistoryEntry[]> {
  return readJSON<HistoryEntry[]>(StorageKeys.history, []);
}

export async function appendHistory(entries: HistoryEntry[]): Promise<HistoryEntry[]> {
  const current = await loadHistory();
  const merged = [...entries, ...current].slice(0, MAX_ENTRIES);
  await writeJSON(StorageKeys.history, merged);
  return merged;
}
