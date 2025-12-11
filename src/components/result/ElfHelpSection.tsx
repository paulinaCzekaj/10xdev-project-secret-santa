import React, { useCallback } from "react";

interface ElfHelpSectionProps {
  helpedParticipantNames: string[];
  helpedParticipantIds: number[];
  groupId: number;
  isAuthenticated?: boolean;
  accessToken?: string;
}

/**
 * Help section for participants who are elves
 * Allows them to view the result of the participant they are helping
 */
export default function ElfHelpSection({
  helpedParticipantNames,
  helpedParticipantIds,
  groupId,
  isAuthenticated = false,
  accessToken,
}: ElfHelpSectionProps) {
  const handleViewResult = useCallback(
    (helpedParticipantId?: number) => {
      // Navigate to elf result page
      let url = isAuthenticated ? `/groups/${groupId}/elf-result` : `/elf-results/${accessToken}`;
      if (isAuthenticated && helpedParticipantId) {
        url += `?helpedParticipantId=${helpedParticipantId}`;
      }
      // eslint-disable-next-line react-compiler/react-compiler
      window.location.href = url;
    },
    [isAuthenticated, groupId, accessToken]
  );

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="text-4xl">🎅</div>
        <div className="flex-1 space-y-3">
          <h3 className="text-lg font-semibold text-green-900">
            Jesteś świątecznym elfem
            {helpedParticipantNames.length === 1
              ? ` dla ${helpedParticipantNames[0]}`
              : ` dla ${helpedParticipantNames.length} osób`}
            ! 🎄
          </h3>
          {helpedParticipantNames.length === 1 ? (
            <button
              className="text-sm text-green-800 cursor-pointer hover:text-green-900 transition-colors duration-200 bg-transparent border-none p-0 text-left"
              onClick={() => handleViewResult(helpedParticipantIds[0])}
              aria-label={`Zobacz wynik ${helpedParticipantNames[0]}`}
            >
              W magicznej pracowni Świętego Mikołaja został Ci przydzielony specjalny pomocniczy task! Możesz zajrzeć do
              wyników losowania {helpedParticipantNames[0]} i pomóc w wyborze idealnych prezentów gwiazdkowych.
            </button>
          ) : (
            <p className="text-sm text-green-800">
              W magicznej pracowni Świętego Mikołaja został Ci przydzielony specjalny pomocniczy task! Możesz zajrzeć do
              wyników losowania swoich podopiecznych i pomóc w wyborze idealnych prezentów gwiazdkowych.
            </p>
          )}
          {helpedParticipantNames.length === 1 ? (
            <button
              onClick={() => handleViewResult(helpedParticipantIds[0])}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 cursor-pointer"
            >
              Zobacz wynik {helpedParticipantNames[0]} 🎅
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-green-900">Wybierz osobę, której wynik chcesz zobaczyć:</p>
              {helpedParticipantNames.map((name, index) => (
                <button
                  key={helpedParticipantIds[index]}
                  onClick={() => handleViewResult(helpedParticipantIds[index])}
                  className="block w-full text-left px-3 py-2 bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 cursor-pointer"
                >
                  {name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
