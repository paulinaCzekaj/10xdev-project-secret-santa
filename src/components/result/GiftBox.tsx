/**
 * Animowany prezent świąteczny używany do odkrywania wyniku losowania
 * Zawiera interaktywne elementy i obsługę klawiszy dla dostępności
 */

interface GiftBoxProps {
  isAnimating: boolean;
  onClick: () => void;
}

export function GiftBox({ isAnimating, onClick }: GiftBoxProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Prevent click if already animating
    if (isAnimating) {
      e.stopPropagation();
      return;
    }
    onClick();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Prevent keypress if already animating
    if (isAnimating) {
      e.stopPropagation();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={`relative cursor-pointer transform transition-all duration-700 ease-out
        ${isAnimating ? "scale-110 rotate-12 opacity-50" : "hover:scale-110 hover:-translate-y-2"}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label="Kliknij, aby odkryć wynik losowania"
    >
      {/* Elegancki prezent */}
      <div className="relative">
        {/* Główna paczka */}
        <div className="w-36 h-28 bg-gradient-to-br from-red-400 via-red-500 to-red-600 rounded-xl shadow-2xl border-4 border-red-300 relative overflow-hidden">
          {/* Wzorek na papierze */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-2 left-2 w-3 h-3 bg-white/30 rounded-full"></div>
            <div className="absolute top-4 right-4 w-2 h-2 bg-white/20 rounded-full"></div>
            <div className="absolute bottom-3 left-6 w-2.5 h-2.5 bg-white/25 rounded-full"></div>
            <div className="absolute bottom-2 right-3 w-1.5 h-1.5 bg-white/35 rounded-full"></div>
          </div>

          {/* Wstążka pozioma */}
          <div className="absolute top-1/2 left-0 right-0 h-3 bg-gradient-to-r from-green-400 via-green-500 to-green-400 rounded-full shadow-md transform -translate-y-1/2"></div>

          {/* Wstążka pionowa */}
          <div className="absolute top-0 bottom-0 left-1/2 w-3 bg-gradient-to-b from-green-400 via-green-500 to-green-400 rounded-full shadow-md transform -translate-x-1/2"></div>

          {/* Kokarda */}
          <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full shadow-lg border-2 border-yellow-200 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
            <div className="w-3 h-3 bg-yellow-100 rounded-full shadow-inner"></div>
          </div>

          {/* Błyszczący efekt */}
          <div className="absolute top-3 right-6 w-3 h-3 bg-white/60 rounded-full blur-sm"></div>
          <div className="absolute bottom-4 left-4 w-2 h-2 bg-white/40 rounded-full blur-sm"></div>
        </div>

        {/* Cień pod prezentem */}
        <div className="absolute -bottom-2 left-1/2 w-32 h-4 bg-black/20 rounded-full blur-md transform -translate-x-1/2"></div>
      </div>

      {/* Efekt świetlny */}
      <div className="absolute -top-4 -left-4 w-40 h-40 bg-gradient-to-br from-yellow-200/20 via-yellow-100/5 to-transparent rounded-full pointer-events-none blur-lg"></div>
    </div>
  );
}
