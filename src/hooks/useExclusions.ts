import { useState, useEffect, useCallback } from "react";
import { exclusionsService } from "@/services/exclusions.service";
import type { ExclusionRuleListItemDTO, CreateExclusionRuleCommand, ApiError } from "@/types";

/**
 * Hook for managing exclusion rules
 * Handles adding and deleting exclusion rules
 */
export function useExclusions(groupId: number) {
  const [exclusions, setExclusions] = useState<ExclusionRuleListItemDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Fetching exclusions
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

  // Adding an exclusion
  const addExclusion = useCallback(
    async (command: CreateExclusionRuleCommand) => {
      try {
        const newExclusion = await exclusionsService.create(groupId, command);
        await fetchExclusions(); // Refresh list

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

  // Deleting an exclusion
  const deleteExclusion = useCallback(
    async (exclusionId: number) => {
      try {
        await exclusionsService.delete(exclusionId);
        await fetchExclusions(); // Refresh list

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

  // Fetch data on mount
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
