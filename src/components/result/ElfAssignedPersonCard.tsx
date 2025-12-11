import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Gift } from "lucide-react";

interface ElfAssignedPersonCardProps {
  name: string;
  wishlistHtml: string;
  onHide?: () => void;
}

/**
 * Card displaying information about the person that the helped participant drew
 * Shows avatar with initials, name, and their wishlist
 * Used in the elf result view to show what the helped participant can see
 */
function ElfAssignedPersonCard({ name, wishlistHtml, onHide }: ElfAssignedPersonCardProps) {
  // Generate initials from name
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .substring(0, 2);

  return (
    <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 overflow-hidden">
      <div className="flex flex-col items-center gap-4 py-4">
        {/* Christmas decorations */}
        <div className="absolute -top-2 -left-2 text-3xl animate-pulse">❄️</div>
        <div className="absolute -top-2 -right-2 text-3xl animate-pulse" style={{ animationDelay: "0.5s" }}>
          ❄️
        </div>

        {/* Avatar with initials and gift badge */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-green-400 rounded-full animate-pulse opacity-20 blur-xl"></div>
          <Avatar className="w-24 h-24 border-4 border-white shadow-2xl relative z-10">
            <AvatarFallback className="text-3xl font-bold bg-red-500 text-white">{initials}</AvatarFallback>
          </Avatar>
          {/* Gift icon badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={onHide}
                  className="absolute -bottom-1 -right-1 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-green-200 z-20 hover:bg-gray-50 transition-colors cursor-pointer"
                  aria-label="Ukryj widok elfa"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors">
                    <Gift className="w-4 h-4 text-white" />
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Kliknij, aby ponownie ukryć tajemnicę</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Name with elegant typography */}
        <div className="text-center space-y-2 max-w-md">
          <h3 className="text-4xl font-bold text-red-500 dark:text-red-400 drop-shadow-sm">{name}</h3>
        </div>
      </div>

      {/* Wishlist section */}
      {wishlistHtml && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
            <span>🎁</span>
            Lista życzeń
          </h4>
          <div
            className="prose prose-sm dark:prose-invert max-w-full text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words overflow-wrap-anywhere"
            dangerouslySetInnerHTML={{ __html: wishlistHtml }}
          />
        </div>
      )}

      {!wishlistHtml && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center italic">
            Ta osoba nie dodała jeszcze listy życzeń
          </p>
        </div>
      )}
    </div>
  );
}

export default memo(ElfAssignedPersonCard);
