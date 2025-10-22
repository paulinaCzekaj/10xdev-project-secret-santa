import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddExclusionForm } from "./AddExclusionForm";
import { ExclusionsList } from "./ExclusionsList";
import { Ban } from "lucide-react";
import type { ExclusionViewModel, ParticipantViewModel } from "@/types";

interface ExclusionsSectionProps {
  groupId: number;
  exclusions: ExclusionViewModel[];
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  onExclusionAdded: () => void;
  onExclusionDeleted: () => void;
  onDeleteExclusion: (exclusionId: number) => void;
}

export function ExclusionsSection({
  groupId,
  exclusions,
  participants,
  canEdit,
  isDrawn,
  onExclusionAdded,
  onExclusionDeleted,
  onDeleteExclusion,
}: ExclusionsSectionProps) {
  const handleExclusionAdded = () => {
    onExclusionAdded();
  };

  const handleExclusionDeleted = (exclusionId: number) => {
    onDeleteExclusion(exclusionId);
    onExclusionDeleted();
  };

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Reguły wykluczeń
            <span className="text-sm font-normal text-muted-foreground">({exclusions.length})</span>
          </CardTitle>
          {canEdit && !isDrawn && (
            <p className="text-sm text-muted-foreground">
              Zdefiniuj pary osób, które nie mogą wylosować siebie nawzajem. Wykluczenia są jednokierunkowe.
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Formularz dodawania wykluczenia - tylko przed losowaniem */}
          {canEdit && !isDrawn && participants.length >= 2 && (
            <AddExclusionForm
              groupId={groupId}
              participants={participants}
              existingExclusions={exclusions}
              onSuccess={handleExclusionAdded}
            />
          )}

          {/* Lista wykluczeń */}
          {exclusions.length > 0 ? (
            <ExclusionsList
              exclusions={exclusions}
              canEdit={canEdit}
              isDrawn={isDrawn}
              onDelete={handleExclusionDeleted}
            />
          ) : (
            <div className="text-center py-8">
              <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Brak zdefiniowanych wykluczeń</p>
              {canEdit && !isDrawn && participants.length >= 2 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Wykluczenia są opcjonalne i mogą być dodane powyżej
                </p>
              )}
              {participants.length < 2 && (
                <p className="text-sm text-muted-foreground mt-2">
                  Dodaj przynajmniej 2 uczestników, aby móc definiować wykluczenia
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
