import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InfoBox } from "@/components/ui/info-box";

interface ForgotPasswordSuccessProps {
  email: string;
}

/**
 * Success state component for ForgotPasswordForm
 *
 * Displays a success message after password reset email has been sent,
 * shows the email address, provides helpful information about the reset link,
 * and allows navigation back to login page.
 *
 * @param email - The email address where the reset link was sent
 */
export const ForgotPasswordSuccess = ({ email }: ForgotPasswordSuccessProps) => {
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
          Wysłaliśmy link do resetowania hasła na adres <strong>{email}</strong>.
        </p>

        {/* Info Box */}
        <InfoBox
          variant="warning"
          title="Nie otrzymałeś emaila?"
          description="Sprawdź folder spam. Link wygasa po 1 godzinie. Jeśli nie otrzymasz wiadomości, spróbuj ponownie."
          className="mb-6 text-left"
        />

        {/* Back to Login */}
        <Button
          onClick={() => (window.location.href = "/login")}
          className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
        >
          Wróć do logowania
        </Button>
      </div>
    </div>
  );
};
