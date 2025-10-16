import React, { useState, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/sonner";
import { GroupHeader } from "./GroupHeader";
import { ParticipantsSection } from "./ParticipantsSection";
import { ExclusionsSection } from "./ExclusionsSection";
import { DrawSection } from "./DrawSection";
import { ResultsSection } from "./ResultsSection";
import { GroupEditModal } from "./GroupEditModal";
import { DeleteGroupModal } from "./DeleteGroupModal";
import { DeleteParticipantModal } from "./DeleteParticipantModal";
import { EditParticipantModal } from "./EditParticipantModal";
import { DrawConfirmationModal } from "./DrawConfirmationModal";
import { useGroupData } from "@/hooks/useGroupData";
import { useParticipants } from "@/hooks/useParticipants";
import { useExclusions } from "@/hooks/useExclusions";
import { useDraw } from "@/hooks/useDraw";
import { supabaseClient } from "@/db/supabase.client";
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getInitials,
  formatParticipantEmail,
  formatParticipantName,
  calculateDaysUntilEnd,
  isDateExpired,
  formatExclusionText,
  formatExclusionShortText,
  formatWishlistStatus,
  formatResultStatus,
  formatGroupStatusBadge,
} from "@/lib/utils/formatters";
import type {
  GroupDetailDTO,
  ParticipantListItemDTO,
  ExclusionRuleListItemDTO,
  ParticipantViewModel,
  ExclusionViewModel,
  GroupViewModel,
} from "@/types";

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

  // Stan modalów
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [isDeleteParticipantModalOpen, setIsDeleteParticipantModalOpen] = useState(false);
  const [isDrawConfirmationModalOpen, setIsDrawConfirmationModalOpen] = useState(false);
  const [isEditParticipantModalOpen, setIsEditParticipantModalOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantViewModel | null>(null);
  const [participantToDelete, setParticipantToDelete] = useState<ParticipantViewModel | null>(null);

  // Pobierz ID zalogowanego użytkownika
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  // Funkcje transformacji DTO -> ViewModel
  const transformGroupToViewModel = useMemo(
    () =>
      (group: GroupDetailDTO): GroupViewModel => {
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
      },
    []
  );

  const transformParticipantsToViewModels = useMemo(
    () =>
      (participants: ParticipantListItemDTO[]): ParticipantViewModel[] => {
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
            displayEmail: formatParticipantEmail(participant.email || undefined, isCurrentUser),
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
      },
    [currentUserId, group?.creator_id, group?.is_drawn]
  );

  const transformExclusionsToViewModels = useMemo(
    () =>
      (exclusions: ExclusionRuleListItemDTO[]): ExclusionViewModel[] => {
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
      },
    [group?.is_drawn]
  );

  // Obsługa zdarzeń
  const handleGroupUpdated = () => {
    refetchGroup();
    setIsEditGroupModalOpen(false);
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
    setIsEditParticipantModalOpen(false);
    setSelectedParticipant(null);
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
    setIsDrawConfirmationModalOpen(false);
  };

  // Obsługa zdarzeń GroupHeader
  const handleEditGroupClick = () => {
    setIsEditGroupModalOpen(true);
  };

  const handleDeleteGroupClick = () => {
    setIsDeleteGroupModalOpen(true);
  };

  // Obsługa zdarzeń DrawSection
  const handleDrawClick = () => {
    setIsDrawConfirmationModalOpen(true);
  };

  // Obsługa zdarzeń ParticipantsSection
  const handleEditParticipant = (participant: ParticipantViewModel) => {
    setSelectedParticipant(participant);
    setIsEditParticipantModalOpen(true);
  };

  const handleDeleteParticipant = (participant: ParticipantViewModel) => {
    setParticipantToDelete(participant);
    setIsDeleteParticipantModalOpen(true);
  };

  const handleConfirmDeleteParticipant = async () => {
    if (!participantToDelete) return;

    // Optimistic update
    const result = await deleteParticipant(participantToDelete.id);
    if (!result.success) {
      // Przywróć stan w przypadku błędu
      refetchParticipants();
    }

    // Zamknij modal
    setIsDeleteParticipantModalOpen(false);
    setParticipantToDelete(null);
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

  // Transformowane dane
  const groupViewModel = useMemo(
    () => (group ? transformGroupToViewModel(group) : null),
    [group, transformGroupToViewModel]
  );
  const participantViewModels = useMemo(
    () => transformParticipantsToViewModels(participants),
    [participants, transformParticipantsToViewModels]
  );
  const exclusionViewModels = useMemo(
    () => transformExclusionsToViewModels(exclusions),
    [exclusions, transformExclusionsToViewModels]
  );

  // Loading state
  if (isLoading && !group) {
    return (
      <div className="space-y-6">
        {/* Skeleton dla GroupHeader */}
        <div className="bg-white rounded-lg border p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="flex gap-4">
              <div className="h-6 bg-gray-200 rounded w-24"></div>
              <div className="h-6 bg-gray-200 rounded w-32"></div>
              <div className="h-6 bg-gray-200 rounded w-28"></div>
            </div>
          </div>
        </div>

        {/* Skeleton dla sekcji */}
        <div className="bg-white rounded-lg border p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (groupError) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nie udało się pobrać danych grupy</h3>
        <p className="text-gray-600 mb-4">{groupError.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  // Brak grupy
  if (!group) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Grupa nie została znaleziona</h3>
        <p className="text-gray-600 mb-4">Grupa o podanym ID nie istnieje lub nie masz do niej dostępu.</p>
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Powrót do dashboard
        </button>
      </div>
    );
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
        isOpen={isEditGroupModalOpen}
        onClose={() => setIsEditGroupModalOpen(false)}
        onSave={handleGroupUpdated}
      />

      <DeleteGroupModal
        isOpen={isDeleteGroupModalOpen}
        groupName={group.name}
        onClose={() => setIsDeleteGroupModalOpen(false)}
        onConfirm={handleGroupDeleted}
        deleteGroup={deleteGroup}
      />

      <DeleteParticipantModal
        participant={participantToDelete}
        isOpen={isDeleteParticipantModalOpen}
        onClose={() => {
          setIsDeleteParticipantModalOpen(false);
          setParticipantToDelete(null);
        }}
        onConfirm={handleConfirmDeleteParticipant}
      />

      <EditParticipantModal
        participant={selectedParticipant}
        isOpen={isEditParticipantModalOpen}
        onClose={() => {
          setIsEditParticipantModalOpen(false);
          setSelectedParticipant(null);
        }}
        onSave={handleParticipantUpdated}
        updateParticipant={updateParticipant}
      />

      <DrawConfirmationModal
        isOpen={isDrawConfirmationModalOpen}
        participantsCount={participants.length}
        exclusionsCount={exclusions.length}
        onClose={() => setIsDrawConfirmationModalOpen(false)}
        onConfirm={handleDrawComplete}
        executeDraw={executeDraw}
      />
    </>
  );
}
