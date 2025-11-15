import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import { useWishlistLinking } from "./useWishlistLinking";
import type { UseResultDataReturn, ResultViewModel, ApiError, DrawResultResponseDTO } from "../types";

/**
 * Maps the error to the corresponding ApiError object
 */
function mapErrorToApiError(err: Error): ApiError {
  switch (true) {
    case err.message === "INVALID_PARAMS":
      return { code: "INVALID_PARAMS", message: "Nieprawidłowe parametry dostępu" };
    case err.message.includes("Draw not completed"):
      return { code: "DRAW_NOT_COMPLETED", message: "Losowanie nie zostało przeprowadzone" };
    case err.message.includes("Unauthorized"):
      return { code: "UNAUTHORIZED", message: "Brak autoryzacji" };
    case err.message.includes("Forbidden"):
      return { code: "FORBIDDEN", message: "Brak dostępu do grupy" };
    case err.message.includes("Invalid token"):
      return { code: "INVALID_TOKEN", message: "Nieprawidłowy lub wygasły token dostępu" };
    case err.message.includes("Group not found"):
      return { code: "GROUP_NOT_FOUND", message: "Grupa nie została znaleziona" };
    default:
      return { code: "NETWORK_ERROR", message: err.message || "Błąd połączenia" };
  }
}

/**
 * Custom hook for fetching the result data from the API
 * Handles both authenticated and unauthenticated users
 */
export function useResultData(groupId?: number, token?: string, isAuthenticated?: boolean): UseResultDataReturn {
  const [result, setResult] = useState<ResultViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Use the proper wishlist linking hook for Markdown link support
  const { convertToHtml } = useWishlistLinking();

  /**
   * Formats the budget to a readable format
   */
  const formatBudget = useCallback((budget: number): string => {
    return `${budget} PLN`;
  }, []);

  /**
   * Formats the end date to a readable format
   */
  const formatEndDate = useCallback((endDate: string): string => {
    const date = new Date(endDate);
    return date.toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }, []);

  /**
   * Formats the end date to a short format
   */
  const formatShortEndDate = useCallback((endDate: string): string => {
    const date = new Date(endDate);
    return date.toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, []);

  /**
   * Checks if the end date has passed
   */
  const isDateExpired = useCallback((endDate: string): boolean => {
    return new Date() > new Date(endDate);
  }, []);

  /**
   * Calculates the days until the end of the event
   */
  const calculateDaysUntilEnd = useCallback((endDate: string): number => {
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : -1;
  }, []);

  /**
   * Extracts the initials from the name and surname
   */
  const getInitials = useCallback((name: string): string => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  // Note: convertToHtml from useWishlistLinking handles both plain URLs and markdown links

  /**
   * Transforms the DTO from the API to the ViewModel
   */
  const transformToViewModel = useCallback(
    (dto: DrawResultResponseDTO): ResultViewModel => {
      return {
        // Data from the API
        group: dto.group,
        participant: dto.participant,
        assigned_to: dto.assigned_to,
        my_wishlist: dto.my_wishlist,
        wishlist_stats: dto.wishlist_stats,

        // Formatted values
        formattedBudget: formatBudget(dto.group.budget),
        formattedEndDate: formatEndDate(dto.group.end_date),
        formattedShortEndDate: formatShortEndDate(dto.group.end_date),

        // Calculated values
        isExpired: isDateExpired(dto.group.end_date),
        daysUntilEnd: calculateDaysUntilEnd(dto.group.end_date),

        // Data of the assigned person
        assignedPersonInitials: getInitials(dto.assigned_to.name),
        assignedPersonWishlistHtml: dto.assigned_to.wishlist ? convertToHtml(dto.assigned_to.wishlist) : undefined,

        // Access flags
        isAuthenticated: !!isAuthenticated,
        accessToken: token,

        // Convenience properties
        resultViewedAt: dto.participant.result_viewed_at,
      };
    },
    [
      formatBudget,
      formatEndDate,
      formatShortEndDate,
      isDateExpired,
      calculateDaysUntilEnd,
      getInitials,
      isAuthenticated,
      token,
      convertToHtml,
    ]
  );

  /**
   * Fetches the data from the API
   */
  const fetchResult = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      let url: string;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Determine the endpoint based on the parameters
      if (groupId && isAuthenticated) {
        // For authenticated users
        url = `/api/groups/${groupId}/result`;

        // Get the Bearer token from the Supabase session
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } else if (token) {
        // For unauthenticated users
        url = `/api/results/${token}`;
      } else {
        throw new Error("INVALID_PARAMS");
      }

      const response = await fetch(url, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Unknown error");
      }

      const data: DrawResultResponseDTO = await response.json();
      const viewModel = transformToViewModel(data);
      setResult(viewModel);
    } catch (err) {
      console.error("Error fetching result:", err);

      let apiError: ApiError;
      if (err instanceof Error) {
        apiError = mapErrorToApiError(err);
      } else {
        apiError = { code: "UNKNOWN_ERROR", message: "Wystąpił nieoczekiwany błąd" };
      }

      setError(apiError);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, token, isAuthenticated, transformToViewModel]);

  /**
   * Function to manually refresh the data
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchResult();
  }, [fetchResult]);

  // Fetching the data when the component is mounted
  useEffect(() => {
    if (groupId || token) {
      fetchResult();
    } else {
      setIsLoading(false);
    }
  }, [groupId, token, fetchResult]);

  return {
    result,
    isLoading,
    error,
    refetch,
  };
}
