import { memo } from "react";
import WishlistEditor from "./WishlistEditor";
import WishlistDisplay from "./WishlistDisplay";
import type { WishlistStats } from "@/types";

interface WishlistSectionProps {
  myWishlist: {
    content?: string;
    can_edit: boolean;
  };
  theirWishlist: {
    content?: string;
    contentHtml?: string;
  };
  assignedPersonName: string;
  participantId: number;
  groupEndDate: string;
  accessToken?: string; // dla niezalogowanych
  wishlistStats?: WishlistStats;
  isRevealed?: boolean;
}

/**
 * Główna sekcja zawierająca dwie listy życzeń
 * Responsywny layout: dwie kolumny na desktop, jedna na mobile
 */
function WishlistSection({
  myWishlist,
  theirWishlist,
  assignedPersonName,
  participantId,
  groupEndDate,
  accessToken,
  wishlistStats,
  isRevealed = false,
}: WishlistSectionProps) {
  // Show assigned person's wishlist only if the present was revealed
  const shouldShowTheirWishlist = isRevealed;

  return (
    <div className="space-y-6">
      {/* Lista życzeń wylosowanej osoby - widoczna jeśli ma zawartość lub jeśli prezent został odkryty */}
      {shouldShowTheirWishlist && (
        <WishlistDisplay
          content={theirWishlist.content}
          contentHtml={theirWishlist.contentHtml}
          personName={assignedPersonName}
        />
      )}

      {/* Moja lista życzeń - zawsze widoczna */}
      <WishlistEditor
        initialContent={myWishlist.content || ""}
        participantId={participantId}
        canEdit={myWishlist.can_edit}
        endDate={groupEndDate}
        accessToken={accessToken}
        wishlistStats={wishlistStats}
      />
    </div>
  );
}

export default memo(WishlistSection);
