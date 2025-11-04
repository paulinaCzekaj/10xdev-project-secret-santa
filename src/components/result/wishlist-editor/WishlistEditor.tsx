import { WishlistEditorProvider } from "./WishlistEditorProvider";
import { WishlistEditorHeader } from "./WishlistEditorHeader";
import { WishlistEditorContent } from "./WishlistEditorContent";
import { WishlistEditorStats } from "./WishlistEditorStats";
import { WishlistEditorAIGenerator } from "./WishlistEditorAIGenerator";
import { WishlistEditorSaveIndicator } from "./WishlistEditorSaveIndicator";
import { WishlistEditorLocked } from "./WishlistEditorLocked";

interface WishlistEditorProps {
  initialContent: string;
  participantId: number;
  canEdit: boolean;
  endDate: string;
  accessToken?: string;
  wishlistStats?: {
    total_participants: number;
    participants_with_wishlist: number;
  };
}

/**
 * Główny komponent edytora listy życzeń
 * Używa compound component pattern dla lepszej modularyzacji
 */
export default function WishlistEditor({
  initialContent,
  participantId,
  canEdit,
  endDate,
  accessToken,
  wishlistStats,
}: WishlistEditorProps) {
  return (
    <WishlistEditorProvider
      participantId={participantId}
      initialContent={initialContent}
      canEdit={canEdit}
      accessToken={accessToken}
    >
      {canEdit ? (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-green-200 dark:border-green-700 p-6 relative overflow-hidden">
            {/* Świąteczne dekoracje w tle */}
            <div className="absolute top-0 left-0 text-5xl opacity-10 pointer-events-none">⭐</div>
            <div className="absolute bottom-0 right-0 text-5xl opacity-10 pointer-events-none">🎅</div>

            <div className="relative z-10">
              <WishlistEditorHeader />
              <WishlistEditorAIGenerator />
              <WishlistEditorContent />
              <WishlistEditorStats stats={wishlistStats} />
              <WishlistEditorSaveIndicator />
            </div>
          </div>
        </div>
      ) : (
        <WishlistEditorLocked endDate={endDate} stats={wishlistStats} />
      )}
    </WishlistEditorProvider>
  );
}

// Compound component assignments
WishlistEditor.Header = WishlistEditorHeader;
WishlistEditor.Content = WishlistEditorContent;
WishlistEditor.Stats = WishlistEditorStats;
WishlistEditor.AIGenerator = WishlistEditorAIGenerator;
WishlistEditor.SaveIndicator = WishlistEditorSaveIndicator;
WishlistEditor.Locked = WishlistEditorLocked;
