import { useState, useCallback } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/db/supabase.client";
import type { ResetPasswordFormData } from "@/schemas/auth.schemas";

interface UseResetPasswordResult {
  resetPassword: (data: ResetPasswordFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

// Function to get auth error message for password reset
const getAuthErrorMessage = (error: unknown): string => {
  const errorMessages: Record<string, string> = {
    "Token has expired or is invalid": "Token jest nieprawidłowy lub wygasł",
    "User not found": "Użytkownik nie istnieje",
    "Invalid password": "Hasło nie spełnia wymagań",
    "Password should be at least 6 characters": "Hasło musi mieć co najmniej 6 znaków",
  };

  const message = error instanceof Error ? error.message : String(error);
  return errorMessages[message] || "Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.";
};

export function useResetPassword(): UseResetPasswordResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetPassword = useCallback(async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const { error: updateError } = await supabaseClient.auth.updateUser({
        password: data.password,
      });

      if (updateError) {
        throw updateError;
      }

      // Success
      toast.success("Hasło zmienione pomyślnie!");
      window.location.href = "/login?message=password_reset_success";
    } catch (err) {
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
      toast.error("Błąd", { description: errorMessage });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { resetPassword, isSubmitting, error };
}
