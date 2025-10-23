import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordInputWithToggle } from "@/components/ui/password-input";
import { resetPasswordFormSchema, type ResetPasswordFormData } from "@/schemas/auth.schemas";
import { useTokenVerification } from "@/hooks/useTokenVerification";
import { useResetPassword } from "@/hooks/useResetPassword";
import { PasswordRequirementsInfo } from "@/components/auth/PasswordRequirementsInfo";

interface ResetPasswordFormProps {
  accessToken?: string; // May be null - then retrieved client-side
}

export default function ResetPasswordForm({ accessToken }: ResetPasswordFormProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isValid: tokenValid, isLoading: tokenLoading, error: tokenError } = useTokenVerification(accessToken);
  const { resetPassword, isSubmitting, error: apiError } = useResetPassword();

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const isFormValid = form.formState.isValid && !isSubmitting;

  const onSubmit = async (data: ResetPasswordFormData) => {
    try {
      await resetPassword(data);
    } catch {
      // Error already handled in hook
    }
  };

  // Loading state while verifying token
  if (tokenLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Weryfikowanie linku...</h2>
          <p className="text-sm text-gray-600">Sprawdzamy ważność linku resetowania hasła.</p>
        </div>
      </div>
    );
  }

  // Token error state
  if (tokenError) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link nieprawidłowy</h2>
          <p className="text-sm text-gray-600 mb-6">{tokenError}</p>

          <Button onClick={() => (window.location.href = "/forgot-password")} className="w-full h-12 font-semibold">
            Wygeneruj nowy link
          </Button>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Ustaw nowe hasło</h2>
        <p className="text-sm text-gray-600">Wprowadź nowe hasło dla swojego konta Secret Santa.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-medium">Nowe hasło</FormLabel>
                <FormControl>
                  <PasswordInputWithToggle
                    placeholder="Minimum 8 znaków"
                    {...field}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    className="h-11 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Confirm Password Field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-medium">Potwierdź nowe hasło</FormLabel>
                <FormControl>
                  <PasswordInputWithToggle
                    placeholder="Wprowadź hasło ponownie"
                    {...field}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    className="h-11 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Requirements Info */}
          <PasswordRequirementsInfo />

          {/* API Error Message */}
          {apiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-red-700 text-sm leading-relaxed">{apiError}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full h-12 font-semibold" disabled={!isFormValid}>
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSubmitting ? "Ustawianie hasła..." : "Ustaw nowe hasło"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
