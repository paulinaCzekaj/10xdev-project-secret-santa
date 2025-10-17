import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { GroupHeader } from "./GroupHeader";
import { ParticipantsSection } from "./ParticipantsSection";
import { ExclusionsSection } from "./ExclusionsSection";
import { DrawSection } from "./DrawSection";
import { ResultsSection } from "./ResultsSection";
import { GroupEditModal } from "./GroupEditModal";
import { GroupViewSkeleton } from "./states/GroupViewSkeleton";
import { GroupViewError } from "./states/GroupViewError";
import { GroupViewEmpty } from "./states/GroupViewEmpty";
import { DeleteGroupModal } from "./DeleteGroupModal";
import { DeleteParticipantModal } from "./DeleteParticipantModal";
import { EditParticipantModal } from "./EditParticipantModal";
import { DrawConfirmationModal } from "./DrawConfirmationModal";
import { useGroupData } from "@/hooks/useGroupData";
import { useParticipants } from "@/hooks/useParticipants";
import { useExclusions } from "@/hooks/useExclusions";
import { useDraw } from "@/hooks/useDraw";
import { useModalState } from "@/hooks/useModalState";
import { useGroupViewModel } from "@/hooks/useGroupViewModel";
import { supabaseClient } from "@/db/supabase.client";
import type { ParticipantViewModel, GroupViewModel } from "@/types";

interface GroupViewProps {
  groupId: number;
}

export default function GroupView({ groupId }: GroupViewProps) {
  // Stan główny komponentu
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Custom hooks dla danych
  const { group, loading: groupLoading, error: groupError, refetch: refetchGroup, deleteGroup } = useGroupData(groupId);
  const {
    participants,
    loading: participantsLoading,
    refetch: refetchParticipants,
    updateParticipant,
    deleteParticipant,
  } = useParticipants(groupId);
  const {
    exclusions,
    loading: exclusionsLoading,
    refetch: refetchExclusions,
    deleteExclusion,
  } = useExclusions(groupId);
  const { executeDraw } = useDraw(groupId);

  // Zarządzanie modalami (konsolidacja 7 useState w 1 hook)
  const modals = useModalState();

  // Pobierz ID zalogowanego użytkownika
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  // Transformuj dane do ViewModels (ekstrakcja 73 linii logiki)
  const { groupViewModel, participantViewModels, exclusionViewModels } = useGroupViewModel({
    group,
    participants,
    exclusions,
    currentUserId,
  });

  // Obsługa zdarzeń
  const handleGroupUpdated = () => {
    refetchGroup();
    modals.closeModal();
  };

  const handleGroupDeleted = () => {
    // Przekierowanie do dashboard
    window.location.href = "/dashboard";
  };

  const handleParticipantAdded = () => {
    refetchParticipants();
  };

  const handleParticipantUpdated = () => {
    refetchParticipants();
    modals.closeModal();
  };

  const handleParticipantDeleted = () => {
    refetchParticipants();
  };

  const handleExclusionAdded = () => {
    refetchExclusions();
  };

  const handleExclusionDeleted = () => {
    refetchExclusions();
  };

  const handleDrawComplete = async () => {
    // Odśwież wszystkie dane po losowaniu
    await Promise.all([refetchGroup(), refetchParticipants(), refetchExclusions()]);
    modals.closeModal();
  };

  // Obsługa zdarzeń GroupHeader
  const handleEditGroupClick = () => {
    modals.openEditGroupModal();
  };

  const handleDeleteGroupClick = () => {
    modals.openDeleteGroupModal();
  };

  // Obsługa zdarzeń DrawSection
  const handleDrawClick = () => {
    modals.openDrawConfirmationModal();
  };

  // Obsługa zdarzeń ParticipantsSection
  const handleEditParticipant = (participant: ParticipantViewModel) => {
    modals.openEditParticipantModal(participant);
  };

  const handleDeleteParticipant = (participant: ParticipantViewModel) => {
    modals.openDeleteParticipantModal(participant);
  };

  const handleConfirmDeleteParticipant = async () => {
    if (!modals.participantToDelete) return;

    // Optimistic update
    const result = await deleteParticipant(modals.participantToDelete.id);
    if (!result.success) {
      // Przywróć stan w przypadku błędu
      refetchParticipants();
    }

    // Zamknij modal
    modals.closeModal();
  };

  const handleCopyParticipantToken = async (participant: ParticipantViewModel) => {
    if (participant.resultLink) {
      try {
        await navigator.clipboard.writeText(participant.resultLink);
        // TODO: Show success toast
      } catch {
        // Fallback: show link in input field
        // TODO: Show fallback UI for clipboard error
      }
    }
  };

  // Obsługa zdarzeń ExclusionsSection
  const handleDeleteExclusion = async (exclusionId: number) => {
    // Optimistic update
    const result = await deleteExclusion(exclusionId);
    if (!result.success) {
      // Przywróć stan w przypadku błędu
      refetchExclusions();
    }
  };

  // Warunki wyświetlania
  const isLoading = groupLoading || participantsLoading || exclusionsLoading;
  const isCreator = group?.is_creator || false;
  const canEdit = group?.can_edit || false;
  const isDrawn = group?.is_drawn || false;

  // Loading state
  if (isLoading && !group) {
    return <GroupViewSkeleton />;
  }

  // Error state
  if (groupError) {
    return <GroupViewError error={groupError} onRetry={refetchGroup} />;
  }

  // Brak grupy
  if (!group) {
    return <GroupViewEmpty />;
  }

  return (
    <>
      <Toaster position="top-right" />

      <div className="max-w-7xl mx-auto space-y-6" data-testid="group-view-container">
        {/* Nagłówek grupy */}
        <GroupHeader
          group={groupViewModel as GroupViewModel}
          isCreator={isCreator}
          canEdit={canEdit}
          isDrawn={isDrawn}
          onEditClick={handleEditGroupClick}
          onDeleteClick={handleDeleteGroupClick}
        />

        {/* Sekcja uczestników */}
        <ParticipantsSection
          groupId={groupId}
          participants={participantViewModels}
          canEdit={canEdit}
          isDrawn={isDrawn}
          isCreator={isCreator}
          onParticipantAdded={handleParticipantAdded}
          onParticipantUpdated={handleParticipantUpdated}
          onParticipantDeleted={handleParticipantDeleted}
          onEditParticipant={handleEditParticipant}
          onDeleteParticipant={handleDeleteParticipant}
          onCopyParticipantToken={handleCopyParticipantToken}
        />

        {/* Sekcja wykluczeń */}
        <ExclusionsSection
          groupId={groupId}
          exclusions={exclusionViewModels}
          participants={participantViewModels}
          canEdit={canEdit}
          isDrawn={isDrawn}
          onExclusionAdded={handleExclusionAdded}
          onExclusionDeleted={handleExclusionDeleted}
          onDeleteExclusion={handleDeleteExclusion}
        />

        {/* Sekcja losowania lub wyników */}
        {isDrawn ? (
          <ResultsSection
            groupId={groupId}
            drawnAt={group.drawn_at || null}
            participants={participants}
            isParticipant={participantViewModels.some((p) => p.isCurrentUser)}
            isCreator={isCreator}
          />
        ) : (
          <DrawSection
            groupId={groupId}
            participantsCount={participants.length}
            exclusionsCount={exclusions.length}
            isCreator={isCreator}
            onDrawClick={handleDrawClick}
          />
        )}
      </div>

      {/* Modals */}
      <GroupEditModal
        group={groupViewModel as GroupViewModel}
        isOpen={modals.isEditGroupModalOpen}
        onClose={modals.closeModal}
        onSave={handleGroupUpdated}
      />

      <DeleteGroupModal
        isOpen={modals.isDeleteGroupModalOpen}
        groupName={group.name}
        onClose={modals.closeModal}
        onConfirm={handleGroupDeleted}
        deleteGroup={deleteGroup}
      />

      <DeleteParticipantModal
        participant={modals.participantToDelete}
        isOpen={modals.isDeleteParticipantModalOpen}
        onClose={modals.closeModal}
        onConfirm={handleConfirmDeleteParticipant}
      />

      <EditParticipantModal
        participant={modals.selectedParticipant}
        isOpen={modals.isEditParticipantModalOpen}
        onClose={modals.closeModal}
        onSave={handleParticipantUpdated}
        updateParticipant={updateParticipant}
      />

      <DrawConfirmationModal
        isOpen={modals.isDrawConfirmationModalOpen}
        participantsCount={participants.length}
        exclusionsCount={exclusions.length}
        onClose={modals.closeModal}
        onConfirm={handleDrawComplete}
        executeDraw={executeDraw}
      />
    </>
  );
}
