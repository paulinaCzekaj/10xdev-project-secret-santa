import { memo } from "react";
import { DollarSign } from "lucide-react";

interface BudgetCardProps {
  budget?: number;
  formattedBudget?: string;
}

/**
 * Reusable card component displaying the gift budget
 * Used in ResultView and ElfResultView
 */
function BudgetCard({ budget, formattedBudget }: BudgetCardProps) {
  const displayBudget = formattedBudget || (budget ? `${budget} PLN` : "");

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900 dark:to-emerald-900 rounded-lg p-4 border border-green-200 dark:border-green-700">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-12 h-12 bg-green-600 rounded-full">
          <DollarSign className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Budżet prezentu
          </p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            {displayBudget}
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(BudgetCard);
