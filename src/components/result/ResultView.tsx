import { useState, useEffect } from "react";
import { useResultData } from "@/hooks/useResultData";
import ResultHeader from "./ResultHeader";
import ResultReveal from "./ResultReveal";
import WishlistSection from "./WishlistSection";
import ElfInfoBox from "./ElfInfoBox";
import ElfHelpSection from "./ElfHelpSection";
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
 * Main container for the Secret Santa result view
 * Coordinates all components and manages the application state
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
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ładowanie wyników...</h3>
          <p className="text-gray-600 dark:text-gray-400">Sprawdzamy wyniki losowania</p>
        </div>
      </div>
    );
  }

  // Error handling - mapping error code to the corresponding component
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

  // No data - should not happen, but we handle it
  if (!result) {
    return <GenericError message="Nie udało się załadować danych wyniku. Spróbuj ponownie." onRetry={refetch} />;
  }

  // Main success view
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 dark:from-red-950 dark:via-gray-900 dark:to-green-950">
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

        {/* Reveal section */}
        <ResultReveal
          assignedPerson={{
            id: result.assigned_to.id,
            name: result.assigned_to.name,
            initials: result.assignedPersonInitials,
          }}
          participantName={result.participant.name}
          participantId={result.participant.id}
          groupId={result.group.id}
          isRevealed={isRevealed}
          onReveal={() => setIsRevealed(true)}
          accessToken={result.accessToken}
        />

        {/* Wishlist section - user's wishlist always visible, assigned person's wishlist visible if they have content or if revealed */}
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
          wishlistStats={result.wishlist_stats}
          isRevealed={isRevealed}
        />

        {/* Elf help section - shows if participant is an elf (at the bottom) */}
        {result.participant.isElfForSomeone && result.participant.elfForParticipantId && (
          <ElfHelpSection
            helpedParticipantName={result.participant.elfForParticipantName || "uczestnik"}
            helpedParticipantId={result.participant.elfForParticipantId}
            groupId={result.group.id}
            isAuthenticated={result.isAuthenticated}
            accessToken={result.accessToken}
          />
        )}

        {/* Elf info box - shows if participant has an elf (at the bottom) */}
        {result.elf && <ElfInfoBox elfName={result.elf.name} />}
      </div>
    </div>
  );
}
