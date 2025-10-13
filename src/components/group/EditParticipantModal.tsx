import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { User, Mail } from "lucide-react";
import type { ParticipantViewModel, EditParticipantFormViewModel, ParticipantDTO } from "@/types";

// Schema walidacji dla formularza edycji uczestnika
const editParticipantFormSchema = z.object({
  name: z
    .string()
    .min(2, "Imię musi mieć co najmniej 2 znaki")
    .max(50, "Imię nie może przekraczać 50 znaków"),
  email: z
    .string()
    .email("Niepoprawny format adresu email")
    .optional()
    .or(z.literal("")),
});

interface EditParticipantModalProps {
  participant: ParticipantViewModel | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedParticipant: ParticipantDTO) => void;
}

export function EditParticipantModal({
  participant,
  isOpen,
  onClose,
  onSave,
}: EditParticipantModalProps) {
  const form = useForm<EditParticipantFormViewModel>({
    resolver: zodResolver(editParticipantFormSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  // Aktualizuj wartości formularza gdy uczestnik się zmieni
  React.useEffect(() => {
    if (isOpen && participant) {
      form.reset({
        name: participant.name,
        email: participant.email || "",
      });
    }
  }, [participant, isOpen, form]);

  const onSubmit = async (values: EditParticipantFormViewModel) => {
    if (!participant) return;

    try {
      // Tutaj będzie wywołanie API
      // const response = await fetch(`/api/participants/${participant.id}`, {
      //   method: "PATCH",
      //   headers: {
      //     "Content-Type": "application/json",
      //     // Authorization header
      //   },
      //   body: JSON.stringify({
      //     name: values.name,
      //     email: values.email || undefined,
      //   }),
      // });

      // const updatedParticipant: ParticipantDTO = await response.json();

      // Na razie symuluję odpowiedź API
      const updatedParticipant: ParticipantDTO = {
        ...participant,
        name: values.name,
        email: values.email || null,
        updated_at: new Date().toISOString(),
      };

      onSave(updatedParticipant);
      onClose();
    } catch (error) {
      console.error("Błąd podczas aktualizacji uczestnika:", error);
    }
  };

  if (!participant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj uczestnika</DialogTitle>
          <DialogDescription>
            Zmień dane uczestnika grupy Secret Santa.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Imię i nazwisko
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="np. Jan Kowalski" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email (opcjonalny)
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="jan.kowalski@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
