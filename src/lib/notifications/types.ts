import type { ToastT } from "sonner";

/**
 * Notification System Types
 *
 * Central definitions of TypeScript types for the notification system
 * Provides strong typing for the entire system
 */

/**
 * Notification types supported by the system
 * Map to Sonner toast types directly
 */
export type NotificationType = "success" | "error" | "info" | "warning";

/**
 * Structure of a single notification message
 */
export interface NotificationMessage {
  /** Tytuł notyfikacji (wymagany) */
  title: string;
  /** Opcjonalny dodatkowy opis */
  description?: string;
  /** Typ notyfikacji (domyślnie: 'info') */
  type?: NotificationType;
}

/**
 * Options for Sonner toast
 *  Re-export from sonner for consistency
 */
export interface NotificationOptions {
  /** Display duration in ms (default: 4000) */
  duration?: number;
  /** Whether it can be closed by clicking (default: true) */
  dismissible?: boolean;
  /** Position of the toast */
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  /** Custom ID for the toast */
  id?: string | number;
  /** Callback on close */
  onDismiss?: (toast: ToastT) => void;
  /** Callback on auto-dismiss */
  onAutoClose?: (toast: ToastT) => void;
}

/**
 * Message category keys
 * Each category corresponds to a section of the application
 */
export type MessageCategory =
  | "AUTH" // Authentication (login, register, password reset)
  | "GROUP" // Groups (CRUD operations)
  | "PARTICIPANT" // Participants (add, edit, delete)
  | "EXCLUSION" // Exclusions (add, delete)
  | "DRAW" // Drawing (validate, execute)
  | "WISHLIST" // Wishlists (save, load)
  | "CLIPBOARD" // Clipboard operations (copy link)
  | "GENERAL"; // General messages

/**
 * Message key type - built dynamically from categories
 * Example: 'AUTH.LOGIN_SUCCESS', 'GROUP.DELETE_SUCCESS'
 */
export type MessageKey = string;

/**
 * Dictionary of all messages
 * Key in the format CATEGORY.ACTION_STATUS
 */
export type NotificationMessages = Record<MessageKey, NotificationMessage>;

/**
 * Input for the notify function - can be a key or a custom message
 */
export type NotificationInput = MessageKey | NotificationMessage;

/**
 * Notification Service interface
 */
export interface INotificationService {
  /** Display a success notification */
  success(input: NotificationInput, options?: NotificationOptions): void;

  /** Display an error notification */
  error(input: NotificationInput, options?: NotificationOptions): void;

  /** Display an info notification */
  info(input: NotificationInput, options?: NotificationOptions): void;

  /** Display a warning notification */
  warning(input: NotificationInput, options?: NotificationOptions): void;

  /** Universal method to display a notification */
  show(type: NotificationType, input: NotificationInput, options?: NotificationOptions): void;

  /** Close a specific notification by ID */
  dismiss(toastId?: string | number): void;

  /** Get a message from the dictionary (for tests/debugging) */
  getMessage(key: MessageKey): NotificationMessage | undefined;
}
