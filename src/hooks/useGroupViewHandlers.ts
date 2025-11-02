import { useCallback } from "react";
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
  // Obsługa zdarzeń GroupHeader
  const handleEditGroupClick = useCallback(() => {
    modals.openEditGroupModal();
  }, [modals]);

  const handleDeleteGroupClick = useCallback(() => {
    modals.openDeleteGroupModal();
  }, [modals]);

  // Obsługa zdarzeń związanych z grupą
  const handleGroupUpdated = useCallback(() => {
    refetchGroup();
    modals.closeModal();
  }, [refetchGroup, modals]);

  const handleGroupDeleted = useCallback(() => {
    // Przekierowanie do dashboard
    navigate?.("/dashboard");
  }, [navigate]);

  // Obsługa zdarzeń związanych z uczestnikami
  const handleParticipantAdded = useCallback(() => {
    refetchParticipants();
  }, [refetchParticipants]);

  const handleParticipantUpdated = useCallback(() => {
    refetchParticipants();
    modals.closeModal();
  }, [refetchParticipants, modals]);

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

    // React 19 optimistic update - UI reaguje natychmiast
    if (setOptimisticParticipants) {
      setOptimisticParticipants(participantId);
    }

    // Wykonaj API call - React automatycznie przywróci stan przy błędzie
    const result = await deleteParticipant(participantId);

    // Jeśli błąd i nie ma optimistic, ręcznie odśwież
    if (!result.success && !setOptimisticParticipants) {
      refetchParticipants();
      notify.error({ title: result.error || "Nie udało się usunąć uczestnika" });
    }

    // Zamknij modal
    modals.closeModal();
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

  // Obsługa zdarzeń związanych z wykluczeniami
  const handleExclusionAdded = useCallback(() => {
    refetchExclusions();
  }, [refetchExclusions]);

  const handleExclusionDeleted = useCallback(() => {
    refetchExclusions();
  }, [refetchExclusions]);

  const handleDeleteExclusion = useCallback(
    async (exclusionId: number) => {
      // React 19 optimistic update - UI reaguje natychmiast
      if (setOptimisticExclusions) {
        setOptimisticExclusions(exclusionId);
      }

      // Wykonaj API call - React automatycznie przywróci stan przy błędzie
      const result = await deleteExclusion(exclusionId);

      // Jeśli błąd i nie ma optimistic, ręcznie odśwież
      if (!result.success && !setOptimisticExclusions) {
        refetchExclusions();
        notify.error({ title: result.error || "Nie udało się usunąć wykluczenia" });
      }
    },
    [deleteExclusion, refetchExclusions, setOptimisticExclusions]
  );

  // Obsługa zdarzeń DrawSection
  const handleDrawClick = useCallback(() => {
    modals.openDrawConfirmationModal();
  }, [modals]);

  const handleDrawComplete = useCallback(async () => {
    // Odśwież wszystkie dane po losowaniu
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
