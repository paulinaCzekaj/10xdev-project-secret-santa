import React from "react";

interface ElfHelpSectionProps {
  helpedParticipantName: string;
  helpedParticipantId: number;
  groupId: number;
  isAuthenticated?: boolean;
  accessToken?: string;
}

/**
 * Help section for participants who are elves
 * Allows them to view the result of the participant they are helping
 */
export default function ElfHelpSection({
  helpedParticipantName,
  helpedParticipantId: _helpedParticipantId, // eslint-disable-line @typescript-eslint/no-unused-vars
  groupId,
  isAuthenticated = false,
  accessToken,
}: ElfHelpSectionProps) {
  const handleViewResult = () => {
    // Navigate to elf result page
    const url = isAuthenticated ? `/groups/${groupId}/elf-result` : `/elf-results/${accessToken}`;
    window.location.href = url;
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="text-4xl">🎅</div>
        <div className="flex-1 space-y-3">
          <h3 className="text-lg font-semibold text-green-900">
            Jesteś świątecznym elfem dla {helpedParticipantName}! 🎄
          </h3>
          <p className="text-sm text-green-800">
            W magicznej pracowni Świętego Mikołaja został Ci przydzielony specjalny pomocniczy task! Możesz zajrzeć do
            wyniku losowania {helpedParticipantName} i pomóc w wyborze idealnego prezentu gwiazdkowego.
          </p>
          <button
            onClick={handleViewResult}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 cursor-pointer"
          >
            Zobacz wynik {helpedParticipantName} 🎅
          </button>
        </div>
      </div>
    </div>
  );
}
