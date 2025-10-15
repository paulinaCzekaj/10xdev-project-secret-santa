import { memo } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Gift } from "lucide-react";

interface AssignedPersonCardProps {
  person: {
    id: number;
    name: string;
    initials: string;
  };
}

/**
 * Karta wyświetlająca informacje o wylosowanej osobie
 * Pokazuje avatar z inicjałami i imię w atrakcyjnym layout
 */
function AssignedPersonCard({ person }: AssignedPersonCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-8 relative">
      {/* Świąteczne dekoracje */}
      <div className="absolute -top-2 -left-2 text-3xl animate-pulse">❄️</div>
      <div className="absolute -top-2 -right-2 text-3xl animate-pulse" style={{ animationDelay: '0.5s' }}>❄️</div>

      {/* Avatar z inicjałami i gift badge */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-green-400 rounded-full animate-pulse opacity-20 blur-xl"></div>
        <Avatar className="w-28 h-28 border-4 border-white shadow-2xl relative z-10">
          <AvatarFallback className="text-4xl font-bold bg-red-600 text-white">
            {person.initials}
          </AvatarFallback>
        </Avatar>
        {/* Gift icon badge */}
        <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border-3 border-green-200 z-20">
          <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center">
            <Gift className="w-5 h-5 text-white" />
          </div>
        </div>
      </div>

      {/* Name with elegant typography */}
      <div className="text-center space-y-3 max-w-md">
        <h2 className="text-5xl font-semibold text-red-600 dark:text-red-400 drop-shadow-sm" style={{ fontFamily: 'Brush Script MT, cursive' }}>
          {person.name}
        </h2>
        <div className="bg-gradient-to-r from-red-50 to-green-50 dark:from-red-950 dark:to-green-950 border-2 border-dashed border-red-300 dark:border-red-700 rounded-lg p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            🤫 <strong>Psst... To nasza mała świąteczna tajemnica!</strong><br/>
            Zachowaj to dla siebie i przygotuj się na rozesłanie prawdziwej świątecznej magii.
            Czas sprawić, by te Święta były niezapomniane! 🎄✨
          </p>
        </div>
      </div>
    </div>
  );
}

export default memo(AssignedPersonCard);
