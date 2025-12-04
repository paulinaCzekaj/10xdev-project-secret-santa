import { describe, it, expect, vi, beforeEach } from "vitest";
import { ElfService } from "./elf.service";

// Mock Supabase client with a more comprehensive mock
const createMockSupabaseClient = () => ({
  from: vi.fn((table: string) => ({
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
});

let mockSupabaseClient: ReturnType<typeof createMockSupabaseClient>;

vi.mock("../../db/supabase.client", () => ({
  supabaseClient: vi.fn(),
}));

// Import after mocking
const { supabaseClient } = await import("../../db/supabase.client");

describe("ElfService", () => {
  let elfService: ElfService;

  beforeEach(() => {
    mockSupabaseClient = createMockSupabaseClient();
    // Replace the mocked supabaseClient with our instance
    Object.assign(supabaseClient, mockSupabaseClient);
    elfService = new ElfService(supabaseClient);
  });

  it("should instantiate the service", () => {
    expect(elfService).toBeDefined();
  });
});
