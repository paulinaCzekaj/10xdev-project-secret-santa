import { useState, useRef } from "react";
import { AIGenerateButton } from "../AIGenerateButton";
import { AIPromptModal } from "../AIPromptModal";
import { AIPreviewModal } from "../AIPreviewModal";
import { useWishlistEditorContext } from "./WishlistEditorProvider";

/**
 * Komponent obsługujący generowanie listu do Mikołaja przez AI
 */
export function WishlistEditorAIGenerator() {
  const {
    participantId,
    accessToken,
    generateLetter,
    regenerateLetter,
    acceptLetter,
    rejectLetter,
    isGenerating,
    isRegenerating,
    aiError,
    generatedContent,
    currentPrompt,
    remainingGenerations,
    setContent,
    canEdit,
    refetchStatus,
  } = useWishlistEditorContext();

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const refreshTriggerRef = useRef(0);

  const handlePromptSubmit = async (prompt: string) => {
    await generateLetter(prompt);
    // Refresh the button counter after generation
    refreshTriggerRef.current += 1;
    setIsPromptModalOpen(false);
    setIsPreviewModalOpen(true);
  };

  const handleAccept = async () => {
    if (!generatedContent) return;

    // Wstawienie treści do textarea
    setContent(generatedContent);

    // Wywołanie acceptLetter (refetch status, toast)
    await acceptLetter();

    // Refresh the button counter after acceptance
    refreshTriggerRef.current += 1;
    setIsPreviewModalOpen(false);
  };

  const handleReject = async () => {
    await rejectLetter();
    // Refresh the button counter after rejection
    refreshTriggerRef.current += 1;
    setIsPreviewModalOpen(false);
  };

  const handleRegenerate = async () => {
    await regenerateLetter();
    // Refresh the button counter after regeneration
    refreshTriggerRef.current += 1;
    // Preview modal pozostaje otwarty z nową treścią
  };

  return (
    <>
      {/* AI Generate Button */}
      <div className="mb-4">
        <AIGenerateButton
          participantId={participantId}
          token={accessToken}
          onGenerateSuccess={() => setIsPromptModalOpen(true)}
          disabled={!canEdit}
          refreshTrigger={refreshTriggerRef.current}
        />
      </div>

      {/* AI Modals */}
      <AIPromptModal
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSubmit={handlePromptSubmit}
        isLoading={isGenerating}
        error={aiError}
      />

      <AIPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        generatedContent={generatedContent || ""}
        onAccept={handleAccept}
        onReject={handleReject}
        onRegenerate={handleRegenerate}
        isRegenerating={isRegenerating}
        remainingGenerations={remainingGenerations ?? 0}
        currentPrompt={currentPrompt || ""}
      />
    </>
  );
}
