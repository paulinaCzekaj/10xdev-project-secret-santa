import React, { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAIGenerationStatus } from "@/hooks/useAIGenerationStatus";
import { AIPromptModal } from "./AIPromptModal";
import { AIPreviewModal } from "./AIPreviewModal";
import { useAIGeneration } from "@/hooks/useAIGeneration";
import type { AIGenerateButtonProps } from "@/types";

/**
 * Przycisk wywołujący proces AI-generowania listu do Mikołaja
 * Wyświetla licznik pozostałych generowań oraz obsługuje stan disabled
 */
export function AIGenerateButton({
  participantId,
  token,
  onGenerateSuccess,
  onStatusUpdate,
  disabled = false,
  className,
}: AIGenerateButtonProps) {
  const { status, isLoading, refetch } = useAIGenerationStatus(participantId, token);

  const {
    isGenerating,
    isRegenerating,
    error: aiError,
    generatedContent,
    currentPrompt,
    remainingGenerations: aiRemainingGenerations,
    generateLetter,
    regenerateLetter,
    acceptLetter,
    rejectLetter,
  } = useAIGeneration(participantId, token, refetch);

  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Warunki dostępności
  const canGenerate = status?.can_generate ?? false;
  // Use remainingGenerations from AI generation if available (after generation), otherwise from status
  const remainingGenerations = aiRemainingGenerations ?? status?.remaining_generations ?? 0;
  const isRegistered = status?.is_registered ?? false;
  const maxGenerations = status?.max_generations ?? (isRegistered ? 5 : 3);

  const isDisabled = !canGenerate || isLoading || isGenerating || disabled;

  // Tooltip message
  const getTooltipMessage = () => {
    if (!status) return "Ładowanie...";
    if (remainingGenerations === 0) {
      return `Wykorzystałeś wszystkie dostępne generowania AI (${maxGenerations})`;
    }
    return `Pozostało ${remainingGenerations} z ${maxGenerations} generowań`;
  };

  const handleClick = () => {
    if (isDisabled) return;
    onGenerateSuccess?.();
    setIsPromptModalOpen(true);
  };

  // AI generation handlers
  const handlePromptSubmit = async (prompt: string) => {
    await generateLetter(prompt);
    // Refresh status after generation to get updated counter
    await refetch();
    // Notify parent component to refresh its status too
    onStatusUpdate?.();
    setIsPromptModalOpen(false);
    setIsPreviewModalOpen(true);
  };

  const handleAccept = async () => {
    if (!generatedContent) return;

    await acceptLetter();
    // Refresh status after accepting to get updated counter
    await refetch();
    onStatusUpdate?.();
    setIsPreviewModalOpen(false);
  };

  const handleReject = async () => {
    await rejectLetter();
    // Refresh status after rejecting to get updated counter
    await refetch();
    onStatusUpdate?.();
    setIsPreviewModalOpen(false);
  };

  const handleRegenerate = async () => {
    await regenerateLetter();
    // Refresh status after regeneration to get updated counter
    await refetch();
    onStatusUpdate?.();
    // Preview modal pozostaje otwarty z nową treścią
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="default" onClick={handleClick} disabled={isDisabled} className={className}>
              <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
              Wygeneruj list do Mikołaja z pomocą AI
              <Badge variant={remainingGenerations > 0 ? "default" : "destructive"} className="ml-2">
                {isLoading ? "..." : `${remainingGenerations} pozostałych`}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTooltipMessage()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

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
        remainingGenerations={remainingGenerations}
        currentPrompt={currentPrompt || ""}
      />
    </>
  );
}
