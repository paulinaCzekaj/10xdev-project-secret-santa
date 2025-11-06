import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Check, X } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { ParticipantEmailFormData } from "@/schemas/participant.schemas";

interface ParticipantEmailEditorProps {
  form: UseFormReturn<ParticipantEmailFormData>;
  isEditing: boolean;
  displayEmail: string;
  isCreator: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function ParticipantEmailEditor({
  form,
  isEditing,
  displayEmail,
  isCreator,
  onStartEdit,
  onSave,
  onCancel,
  isSubmitting = false,
}: ParticipantEmailEditorProps) {
  // Only show email editor if user is the creator
  if (!isCreator) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {!isEditing ? (
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate min-w-0" title={displayEmail || "Brak"}>
            {displayEmail || "Brak"}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={onStartEdit}
                className="h-6 w-6 p-0 hover:bg-blue-100 dark:hover:bg-blue-900 flex-shrink-0 group"
              >
                <Edit className="h-3.5 w-3.5 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{displayEmail && displayEmail !== "Brak" ? "Edytuj email uczestnika" : "Dodaj email uczestnika"}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      ) : (
        <>
          <Input
            {...form.register("email")}
            type="email"
            placeholder="jan.kowalski@example.com"
            className={`h-7 text-sm flex-1 min-w-0 ${form.formState.errors.email ? "border-destructive" : ""}`}
          />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive absolute -bottom-5 left-0">{form.formState.errors.email.message}</p>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSubmitting}
            className="h-6 w-6 p-0 hover:bg-green-100 flex-shrink-0"
            title="Zapisz"
          >
            <Check className="h-3.5 w-3.5 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-6 w-6 p-0 hover:bg-red-100 flex-shrink-0"
            title="Anuluj"
          >
            <X className="h-3.5 w-3.5 text-red-600" />
          </Button>
        </>
      )}
    </div>
  );
}
