import { escapeHtmlText, escapeHtmlAttribute, escapeHtmlChar } from "./html.utils";

/**
 * Converts plain text URLs and Markdown links to clickable HTML links
 * Used for rendering wishlists with auto-linked URLs
 *
 * @param text - The raw wishlist text content
 * @returns HTML string with auto-linked URLs and Markdown links
 */
export function linkifyUrls(text: string): string {
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

          result += `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapedText}</a>`;

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

      // Escape the URL
      const escapedUrl = escapeHtmlAttribute(url);

      result += `<a href="${escapedUrl}" target="_blank" rel="noopener noreferrer">${escapeHtmlText(url)}</a>`;

      i = urlEnd;
      continue;
    }

    // Regular character - escape it
    result += escapeHtmlChar(text[i]);

    i++;
  }

  return result;
}
