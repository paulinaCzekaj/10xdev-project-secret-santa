import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { useRevealState } from "@/hooks/useRevealState";
import { Sparkles } from "lucide-react";
import AssignedPersonCard from "./AssignedPersonCard";

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
export default function ResultReveal({
  assignedPerson,
  participantId,
  groupId
}: ResultRevealProps) {
  const { isRevealed, reveal } = useRevealState(groupId, participantId);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  // Sprawdzamy dostępność window (SSR safe)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const updateSize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  // Sprawdzamy czy użytkownik prefers-reduced-motion
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Funkcja odkrycia wyniku
  const handleReveal = useCallback(() => {
    if (isRevealed || isAnimating) return;

    setIsAnimating(true);

    // Animacja odkrycia
    setTimeout(() => {
      reveal(); // Zapisuje w localStorage
      setIsAnimating(false);

      // Uruchamiamy konfetti jeśli użytkownik nie prefers-reduced-motion
      if (!prefersReducedMotion) {
        setShowConfetti(true);
        // Wyłączamy konfetti po 3 sekundach
        setTimeout(() => setShowConfetti(false), 3000);
      }
    }, 800); // Czas animacji prezentu
  }, [isRevealed, isAnimating, reveal, prefersReducedMotion]);

  // Konfetti (jeśli aktywne)
  const ConfettiComponent = showConfetti && (
    <Suspense fallback={null}>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={300}
        gravity={0.3}
        colors={['#dc2626', '#16a34a', '#fbbf24', '#ef4444', '#22c55e']}
      />
    </Suspense>
  );

  // Jeśli wynik już odkryty, pokazujemy kartę od razu
  if (isRevealed) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {ConfettiComponent}

        <div className="text-center py-8 px-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Twój los padł na...
          </h2>

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            🎄 Odkryj wynik losowania 🎄
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Kliknij w prezent, aby zobaczyć, kogo wylosowałeś!
          </p>
        </div>

        {/* Kontener prezentu */}
        <div className="relative inline-block">
          {/* Prezent z animacją */}
          <div
            className={`relative cursor-pointer transform transition-all duration-700 ease-out
              ${isAnimating ? 'scale-110 rotate-12 opacity-50' : 'hover:scale-105 hover:rotate-3'}`}
            onClick={handleReveal}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleReveal();
              }
            }}
            tabIndex={0}
            role="button"
            aria-label="Kliknij, aby odkryć wynik losowania"
          >
            {/* Pudełko prezentu - świąteczne kolory */}
            <div className="w-32 h-32 bg-red-600 rounded-lg shadow-lg relative">
              {/* Wstążka pozioma */}
              <div className="absolute top-1/2 left-0 right-0 h-3 bg-yellow-400 rounded-full transform -translate-y-1/2"></div>
              {/* Wstążka pionowa */}
              <div className="absolute left-1/2 top-0 bottom-0 w-3 bg-yellow-400 rounded-full transform -translate-x-1/2"></div>

              {/* Kokarda */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-yellow-400 rounded-full border-2 border-yellow-300"></div>
            </div>

            {/* Cień */}
            <div className="w-32 h-3 bg-black bg-opacity-10 rounded-full mt-2 mx-auto blur"></div>
          </div>

          {/* Przycisk odkrycia (tylko jeśli nie animuje) */}
          {!isAnimating && (
            <div className="mt-8">
              <Button
                onClick={handleReveal}
                size="lg"
                className="bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg transform transition-all duration-200 hover:scale-105"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Kliknij, aby odkryć!
              </Button>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
                Zobacz, kogo wylosowałeś 🎁
              </p>
            </div>
          )}

          {/* Animacja odkrycia */}
          {isAnimating && (
            <div className="mt-8">
              <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-red-600 dark:text-red-400 font-semibold">
                Odkrywanie...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
