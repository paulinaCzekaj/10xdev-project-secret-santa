import React from "react";

interface ElfRoleBannerProps {
  helpedParticipantName: string;
  variant: "own-result" | "elf-result";
}

/**
 * Banner showing that the user is an elf (helper) for another participant
 * Displays prominently to clarify the helper role
 */
export default function ElfRoleBanner({ helpedParticipantName, variant }: ElfRoleBannerProps) {
  const messages = {
    "own-result": {
      title: `Jesteś świątecznym elfem dla ${helpedParticipantName}! 🎄`,
      description: `Jako pomocnik z pracowni Świętego Mikołaja możesz zobaczyć kogo ${helpedParticipantName} wylosował/a i pomóc w wyborze idealnego prezentu gwiazdkowego ✨`,
    },
    "elf-result": {
      title: `Pomagasz ${helpedParticipantName} jako świąteczny elf 🎅`,
      description: `To jest wynik losowania ${helpedParticipantName}. W magicznej pracowni Świętego Mikołaja możesz pomóc w wyborze odpowiedniego prezentu! 🎁`,
    },
  };

  const message = messages[variant];

  return (
    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 sm:p-6 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🎅</span>
        <div className="flex-1">
          <p className="text-base font-semibold text-green-900 mb-1">{message.title}</p>
          <p className="text-sm text-green-700">{message.description}</p>
        </div>
      </div>
    </div>
  );
}
