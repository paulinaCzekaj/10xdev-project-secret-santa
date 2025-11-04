import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Check, X, Eye, EyeOff, Link2 } from "lucide-react";
import { notify } from "@/lib/notifications";
import type { ParticipantViewModel } from "@/types";

interface ParticipantStatusBadgesProps {
  participant: ParticipantViewModel;
  isCreator: boolean;
  onCopyToken?: (participant: ParticipantViewModel) => void;
}

export function ParticipantStatusBadges({ participant, isCreator, onCopyToken }: ParticipantStatusBadgesProps) {
  const handleCopyToken = async () => {
    if (participant.resultLink) {
      try {
        await navigator.clipboard.writeText(participant.resultLink);
        notify.success("CLIPBOARD.COPY_SUCCESS");
        onCopyToken?.(participant);
      } catch (error) {
        notify.error("CLIPBOARD.COPY_LINK_ERROR");
        console.error("Failed to copy to clipboard:", error);
      }
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-2 w-full md:w-auto md:flex-shrink-0">
      {/* Wishlist status badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={participant.wishlistStatus?.variant || "secondary"}
            className={`text-xs flex-shrink-0 flex items-center gap-1 cursor-default ${
              participant.wishlistStatus?.hasWishlist
                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            🎁 Lista:{" "}
            {participant.wishlistStatus?.hasWishlist ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{participant.wishlistStatus?.hasWishlist ? "Lista życzeń została dodana" : "Brak listy życzeń"}</p>
        </TooltipContent>
      </Tooltip>

      {/* Result status badge */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={participant.resultStatus?.variant || "secondary"}
            className={`text-xs flex-shrink-0 flex items-center gap-1 cursor-default ${
              participant.resultStatus?.viewed
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
            }`}
          >
            Status: {participant.resultStatus?.viewed ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {participant.resultStatus?.viewed
              ? "Uczestnik sprawdził wynik losowania"
              : "Uczestnik nie sprawdził jeszcze wyniku"}
          </p>
        </TooltipContent>
      </Tooltip>

      {/* Copy link button - only for creator */}
      {isCreator && participant.resultLink && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" onClick={handleCopyToken} className="h-7 w-7 p-0 hover:bg-blue-100">
              <Link2 className="h-4 w-4 text-blue-600" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Kopiuj link do wyniku uczestnika</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
