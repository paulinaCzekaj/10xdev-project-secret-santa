import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import GroupInfoCard from "./GroupInfoCard";

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
        <a href="/" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer">
          Home
        </a>
        <span className="text-gray-400">/</span>
        <a href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer">
          Pulpit
        </a>
        <span className="text-gray-400">/</span>
        <a href="/dashboard" className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer">
          Grupy
        </a>
        <span className="text-gray-400">/</span>
        <a
          href={`/groups/${group.id}`}
          className="hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
        >
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
        <Badge variant="secondary" className="text-xs">
          Wydarzenie zakończone
        </Badge>
      );
    }

    if (group.daysUntilEnd <= 7) {
      return (
        <Badge
          variant="secondary"
          className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
        >
          Pozostało {group.daysUntilEnd} {group.daysUntilEnd === 1 ? "dzień" : "dni"}
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
      <GroupInfoCard
        groupName={group.name}
        formattedBudget={group.formattedBudget}
        formattedEndDate={group.formattedEndDate}
        statusBadge={<StatusBadge />}
      />
    </div>
  );
}

export default memo(ResultHeader);
