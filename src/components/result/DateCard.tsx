import { memo } from "react";
import { Calendar } from "lucide-react";

interface DateCardProps {
  endDate?: string;
  formattedEndDate?: string;
}

/**
 * Reusable card component displaying the event end date
 * Used in ResultView and ElfResultView
 */
function DateCard({ endDate, formattedEndDate }: DateCardProps) {
  const displayDate =
    formattedEndDate || (endDate ? new Date(endDate).toLocaleDateString("pl-PL") : "");

  return (
    <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900 dark:to-rose-900 rounded-lg p-4 border border-red-200 dark:border-red-700">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 bg-red-500 rounded-full">
          <Calendar className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Termin wymiany
          </p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            {displayDate}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(DateCard);
