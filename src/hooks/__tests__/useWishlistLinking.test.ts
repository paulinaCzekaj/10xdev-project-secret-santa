import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWishlistLinking } from "../useWishlistLinking";

describe("useWishlistLinking", () => {
  it("should convert plain URLs to clickable links", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = "Check out https://example.com for more info";
    const output = result.current.convertToHtml(input);

    expect(output).toContain('<a href="https://example.com"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).toContain(">https://example.com</a>");
  });

  it("should convert Markdown links [text](url) to clickable links", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = "Check out [Amazon](https://amazon.com) for shopping";
    const output = result.current.convertToHtml(input);

    expect(output).toContain('<a href="https://amazon.com"');
    expect(output).toContain('target="_blank"');
    expect(output).toContain('rel="noopener noreferrer"');
    expect(output).toContain(">Amazon</a>");
  });

  it("should handle both Markdown links and plain URLs in the same text", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = "Visit [Google](https://google.com) or go to https://bing.com directly";
    const output = result.current.convertToHtml(input);

    expect(output).toContain('<a href="https://google.com"');
    expect(output).toContain(">Google</a>");
    expect(output).toContain('<a href="https://bing.com"');
    expect(output).toContain(">https://bing.com</a>");
  });

  it("should preserve line breaks", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = "Line 1\nLine 2";
    const output = result.current.convertToHtml(input);

    expect(output).toBe("Line 1<br>Line 2");
  });

  it("should extract URLs from both Markdown links and plain URLs", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = "Check [Amazon](https://amazon.com) and https://google.com";
    const urls = result.current.extractUrls(input);

    expect(urls).toEqual(["https://amazon.com", "https://google.com"]);
  });

  it("should escape HTML characters in link text", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = 'Check [Site with "quotes"](https://example.com/path?param="value")';
    const output = result.current.convertToHtml(input);

    expect(output).toContain("Site with &quot;quotes&quot;");
    expect(output).toContain("https://example.com/path?param=&quot;value&quot;");
  });

  it("should handle AI-generated markdown links without including closing parenthesis in link", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = "Sprawdź [Allegro](https://allegro.pl) dla zakupów!";
    const output = result.current.convertToHtml(input);

    // The link should be properly formed
    expect(output).toContain('<a href="https://allegro.pl"');
    expect(output).toContain(">Allegro</a>");

    // The closing parenthesis should NOT be part of the link text
    // It should appear after the </a> tag
    const linkTag =
      '<a href="https://allegro.pl" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline break-all">Allegro</a>';
    expect(output).toContain(linkTag + " dla zakupów!");

    // Make sure there's no extra parenthesis in the link
    expect(output).not.toContain("Allegro)</a>");
  });

  it("should handle URLs with parentheses in markdown links", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = "Check [Example Site](https://example.com/path?param=(value)) for details!";
    const output = result.current.convertToHtml(input);

    // The link should be properly formed and include the full URL with parentheses
    expect(output).toContain('<a href="https://example.com/path?param=(value)"');
    expect(output).toContain(">Example Site</a>");

    // The closing parenthesis should NOT be part of the link text
    expect(output).toContain(" for details!");
    expect(output).not.toContain("Example Site)</a>");
  });

  it("should handle nested parentheses in URLs", () => {
    const { result } = renderHook(() => useWishlistLinking());

    const input = "Visit [Complex URL](https://site.com/path(a)/more(b)) now!";
    const output = result.current.convertToHtml(input);

    // The link should be properly formed with the full nested URL
    expect(output).toContain('<a href="https://site.com/path(a)/more(b)"');
    expect(output).toContain(">Complex URL</a>");

    // The closing parenthesis should NOT be part of the link text
    expect(output).toContain(" now!");
    expect(output).not.toContain("Complex URL)</a>");
  });
});
