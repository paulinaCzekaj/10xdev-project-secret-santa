/**
 * Public API for Notification System
 *
 * @example
 * import { notify } from '@/lib/notifications';
 * notify.success('AUTH.LOGIN_SUCCESS');
 *
 * @example
 * import { notify, NOTIFICATION_MESSAGES } from '@/lib/notifications';
 * const loginSuccess = NOTIFICATION_MESSAGES['AUTH.LOGIN_SUCCESS'];
 * notify.show('success', loginSuccess);
 */

// Główny service (najpopularniejszy export)
export { notify, NotificationService } from './notificationService';

// Słownik komunikatów
export { NOTIFICATION_MESSAGES, getMessage, isValidMessageKey } from './messages';
export type { MessageKey } from './messages';

// Typy
export type {
  NotificationType,
  NotificationMessage,
  NotificationOptions,
  NotificationInput,
  INotificationService,
  MessageCategory,
  NotificationMessages,
} from './types';
