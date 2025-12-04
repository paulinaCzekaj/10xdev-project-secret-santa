import { useState, useEffect, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { ElfResultResponseDTO } from "@/types";

/**
 * Maps the error to the corresponding ApiError object
 */
function mapErrorToApiError(err: Error): { code: string; message: string } {
  switch (true) {
    case err.message === "INVALID_PARAMS":
      return { code: "INVALID_PARAMS", message: "Nieprawidłowe parametry dostępu" };
    case err.message.includes("Draw not completed"):
      return { code: "DRAW_NOT_COMPLETED", message: "Losowanie nie zostało przeprowadzone" };
    case err.message.includes("Unauthorized"):
      return { code: "UNAUTHORIZED", message: "Brak autoryzacji" };
    case err.message.includes("Forbidden"):
      return { code: "FORBIDDEN", message: "Brak dostępu - nie jesteś elfem dla tego uczestnika" };
    case err.message.includes("Invalid token"):
      return { code: "INVALID_TOKEN", message: "Nieprawidłowy lub wygasły token dostępu" };
    case err.message.includes("Group not found"):
      return { code: "GROUP_NOT_FOUND", message: "Grupa nie została znaleziona" };
    default:
      return { code: "NETWORK_ERROR", message: err.message || "Błąd połączenia" };
  }
}

/**
 * Custom hook for fetching elf result data from the API
 * Used by elves to view the result of the participant they are helping
 * Supports both authenticated (groupId) and unauthenticated (token) access
 */
export function useElfResult(groupId?: number, token?: string, isAuthenticated?: boolean) {
  const [data, setData] = useState<ElfResultResponseDTO | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  /**
   * Fetches the elf result data from the API
   */
  const fetchElfResult = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      let url: string;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      // Determine the endpoint based on the parameters
      if (groupId && isAuthenticated) {
        // For authenticated users - use the group-based endpoint
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        // Use the new endpoint that automatically finds the user's elf participant
        url = `/api/groups/${groupId}/elf-result`;
      } else if (token) {
        // For unauthenticated users - use token-based endpoint
        url = `/api/elf-results/${token}`;
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

      const result: ElfResultResponseDTO = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching elf result:", err);

      let apiError: { code: string; message: string };
      if (err instanceof Error) {
        apiError = mapErrorToApiError(err);
      } else {
        apiError = { code: "UNKNOWN_ERROR", message: "Wystąpił nieoczekiwany błąd" };
      }

      setError(apiError);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, token, isAuthenticated]);

  /**
   * Function to manually refresh the data
   */
  const refetch = useCallback(async (): Promise<void> => {
    await fetchElfResult();
  }, [fetchElfResult]);

  // Fetching the data when the component is mounted
  useEffect(() => {
    if (groupId || token) {
      fetchElfResult();
    } else {
      setIsLoading(false);
    }
  }, [groupId, token, fetchElfResult]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
