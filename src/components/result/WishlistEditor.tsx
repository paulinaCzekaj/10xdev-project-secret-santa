import WishlistEditor from "./wishlist-editor/WishlistEditor";

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

// Wrapper component to maintain backward compatibility and add error handling
function WishlistEditorWithErrorHandling(props: WishlistEditorProps) {
  // For now, just render the new component
  // TODO: Add error state management when needed
  return <WishlistEditor {...props} />;
}

export default WishlistEditorWithErrorHandling;
