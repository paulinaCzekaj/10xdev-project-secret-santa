import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import type { ParticipantViewModel } from "@/types";

interface DeleteParticipantModalProps {
  participant: ParticipantViewModel | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (participantId: number) => void;
}

export function DeleteParticipantModal({ participant, isOpen, onClose, onConfirm }: DeleteParticipantModalProps) {
  const handleConfirm = () => {
    if (participant) {
      onConfirm(participant.id);
      onClose();
    }
  };

  if (!participant) return null;

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Czy na pewno chcesz usunąć tego uczestnika?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Uczestnik <strong>&bdquo;{participant.displayName}&rdquo;</strong> zostanie trwale usunięty z grupy. Tej
                operacji nie można cofnąć.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Usuń uczestnika
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
