import { useMemo } from "react";
import type {
  GroupDetailDTO,
  ParticipantListItemDTO,
  ExclusionRuleListItemDTO,
  GroupViewModel,
  ParticipantViewModel,
  ExclusionViewModel,
} from "@/types";
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getInitials,
  formatParticipantName,
  calculateDaysUntilEnd,
  isDateExpired,
  formatExclusionText,
  formatExclusionShortText,
  formatWishlistStatus,
  formatResultStatus,
  formatGroupStatusBadge,
} from "@/lib/utils/formatters";

/**
 * Parameters for useGroupViewModel hook
 */
interface UseGroupViewModelParams {
  group: GroupDetailDTO | null;
  participants: ParticipantListItemDTO[];
  exclusions: ExclusionRuleListItemDTO[];
  currentUserId: string | null;
}

/**
 * Custom hook for transforming DTOs to ViewModels
 * Extracts 73 lines of transformation logic from GroupView component
 *
 * @param params - DTOs and current user ID
 * @returns Transformed view models ready for rendering
 *
 * @example
 * const { groupViewModel, participantViewModels, exclusionViewModels } = useGroupViewModel({
 *   group,
 *   participants,
 *   exclusions,
 *   currentUserId,
 * });
 */
export function useGroupViewModel({ group, participants, exclusions, currentUserId }: UseGroupViewModelParams) {
  /**
   * Transform GroupDetailDTO to GroupViewModel
   * Adds formatted values and computed properties
   */
  const groupViewModel = useMemo<GroupViewModel | null>(() => {
    if (!group) return null;

    return {
      ...group,
      // Formatted values for display
      formattedBudget: formatCurrency(group.budget),
      formattedEndDate: formatDate(group.end_date),
      formattedCreatedAt: formatRelativeDate(group.created_at),

      // Calculated fields
      isExpired: isDateExpired(group.end_date),
      daysUntilEnd: calculateDaysUntilEnd(group.end_date),
      participantsCount: group.participants.length,
      exclusionsCount: group.exclusions.length,

      // Status
      statusBadge: formatGroupStatusBadge(group.is_drawn, isDateExpired(group.end_date)),
    };
  }, [group]);

  /**
   * Transform ParticipantListItemDTO[] to ParticipantViewModel[]
   * Adds display values, flags, and computed properties
   */
  const participantViewModels = useMemo<ParticipantViewModel[]>(() => {
    return participants.map((participant): ParticipantViewModel => {
      const isCurrentUser = participant.user_id !== null && participant.user_id === currentUserId;
      const isCreator = participant.user_id === group?.creator_id;

      // Compute elf-related fields
      // Find all participants that this participant helps as an elf (where others have this participant as their elf)
      const helpedParticipants = participants.filter((p) => p.elf_participant_id === participant.id);
      const elfForParticipantIds = helpedParticipants.map((p) => p.id);
      const helpedParticipantNames = helpedParticipants.map((p) => p.name);
      const isElfForSomeone = helpedParticipants.length > 0;

      // Find the elf that helps this participant
      const elfParticipant = participants.find((p) => p.id === participant.elf_participant_id);
      const hasElf = elfParticipant !== undefined;
      const elfParticipantId = elfParticipant?.id || null;
      const elfName = elfParticipant?.name || null;
      const elfAccessedAt = elfParticipant?.elf_accessed_at || null;

      return {
        ...participant,
        // Flagi
        isCreator,
        isCurrentUser,
        canDelete: !isCreator, // The creator cannot be deleted

        // Formatted values
        // In the group view, emails are always visible in full form (only the creator has access)
        displayEmail: participant.email || "Brak",
        rawEmail: participant.email || null, // Original email without formatting
        displayName: formatParticipantName(participant.name, isCurrentUser),
        initials: getInitials(participant.name),

        // Status (after drawing)
        wishlistStatus: group?.is_drawn ? formatWishlistStatus(participant.has_wishlist) : undefined,
        resultStatus: group?.is_drawn ? formatResultStatus(participant.result_viewed || false) : undefined,

        // Token (for unregistered users)
        resultLink: participant.access_token
          ? `${window.location.origin}/results/${participant.access_token}`
          : undefined,

        // Elf-related fields (v1.1.0)
        elfParticipantId, // ID of participant who is elf for this participant
        elfForParticipantIds, // IDs of participants that this participant helps
        helpedParticipantNames, // Names of participants that this participant helps
        isElfForSomeone, // Whether this participant is an elf for someone
        hasElf, // Whether this participant has an assigned elf helper
        elfName, // Name of this participant's elf helper
        elfAccessedAt, // When elf viewed this participant's result
      };
    });
  }, [participants, currentUserId, group?.creator_id, group?.is_drawn]);

  /**
   * Transform ExclusionRuleListItemDTO[] to ExclusionViewModel[]
   * Adds display text and flags
   */
  const exclusionViewModels = useMemo<ExclusionViewModel[]>(() => {
    return exclusions.map((exclusion): ExclusionViewModel => {
      // Since we no longer create automatic elf exclusions, all exclusions can be deleted
      // (as long as the draw hasn't been completed yet)
      return {
        ...exclusion,
        // Formatted values
        displayText: formatExclusionText(exclusion.blocker_name, exclusion.blocked_name),
        shortDisplayText: formatExclusionShortText(exclusion.blocker_name, exclusion.blocked_name),

        // Flags
        canDelete: !group?.is_drawn, // After drawing, cannot be deleted
        isElfExclusion: false, // No longer mark any exclusions as elf exclusions
      };
    });
  }, [exclusions, group?.is_drawn]);

  return {
    groupViewModel,
    participantViewModels,
    exclusionViewModels,
  };
}
