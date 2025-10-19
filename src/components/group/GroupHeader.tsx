import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Trash2, Calendar, DollarSign } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <CardTitle className="text-3xl font-bold text-red-500 dark:text-red-400" data-testid="group-name">
                🎄 {group.name} 🎄
              </CardTitle>
              <Badge
                variant={group.statusBadge.variant}
                className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                data-testid="group-status-badge"
              >
                {group.statusBadge.text}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1" data-testid="group-budget">
                <DollarSign className="h-4 w-4" />
                <span>{group.formattedBudget}</span>
              </div>

              <div className="flex items-center gap-1" data-testid="group-end-date">
                <Calendar className="h-4 w-4" />
                <span>{group.formattedEndDate}</span>
              </div>

              {isDrawn && group.drawn_at && (
                <div className="text-green-600 font-medium">Data losowania: {formatDate(group.drawn_at)}</div>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            {/* Przycisk edycji grupy - tylko dla twórcy przed losowaniem */}
            {isCreator && canEdit && !isDrawn && (
              <Button
                variant="outline"
                size="sm"
                onClick={onEditClick}
                className="flex items-center gap-2"
                data-testid="group-edit-button"
              >
                <Edit className="h-4 w-4" />
                Edytuj grupę
              </Button>
            )}

            {/* Przycisk usunięcia grupy - tylko dla twórcy */}
            {isCreator && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDeleteClick}
                className="flex items-center gap-2"
                data-testid="group-delete-button"
              >
                <Trash2 className="h-4 w-4" />
                Usuń grupę
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}
