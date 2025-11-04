import { memo } from "react";
import { useWishlistLinking } from "@/hooks/useWishlistLinking";
import { List } from "lucide-react";

interface WishlistDisplayProps {
  content?: string;
  contentHtml?: string; // z API (już z auto-linkowanymi URL-ami)
  personName: string;
}

/**
 * Komponent wyświetlający listę życzeń tylko do odczytu
 * Automatycznie konwertuje URL-e na klikalne linki
 */
function WishlistDisplay({ content, contentHtml, personName }: WishlistDisplayProps) {
  const { convertToHtml } = useWishlistLinking();

  // Jeśli API już zwróciło HTML, używamy go; w przeciwnym razie konwertujemy
  const htmlContent = contentHtml || (content ? convertToHtml(content) : "");

  // Jeśli nie ma treści, pokazujemy pusty stan
  if (!htmlContent) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-red-200 dark:border-red-700 p-6 relative overflow-hidden">
        {/* Świąteczne dekoracje w tle */}
        <div className="absolute top-0 right-0 text-6xl opacity-10 pointer-events-none">🎄</div>
        <div className="absolute bottom-0 left-0 text-4xl opacity-10 pointer-events-none">🎁</div>

        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-amber-500 rounded-lg shadow-sm">
              <List className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400">🎅 Lista życzeń: {personName}</h3>
          </div>

          {/* Empty state z świątecznym klimatem */}
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎁</div>
            <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Lista życzeń jest pusta</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
              {personName.split(" ")[0]} nie dodał{personName.includes("a") ? "a" : ""} jeszcze swoich życzeń. Wpadnij
              tu za jakiś czas lub zaskocz ich prezentem od serca! 🎄✨
            </p>
          </div>

          {/* Świąteczna wskazówka */}
          <div className="mt-6 pt-4 border-t border-red-200 dark:border-red-800">
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
              💡 Nie martw się - czasem najlepsze prezenty to te zaskakujące! 🎅
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-red-200 dark:border-red-700 p-6 relative overflow-hidden">
      {/* Świąteczne dekoracje w tle */}
      <div className="absolute top-0 right-0 text-6xl opacity-10 pointer-events-none">🎄</div>
      <div className="absolute bottom-0 left-0 text-4xl opacity-10 pointer-events-none">🎁</div>

      {/* Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center justify-center w-10 h-10 bg-amber-500 rounded-lg shadow-sm">
            <List className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-xl font-bold text-amber-600 dark:text-amber-400">🎅 Lista życzeń: {personName}</h3>
        </div>

        {/* Świąteczny intro text */}
        <div className="bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 p-3 mb-4 rounded">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            🎄 <strong>Ho ho ho!</strong> {personName.split(" ")[0]} przygotował{personName.includes("a") ? "a" : ""}{" "}
            dla Ciebie listę swoich świątecznych marzeń. Niech te pomysły pomogą Ci wybrać idealny prezent pod choinkę!
            🎁✨
          </p>
        </div>

        {/* Wishlist content as single element */}
        <div className="bg-gradient-to-r from-red-50 to-green-50 dark:from-red-950 dark:to-green-950 rounded-lg border border-red-100 dark:border-red-800 p-4">
          <div
            className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>

        {/* Świąteczna stopka */}
        <div className="mt-6 pt-4 border-t border-red-200 dark:border-red-800">
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 italic">
            ❄️ Pamiętaj: najważniejszy jest gest, nie wartość prezentu! ❄️
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(WishlistDisplay);
