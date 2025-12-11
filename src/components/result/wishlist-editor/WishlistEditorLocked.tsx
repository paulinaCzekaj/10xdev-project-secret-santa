import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock } from "lucide-react";
import { useWishlistEditorContext } from "./WishlistEditorProvider";
import { WishlistEditorStats } from "./WishlistEditorStats";

interface WishlistEditorLockedProps {
  endDate: string;
  stats?: {
    total_participants: number;
    participants_with_wishlist: number;
  };
}

/**
 * Komponent wyświetlany gdy edycja listy życzeń jest zablokowana
 */
export function WishlistEditorLocked({ endDate, stats }: WishlistEditorLockedProps) {
  const { content } = useWishlistEditorContext();

  const formatEndDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-300 dark:border-gray-600 p-6 relative overflow-hidden">
        {/* Świąteczne dekoracje w tle - przygaszone */}
        <div className="absolute top-0 left-0 text-5xl opacity-5 pointer-events-none">⭐</div>
        <div className="absolute bottom-0 right-0 text-5xl opacity-5 pointer-events-none">🎅</div>

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-gray-400 rounded-lg">
              <Lock className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">🔒 Lista życzeń</h3>
          </div>

          {/* Komunikat o blokadzie */}
          <Alert variant="destructive" className="mb-4">
            <Lock className="h-4 w-4" />
            <AlertDescription>
              Edycja listy życzeń została zablokowana. Termin na dodawanie życzeń upłynął
              <strong> {formatEndDate(endDate)}</strong>.
            </AlertDescription>
          </Alert>

          {/* Zablokowane pole tekstowe */}
          <Textarea
            value={content}
            disabled
            className="min-h-[150px] opacity-60 cursor-not-allowed border-2 border-gray-300 dark:border-gray-600"
            placeholder="Edycja została zablokowana..."
          />

          {/* Informacja */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
              ℹ️ Twoja lista życzeń została zapisana i jest widoczna dla Twojego Secret Santa
            </p>
          </div>

          {/* Statystyki */}
          <WishlistEditorStats stats={stats} />
        </div>
      </div>
    </div>
  );
}
