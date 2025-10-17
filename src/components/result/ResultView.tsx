import { useState, useEffect } from "react";
import { useResultData } from "@/hooks/useResultData";
import ResultHeader from "./ResultHeader";
import ResultReveal from "./ResultReveal";
import WishlistSection from "./WishlistSection";
import {
  DrawNotCompletedError,
  UnauthorizedError,
  ForbiddenError,
  InvalidTokenError,
  GroupNotFoundError,
  NetworkError,
  GenericError,
} from "./errors";

interface ResultViewProps {
  groupId?: number;
  token?: string;
  isAuthenticated?: boolean;
}

/**
 * Główny kontener widoku wyniku Secret Santa
 * Koordynuje wszystkie komponenty i zarządza stanem aplikacji
 */
export default function ResultView({ groupId, token, isAuthenticated = false }: ResultViewProps) {
  const { result, isLoading, error, refetch } = useResultData(groupId, token, isAuthenticated);
  const [isRevealed, setIsRevealed] = useState(false);

  // Update isRevealed when result loads
  useEffect(() => {
    setIsRevealed(!!result?.resultViewedAt);
  }, [result?.resultViewedAt]);

  // Komponent ładowania
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ładowanie wyników...</h3>
          <p className="text-gray-600 dark:text-gray-400">Sprawdzamy wyniki losowania</p>
        </div>
      </div>
    );
  }

  // Obsługa błędów - mapowanie kodu błędu na odpowiedni komponent
  if (error) {
    switch (error.code) {
      case "DRAW_NOT_COMPLETED":
        return <DrawNotCompletedError />;
      case "UNAUTHORIZED":
        return <UnauthorizedError isAuthenticated={isAuthenticated} />;
      case "FORBIDDEN":
        return <ForbiddenError />;
      case "INVALID_TOKEN":
        return <InvalidTokenError />;
      case "GROUP_NOT_FOUND":
        return <GroupNotFoundError />;
      case "NETWORK_ERROR":
        return <NetworkError onRetry={refetch} />;
      default:
        return <GenericError message={error.message} onRetry={refetch} />;
    }
  }

  // Brak danych - nie powinno się zdarzyć, ale obsługujemy
  if (!result) {
    return <GenericError message="Nie udało się załadować danych wyniku. Spróbuj ponownie." onRetry={refetch} />;
  }

  // Główny widok sukcesu
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-green-50 to-blue-100 dark:from-red-950 dark:via-green-950 dark:to-blue-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Nagłówek */}
        <ResultHeader
          group={{
            id: result.group.id,
            name: result.group.name,
            formattedBudget: result.formattedBudget,
            formattedEndDate: result.formattedEndDate,
            isExpired: result.isExpired,
            daysUntilEnd: result.daysUntilEnd,
          }}
          isAuthenticated={result.isAuthenticated}
        />

        {/* Sekcja odkrywania wyniku */}
        <ResultReveal
          assignedPerson={{
            id: result.assigned_to.id,
            name: result.assigned_to.name,
            initials: result.assignedPersonInitials,
          }}
          participantId={result.participant.id}
          groupId={result.group.id}
          resultViewedAt={result.participant.result_viewed_at}
          isRevealed={isRevealed}
          onReveal={() => setIsRevealed(true)}
          accessToken={result.accessToken}
        />

        {/* Sekcja list życzeń - widoczna tylko po odkryciu prezentu */}
        {isRevealed && (
          <WishlistSection
            myWishlist={result.my_wishlist}
            theirWishlist={{
              content: result.assigned_to.wishlist,
              contentHtml: result.assignedPersonWishlistHtml,
            }}
            assignedPersonName={result.assigned_to.name}
            participantId={result.participant.id}
            groupEndDate={result.group.end_date}
            accessToken={result.accessToken}
          />
        )}
      </div>
    </div>
  );
}
