import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, Copy, MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { ParticipantViewModel } from "@/types";

interface ParticipantsListProps {
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  isCreator: boolean;
  onEdit: (participant: ParticipantViewModel) => void;
  onDelete: (participantId: number) => void;
  onCopyToken: (participant: ParticipantViewModel) => void;
}

export function ParticipantsList({
  participants,
  canEdit,
  isDrawn,
  isCreator,
  onEdit,
  onDelete,
  onCopyToken,
}: ParticipantsListProps) {
  const handleCopyToken = async (participant: ParticipantViewModel) => {
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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Uczestnik</TableHead>
          <TableHead>Email</TableHead>
          {!isDrawn ? (
            <>
              <TableHead className="w-[100px]">Akcje</TableHead>
            </>
          ) : (
            <>
              <TableHead className="w-[120px]">Lista życzeń</TableHead>
              <TableHead className="w-[120px]">Wynik</TableHead>
              <TableHead className="w-[100px]">Akcje</TableHead>
            </>
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {participants.map((participant) => (
          <TableRow key={participant.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {participant.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {participant.displayName}
                    {participant.isCreator && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        Twórca
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </TableCell>

            <TableCell className="text-muted-foreground">
              {participant.displayEmail}
            </TableCell>

            {!isDrawn ? (
              // Kolumna akcji przed losowaniem
              <TableCell>
                <div className="flex items-center gap-1">
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(participant)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                      <span className="sr-only">Edytuj uczestnika</span>
                    </Button>
                  )}

                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(participant.id)}
                      disabled={participant.isCreator}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Usuń uczestnika</span>
                    </Button>
                  )}
                </div>
              </TableCell>
            ) : (
              // Kolumny statusu po losowaniu
              <>
                <TableCell>
                  <Badge
                    variant={participant.wishlistStatus?.variant || "secondary"}
                  >
                    {participant.wishlistStatus?.text || "Brak"}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge
                    variant={participant.resultStatus?.variant || "warning"}
                  >
                    {participant.resultStatus?.text || "Nie zobaczył"}
                  </Badge>
                </TableCell>

                <TableCell>
                  {isCreator && participant.resultLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyToken(participant)}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="h-4 w-4" />
                      <span className="sr-only">Kopiuj link dostępu</span>
                    </Button>
                  )}
                </TableCell>
              </>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
