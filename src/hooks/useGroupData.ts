import { useState, useEffect, useCallback } from "react";
import { notify } from "@/lib/notifications";
import { groupsService } from "@/services/groupsService";
import type { GroupDetailDTO, UpdateGroupCommand, ApiError } from "@/types";

/**
 * Hook do zarządzania danymi grupy
 * Pobiera dane grupy z API, śledzi stan ładowania i błędów
 * Udostępnia funkcję odświeżania danych i operacje CRUD
 */
export function useGroupData(groupId: number) {
  const [group, setGroup] = useState<GroupDetailDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Pobieranie danych grupy
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

  // Aktualizacja grupy
  const updateGroup = useCallback(
    async (command: UpdateGroupCommand) => {
      try {
        const updatedGroup = await groupsService.update(groupId, command);
        // Odśwież pełne dane grupy
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

  // Usunięcie grupy
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

  // Pobierz dane przy montowaniu
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
