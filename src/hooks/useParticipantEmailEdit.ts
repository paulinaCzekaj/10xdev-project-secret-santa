import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { participantEmailSchema, type ParticipantEmailFormData } from "@/schemas/participant.schemas";
import { notify } from "@/lib/notifications";
import type { ParticipantViewModel } from "@/types";

interface UseParticipantEmailEditProps {
  participant: ParticipantViewModel;
  onEdit: (participant: ParticipantViewModel) => void;
}

export function useParticipantEmailEdit({ participant, onEdit }: UseParticipantEmailEditProps) {
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ParticipantEmailFormData>({
    resolver: zodResolver(participantEmailSchema),
    defaultValues: {
      email: participant.rawEmail || "",
    },
  });

  const handleStartEdit = useCallback(() => {
    form.reset({ email: participant.rawEmail || "" });
    setIsEditing(true);
  }, [participant.rawEmail, form]);

  const handleCancelEdit = useCallback(() => {
    form.reset();
    setIsEditing(false);
  }, [form]);

  const handleSave = useCallback(
    async (data: ParticipantEmailFormData) => {
      try {
        // Call the parent onEdit callback with updated participant
        onEdit({
          ...participant,
          displayEmail: data.email,
          rawEmail: data.email,
        });

        setIsEditing(false);
        notify.success("Email uczestnika został zaktualizowany");
      } catch (error) {
        notify.error("Błąd podczas aktualizacji email");
        console.error("Failed to update participant email:", error);
      }
    },
    [participant, onEdit]
  );

  return {
    isEditing,
    form,
    handleStartEdit,
    handleCancelEdit,
    handleSave: form.handleSubmit(handleSave),
    isSubmitting: form.formState.isSubmitting,
  };
}
