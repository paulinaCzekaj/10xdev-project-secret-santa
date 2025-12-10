import React from "react";
import { Button } from "@/components/ui/button";
import { X, Ban, HelpCircle } from "lucide-react";
import type { ExclusionViewModel } from "@/types";

interface ExclusionsListProps {
  exclusions: ExclusionViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  onDelete: (exclusionId: number) => void;
}

export function ExclusionsList({ exclusions, canEdit, isDrawn, onDelete }: ExclusionsListProps) {
  if (exclusions.length === 0) {
    return (
      <div className="text-center py-8">
        <Ban className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">Brak zdefiniowanych wykluczeń</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {exclusions.map((exclusion) => (
        <div key={exclusion.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
              {exclusion.isElfExclusion ? (
                <HelpCircle className="h-4 w-4 text-blue-600" />
              ) : (
                <Ban className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                <span className="text-red-600 font-semibold">{exclusion.blocker_name}</span>
                <span className="text-muted-foreground mx-1">→</span>
                <span className="text-green-600 font-semibold">{exclusion.blocked_name}</span>
              </span>
              {exclusion.isElfExclusion && (
                <span className="text-xs text-blue-600">Wykluczenie automatyczne (relacja elf)</span>
              )}
            </div>
          </div>

          {canEdit && !isDrawn && exclusion.canDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(exclusion.id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Usuń wykluczenie</span>
            </Button>
          )}
        </div>
      ))}

      <div className="text-xs text-muted-foreground mt-4">
        <p>
          <strong>Wykluczenia jednokierunkowe:</strong> <span className="text-red-600 font-medium">Osoba A</span>{" "}
          <span className="text-muted-foreground">nie może wylosować</span>{" "}
          <span className="text-green-600 font-medium">osoby B</span>, ale{" "}
          <span className="text-green-600 font-medium">osoba B</span>{" "}
          <span className="text-muted-foreground">może wylosować</span>{" "}
          <span className="text-red-600 font-medium">osobę A</span> (chyba że istnieje odwrotne wykluczenie).
        </p>
      </div>
    </div>
  );
}
