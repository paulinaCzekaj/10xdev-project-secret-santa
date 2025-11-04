import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Edit, Trash2 } from "lucide-react";
import { ResponsiveActions, type ActionItem } from "@/components/ui/responsive-actions";
import { ParticipantEmailEditor } from "./ParticipantEmailEditor";
import { ParticipantStatusBadges } from "./ParticipantStatusBadges";
import { useParticipantEmailEdit } from "@/hooks/useParticipantEmailEdit";
import type { ParticipantViewModel } from "@/types";

interface ParticipantCardProps {
  participant: ParticipantViewModel;
  canEdit: boolean;
  isDrawn: boolean;
  isCreator: boolean;
  onEdit: (participant: ParticipantViewModel) => void;
  onDelete: (participant: ParticipantViewModel) => void;
  onCopyToken: (participant: ParticipantViewModel) => void;
}

export function ParticipantCard({
  participant,
  canEdit,
  isDrawn,
  isCreator,
  onEdit,
  onDelete,
  onCopyToken,
}: ParticipantCardProps) {
  const emailEditLogic = useParticipantEmailEdit({
    participant,
    onEdit,
  });

  // Define actions for responsive component
  const actions: ActionItem[] = [
    {
      icon: Edit,
      label: "Edytuj",
      onClick: () => onEdit(participant),
    },
    {
      icon: Trash2,
      label: "Usuń",
      onClick: () => onDelete(participant),
      variant: "destructive" as const,
      disabled: participant.isCreator,
    },
  ];

  return (
    <Card className="border border-red-200 bg-gradient-to-r from-red-50/50 to-green-50/50 dark:from-red-950/50 dark:to-green-950/50 hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        {/* Mobile/Small Tablet: vertical stack, Desktop: horizontal layout */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Section 1: Avatar + User Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 ring-2 ring-red-200 dark:ring-red-800">
              <AvatarFallback className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                {participant.initials}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-red-800 dark:text-red-200">{participant.displayName}</h3>
                {participant.isCreator && (
                  <Badge
                    variant="secondary"
                    className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  >
                    🎅 Twórca
                  </Badge>
                )}
              </div>

              {/* Email editor - only visible for creator */}
              <ParticipantEmailEditor
                form={emailEditLogic.form}
                isEditing={emailEditLogic.isEditing}
                displayEmail={participant.displayEmail}
                isCreator={isCreator}
                onStartEdit={emailEditLogic.handleStartEdit}
                onSave={emailEditLogic.handleSave}
                onCancel={emailEditLogic.handleCancelEdit}
                isSubmitting={emailEditLogic.isSubmitting}
              />
            </div>
          </div>

          {/* Section 2: Status badges + Copy link - only when drawn */}
          {isDrawn && (
            <ParticipantStatusBadges participant={participant} isCreator={isCreator} onCopyToken={onCopyToken} />
          )}

          {/* Section 3: Action buttons - only when not drawn and user can edit */}
          {!isDrawn && canEdit && (
            <>
              {/* Desktop: full buttons */}
              <div className="hidden md:flex md:flex-shrink-0">
                <ResponsiveActions actions={actions} layout="buttons" />
              </div>

              {/* Mobile: dropdown menu */}
              <div className="flex md:hidden">
                <ResponsiveActions actions={actions} layout="dropdown" />
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
