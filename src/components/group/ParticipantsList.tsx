"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
// Dropdown menu components will be imported as needed
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, Link2 } from "lucide-react";
import { notify } from "@/lib/notifications";
import type { ParticipantViewModel } from "@/types";

interface ParticipantsListProps {
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  isCreator: boolean;
  onEdit: (participant: ParticipantViewModel) => void;
  onDelete: (participant: ParticipantViewModel) => void;
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
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());

  const toggleExpanded = (participantId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(participantId)) {
        newSet.delete(participantId);
      } else {
        newSet.add(participantId);
      }
      return newSet;
    });
  };
  const handleCopyToken = async (participant: ParticipantViewModel) => {
    if (participant.resultLink) {
      try {
        await navigator.clipboard.writeText(participant.resultLink);
        notify.success("CLIPBOARD.COPY_SUCCESS");
        onCopyToken(participant);
      } catch (error) {
        notify.error("CLIPBOARD.COPY_LINK_ERROR");
        console.error("Failed to copy to clipboard:", error);
      }
    }
  };

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Uczestnik</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="w-[140px]">Elf-pomocnik</TableHead>
            <TableHead className="w-[140px]">Podopieczny</TableHead>
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
                    <AvatarFallback className="text-xs">{participant.initials}</AvatarFallback>
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

              <TableCell className="text-muted-foreground">{participant.displayEmail}</TableCell>

              {/* Elf-pomocnik column - Shows who helps this participant */}
              <TableCell>
                {participant.hasElf ? (
                  <span
                    className="text-xs text-green-600"
                    title={`elf_participant_id: ${participant.elfParticipantId}`}
                  >
                    {participant.elfName} 🎁
                  </span>
                ) : (
                  <span
                    className="text-xs text-muted-foreground"
                    title={`elf_participant_id: ${participant.elfParticipantId}`}
                  >
                    —
                  </span>
                )}
              </TableCell>

              {/* Podopieczny column - Shows who this participant helps */}
              <TableCell>
                {participant.helpedParticipantNames.length > 0 ? (
                  <div className="text-xs text-blue-600">
                    {participant.helpedParticipantNames.length === 1 ? (
                      <span>{participant.helpedParticipantNames[0]} 🧝</span>
                    ) : expandedRows.has(participant.id) ? (
                      <div className="space-y-1">
                        {participant.helpedParticipantNames.map((name, index) => (
                          <Tooltip key={index}>
                            <TooltipTrigger asChild>
                              <div
                                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer px-1 py-0.5 rounded hover:bg-blue-50"
                                onClick={() => toggleExpanded(participant.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    toggleExpanded(participant.id);
                                  }
                                }}
                                tabIndex={0}
                                role="button"
                                aria-expanded={expandedRows.has(participant.id)}
                              >
                                <span>{name} 🧝</span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Kliknij aby ukryć listę</p>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                      </div>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-auto px-1 text-xs text-blue-600 hover:text-blue-800 p-0"
                            onClick={() => toggleExpanded(participant.id)}
                          >
                            {participant.helpedParticipantNames[0]}... 🧝
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Kliknij aby zobaczyć pozostałych podopiecznych</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>

              {!isDrawn ? (
                // Action column before drawing
                <TableCell>
                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => onEdit(participant)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edytuj uczestnika</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edytuj uczestnika</p>
                        </TooltipContent>
                      </Tooltip>
                    )}

                    {canEdit && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(participant)}
                            disabled={participant.isCreator}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Usuń uczestnika</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{participant.isCreator ? "Nie można usunąć twórcy grupy" : "Usuń uczestnika"}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                </TableCell>
              ) : (
                // Status columns after drawing
                <>
                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {participant.wishlistStatus?.icon && (
                          <participant.wishlistStatus.icon
                            className={`h-4 w-4 ${
                              participant.wishlistStatus.variant === "default" ? "text-green-600" : "text-red-600"
                            }`}
                          />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{participant.wishlistStatus?.text || "Brak listy życzeń"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {participant.resultStatus?.icon && (
                          <participant.resultStatus.icon
                            className={`h-4 w-4 ${
                              participant.resultStatus.variant === "default" ? "text-green-600" : "text-gray-500"
                            }`}
                          />
                        )}
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{participant.resultStatus?.text || "Wynik nie został jeszcze zobaczony"}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  <TableCell>
                    {isCreator && participant.resultLink && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyToken(participant)}
                            className="h-8 w-8 p-0"
                          >
                            <Link2 className="h-4 w-4" />
                            <span className="sr-only">Kopiuj link dostępu</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Kopiuj link dostępu</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                    {isCreator && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => onEdit(participant)} className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edytuj uczestnika</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Edytuj uczestnika</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
}
