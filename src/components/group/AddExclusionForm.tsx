import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Ban, ArrowRight, ArrowLeftRight } from "lucide-react";
import { notify } from "@/lib/notifications";
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
      .positive("Wybierz osobę")
      .optional(),
    blocked_participant_id: z
      .number({
        required_error: "Wybierz osobę",
        invalid_type_error: "Wybierz osobę",
      })
      .positive("Wybierz osobę")
      .optional(),
    bidirectional: z.boolean(),
  })
  .refine(
    (data) => {
      // Only check if both values are provided
      if (data.blocker_participant_id && data.blocked_participant_id) {
        return data.blocker_participant_id !== data.blocked_participant_id;
      }
      return true; // Let required validation handle missing values
    },
    {
      message: "Osoba nie może wykluczyć samej siebie",
      path: ["blocked_participant_id"],
    }
  );

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
    mode: "onSubmit", // Walidacja tylko przy submit, nie na onChange
    defaultValues: {
      blocker_participant_id: 0, // Will be validated as invalid initially
      blocked_participant_id: 0, // Will be validated as invalid initially
      bidirectional: false,
    },
  });

  // Sprawdzamy czy wykluczenie już istnieje
  const isExclusionDuplicate = (blockerId: number, blockedId: number): boolean => {
    return existingExclusions.some(
      (exclusion) => exclusion.blocker_participant_id === blockerId && exclusion.blocked_participant_id === blockedId
    );
  };

  const onSubmit = async (values: AddExclusionFormViewModel) => {
    // Type guard - zod schema zapewnia, że te wartości są zdefiniowane
    if (!values.blocker_participant_id || !values.blocked_participant_id) {
      return;
    }

    // Sprawdzamy duplikaty przed wysłaniem
    if (isExclusionDuplicate(values.blocker_participant_id, values.blocked_participant_id)) {
      notify.error("EXCLUSION.ADD_DUPLICATE");
      return;
    }

    // Jeśli dwustronne, sprawdzamy też odwrotne wykluczenie
    if (values.bidirectional && isExclusionDuplicate(values.blocked_participant_id, values.blocker_participant_id)) {
      notify.error("EXCLUSION.ADD_REVERSE_EXISTS");
      return;
    }

    try {
      // Dodaj pierwsze wykluczenie
      const command: CreateExclusionRuleCommand = {
        blocker_participant_id: values.blocker_participant_id,
        blocked_participant_id: values.blocked_participant_id,
      };

      const result = await addExclusion(command);

      if (result.success && result.data) {
        // Jeśli dwustronne, dodaj też odwrotne wykluczenie
        if (values.bidirectional) {
          const reverseCommand: CreateExclusionRuleCommand = {
            blocker_participant_id: values.blocked_participant_id,
            blocked_participant_id: values.blocker_participant_id,
          };

          const reverseResult = await addExclusion(reverseCommand);

          if (!reverseResult.success) {
            notify.warning("EXCLUSION.ADD_PARTIAL_SUCCESS");
          }
        }

        form.reset();
        onSuccess(result.data);
        notify.success(values.bidirectional ? "EXCLUSION.ADD_BIDIRECTIONAL_SUCCESS" : "EXCLUSION.ADD_SUCCESS");
      } else {
        notify.error({ title: result.error || "Nie udało się dodać wykluczenia. Spróbuj ponownie." });
      }
    } catch {
      notify.error("EXCLUSION.ADD_ERROR_GENERAL");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-start gap-4">
              <FormField
                control={form.control}
                name="blocker_participant_id"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Kto nie może wylosować</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
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
                    <FormMessage className="min-h-[20px]" />
                  </FormItem>
                )}
              />

              <div className="hidden md:flex items-center justify-center pt-8">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </div>

              <FormField
                control={form.control}
                name="blocked_participant_id"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
                    <FormLabel>Kogo</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString() || ""}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
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
                    <FormMessage className="min-h-[20px]" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <FormField
                control={form.control}
                name="bidirectional"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className="flex items-center gap-2 cursor-pointer">
                        <ArrowLeftRight className="h-4 w-4" />
                        Dwustronna blokada
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Obie osoby nie będą mogły wylosować siebie nawzajem
                      </p>
                    </div>
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="flex items-center gap-2 w-full sm:w-auto shrink-0"
              >
                <Ban className="h-4 w-4" />
                {form.formState.isSubmitting ? "Dodawanie..." : "Dodaj wykluczenie"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
