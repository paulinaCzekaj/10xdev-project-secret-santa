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
    <Card className="border border-red-200 bg-gradient-to-r from-red-50/50 to-green-50/50 dark:from-red-950/50 dark:to-green-950/50 hover:shadow-lg transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-red-200 dark:ring-red-800">
              <AvatarFallback className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                {participant.initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center gap-2">
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
              <p className="text-sm text-muted-foreground">{participant.displayEmail}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Status badges po losowaniu */}
            {isDrawn && (
              <div className="flex gap-2">
                <Badge
                  variant={participant.wishlistStatus?.variant || "secondary"}
                  className={`text-xs ${
                    participant.wishlistStatus?.text === "Dodana"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  🎁 Lista: {participant.wishlistStatus?.text || "Brak"}
                </Badge>
                <Badge
                  variant={participant.resultStatus?.variant || "secondary"}
                  className={`text-xs ${
                    participant.resultStatus?.text === "Zobaczył"
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                  }`}
                >
                  👀 Wynik: {participant.resultStatus?.text || "Nie zobaczył"}
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
