import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useWishlistEditorContext } from "./WishlistEditorProvider";

/**
 * Główna zawartość edytora - textarea i intro text
 */
export function WishlistEditorContent() {
  const { content, setContent, save, isSaving, hasChanges } = useWishlistEditorContext();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleBlur = () => {
    if (hasChanges && !isSaving) {
      save();
    }
  };

  return (
    <>
      {/* Świąteczny intro text */}
      <div className="bg-green-50 dark:bg-green-950 border-l-4 border-green-600 p-3 mb-4 rounded">
        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          ✨ <strong>Magia Świąt Bożego Narodzenia!</strong> To Twoja szansa, aby podzielić się swoimi marzeniami.
          Napisz, co sprawia Ci radość i pomoż swojemu tajemniczemu dobroczyńcy wybrać idealny prezent! 🎄
        </p>
      </div>

      {/* Pole tekstowe */}
      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onBlur={handleBlur}
        disabled={isSaving}
        placeholder="Np: Ciepły szalik ❄️, Ulubiona książka 📚, Zestaw herbat 🍵..."
        className="min-h-[150px] resize-vertical border-2 border-green-200 dark:border-green-700 focus:border-green-400 focus:ring-green-300 rounded-lg"
        maxLength={10000}
      />

      {/* Wskazówka */}
      <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
        <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
          💡 Wskazówka: Dodaj linki do produktów, aby ułatwić zakupy! 🎄
        </p>
      </div>
    </>
  );
}
