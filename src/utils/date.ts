export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function isOverdue(dueDate: string, status: string): boolean {
  if (status === 'completed' || status === 'cancelled') return false;
  return new Date(dueDate).getTime() < Date.now();
}

/** Returns the reminder fire date for a due date, or null when no reminder can be scheduled. */
export function getReminderDate(dueDate: Date, now: Date = new Date()): Date | null {
  if (Number.isNaN(dueDate.getTime())) return null;
  if (dueDate.getTime() <= now.getTime()) return null;
  return dueDate;
}

export function toDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function toTimeInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateAndTime(date: string, time: string): Date | null {
  const d = new Date(`${date}T${time || '00:00'}`);
  return Number.isNaN(d.getTime()) ? null : d;
}
