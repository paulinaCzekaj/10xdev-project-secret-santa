import { apiClient } from "./apiClient";
import type { ExclusionRuleDTO, CreateExclusionRuleCommand, PaginatedExclusionRulesDTO } from "@/types";

/**
 * Service for exclusion rule-related API operations
 */
export const exclusionsService = {
  /**
   * Get all exclusion rules for a group
   */
  getByGroupId: (groupId: number): Promise<PaginatedExclusionRulesDTO> =>
    apiClient.get<PaginatedExclusionRulesDTO>(`/api/groups/${groupId}/exclusions`),

  /**
   * Create a new exclusion rule
   */
  create: (groupId: number, command: CreateExclusionRuleCommand): Promise<ExclusionRuleDTO> =>
    apiClient.post<ExclusionRuleDTO>(`/api/groups/${groupId}/exclusions`, command),

  /**
   * Delete exclusion rule
   */
  delete: (exclusionId: number): Promise<void> => apiClient.delete(`/api/exclusions/${exclusionId}`),
};
