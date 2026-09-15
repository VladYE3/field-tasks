export type TaskStatus = 'new' | 'in_progress' | 'completed' | 'cancelled';

export type SyncStatus = 'pending' | 'synced' | 'failed';

export interface TaskLocation {
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface Attachment {
  id: string;
  uri: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO 8601
  location: TaskLocation;
  attachments: Attachment[];
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt?: string;
}

export type HistoryActionType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'attachment_added'
  | 'attachment_removed'
  | 'deleted'
  | 'synced'
  | 'sync_failed';

export interface HistoryEntry {
  id: string;
  taskId?: string;
  taskTitle?: string;
  action: HistoryActionType;
  description: string;
  timestamp: string; // ISO 8601
}

export type SortOption = 'createdAt' | 'dueDate' | 'status';

export type StatusFilter = 'all' | TaskStatus;

export interface TaskFilters {
  query: string;
  status: StatusFilter;
  dateFrom?: string;
  dateTo?: string;
}

export interface TaskDraft {
  title: string;
  description: string;
  dueDate: Date;
  location: TaskLocation;
  attachments: Attachment[];
  status: TaskStatus;
}
