import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Edit, Trash2, Calendar, DollarSign } from "lucide-react";
import type { GroupViewModel } from "@/types";

interface GroupHeaderProps {
  group: GroupViewModel;
  isCreator: boolean;
  canEdit: boolean;
  isDrawn: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
}

export function GroupHeader({ group, isCreator, canEdit, isDrawn, onEditClick, onDeleteClick }: GroupHeaderProps) {
  return (
    <Card
      className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-green-50 dark:from-red-950 dark:to-green-950"
      data-testid="group-header"
    >
      <CardHeader className="pb-4">
        <div className="space-y-3">
          {/* Tytuł, status i akcje */}
          <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
              <CardTitle
                className="text-2xl sm:text-3xl md:text-4xl font-bold text-red-500 dark:text-red-400"
                data-testid="group-name"
              >
                🎄 {group.name}
              </CardTitle>
              <Badge
                variant={group.statusBadge.variant}
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 shrink-0 text-xs whitespace-nowrap"
                data-testid="group-status-badge"
              >
                {group.statusBadge.text}
              </Badge>
            </div>

            {/* Przyciski akcji - ikony z tooltipami */}
            <div className="flex gap-0 shrink-0">
              {isCreator && canEdit && !isDrawn && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onEditClick}
                      className="h-8 w-8 hover:bg-red-100 dark:hover:bg-red-900"
                      data-testid="group-edit-button"
                      aria-label="Edytuj grupę"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edytuj grupę</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {isCreator && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onDeleteClick}
                      className="h-8 w-8 text-destructive hover:bg-red-100 hover:text-destructive dark:hover:bg-red-900"
                      data-testid="group-delete-button"
                      aria-label="Usuń grupę"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Usuń grupę</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Budżet i data - pionowo na mobile, poziomo na większych ekranach */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-2 sm:gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1" data-testid="group-budget">
                <DollarSign className="h-4 w-4" />
                <span>{group.formattedBudget}</span>
              </div>

              <div className="flex items-center gap-1" data-testid="group-end-date">
                <Calendar className="h-4 w-4" />
                <span>{group.formattedEndDate}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
