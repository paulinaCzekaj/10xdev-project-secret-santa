/**
 * Empty state for GroupView
 * Displays when group is not found or user has no access
 */
export function GroupViewEmpty() {
  return (
    <div className="text-center py-12">
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Grupa nie została znaleziona</h3>
      <p className="text-gray-600 mb-4">Grupa o podanym ID nie istnieje lub nie masz do niej dostępu.</p>
      <button
        onClick={() => (window.location.href = "/dashboard")}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        Powrót do dashboard
      </button>
    </div>
  );
}
