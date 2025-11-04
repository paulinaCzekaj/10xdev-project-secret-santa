import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WishlistEditor from "../WishlistEditor";

// Mock hooks
vi.mock("@/hooks/useWishlistEditor", () => ({
  useWishlistEditor: vi.fn(() => ({
    content: "Test content",
    setContent: vi.fn(),
    isSaving: false,
    saveError: null,
    lastSaved: null,
    canEdit: true,
    characterCount: 12,
    hasChanges: false,
    save: vi.fn(),
  })),
}));

vi.mock("@/hooks/useAIGeneration", () => ({
  useAIGeneration: vi.fn(() => ({
    isGenerating: false,
    isRegenerating: false,
    error: null,
    generatedContent: null,
    currentPrompt: null,
    remainingGenerations: 3,
    generateLetter: vi.fn(),
    regenerateLetter: vi.fn(),
    acceptLetter: vi.fn(),
    rejectLetter: vi.fn(),
  })),
}));

vi.mock("@/hooks/useAIGenerationStatus", () => ({
  useAIGenerationStatus: vi.fn(() => ({
    status: { remaining_generations: 3 },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

describe("WishlistEditor", () => {
  it("renders editable version when canEdit is true", () => {
    render(
      <WishlistEditor participantId={1} initialContent="Test content" canEdit={true} endDate="2025-12-25T00:00:00Z" />
    );

    expect(screen.getByText("🎁 Moja lista życzeń")).toBeInTheDocument();
    expect(screen.getByText(/Magia Świąt Bożego Narodzenia/)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test content")).toBeInTheDocument();
  });

  it("renders locked version when canEdit is false", () => {
    render(
      <WishlistEditor participantId={1} initialContent="Test content" canEdit={false} endDate="2025-12-25T00:00:00Z" />
    );

    expect(screen.getByText("🔒 Moja lista życzeń")).toBeInTheDocument();
    expect(screen.getByText(/została zablokowana/)).toBeInTheDocument();
  });

  it("displays character count", () => {
    render(
      <WishlistEditor participantId={1} initialContent="Test content" canEdit={true} endDate="2025-12-25T00:00:00Z" />
    );

    expect(screen.getByText("12/10000")).toBeInTheDocument();
  });

  it("renders group statistics when provided", () => {
    render(
      <WishlistEditor
        participantId={1}
        initialContent="Test content"
        canEdit={true}
        endDate="2025-12-25T00:00:00Z"
        wishlistStats={{
          total_participants: 5,
          participants_with_wishlist: 2,
        }}
      />
    );

    expect(screen.getByText("2/5 uczestników dodało już swoją listę życzeń")).toBeInTheDocument();
  });
});
