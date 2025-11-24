import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { User, Mail, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { notify } from "@/lib/notifications";
import { ResponsiveDialogFooter } from "@/components/ui/responsive-form";
import type { ParticipantViewModel, EditParticipantFormViewModel, UpdateParticipantCommand } from "@/types";

// Schema walidacji dla formularza edycji uczestnika
const editParticipantFormSchema = z.object({
  name: z.string().min(2, "Imię musi mieć co najmniej 2 znaki").max(50, "Imię nie może przekraczać 50 znaków"),
  email: z.string().email("Niepoprawny format adresu email").optional().or(z.literal("")),
  elfParticipantId: z.number().optional().nullable(),
});

interface EditParticipantModalProps {
  participant: ParticipantViewModel | null;
  participants: ParticipantViewModel[]; // For elf assignment
  isOpen: boolean;
  isDrawn?: boolean; // Czy losowanie zostało wykonane
  onClose: () => void;
  onSave: () => void; // Zmiana - tylko callback bez parametrów
  updateParticipant: (
    participantId: number,
    command: UpdateParticipantCommand
  ) => Promise<{ success: boolean; error?: string }>;
}

export function EditParticipantModal({
  participant,
  participants,
  isOpen,
  isDrawn = false,
  onClose,
  onSave,
  updateParticipant,
}: EditParticipantModalProps) {
  // Filter participants who are not already helping someone, sorted alphabetically
  // These participants can become elves for the edited participant
  const availableAsElf = participants
    .filter(
      (p) =>
        p.id !== participant?.id && // participant can't be their own elf
        (!p.isElfForSomeone || (participant?.hasElf && p.id === participant?.elfParticipantId)) // exclude those already helping someone, unless they're the current elf
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const form = useForm<EditParticipantFormViewModel>({
    resolver: zodResolver(editParticipantFormSchema),
    defaultValues: {
      name: "",
      email: "",
      elfParticipantId: null,
    },
  });

  // Aktualizuj wartości formularza gdy uczestnik się zmieni
  React.useEffect(() => {
    if (isOpen && participant) {
      form.reset({
        name: participant.name,
        email: participant.email || "",
        elfParticipantId: participant.elfParticipantId,
      });
    }
  }, [participant, isOpen, form]);

  const onSubmit = async (values: EditParticipantFormViewModel) => {
    if (!participant) return;

    try {
      // Po losowaniu wysyłamy tylko email (nie name ani elfa)
      const command: UpdateParticipantCommand = isDrawn
        ? {
            email: values.email || undefined,
          }
        : {
            name: values.name,
            email: values.email || undefined,
            elfParticipantId: values.elfParticipantId,
          };

      const result = await updateParticipant(participant.id, command);

      if (result.success) {
        notify.success("PARTICIPANT.UPDATE_SUCCESS");
        onSave();
        onClose();
      } else {
        notify.error({ title: result.error || "Nie udało się zaktualizować uczestnika" });
      }
    } catch (error) {
      console.error("Błąd podczas aktualizacji uczestnika:", error);
      notify.error("PARTICIPANT.UPDATE_ERROR_GENERAL");
    }
  };

  if (!participant) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj uczestnika</DialogTitle>
          <DialogDescription>
            {isDrawn
              ? "Po losowaniu można zmienić tylko adres email uczestnika."
              : "Zmień dane uczestnika grupy Secret Santa."}
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
                    <Input placeholder="np. Jan Kowalski" {...field} disabled={isDrawn} />
                  </FormControl>
                  {isDrawn && <p className="text-xs text-muted-foreground">Imienia nie można zmienić po losowaniu</p>}
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
                    <Input type="email" placeholder="jan.kowalski@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Elf assignment field - only shown when not drawn */}
            {!isDrawn && (
              <FormField
                control={form.control}
                name="elfParticipantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Elf-pomocnik (opcjonalnie)
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Wybrany uczestnik będzie elfem-pomocnikiem dla tej osoby i będzie mógł zobaczyć jej wynik
                              losowania oraz pomóc w wyborze prezentu.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))}
                      value={field.value?.toString() || "none"}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Brak (nikt nie pomaga)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Brak (nikt nie pomaga)</SelectItem>
                        {availableAsElf.map((p) => (
                          <SelectItem key={p.id} value={p.id.toString()}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
