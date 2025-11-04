import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAIGeneration } from "../useAIGeneration";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useAIGeneration", () => {
  const participantId = "123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() => useAIGeneration(participantId));

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.generatedContent).toBe(null);
      expect(result.current.suggestedGifts).toEqual([]);
      expect(result.current.remainingGenerations).toBe(null);
      expect(result.current.canGenerateMore).toBe(true);
    });
  });

  describe("generate function", () => {
    it("should handle successful generation", async () => {
      const mockResponse = {
        generated_content: "Test letter content",
        suggested_gifts: ["gift1", "gift2"],
        remaining_generations: 3,
        can_generate_more: true,
        metadata: {
          model: "gpt-4o-mini",
          tokensUsed: 150,
          generationTime: 2000,
        },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("I love fantasy books and coffee");
      });

      // Check loading state
      expect(result.current.isGenerating).toBe(true);
      expect(result.current.error).toBe(null);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(result.current.generatedContent).toBe("Test letter content");
      expect(result.current.suggestedGifts).toEqual(["gift1", "gift2"]);
      expect(result.current.remainingGenerations).toBe(3);
      expect(result.current.canGenerateMore).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it("should handle API errors with user-friendly messages", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Rate limit exceeded",
          },
        }),
      });

      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(result.current.error).toBe("Wykorzystałeś wszystkie dostępne generowania AI.");
      expect(result.current.generatedContent).toBe(null);
      expect(result.current.suggestedGifts).toEqual([]);
    });

    it("should handle network errors", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(result.current.error).toBe("Wystąpił nieoczekiwany błąd podczas generowania listy");
      expect(result.current.generatedContent).toBe(null);
    });

    it("should validate empty prompt", async () => {
      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("");
      });

      expect(result.current.error).toBe("Treść preferencji nie może być pusta");
      expect(result.current.isGenerating).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should validate short prompt", async () => {
      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("short");
      });

      expect(result.current.error).toBe("Preferencje muszą mieć co najmniej 10 znaków");
      expect(result.current.isGenerating).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should trim prompt whitespace", async () => {
      const mockResponse = {
        generated_content: "Test letter",
        suggested_gifts: ["gift1"],
        remaining_generations: 4,
        can_generate_more: true,
        metadata: { model: "test", tokensUsed: 100, generationTime: 1000 },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("  I love fantasy books  ");
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/participants/123/wishlist/generate-ai",
        expect.objectContaining({
          body: JSON.stringify({
            prompt: "I love fantasy books",
            isRegistered: false,
          }),
        })
      );
    });

    it("should use isRegistered parameter", async () => {
      const mockResponse = {
        generated_content: "Test letter",
        suggested_gifts: ["gift1"],
        remaining_generations: 2,
        can_generate_more: true,
        metadata: { model: "test", tokensUsed: 100, generationTime: 1000 },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId, true));

      act(() => {
        result.current.generate("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/participants/123/wishlist/generate-ai",
        expect.objectContaining({
          body: JSON.stringify({
            prompt: "I love fantasy books",
            isRegistered: true,
          }),
        })
      );
    });

    it("should handle retryable errors with suggestion", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          error: {
            code: "SERVER_ERROR",
            message: "Server error",
            isRetryable: true,
          },
        }),
      });

      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(result.current.error).toContain("Spróbuj ponownie za chwilę");
    });
  });

  describe("utility functions", () => {
    it("should clear error", () => {
      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("short");
      });

      expect(result.current.error).not.toBe(null);

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBe(null);
    });

    it("should reset all state", async () => {
      const mockResponse = {
        generated_content: "Test letter",
        suggested_gifts: ["gift1", "gift2"],
        remaining_generations: 3,
        can_generate_more: true,
        metadata: { model: "test", tokensUsed: 100, generationTime: 1000 },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.generatedContent).toBe("Test letter");
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.generatedContent).toBe(null);
      expect(result.current.suggestedGifts).toEqual([]);
      expect(result.current.remainingGenerations).toBe(null);
      expect(result.current.canGenerateMore).toBe(true);
    });
  });

  describe("canGenerateMore logic", () => {
    it("should return true when remaining generations is null", () => {
      const { result } = renderHook(() => useAIGeneration(participantId));
      expect(result.current.canGenerateMore).toBe(true);
    });

    it("should return true when remaining generations > 0", async () => {
      const mockResponse = {
        generated_content: "Test letter",
        suggested_gifts: ["gift1"],
        remaining_generations: 2,
        can_generate_more: true,
        metadata: { model: "test", tokensUsed: 100, generationTime: 1000 },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.remainingGenerations).toBe(2);
      });

      expect(result.current.canGenerateMore).toBe(true);
    });

    it("should return false when remaining generations is 0", async () => {
      const mockResponse = {
        generated_content: "Test letter",
        suggested_gifts: ["gift1"],
        remaining_generations: 0,
        can_generate_more: false,
        metadata: { model: "test", tokensUsed: 100, generationTime: 1000 },
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId));

      act(() => {
        result.current.generate("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.remainingGenerations).toBe(0);
      });

      expect(result.current.canGenerateMore).toBe(false);
    });
  });
});
