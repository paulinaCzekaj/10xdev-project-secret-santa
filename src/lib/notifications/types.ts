import type { ToastT } from "sonner";

/**
 * Notification System Types
 *
 * Centralne definicje typów TypeScript dla systemu notyfikacji
 * Zapewniają silne typowanie dla całego systemu
 */

/**
 * Typy notyfikacji wspierane przez system
 * Mapują się bezpośrednio na Sonner toast types
 */
export type NotificationType = "success" | "error" | "info" | "warning";

/**
 * Struktura pojedynczej wiadomości notyfikacji
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
 * Opcje dla Sonner toast
 * Re-eksport z sonner dla spójności typów
 */
export interface NotificationOptions {
  /** Czas wyświetlania w ms (domyślnie: 4000) */
  duration?: number;
  /** Czy można zamknąć klikając (domyślnie: true) */
  dismissible?: boolean;
  /** Pozycja toasta */
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
  /** Custom ID dla toasta */
  id?: string | number;
  /** Callback po zamknięciu */
  onDismiss?: (toast: ToastT) => void;
  /** Callback po auto-dismiss */
  onAutoClose?: (toast: ToastT) => void;
}

/**
 * Klucze kategorii komunikatów
 * Każda kategoria odpowiada sekcji w aplikacji
 */
export type MessageCategory =
  | "AUTH" // Autentykacja (login, register, password reset)
  | "GROUP" // Grupy (CRUD operations)
  | "PARTICIPANT" // Uczestnicy (add, edit, delete)
  | "EXCLUSION" // Wykluczenia (add, delete)
  | "DRAW" // Losowanie (validate, execute)
  | "WISHLIST" // Listy życzeń (save, load)
  | "CLIPBOARD" // Operacje schowka (copy link)
  | "GENERAL"; // Ogólne komunikaty

/**
 * Typ klucza wiadomości - budowany dynamicznie z kategorii
 * Przykład: 'AUTH.LOGIN_SUCCESS', 'GROUP.DELETE_SUCCESS'
 */
export type MessageKey = string;

/**
 * Słownik wszystkich komunikatów
 * Klucz w formacie CATEGORY.ACTION_STATUS
 */
export type NotificationMessages = Record<MessageKey, NotificationMessage>;

/**
 * Input dla funkcji notify - może być klucz lub custom message
 */
export type NotificationInput = MessageKey | NotificationMessage;

/**
 * Interfejs Notification Service
 */
export interface INotificationService {
  /** Wyświetl notyfikację sukcesu */
  success(input: NotificationInput, options?: NotificationOptions): void;

  /** Wyświetl notyfikację błędu */
  error(input: NotificationInput, options?: NotificationOptions): void;

  /** Wyświetl notyfikację informacyjną */
  info(input: NotificationInput, options?: NotificationOptions): void;

  /** Wyświetl notyfikację ostrzeżenia */
  warning(input: NotificationInput, options?: NotificationOptions): void;

  /** Uniwersalna metoda wyświetlania */
  show(type: NotificationType, input: NotificationInput, options?: NotificationOptions): void;

  /** Zamknij konkretną notyfikację po ID */
  dismiss(toastId?: string | number): void;

  /** Pobierz wiadomość ze słownika (dla testów/debugowania) */
  getMessage(key: MessageKey): NotificationMessage | undefined;
}
