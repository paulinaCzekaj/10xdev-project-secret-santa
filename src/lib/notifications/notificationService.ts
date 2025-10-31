import { toast } from 'sonner';
import type {
  INotificationService,
  NotificationInput,
  NotificationMessage,
  NotificationOptions,
  NotificationType
} from './types';
import { NOTIFICATION_MESSAGES, isValidMessageKey, type MessageKey } from './messages';

/**
 * Notification Service - główny punkt dostępu do systemu notyfikacji
 *
 * Wrapper nad biblioteką Sonner zapewniający:
 * - Scentralizowane zarządzanie komunikatami
 * - Typowanie TypeScript
 * - Spójne API
 * - Łatwą migrację w przyszłości
 *
 * @example
 * // Użycie z kluczem ze słownika
 * notify.success('AUTH.LOGIN_SUCCESS');
 *
 * @example
 * // Użycie z custom message
 * notify.error({ title: 'Custom error', description: 'Details...' });
 *
 * @example
 * // Z dodatkowymi opcjami
 * notify.info('GENERAL.LOADING', { duration: 2000 });
 */
class NotificationService implements INotificationService {
  /**
   * Przetwarza input i zwraca NotificationMessage
   * @private
   */
  private resolveMessage(input: NotificationInput): NotificationMessage {
    // Jeśli input to string, traktuj jako klucz ze słownika
    if (typeof input === 'string') {
      if (isValidMessageKey(input)) {
        return NOTIFICATION_MESSAGES[input];
      }

      // Fallback: jeśli klucz nie istnieje, zwróć jako tytuł
      console.warn(`[NotificationService] Unknown message key: "${input}". Using as title.`);
      return { title: input, type: 'info' };
    }

    // Jeśli input to obiekt NotificationMessage, użyj go bezpośrednio
    return input;
  }

  /**
   * Wywołuje odpowiednią metodę Sonner toast
   * @private
   */
  private displayToast(
    type: NotificationType,
    message: NotificationMessage,
    options?: NotificationOptions
  ): void {
    const { title, description } = message;
    const toastOptions = { description, ...options };

    switch (type) {
      case 'success':
        toast.success(title, toastOptions);
        break;
      case 'error':
        toast.error(title, toastOptions);
        break;
      case 'warning':
        toast.warning(title, toastOptions);
        break;
      case 'info':
        toast.info(title, toastOptions);
        break;
      default:
        // Fallback na toast (domyślny)
        toast(title, toastOptions);
    }
  }

  /**
   * Wyświetl notyfikację sukcesu
   */
  success(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast('success', message, options);
  }

  /**
   * Wyświetl notyfikację błędu
   */
  error(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast('error', message, options);
  }

  /**
   * Wyświetl notyfikację informacyjną
   */
  info(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast('info', message, options);
  }

  /**
   * Wyświetl notyfikację ostrzeżenia
   */
  warning(input: NotificationInput, options?: NotificationOptions): void {
    const message = this.resolveMessage(input);
    this.displayToast('warning', message, options);
  }

  /**
   * Uniwersalna metoda wyświetlania notyfikacji
   */
  show(
    type: NotificationType,
    input: NotificationInput,
    options?: NotificationOptions
  ): void {
    const message = this.resolveMessage(input);
    this.displayToast(type, message, options);
  }

  /**
   * Zamknij konkretną notyfikację po ID
   * Jeśli nie podano ID, zamyka wszystkie notyfikacje
   */
  dismiss(toastId?: string | number): void {
    if (toastId !== undefined) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  }

  /**
   * Pobierz wiadomość ze słownika (przydatne dla testów/debugowania)
   */
  getMessage(key: MessageKey): NotificationMessage | undefined {
    return isValidMessageKey(key) ? NOTIFICATION_MESSAGES[key] : undefined;
  }
}

/**
 * Singleton instance notification service
 * Eksportowany jako główny punkt dostępu
 */
export const notify = new NotificationService();

/**
 * Dla zaawansowanych przypadków - eksport klasy
 */
export { NotificationService };
