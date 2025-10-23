import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Edit, Trash2, MoreHorizontal, Check, X, Link2, Eye, EyeOff } from "lucide-react";
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
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [editedEmail, setEditedEmail] = useState(participant.rawEmail || "");

  // displayEmail już zawiera odpowiednio sformatowany email (pełny dla twórcy, zagwiazdkowany dla innych)
  // rawEmail zawsze ma pełny email dla edycji
  const emailToDisplay = participant.displayEmail;

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

  const handleStartEditEmail = () => {
    setEditedEmail(participant.rawEmail || "");
    setIsEditingEmail(true);
  };

  const handleCancelEditEmail = () => {
    setIsEditingEmail(false);
    setEditedEmail(participant.rawEmail || "");
  };

  const handleSaveEmail = () => {
    // Wywołaj callback z zaktualizowanym emailem
    onEdit({ ...participant, displayEmail: editedEmail });
    setIsEditingEmail(false);
  };

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
              {/* Email widoczny tylko dla założyciela grupy */}
              {isCreator && (
                <div className="flex items-center gap-1 mt-1">
                  {!isEditingEmail ? (
                    <div className="flex items-center gap-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate min-w-0" title={emailToDisplay || "Brak"}>
                        {emailToDisplay || "Brak"}
                      </p>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleStartEditEmail}
                            className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900 flex-shrink-0 group"
                          >
                            <Edit className="h-3.5 w-3.5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>
                            {emailToDisplay && emailToDisplay !== "Brak"
                              ? "Edytuj email uczestnika"
                              : "Dodaj email uczestnika"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  ) : (
                    <>
                      <Input
                        type="email"
                        value={editedEmail}
                        onChange={(e) => setEditedEmail(e.target.value)}
                        className="h-7 text-sm flex-1 min-w-0"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSaveEmail}
                        className="h-6 w-6 p-0 hover:bg-green-100 flex-shrink-0"
                        title="Zapisz"
                      >
                        <Check className="h-3.5 w-3.5 text-green-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEditEmail}
                        className="h-6 w-6 p-0 hover:bg-red-100 flex-shrink-0"
                        title="Anuluj"
                      >
                        <X className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Status badges + Copy link - full width on mobile, auto on desktop */}
          {isDrawn && (
            <div className="flex items-center flex-wrap gap-2 w-full md:w-auto md:flex-shrink-0">
              {/* Badge Lista życzeń - X lub ✓ */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={participant.wishlistStatus?.variant || "secondary"}
                    className={`text-xs flex-shrink-0 flex items-center gap-1 cursor-default ${
                      participant.wishlistStatus?.hasWishlist
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    }`}
                  >
                    🎁 Lista:{" "}
                    {participant.wishlistStatus?.hasWishlist ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <X className="h-3 w-3" />
                    )}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{participant.wishlistStatus?.hasWishlist ? "Lista życzeń została dodana" : "Brak listy życzeń"}</p>
                </TooltipContent>
              </Tooltip>

              {/* Badge Status - oczko */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant={participant.resultStatus?.variant || "secondary"}
                    className={`text-xs flex-shrink-0 flex items-center gap-1 cursor-default ${
                      participant.resultStatus?.viewed
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                    }`}
                  >
                    Status:{" "}
                    {participant.resultStatus?.viewed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {participant.resultStatus?.viewed
                      ? "Uczestnik sprawdził wynik losowania"
                      : "Uczestnik nie sprawdził jeszcze wyniku"}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Ikona kopiowania linku - tylko dla twórcy */}
              {isCreator && participant.resultLink && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyToken}
                      className="h-7 w-7 p-0 hover:bg-blue-100"
                    >
                      <Link2 className="h-4 w-4 text-blue-600" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Kopiuj link do wyniku uczestnika</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Section 3: Action buttons */}
          {!isDrawn && canEdit && (
            <>
              {/* Desktop: pełne przyciski */}
              <div className="hidden md:flex items-center gap-2 md:flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => onEdit(participant)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edytuj
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete(participant)}
                  disabled={participant.isCreator}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Usuń
                </Button>
              </div>

              {/* Mobile: dropdown menu */}
              <div className="flex md:hidden absolute top-4 right-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(participant)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edytuj
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(participant)}
                      disabled={participant.isCreator}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Usuń
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
