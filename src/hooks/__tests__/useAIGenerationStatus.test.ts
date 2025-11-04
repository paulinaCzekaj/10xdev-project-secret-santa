import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAIGenerationStatus } from "../useAIGenerationStatus";

// Mock fetch globally
const fetchMock = vi.fn();
global.fetch = fetchMock;

describe("useAIGenerationStatus", () => {
  const participantId = 123;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() => useAIGenerationStatus(participantId));

      expect(result.current.status).toBe(null);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
    });
  });

  describe("fetchStatus function", () => {
    it("should fetch status successfully", async () => {
      const mockResponse = {
        ai_generation_count: 2,
        remaining_generations: 3,
        max_generations: 5,
        can_generate: true,
        is_registered: true,
        last_generated_at: "2025-11-04T14:30:00Z",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGenerationStatus(participantId));

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toEqual(mockResponse);
      expect(result.current.error).toBe(null);
    });

    it("should handle API errors", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: {
            code: "NOT_FOUND",
            message: "Participant not found",
          },
        }),
      });

      const { result } = renderHook(() => useAIGenerationStatus(participantId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe(null);
      expect(result.current.error).toEqual({
        code: "AI_API_ERROR",
        message: "Participant not found",
      });
    });

    it("should handle network errors", async () => {
      fetchMock.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useAIGenerationStatus(participantId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe(null);
      expect(result.current.error).toEqual({
        code: "AI_API_ERROR",
        message: "Network error",
      });
    });

    it("should include token in URL for unauthenticated users", async () => {
      const token = "test-token";
      const mockResponse = {
        ai_generation_count: 0,
        remaining_generations: 3,
        max_generations: 3,
        can_generate: true,
        is_registered: false,
        last_generated_at: null,
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGenerationStatus(participantId, token));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/participants/123/wishlist/ai-status?token=test-token"),
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should include authorization header for authenticated users", async () => {
      // Mock localStorage
      const localStorageMock = {
        getItem: vi.fn(() => "test-access-token"),
      };
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
        writable: true,
      });

      const mockResponse = {
        ai_generation_count: 2,
        remaining_generations: 3,
        max_generations: 5,
        can_generate: true,
        is_registered: true,
        last_generated_at: "2025-11-04T14:30:00Z",
      };

      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { result } = renderHook(() => useAIGenerationStatus(participantId));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/api/participants/123/wishlist/ai-status"),
        expect.objectContaining({
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-access-token",
          },
        })
      );
    });

    it("should not fetch when enabled is false", () => {
      const { result } = renderHook(() => useAIGenerationStatus(participantId, undefined, false));

      expect(result.current.isLoading).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("refetch function", () => {
    it("should refetch status when called", async () => {
      const mockResponse1 = {
        ai_generation_count: 0,
        remaining_generations: 5,
        max_generations: 5,
        can_generate: true,
        is_registered: true,
        last_generated_at: null,
      };

      const mockResponse2 = {
        ai_generation_count: 1,
        remaining_generations: 4,
        max_generations: 5,
        can_generate: true,
        is_registered: true,
        last_generated_at: "2025-11-04T15:00:00Z",
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

      const { result } = renderHook(() => useAIGenerationStatus(participantId));

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.status?.remaining_generations).toBe(5);
      });

      // Call refetch
      result.current.refetch();

      // Wait for refetch to complete
      await waitFor(() => {
        expect(result.current.status?.remaining_generations).toBe(4);
      });

      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
