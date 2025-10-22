import { Search, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorWrapper } from "./ErrorWrapper";

export function InvalidTokenError() {
  return (
    <ErrorWrapper>
      <div className="mb-6">
        <Search className="w-16 h-16 text-gray-400 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Link wygasł lub jest nieprawidłowy</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Ten link dostępu jest nieprawidłowy lub wygasł. Skontaktuj się z organizatorem grupy, aby otrzymać nowy link.
      </p>
      <Button onClick={() => (window.location.href = "/")}>
        <Home className="mr-2 h-4 w-4" />
        Strona główna
      </Button>
    </ErrorWrapper>
  );
}
