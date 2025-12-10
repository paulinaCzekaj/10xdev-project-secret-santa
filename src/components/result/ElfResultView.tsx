import React from "react";
import { useElfResult } from "@/hooks/useElfResult";
import ElfAssignedPersonCard from "./ElfAssignedPersonCard";
import ElfRoleBanner from "./ElfRoleBanner";
import GroupInfoCard from "./GroupInfoCard";
import {
  DrawNotCompletedError,
  UnauthorizedError,
  ForbiddenError,
  InvalidTokenError,
  GroupNotFoundError,
  NetworkError,
  GenericError,
} from "./errors";

interface ElfResultViewProps {
  groupId?: number;
  token?: string;
  isAuthenticated?: boolean;
}

/**
 * View for elves to see the result of the participant they are helping
 * Shows the person the helped participant drew and their wishlist
 * Supports both authenticated (groupId) and unauthenticated (token) access
 */
export default function ElfResultView({ groupId, token, isAuthenticated = false }: ElfResultViewProps) {
  const { data, isLoading, error } = useElfResult(groupId, token, isAuthenticated);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ładowanie wyników elfa...</h3>
          <p className="text-gray-600 dark:text-gray-400">Sprawdzam wyniki dla pomocnika</p>
        </div>
      </div>
    );
  }

  // Error handling
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
        return <NetworkError onRetry={() => window.location.reload()} />;
      default:
        return <GenericError message={error.message} onRetry={() => window.location.reload()} />;
    }
  }

  // No data - should not happen
  if (!data) {
    return (
      <GenericError
        message="Nie udało się załadować danych elfa. Spróbuj ponownie."
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-purple-950 dark:via-gray-900 dark:to-pink-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Elf role banner */}
        <ElfRoleBanner helpedParticipantName={data.helpedParticipant.name} variant="elf-result" />

        {/* Group info */}
        <GroupInfoCard groupName={data.group.name} budget={data.group.budget} endDate={data.group.endDate} />

        {/* Assigned person card */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {data.helpedParticipant.name} przygotowuje prezent dla:
          </h3>
          <ElfAssignedPersonCard
            name={data.assignment.receiverName}
            wishlistHtml={data.assignment.receiverWishlistHtml}
          />
        </div>

        {/* Back button */}
        <div className="flex justify-center">
          <a
            href={isAuthenticated ? `/groups/${groupId}/result` : `/results/${token}`}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 min-h-[44px] text-gray-700 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            ← Wróć do mojego wyniku
          </a>
        </div>
      </div>
    </div>
  );
}
