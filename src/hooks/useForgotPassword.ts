import { useState, useCallback } from "react";
import { notify } from "@/lib/notifications";

interface UseForgotPasswordReturn {
  requestPasswordReset: (email: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  isSubmitting: boolean;
  emailSent: boolean;
  apiError: string | null;
  resetState: () => void;
}

/**
 * Custom hook for handling forgot password functionality
 *
 * Encapsulates API call logic, state management, and toast notifications
 * for the password reset flow.
 *
 * @returns Object containing requestPasswordReset function and related state
 *
 * @example
 * ```tsx
 * const { requestPasswordReset, isSubmitting, emailSent, apiError } = useForgotPassword();
 *
 * const onSubmit = async (data) => {
 *   await requestPasswordReset(data.email);
 * };
 * ```
 */
export const useForgotPassword = (): UseForgotPasswordReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const requestPasswordReset = useCallback(async (email: string) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle API error
        const errorMessage = result.error?.message || "Wystąpił błąd podczas wysyłania emaila";
        setApiError(errorMessage);
        notify.error('AUTH.PASSWORD_RESET_ERROR');
        return { success: false, error: errorMessage };
      }

      // Success
      setEmailSent(true);
      notify.success('AUTH.PASSWORD_RESET_EMAIL_SENT');
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas wysyłania emaila";
      setApiError(errorMessage);
      notify.error('AUTH.PASSWORD_RESET_ERROR');
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const resetState = useCallback(() => {
    setEmailSent(false);
    setApiError(null);
    setIsSubmitting(false);
  }, []);

  return {
    requestPasswordReset,
    isSubmitting,
    emailSent,
    apiError,
    resetState,
  };
};
