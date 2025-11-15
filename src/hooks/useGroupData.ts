import { useState, useEffect, useCallback } from "react";
import { notify } from "@/lib/notifications";
import { groupsService } from "@/services/groups.service";
import type { GroupDetailDTO, UpdateGroupCommand, ApiError } from "@/types";

/**
 * Hook for managing group data
 * Fetches group data from API, tracks loading state and errors
 * Provides a function to refresh data and CRUD operations
 */
export function useGroupData(groupId: number) {
  const [group, setGroup] = useState<GroupDetailDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Fetching group data
  const fetchGroup = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await groupsService.getById(groupId);
      setGroup(data);
    } catch (err) {
      setError({
        code: "FETCH_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Updating group
  const updateGroup = useCallback(
    async (command: UpdateGroupCommand) => {
      try {
        const updatedGroup = await groupsService.update(groupId, command);
        // Refresh full group data
        await fetchGroup();

        notify.success("GROUP.UPDATE_SUCCESS");
        return { success: true, data: updatedGroup };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [groupId, fetchGroup]
  );

  // Deleting group
  const deleteGroup = useCallback(async () => {
    try {
      await groupsService.delete(groupId);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Nieznany błąd",
      };
    }
  }, [groupId]);

  // Fetch data on mount
  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  return {
    group,
    loading,
    error,
    refetch: fetchGroup,
    updateGroup,
    deleteGroup,
  };
}
