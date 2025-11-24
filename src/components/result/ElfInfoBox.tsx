import React from "react";

interface ElfInfoBoxProps {
  elfName: string;
}

/**
 * Info box showing that the participant has an elf assigned
 * Displays information about their helper
 */
export default function ElfInfoBox({ elfName }: ElfInfoBoxProps) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🎄</span>
        <div>
          <p className="text-sm font-medium text-blue-900">
            Twój pomocnik: {elfName}
          </p>
          <p className="text-xs text-blue-700">
            {elfName} może zobaczyć kogo wylosowałeś i pomóc Ci w wyborze prezentu
          </p>
        </div>
      </div>
    </div>
  );
}
