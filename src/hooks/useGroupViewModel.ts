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
      const isElfForSomeone = participant.elf_for_participant_id !== null;
      const elfForParticipantName = isElfForSomeone
        ? participants.find((p) => p.id === participant.elf_for_participant_id)?.name || null
        : null;
      const hasElf = participants.some((p) => p.elf_for_participant_id === participant.id);
      const elfParticipant = hasElf ? participants.find((p) => p.elf_for_participant_id === participant.id) : null;
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
        elfForParticipantId: participant.elf_for_participant_id, // ID of participant that this participant helps
        elfForParticipantName, // Name of participant that this participant helps
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
      // Check if this is an automatic elf exclusion (cannot be deleted manually)
      // Elf exclusion: podopieczny (blocker) cannot draw their elf helper (blocked)
      // The elf participant has elf_for_participant_id === blocker_participant_id
      const isElfExclusion = participants.some(
        (p) =>
          p.id === exclusion.blocked_participant_id && // blocked is the elf helper
          p.elf_for_participant_id === exclusion.blocker_participant_id // elf's elf_for_participant_id points to blocker (podopieczny)
      );

      return {
        ...exclusion,
        // Formatted values
        displayText: formatExclusionText(exclusion.blocker_name, exclusion.blocked_name),
        shortDisplayText: formatExclusionShortText(exclusion.blocker_name, exclusion.blocked_name),

        // Flags
        canDelete: !group?.is_drawn && !isElfExclusion, // After drawing or if elf exclusion, cannot be deleted
        isElfExclusion, // whether this is an automatic elf exclusion
      };
    });
  }, [exclusions, group?.is_drawn, participants]);

  return {
    groupViewModel,
    participantViewModels,
    exclusionViewModels,
  };
}
