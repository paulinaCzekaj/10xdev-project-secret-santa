import { useCallback } from "react";
import type { UseWishlistLinkingReturn } from "../types";

/**
 * Custom hook do konwersji URL-i w tekście na klikalne linki HTML
 * Wykrywa URL-e w tekście i zamienia je na znaczniki <a> z odpowiednimi atrybutami
 */
export function useWishlistLinking(): UseWishlistLinkingReturn {
  /**
   * Konwertuje tekst zawierający URL-e na HTML z klikalnymi linkami
   * @param text - tekst do przetworzenia
   * @returns HTML string z linkami
   */
  const convertToHtml = useCallback((text: string): string => {
    if (!text) return "";

    // Regex do wykrywania URL-i (http:// lub https://)
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    // Zamiana URL-i na linki HTML
    const html = text.replace(urlRegex, (url) => {
      // Tworzymy bezpieczny link z odpowiednimi atrybutami
      const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${url}</a>`;

      return linkHtml;
    });

    // Zamiana nowych linii na <br> dla poprawnego wyświetlania
    return html.replace(/\n/g, "<br>");
  }, []);

  /**
   * Wyciąga wszystkie URL-e z tekstu
   * @param text - tekst do przeszukania
   * @returns tablica znalezionych URL-i
   */
  const extractUrls = useCallback((text: string): string[] => {
    if (!text) return [];

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlRegex);

    return matches || [];
  }, []);

  return {
    convertToHtml,
    extractUrls,
  };
}
