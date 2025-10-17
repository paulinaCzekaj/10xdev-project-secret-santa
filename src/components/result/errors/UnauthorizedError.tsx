import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorWrapper } from "./ErrorWrapper";

interface UnauthorizedErrorProps {
  isAuthenticated?: boolean;
}

export function UnauthorizedError({ isAuthenticated = false }: UnauthorizedErrorProps) {
  return (
    <ErrorWrapper>
      <div className="mb-6">
        <Shield className="w-16 h-16 text-red-500 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Brak autoryzacji</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {isAuthenticated
          ? "Nie masz uprawnień do zobaczenia tego wyniku. Zaloguj się ponownie."
          : "Twój link dostępu może być nieprawidłowy lub wygasły."}
      </p>
      <Button onClick={() => (window.location.href = isAuthenticated ? "/login" : "/")}>
        {isAuthenticated ? "Zaloguj się" : "Strona główna"}
      </Button>
    </ErrorWrapper>
  );
}
