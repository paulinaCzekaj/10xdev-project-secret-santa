import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Copy, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
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
  const handleCopyToken = async () => {
    if (participant.resultLink) {
      try {
        await navigator.clipboard.writeText(participant.resultLink);
        toast.success("Link skopiowany do schowka");
        onCopyToken(participant);
      } catch (error) {
        toast.error("Nie udało się skopiować linku");
        console.error("Failed to copy to clipboard:", error);
      }
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>{participant.initials}</AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium">{participant.displayName}</h3>
                {participant.isCreator && (
                  <Badge variant="secondary" className="text-xs">
                    Twórca
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {participant.displayEmail}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badges po losowaniu */}
            {isDrawn && (
              <div className="flex gap-2">
                <Badge
                  variant={participant.wishlistStatus?.variant || "secondary"}
                  className="text-xs"
                >
                  Lista: {participant.wishlistStatus?.text || "Brak"}
                </Badge>
                <Badge
                  variant={participant.resultStatus?.variant || "secondary"}
                  className="text-xs"
                >
                  Wynik: {participant.resultStatus?.text || "Nie zobaczył"}
                </Badge>
              </div>
            )}

            {/* Menu akcji */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Otwórz menu akcji</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                {!isDrawn && canEdit && (
                  <>
                    <DropdownMenuItem onClick={() => onEdit(participant)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edytuj
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onDelete(participant)}
                      disabled={participant.isCreator}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Usuń
                    </DropdownMenuItem>
                  </>
                )}

                {isDrawn && isCreator && participant.resultLink && (
                  <DropdownMenuItem onClick={handleCopyToken}>
                    <Copy className="mr-2 h-4 w-4" />
                    Kopiuj link
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
