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
      // Formatowane wartości dla wyświetlania
      formattedBudget: formatCurrency(group.budget),
      formattedEndDate: formatDate(group.end_date),
      formattedCreatedAt: formatRelativeDate(group.created_at),

      // Pola obliczeniowe
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

      return {
        ...participant,
        // Flagi
        isCreator,
        isCurrentUser,
        canDelete: !isCreator, // Twórca nie może być usunięty

        // Formatowane wartości
        // W widoku grupy emaile zawsze są widoczne w pełnej formie (dostęp ma tylko twórca)
        displayEmail: participant.email || "Brak",
        rawEmail: participant.email || null, // Oryginalny email bez formatowania
        displayName: formatParticipantName(participant.name, isCurrentUser),
        initials: getInitials(participant.name),

        // Status (po losowaniu)
        wishlistStatus: group?.is_drawn ? formatWishlistStatus(participant.has_wishlist) : undefined,
        resultStatus: group?.is_drawn ? formatResultStatus(participant.result_viewed || false) : undefined,

        // Token (dla niezarejestrowanych)
        resultLink: participant.access_token
          ? `${window.location.origin}/results/${participant.access_token}`
          : undefined,
      };
    });
  }, [participants, currentUserId, group?.creator_id, group?.is_drawn]);

  /**
   * Transform ExclusionRuleListItemDTO[] to ExclusionViewModel[]
   * Adds display text and flags
   */
  const exclusionViewModels = useMemo<ExclusionViewModel[]>(() => {
    return exclusions.map((exclusion): ExclusionViewModel => {
      return {
        ...exclusion,
        // Formatowane wartości
        displayText: formatExclusionText(exclusion.blocker_name, exclusion.blocked_name),
        shortDisplayText: formatExclusionShortText(exclusion.blocker_name, exclusion.blocked_name),

        // Flagi
        canDelete: !group?.is_drawn, // Po losowaniu nie można usuwać wykluczeń
      };
    });
  }, [exclusions, group?.is_drawn]);

  return {
    groupViewModel,
    participantViewModels,
    exclusionViewModels,
  };
}
