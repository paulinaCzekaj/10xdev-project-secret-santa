import { useState, useEffect, useCallback } from "react";
import { participantsService } from "@/services/participantsService";
import type { ParticipantListItemDTO, CreateParticipantCommand, UpdateParticipantCommand, ApiError } from "@/types";

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
      const data = await participantsService.getByGroupId(groupId);
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
        const newParticipant = await participantsService.create(groupId, command);
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
        const updated = await participantsService.update(participantId, command);
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
        await participantsService.delete(participantId);
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
