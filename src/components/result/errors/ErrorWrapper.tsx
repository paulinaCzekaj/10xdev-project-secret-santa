/**
 * Wspólny wrapper dla wszystkich komponentów błędów
 * Zapewnia spójny wygląd i centrowanie zawartości
 */
export function ErrorWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
      <div className="text-center max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        {children}
      </div>
    </div>
  );
}
