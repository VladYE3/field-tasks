import { Platform } from 'react-native';
import {
  DEMO_NOTIFICATION_DELAY_SECONDS,
  NOTIFICATION_CHANNEL_ID,
  NOTIFICATION_FALLBACK_LEAD_MINUTES,
  NOTIFICATION_LEAD_MINUTES,
} from '../constants';
import type { Task } from '../types';

type NotificationsModule = typeof import('expo-notifications');

export interface ReminderScheduleResult {
  scheduled: boolean;
  fireDate?: Date;
  fallbackUsed?: boolean;
  reason?: string;
}

const UNAVAILABLE_REASON = 'Notifications are unavailable in this build.';

let notificationsModule: NotificationsModule | null | undefined;

/**
 * Load lazily so notification setup cannot block task creation if the native module is unavailable.
 * A synchronous require is used deliberately: `await import()` compiles to an async
 * require that can hang in release (Hermes) builds, which would freeze task creation.
 */
function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('expo-notifications') as NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    notificationsModule = mod;
  } catch (error) {
    console.warn('expo-notifications is unavailable', error);
    notificationsModule = null;
  }
  return notificationsModule;
}

/** Some devices leave expo-notifications promises pending; never let that block task CRUD. */
function withRace<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms))]);
}

export async function ensureNotificationChannel(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;
  if (Platform.OS !== 'android') return;
  try {
    await withRace(
      Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: 'Task reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A7EA4',
      }),
      5000,
      undefined,
    );
  } catch (error) {
    console.warn('Failed to create notification channel', error);
  }
}

type PermissionState = 'granted' | 'denied' | 'unavailable';

async function resolvePermissions(): Promise<PermissionState> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unavailable';
  try {
    await ensureNotificationChannel();
    const current = await withRace(Notifications.getPermissionsAsync(), 10000, null);
    if (current === null) return 'unavailable';
    if (current.granted) return 'granted';
    // The system permission dialog may stay open longer than the timeout — that is fine:
    // the request keeps running in the background and a later call observes the result.
    const requested = await withRace(Notifications.requestPermissionsAsync(), 10000, null);
    if (requested === null) return 'unavailable';
    return requested.granted ? 'granted' : 'denied';
  } catch (error) {
    console.warn('Notification permission check failed', error);
    return 'unavailable';
  }
}

export async function requestNotificationPermissions(): Promise<boolean> {
  return (await resolvePermissions()) === 'granted';
}

export function reminderIdentifier(taskId: string): string {
  return `task-reminder-${taskId}`;
}

/**
 * Schedules a local notification 30 minutes before the due date.
 * If the due time is closer than 30 minutes (but still in the future), falls back to
 * NOTIFICATION_FALLBACK_LEAD_MINUTES before the due time so the user still gets a reminder.
 * Returns a result object instead of throwing so callers can surface a friendly message.
 */
export async function scheduleTaskReminder(task: Task): Promise<ReminderScheduleResult> {
  const due = new Date(task.dueDate);
  if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) {
    return { scheduled: false, reason: 'Due date is in the past — no reminder scheduled.' };
  }

  const leadMs = NOTIFICATION_LEAD_MINUTES * 60 * 1000;
  const fallbackMs = NOTIFICATION_FALLBACK_LEAD_MINUTES * 60 * 1000;
  const useFallback = due.getTime() - Date.now() < leadMs;
  const fireDate = new Date(useFallback ? due.getTime() - fallbackMs : due.getTime() - leadMs);

  // Avoid double-firing when a reminder moment has already passed.
  if (fireDate.getTime() <= Date.now()) {
    return { scheduled: false, reason: 'The reminder moment has already passed.' };
  }

  const permission = await resolvePermissions();
  if (permission === 'unavailable') {
    return { scheduled: false, reason: UNAVAILABLE_REASON };
  }
  if (permission === 'denied') {
    return { scheduled: false, reason: 'Notification permission was not granted.' };
  }
  try {
    const Notifications = getNotifications();
    if (!Notifications) return { scheduled: false, reason: UNAVAILABLE_REASON };
    const result = await withRace(
      Notifications.scheduleNotificationAsync({
        identifier: reminderIdentifier(task.id),
        content: {
          title: 'Task reminder',
          body: `“${task.title}” is due ${useFallback ? 'soon' : 'in 30 minutes'} (${task.location.address}).`,
          data: { taskId: task.id },
          ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
      }),
      10000,
      'timeout' as const,
    );
    if (result === 'timeout') {
      return { scheduled: false, reason: 'Reminder scheduling timed out — the task was saved.' };
    }
    return { scheduled: true, fireDate, fallbackUsed: useFallback };
  } catch (error) {
    console.warn('Failed to schedule notification', error);
    return { scheduled: false, reason: 'Failed to schedule the notification.' };
  }
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return;
    await withRace(
      Notifications.cancelScheduledNotificationAsync(reminderIdentifier(taskId)),
      5000,
      undefined,
    );
  } catch (error) {
    console.warn('Failed to cancel notification', error);
  }
}

/**
 * Demo mode for the review video: triggers the same notification pipeline after a short delay.
 */
export async function scheduleDemoNotification(task: Task): Promise<ReminderScheduleResult> {
  const permission = await resolvePermissions();
  if (permission === 'unavailable') {
    return { scheduled: false, reason: UNAVAILABLE_REASON };
  }
  if (permission === 'denied') {
    return { scheduled: false, reason: 'Notification permission was not granted.' };
  }
  const fireDate = new Date(Date.now() + DEMO_NOTIFICATION_DELAY_SECONDS * 1000);
  try {
    const Notifications = getNotifications();
    if (!Notifications) return { scheduled: false, reason: UNAVAILABLE_REASON };
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Demo: task reminder',
        body: `This is the demo notification for “${task.title}”. In production it fires 30 minutes before the due time.`,
        data: { taskId: task.id },
        ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: DEMO_NOTIFICATION_DELAY_SECONDS,
        repeats: false,
        ...(Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNEL_ID } : {}),
      },
    });
    if (!identifier) {
      return { scheduled: false, reason: 'Android did not return a notification identifier.' };
    }
    return { scheduled: true, fireDate, fallbackUsed: true };
  } catch (error) {
    console.warn('Failed to schedule demo notification', error);
    return { scheduled: false, reason: 'Failed to schedule the demo notification.' };
  }
}

export async function getScheduledReminderIds(): Promise<string[]> {
  const Notifications = getNotifications();
  if (!Notifications) return [];
  const scheduled = await withRace(Notifications.getAllScheduledNotificationsAsync(), 5000, []);
  return scheduled.map((n) => n.identifier);
}
