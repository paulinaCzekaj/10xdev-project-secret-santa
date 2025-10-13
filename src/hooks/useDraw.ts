import { useState, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { DrawValidationDTO, DrawResultDTO, ApiError } from "@/types";

/**
 * Hook do zarządzania procesem losowania
 * Obsługuje walidację i wykonanie losowania
 */
export function useDraw(groupId: number) {
  const [validation, setValidation] = useState<DrawValidationDTO | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Walidacja możliwości losowania
  const validateDraw = useCallback(async () => {
    setIsValidating(true);
    setError(null);

    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}/draw/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd walidacji losowania");
      }

      const data: DrawValidationDTO = await response.json();
      setValidation(data);

      return { success: true, data };
    } catch (err) {
      const errorObj = {
        code: "VALIDATION_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      };
      setError(errorObj);
      return { success: false, error: errorObj };
    } finally {
      setIsValidating(false);
    }
  }, [groupId]);

  // Wykonanie losowania
  const executeDraw = useCallback(async () => {
    setIsDrawing(true);
    setError(null);

    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}/draw`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd wykonania losowania");
      }

      const result: DrawResultDTO = await response.json();

      return { success: true, data: result };
    } catch (err) {
      const errorObj = {
        code: "DRAW_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      };
      setError(errorObj);
      return { success: false, error: errorObj };
    } finally {
      setIsDrawing(false);
    }
  }, [groupId]);

  return {
    validation,
    isValidating,
    isDrawing,
    error,
    validateDraw,
    executeDraw,
  };
}
