import React from "react";
import { RefreshCw, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { AIPreviewModalProps } from "@/types";

/**
 * Modal podglądu wygenerowanego listu do Mikołaja
 * Wyświetla sformatowaną treść oraz opcje: Akceptuj, Odrzuć, Generuj ponownie
 */
export function AIPreviewModal({
  isOpen,
  onClose,
  generatedContent,
  onAccept,
  onReject,
  onRegenerate,
  isRegenerating,
  remainingGenerations,
  currentPrompt,
}: AIPreviewModalProps) {
  const handleAccept = () => {
    onAccept();
    onClose();
  };

  const handleReject = () => {
    onReject();
    onClose();
  };

  const isLastGeneration = remainingGenerations === 0;
  const buttonsDisabled = isRegenerating;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Twój list do Mikołaja</DialogTitle>
            <Badge variant={remainingGenerations > 0 ? "default" : "destructive"}>
              Pozostało: {remainingGenerations}
            </Badge>
          </div>
          <DialogDescription>Sprawdź wygenerowany list i zdecyduj, czy chcesz go zaakceptować.</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            {/* Alert o ostatnim generowaniu */}
            {isLastGeneration && (
              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  ⚠️ To Twoje ostatnie generowanie! Upewnij się, że treść Ci odpowiada.
                </AlertDescription>
              </Alert>
            )}

            {/* Alert o zmniejszeniu licznika */}
            <Alert>
              <AlertDescription>
                Każda akcja (akceptacja, odrzucenie lub regeneracja) zmniejszy licznik dostępnych generowań o 1.
              </AlertDescription>
            </Alert>

            {/* Podgląd wygenerowanej treści */}
            <div className="rounded-lg border p-4 bg-muted/50 space-y-4">
              {currentPrompt && (
                <div className="text-xs text-muted-foreground">
                  <strong>Podpowiedź użyta do generowania:</strong> {currentPrompt}
                </div>
              )}
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{generatedContent}</pre>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleReject} disabled={buttonsDisabled}>
            Odrzuć
          </Button>

          <div className="flex gap-2 flex-1 justify-end">
            <Button variant="ghost" onClick={onRegenerate} disabled={buttonsDisabled || remainingGenerations === 0}>
              {isRegenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Regeneruję...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generuj ponownie
                </>
              )}
            </Button>

            <Button onClick={handleAccept} disabled={buttonsDisabled}>
              Akceptuj
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
