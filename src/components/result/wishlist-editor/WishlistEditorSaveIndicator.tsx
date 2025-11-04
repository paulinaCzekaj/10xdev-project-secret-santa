import { Loader2, Check } from "lucide-react";
import { useWishlistEditorContext } from "./WishlistEditorProvider";

/**
 * Komponent wyświetlający status zapisywania
 */
export function WishlistEditorSaveIndicator() {
  const { isSaving, lastSaved, hasChanges } = useWishlistEditorContext();

  return (
    <div className="flex items-center justify-center mt-3">
      <div className="flex items-center gap-2">
        {isSaving && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-green-600" />
            <span className="text-green-600 dark:text-green-400">Zapisywanie...</span>
          </>
        )}

        {!isSaving && lastSaved && !hasChanges && (
          <>
            <Check className="h-4 w-4 text-green-500" />
            <span className="text-green-600 dark:text-green-400">
              Zapisano{" "}
              {lastSaved.toLocaleTimeString("pl-PL", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </>
        )}

        {!isSaving && hasChanges && <span className="text-orange-600 dark:text-orange-400">Niezapisane zmiany</span>}
      </div>
    </div>
  );
}
