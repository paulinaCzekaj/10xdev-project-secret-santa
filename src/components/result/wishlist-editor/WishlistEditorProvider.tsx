import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useWishlistEditor } from "@/hooks/useWishlistEditor";
import { useAIGeneration } from "@/hooks/useAIGeneration";
import { useAIGenerationStatus } from "@/hooks/useAIGenerationStatus";
import type { AIGenerationStatusResponse } from "@/types";

interface WishlistEditorProviderProps {
  participantId: number;
  initialContent: string;
  canEdit: boolean;
  accessToken?: string;
  children: ReactNode;
}

interface WishlistEditorContextValue {
  // Component props (needed for AI components)
  participantId: number;
  accessToken?: string;

  // Editor state
  content: string;
  setContent: (content: string) => void;
  isSaving: boolean;
  saveError: string | null;
  lastSaved: Date | null;
  canEdit: boolean;
  characterCount: number;
  hasChanges: boolean;
  save: () => Promise<void>;

  // AI generation state
  isGenerating: boolean;
  isRegenerating: boolean;
  aiError: string | null;
  generatedContent: string | null;
  currentPrompt: string | null;
  remainingGenerations: number | null;
  aiStatus: AIGenerationStatusResponse | null;

  // AI actions
  generateLetter: (prompt: string) => Promise<void>;
  regenerateLetter: () => Promise<void>;
  acceptLetter: () => Promise<void>;
  rejectLetter: () => Promise<void>;
  refetchStatus: () => Promise<void>;
}

const WishlistEditorContext = createContext<WishlistEditorContextValue | null>(null);

export function WishlistEditorProvider({
  participantId,
  initialContent,
  canEdit,
  accessToken,
  children,
}: WishlistEditorProviderProps) {
  // Editor logic
  const editorState = useWishlistEditor(participantId, initialContent, canEdit, accessToken);

  // AI generation logic
  const { status: aiStatus, refetch: refetchStatus } = useAIGenerationStatus(participantId, accessToken);

  const {
    isGenerating,
    isRegenerating,
    error: aiError,
    generatedContent,
    currentPrompt,
    remainingGenerations,
    generateLetter,
    regenerateLetter,
    acceptLetter,
    rejectLetter,
  } = useAIGeneration(participantId, accessToken, refetchStatus);

  const contextValue = useMemo<WishlistEditorContextValue>(
    () => ({
      // Component props
      participantId,
      accessToken,

      // Editor state
      content: editorState.content,
      setContent: editorState.setContent,
      isSaving: editorState.isSaving,
      saveError: editorState.saveError,
      lastSaved: editorState.lastSaved,
      canEdit: editorState.canEdit,
      characterCount: editorState.characterCount,
      hasChanges: editorState.hasChanges,
      save: editorState.save,

      // AI generation state
      isGenerating,
      isRegenerating,
      aiError: aiError?.message || null,
      generatedContent,
      currentPrompt,
      remainingGenerations,
      aiStatus,

      // AI actions
      generateLetter,
      regenerateLetter,
      acceptLetter,
      rejectLetter,
      refetchStatus,
    }),
    [
      participantId,
      accessToken,
      editorState,
      isGenerating,
      isRegenerating,
      aiError,
      generatedContent,
      currentPrompt,
      remainingGenerations,
      aiStatus,
      generateLetter,
      regenerateLetter,
      acceptLetter,
      rejectLetter,
      refetchStatus,
    ]
  );

  return <WishlistEditorContext.Provider value={contextValue}>{children}</WishlistEditorContext.Provider>;
}

export function useWishlistEditorContext() {
  const context = useContext(WishlistEditorContext);
  if (!context) {
    throw new Error("useWishlistEditorContext must be used within WishlistEditorProvider");
  }
  return context;
}
