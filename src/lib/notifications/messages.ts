import type { NotificationMessages, NotificationType } from "./types";

/**
 * Helper to create a  message with a default type
 */
const createMessage = (title: string, description?: string, type: NotificationType = "info") => ({
  title,
  description,
  type,
});

/**
 * Central dictionary of all notification messages
 *
 * Key naming convention: CATEGORY.ACTION_STATUS
 * - CATEGORY: section of the application (AUTH, GROUP, etc.)
 * - ACTION: action performed (LOGIN, CREATE, DELETE, etc.)
 * - STATUS: result of the action (SUCCESS, ERROR, WARNING, INFO)
 *
 * Examples:
 * - AUTH.LOGIN_SUCCESS
 * - GROUP.CREATE_ERROR
 * - PARTICIPANT.DELETE_SUCCESS
 *
 * @example
 * // Usage in code
 * import { notify } from '@/lib/notifications';
 * notify.success('AUTH.LOGIN_SUCCESS');
 */
export const NOTIFICATION_MESSAGES: NotificationMessages = {
  // ============================================================================
  // AUTHENTICATION (Authentication)
  // ============================================================================

  "AUTH.LOGIN_SUCCESS": createMessage("Zalogowano pomyślnie!", undefined, "success"),

  "AUTH.LOGIN_ERROR": createMessage("Błąd logowania", "Nieprawidłowy email lub hasło", "error"),

  "AUTH.REGISTER_SUCCESS": createMessage("Konto utworzone pomyślnie!", "Możesz teraz korzystać z aplikacji", "success"),

  "AUTH.REGISTER_ERROR": createMessage("Błąd rejestracji", "Nie udało się utworzyć konta", "error"),

  "AUTH.LOGOUT_SUCCESS": createMessage("Wylogowano pomyślnie", undefined, "success"),

  "AUTH.LOGOUT_ERROR": createMessage("Błąd podczas wylogowania", "Spróbuj ponownie", "error"),

  "AUTH.PASSWORD_RESET_EMAIL_SENT": createMessage("Email wysłany!", "Sprawdź swoją skrzynkę pocztową", "success"),

  "AUTH.PASSWORD_RESET_ERROR": createMessage("Błąd", "Nie udało się wysłać emaila", "error"),

  "AUTH.PASSWORD_CHANGED_SUCCESS": createMessage("Hasło zmienione pomyślnie!", undefined, "success"),

  "AUTH.PASSWORD_CHANGE_ERROR": createMessage("Błąd", "Nie udało się zmienić hasła", "error"),

  "AUTH.TERMS_INFO": createMessage("Regulamin będzie dostępny wkrótce", undefined, "info"),

  "AUTH.PRIVACY_INFO": createMessage("Polityka prywatności będzie dostępna wkrótce", undefined, "info"),

  // ============================================================================
  // GROUP (Groups)
  // ============================================================================

  "GROUP.CREATE_SUCCESS": createMessage(
    "Lottery has been created successfully!",
    "You can now add participants",
    "success"
  ),

  "GROUP.CREATE_ERROR": createMessage("Nie udało się utworzyć loterii", "Spróbuj ponownie", "error"),

  "GROUP.UPDATE_SUCCESS": createMessage("Grupa została zaktualizowana", undefined, "success"),

  "GROUP.UPDATE_ERROR": createMessage("Nie udało się zaktualizować grupy", undefined, "error"),

  "GROUP.DELETE_SUCCESS": createMessage("Grupa została usunięta", undefined, "success"),

  "GROUP.DELETE_ERROR": createMessage("Nie udało się usunąć grupy", undefined, "error"),

  "GROUP.DELETE_ERROR_GENERAL": createMessage("Wystąpił błąd podczas usuwania grupy", undefined, "error"),

  // ============================================================================
  // PARTICIPANT (Uczestnicy)
  // ============================================================================

  "PARTICIPANT.ADD_SUCCESS": createMessage("Uczestnik dodany.", undefined, "success"),

  "PARTICIPANT.ADD_SUCCESS_WITH_LINK": createMessage(
    "Uczestnik dodany. Link dostępu skopiowany do schowka.",
    undefined,
    "success"
  ),

  "PARTICIPANT.ADD_SUCCESS_LINK_COPY_FAILED": createMessage(
    "Uczestnik dodany. Nie udało się skopiować linku.",
    undefined,
    "success"
  ),

  "PARTICIPANT.ADD_ERROR": createMessage("Nie udało się dodać uczestnika. Spróbuj ponownie.", undefined, "error"),

  "PARTICIPANT.UPDATE_SUCCESS": createMessage("Uczestnik został zaktualizowany", undefined, "success"),

  "PARTICIPANT.UPDATE_ERROR": createMessage("Nie udało się zaktualizować uczestnika", undefined, "error"),

  "PARTICIPANT.UPDATE_ERROR_GENERAL": createMessage(
    "Wystąpił błąd podczas aktualizacji uczestnika",
    undefined,
    "error"
  ),

  "PARTICIPANT.DELETE_SUCCESS": createMessage("Uczestnik został usunięty", undefined, "success"),

  "PARTICIPANT.DELETE_ERROR": createMessage("Nie udało się usunąć uczestnika", undefined, "error"),

  // ============================================================================
  // EXCLUSION (Wykluczenia)
  // ============================================================================

  "EXCLUSION.ADD_SUCCESS": createMessage("Wykluczenie zostało dodane", undefined, "success"),

  "EXCLUSION.ADD_BIDIRECTIONAL_SUCCESS": createMessage("Dwustronne wykluczenie zostało dodane", undefined, "success"),

  "EXCLUSION.ADD_ERROR": createMessage("Nie udało się dodać wykluczenia. Spróbuj ponownie.", undefined, "error"),

  "EXCLUSION.ADD_ERROR_GENERAL": createMessage(
    "Nie udało się dodać wykluczenia. Spróbuj ponownie.",
    undefined,
    "error"
  ),

  "EXCLUSION.ADD_DUPLICATE": createMessage("Ta reguła wykluczenia już istnieje", undefined, "error"),

  "EXCLUSION.ADD_REVERSE_EXISTS": createMessage("Odwrotna reguła wykluczenia już istnieje", undefined, "error"),

  "EXCLUSION.ADD_PARTIAL_SUCCESS": createMessage(
    "Pierwsze wykluczenie dodane, ale nie udało się dodać odwrotnego wykluczenia",
    undefined,
    "warning"
  ),

  "EXCLUSION.DELETE_SUCCESS": createMessage("Wykluczenie zostało usunięte", undefined, "success"),

  "EXCLUSION.DELETE_ERROR": createMessage("Nie udało się usunąć wykluczenia", undefined, "error"),

  // ============================================================================
  // DRAW (Losowanie)
  // ============================================================================

  "DRAW.EXECUTE_SUCCESS": createMessage(
    "Losowanie zostało pomyślnie wykonane!",
    "Uczestnicy mogą teraz sprawdzić swoje wyniki",
    "success"
  ),

  "DRAW.EXECUTE_ERROR": createMessage("Nie udało się wykonać losowania", undefined, "error"),

  "DRAW.EXECUTE_ERROR_GENERAL": createMessage("Wystąpił błąd podczas wykonania losowania", undefined, "error"),

  // ============================================================================
  // CLIPBOARD (Schowek)
  // ============================================================================

  "CLIPBOARD.COPY_SUCCESS": createMessage("Link skopiowany do schowka", undefined, "success"),

  "CLIPBOARD.COPY_ERROR": createMessage("Nie udało się skopiować linku. Spróbuj ponownie.", undefined, "error"),

  "CLIPBOARD.COPY_LINK_ERROR": createMessage("Nie udało się skopiować linku", undefined, "error"),

  // ============================================================================
  // WISHLIST (Listy życzeń)
  // ============================================================================

  "WISHLIST.SAVE_SUCCESS": createMessage("Lista życzeń została zapisana", undefined, "success"),

  "WISHLIST.SAVE_ERROR": createMessage("Nie udało się zapisać listy życzeń", undefined, "error"),

  // ============================================================================
  // GENERAL (Ogólne)
  // ============================================================================

  "GENERAL.NETWORK_ERROR": createMessage("Błąd połączenia", "Sprawdź połączenie z internetem", "error"),

  "GENERAL.UNKNOWN_ERROR": createMessage("Wystąpił nieznany błąd", "Spróbuj ponownie", "error"),

  "GENERAL.LOADING": createMessage("Ładowanie...", undefined, "info"),

  "GENERAL.SUCCESS": createMessage("Operacja zakończona pomyślnie", undefined, "success"),
} as const;

/**
 * Type helper - extract keys as a union type for better IDE suggestions
 */
export type MessageKey = keyof typeof NOTIFICATION_MESSAGES;

/**
 * Helper to check if a key exists in the dictionary
 */
export const isValidMessageKey = (key: string): key is MessageKey => {
  return key in NOTIFICATION_MESSAGES;
};

/**
 * Helper to get a message from the dictionary
 */
export const getMessage = (key: MessageKey) => {
  return NOTIFICATION_MESSAGES[key];
};
