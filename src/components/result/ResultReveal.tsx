import { useCallback, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import AssignedPersonCard from "./AssignedPersonCard";
import { GiftBox } from "./GiftBox";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";
import { useRevealTracking } from "@/hooks/useRevealTracking";
import { useConfetti } from "@/hooks/useConfetti";

// Lazy load Confetti component for better performance
const Confetti = lazy(() => import("react-confetti"));

/**
 * Interaktywny komponent odkrywania wyniku losowania
 * Zawiera animowany prezent, przycisk odkrycia, konfetti i kartę wyniku
 */
interface ResultRevealProps {
  assignedPerson: {
    id: number;
    name: string;
    initials: string;
  };
  participantName: string;
  participantId: number;
  groupId: number;
  resultViewedAt?: string;
  isRevealed: boolean;
  onReveal: () => void;
  accessToken?: string; // For token-based access
}

export default function ResultReveal({
  assignedPerson,
  participantName,
  participantId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  groupId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  resultViewedAt,
  isRevealed,
  onReveal,
  accessToken,
}: ResultRevealProps) {
  // Sprawdzamy czy użytkownik prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Custom hooks dla separacji odpowiedzialności
  const { trackReveal } = useRevealTracking({ participantId, accessToken });
  const { showConfetti, triggerConfetti, windowSize, confettiConfig } = useConfetti();

  const handleRevealComplete = useCallback(() => {
    // Najpierw aktualizujemy stan UI
    onReveal();

    // Następnie wywołujemy API do zapisania w bazie danych (non-blocking)
    trackReveal();

    // Uruchamiamy konfetti jeśli użytkownik nie prefers-reduced-motion
    if (!prefersReducedMotion) {
      triggerConfetti();
    }
  }, [onReveal, trackReveal, triggerConfetti, prefersReducedMotion]);

  const { isAnimating, startAnimation } = useRevealAnimation({
    isRevealed,
    onRevealComplete: handleRevealComplete,
    animationDuration: 800,
  });

  const handleReveal = useCallback(() => {
    startAnimation();
  }, [startAnimation]);

  // Render konfetti jeśli aktywne
  const ConfettiComponent = showConfetti ? (
    <Suspense fallback={null}>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={confettiConfig.numberOfPieces}
        gravity={confettiConfig.gravity}
        colors={confettiConfig.colors}
      />
    </Suspense>
  ) : null;

  // Jeśli wynik już odkryty, pokazujemy kartę od razu
  if (isRevealed) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {ConfettiComponent}

        <div className="text-center py-8 px-6">
          <div className="mb-4">
            <span className="text-4xl">🎄</span>
          </div>
          <h2 className="text-2xl font-bold text-red-500 dark:text-red-400 mb-6">🎅 {participantName}, Twój los padł na... 🎅</h2>

          {/* Karta wylosowanej osoby */}
          <AssignedPersonCard person={assignedPerson} />
        </div>
      </div>
    );
  }

  // Animowany prezent do odkrycia
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {ConfettiComponent}

      <div className="text-center py-12 px-6">
        <div className="mb-6">
          <h2 className="text-3xl font-bold text-red-500 dark:text-red-400 mb-2">🎄 Odkryj wynik losowania! 🎄</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            🎅 Kliknij w świąteczny prezent, aby zobaczyć, komu kupujesz prezent! 🎅
          </p>
        </div>

        {/* Główny kontener - prezent i przycisk jeden pod drugim */}
        <div className="flex flex-col items-center space-y-8">
          {/* Prezent z animacją */}
          <GiftBox isAnimating={isAnimating} onClick={handleReveal} />

          {/* Przycisk odkrycia (tylko jeśli nie animuje) */}
          {!isAnimating && (
            <div className="flex flex-col items-center space-y-4">
              <Button
                onClick={handleReveal}
                size="lg"
                className="bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 text-white font-bold px-8 py-3 rounded-full shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-red-500/25 border-2 border-red-400"
              >
                <Sparkles className="w-6 h-6 mr-3 animate-pulse" />
                Kliknij, aby odkryć!
              </Button>

              {/* Tekst pod przyciskiem */}
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Zobacz, kogo wylosowałeś 🎁</p>
            </div>
          )}

          {/* Animacja odkrycia */}
          {isAnimating && (
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-blue-600 dark:text-blue-400 font-semibold">Odkrywanie...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
