import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { UseResultDataReturn, ResultViewModel, ApiError, DrawResultResponseDTO } from "../types";

/**
 * Mapuje błąd na odpowiedni obiekt ApiError
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
 * Custom hook do pobierania danych wyniku z API
 * Obsługuje zarówno dostęp dla zalogowanych jak i niezalogowanych użytkowników
 */
export function useResultData(groupId?: number, token?: string, isAuthenticated?: boolean): UseResultDataReturn {
  const [result, setResult] = useState<ResultViewModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Formatuje budżet do czytelnej postaci
   */
  const formatBudget = useCallback((budget: number): string => {
    return `${budget} PLN`;
  }, []);

  /**
   * Formatuje datę zakończenia do czytelnej postaci
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
   * Formatuje datę zakończenia do krótkiej postaci
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
   * Sprawdza czy data zakończenia minęła
   */
  const isDateExpired = useCallback((endDate: string): boolean => {
    return new Date() > new Date(endDate);
  }, []);

  /**
   * Oblicza dni do końca wydarzenia
   */
  const calculateDaysUntilEnd = useCallback((endDate: string): number => {
    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : -1;
  }, []);

  /**
   * Wyciąga inicjały z imienia i nazwiska
   */
  const getInitials = useCallback((name: string): string => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  /**
   * Konwertuje URL-e w tekście na HTML linki
   * Prosta implementacja - można przenieść do useWishlistLinking hook
   */
  const convertUrlsToLinks = useCallback((text: string): string => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      (url) =>
        `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`
    );
  }, []);

  /**
   * Transformuje DTO z API na ViewModel
   */
  const transformToViewModel = useCallback(
    (dto: DrawResultResponseDTO): ResultViewModel => {
      return {
        // Dane z API
        group: dto.group,
        participant: dto.participant,
        assigned_to: dto.assigned_to,
        my_wishlist: dto.my_wishlist,
        wishlist_stats: dto.wishlist_stats,

        // Formatowane wartości
        formattedBudget: formatBudget(dto.group.budget),
        formattedEndDate: formatEndDate(dto.group.end_date),
        formattedShortEndDate: formatShortEndDate(dto.group.end_date),

        // Obliczone wartości
        isExpired: isDateExpired(dto.group.end_date),
        daysUntilEnd: calculateDaysUntilEnd(dto.group.end_date),

        // Dane wylosowanej osoby
        assignedPersonInitials: getInitials(dto.assigned_to.name),
        assignedPersonWishlistHtml: dto.assigned_to.wishlist ? convertUrlsToLinks(dto.assigned_to.wishlist) : undefined,

        // Flagi dostępu
        isAuthenticated: !!isAuthenticated,
        accessToken: token,
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
      convertUrlsToLinks,
    ]
  );

  /**
   * Pobiera dane z API
   */
  const fetchResult = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      let url: string;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Określenie endpointu na podstawie parametrów
      if (groupId && isAuthenticated) {
        // Dla zalogowanych użytkowników
        url = `/api/groups/${groupId}/result`;

        // Pobieramy Bearer token z sesji Supabase
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } else if (token) {
        // Dla niezalogowanych użytkowników
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
   * Funkcja refetch do ręcznego odświeżenia danych
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchResult();
  }, [fetchResult]);

  // Pobieranie danych przy montowaniu komponentu
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
