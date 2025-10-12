import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { supabaseClient } from "@/db/supabase.client";

import type { CreateGroupCommand, GroupDTO } from "@/types";

// Zod schema for form validation (CreateGroupFormViewModel)
const createGroupFormSchema = z.object({
  name: z
    .string()
    .min(3, "Nazwa loterii musi mieć co najmniej 3 znaki")
    .max(50, "Nazwa loterii nie może przekraczać 50 znaków"),
  budget: z
    .number({
      required_error: "Budżet jest wymagany",
      invalid_type_error: "Budżet musi być liczbą",
    })
    .int("Budżet musi być liczbą całkowitą")
    .positive("Budżet musi być większy od 0"),
  end_date: z
    .date({
      required_error: "Data zakończenia jest wymagana",
    })
    .refine(
      (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
      },
      { message: "Data zakończenia musi być w przyszłości" }
    ),
});

type CreateGroupFormViewModel = z.infer<typeof createGroupFormSchema>;

export default function CreateGroupForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);

  const form = useForm<CreateGroupFormViewModel>({
    resolver: zodResolver(createGroupFormSchema),
    mode: "onChange", // Enable real-time validation
    defaultValues: {
      name: "",
      budget: undefined,
      end_date: undefined,
    },
  });

  // Check if form is valid for enabling submit button
  const isFormValid = form.formState.isValid && !isSubmitting;

  const onSubmit = async (data: CreateGroupFormViewModel) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      // Get session token for authorization
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      // Transform FormViewModel to CreateGroupCommand
      const command: CreateGroupCommand = {
        name: data.name,
        budget: data.budget,
        end_date: data.end_date.toISOString(),
      };

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization token if session exists
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const response = await fetch("/api/groups", {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Wystąpił błąd podczas tworzenia grupy");
      }

      const result: GroupDTO = await response.json();

      // Show success notification
      toast.success("Loteria została utworzona pomyślnie!", {
        description: `Loteria "${result.name}" jest gotowa do użycia.`,
      });

      // Redirect to group management page
      window.location.href = `/groups/${result.id}/manage`;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.";
      setApiError(errorMessage);
      toast.error("Nie udało się utworzyć loterii", {
        description: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Group Name Field */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-medium">Nazwa loterii</FormLabel>
                <FormControl>
                  <Input
                    placeholder="np. Secret Santa 2025"
                    {...field}
                    disabled={isSubmitting}
                    autoComplete="off"
                    maxLength={50}
                    className="h-11 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Budget and Date in a row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Budget Field */}
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 font-medium">Limit budżetu</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="100"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value === "" ? undefined : Number(value));
                        }}
                        value={field.value ?? ""}
                        disabled={isSubmitting}
                        className="h-11 pr-16 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                        min="1"
                        step="1"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
                        PLN
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* End Date Field */}
            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel className="text-gray-900 font-medium">Data losowania</FormLabel>
                  <FormControl>
                    <DatePicker
                      value={field.value}
                      onChange={field.onChange}
                      disabled={isSubmitting}
                      minDate={(() => {
                        const tomorrow = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        tomorrow.setHours(0, 0, 0, 0);
                        return tomorrow;
                      })()}
                      placeholder="Wybierz datę"
                      className="bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Info Box */}
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <svg
                  className="w-5 h-5 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  ></path>
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Zarządzaj uczestnikami później</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Po utworzeniu loterii będziesz mógł dodać uczestników i ustawić reguły wykluczeń z tablicy
                  zarządzania.
                </p>
              </div>
            </div>
          </div>

          {/* API Error Message */}
          {apiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-red-700 text-sm leading-relaxed">{apiError}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
            disabled={!isFormValid}
          >
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSubmitting ? "Tworzenie..." : "Utwórz loterię"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
