import { memo } from "react";
import WishlistEditor from "./WishlistEditor";
import WishlistDisplay from "./WishlistDisplay";

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
}: WishlistSectionProps) {
  return (
    <div className="space-y-6">
      {/* Lista życzeń wylosowanej osoby */}
      <WishlistDisplay
        content={theirWishlist.content}
        contentHtml={theirWishlist.contentHtml}
        personName={assignedPersonName}
      />

      {/* Moja lista życzeń */}
      <WishlistEditor
        initialContent={myWishlist.content || ""}
        participantId={participantId}
        canEdit={myWishlist.can_edit}
        endDate={groupEndDate}
        accessToken={accessToken}
      />
    </div>
  );
}

export default memo(WishlistSection);
