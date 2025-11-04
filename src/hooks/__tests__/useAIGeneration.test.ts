import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAIGeneration } from "../useAIGeneration";
import { toast } from "sonner";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("useAIGeneration", () => {
  const participantId = 123;
  const onStatusChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isRegenerating).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.generatedContent).toBe(null);
      expect(result.current.currentPrompt).toBe(null);
    });
  });

  describe("generateLetter function", () => {
    it("should handle successful generation", async () => {
      const mockResponse = {
        generated_content: "Test letter content",
        remaining_generations: 3,
        can_generate_more: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      act(() => {
        result.current.generateLetter("I love fantasy books and coffee");
      });

      // Check loading state
      expect(result.current.isGenerating).toBe(true);
      expect(result.current.error).toBe(null);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(result.current.generatedContent).toBe("Test letter content");
      expect(result.current.currentPrompt).toBe("I love fantasy books and coffee");
      expect(result.current.error).toBe(null);
      expect(toast.success).toHaveBeenCalledWith("List został wygenerowany!");
    });

    it("should handle API errors with user-friendly messages", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          error: {
            code: "AI_GENERATION_LIMIT_REACHED",
            message: "AI generation limit reached",
          },
        }),
      });

      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      act(() => {
        result.current.generateLetter("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: "AI_GENERATION_LIMIT_REACHED",
        message: "Wykorzystałeś wszystkie dostępne generowania AI.",
      });
      expect(result.current.generatedContent).toBe(null);
      expect(toast.error).toHaveBeenCalledWith("Wykorzystałeś wszystkie dostępne generowania AI.");
    });

    it("should handle network errors", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      act(() => {
        result.current.generateLetter("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: "AI_API_ERROR",
        message: "Network error",
      });
      expect(result.current.generatedContent).toBe(null);
      expect(toast.error).toHaveBeenCalledWith("Network error");
    });

    it("should handle timeout errors", async () => {
      fetchMock.mockRejectedValueOnce(new Error("GATEWAY_TIMEOUT"));

      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      act(() => {
        result.current.generateLetter("I love fantasy books");
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(result.current.error).toEqual({
        code: "GATEWAY_TIMEOUT",
        message: "Generowanie trwa zbyt długo. Spróbuj ponownie.",
      });
      expect(toast.error).toHaveBeenCalledWith("Generowanie trwa zbyt długo. Spróbuj ponownie.");
    });
  });

  describe("regenerateLetter function", () => {
    it("should regenerate with existing prompt", async () => {
      const mockResponse1 = {
        generated_content: "First letter",
        remaining_generations: 4,
        can_generate_more: true,
      };

      const mockResponse2 = {
        generated_content: "Second letter",
        remaining_generations: 3,
        can_generate_more: true,
      };

      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse1,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockResponse2,
        });

      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      // First generation
      act(() => {
        result.current.generateLetter("Test prompt");
      });

      await waitFor(() => {
        expect(result.current.generatedContent).toBe("First letter");
      });

      // Regenerate
      act(() => {
        result.current.regenerateLetter();
      });

      expect(result.current.isRegenerating).toBe(true);

      await waitFor(() => {
        expect(result.current.isRegenerating).toBe(false);
      });

      expect(result.current.generatedContent).toBe("Second letter");
      expect(result.current.currentPrompt).toBe("Test prompt");
      expect(toast.success).toHaveBeenCalledWith("List został zregenerowany!");
    });

    it("should not regenerate without current prompt", () => {
      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      act(() => {
        result.current.regenerateLetter();
      });

      expect(toast.error).toHaveBeenCalledWith("Brak zapisanego promptu do regeneracji");
    });
  });

  describe("acceptLetter and rejectLetter functions", () => {
    it("should accept letter and call status change", async () => {
      const mockResponse = {
        generated_content: "Test content",
        remaining_generations: 4,
        can_generate_more: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      // Generate first
      act(() => {
        result.current.generateLetter("Test prompt");
      });

      await waitFor(() => {
        expect(result.current.generatedContent).toBe("Test content");
      });

      // Then accept
      await act(async () => {
        await result.current.acceptLetter();
      });

      expect(result.current.generatedContent).toBe(null);
      expect(result.current.currentPrompt).toBe(null);
      expect(result.current.error).toBe(null);
      expect(onStatusChange).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("List został dodany do Twojej listy życzeń");
    });

    it("should reject letter and call status change", async () => {
      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      await act(async () => {
        await result.current.rejectLetter();
      });

      expect(result.current.generatedContent).toBe(null);
      expect(result.current.currentPrompt).toBe(null);
      expect(result.current.error).toBe(null);
      expect(onStatusChange).toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalledWith("List został odrzucony. Wykorzystałeś 1 generowanie.");
    });
  });

  describe("reset function", () => {
    it("should reset all state", async () => {
      const mockResponse = {
        generated_content: "Test content",
        remaining_generations: 4,
        can_generate_more: true,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGeneration(participantId, undefined, onStatusChange));

      // Set some state by generating
      act(() => {
        result.current.generateLetter("Test prompt");
      });

      await waitFor(() => {
        expect(result.current.generatedContent).toBe("Test content");
      });

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.isRegenerating).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.generatedContent).toBe(null);
      expect(result.current.currentPrompt).toBe(null);
    });
  });
});
