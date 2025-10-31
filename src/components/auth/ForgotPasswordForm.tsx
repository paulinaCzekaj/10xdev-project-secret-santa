import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Mail } from "lucide-react";
import { notify } from "@/lib/notifications";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface ForgotPasswordFormProps {
  isLoggedIn?: boolean;
}

// Zod schema for forgot password form validation
const forgotPasswordFormSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordFormSchema>;

export default function ForgotPasswordForm({ isLoggedIn }: ForgotPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [emailSent, setEmailSent] = React.useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordFormSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
    },
  });

  const isFormValid = form.formState.isValid && !isSubmitting;

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle API error
        const errorMessage = result.error?.message || "Wystąpił błąd podczas wysyłania emaila";
        setApiError(errorMessage);
        notify.error("AUTH.PASSWORD_RESET_ERROR");
        return;
      }

      // Success
      setEmailSent(true);
      notify.success("AUTH.PASSWORD_RESET_EMAIL_SENT");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas wysyłania emaila";
      setApiError(errorMessage);
      notify.error("AUTH.PASSWORD_RESET_ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (emailSent) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-green-600" />
          </div>

          {/* Success Message */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sprawdź swoją skrzynkę!</h2>
          <p className="text-sm text-gray-600 mb-6">
            Wysłaliśmy link do resetowania hasła na adres <strong>{form.getValues("email")}</strong>.
          </p>

          {/* Info Box */}
          <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-6 text-left">
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
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Nie otrzymałeś emaila?</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Sprawdź folder spam. Link wygasa po 1 godzinie. Jeśli nie otrzymasz wiadomości, spróbuj ponownie.
                </p>
              </div>
            </div>
          </div>

          {/* Back to Login */}
          <Button onClick={() => (window.location.href = "/login")} className="w-full h-12 font-semibold">
            Wróć do logowania
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Zapomniałeś hasła?</h2>
        <p className="text-sm text-gray-600">
          Nie martw się! Podaj swój adres email, a wyślemy Ci link do resetowania hasła.
        </p>
      </div>

      {/* Info for logged in users */}
      {isLoggedIn && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="w-5 h-5 text-blue-500"
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
              <p className="text-sm text-blue-700 leading-relaxed">
                Jesteś już zalogowany. Możesz zmienić hasło w ustawieniach konta.
              </p>
            </div>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Email Field */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-medium">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="twoj@email.com"
                    {...field}
                    disabled={isSubmitting}
                    autoComplete="email"
                    className="h-11 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* API Error Message */}
          {apiError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-4">
              <p className="text-red-700 text-sm leading-relaxed">{apiError}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" className="w-full h-12 font-semibold" disabled={!isFormValid}>
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSubmitting ? "Wysyłanie..." : "Wyślij link resetujący"}
          </Button>

          {/* Back to Login Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Pamiętasz hasło?{" "}
              <a href="/login" className="text-red-500 hover:text-red-600 font-semibold cursor-pointer">
                Zaloguj się
              </a>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}
