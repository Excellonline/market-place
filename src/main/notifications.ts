import { Notification } from 'electron';
import type { NotificationPayload } from '@shared/types/ipc';
import { logger } from './logger';

export function notify(payload: NotificationPayload): void {
  try {
    if (!Notification.isSupported()) return;
    new Notification({ title: payload.title, body: payload.body, silent: payload.level === 'info' }).show();
  } catch (err) {
    logger().warn({ err }, 'desktop notification failed');
  }
}
