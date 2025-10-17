import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInputWithToggle } from "@/components/ui/password-input";
import { registerFormSchema, type RegisterFormData } from "@/schemas/auth.schemas";
import { usePasswordValidation } from "@/hooks/usePasswordValidation";
import { useRegister } from "@/hooks/useRegister";
import { PasswordRequirementItem } from "@/components/auth/PasswordRequirementItem";

export default function RegisterForm() {
  const { register, isSubmitting, error: apiError } = useRegister();
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

  const { requirements } = usePasswordValidation(form.watch("password") || "");
  const isFormValid = form.formState.isValid && !isSubmitting;

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await register(data);
    } catch (error) {
      // Error already handled in hook
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
                  <PasswordInputWithToggle
                    placeholder="Wprowadź hasło"
                    {...field}
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    className="h-11 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500"
                  />
                </FormControl>
                <FormMessage />
                {/* Password Requirements */}
                <div className="mt-2 text-xs text-gray-600">
                  <p className="font-medium mb-1">Hasło musi zawierać:</p>
                  <ul className="space-y-1">
                    {requirements.map((req, index) => (
                      <PasswordRequirementItem key={index} requirement={req} />
                    ))}
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
                  <PasswordInputWithToggle
                    placeholder="Potwierdź hasło"
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
              <a href="/login" className="text-red-600 hover:text-red-700 font-semibold cursor-pointer">
                Zaloguj się
              </a>
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}
