/**
 * Skeleton loading state for GroupView
 * Displays animated placeholders while group data is being fetched
 */
export function GroupViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Skeleton dla GroupHeader */}
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="flex gap-4">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-6 bg-gray-200 rounded w-28"></div>
          </div>
        </div>
      </div>

      {/* Skeleton dla sekcji */}
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
