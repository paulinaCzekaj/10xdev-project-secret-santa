/**
 * HTML escaping utilities for safe HTML generation
 * Provides consistent escaping across the codebase
 */

/**
 * Escapes text for safe use in HTML text content
 * Escapes: &, <, >, ", '
 */
export function escapeHtmlText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Escapes URLs for safe use in HTML attributes (href, src, etc.)
 * Escapes: &, ", '
 * Note: Does not escape < > as URLs shouldn't contain them
 */
export function escapeHtmlAttribute(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Escapes individual characters for HTML output, converting newlines to <br>
 * Used for processing text character by character
 */
export function escapeHtmlChar(char: string): string {
  switch (char) {
    case "&":
      return "&amp;";
    case "<":
      return "&lt;";
    case ">":
      return "&gt;";
    case '"':
      return "&quot;";
    case "'":
      return "&#x27;";
    case "\n":
      return "<br>";
    default:
      return char;
  }
}
