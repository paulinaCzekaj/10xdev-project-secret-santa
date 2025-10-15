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
import { toast } from "sonner";

interface DeleteGroupModalProps {
  isOpen: boolean;
  groupName: string;
  onClose: () => void;
  onConfirm: () => void;
  deleteGroup: () => Promise<{ success: boolean; error?: string }>;
}

export function DeleteGroupModal({
  isOpen,
  groupName,
  onClose,
  onConfirm,
  deleteGroup,
}: DeleteGroupModalProps) {
  const handleConfirm = async () => {
    try {
      const result = await deleteGroup();

      if (result.success) {
        toast.success("Grupa została usunięta");
        onConfirm();
      } else {
        toast.error(result.error || "Nie udało się usunąć grupy");
      }
    } catch (error) {
      toast.error("Wystąpił błąd podczas usuwania grupy");
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Czy na pewno chcesz usunąć tę grupę?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Ta akcja jest nieodwracalna. Spowoduje trwałe usunięcie grupy{" "}
                <strong>"{groupName}"</strong> wraz ze wszystkimi uczestnikami,
                wykluczeniami i wynikami losowania.
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
            Usuń grupę
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
