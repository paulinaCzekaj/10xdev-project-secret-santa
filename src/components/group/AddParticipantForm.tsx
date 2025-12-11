import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Mail, User, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { notify } from "@/lib/notifications";
import { useParticipants } from "@/hooks/useParticipants";
import { FormFields, FormFooter } from "@/components/ui/responsive-form";
import type {
  AddParticipantFormViewModel,
  ParticipantWithTokenDTO,
  CreateParticipantCommand,
  ParticipantViewModel,
} from "@/types";

// Schema walidacji dla formularza dodawania uczestnika
const addParticipantFormSchema = z.object({
  name: z.string().min(2, "Imię musi mieć co najmniej 2 znaki").max(50, "Imię nie może przekraczać 50 znaków"),
  email: z.string().email("Niepoprawny format adresu email").optional().or(z.literal("")),
  elfParticipantId: z.number().optional().nullable(),
});

interface AddParticipantFormProps {
  groupId: number;
  participants: ParticipantViewModel[];
  isDrawn: boolean;
  onSuccess: (participant: ParticipantWithTokenDTO) => void;
}

export function AddParticipantForm({ groupId, participants, isDrawn, onSuccess }: AddParticipantFormProps) {
  const { addParticipant } = useParticipants(groupId);

  // All participants can be chosen as elves for the new participant
  // One elf can help multiple people, so existing elves can be selected again
  const availableAsElf = participants || [];

  const form = useForm<AddParticipantFormViewModel>({
    resolver: zodResolver(addParticipantFormSchema),
    defaultValues: {
      name: "",
      email: "",
      elfParticipantId: null,
    },
  });

  const onSubmit = async (values: AddParticipantFormViewModel) => {
    try {
      const command: CreateParticipantCommand = {
        name: values.name,
        email: values.email || undefined,
        elfParticipantId: values.elfParticipantId,
      };

      const result = await addParticipant(command);

      if (result.success && result.data) {
        const participant = result.data;

        // Kopiuj link do schowka jeśli uczestnik jest niezarejestrowany
        if (participant.access_token) {
          const link = `${window.location.origin}/results/${participant.access_token}`;
          try {
            await navigator.clipboard.writeText(link);
            notify.success("PARTICIPANT.ADD_SUCCESS_WITH_LINK");
          } catch (error) {
            notify.success("PARTICIPANT.ADD_SUCCESS_LINK_COPY_FAILED");
            console.error("Failed to copy to clipboard:", error);
          }
        } else {
          notify.success("PARTICIPANT.ADD_SUCCESS");
        }

        form.reset();
        onSuccess(participant);
      } else {
        notify.error({ title: result.error || "Nie udało się dodać uczestnika. Spróbuj ponownie." });
      }
    } catch {
      notify.error("PARTICIPANT.ADD_ERROR");
    }
  };

  return (
    <Card data-testid="add-participant-form-card">
      <CardContent className="pt-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-testid="add-participant-form">
          <FormFields columns={2}>
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Imię i nazwisko
              </Label>
              <Input
                id="name"
                placeholder="np. Jan Kowalski"
                {...form.register("name")}
                className={form.formState.errors.name ? "border-destructive" : ""}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email (opcjonalny)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jan.kowalski@example.com"
                {...form.register("email")}
                className={form.formState.errors.email ? "border-destructive" : ""}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </FormFields>

          {/* Elf assignment section */}
          <div className="space-y-2 md:w-1/2">
            <Label htmlFor="elfParticipantId" className="flex items-center gap-2">
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
            </Label>
            <Select
              value={form.watch("elfParticipantId")?.toString() || "none"}
              onValueChange={(value) => form.setValue("elfParticipantId", value === "none" ? null : parseInt(value))}
              disabled={isDrawn}
            >
              <SelectTrigger className={form.formState.errors.elfParticipantId ? "border-destructive" : "w-full"}>
                <SelectValue placeholder="Brak (nikt nie pomaga)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Brak (nikt nie pomaga)</SelectItem>
                {availableAsElf.map((participant) => (
                  <SelectItem key={participant.id} value={participant.id.toString()}>
                    {participant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isDrawn && <p className="text-xs text-muted-foreground">Nie można przypisywać elfów po losowaniu</p>}
            {form.formState.errors.elfParticipantId && (
              <p className="text-sm text-destructive">{form.formState.errors.elfParticipantId.message}</p>
            )}
          </div>

          <FormFooter description="Email jest opcjonalny. Uczestnicy bez konta otrzymają link dostępu.">
            <Button type="submit" disabled={form.formState.isSubmitting} className="flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              {form.formState.isSubmitting ? "Dodawanie..." : "Dodaj uczestnika"}
            </Button>
          </FormFooter>
        </form>
      </CardContent>
    </Card>
  );
}
