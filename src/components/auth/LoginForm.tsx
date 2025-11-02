import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { notify } from "@/lib/notifications";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";

interface LoginFormProps {
  redirectTo?: string;
  message?: {
    type: "success" | "error" | "info";
    text: string;
  };
}

// Zod schema for login form validation
const loginFormSchema = z.object({
  email: z.string().min(1, "Email jest wymagany").email("Nieprawidłowy format email"),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

export default function LoginForm({ redirectTo, message }: LoginFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isFormValid = form.formState.isValid && !isSubmitting;

  // Display message from props if provided
  React.useEffect(() => {
    if (message) {
      if (message.type === "success") {
        notify.success({ title: message.text });
      } else if (message.type === "error") {
        notify.error({ title: message.text });
      } else {
        notify.info({ title: message.text });
      }
    }
  }, [message]);

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setApiError(null);

    try {
      const response = await fetch("/api/auth/login", {
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
        const errorMessage = result.error?.message || "Wystąpił błąd podczas logowania";
        setApiError(errorMessage);
        notify.error("AUTH.LOGIN_ERROR");
        return;
      }

      // Success - redirect to dashboard
      notify.success("AUTH.LOGIN_SUCCESS");
      window.location.href = redirectTo || "/dashboard";
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Wystąpił błąd podczas logowania";
      setApiError(errorMessage);
      notify.error("AUTH.LOGIN_ERROR");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg" data-testid="login-form-container">
      {/* Welcome Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Witaj ponownie!</h2>
        <p className="text-sm text-gray-600">Zaloguj się na swoje konto, aby kontynuować.</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" data-testid="login-form">
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
                    data-testid="login-email-input"
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
                      autoComplete="current-password"
                      className="h-11 pr-10 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                      data-testid="login-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                      data-testid="login-password-toggle"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Forgot Password Link */}
          <div className="flex justify-end">
            <a href="/forgot-password" className="text-sm text-red-500 hover:text-red-600 font-medium cursor-pointer">
              Zapomniałeś hasła?
            </a>
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
            className="w-full h-12 font-semibold"
            disabled={!isFormValid}
            data-testid="login-submit-button"
          >
            {isSubmitting && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            {isSubmitting ? "Logowanie..." : "Zaloguj się"}
          </Button>

          {/* Sign Up Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Nie masz konta?{" "}
              <a href="/register" className="text-red-500 hover:text-red-600 font-semibold cursor-pointer">
                Zarejestruj się
              </a>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}
