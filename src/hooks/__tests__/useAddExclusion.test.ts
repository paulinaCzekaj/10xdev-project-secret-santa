import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAddExclusion } from "../useAddExclusion";
import { exclusionsService } from "@/services/exclusionsService";
import { notify } from "@/lib/notifications";

// Mock the service
vi.mock("@/services/exclusionsService", () => ({
  exclusionsService: {
    create: vi.fn(),
  },
}));

// Mock notifications
vi.mock("@/lib/notifications", () => ({
  notify: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockExclusionsService = vi.mocked(exclusionsService);
const mockNotify = vi.mocked(notify);

describe("useAddExclusion", () => {
  const groupId = 123;
  const mockExclusionData = {
    id: 1,
    group_id: groupId,
    blocker_participant_id: 1,
    blocked_participant_id: 2,
    created_at: "2024-01-01T00:00:00Z",
  };

  const existingExclusions = [
    {
      id: 1,
      blocker_participant_id: 1,
      blocked_participant_id: 3,
      blocker_name: "Alice",
      blocked_name: "Charlie",
      displayText: "Alice nie może wylosować Charlie",
      shortDisplayText: "Alice → Charlie",
      canDelete: true,
      created_at: "2024-01-01T00:00:00Z",
      group_id: 123,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initial state", () => {
    it("should return correct initial state", () => {
      const { result } = renderHook(() => useAddExclusion(groupId));

      expect(result.current.isSubmitting).toBe(false);
      expect(typeof result.current.submitExclusion).toBe("function");
    });
  });

  describe("submitExclusion function", () => {
    it("should successfully create unidirectional exclusion", async () => {
      mockExclusionsService.create.mockResolvedValueOnce(mockExclusionData);

      const { result } = renderHook(() => useAddExclusion(groupId));

      const formData = {
        blocker_participant_id: 1,
        blocked_participant_id: 2,
        bidirectional: false,
      };

      let submitResult;
      act(() => {
        result.current.submitExclusion(formData, existingExclusions).then((res) => {
          submitResult = res;
        });
      });

      // Check loading state
      expect(result.current.isSubmitting).toBe(true);

      // Wait for completion
      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(submitResult).toEqual({ success: true, data: mockExclusionData });
      expect(mockExclusionsService.create).toHaveBeenCalledWith(groupId, {
        blocker_participant_id: 1,
        blocked_participant_id: 2,
      });
      expect(mockExclusionsService.create).toHaveBeenCalledTimes(1);
      expect(mockNotify.success).toHaveBeenCalledWith("EXCLUSION.ADD_SUCCESS");
    });

    it("should successfully create bidirectional exclusion", async () => {
      mockExclusionsService.create
        .mockResolvedValueOnce(mockExclusionData) // Primary exclusion
        .mockResolvedValueOnce({ ...mockExclusionData, id: 2 }); // Reverse exclusion

      const { result } = renderHook(() => useAddExclusion(groupId));

      const formData = {
        blocker_participant_id: 1,
        blocked_participant_id: 2,
        bidirectional: true,
      };

      let submitResult;
      act(() => {
        result.current.submitExclusion(formData, existingExclusions).then((res) => {
          submitResult = res;
        });
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(submitResult).toEqual({ success: true, data: mockExclusionData });
      expect(mockExclusionsService.create).toHaveBeenCalledTimes(2);
      expect(mockExclusionsService.create).toHaveBeenNthCalledWith(1, groupId, {
        blocker_participant_id: 1,
        blocked_participant_id: 2,
      });
      expect(mockExclusionsService.create).toHaveBeenNthCalledWith(2, groupId, {
        blocker_participant_id: 2,
        blocked_participant_id: 1,
      });
      expect(mockNotify.success).toHaveBeenCalledWith("EXCLUSION.ADD_BIDIRECTIONAL_SUCCESS");
    });

    it("should handle partial success for bidirectional exclusion", async () => {
      mockExclusionsService.create
        .mockResolvedValueOnce(mockExclusionData) // Primary exclusion succeeds
        .mockRejectedValueOnce(new Error("Reverse exclusion failed")); // Reverse fails

      const { result } = renderHook(() => useAddExclusion(groupId));

      const formData = {
        blocker_participant_id: 1,
        blocked_participant_id: 2,
        bidirectional: true,
      };

      let submitResult;
      act(() => {
        result.current.submitExclusion(formData, existingExclusions).then((res) => {
          submitResult = res;
        });
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(submitResult).toEqual({ success: true, data: mockExclusionData });
      expect(mockNotify.warning).toHaveBeenCalledWith("EXCLUSION.ADD_PARTIAL_SUCCESS");
    });

    it("should prevent duplicate exclusions", async () => {
      const { result } = renderHook(() => useAddExclusion(groupId));

      const formData = {
        blocker_participant_id: 1,
        blocked_participant_id: 3, // Already exists in existingExclusions
        bidirectional: false,
      };

      let submitResult;
      act(() => {
        result.current.submitExclusion(formData, existingExclusions).then((res) => {
          submitResult = res;
        });
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(submitResult).toEqual({ success: false });
      expect(mockNotify.error).toHaveBeenCalledWith("EXCLUSION.ADD_DUPLICATE");
      expect(mockExclusionsService.create).not.toHaveBeenCalled();
    });

    it("should prevent duplicate reverse exclusions for bidirectional", async () => {
      const { result } = renderHook(() => useAddExclusion(groupId));

      const formData = {
        blocker_participant_id: 3,
        blocked_participant_id: 1, // Reverse of existing (1->3)
        bidirectional: true,
      };

      let submitResult;
      act(() => {
        result.current.submitExclusion(formData, existingExclusions).then((res) => {
          submitResult = res;
        });
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(submitResult).toEqual({ success: false });
      expect(mockNotify.error).toHaveBeenCalledWith("EXCLUSION.ADD_REVERSE_EXISTS");
      expect(mockExclusionsService.create).not.toHaveBeenCalled();
    });

    it("should handle API errors", async () => {
      const error = new Error("API Error");
      mockExclusionsService.create.mockRejectedValueOnce(error);

      const { result } = renderHook(() => useAddExclusion(groupId));

      const formData = {
        blocker_participant_id: 1,
        blocked_participant_id: 2,
        bidirectional: false,
      };

      let submitResult;
      act(() => {
        result.current.submitExclusion(formData, existingExclusions).then((res) => {
          submitResult = res;
        });
      });

      await waitFor(() => {
        expect(result.current.isSubmitting).toBe(false);
      });

      expect(submitResult).toEqual({ success: false });
      expect(mockNotify.error).toHaveBeenCalledWith({
        title: "API Error",
      });
    });
  });
});
