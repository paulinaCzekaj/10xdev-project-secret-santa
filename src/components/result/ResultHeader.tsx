import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, Gift } from "lucide-react";

interface ResultHeaderProps {
  group: {
    id: number;
    name: string;
    formattedBudget: string;
    formattedEndDate: string;
    isExpired: boolean;
    daysUntilEnd: number;
  };
  isAuthenticated: boolean;
}

/**
 * Nagłówek widoku wyniku zawierający breadcrumb i informacje o grupie
 * Responsywny design z informacjami o budżecie i terminie
 */
function ResultHeader({ group, isAuthenticated }: ResultHeaderProps) {
  // Breadcrumb tylko dla zalogowanych użytkowników
  const Breadcrumb = () => {
    if (!isAuthenticated) return null;

    return (
      <nav className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <a href="/" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          Home
        </a>
        <span className="text-gray-400">/</span>
        <a href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          Pulpit
        </a>
        <span className="text-gray-400">/</span>
        <a href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          Grupy
        </a>
        <span className="text-gray-400">/</span>
        <a href={`/groups/${group.id}`} className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          {group.name}
        </a>
        <span className="text-gray-400">/</span>
        <span className="text-gray-900 dark:text-gray-100 font-medium">Wynik</span>
      </nav>
    );
  };

  // Status badge dla grupy
  const StatusBadge = () => {
    if (group.isExpired) {
      return (
        <Badge variant="destructive" className="text-xs">
          Wydarzenie zakończone
        </Badge>
      );
    }

    if (group.daysUntilEnd <= 7) {
      return (
        <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
          Pozostało {group.daysUntilEnd} {group.daysUntilEnd === 1 ? 'dzień' : 'dni'}
        </Badge>
      );
    }

    return (
      <Badge variant="secondary" className="text-xs">
        Aktywne
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <Breadcrumb />

      {/* Event Card - czytelny design */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">
            🎅 {group.name}
          </h1>
          <StatusBadge />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Budżet */}
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
                  {group.formattedBudget}
                </p>
              </div>
            </div>
          </div>

          {/* Data zakończenia */}
          <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900 dark:to-rose-900 rounded-lg p-4 border border-red-200 dark:border-red-700">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-12 h-12 bg-red-600 rounded-full">
                <Calendar className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Termin wymiany
                </p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                  {group.formattedEndDate}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ResultHeader);
