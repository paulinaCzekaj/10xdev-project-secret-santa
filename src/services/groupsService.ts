import { apiClient } from "./apiClient";
import type { GroupDetailDTO, GroupDTO, UpdateGroupCommand, CreateGroupCommand } from "@/types";

/**
 * Service for group-related API operations
 */
export const groupsService = {
  /**
   * Get group by ID with full details
   */
  getById: (groupId: number): Promise<GroupDetailDTO> => apiClient.get<GroupDetailDTO>(`/api/groups/${groupId}`),

  /**
   * Create a new group
   */
  create: (command: CreateGroupCommand): Promise<GroupDTO> => apiClient.post<GroupDTO>("/api/groups", command),

  /**
   * Update existing group
   */
  update: (groupId: number, command: UpdateGroupCommand): Promise<GroupDTO> =>
    apiClient.patch<GroupDTO>(`/api/groups/${groupId}`, command),

  /**
   * Delete group
   */
  delete: (groupId: number): Promise<void> => apiClient.delete(`/api/groups/${groupId}`),
};
