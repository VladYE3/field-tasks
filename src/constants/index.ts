import type { TaskStatus } from '../types';

/** Unique candidate code required by the assignment. Shown in Settings, README and the demo video. */
export const CANDIDATE_CODE = 'SA-RN-4676';

export const APP_NAME = 'Field Tasks';

export const STATUS_ORDER: Record<TaskStatus, number> = {
  new: 0,
  in_progress: 1,
  completed: 2,
  cancelled: 3,
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  new: 'New',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const NOTIFICATION_LEAD_MINUTES = 30;

/** Fallback: if the due date is sooner than 30 minutes, the reminder fires 1 minute before the due time. */
export const NOTIFICATION_FALLBACK_LEAD_MINUTES = 1;

export const DEMO_NOTIFICATION_DELAY_SECONDS = 30;

export const NOTIFICATION_CHANNEL_ID = 'task-reminders';

export const DEFAULT_SERVER_URL = 'http://10.0.2.2:3001';

export const SERVER_TIMEOUT_MS = 8000;

/**
 * Predefined locations for the map. Lets a field employee pick a site without
 * real geocoding (which is optional per the assignment).
 */
export const PREDEFINED_LOCATIONS: { address: string; latitude: number; longitude: number }[] = [
  { address: 'Central Depot, 1 Industrial Way', latitude: 55.7558, longitude: 37.6173 },
  { address: 'North Substation, 12 High Voltage Rd', latitude: 55.8187, longitude: 37.601 },
  { address: 'Riverside Pump Station, 4 Embankment St', latitude: 55.74, longitude: 37.62 },
  { address: 'West Warehouse, 88 Logistics Ave', latitude: 55.76, longitude: 37.55 },
];
