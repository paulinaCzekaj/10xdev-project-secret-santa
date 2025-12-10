import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WishlistService } from "./wishlist.service";
import type { SupabaseClient } from "../../db/supabase.client";
import type { CreateOrUpdateWishlistCommand, ParticipantWithGroupDTO, WishlistDTO } from "../../types";

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  auth: {
    getUser: vi.fn(),
  },
} as unknown as SupabaseClient;

describe("WishlistService.createOrUpdateWishlist", () => {
  let service: WishlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WishlistService(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper function to create mock participant data
  const createMockParticipant = (overrides: Partial<ParticipantWithGroupDTO> = {}) => ({
    id: 1,
    group_id: 1,
    user_id: "user-123",
    name: "John Doe",
    email: "john@example.com",
    created_at: "2025-10-15T10:00:00Z",
    access_token: "token-abc",
    result_viewed_at: null,
    group: {
      id: 1,
      end_date: "2025-12-25T23:59:59Z",
      creator_id: "creator-123",
    },
    ...overrides,
  });

  // Helper function to create mock wishlist data
  const createMockWishlist = (overrides: Partial<WishlistDTO> = {}): WishlistDTO => ({
    id: 1,
    participant_id: 1,
    wishlist: "Test wishlist content",
    updated_at: "2025-10-15T10:00:00Z",
    ai_generated: null,
    ai_generation_count_per_group: 0,
    ai_last_generated_at: null,
    ...overrides,
  });

  // Helper function to setup Supabase mocks for participants query
  const mockParticipantsQuery = (result: {
    data: ParticipantWithGroupDTO | null;
    error: { message: string } | null;
  }) => {
    const participantsChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(result),
    };

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "participants") {
        return participantsChain;
      }
      // Return a basic chain for other tables to avoid recursion
      return {
        select: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
      };
    });
  };

  // Helper function to setup Supabase mocks for wishes upsert
  const mockWishesUpsert = (result: { data: WishlistDTO | null; error: { message: string } | null }) => {
    const wishesChain = {
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue(result),
        }),
      }),
    };

    // Store current implementation
    const currentImpl = vi.mocked(mockSupabase.from).getMockImplementation();

    vi.mocked(mockSupabase.from).mockImplementation((table: string) => {
      if (table === "wishes") {
        return wishesChain;
      }
      // Use current implementation for other tables if it exists
      if (currentImpl) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (currentImpl as any)(table);
      }
      // Fallback for other tables
      return {
        select: vi.fn().mockReturnThis(),
        upsert: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        delete: vi.fn().mockReturnThis(),
      };
    });
  };

  // Success Scenarios
  describe("successful operations", () => {
    it("should create wishlist for registered user with valid access", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "I want a book and some chocolates",
      };
      const authUserId = "user-123";
      const participantToken = null;

      const mockParticipant = createMockParticipant({ user_id: authUserId }) as ParticipantWithGroupDTO;
      const mockWishlist = createMockWishlist();

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, participantToken);

      // Assert
      expect(result).toEqual(mockWishlist);
      expect(mockSupabase.from).toHaveBeenCalledWith("participants");
      expect(mockSupabase.from).toHaveBeenCalledWith("wishes");
    });

    it("should create wishlist for unregistered user with valid token", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "I want a book and some chocolates",
      };
      const authUserId = null;
      const participantToken = "token-abc";

      const mockParticipant = createMockParticipant({ access_token: participantToken }) as ParticipantWithGroupDTO;
      const mockWishlist = createMockWishlist();

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, participantToken);

      // Assert
      expect(result).toEqual(mockWishlist);
    });

    it("should update existing wishlist when upserting", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Updated wishlist content",
      };
      const authUserId = "user-123";
      const participantToken = null;

      const mockParticipant = createMockParticipant({ user_id: authUserId }) as ParticipantWithGroupDTO;
      const mockWishlist = createMockWishlist({
        wishlist: "Updated wishlist content",
        updated_at: "2025-10-15T11:00:00Z",
      });

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, participantToken);

      // Assert
      expect(result).toEqual(mockWishlist);
      expect(result.wishlist).toBe("Updated wishlist content");
    });

    it("should allow operation on end date (date-only comparison)", async () => {
      // Arrange - Set current date to exactly the end date
      const originalDate = Date;
      const mockDate = new Date("2025-12-25T00:00:00Z"); // Exactly the end date
      global.Date = vi.fn(() => mockDate) as unknown as DateConstructor;
      global.Date.prototype.getFullYear = vi.fn(() => 2025);
      global.Date.prototype.getMonth = vi.fn(() => 11); // December (0-indexed)
      global.Date.prototype.getDate = vi.fn(() => 25);

      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Last minute wishlist",
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({
        user_id: authUserId,
        group: { ...createMockParticipant().group, end_date: "2025-12-25T23:59:59Z" },
      });
      const mockWishlist = createMockWishlist();

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, null);

      // Assert
      expect(result).toEqual(mockWishlist);

      // Cleanup
      global.Date = originalDate;
    });
  });

  // Error Scenarios
  describe("error handling", () => {
    it("should throw PARTICIPANT_NOT_FOUND when participant does not exist", async () => {
      // Arrange
      const participantId = 999;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Some wishlist content",
      };
      const authUserId = "user-123";

      // Mock participants query - participant not found
      mockParticipantsQuery({ data: null, error: { message: "No rows found" } });

      // Act & Assert
      await expect(service.createOrUpdateWishlist(participantId, command, authUserId, null)).rejects.toThrow(
        "PARTICIPANT_NOT_FOUND"
      );
    });

    it("should throw FORBIDDEN when registered user does not own participant and has different email", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Some wishlist content",
      };
      const authUserId = "wrong-user-456"; // Different user ID

      const mockParticipant = createMockParticipant({
        user_id: "user-123", // Owned by different user
        email: "different@example.com", // Different email
      });

      // Mock participants query
      mockParticipantsQuery({ data: mockParticipant, error: null });

      // Mock auth.getUser to return different email
      vi.mocked(mockSupabase.auth.getUser).mockResolvedValue({
        data: {
          user: {
            id: authUserId,
            email: "wrong@example.com", // Different email than participant
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        error: null,
      });

      // Act & Assert
      await expect(service.createOrUpdateWishlist(participantId, command, authUserId, null)).rejects.toThrow(
        "FORBIDDEN"
      );
    });

    it("should throw FORBIDDEN when unregistered user provides invalid token", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Some wishlist content",
      };
      const authUserId = null;
      const participantToken = "wrong-token-xyz"; // Invalid token

      const mockParticipant = createMockParticipant({ access_token: "token-abc" }); // Different token

      // Mock participants query
      mockParticipantsQuery({ data: mockParticipant, error: null });

      // Act & Assert
      await expect(
        service.createOrUpdateWishlist(participantId, command, authUserId, participantToken)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw FORBIDDEN when no authentication provided", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Some wishlist content",
      };
      const authUserId = null;
      const participantToken = null; // No authentication

      const mockParticipant = createMockParticipant();

      // Mock participants query
      mockParticipantsQuery({ data: mockParticipant, error: null });

      // Act & Assert
      await expect(
        service.createOrUpdateWishlist(participantId, command, authUserId, participantToken)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should throw END_DATE_PASSED when group end date has passed", async () => {
      // Arrange - Set current date to after end date using fake timers
      const fakeNow = new Date("2025-12-27T00:00:00Z"); // Clearly after end date
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow);

      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Too late wishlist",
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({
        user_id: authUserId,
        group: { ...createMockParticipant().group, end_date: "2025-12-25T23:59:59Z" },
      });

      // Mock participants query
      mockParticipantsQuery({ data: mockParticipant, error: null });

      // Act & Assert
      await expect(service.createOrUpdateWishlist(participantId, command, authUserId, null)).rejects.toThrow(
        "END_DATE_PASSED"
      );

      // Cleanup
      vi.useRealTimers();
    });

    it("should throw database error when upsert fails", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Some wishlist content",
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({ user_id: authUserId }) as ParticipantWithGroupDTO;

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: null, error: { message: "Database connection failed" } });

      // Act & Assert
      await expect(service.createOrUpdateWishlist(participantId, command, authUserId, null)).rejects.toThrow(
        "Failed to create/update wishlist"
      );
    });

    it("should throw database error when upsert returns no data", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Some wishlist content",
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({ user_id: authUserId }) as ParticipantWithGroupDTO;

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: null, error: null });

      // Act & Assert
      await expect(service.createOrUpdateWishlist(participantId, command, authUserId, null)).rejects.toThrow(
        "Failed to create/update wishlist"
      );
    });
  });

  // Edge Cases
  describe("edge cases", () => {
    it("should handle empty wishlist content", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "",
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({ user_id: authUserId }) as ParticipantWithGroupDTO;
      const mockWishlist = createMockWishlist({ wishlist: "" });

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, null);

      // Assert
      expect(result).toEqual(mockWishlist);
      expect(result.wishlist).toBe("");
    });

    it("should handle very long wishlist content", async () => {
      // Arrange
      const longContent = "A".repeat(10000); // 10,000 characters
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: longContent,
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({ user_id: authUserId }) as ParticipantWithGroupDTO;
      const mockWishlist = createMockWishlist({ wishlist: longContent });

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, null);

      // Assert
      expect(result).toEqual(mockWishlist);
      expect(result.wishlist).toBe(longContent);
    });

    it("should handle wishlist with special characters and URLs", async () => {
      // Arrange
      const specialContent =
        "I want: 🎁 Book & chocolates!\nCheck: https://amazon.com/gift\nAnd: https://ebay.com/items";
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: specialContent,
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({ user_id: authUserId }) as ParticipantWithGroupDTO;
      const mockWishlist = createMockWishlist({ wishlist: specialContent });

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, null);

      // Assert
      expect(result).toEqual(mockWishlist);
      expect(result.wishlist).toBe(specialContent);
    });

    it("should handle participant with null user_id (unregistered user)", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Unregistered user wishlist",
      };
      const authUserId = null;
      const participantToken = "token-abc";

      const mockParticipant = createMockParticipant({
        user_id: null, // Unregistered participant
        access_token: participantToken,
      });
      const mockWishlist = createMockWishlist();

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, participantToken);

      // Assert
      expect(result).toEqual(mockWishlist);
    });

    it("should handle participant with null access_token (registered user)", async () => {
      // Arrange
      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Registered user wishlist",
      };
      const authUserId = "user-123";
      const participantToken = null;

      const mockParticipant = createMockParticipant({
        user_id: authUserId,
        // access_token is required in DB but not used for registered users
      });
      const mockWishlist = createMockWishlist();

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, participantToken);

      // Assert
      expect(result).toEqual(mockWishlist);
    });
  });

  // Date and Time Edge Cases
  describe("date and time validation", () => {
    it("should allow operation before end date (time comparison)", async () => {
      // Arrange - Set current date to just before end date
      const originalDate = Date;
      const mockDate = new Date("2025-12-25T23:59:58Z"); // 1 second before end
      global.Date = vi.fn(() => mockDate) as unknown as DateConstructor;
      global.Date.prototype.getFullYear = vi.fn(() => 2025);
      global.Date.prototype.getMonth = vi.fn(() => 11); // December (0-indexed)
      global.Date.prototype.getDate = vi.fn(() => 25);

      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Last second wishlist",
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({
        user_id: authUserId,
        group: { ...createMockParticipant().group, end_date: "2025-12-25T23:59:59Z" },
      });
      const mockWishlist = createMockWishlist();

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, null);

      // Assert
      expect(result).toEqual(mockWishlist);

      // Cleanup
      global.Date = originalDate;
    });

    it("should reject operation after end date (time comparison)", async () => {
      // Arrange - Set current date to just after end date using fake timers
      const fakeNow = new Date("2025-12-27T00:00:01Z"); // Clearly after end date
      vi.useFakeTimers();
      vi.setSystemTime(fakeNow);

      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Too late wishlist",
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({
        user_id: authUserId,
        group: { ...createMockParticipant().group, end_date: "2025-12-25T23:59:59Z" },
      });

      // Mock participants query
      mockParticipantsQuery({ data: mockParticipant, error: null });

      // Act & Assert
      await expect(service.createOrUpdateWishlist(participantId, command, authUserId, null)).rejects.toThrow(
        "END_DATE_PASSED"
      );

      // Cleanup
      vi.useRealTimers();
    });

    it("should handle different timezones correctly (date-only comparison)", async () => {
      // Arrange - End date is 2025-12-25, current date is 2025-12-25 in different timezone
      const originalDate = Date;
      const mockDate = new Date("2025-12-25T10:00:00+05:00"); // Same date, different timezone
      global.Date = vi.fn(() => mockDate) as unknown as DateConstructor;
      global.Date.prototype.getFullYear = vi.fn(() => 2025);
      global.Date.prototype.getMonth = vi.fn(() => 11); // December (0-indexed)
      global.Date.prototype.getDate = vi.fn(() => 25);

      const participantId = 1;
      const command: CreateOrUpdateWishlistCommand = {
        wishlist: "Timezone test wishlist",
      };
      const authUserId = "user-123";

      const mockParticipant = createMockParticipant({
        user_id: authUserId,
        group: { ...createMockParticipant().group, end_date: "2025-12-25T23:59:59Z" },
      });
      const mockWishlist = createMockWishlist();

      // Mock Supabase queries
      mockParticipantsQuery({ data: mockParticipant, error: null });
      mockWishesUpsert({ data: mockWishlist, error: null });

      // Act
      const result = await service.createOrUpdateWishlist(participantId, command, authUserId, null);

      // Assert
      expect(result).toEqual(mockWishlist);

      // Cleanup
      global.Date = originalDate;
    });
  });
});

describe("WishlistService.validateWishlistAccess", () => {
  let service: WishlistService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WishlistService(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper function to create mock participant data
  const createMockParticipant = (overrides: Partial<ParticipantWithGroupDTO> = {}): ParticipantWithGroupDTO => {
    const result = {
      id: 1,
      group_id: 1,
      user_id: "user-123",
      name: "John Doe",
      email: "john@example.com",
      created_at: "2025-10-15T10:00:00Z",
      access_token: "token-abc",
      result_viewed_at: null,
      elf_accessed_at: null,
      elf_for_participant_id: null,
      group: {
        id: 1,
        end_date: "2025-12-25T23:59:59Z",
        creator_id: "creator-123",
      },
      ...overrides,
    } as ParticipantWithGroupDTO;

    // Ensure these properties are never undefined
    result.elf_accessed_at = (result.elf_accessed_at ?? null) as string | null;
    result.elf_for_participant_id = (result.elf_for_participant_id ?? null) as number | null;

    return result;
  };

  describe("successful access validation", () => {
    it("should grant access to registered user who owns the participant", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = "user-123";
      const participantToken = null;
      const participantWithGroup = createMockParticipant({ user_id: authUserId });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).resolves.toBeUndefined();
    });

    it("should grant access to unregistered user with valid token", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = null;
      const participantToken = "token-abc";
      const participantWithGroup = createMockParticipant({ access_token: participantToken });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).resolves.toBeUndefined();
    });

    it("should grant access when participant has null user_id (unregistered participant)", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = null;
      const participantToken = "token-abc";
      const participantWithGroup = createMockParticipant({
        user_id: null,
        access_token: participantToken,
      });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).resolves.toBeUndefined();
    });
  });

  describe("access denied scenarios", () => {
    it("should deny access when registered user does not own the participant", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = "different-user-456";
      const participantToken = null;
      const participantWithGroup = createMockParticipant({ user_id: "user-123" });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should deny access when unregistered user provides invalid token", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = null;
      const participantToken = "wrong-token-xyz";
      const participantWithGroup = createMockParticipant({ access_token: "token-abc" });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should deny access when unregistered user provides token but participant has no access_token", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = null;
      const participantToken = "some-token";
      const participantWithGroup = createMockParticipant({ access_token: undefined });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should deny access when no authentication is provided", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = null;
      const participantToken = null;
      const participantWithGroup = createMockParticipant();

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should deny access when registered user provides null user_id", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = null;
      const participantToken = null;
      const participantWithGroup = createMockParticipant({ user_id: null });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).rejects.toThrow("FORBIDDEN");
    });
  });

  describe("edge cases and data validation", () => {
    it("should handle empty string tokens correctly", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = null;
      const participantToken = "";
      const participantWithGroup = createMockParticipant({ access_token: "" });

      // Act & Assert - Empty strings should be treated as invalid tokens
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should validate access for participant with complex token", async () => {
      // Arrange
      const complexToken = "complex-token-123-abc-def";
      const participantId = 1;
      const authUserId = null;
      const participantToken = complexToken;
      const participantWithGroup = createMockParticipant({ access_token: complexToken });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).resolves.toBeUndefined();
    });

    it("should handle case-sensitive token comparison", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = null;
      const participantToken = "Token-Abc"; // Different case
      const participantWithGroup = createMockParticipant({ access_token: "token-abc" }); // Lowercase

      // Act & Assert - Tokens are case-sensitive
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).rejects.toThrow("FORBIDDEN");
    });

    it("should validate access when participant belongs to registered user", async () => {
      // Arrange
      const participantId = 1;
      const authUserId = "user-789";
      const participantToken = null;
      const participantWithGroup = createMockParticipant({ user_id: "user-789" });

      // Act & Assert
      await expect(
        service.validateWishlistAccess(participantId, authUserId, participantToken, participantWithGroup)
      ).resolves.toBeUndefined();
    });
  });
});
