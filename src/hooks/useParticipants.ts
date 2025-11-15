import { useState, useEffect, useCallback } from "react";
import { participantsService } from "@/services/participants.service";
import type { ParticipantListItemDTO, CreateParticipantCommand, UpdateParticipantCommand, ApiError } from "@/types";

/**
 * Hook for managing participants of a group
 * Handles CRUD operations on participants
 */
export function useParticipants(groupId: number) {
  const [participants, setParticipants] = useState<ParticipantListItemDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Fetching participants
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

  // Adding a participant
  const addParticipant = useCallback(
    async (command: CreateParticipantCommand) => {
      try {
        const newParticipant = await participantsService.create(groupId, command);

        return { success: true, data: newParticipant };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [groupId]
  );

  // Updating a participant
  const updateParticipant = useCallback(async (participantId: number, command: UpdateParticipantCommand) => {
    try {
      const updated = await participantsService.update(participantId, command);

      return { success: true, data: updated };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Nieznany błąd",
      };
    }
  }, []);

  // Deleting a participant
  const deleteParticipant = useCallback(async (participantId: number) => {
    try {
      await participantsService.delete(participantId);

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Nieznany błąd",
      };
    }
  }, []);

  // Fetch data on mount
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
