import { NOTIFICATION_LEAD_MINUTES } from '../constants';
import type { TaskDraft } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateTaskDraft(draft: TaskDraft, now: Date = new Date()): ValidationResult {
  const errors: Record<string, string> = {};

  if (!draft.title.trim()) {
    errors.title = 'Title is required';
  } else if (draft.title.trim().length > 120) {
    errors.title = 'Title must be 120 characters or less';
  }

  if (!draft.description.trim()) {
    errors.description = 'Description is required';
  }

  if (!(draft.dueDate instanceof Date) || Number.isNaN(draft.dueDate.getTime())) {
    errors.dueDate = 'Due date and time are required';
  } else if (draft.dueDate.getTime() <= now.getTime()) {
    errors.dueDate = 'Due date must be in the future';
  } else if (draft.dueDate.getTime() - now.getTime() < NOTIFICATION_LEAD_MINUTES * 60 * 1000) {
    // Not a hard error: the notification scheduler falls back to 1 minute before the due time.
    errors.dueDateNotice =
      'Due time is less than 30 minutes away — the reminder will be scheduled 1 minute before the due time instead.';
  }

  if (!draft.location.address.trim()) {
    errors.location = 'Location address is required';
  }

  return { valid: Object.keys(errors).filter((k) => k !== 'dueDateNotice').length === 0, errors };
}
