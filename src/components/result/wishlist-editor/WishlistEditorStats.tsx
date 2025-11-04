interface WishlistEditorStatsProps {
  stats?: {
    total_participants: number;
    participants_with_wishlist: number;
  };
}

/**
 * Komponent wyświetlający statystyki listy życzeń i postęp grupy
 */
export function WishlistEditorStats({ stats }: WishlistEditorStatsProps) {
  const getStatsDisplay = () => {
    if (!stats) return null;

    const { participants_with_wishlist, total_participants } = stats;
    const allDone = participants_with_wishlist === total_participants;
    const noneYet = participants_with_wishlist === 0;

    if (allDone) {
      return (
        <p className="text-xs text-center text-green-600 dark:text-green-400 mt-1 font-medium">
          🎉 Wspaniale! Wszyscy uczestnicy dodali już swoje listy życzeń!
        </p>
      );
    }

    if (noneYet) {
      return (
        <p className="text-xs text-center text-amber-600 dark:text-amber-400 mt-1">
          ⭐ Bądź pierwszy! Żaden z {total_participants} uczestników nie dodał jeszcze listy życzeń
        </p>
      );
    }

    return (
      <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1">
        {participants_with_wishlist}/{total_participants} uczestników dodało już swoją listę życzeń
      </p>
    );
  };

  return (
    <>
      {/* Statystyki grupy */}
      {getStatsDisplay()}
    </>
  );
}
