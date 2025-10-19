import { useState, useEffect, useCallback } from "react";
import { exclusionsService } from "@/services/exclusionsService";
import type { ExclusionRuleListItemDTO, CreateExclusionRuleCommand, ApiError } from "@/types";

/**
 * Hook do zarządzania regułami wykluczeń
 * Obsługuje dodawanie i usuwanie wykluczeń
 */
export function useExclusions(groupId: number) {
  const [exclusions, setExclusions] = useState<ExclusionRuleListItemDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Pobieranie wykluczeń
  const fetchExclusions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await exclusionsService.getByGroupId(groupId);
      setExclusions(data.data);
    } catch (err) {
      setError({
        code: "FETCH_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Dodawanie wykluczenia
  const addExclusion = useCallback(
    async (command: CreateExclusionRuleCommand) => {
      try {
        const newExclusion = await exclusionsService.create(groupId, command);
        await fetchExclusions(); // Odśwież listę

        return { success: true, data: newExclusion };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [groupId, fetchExclusions]
  );

  // Usuwanie wykluczenia
  const deleteExclusion = useCallback(
    async (exclusionId: number) => {
      try {
        await exclusionsService.delete(exclusionId);
        await fetchExclusions(); // Odśwież listę

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [fetchExclusions]
  );

  // Pobierz dane przy montowaniu
  useEffect(() => {
    fetchExclusions();
  }, [fetchExclusions]);

  return {
    exclusions,
    loading,
    error,
    refetch: fetchExclusions,
    addExclusion,
    deleteExclusion,
  };
}
