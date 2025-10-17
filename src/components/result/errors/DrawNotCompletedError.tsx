import { AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorWrapper } from "./ErrorWrapper";

export function DrawNotCompletedError() {
  return (
    <ErrorWrapper>
      <div className="mb-6">
        <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Losowanie nie zostało przeprowadzone
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Losowanie dla tej grupy nie zostało jeszcze przeprowadzone. Skontaktuj się z organizatorem grupy.
      </p>
      <Button onClick={() => (window.location.href = "/dashboard")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do pulpitu
      </Button>
    </ErrorWrapper>
  );
}
