import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shuffle, AlertTriangle, CheckCircle, Users, Ban } from "lucide-react";
import { DrawConfirmationModal } from "./DrawConfirmationModal";
import { useDraw } from "@/hooks/useDraw";
import type { DrawValidationDTO } from "@/types";

interface DrawSectionProps {
  groupId: number;
  participantsCount: number;
  exclusionsCount: number;
  isCreator: boolean;
  onDrawClick: () => void;
}

export function DrawSection({
  groupId,
  participantsCount,
  exclusionsCount,
  isCreator,
  onDrawClick,
}: DrawSectionProps) {
  const { validation, isValidating, validateDraw } = useDraw(groupId);
  const [isDrawConfirmationModalOpen, setIsDrawConfirmationModalOpen] = useState(false);

  // Stan walidacji
  const [validationResult, setValidationResult] = useState<DrawValidationDTO | null>(null);
  const [isValidationChecked, setIsValidationChecked] = useState(false);

  // Sprawdzamy czy można rozpocząć losowanie przy montowaniu komponentu
  useEffect(() => {
    const checkValidation = async () => {
      const result = await validateDraw();
      if (result.success) {
        setValidationResult(result.data);
        setIsValidationChecked(true);
      }
    };

    if (isCreator && participantsCount >= 3) {
      checkValidation();
    }
  }, [groupId, isCreator, participantsCount, validateDraw]);

  const handleDrawClick = () => {
    setIsDrawConfirmationModalOpen(true);
  };

  const handleDrawConfirm = () => {
    // Tutaj będzie wywołanie API do wykonania losowania
    // onDrawComplete(result);
    setIsDrawConfirmationModalOpen(false);
    // Na razie wywołujemy callback z symulowanym rezultatem
    onDrawClick();
  };

  // Warunki wyświetlania
  const canDraw = participantsCount >= 3 && isCreator;
  const isValid = validationResult?.valid ?? true;
  const isReady = canDraw && isValid;

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shuffle className="h-5 w-5" />
            Losowanie
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Rozpocznij losowanie Secret Santa dla tej grupy.
            Operacja jest nieodwracalna.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Status gotowości */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                participantsCount >= 3 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
              }`}>
                {participantsCount >= 3 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
              </div>
              <div>
                <p className="font-medium">Uczestnicy</p>
                <p className="text-sm text-muted-foreground">
                  {participantsCount} {participantsCount === 1 ? 'uczestnik' : participantsCount < 5 ? 'uczestników' : 'uczestników'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Minimum wymagane</p>
                <p className="text-sm text-muted-foreground">3 uczestników</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                exclusionsCount === 0 ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
              }`}>
                <Ban className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Wykluczenia</p>
                <p className="text-sm text-muted-foreground">
                  {exclusionsCount} {exclusionsCount === 1 ? 'wykluczenie' : exclusionsCount < 5 ? 'wykluczenia' : 'wykluczeń'}
                </p>
              </div>
            </div>
          </div>

          {/* Alert o błędach */}
          {!canDraw && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {participantsCount < 3
                  ? "Do losowania wymagane jest minimum 3 uczestników."
                  : "Tylko twórca grupy może rozpocząć losowanie."
                }
              </AlertDescription>
            </Alert>
          )}

          {canDraw && !isValid && validationResult && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {validationResult.message}
                {validationResult.details && (
                  <div className="mt-2 text-sm">
                    Szczegóły: {validationResult.details}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {canDraw && isValid && exclusionsCount > 0 && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Wykluczenia zostały zweryfikowane. Losowanie jest możliwe.
              </AlertDescription>
            </Alert>
          )}

          {/* Przycisk rozpoczęcia losowania */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6 bg-muted/50 rounded-lg">
            <div>
              <h3 className="font-medium mb-1">Rozpocznij losowanie</h3>
              <p className="text-sm text-muted-foreground">
                Po rozpoczęciu losowania nie będzie można dodawać/usunąć uczestników ani zmieniać wykluczeń.
              </p>
            </div>

            <Button
              onClick={handleDrawClick}
              disabled={!isReady || isValidating}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
            >
              <Shuffle className="h-5 w-5" />
              {isValidating ? "Sprawdzanie..." : "Rozpocznij losowanie"}
            </Button>
          </div>

          {/* Modal potwierdzenia */}
          <DrawConfirmationModal
            isOpen={isDrawConfirmationModalOpen}
            groupId={groupId}
            participantsCount={participantsCount}
            exclusionsCount={exclusionsCount}
            onClose={() => setIsDrawConfirmationModalOpen(false)}
            onConfirm={handleDrawConfirm}
          />
        </CardContent>
      </Card>
    </section>
  );
}
