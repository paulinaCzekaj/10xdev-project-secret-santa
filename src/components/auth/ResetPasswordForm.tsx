import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabaseClient } from "@/db/supabase.client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface ResetPasswordFormProps {
  accessToken?: string; // May be null - then retrieved client-side
}

// Zod schema for reset password form validation
const resetPasswordFormSchema = z
  .object({
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Hasło musi zawierać małą literę, dużą literę i cyfrę"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

type ResetPasswordFormData = z.infer<typeof resetPasswordFormSchema>;

export default function ResetPasswordForm({ accessToken }: ResetPasswordFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [tokenValid, setTokenValid] = React.useState(false);
  const [tokenError, setTokenError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const form = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordFormSchema),
    mode: "onChange",
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const isFormValid = form.formState.isValid && !isSubmitting;

  // Helper function to extract token from URL hash
  const extractTokenFromHash = (): string | null => {
    const hash = window.location.hash;
    if (hash.startsWith("#access_token=")) {
      const params = new URLSearchParams(hash.substring(1));
      return params.get("access_token");
    }
    return null;
  };

  // Function to get auth error message
  const getAuthErrorMessage = (error: unknown): string => {
    const errorMessages: Record<string, string> = {
      "Token has expired or is invalid": "Token jest nieprawidłowy lub wygasł",
      "User not found": "Użytkownik nie istnieje",
      "Invalid password": "Hasło nie spełnia wymagań",
      "Password should be at least 6 characters": "Hasło musi mieć co najmniej 6 znaków",
    };

    const message = error instanceof Error ? error.message : String(error);
    return errorMessages[message] || "Wystąpił błąd podczas ustawiania nowego hasła. Spróbuj ponownie.";
  };

  React.useEffect(() => {
    const verifyToken = async () => {
      // Get token from props or from URL hash
      const token = accessToken || extractTokenFromHash();

      if (!token) {
        setTokenError("Brak tokenu resetowania hasła");
        return;
      }

      try {
        // Supabase automatically handles token verification through the URL
        // The token in the URL hash will be processed by Supabase Auth
        // We just need to check if we're in a valid session

        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession();

        if (error) {
          throw error;
        }

        // If we have a session, the token was valid
        if (session) {
          setTokenValid(true);
        } else {
          // Check URL hash for tokens (Supabase puts them there)
          const hash = window.location.hash;
          if (hash.includes("access_token")) {
            // Try to set session with tokens from URL
            const urlParams = new URLSearchParams(hash.substring(1));
            const accessToken = urlParams.get("access_token");
            const refreshToken = urlParams.get("refresh_token") || "";

            if (accessToken) {
              const { error: sessionError } = await supabaseClient.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                throw sessionError;
              }

              setTokenValid(true);
            } else {
              throw new Error("Token has expired or is invalid");
            }
          } else {
            throw new Error("Token has expired or is invalid");
          }
        }
      } catch (error) {
        const errorMessage = getAuthErrorMessage(error);
        setTokenError(errorMessage);
      }
    };

    verifyToken();
  }, [accessToken]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: data.password,
      });

      if (error) {
        throw error;
      }

      // Success
      toast.success("Hasło zmienione pomyślnie!");
      window.location.href = "/login?message=password_reset_success";
    } catch (error) {
      const errorMessage = getAuthErrorMessage(error);
      setApiError(errorMessage);
      toast.error("Błąd", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state while verifying token
  if (!tokenValid && !tokenError) {
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

          <Button
            onClick={() => (window.location.href = "/forgot-password")}
            className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
          >
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
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimum 8 znaków"
                      {...field}
                      disabled={isSubmitting}
                      autoComplete="new-password"
                      className="h-11 pr-10 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
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
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Wprowadź hasło ponownie"
                      {...field}
                      disabled={isSubmitting}
                      autoComplete="new-password"
                      className="h-11 pr-10 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password Requirements Info */}
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
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Wymagania hasła</h3>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Co najmniej 8 znaków</li>
                  <li>Jedna mała litera (a-z)</li>
                  <li>Jedna duża litera (A-Z)</li>
                  <li>Jedna cyfra (0-9)</li>
                </ul>
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
            {isSubmitting ? "Ustawianie hasła..." : "Ustaw nowe hasło"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
