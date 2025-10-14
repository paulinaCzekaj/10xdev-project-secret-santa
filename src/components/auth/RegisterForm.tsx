import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Zod schema for register form validation
const registerFormSchema = z
  .object({
    email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
    password: z
      .string()
      .min(8, "Hasło musi mieć co najmniej 8 znaków")
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Hasło musi zawierać małą literę, dużą literę i cyfrę"),
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: "Musisz zaakceptować regulamin",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerFormSchema>;

export default function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerFormSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const isFormValid = form.formState.isValid && !isSubmitting;

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle API error
        const errorMessage = result.error?.message || "Wystąpił błąd podczas rejestracji";
        setApiError(errorMessage);
        toast.error("Błąd rejestracji", { description: errorMessage });
        return;
      }

      // Success - auto-login enabled (no email confirmation for MVP)
      toast.success("Konto utworzone pomyślnie!");
      window.location.href = "/dashboard";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas rejestracji";
      setApiError(errorMessage);
      toast.error("Błąd rejestracji", { description: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg">
      {/* Welcome Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dołącz do Secret Santa!</h2>
        <p className="text-sm text-gray-600">Utwórz konto i zacznij organizować wymiany prezentów.</p>
      </div>

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

          {/* Password Field */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-medium">Hasło</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Wprowadź hasło"
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
                {/* Password Requirements */}
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-medium mb-1">Hasło musi zawierać:</p>
                  <ul className="space-y-1">
                    <li
                      className={`flex items-center gap-2 ${
                        form.watch("password")?.length >= 8 ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          form.watch("password")?.length >= 8 ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {form.watch("password")?.length >= 8 ? "✓" : "○"}
                      </span>
                      Co najmniej 8 znaków
                    </li>
                    <li
                      className={`flex items-center gap-2 ${
                        /(?=.*[a-z])/.test(form.watch("password") || "") ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          /(?=.*[a-z])/.test(form.watch("password") || "") ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {/(?=.*[a-z])/.test(form.watch("password") || "") ? "✓" : "○"}
                      </span>
                      Jedną małą literę (a-z)
                    </li>
                    <li
                      className={`flex items-center gap-2 ${
                        /(?=.*[A-Z])/.test(form.watch("password") || "") ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          /(?=.*[A-Z])/.test(form.watch("password") || "") ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {/(?=.*[A-Z])/.test(form.watch("password") || "") ? "✓" : "○"}
                      </span>
                      Jedną dużą literę (A-Z)
                    </li>
                    <li
                      className={`flex items-center gap-2 ${
                        /(?=.*\d)/.test(form.watch("password") || "") ? "text-green-600" : "text-gray-500"
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          /(?=.*\d)/.test(form.watch("password") || "") ? "text-green-600" : "text-gray-400"
                        }`}
                      >
                        {/(?=.*\d)/.test(form.watch("password") || "") ? "✓" : "○"}
                      </span>
                      Jedną cyfrę (0-9)
                    </li>
                  </ul>
                </div>
              </FormItem>
            )}
          />

          {/* Confirm Password Field */}
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-900 font-medium">Potwierdź hasło</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Potwierdź hasło"
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

          {/* Terms Acceptance */}
          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} disabled={isSubmitting} />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel className="text-sm text-gray-700 font-normal">
                    Akceptuję{" "}
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-700 underline bg-transparent border-none p-0 font-normal"
                      onClick={() => toast.info("Regulamin będzie dostępny wkrótce")}
                    >
                      regulamin
                    </button>{" "}
                    i{" "}
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-700 underline bg-transparent border-none p-0 font-normal"
                      onClick={() => toast.info("Polityka prywatności będzie dostępna wkrótce")}
                    >
                      politykę prywatności
                    </button>
                  </FormLabel>
                  <FormMessage />
                </div>
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
          <Button
            type="submit"
            className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
            disabled={!isFormValid}
          >
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSubmitting ? "Tworzenie konta..." : "Zarejestruj się"}
          </Button>

          {/* Sign In Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Masz już konto?{" "}
              <a href="/login" className="text-red-600 hover:text-red-700 font-semibold">
                Zaloguj się
              </a>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}
