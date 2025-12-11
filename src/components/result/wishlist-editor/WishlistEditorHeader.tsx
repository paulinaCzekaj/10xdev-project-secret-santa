/**
 * Nagłówek edytora listy życzeń
 */
export function WishlistEditorHeader() {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-10 h-10 bg-green-600 rounded-lg shadow-sm">
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
          />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-green-600 dark:text-green-400">🎁 Lista życzeń</h3>
    </div>
  );
}
