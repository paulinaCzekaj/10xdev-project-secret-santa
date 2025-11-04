import { useCallback, useState } from "react";
import { exclusionsService } from "@/services/exclusionsService";
import { notify } from "@/lib/notifications";
import type { ExclusionRuleDTO, ExclusionViewModel } from "@/types";

/**
 * Hook for managing exclusion form submission logic
 * Handles validation, API calls, and notifications
 */
export function useAddExclusion(groupId: number) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Check if an exclusion already exists between two participants
   */
  const isExclusionDuplicate = useCallback(
    (blockerId: number, blockedId: number, existingExclusions: ExclusionViewModel[]): boolean => {
      return existingExclusions.some(
        (exclusion) => exclusion.blocker_participant_id === blockerId && exclusion.blocked_participant_id === blockedId
      );
    },
    []
  );

  /**
   * Submit exclusion form data
   * Handles both unidirectional and bidirectional exclusions
   */
  const submitExclusion = useCallback(
    async (
      data: { blocker_participant_id: number; blocked_participant_id: number; bidirectional: boolean },
      existingExclusions: ExclusionViewModel[]
    ): Promise<{ success: boolean; data?: ExclusionRuleDTO }> => {
      const { blocker_participant_id, blocked_participant_id, bidirectional } = data;

      // Validate for duplicates before submission
      if (isExclusionDuplicate(blocker_participant_id, blocked_participant_id, existingExclusions)) {
        notify.error("EXCLUSION.ADD_DUPLICATE");
        return { success: false };
      }

      // If bidirectional, check for reverse exclusion
      if (bidirectional && isExclusionDuplicate(blocked_participant_id, blocker_participant_id, existingExclusions)) {
        notify.error("EXCLUSION.ADD_REVERSE_EXISTS");
        return { success: false };
      }

      setIsSubmitting(true);

      try {
        // Create primary exclusion
        const primaryExclusion = await exclusionsService.create(groupId, {
          blocker_participant_id,
          blocked_participant_id,
        });

        // If bidirectional, create reverse exclusion
        if (bidirectional) {
          try {
            await exclusionsService.create(groupId, {
              blocker_participant_id: blocked_participant_id,
              blocked_participant_id: blocker_participant_id,
            });
            notify.success("EXCLUSION.ADD_BIDIRECTIONAL_SUCCESS");
          } catch {
            // Primary exclusion succeeded but reverse failed
            notify.warning("EXCLUSION.ADD_PARTIAL_SUCCESS");
          }
        } else {
          notify.success("EXCLUSION.ADD_SUCCESS");
        }

        return { success: true, data: primaryExclusion };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Nie udało się dodać wykluczenia. Spróbuj ponownie.";
        notify.error({ title: errorMessage });
        return { success: false };
      } finally {
        setIsSubmitting(false);
      }
    },
    [groupId, isExclusionDuplicate]
  );

  return {
    submitExclusion,
    isSubmitting,
  };
}
