import { memo } from "react";
import BudgetCard from "./BudgetCard";
import DateCard from "./DateCard";

interface GroupInfoCardProps {
  groupName: string;
  budget?: number;
  formattedBudget?: string;
  endDate?: string;
  formattedEndDate?: string;
  statusBadge?: React.ReactNode; // Optional badge shown below the title (only in ResultView)
}

/**
 * Shared component displaying group information
 * Shows group name with Christmas emoji, budget and end date cards
 * Used in both ResultView (via ResultHeader) and ElfResultView
 */
function GroupInfoCard({
  groupName,
  budget,
  formattedBudget,
  endDate,
  formattedEndDate,
  statusBadge,
}: GroupInfoCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-red-500 dark:text-red-400 mb-2">
          🎅 {groupName}
        </h1>
        {statusBadge && statusBadge}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BudgetCard budget={budget} formattedBudget={formattedBudget} />
        <DateCard endDate={endDate} formattedEndDate={formattedEndDate} />
      </div>
    </div>
  );
}

export default memo(GroupInfoCard);
