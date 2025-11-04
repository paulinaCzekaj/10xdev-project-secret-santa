import * as React from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { notify } from "@/lib/notifications";

import { Button } from "@/components/ui/button";
import { InfoBox } from "@/components/ui/info-box";
import { createGroupFormSchema, type CreateGroupFormViewModel } from "@/schemas/group.schemas";
import { useCreateGroup } from "@/hooks/useCreateGroup";
import { TextFormField, NumberFormField, DateFormField } from "@/components/forms/fields/FormFields";
import { getMinimumFutureDate } from "@/lib/validators/dateValidators";

export default function CreateGroupForm() {
  const { createGroup, isLoading, error: apiError } = useCreateGroup();

  const form = useForm<CreateGroupFormViewModel>({
    resolver: zodResolver(createGroupFormSchema),
    mode: "onBlur", // Enable validation on blur for better SSR compatibility
    defaultValues: {
      name: "",
      budget: undefined,
      end_date: undefined,
    },
  });

  // Check if form is valid for enabling submit button
  const isFormValid = form.formState.isValid && !isLoading;

  const onSubmit = async (data: CreateGroupFormViewModel) => {
    try {
      const result = await createGroup(data);

      // Show success notification
      notify.success({
        title: "Loteria została utworzona pomyślnie!",
        description: `Loteria "${result.name}" jest gotowa do użycia.`,
      });

      // Redirect to group management page
      // eslint-disable-next-line react-compiler/react-compiler
      window.location.href = `/groups/${result.id}`;
    } catch {
      // Error is already handled by the hook
      notify.error({
        title: "Nie udało się utworzyć loterii",
        description: apiError || "Wystąpił nieoczekiwany błąd",
      });
    }
  };

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg"
      data-testid="create-group-form-container"
    >
      <FormProvider {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="create-group-form">
          {/* Group Name Field */}
          <TextFormField
            name="name"
            label="Nazwa loterii"
            placeholder="np. Secret Santa 2025"
            disabled={isLoading}
            maxLength={50}
            testId="create-group-name-input"
          />

          {/* Budget and Date in a row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Budget Field */}
            <NumberFormField
              name="budget"
              label="Limit budżetu"
              placeholder="100"
              suffix="PLN"
              min={1}
              step={1}
              disabled={isLoading}
              testId="create-group-budget-input"
            />

            {/* End Date Field */}
            <DateFormField
              name="end_date"
              label="Data wydarzenia"
              placeholder="Wybierz datę"
              minDate={getMinimumFutureDate(1)}
              disabled={isLoading}
              testId="create-group-date-picker"
            />
          </div>

          {/* Info Box */}
          <InfoBox
            variant="info"
            title="Zarządzaj uczestnikami później"
            description="Po utworzeniu loterii będziesz mógł dodać uczestników i ustawić reguły wykluczeń z tablicy zarządzania."
          />

          {/* API Error Message */}
          {apiError && <InfoBox variant="error" title="Błąd" description={apiError} />}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 font-semibold"
            disabled={!isFormValid}
            data-testid="create-group-submit-button"
          >
            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isLoading ? "Tworzenie..." : "Utwórz loterię"}
          </Button>
        </form>
      </FormProvider>
    </div>
  );
}
