import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// SAFETY CHECK: Ensure unit tests never use production database
const currentSupabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
if (currentSupabaseUrl?.includes("uiyurwyzsckkkoqthxmv.supabase.co")) {
  console.error("\n❌ CRITICAL ERROR: Unit tests detected PRODUCTION database URL!");
  console.error(`   Found: ${currentSupabaseUrl}`);
  console.error("   Unit tests must use mocked Supabase client.\n");
  throw new Error("Unit tests cannot run against production database");
}

// Mock Supabase environment variables for tests
process.env.PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

console.log("✅ Vitest Safety Check: Using mocked Supabase URLs");

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {} // eslint-disable-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function
  disconnect() {} // eslint-disable-line @typescript-eslint/no-empty-function
  observe() {} // eslint-disable-line @typescript-eslint/no-empty-function
  takeRecords() {
    return [];
  }
  unobserve() {} // eslint-disable-line @typescript-eslint/no-empty-function
} as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {} // eslint-disable-line @typescript-eslint/no-useless-constructor, @typescript-eslint/no-empty-function
  disconnect() {} // eslint-disable-line @typescript-eslint/no-empty-function
  observe() {} // eslint-disable-line @typescript-eslint/no-empty-function
  unobserve() {} // eslint-disable-line @typescript-eslint/no-empty-function
} as unknown as typeof ResizeObserver;
