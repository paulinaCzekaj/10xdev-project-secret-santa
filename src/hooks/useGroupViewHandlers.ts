import { useCallback, startTransition } from "react";
import { notify } from "@/lib/notifications";
import type { ParticipantViewModel } from "@/types";
import type { useModalState } from "./useModalState";

interface UseGroupViewHandlersParams {
  modals: ReturnType<typeof useModalState>;
  refetchGroup: () => void;
  refetchParticipants: () => void;
  refetchExclusions: () => void;
  deleteParticipant: (id: number) => Promise<{ success: boolean; error?: string }>;
  deleteExclusion: (id: number) => Promise<{ success: boolean; error?: string }>;
  setOptimisticParticipants?: (id: number) => void;
  setOptimisticExclusions?: (id: number) => void;
  navigate?: (path: string) => void;
}

export const useGroupViewHandlers = ({
  modals,
  refetchGroup,
  refetchParticipants,
  refetchExclusions,
  deleteParticipant,
  deleteExclusion,
  setOptimisticParticipants,
  setOptimisticExclusions,
  navigate,
}: UseGroupViewHandlersParams) => {
  // Handling events for GroupHeader
  const handleEditGroupClick = useCallback(() => {
    modals.openEditGroupModal();
  }, [modals]);

  const handleDeleteGroupClick = useCallback(() => {
    modals.openDeleteGroupModal();
  }, [modals]);

  // Handling events related to the group
  const handleGroupUpdated = useCallback(() => {
    refetchGroup();
    modals.closeModal();
  }, [refetchGroup, modals]);

  const handleGroupDeleted = useCallback(() => {
    // Redirect to dashboard
    navigate?.("/dashboard");
  }, [navigate]);

  // Handling events related to participants
  const handleParticipantAdded = useCallback(() => {
    console.log("[handleParticipantAdded] Refreshing participants and exclusions after adding");
    refetchParticipants();
    refetchExclusions(); // Refresh exclusions because adding an elf participant creates automatic exclusions
  }, [refetchParticipants, refetchExclusions]);

  const handleParticipantUpdated = useCallback(async () => {
    // Wait for both refetches to complete before closing modal to prevent race conditions
    await Promise.all([refetchParticipants(), refetchExclusions()]);
    modals.closeModal();
  }, [refetchParticipants, refetchExclusions, modals]);

  const handleParticipantDeleted = useCallback(() => {
    refetchParticipants();
  }, [refetchParticipants]);

  const handleEditParticipant = useCallback(
    (participant: ParticipantViewModel) => {
      modals.openEditParticipantModal(participant);
    },
    [modals]
  );

  const handleDeleteParticipant = useCallback(
    (participant: ParticipantViewModel) => {
      modals.openDeleteParticipantModal(participant);
    },
    [modals]
  );

  const handleConfirmDeleteParticipant = useCallback(async () => {
    if (!modals.participantToDelete) return;

    const participantId = modals.participantToDelete.id;

    // React 19 optimistic update - UI reacts immediately within transition
    startTransition(async () => {
      if (setOptimisticParticipants) {
        setOptimisticParticipants(participantId);
      }

      // Make API call - React automatically restores state on error
      const result = await deleteParticipant(participantId);

      // If error and no optimistic, manually refresh
      if (!result.success && !setOptimisticParticipants) {
        refetchParticipants();
        notify.error({ title: result.error || "Nie udało się usunąć uczestnika" });
      }

      // Close modal
      modals.closeModal();
    });
  }, [modals, deleteParticipant, refetchParticipants, setOptimisticParticipants]);

  const handleCopyParticipantToken = useCallback(async (participant: ParticipantViewModel) => {
    if (participant.resultLink) {
      try {
        await navigator.clipboard.writeText(participant.resultLink);
        notify.success("CLIPBOARD.COPY_SUCCESS");
      } catch {
        // Fallback: show link in input field
        notify.error("CLIPBOARD.COPY_ERROR");
      }
    }
  }, []);

  // Handling events related to exclusions
  const handleExclusionAdded = useCallback(() => {
    refetchExclusions();
  }, [refetchExclusions]);

  const handleExclusionDeleted = useCallback(() => {
    refetchExclusions();
  }, [refetchExclusions]);

  const handleDeleteExclusion = useCallback(
    async (exclusionId: number) => {
      // React 19 optimistic update - UI reacts immediately within transition
      startTransition(async () => {
        if (setOptimisticExclusions) {
          setOptimisticExclusions(exclusionId);
        }

        // Make API call - React automatically restores state on error
        const result = await deleteExclusion(exclusionId);

        // If error and no optimistic, manually refresh
        if (!result.success && !setOptimisticExclusions) {
          refetchExclusions();
          notify.error({ title: result.error || "Nie udało się usunąć wykluczenia" });
        }
      });
    },
    [deleteExclusion, refetchExclusions, setOptimisticExclusions]
  );

  // Handling events related to DrawSection
  const handleDrawClick = useCallback(() => {
    modals.openDrawConfirmationModal();
  }, [modals]);

  const handleDrawComplete = useCallback(async () => {
    // Refresh all data after drawing
    await Promise.all([refetchGroup(), refetchParticipants(), refetchExclusions()]);
    modals.closeModal();
  }, [refetchGroup, refetchParticipants, refetchExclusions, modals]);

  return {
    handleEditGroupClick,
    handleDeleteGroupClick,
    handleGroupUpdated,
    handleGroupDeleted,
    handleParticipantAdded,
    handleParticipantUpdated,
    handleParticipantDeleted,
    handleEditParticipant,
    handleDeleteParticipant,
    handleConfirmDeleteParticipant,
    handleCopyParticipantToken,
    handleExclusionAdded,
    handleExclusionDeleted,
    handleDeleteExclusion,
    handleDrawClick,
    handleDrawComplete,
  };
};
