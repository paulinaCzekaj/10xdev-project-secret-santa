import { useState, useEffect, useCallback, useRef } from "react";
import { useDebouncedCallback } from "use-debounce";
import { supabaseClient } from "@/db/supabase.client";
import type { WishlistEditorState, UseWishlistEditorReturn, CreateOrUpdateWishlistCommand } from "../types";

/**
 * Custom hook do zarządzania edycją listy życzeń z funkcją autosave
 * Obsługuje debounced save, walidację i obsługę błędów
 */
export function useWishlistEditor(
  participantId: number,
  initialContent: string,
  canEdit: boolean,
  accessToken?: string
): UseWishlistEditorReturn {
  console.log("[useWishlistEditor] Initialized", {
    participantId,
    initialContent: initialContent.substring(0, 50) + (initialContent.length > 50 ? "..." : ""),
    canEdit,
    hasAccessToken: !!accessToken,
  });

  // Stan edytora
  const [content, setContent] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Ref do śledzenia czy to pierwsze renderowanie
  const isFirstRender = useRef(true);

  /**
   * Oblicza liczbę znaków w treści
   */
  const characterCount = content.length;

  /**
   * Sprawdza czy są niezapisane zmiany
   */
  const hasChanges = content !== originalContent;

  /**
   * Aktualizuje treść i czyści błąd
   */
  const updateContent = useCallback((newContent: string) => {
    // Walidacja długości
    if (newContent.length > 10000) {
      return; // Blokuje input jeśli przekroczono limit
    }

    setContent(newContent);
    setSaveError(null); // Czyści błąd przy każdej zmianie
  }, []);

  /**
   * Wysyła żądanie zapisu do API
   */
  const performSave = useCallback(
    async (contentToSave: string): Promise<void> => {
      console.log("[useWishlistEditor.performSave] Called", {
        participantId,
        contentToSave: contentToSave.substring(0, 50) + (contentToSave.length > 50 ? "..." : ""),
        canEdit,
        hasAccessToken: !!accessToken,
      });

      if (!canEdit) {
        console.log("[useWishlistEditor.performSave] Cannot edit - returning early");
        return; // Nie zapisuje jeśli edycja jest zablokowana
      }

      setIsSaving(true);
      setSaveError(null);

      try {
        // Przygotowanie URL i headers
        let url = `/api/participants/${participantId}/wishlist`;
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        // Dodanie tokenu dla niezalogowanych użytkowników
        if (accessToken) {
          const separator = url.includes("?") ? "&" : "?";
          url += `${separator}token=${accessToken}`;
        } else {
          // Dla zalogowanych użytkowników pobieramy Bearer token z sesji Supabase
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

          // Specjalne obsługa błędów
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

        // Aktualizacja stanu po sukcesie
        setOriginalContent(contentToSave);
        setLastSaved(new Date());
      } catch (error) {
        console.error("Error saving wishlist:", error);

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
        throw error; // Re-throw dla obsługi w komponencie
      } finally {
        setIsSaving(false);
      }
    },
    [participantId, canEdit, accessToken]
  );

  /**
   * Natychmiastowy zapis (np. przy blur)
   */
  const save = useCallback(async (): Promise<void> => {
    if (!hasChanges || isSaving) {
      return; // Nie zapisuje jeśli nie ma zmian lub już trwa zapisywanie
    }

    try {
      await performSave(content);
    } catch {
      // Błąd już obsłużony w performSave
    }
  }, [hasChanges, isSaving, content, performSave]);

  /**
   * Debounced save - automatyczny zapis po 2 sekundach bezczynności
   */
  const debouncedSave = useDebouncedCallback(async (contentToSave: string) => {
    if (!hasChanges) {
      return; // Nie zapisuje jeśli nie ma zmian
    }

    try {
      await performSave(contentToSave);
    } catch {
      // Błąd już obsłużony w performSave
    }
  }, 2000); // 2 sekundy debounce

  /**
   * Efekt wywołujący debounced save przy każdej zmianie treści
   */
  useEffect(() => {
    // Pomijamy pierwsze renderowanie aby uniknąć niepotrzebnego zapisu
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Wywołujemy debounced save tylko jeśli są zmiany i nie ma błędu
    // Ważne: jeśli jest błąd, nie próbujemy ponownie zapisywać automatycznie
    if (hasChanges && !isSaving && !saveError) {
      debouncedSave(content);
    } else if (saveError) {
      // Jeśli wystąpił błąd, anuluj wszelkie oczekujące debounced saves
      debouncedSave.cancel();
    }

    // Cleanup debounced callback przy odmontowaniu
    return () => {
      debouncedSave.cancel();
    };
  }, [content, hasChanges, isSaving, saveError, debouncedSave]);

  /**
   * Aktualizacja stanu gdy zmieniają się propsy
   */
  useEffect(() => {
    setContent(initialContent);
    setOriginalContent(initialContent);
    setSaveError(null);
    setLastSaved(null);
  }, [initialContent]);

  /**
   * Stan edytora dla komponentu
   */
  const state: WishlistEditorState = {
    content,
    originalContent,
    isSaving,
    hasChanges,
    lastSaved,
    saveError,
    characterCount,
    canEdit,
  };

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
