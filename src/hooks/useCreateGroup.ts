import { useState, useCallback } from "react";
import { supabaseClient } from "@/db/supabase.client";
import type { CreateGroupFormViewModel } from "@/schemas/group.schemas";
import type { CreateGroupCommand, GroupDTO } from "@/types";

interface UseCreateGroupResult {
  createGroup: (data: CreateGroupFormViewModel) => Promise<GroupDTO>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Custom hook for creating a new Secret Santa group
 * Handles API communication, session management, and data transformation
 */
export function useCreateGroup(): UseCreateGroupResult {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createGroup = useCallback(async (data: CreateGroupFormViewModel): Promise<GroupDTO> => {
    setIsLoading(true);
    setError(null);

    try {
      // Get session token for authorization
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      // Transform FormViewModel to CreateGroupCommand
      const command: CreateGroupCommand = {
        name: data.name,
        budget: data.budget,
        end_date: data.end_date.toISOString(),
      };

      // Build headers
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };

      // Add authorization token if session exists
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // Make API call
      const response = await fetch("/api/groups", {
        method: "POST",
        headers,
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Wystąpił błąd podczas tworzenia grupy");
      }

      const result: GroupDTO = await response.json();
      return result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd. Spróbuj ponownie później.";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { createGroup, isLoading, error };
}
