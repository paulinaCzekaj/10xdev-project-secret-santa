import { useState, useCallback } from "react";
import type { ParticipantViewModel } from "@/types";

/**
 * Modal types available in GroupView
 */
type ModalType = "editGroup" | "deleteGroup" | "editParticipant" | "deleteParticipant" | "drawConfirmation";

/**
 * Modal state interface
 */
interface ModalState {
  activeModal: ModalType | null;
  selectedParticipant: ParticipantViewModel | null;
  participantToDelete: ParticipantViewModel | null;
}

/**
 * Custom hook for managing modal state in GroupView
 * Consolidates 7 separate useState calls into a single, type-safe state manager
 *
 * @example
 * const modals = useModalState();
 *
 * // Open modals
 * modals.openEditGroupModal();
 * modals.openEditParticipantModal(participant);
 *
 * // Check if modal is open
 * if (modals.isEditGroupModalOpen) { ... }
 *
 * // Close any modal
 * modals.closeModal();
 */
export function useModalState() {
  const [state, setState] = useState<ModalState>({
    activeModal: null,
    selectedParticipant: null,
    participantToDelete: null,
  });

  /**
   * Generic function to open a modal with optional data
   */
  const openModal = useCallback((modal: ModalType, data?: Partial<ModalState>) => {
    setState({
      activeModal: modal,
      selectedParticipant: data?.selectedParticipant || null,
      participantToDelete: data?.participantToDelete || null,
    });
  }, []);

  /**
   * Close the currently active modal and clear all data
   */
  const closeModal = useCallback(() => {
    setState({
      activeModal: null,
      selectedParticipant: null,
      participantToDelete: null,
    });
  }, []);

  return {
    // Raw state (if needed for advanced use cases)
    activeModal: state.activeModal,
    selectedParticipant: state.selectedParticipant,
    participantToDelete: state.participantToDelete,

    // Boolean checks for each modal (convenient for conditional rendering)
    isEditGroupModalOpen: state.activeModal === "editGroup",
    isDeleteGroupModalOpen: state.activeModal === "deleteGroup",
    isEditParticipantModalOpen: state.activeModal === "editParticipant",
    isDeleteParticipantModalOpen: state.activeModal === "deleteParticipant",
    isDrawConfirmationModalOpen: state.activeModal === "drawConfirmation",

    // Generic actions
    openModal,
    closeModal,

    // Convenience methods for opening specific modals
    openEditGroupModal: useCallback(() => openModal("editGroup"), [openModal]),
    openDeleteGroupModal: useCallback(() => openModal("deleteGroup"), [openModal]),
    openEditParticipantModal: useCallback(
      (participant: ParticipantViewModel) => openModal("editParticipant", { selectedParticipant: participant }),
      [openModal]
    ),
    openDeleteParticipantModal: useCallback(
      (participant: ParticipantViewModel) => openModal("deleteParticipant", { participantToDelete: participant }),
      [openModal]
    ),
    openDrawConfirmationModal: useCallback(() => openModal("drawConfirmation"), [openModal]),
  };
}
