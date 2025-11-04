import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { AIPromptModalProps } from "@/types";

const MIN_PROMPT_LENGTH = 10;
const MAX_PROMPT_LENGTH = 2000;

/**
 * Modal z formularzem do wpisania preferencji/zainteresowań użytkownika
 * Zawiera walidację długości promptu oraz licznik znaków
 */
export function AIPromptModal({ isOpen, onClose, onSubmit, isLoading, error }: AIPromptModalProps) {
  const [prompt, setPrompt] = useState("");
  const [charCount, setCharCount] = useState(0);

  // Reset przy otwarciu modalu
  useEffect(() => {
    if (isOpen) {
      setPrompt("");
      setCharCount(0);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_PROMPT_LENGTH) {
      setPrompt(value);
      setCharCount(value.length);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || isLoading) return;

    await onSubmit(prompt);
  };

  // Walidacja
  const trimmedLength = prompt.trim().length;
  const isValid = trimmedLength >= MIN_PROMPT_LENGTH && charCount <= MAX_PROMPT_LENGTH;

  // Kolor licznika
  const getCharCountColor = () => {
    if (charCount < MIN_PROMPT_LENGTH || charCount > MAX_PROMPT_LENGTH) {
      return "text-destructive";
    }
    if (charCount > 900) {
      return "text-yellow-600";
    }
    return "text-muted-foreground";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Wygeneruj list do Mikołaja z pomocą AI</DialogTitle>
            <DialogDescription>
              Opisz swoje zainteresowania i preferencje, wymień konkretne prezenty oraz dodaj linki do produktów,
              a AI stworzy dla Ciebie spersonalizowany list do świętego Mikołaja w ciepłym, świątecznym tonie.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prompt">Twoje zainteresowania i preferencje</Label>
              <Textarea
                id="prompt"
                placeholder={`Np. Lubię książki fantasy i dobrą kawę. Chcę dostać "Wiedźmin: Ostatnie życzenie" - link: https://example.com/ksiazka, ciepły szalik - link: https://example.com/szalik, oraz zestaw do kawy - link: https://example.com/kawa`}
                value={prompt}
                onChange={handleChange}
                rows={6}
                maxLength={MAX_PROMPT_LENGTH}
                disabled={isLoading}
                className="resize-none"
              />
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {trimmedLength < MIN_PROMPT_LENGTH && (
                    <span className="text-destructive">Minimum {MIN_PROMPT_LENGTH} znaków</span>
                  )}
                </p>
                <p className={`text-sm ${getCharCountColor()}`}>
                  {charCount} / {MAX_PROMPT_LENGTH}
                </p>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
              Anuluj
            </Button>
            <Button type="submit" disabled={!isValid || isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generuję list...
                </>
              ) : (
                "Generuj"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
