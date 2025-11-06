import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Ban, ArrowRight, ArrowLeftRight } from "lucide-react";
import { useAddExclusion } from "@/hooks/useAddExclusion";
import { addExclusionSchema, type AddExclusionFormData } from "@/schemas/exclusion.schemas";
import type { ExclusionRuleDTO, ParticipantViewModel, ExclusionViewModel } from "@/types";

interface AddExclusionFormProps {
  groupId: number;
  participants: ParticipantViewModel[];
  existingExclusions: ExclusionViewModel[];
  onSuccess: (exclusion: ExclusionRuleDTO) => void;
}

export function AddExclusionForm({ groupId, participants, existingExclusions, onSuccess }: AddExclusionFormProps) {
  const { submitExclusion, isSubmitting } = useAddExclusion(groupId);

  const form = useForm<AddExclusionFormData>({
    resolver: zodResolver(addExclusionSchema),
    mode: "onSubmit", // Walidacja tylko przy submit, nie na onChange
    defaultValues: {
      blocker_participant_id: undefined, // Will be validated as invalid initially
      blocked_participant_id: undefined, // Will be validated as invalid initially
      bidirectional: false,
    },
  });

  const onSubmit = async (values: AddExclusionFormData) => {
    // Type guard - zod schema ensures these values are defined
    if (!values.blocker_participant_id || !values.blocked_participant_id) {
      return;
    }

    const result = await submitExclusion(values, existingExclusions);

    if (result.success && result.data) {
      form.reset();
      onSuccess(result.data);
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
                disabled={isSubmitting}
                className="flex items-center gap-2 w-full sm:w-auto shrink-0"
              >
                <Ban className="h-4 w-4" />
                {isSubmitting ? "Dodawanie..." : "Dodaj wykluczenie"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
