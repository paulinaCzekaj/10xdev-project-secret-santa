/**
 * Utility functions for formatting data for display in the UI
 */

import { Heart, XCircle, Eye, EyeOff } from "lucide-react";

/**
 * Format currency amount with PLN symbol
 * @param amount - The amount in PLN
 * @returns Formatted string like "150 PLN"
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString("pl-PL")} PLN`;
}

/**
 * Format date for display in a human-readable format
 * @param dateString - ISO date string
 * @returns Formatted date string like "25 grudnia 2025"
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);

  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Format date for relative display (created at dates)
 * @param dateString - ISO date string
 * @returns Formatted relative date string like "10 października 2025"
 */
export function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);

  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Get initials from a name for avatar display
 * @param name - Full name
 * @returns Initials like "JD" for "John Doe"
 */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Format participant email for display (privacy-conscious)
 * @param email - Email address
 * @param isCurrentUser - Whether this is the current user's email
 * @returns Formatted email or "Brak" if no email
 */
export function formatParticipantEmail(email?: string, isCurrentUser: boolean = false): string {
  if (!email) return "Brak";

  if (isCurrentUser) return email;

  // For other users, hide part of the email for privacy
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) return email;

  const visibleChars = Math.min(2, Math.floor(localPart.length / 2));
  const hiddenChars = localPart.length - visibleChars;
  const maskedLocal = localPart.slice(0, visibleChars) + "*".repeat(hiddenChars);

  return `${maskedLocal}@${domain}`;
}

/**
 * Format participant name for display
 * @param name - Participant name
 * @param isCurrentUser - Whether this is the current user
 * @returns Formatted name with "(Ty)" suffix if current user
 */
export function formatParticipantName(name: string, isCurrentUser: boolean = false): string {
  return isCurrentUser ? `${name} (Ty)` : name;
}

/**
 * Calculate days until end date
 * @param endDateString - ISO date string
 * @returns Number of days until end date (-1 if expired)
 */
export function calculateDaysUntilEnd(endDateString: string): number {
  const endDate = new Date(endDateString);
  const now = new Date();

  // Reset time to start of day for fair comparison
  endDate.setHours(23, 59, 59, 999);
  now.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Check if date has expired
 * @param dateString - ISO date string
 * @returns True if the date has passed
 */
export function isDateExpired(dateString: string): boolean {
  return calculateDaysUntilEnd(dateString) < 0;
}

/**
 * Format duration in seconds to human readable format
 * @param totalSeconds - Total duration in seconds
 * @returns Formatted duration like "3h 25m"
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

/**
 * Format exclusion rule for display
 * @param blockerName - Name of the person who cannot draw
 * @param blockedName - Name of the person who cannot be drawn
 * @returns Formatted exclusion text like "Jan Kowalski nie może wylosować Anny Nowak"
 */
export function formatExclusionText(blockerName: string, blockedName: string): string {
  return `${blockerName} → ${blockedName}`;
}

/**
 * Format exclusion rule for short display (mobile)
 * @param blockerName - Name of the person who cannot draw
 * @param blockedName - Name of the person who cannot be drawn
 * @returns Formatted exclusion text like "Jan → Anna"
 */
export function formatExclusionShortText(blockerName: string, blockedName: string): string {
  const blockerInitials = getInitials(blockerName);
  const blockedInitials = getInitials(blockedName);

  return `${blockerInitials} → ${blockedInitials}`;
}

/**
 * Format wishlist status for display
 * @param hasWishlist - Whether the participant has a wishlist
 * @returns Status object with text, variant and icon
 */
export function formatWishlistStatus(hasWishlist: boolean) {
  return {
    hasWishlist,
    text: hasWishlist ? "Lista życzeń dodana" : "Brak listy życzeń",
    variant: (hasWishlist ? "default" : "destructive") as "default" | "destructive",
    icon: hasWishlist ? Heart : XCircle,
  };
}

/**
 * Format result viewing status for display
 * @param viewed - Whether the participant viewed their result
 * @returns Status object with text, variant and icon
 */
export function formatResultStatus(viewed: boolean) {
  return {
    viewed,
    text: viewed ? "Wynik został zobaczony" : "Wynik nie został jeszcze zobaczony",
    variant: (viewed ? "default" : "outline") as "default" | "outline",
    icon: viewed ? Eye : EyeOff,
  };
}

/**
 * Format group status badge
 * @param isDrawn - Whether the draw has been completed
 * @param isExpired - Whether the end date has passed
 * @returns Badge object with text and variant
 */
export function formatGroupStatusBadge(isDrawn: boolean, isExpired: boolean = false) {
  if (isDrawn) {
    if (isExpired) {
      return {
        text: "Losowanie zakończone",
        variant: "secondary" as const,
      };
    } else {
      return {
        text: "Losowanie wykonane",
        variant: "secondary" as const,
      };
    }
  }

  if (isExpired) {
    return {
      text: "Oczekiwanie na losowanie",
      variant: "default" as const,
    };
  }

  return {
    text: "Przed losowaniem",
    variant: "default" as const,
  };
}
