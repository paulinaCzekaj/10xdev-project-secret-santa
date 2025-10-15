import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type {
  ExclusionRuleListItemDTO,
  CreateExclusionRuleCommand,
  ExclusionRuleDTO,
  ApiError,
  PaginatedExclusionRulesDTO
} from "@/types";

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
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}/exclusions`, {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd pobierania wykluczeń");
      }

      const data: PaginatedExclusionRulesDTO = await response.json();
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
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/groups/${groupId}/exclusions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd dodawania wykluczenia");
        }

        const newExclusion: ExclusionRuleDTO = await response.json();
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
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/exclusions/${exclusionId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd usuwania wykluczenia");
        }

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
