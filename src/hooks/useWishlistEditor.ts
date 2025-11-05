import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useDebouncedCallback } from "use-debounce";
import { supabaseClient } from "@/db/supabase.client";
import type { WishlistEditorState, UseWishlistEditorReturn, CreateOrUpdateWishlistCommand } from "../types";

/**
 * Custom hook to manage the wishlist editing with autosave functionality
 * Handles debounced save, validation and error handling
 */
export function useWishlistEditor(
  participantId: number,
  initialContent: string,
  canEdit: boolean,
  accessToken?: string
): UseWishlistEditorReturn {
  if (import.meta.env.DEV) {
    console.log("[useWishlistEditor] Initialized", {
      participantId,
      initialContent: initialContent.substring(0, 50) + (initialContent.length > 50 ? "..." : ""),
      canEdit,
      hasAccessToken: !!accessToken,
    });
  }

  // Editor state
  const [content, setContent] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Ref to track if this is the first render
  const isFirstRender = useRef(true);

  /**
   * Calculates the number of characters in the content
   */
  const characterCount = content.length;

  /**
   * Checks if there are unsaved changes
   * Memoized to avoid recalculation on every render
   */
  const hasChanges = useMemo(() => content !== originalContent, [content, originalContent]);

  /**
   * Updates the content and clears the error
   */
  const updateContent = useCallback((newContent: string) => {
    // Validation of length
    if (newContent.length > 10000) {
      return; // Blocks the input if the limit is exceeded
    }

    setContent(newContent);
    setSaveError(null); // Clears the error on each change
  }, []);

  /**
   * Sends the save request to the API
   */
  const performSave = useCallback(
    async (contentToSave: string): Promise<void> => {
      if (import.meta.env.DEV) {
        console.log("[useWishlistEditor.performSave] Called", {
          participantId,
          contentToSave: contentToSave.substring(0, 50) + (contentToSave.length > 50 ? "..." : ""),
          canEdit,
          hasAccessToken: !!accessToken,
        });
      }

      if (!canEdit) {
        if (import.meta.env.DEV) {
          console.log("[useWishlistEditor.performSave] Cannot edit - returning early");
        }
        return; // Does not save if editing is blocked
      }

      setIsSaving(true);
      setSaveError(null);

      try {
        // Preparation of URL and headers
        let url = `/api/participants/${participantId}/wishlist`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Adding token for unauthenticated users
        if (accessToken) {
          const separator = url.includes("?") ? "&" : "?";
          url += `${separator}token=${accessToken}`;
        } else {
          // For authenticated users we get the Bearer token from the Supabase session
          const {
            data: { session },
          } = await supabaseClient.auth.getSession();

          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
        }

        const command: CreateOrUpdateWishlistCommand = {
          wishlist: contentToSave,
        };

        const response = await fetch(url, {
          method: "PUT",
          headers,
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.error?.message || "Wystąpił błąd podczas zapisywania";

          // Special error handling
          if (errorMessage.includes("end date has passed")) {
            throw new Error("END_DATE_PASSED");
          } else if (errorMessage.includes("too long")) {
            throw new Error("CONTENT_TOO_LONG");
          } else if (response.status === 401) {
            throw new Error("UNAUTHORIZED");
          } else if (response.status === 403) {
            throw new Error("FORBIDDEN");
          } else {
            throw new Error(errorMessage);
          }
        }

        // Update state after success
        setOriginalContent(contentToSave);
        setLastSaved(new Date());
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("Error saving wishlist:", error);
        }

        let errorMessage: string;
        if (error instanceof Error) {
          switch (error.message) {
            case "END_DATE_PASSED":
              errorMessage = "Czas na edycję listy życzeń minął";
              break;
            case "CONTENT_TOO_LONG":
              errorMessage = "Lista życzeń jest za długa (maksymalnie 10000 znaków)";
              break;
            case "UNAUTHORIZED":
              errorMessage = "Brak autoryzacji do zapisu listy życzeń";
              break;
            case "FORBIDDEN":
              errorMessage = "Nie masz uprawnień do edycji tej listy życzeń";
              break;
            case "Failed to fetch":
              errorMessage = "Problem z połączeniem. Sprawdź swoje połączenie internetowe.";
              break;
            default:
              errorMessage = error.message;
          }
        } else {
          errorMessage = "Wystąpił nieoczekiwany błąd podczas zapisywania";
        }

        setSaveError(errorMessage);
        throw error; // Re-throw for handling in the component
      } finally {
        setIsSaving(false);
      }
    },
    [participantId, canEdit, accessToken]
  );

  /**
   * Instant save (e.g. on blur)
   */
  const save = useCallback(async (): Promise<void> => {
    if (!hasChanges || isSaving) {
      return; // Does not save if there are no changes or if saving is already in progress
    }

    try {
      await performSave(content);
    } catch {
      // Error already handled in performSave
    }
  }, [hasChanges, isSaving, content, performSave]);

  /**
   * Debounced save - automatic save after 2 seconds of inactivity
   */
  const debouncedSave = useDebouncedCallback(async (contentToSave: string) => {
    if (!hasChanges) {
      return; // Does not save if there are no changes
    }

    try {
      await performSave(contentToSave);
    } catch {
      // Error already handled in performSave
    }
  }, 2000); // 2 sekundy debounce

  /**
   * Effect calling debounced save on each content change
   * Note: debouncedSave is stable from useDebouncedCallback and safe to include in deps
   */
  useEffect(() => {
    // Skip first render Ato avoid unnecessary save
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // We call debounced save only if there are changes and there is no error
    // Important: if there is an error, we do not try to save automatically again
    if (hasChanges && !isSaving && !saveError) {
      debouncedSave(content);
    } else if (saveError) {
      // If there is an error, cancel all pending debounced saves
      debouncedSave.cancel();
    }

    // Cleanup debounced callback on unmount
    return () => {
      debouncedSave.cancel();
    };
  }, [content, hasChanges, isSaving, saveError, debouncedSave]);

  /**
   * Update of state when props change
   */
  useEffect(() => {
    setContent(initialContent);
    setOriginalContent(initialContent);
    setSaveError(null);
    setLastSaved(null);
  }, [initialContent]);

  /**
   * Editor state for the component
   * Memoized to avoid unnecessary re-renders in consuming components
   */
  const state: WishlistEditorState = useMemo(
    () => ({
      content,
      originalContent,
      isSaving,
      hasChanges,
      lastSaved,
      saveError,
      characterCount,
      canEdit,
    }),
    [content, originalContent, isSaving, hasChanges, lastSaved, saveError, characterCount, canEdit]
  );

  return {
    state,
    content,
    setContent: updateContent,
    isSaving,
    saveError,
    lastSaved,
    canEdit,
    characterCount,
    hasChanges,
    save,
  };
}
