import { useState, useEffect, useCallback } from "react";
import type { ResultRevealState, UseRevealStateReturn } from "../types";

/**
 * Custom hook do zarządzania stanem odkrycia wyniku w localStorage
 * Przechowuje informację czy użytkownik już odkrył swój wynik losowania
 */
export function useRevealState(
  groupId: number,
  participantId: number
): UseRevealStateReturn {
  const [isRevealed, setIsRevealed] = useState(false);

  /**
   * Generuje klucz localStorage dla danego uczestnika w grupie
   */
  const getStorageKey = useCallback((): string => {
    return `result_revealed_${groupId}_${participantId}`;
  }, [groupId, participantId]);

  /**
   * Ładuje stan odkrycia z localStorage przy montowaniu
   */
  const loadRevealState = useCallback((): boolean => {
    try {
      const key = getStorageKey();
      const stored = localStorage.getItem(key);

      if (!stored) {
        return false;
      }

      const state: ResultRevealState = JSON.parse(stored);

      // Walidacja danych z localStorage
      if (
        typeof state.revealed === 'boolean' &&
        typeof state.revealedAt === 'number' &&
        state.groupId === groupId &&
        state.participantId === participantId
      ) {
        return state.revealed;
      }

      // Jeśli dane są nieprawidłowe, usuwamy je
      localStorage.removeItem(key);
      return false;
    } catch (error) {
      console.warn('Error loading reveal state from localStorage:', error);
      // W przypadku błędu, usuwamy potencjalnie uszkodzone dane
      const key = getStorageKey();
      localStorage.removeItem(key);
      return false;
    }
  }, [getStorageKey, groupId, participantId]);

  /**
   * Zapisuje stan odkrycia do localStorage
   */
  const saveRevealState = useCallback((revealed: boolean): void => {
    try {
      const key = getStorageKey();
      const state: ResultRevealState = {
        groupId,
        participantId,
        revealed,
        revealedAt: Date.now(),
      };

      localStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving reveal state to localStorage:', error);

      // Obsługa błędu QuotaExceededError
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, cleaning up old reveal states');
        clearOldRevealStates();
        // Ponowna próba zapisu
        try {
          const key = getStorageKey();
          const state: ResultRevealState = {
            groupId,
            participantId,
            revealed,
            revealedAt: Date.now(),
          };
          localStorage.setItem(key, JSON.stringify(state));
        } catch (retryError) {
          console.error('Failed to save reveal state even after cleanup:', retryError);
          // W ostateczności, funkcja będzie działać bez localStorage
        }
      }
    }
  }, [getStorageKey, groupId, participantId]);

  /**
   * Czyści stare stany odkrycia (starsze niż 30 dni) aby zwolnić miejsce
   */
  const clearOldRevealStates = useCallback((): void => {
    try {
      const keys = Object.keys(localStorage);
      const revealKeys = keys.filter(k => k.startsWith('result_revealed_'));

      const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

      revealKeys.forEach(key => {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const state: ResultRevealState = JSON.parse(stored);
            if (state.revealedAt && state.revealedAt < thirtyDaysAgo) {
              localStorage.removeItem(key);
            }
          }
        } catch {
          // Jeśli nie można sparsować, usuwamy
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Error cleaning up old reveal states:', error);
    }
  }, []);

  /**
   * Odkrywa wynik - zapisuje stan w localStorage i aktualizuje UI
   */
  const reveal = useCallback((): void => {
    setIsRevealed(true);
    saveRevealState(true);
  }, [saveRevealState]);

  /**
   * Resetuje stan odkrycia (głównie do celów debugowania)
   */
  const reset = useCallback((): void => {
    setIsRevealed(false);
    const key = getStorageKey();
    localStorage.removeItem(key);
  }, [getStorageKey]);

  // Ładowanie stanu przy montowaniu komponentu
  useEffect(() => {
    const revealed = loadRevealState();
    setIsRevealed(revealed);
  }, [loadRevealState]);

  return {
    isRevealed,
    reveal,
    reset,
  };
}
