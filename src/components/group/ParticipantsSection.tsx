import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddParticipantForm } from "./AddParticipantForm";
import { ParticipantsList } from "./ParticipantsList";
import { ParticipantCard } from "./ParticipantCard";
import { Users } from "lucide-react";
import type { ParticipantViewModel } from "@/types";

interface ParticipantsSectionProps {
  groupId: number;
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  isCreator: boolean;
  onParticipantAdded: () => void;
  onParticipantUpdated: () => void;
  onParticipantDeleted: () => void;
  onEditParticipant: (participant: ParticipantViewModel) => void;
  onDeleteParticipant: (participant: ParticipantViewModel) => void;
  onCopyParticipantToken: (participant: ParticipantViewModel) => void;
}

export function ParticipantsSection({
  groupId,
  participants,
  canEdit,
  isDrawn,
  isCreator,
  onParticipantAdded,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onParticipantUpdated,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onParticipantDeleted,
  onEditParticipant,
  onDeleteParticipant,
  onCopyParticipantToken,
}: ParticipantsSectionProps) {
  return (
    <section data-testid="participants-section">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Uczestnicy
            <span className="text-sm font-normal text-muted-foreground" data-testid="participants-count">
              ({participants.length})
            </span>
          </CardTitle>
          {canEdit && !isDrawn && (
            <p className="text-sm text-muted-foreground">
              Dodaj osoby, które będą uczestniczyć w losowaniu Secret Santa.
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Formularz dodawania uczestnika - tylko przed losowaniem */}
          {canEdit && !isDrawn && <AddParticipantForm groupId={groupId} onSuccess={onParticipantAdded} />}

          {/* Lista uczestników */}
          {participants.length > 0 ? (
            <>
              {/* Desktop: tabela */}
              <div className="hidden md:block">
                <ParticipantsList
                  participants={participants}
                  canEdit={canEdit}
                  isDrawn={isDrawn}
                  isCreator={isCreator}
                  onEdit={onEditParticipant}
                  onDelete={onDeleteParticipant}
                  onCopyToken={onCopyParticipantToken}
                />
              </div>

              {/* Mobile: karty */}
              <div className="md:hidden space-y-3">
                {participants.map((participant) => (
                  <ParticipantCard
                    key={participant.id}
                    participant={participant}
                    canEdit={canEdit}
                    isDrawn={isDrawn}
                    isCreator={isCreator}
                    onEdit={onEditParticipant}
                    onDelete={onDeleteParticipant}
                    onCopyToken={onCopyParticipantToken}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Brak uczestników w grupie</p>
              {canEdit && !isDrawn && (
                <p className="text-sm text-muted-foreground mt-2">
                  Dodaj pierwszego uczestnika używając formularza powyżej
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
