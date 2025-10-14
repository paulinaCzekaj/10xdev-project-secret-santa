import { useState, useEffect, useCallback } from "react";
import type { UseResultDataReturn, ResultViewModel, ApiError } from "../types";

/**
 * Custom hook do pobierania danych wyniku z API
 * Obsługuje zarówno dostęp dla zalogowanych jak i niezalogowanych użytkowników
 */
export function useResultData(
  groupId?: number,
  token?: string,
  isAuthenticated?: boolean
): UseResultDataReturn {
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
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, []);

  /**
   * Formatuje datę zakończenia do krótkiej postaci
   */
  const formatShortEndDate = useCallback((endDate: string): string => {
    const date = new Date(endDate);
    return date.toLocaleDateString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  /**
   * Transformuje DTO z API na ViewModel
   */
  const transformToViewModel = useCallback((dto: DrawResultResponseDTO): ResultViewModel => {
    return {
      // Dane z API
      group: dto.group,
      participant: dto.participant,
      assigned_to: dto.assigned_to,
      my_wishlist: dto.my_wishlist,

      // Formatowane wartości
      formattedBudget: formatBudget(dto.group.budget),
      formattedEndDate: formatEndDate(dto.group.end_date),
      formattedShortEndDate: formatShortEndDate(dto.group.end_date),

      // Obliczone wartości
      isExpired: isDateExpired(dto.group.end_date),
      daysUntilEnd: calculateDaysUntilEnd(dto.group.end_date),

      // Dane wylosowanej osoby
      assignedPersonInitials: getInitials(dto.assigned_to.name),
      assignedPersonWishlistHtml: dto.assigned_to.wishlist
        ? convertUrlsToLinks(dto.assigned_to.wishlist)
        : undefined,

      // Flagi dostępu
      isAuthenticated: !!isAuthenticated,
      accessToken: token,
    };
  }, [formatBudget, formatEndDate, formatShortEndDate, isDateExpired, calculateDaysUntilEnd, getInitials, isAuthenticated, token]);

  /**
   * Konwertuje URL-e w tekście na HTML linki
   * Prosta implementacja - można przenieść do useWishlistLinking hook
   */
  const convertUrlsToLinks = useCallback((text: string): string => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${url}</a>`
    );
  }, []);

  /**
   * Pobiera dane z API
   */
  const fetchResult = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      let url: string;
      let headers: Record<string, string> = {};

      // Określenie endpointu na podstawie parametrów
      if (groupId && isAuthenticated) {
        // Dla zalogowanych użytkowników
        url = `/api/groups/${groupId}/result`;
        // Headers będą dodane przez API middleware
      } else if (token) {
        // Dla niezalogowanych użytkowników
        url = `/api/results/${token}`;
      } else {
        throw new Error('INVALID_PARAMS');
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Unknown error');
      }

      const data: DrawResultResponseDTO = await response.json();
      const viewModel = transformToViewModel(data);
      setResult(viewModel);

    } catch (err) {
      console.error('Error fetching result:', err);

      let apiError: ApiError;
      if (err instanceof Error) {
        // Mapowanie błędów na kody API
        if (err.message === 'INVALID_PARAMS') {
          apiError = { code: 'INVALID_PARAMS', message: 'Nieprawidłowe parametry dostępu' };
        } else if (err.message.includes('Draw not completed')) {
          apiError = { code: 'DRAW_NOT_COMPLETED', message: 'Losowanie nie zostało przeprowadzone' };
        } else if (err.message.includes('Unauthorized')) {
          apiError = { code: 'UNAUTHORIZED', message: 'Brak autoryzacji' };
        } else if (err.message.includes('Forbidden')) {
          apiError = { code: 'FORBIDDEN', message: 'Brak dostępu do grupy' };
        } else if (err.message.includes('Invalid token')) {
          apiError = { code: 'INVALID_TOKEN', message: 'Nieprawidłowy lub wygasły token dostępu' };
        } else if (err.message.includes('Group not found')) {
          apiError = { code: 'GROUP_NOT_FOUND', message: 'Grupa nie została znaleziona' };
        } else {
          apiError = { code: 'NETWORK_ERROR', message: err.message || 'Błąd połączenia' };
        }
      } else {
        apiError = { code: 'UNKNOWN_ERROR', message: 'Wystąpił nieoczekiwany błąd' };
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
