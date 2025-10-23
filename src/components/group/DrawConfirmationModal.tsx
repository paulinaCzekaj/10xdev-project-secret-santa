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
import { Shuffle, AlertTriangle, Users, Ban } from "lucide-react";
import { toast } from "sonner";
import type { DrawResultDTO } from "@/types";

interface DrawConfirmationModalProps {
  isOpen: boolean;
  participantsCount: number;
  exclusionsCount: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  executeDraw: () => Promise<{ success: boolean; error?: string; data?: DrawResultDTO }>;
}

export function DrawConfirmationModal({
  isOpen,
  participantsCount,
  exclusionsCount,
  onClose,
  onConfirm,
  executeDraw,
}: DrawConfirmationModalProps) {
  const [isExecuting, setIsExecuting] = React.useState(false);

  const handleConfirm = async () => {
    setIsExecuting(true);
    try {
      const result = await executeDraw();

      if (result.success && result.data) {
        toast.success("Losowanie zostało pomyślnie wykonane!");
        // Poczekaj na odświeżenie danych przed zamknięciem modala
        await onConfirm();
      } else {
        toast.error(result.error || "Nie udało się wykonać losowania");
        setIsExecuting(false);
      }
    } catch {
      toast.error("Wystąpił błąd podczas wykonania losowania");
      setIsExecuting(false);
    }
  };

  // Reset stan gdy modal się zamyka
  React.useEffect(() => {
    if (!isOpen) {
      setIsExecuting(false);
    }
  }, [isOpen]);

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[500px]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Shuffle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Czy na pewno chcesz rozpocząć losowanie?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                Ta operacja jest nieodwracalna. Po rozpoczęciu losowania nie będzie można dodawać/usunąć uczestników ani
                zmieniać wykluczeń.
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
                <strong>{participantsCount}</strong> {participantsCount === 1 ? "uczestnik" : "uczestników"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <strong>{exclusionsCount}</strong> {exclusionsCount === 1 ? "wykluczenie" : "wykluczeń"}
              </span>
            </div>
          </div>

          {/* Ostrzeżenie */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Uwaga!</strong> Po potwierdzeniu wszyscy uczestnicy otrzymają informacje o swoich wynikach
              losowania. Upewnij się, że wszyscy uczestnicy są gotowi i że lista jest kompletna.
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
              <li>• Grupa przejdzie w tryb &bdquo;tylko do odczytu&rdquo;</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel disabled={isExecuting} className="w-full sm:w-auto">
            Anuluj
          </AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isExecuting} className="w-full sm:w-auto">
            {isExecuting ? "Trwa losowanie..." : "Potwierdź i rozpocznij losowanie"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
