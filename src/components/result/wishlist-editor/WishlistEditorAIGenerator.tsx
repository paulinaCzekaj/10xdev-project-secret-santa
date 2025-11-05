import { useState } from "react";
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
    aiStatus,
  } = useWishlistEditorContext();

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const handlePromptSubmit = async (prompt: string) => {
    await generateLetter(prompt);
    setIsPromptModalOpen(false);
    setIsPreviewModalOpen(true);
  };

  const handleAccept = async () => {
    if (!generatedContent) return;

    // Wstawienie treści do textarea
    setContent(generatedContent);

    // Wywołanie acceptLetter (refetch status, toast)
    await acceptLetter();

    setIsPreviewModalOpen(false);
  };

  const handleReject = async () => {
    await rejectLetter();
    setIsPreviewModalOpen(false);
  };

  const handleRegenerate = async () => {
    await regenerateLetter();
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
          status={aiStatus}
          isLoading={isGenerating}
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
