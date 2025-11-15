import { toast } from "sonner";
import type {
  INotificationService,
  NotificationInput,
  NotificationMessage,
  NotificationOptions,
  NotificationType,
} from "./types";
import { NOTIFICATION_MESSAGES, isValidMessageKey, type MessageKey } from "./messages";

/**
 * Notification Service - a central access point to the notification system
 *
 * Wrapper over the Sonner library providing:
 * - Centralized management of messages
 * - TypeScript typing
 * - Consistent API
 * - Easy migration in the future
 *
 * @example
 * // Usage with a message key from the dictionary
 * notify.success('AUTH.LOGIN_SUCCESS');
 *
 * @example
 * // Usage with a custom message
 * notify.error({ title: 'Custom error', description: 'Details...' });
 *
 * @example
 * // With additional options
 * notify.info('GENERAL.LOADING', { duration: 2000 });
 */
class NotificationService implements INotificationService {
  /**
   * Processes the input and returns a NotificationMessage
   * @private
   */
  private resolveMessage(input: NotificationInput): NotificationMessage {
    // If input is a string, treat it as a message key from the dictionary
    if (typeof input === "string") {
      if (isValidMessageKey(input)) {
        return NOTIFICATION_MESSAGES[input];
      }

      // Fallback: if the key does not exist, return it as the title
      console.warn(`[NotificationService] Unknown message key: "${input}". Using as title.`);
      return { title: input, type: "info" };
    }

    // If input is a NotificationMessage object, use it directly
    return input;
  }

  /**
   * Calls the appropriate Sonner toast method
   * @private
   */
  private displayToast(type: NotificationType, message: NotificationMessage, options?: NotificationOptions): void {
    const { title, description } = message;
    const toastOptions = { description, ...options };

    switch (type) {
      case "success":
        toast.success(title, toastOptions);
        break;
      case "error":
        toast.error(title, toastOptions);
        break;
      case "warning":
        toast.warning(title, toastOptions);
        break;
      case "info":
        toast.info(title, toastOptions);
        break;
      default:
        // Fallback to toast (default)
        toast(title, toastOptions);
    }
  }

  /**
   * Display a success notification
   */
  success(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast("success", message, options);
  }

  /**
   * Display an error notification
   */
  error(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast("error", message, options);
  }

  /**
   * Display an info notification
   */
  info(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast("info", message, options);
  }

  /**
   * Display a warning notification
   */
  warning(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast("warning", message, options);
  }

  /**
   * Universal method to display a notification
   */
  show(type: NotificationType, input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast(type, message, options);
  }

  /**
   * Close a specific notification by ID
   * If no ID is provided, closes all notifications
   */
  dismiss(toastId?: string | number): void {
    if (toastId !== undefined) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  /**
   * Get a message from the dictionary (useful for tests/debugging)
   */
  getMessage(key: MessageKey): NotificationMessage | undefined {
    return isValidMessageKey(key) ? NOTIFICATION_MESSAGES[key] : undefined;
  }
}

export const notify = new NotificationService();

export { NotificationService };
