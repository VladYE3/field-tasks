import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  tasks: '@fieldtasks/tasks',
  history: '@fieldtasks/history',
  settings: '@fieldtasks/settings',
} as const;

export async function readJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn(`Failed to read ${key} from storage`, error);
    return fallback;
  }
}

export async function writeJSON(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const StorageKeys = KEYS;
