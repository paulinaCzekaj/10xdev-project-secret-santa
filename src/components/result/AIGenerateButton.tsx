import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AIGenerateButtonProps } from "@/types";

/**
 * Przycisk wywołujący proces AI-generowania listu do Mikołaja
 * Wyświetla licznik pozostałych generowań oraz obsługuje stan disabled
 */
export function AIGenerateButton({
  participantId,
  token,
  onGenerateSuccess,
  disabled = false,
  className,
  status,
  isLoading = false,
}: AIGenerateButtonProps) {

  // Warunki dostępności
  const canGenerate = status?.can_generate ?? false;
  const remainingGenerations = status?.remaining_generations ?? 0;
  const isRegistered = status?.is_registered ?? false;
  const maxGenerations = status?.max_generations ?? (isRegistered ? 5 : 3);

  const isDisabled = !canGenerate || isLoading || disabled;

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
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="default" onClick={handleClick} disabled={isDisabled} className={className}>
            <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
            Generuj list z AI 🎅
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
  );
}
