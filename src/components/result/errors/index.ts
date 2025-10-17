/**
 * Centralny rejestr komponentów błędów dla ResultView
 * Mapowanie kodów błędów na odpowiednie komponenty
 */

export { ErrorWrapper } from "./ErrorWrapper";
export { DrawNotCompletedError } from "./DrawNotCompletedError";
export { UnauthorizedError } from "./UnauthorizedError";
export { ForbiddenError } from "./ForbiddenError";
export { InvalidTokenError } from "./InvalidTokenError";
export { GroupNotFoundError } from "./GroupNotFoundError";
export { NetworkError } from "./NetworkError";
export { GenericError } from "./GenericError";

/**
 * Rejestr komponentów błędów
 * Używany do dynamicznego wyboru właściwego komponentu na podstawie kodu błędu
 */
export const ERROR_COMPONENTS = {
  DRAW_NOT_COMPLETED: "DrawNotCompletedError",
  UNAUTHORIZED: "UnauthorizedError",
  FORBIDDEN: "ForbiddenError",
  INVALID_TOKEN: "InvalidTokenError",
  GROUP_NOT_FOUND: "GroupNotFoundError",
  NETWORK_ERROR: "NetworkError",
} as const;

export type ErrorCode = keyof typeof ERROR_COMPONENTS;
