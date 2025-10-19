import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorWrapper } from "./ErrorWrapper";

interface NetworkErrorProps {
  onRetry: () => void;
}

export function NetworkError({ onRetry }: NetworkErrorProps) {
  return (
    <ErrorWrapper>
      <div className="mb-6">
        <WifiOff className="w-16 h-16 text-gray-400 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Problem z połączeniem</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Nie można połączyć się z serwerem. Sprawdź swoje połączenie internetowe i spróbuj ponownie.
      </p>
      <Button onClick={onRetry}>
        <RefreshCw className="mr-2 h-4 w-4" />
        Spróbuj ponownie
      </Button>
    </ErrorWrapper>
  );
}
