import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Eye, Calendar, Users, Gift, FileCheck } from "lucide-react";
import { formatDate } from "@/lib/utils/formatters";
import type { ParticipantListItemDTO } from "@/types";

interface ResultsSectionProps {
  groupId: number;
  drawnAt: string | null;
  participants: ParticipantListItemDTO[];
  isParticipant: boolean;
  isCreator: boolean;
}

export function ResultsSection({ groupId, drawnAt, participants, isParticipant, isCreator }: ResultsSectionProps) {
  const handleViewResult = () => {
    // Przekierowanie do strony z wynikiem
    window.location.href = `/groups/${groupId}/result`;
  };

  // Obliczanie statystyk
  const stats = {
    totalParticipants: participants.length,
    withWishlists: participants.filter((p) => p.has_wishlist).length,
    viewedResults: participants.filter((p) => p.result_viewed).length,
  };

  const wishlistPercentage =
    stats.totalParticipants > 0 ? Math.round((stats.withWishlists / stats.totalParticipants) * 100) : 0;
  const viewedPercentage =
    stats.totalParticipants > 0 ? Math.round((stats.viewedResults / stats.totalParticipants) * 100) : 0;

  return (
    <section>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Losowanie wykonane
          </CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Data przeprowadzenia losowania: {drawnAt ? formatDate(drawnAt) : "Nieznana"}</span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Statystyki grupy */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{stats.totalParticipants}</p>
                <p className="text-sm text-muted-foreground">uczestników</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-600">
                <Gift className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">
                  {stats.withWishlists} ({wishlistPercentage}%)
                </p>
                <p className="text-sm text-muted-foreground">ma listy życzeń</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600">
                <FileCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">
                  {stats.viewedResults} ({viewedPercentage}%)
                </p>
                <p className="text-sm text-muted-foreground">przeczytało wyniki</p>
              </div>
            </div>
          </div>

          {/* Informacje dla twórcy */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Dla twórcy grupy:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Uczestnicy mogą teraz zobaczyć swoje wyniki losowania</li>
              <li>• Sprawdź czy wszyscy otrzymali powiadomienia</li>
              <li>• Uczestnicy bez konta mają unikalne linki dostępu</li>
              <li>• Możesz skopiować linki dostępu dla każdego uczestnika</li>
            </ul>
          </div>

          {/* Przycisk zobaczenia wyniku */}
          {(isParticipant || isCreator) && (
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6 bg-green-50 border border-green-200 rounded-lg">
              <div>
                <h3 className="font-medium text-green-900 mb-1">Twój wynik losowania</h3>
                <p className="text-sm text-green-800">Zobacz komu masz kupić prezent i czyją listę życzeń sprawdzić.</p>
              </div>

              <Button
                onClick={handleViewResult}
                size="lg"
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
              >
                <Eye className="h-5 w-5" />
                Zobacz mój wynik
              </Button>
            </div>
          )}

          {/* Informacje dla uczestników bez dostępu */}
          {!isParticipant && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-amber-900 mb-2">Informacje dla uczestników:</h3>
              <p className="text-sm text-amber-800">
                Jeśli jesteś uczestnikiem tej grupy, powinieneś otrzymać wiadomość email z linkiem do swojego wyniku
                losowania. Sprawdź swoją skrzynkę odbiorczą (w tym folder spam).
              </p>
            </div>
          )}

          {/* Dodatkowe informacje */}
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">🎄 Wesołych Świąt i udanych zakupów! 🎄</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pamiętaj o limicie budżetu i sprawdź listy życzeń przed zakupami.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
