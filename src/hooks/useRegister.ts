import { useState, useCallback } from "react";
import { toast } from "sonner";
import type { RegisterFormData } from "@/schemas/auth.schemas";

interface UseRegisterResult {
  register: (data: RegisterFormData) => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function useRegister(): UseRegisterResult {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.error?.message || "Wystąpił błąd podczas rejestracji";
        setError(errorMessage);
        toast.error("Błąd rejestracji", { description: errorMessage });
        throw new Error(errorMessage);
      }

      // Success - auto-login enabled (no email confirmation for MVP)
      toast.success("Konto utworzone pomyślnie!");
      window.location.href = "/dashboard";
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Wystąpił błąd podczas rejestracji";
      setError(errorMessage);
      toast.error("Błąd rejestracji", { description: errorMessage });
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return { register, isSubmitting, error };
}
