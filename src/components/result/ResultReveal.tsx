import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import AssignedPersonCard from "./AssignedPersonCard";
import { GiftBox } from "./GiftBox";

// Lazy load Confetti component for better performance
const Confetti = lazy(() => import("react-confetti"));

interface ResultRevealProps {
  assignedPerson: {
    id: number;
    name: string;
    initials: string;
  };
  participantId: number;
  groupId: number;
}

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
  participantId: number;
  groupId: number;
  resultViewedAt?: string;
  isRevealed: boolean;
  onReveal: () => void;
  accessToken?: string; // For token-based access
}

export default function ResultReveal({
  assignedPerson,
  participantId,
  groupId,
  resultViewedAt,
  isRevealed,
  onReveal,
  accessToken,
}: ResultRevealProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Sprawdzamy dostępność window (SSR safe)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateSize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, []);

  // Sprawdzamy czy użytkownik prefers-reduced-motion
  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Funkcja odkrycia wyniku
  const handleReveal = useCallback(async () => {
    if (isRevealed || isAnimating) return;

    setIsAnimating(true);

    // Animacja odkrycia
    setTimeout(async () => {
      // Najpierw aktualizujemy stan UI
      onReveal();

      // Następnie wywołujemy API do zapisania w bazie danych
      try {
        const url = accessToken
          ? `/api/participants/${participantId}/reveal?token=${accessToken}`
          : `/api/participants/${participantId}/reveal`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          console.warn("Failed to track result reveal, but continuing with UI update");
        }
      } catch (error) {
        console.warn("Error tracking result reveal:", error);
        // Continue with UI update even if tracking fails
      }

      setIsAnimating(false);

      // Uruchamiamy konfetti jeśli użytkownik nie prefers-reduced-motion
      if (!prefersReducedMotion) {
        setShowConfetti(true);
        // Wyłączamy konfetti po 3 sekundach
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }, 800); // Czas animacji prezentu
  }, [isRevealed, isAnimating, onReveal, participantId, accessToken, prefersReducedMotion]);

  // Konfetti (jeśli aktywne)
  const ConfettiComponent = showConfetti && (
    <Suspense fallback={null}>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={300}
        gravity={0.3}
        colors={["#dc2626", "#16a34a", "#fbbf24", "#ef4444", "#22c55e"]}
      />
    </Suspense>
  );

  // Jeśli wynik już odkryty, pokazujemy kartę od razu
  if (isRevealed) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {ConfettiComponent}

        <div className="text-center py-8 px-6">
          <div className="mb-4">
            <span className="text-4xl">🎄</span>
          </div>
          <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-6">🎅 Twój los padł na... 🎅</h2>

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
          <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">🎄 Odkryj wynik losowania! 🎄</h2>
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
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-red-600 dark:text-red-400 font-semibold">Odkrywanie...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
