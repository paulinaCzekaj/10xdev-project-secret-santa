import { useCallback } from "react";
import type { UseWishlistLinkingReturn } from "../types";
import { escapeHtmlText, escapeHtmlAttribute, escapeHtmlChar } from "../lib/utils/html.utils";

/**
 * Custom hook do konwersji URL-i i Markdown links in text to clickable HTML links
 * Wykrywa URL-e i Markdown links in format [text](url), replacing them with <a> tags with appropriate attributes
 */
export function useWishlistLinking(): UseWishlistLinkingReturn {
  /**
   * Converts text containing URLs and Markdown links to HTML with clickable links
   * @param text - text to process
   * @returns HTML string with links
   */
  const convertToHtml = useCallback((text: string): string => {
    if (!text) return "";

    let result = "";
    let i = 0;

    while (i < text.length) {
      // Look for markdown links [text](url)
      if (text[i] === "[") {
        const bracketStart = i;
        const bracketEnd = text.indexOf("]", i);

        if (bracketEnd !== -1 && bracketEnd + 1 < text.length && text[bracketEnd + 1] === "(") {
          const parenStart = bracketEnd + 1;
          // Find the matching closing parenthesis for the URL
          // We need to handle nested parentheses in URLs
          let parenCount = 1;
          let parenEnd = parenStart + 1;

          while (parenEnd < text.length && parenCount > 0) {
            if (text[parenEnd] === "(") {
              parenCount++;
            } else if (text[parenEnd] === ")") {
              parenCount--;
            }
            parenEnd++;
          }

          // Check if we found a valid markdown link
          if (parenCount === 0 && parenEnd <= text.length) {
            const linkText = text.slice(bracketStart + 1, bracketEnd);
            const url = text.slice(parenStart + 1, parenEnd - 1);

            // Escape the link text and URL
            const escapedText = escapeHtmlText(linkText);
            const escapedUrl = escapeHtmlAttribute(url);

            result += `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${escapedText}</a>`;

            i = parenEnd;
            continue;
          }
        }
      }

      // Look for plain URLs
      if (text.startsWith("http://", i) || text.startsWith("https://", i)) {
        const urlStart = i;
        let urlEnd = i;

        // Find the end of the URL (stops at whitespace or end of text)
        while (urlEnd < text.length && !/\s/.test(text[urlEnd])) {
          urlEnd++;
        }

        const url = text.slice(urlStart, urlEnd);

        // Escape the URL and link text
        const escapedUrl = escapeHtmlAttribute(url);
        const escapedLinkText = escapeHtmlText(url);

        result += `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">${escapedLinkText}</a>`;

        i = urlEnd;
        continue;
      }

      // Regular character - escape it
      result += escapeHtmlChar(text[i]);

      i++;
    }

    return result;
  }, []);

  /**
   * Extracts all URLs from text (including Markdown links)
   * @param text - text to search
   * @returns array of found URLs
   */
  const extractUrls = useCallback((text: string): string[] => {
    if (!text) return [];

    const urls: string[] = [];
    let i = 0;

    while (i < text.length) {
      // Look for markdown links [text](url)
      if (text[i] === "[") {
        const bracketEnd = text.indexOf("]", i);

        if (bracketEnd !== -1 && bracketEnd + 1 < text.length && text[bracketEnd + 1] === "(") {
          const parenStart = bracketEnd + 1;
          // Find the matching closing parenthesis for the URL
          let parenCount = 1;
          let parenEnd = parenStart + 1;

          while (parenEnd < text.length && parenCount > 0) {
            if (text[parenEnd] === "(") {
              parenCount++;
            } else if (text[parenEnd] === ")") {
              parenCount--;
            }
            parenEnd++;
          }

          // Check if we found a valid markdown link
          if (parenCount === 0 && parenEnd <= text.length) {
            const url = text.slice(parenStart + 1, parenEnd - 1);
            urls.push(url);
            i = parenEnd;
            continue;
          }
        }
      }

      // Look for plain URLs
      if (text.startsWith("http://", i) || text.startsWith("https://", i)) {
        const urlStart = i;
        let urlEnd = i;

        // Find the end of the URL (stops at whitespace or end of text)
        while (urlEnd < text.length && !/\s/.test(text[urlEnd])) {
          urlEnd++;
        }

        const url = text.slice(urlStart, urlEnd);
        urls.push(url);
        i = urlEnd;
        continue;
      }

      i++;
    }

    return urls;
  }, []);

  return {
    convertToHtml,
    extractUrls,
  };
}
