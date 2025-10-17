import { Shield, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorWrapper } from "./ErrorWrapper";

export function ForbiddenError() {
  return (
    <ErrorWrapper>
      <div className="mb-6">
        <Shield className="w-16 h-16 text-red-500 mx-auto" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Brak dostępu</h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Nie jesteś uczestnikiem tej grupy i nie możesz zobaczyć wyniku losowania.
      </p>
      <Button onClick={() => (window.location.href = "/dashboard")}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Powrót do pulpitu
      </Button>
    </ErrorWrapper>
  );
}
