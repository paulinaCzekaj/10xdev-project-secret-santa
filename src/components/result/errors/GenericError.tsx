import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorWrapper } from "./ErrorWrapper";

interface GenericErrorProps {
  message?: string;
  onRetry: () => void;
}

export function GenericError({ message, onRetry }: GenericErrorProps) {
  return (
    <ErrorWrapper>
      <div className="mb-6">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Coś poszło nie tak</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {message || "Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę."}
      </p>
      <div className="flex gap-3 justify-center">
        <Button onClick={onRetry} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Spróbuj ponownie
        </Button>
        <Button onClick={() => window.location.reload()}>Odśwież stronę</Button>
      </div>
    </ErrorWrapper>
  );
}
