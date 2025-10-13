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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shuffle, AlertTriangle, Users, Ban } from "lucide-react";
import type { DrawResultDTO } from "@/types";

interface DrawConfirmationModalProps {
  isOpen: boolean;
  groupId: number;
  participantsCount: number;
  exclusionsCount: number;
  onClose: () => void;
  onConfirm: (result: DrawResultDTO) => void;
}

export function DrawConfirmationModal({
  isOpen,
  groupId,
  participantsCount,
  exclusionsCount,
  onClose,
  onConfirm,
}: DrawConfirmationModalProps) {
  const handleConfirm = async () => {
    try {
      // Tutaj będzie wywołanie API do wykonania losowania
      // const response = await fetch(`/api/groups/${groupId}/draw`, {
      //   method: "POST",
      //   headers: {
      //     // Authorization header
      //   },
      // });

      // const result: DrawResultDTO = await response.json();

      // Na razie symuluję odpowiedź API
      const result: DrawResultDTO = {
        success: true,
        message: "Losowanie zostało pomyślnie wykonane",
        group_id: groupId,
        drawn_at: new Date().toISOString(),
        participants_notified: participantsCount,
      };

      onConfirm(result);
    } catch (error) {
      console.error("Błąd podczas wykonania losowania:", error);
      // Tutaj można dodać obsługę błędu
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <Shuffle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle>Czy na pewno chcesz rozpocząć losowanie?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Ta operacja jest nieodwracalna. Po rozpoczęciu losowania nie będzie można
                dodawać/usunąć uczestników ani zmieniać wykluczeń.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Podsumowanie */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{participantsCount}</strong> {participantsCount === 1 ? 'uczestnik' : 'uczestników'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{exclusionsCount}</strong> {exclusionsCount === 1 ? 'wykluczenie' : 'wykluczeń'}
              </span>
            </div>
          </div>

          {/* Ostrzeżenie */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Uwaga!</strong> Po potwierdzeniu wszyscy uczestnicy otrzymają
              informacje o swoich wynikach losowania. Upewnij się, że wszyscy uczestnicy
              są gotowi i że lista jest kompletna.
            </AlertDescription>
          </Alert>

          {/* Co się stanie */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Co się stanie po losowaniu:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Każdy uczestnik otrzyma powiadomienie z wynikiem</li>
              <li>• Uczestnicy będą mogli zobaczyć swoje wyniki</li>
              <li>• Nie będzie można edytować listy uczestników</li>
              <li>• Nie będzie można zmieniać wykluczeń</li>
              <li>• Grupa przejdzie w tryb "tylko do odczytu"</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Anuluj</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            Potwierdź i rozpocznij losowanie
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
