import { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Check, AlertCircle, Lock } from "lucide-react";
import { useWishlistEditor } from "@/hooks/useWishlistEditor";

interface WishlistEditorProps {
  initialContent: string;
  participantId: number;
  canEdit: boolean;
  endDate: string;
  accessToken?: string; // dla niezalogowanych
}

/**
 * Edytor listy życzeń z funkcją autosave
 * Wyświetla pole tekstowe, status zapisywania oraz licznik znaków
 */
export default function WishlistEditor({
  initialContent,
  participantId,
  canEdit,
  endDate,
  accessToken
}: WishlistEditorProps) {
  const {
    content,
    setContent,
    isSaving,
    saveError,
    lastSaved,
    canEdit: editorCanEdit,
    characterCount,
    hasChanges,
    save
  } = useWishlistEditor(participantId, initialContent, canEdit, accessToken);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Formatowanie daty zakończenia dla komunikatu
  const formatEndDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Obsługa blur - natychmiastowy zapis jeśli są zmiany
  const handleBlur = () => {
    if (hasChanges && !isSaving) {
      save();
    }
  };

  // Jeśli edycja jest zablokowana, wyświetlamy komunikat
  if (!editorCanEdit) {
    return (
      <div className="space-y-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-gray-300 dark:border-gray-600 p-6 relative overflow-hidden">
          {/* Świąteczne dekoracje w tle - przygaszone */}
          <div className="absolute top-0 left-0 text-5xl opacity-5 pointer-events-none">
            ⭐
          </div>
          <div className="absolute bottom-0 right-0 text-5xl opacity-5 pointer-events-none">
            🎅
          </div>

          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-10 h-10 bg-gray-400 rounded-lg">
                <Lock className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">
                🔒 Moja lista życzeń
              </h3>
            </div>

            {/* Komunikat o blokadzie - na górze */}
            <Alert variant="destructive" className="mb-4">
              <Lock className="h-4 w-4" />
              <AlertDescription>
                Edycja listy życzeń została zablokowana. Termin na dodawanie życzeń upłynął
                <strong> {formatEndDate(endDate)}</strong>.
              </AlertDescription>
            </Alert>

            {/* Zablokowane pole tekstowe */}
            <Textarea
              value={content}
              disabled
              className="min-h-[150px] opacity-60 cursor-not-allowed border-2 border-gray-300 dark:border-gray-600"
              placeholder="Edycja została zablokowana..."
            />

            {/* Informacja */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
                ℹ️ Twoja lista życzeń została zapisana i jest widoczna dla Twojego Secret Santa
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-green-200 dark:border-green-700 p-6 relative overflow-hidden">
        {/* Świąteczne dekoracje w tle */}
        <div className="absolute top-0 left-0 text-5xl opacity-10 pointer-events-none">
          ⭐
        </div>
        <div className="absolute bottom-0 right-0 text-5xl opacity-10 pointer-events-none">
          🎅
        </div>

        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-lg shadow-sm">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-green-600 dark:text-green-400">
              🎁 Moja lista życzeń
            </h3>
          </div>

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

        {/* Status zapisywania i licznik znaków */}
        <div className="flex items-center justify-between mt-3 text-sm">
          {/* Status zapisywania */}
          <div className="flex items-center gap-2">
            {isSaving && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                <span className="text-green-600 dark:text-green-400">Zapisywanie...</span>
              </>
            )}

            {!isSaving && lastSaved && !hasChanges && (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">
                  Zapisano {lastSaved.toLocaleTimeString('pl-PL', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </>
            )}

            {!isSaving && hasChanges && (
              <span className="text-orange-600 dark:text-orange-400">
                Niezapisane zmiany
              </span>
            )}
          </div>

          {/* Licznik znaków */}
          <div className={`text-sm ${characterCount > 9500 ? 'text-orange-500' : 'text-gray-500 dark:text-gray-400'}`}>
            {characterCount}/10000
            {characterCount > 9500 && (
              <span className="ml-2 text-orange-500">Limit!</span>
            )}
          </div>
        </div>

        {/* Świąteczna wskazówka */}
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
            💡 Wskazówka: Dodaj linki do produktów, aby ułatwić zakupy! 🎄
          </p>
        </div>
      </div>
      </div>

      {/* Komunikat o błędzie */}
      {saveError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {saveError}
            <button
              onClick={() => save()}
              disabled={isSaving}
              className="ml-2 underline hover:no-underline disabled:opacity-50"
            >
              Spróbuj ponownie
            </button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
