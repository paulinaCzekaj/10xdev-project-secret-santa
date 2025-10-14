import { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, ArrowLeft, Home, Search, Shield, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useResultData } from "@/hooks/useResultData";
import ResultHeader from "./ResultHeader";
import ResultReveal from "./ResultReveal";
import WishlistSection from "./WishlistSection";

interface ResultViewProps {
  groupId?: number;
  token?: string;
  isAuthenticated?: boolean;
}

/**
 * Główny kontener widoku wyniku Secret Santa
 * Koordynuje wszystkie komponenty i zarządza stanem aplikacji
 */
export default function ResultView({ groupId, token, isAuthenticated = false }: ResultViewProps) {
  const { result, isLoading, error, refetch } = useResultData(groupId, token, isAuthenticated);
  const [isRevealed, setIsRevealed] = useState(false);

  // Update isRevealed when result loads
  useEffect(() => {
    if (result?.resultViewedAt) {
      setIsRevealed(true);
    }
  }, [result?.resultViewedAt]);

  // Helper function to wrap content in background
  const ErrorWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="text-center max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        {children}
      </div>
    </div>
  );

  // Komponent ładowania
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Ładowanie wyników...</h3>
          <p className="text-gray-600 dark:text-gray-400">Sprawdzamy wyniki losowania</p>
        </div>
      </div>
    );
  }

  // Komponenty błędów
  if (error) {
    // Błąd: Losowanie nie zostało przeprowadzone
    if (error.code === "DRAW_NOT_COMPLETED") {
      return (
        <ErrorWrapper>
          <div className="mb-6">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Losowanie nie zostało przeprowadzone
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Losowanie dla tej grupy nie zostało jeszcze przeprowadzone. Skontaktuj się z organizatorem grupy.
          </p>
          <Button onClick={() => (window.location.href = "/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do pulpitu
          </Button>
        </ErrorWrapper>
      );
    }

    // Błąd: Brak autoryzacji
    if (error.code === "UNAUTHORIZED") {
      return (
        <ErrorWrapper>
          <div className="mb-6">
            <Shield className="w-16 h-16 text-red-500 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Brak autoryzacji</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isAuthenticated
              ? "Nie masz uprawnień do zobaczenia tego wyniku. Zaloguj się ponownie."
              : "Twój link dostępu może być nieprawidłowy lub wygasły."}
          </p>
          <Button onClick={() => (window.location.href = isAuthenticated ? "/login" : "/")}>
            {isAuthenticated ? "Zaloguj się" : "Strona główna"}
          </Button>
        </ErrorWrapper>
      );
    }

    // Błąd: Brak dostępu (nie jesteś uczestnikiem)
    if (error.code === "FORBIDDEN") {
      return (
        <ErrorWrapper>
          <div className="mb-6">
            <Shield className="w-16 h-16 text-red-500 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Brak dostępu</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Nie jesteś uczestnikiem tej grupy i nie możesz zobaczyć wyniku losowania.
          </p>
          <Button onClick={() => (window.location.href = "/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do pulpitu
          </Button>
        </ErrorWrapper>
      );
    }

    // Błąd: Nieprawidłowy token
    if (error.code === "INVALID_TOKEN") {
      return (
        <ErrorWrapper>
          <div className="mb-6">
            <Search className="w-16 h-16 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Link wygasł lub jest nieprawidłowy
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Ten link dostępu jest nieprawidłowy lub wygasł. Skontaktuj się z organizatorem grupy, aby otrzymać nowy
            link.
          </p>
          <Button onClick={() => (window.location.href = "/")}>
            <Home className="mr-2 h-4 w-4" />
            Strona główna
          </Button>
        </ErrorWrapper>
      );
    }

    // Błąd: Grupa nie istnieje
    if (error.code === "GROUP_NOT_FOUND") {
      return (
        <ErrorWrapper>
          <div className="mb-6">
            <Search className="w-16 h-16 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Nie znaleziono grupy</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Grupa o podanym ID nie istnieje lub została usunięta.</p>
          <Button onClick={() => (window.location.href = "/dashboard")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Powrót do pulpitu
          </Button>
        </ErrorWrapper>
      );
    }

    // Błąd: Problem z połączeniem
    if (error.code === "NETWORK_ERROR") {
      return (
        <ErrorWrapper>
          <div className="mb-6">
            <WifiOff className="w-16 h-16 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Problem z połączeniem</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Nie można połączyć się z serwerem. Sprawdź swoje połączenie internetowe i spróbuj ponownie.
          </p>
          <Button onClick={refetch}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Spróbuj ponownie
          </Button>
        </ErrorWrapper>
      );
    }

    // Ogólny błąd
    return (
      <ErrorWrapper>
        <div className="mb-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Coś poszło nie tak</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {error.message || "Wystąpił nieoczekiwany błąd. Spróbuj odświeżyć stronę."}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={refetch} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Spróbuj ponownie
          </Button>
          <Button onClick={() => window.location.reload()}>Odśwież stronę</Button>
        </div>
      </ErrorWrapper>
    );
  }

  // Brak danych - nie powinno się zdarzyć, ale obsługujemy
  if (!result) {
    return (
      <ErrorWrapper>
        <div className="mb-6">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Brak danych</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Nie udało się załadować danych wyniku. Spróbuj ponownie.
        </p>
        <Button onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Załaduj ponownie
        </Button>
      </ErrorWrapper>
    );
  }

  // Główny widok sukcesu
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-100 via-green-50 to-blue-100 dark:from-red-950 dark:via-green-950 dark:to-blue-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Nagłówek */}
        <ResultHeader
          group={{
            id: result.group.id,
            name: result.group.name,
            formattedBudget: result.formattedBudget,
            formattedEndDate: result.formattedEndDate,
            isExpired: result.isExpired,
            daysUntilEnd: result.daysUntilEnd,
          }}
          isAuthenticated={result.isAuthenticated}
        />

        {/* Sekcja odkrywania wyniku */}
        <ResultReveal
          assignedPerson={{
            id: result.assigned_to.id,
            name: result.assigned_to.name,
            initials: result.assignedPersonInitials,
          }}
          participantId={result.participant.id}
          groupId={result.group.id}
          resultViewedAt={result.participant.result_viewed_at}
          isRevealed={isRevealed}
          onReveal={() => setIsRevealed(true)}
          accessToken={result.accessToken}
        />

        {/* Sekcja list życzeń - widoczna tylko po odkryciu prezentu */}
        {isRevealed && (
          <WishlistSection
            myWishlist={result.my_wishlist}
            theirWishlist={result.assigned_to}
            assignedPersonName={result.assigned_to.name}
            participantId={result.participant.id}
            groupEndDate={result.group.end_date}
            accessToken={result.accessToken}
          />
        )}
      </div>
    </div>
  );
}
