import { useState, useEffect, useOptimistic } from "react";
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
import { useGroupViewHandlers } from "@/hooks/useGroupViewHandlers";
import { supabaseClient } from "@/db/supabase.client";
import type { GroupViewModel } from "@/types";

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

  // React 19 useOptimistic for instant UI updates
  const [optimisticParticipants, setOptimisticParticipants] = useOptimistic(participants, (state, deletedId: number) =>
    state.filter((p) => p.id !== deletedId)
  );

  const [optimisticExclusions, setOptimisticExclusions] = useOptimistic(exclusions, (state, deletedId: number) =>
    state.filter((e) => e.id !== deletedId)
  );

  // Zarządzanie modalami (konsolidacja 7 useState w 1 hook)
  const modals = useModalState();

  // Pobierz ID zalogowanego użytkownika
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  // Transformuj dane do ViewModels (ekstrakcja 73 linii logiki)
  // Używamy optimistic state dla natychmiastowej reakcji UI
  const { groupViewModel, participantViewModels, exclusionViewModels } = useGroupViewModel({
    group,
    participants: optimisticParticipants,
    exclusions: optimisticExclusions,
    currentUserId,
  });

  // Obsługa zdarzeń (ekstrakcja do custom hook)
  const handlers = useGroupViewHandlers({
    modals,
    refetchGroup,
    refetchParticipants,
    refetchExclusions,
    deleteParticipant,
    deleteExclusion,
    setOptimisticParticipants,
    setOptimisticExclusions,
    // eslint-disable-next-line react-compiler/react-compiler
    navigate: (path: string) => (window.location.href = path),
  });

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
      <div className="max-w-7xl mx-auto space-y-6" data-testid="group-view-container">
        {/* Nagłówek grupy */}
        <GroupHeader
          group={groupViewModel as GroupViewModel}
          isCreator={isCreator}
          canEdit={canEdit}
          isDrawn={isDrawn}
          onEditClick={handlers.handleEditGroupClick}
          onDeleteClick={handlers.handleDeleteGroupClick}
        />

        {/* Sekcja uczestników */}
        <ParticipantsSection
          groupId={groupId}
          participants={participantViewModels}
          canEdit={canEdit}
          isDrawn={isDrawn}
          isCreator={isCreator}
          onParticipantAdded={handlers.handleParticipantAdded}
          onParticipantUpdated={handlers.handleParticipantUpdated}
          onParticipantDeleted={handlers.handleParticipantDeleted}
          onEditParticipant={handlers.handleEditParticipant}
          onDeleteParticipant={handlers.handleDeleteParticipant}
          onCopyParticipantToken={handlers.handleCopyParticipantToken}
        />

        {/* Sekcja wykluczeń */}
        <ExclusionsSection
          groupId={groupId}
          exclusions={exclusionViewModels}
          participants={participantViewModels}
          canEdit={canEdit}
          isDrawn={isDrawn}
          onExclusionAdded={handlers.handleExclusionAdded}
          onExclusionDeleted={handlers.handleExclusionDeleted}
          onDeleteExclusion={handlers.handleDeleteExclusion}
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
            onDrawClick={handlers.handleDrawClick}
          />
        )}
      </div>

      {/* Modals */}
      <GroupEditModal
        group={groupViewModel as GroupViewModel}
        isOpen={modals.isEditGroupModalOpen}
        onClose={modals.closeModal}
        onSave={handlers.handleGroupUpdated}
      />

      <DeleteGroupModal
        isOpen={modals.isDeleteGroupModalOpen}
        groupName={group.name}
        onClose={modals.closeModal}
        onConfirm={handlers.handleGroupDeleted}
        deleteGroup={deleteGroup}
      />

      <DeleteParticipantModal
        participant={modals.participantToDelete}
        isOpen={modals.isDeleteParticipantModalOpen}
        onClose={modals.closeModal}
        onConfirm={handlers.handleConfirmDeleteParticipant}
      />

      <EditParticipantModal
        participant={modals.selectedParticipant}
        isOpen={modals.isEditParticipantModalOpen}
        isDrawn={isDrawn}
        onClose={modals.closeModal}
        onSave={handlers.handleParticipantUpdated}
        updateParticipant={updateParticipant}
      />

      <DrawConfirmationModal
        isOpen={modals.isDrawConfirmationModalOpen}
        participantsCount={participants.length}
        exclusionsCount={exclusions.length}
        onClose={modals.closeModal}
        onConfirm={handlers.handleDrawComplete}
        executeDraw={executeDraw}
      />
    </>
  );
}
