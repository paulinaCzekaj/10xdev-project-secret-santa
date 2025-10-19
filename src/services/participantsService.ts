import { apiClient } from "./apiClient";
import type {
  ParticipantWithTokenDTO,
  ParticipantDTO,
  CreateParticipantCommand,
  UpdateParticipantCommand,
  PaginatedParticipantsDTO,
} from "@/types";

/**
 * Service for participant-related API operations
 */
export const participantsService = {
  /**
   * Get all participants for a group
   */
  getByGroupId: (groupId: number): Promise<PaginatedParticipantsDTO> =>
    apiClient.get<PaginatedParticipantsDTO>(`/api/groups/${groupId}/participants`),

  /**
   * Create a new participant in a group
   * Returns participant with access token if unregistered
   */
  create: (groupId: number, command: CreateParticipantCommand): Promise<ParticipantWithTokenDTO> =>
    apiClient.post<ParticipantWithTokenDTO>(`/api/groups/${groupId}/participants`, command),

  /**
   * Update existing participant
   */
  update: (participantId: number, command: UpdateParticipantCommand): Promise<ParticipantDTO> =>
    apiClient.patch<ParticipantDTO>(`/api/participants/${participantId}`, command),

  /**
   * Delete participant
   */
  delete: (participantId: number): Promise<void> => apiClient.delete(`/api/participants/${participantId}`),
};
