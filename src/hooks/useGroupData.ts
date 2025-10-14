import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/db/supabase.client";
import type { GroupDetailDTO, UpdateGroupCommand, GroupDTO, ApiError } from "@/types";

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
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd pobierania grupy");
      }

      const data: GroupDetailDTO = await response.json();
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
  const updateGroup = useCallback(async (command: UpdateGroupCommand) => {
    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd aktualizacji grupy");
      }

      const updatedGroup: GroupDTO = await response.json();
      // Odśwież pełne dane grupy
      await fetchGroup();

      toast.success("Grupa została zaktualizowana");
      return { success: true, data: updatedGroup };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Nieznany błąd",
      };
    }
  }, [groupId, fetchGroup]);

  // Usunięcie grupy
  const deleteGroup = useCallback(async () => {
    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd usuwania grupy");
      }

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
