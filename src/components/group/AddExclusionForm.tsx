import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Ban, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useExclusions } from "@/hooks/useExclusions";
import type {
  AddExclusionFormViewModel,
  ExclusionRuleDTO,
  ParticipantViewModel,
  ExclusionViewModel,
  CreateExclusionRuleCommand,
} from "@/types";

// Schema walidacji dla formularza dodawania wykluczenia
const addExclusionFormSchema = z
  .object({
    blocker_participant_id: z
      .number({
        required_error: "Wybierz osobę",
        invalid_type_error: "Wybierz osobę",
      })
      .positive("Wybierz osobę"),
    blocked_participant_id: z
      .number({
        required_error: "Wybierz osobę",
        invalid_type_error: "Wybierz osobę",
      })
      .positive("Wybierz osobę"),
  })
  .refine((data) => data.blocker_participant_id !== data.blocked_participant_id, {
    message: "Osoba nie może wykluczyć samej siebie",
    path: ["blocked_participant_id"],
  });

interface AddExclusionFormProps {
  groupId: number;
  participants: ParticipantViewModel[];
  existingExclusions: ExclusionViewModel[];
  onSuccess: (exclusion: ExclusionRuleDTO) => void;
}

export function AddExclusionForm({ groupId, participants, existingExclusions, onSuccess }: AddExclusionFormProps) {
  const { addExclusion } = useExclusions(groupId);

  const form = useForm<AddExclusionFormViewModel>({
    resolver: zodResolver(addExclusionFormSchema),
    defaultValues: {
      blocker_participant_id: 0,
      blocked_participant_id: 0,
    },
  });

  // Sprawdzamy czy wykluczenie już istnieje
  const isExclusionDuplicate = (blockerId: number, blockedId: number): boolean => {
    return existingExclusions.some(
      (exclusion) => exclusion.blocker_participant_id === blockerId && exclusion.blocked_participant_id === blockedId
    );
  };

  const onSubmit = async (values: AddExclusionFormViewModel) => {
    // Sprawdzamy duplikaty przed wysłaniem
    if (isExclusionDuplicate(values.blocker_participant_id, values.blocked_participant_id)) {
      toast.error("Ta reguła wykluczenia już istnieje");
      return;
    }

    try {
      const command: CreateExclusionRuleCommand = {
        blocker_participant_id: values.blocker_participant_id,
        blocked_participant_id: values.blocked_participant_id,
      };

      const result = await addExclusion(command);

      if (result.success && result.data) {
        form.reset();
        onSuccess(result.data);
        toast.success("Wykluczenie zostało dodane");
      } else {
        toast.error(result.error || "Nie udało się dodać wykluczenia. Spróbuj ponownie.");
      }
    } catch {
      toast.error("Nie udało się dodać wykluczenia. Spróbuj ponownie.");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <FormField
                control={form.control}
                name="blocker_participant_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Kto nie może wylosować</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="min-w-[200px]">
                          <SelectValue placeholder="Wybierz osobę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {participants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.id.toString()}>
                            {participant.name}
                            {participant.email && ` (${participant.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-center py-2">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <FormField
                control={form.control}
                name="blocked_participant_id"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Kogo</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="min-w-[200px]">
                          <SelectValue placeholder="Wybierz osobę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {participants.map((participant) => (
                          <SelectItem key={participant.id} value={participant.id.toString()}>
                            {participant.name}
                            {participant.email && ` (${participant.email})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end">
                <Button type="submit" disabled={form.formState.isSubmitting} className="flex items-center gap-2">
                  <Ban className="h-4 w-4" />
                  {form.formState.isSubmitting ? "Dodawanie..." : "Dodaj wykluczenie"}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Wykluczenia są jednokierunkowe. <span className="text-red-600 font-medium">Osoba A</span>{" "}
              <span className="text-muted-foreground">nie może wylosować</span>{" "}
              <span className="text-green-600 font-medium">osoby B</span>, ale{" "}
              <span className="text-green-600 font-medium">osoba B</span>{" "}
              <span className="text-muted-foreground">może wylosować</span>{" "}
              <span className="text-red-600 font-medium">osobę A</span> (chyba że zostanie dodane odwrotne wykluczenie).
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
