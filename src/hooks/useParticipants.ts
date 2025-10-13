import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type {
  ParticipantListItemDTO,
  CreateParticipantCommand,
  UpdateParticipantCommand,
  ParticipantWithTokenDTO,
  ParticipantDTO,
  ApiError,
  PaginatedParticipantsDTO
} from "@/types";

/**
 * Hook do zarządzania uczestnikami grupy
 * Obsługuje CRUD operacje na uczestnikach
 */
export function useParticipants(groupId: number) {
  const [participants, setParticipants] = useState<ParticipantListItemDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Pobieranie uczestników
  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}/participants`, {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd pobierania uczestników");
      }

      const data: PaginatedParticipantsDTO = await response.json();
      setParticipants(data.data);
    } catch (err) {
      setError({
        code: "FETCH_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Dodawanie uczestnika
  const addParticipant = useCallback(
    async (command: CreateParticipantCommand) => {
      try {
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/groups/${groupId}/participants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd dodawania uczestnika");
        }

        const newParticipant: ParticipantWithTokenDTO = await response.json();
        await fetchParticipants(); // Odśwież listę

        return { success: true, data: newParticipant };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [groupId, fetchParticipants]
  );

  // Aktualizacja uczestnika
  const updateParticipant = useCallback(
    async (participantId: number, command: UpdateParticipantCommand) => {
      try {
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/participants/${participantId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd aktualizacji uczestnika");
        }

        const updated: ParticipantDTO = await response.json();
        await fetchParticipants(); // Odśwież listę

        return { success: true, data: updated };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [fetchParticipants]
  );

  // Usuwanie uczestnika
  const deleteParticipant = useCallback(
    async (participantId: number) => {
      try {
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/participants/${participantId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd usuwania uczestnika");
        }

        await fetchParticipants(); // Odśwież listę

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [fetchParticipants]
  );

  // Pobierz dane przy montowaniu
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    loading,
    error,
    refetch: fetchParticipants,
    addParticipant,
    updateParticipant,
    deleteParticipant,
  };
}
