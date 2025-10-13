import * as React from "react";
import { Plus, Users, Calendar, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Types for dashboard data
interface GroupListItemDTO {
  id: number;
  name: string;
  description?: string;
  budget?: number;
  end_date?: string;
  participant_count: number;
  creator_name: string;
  is_creator: boolean;
}

interface DashboardProps {
  user: {
    id: string;
    email: string;
  };
  createdGroups: GroupListItemDTO[];
  joinedGroups: GroupListItemDTO[];
}

// Helper component for group card
function GroupCard({ group }: { group: GroupListItemDTO }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold text-gray-900 truncate">
          {group.name}
        </CardTitle>
        <CardDescription className="text-sm text-gray-600 line-clamp-2">
          {group.description || "Brak opisu"}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{group.participant_count} osób</span>
            </div>
            {group.budget && (
              <div className="flex items-center gap-1">
                <span>{group.budget} zł</span>
              </div>
            )}
          </div>
        </div>

        {group.end_date && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
            <Calendar className="h-4 w-4" />
            <span>Losowanie: {new Date(group.end_date).toLocaleDateString('pl-PL')}</span>
          </div>
        )}

        <Button
          asChild
          className="w-full bg-red-500 hover:bg-red-600 text-white"
          size="sm"
        >
          <a href={`/groups/${group.id}`}>
            {group.is_creator ? "Zarządzaj grupą" : "Zobacz szczegóły"}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

// Helper component for empty state
function EmptyState({
  title,
  description,
  actionText,
  actionHref
}: {
  title: string;
  description: string;
  actionText: string;
  actionHref: string;
}) {
  return (
    <div className="text-center py-12">
      <Trophy className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
      <Button asChild className="bg-red-500 hover:bg-red-600 text-white">
        <a href={actionHref}>{actionText}</a>
      </Button>
    </div>
  );
}

export default function Dashboard({ user, createdGroups, joinedGroups }: DashboardProps) {
  const hasCreatedGroups = createdGroups.length > 0;
  const hasJoinedGroups = joinedGroups.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-red-50">
      <div className="container mx-auto px-4 py-8 sm:py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 mb-4">
            Witaj, {user.email.split('@')[0]}! 🎄
          </h1>
          <p className="text-gray-600 text-sm sm:text-base max-w-2xl mx-auto">
            Zarządzaj swoimi grupami Secret Santa lub dołącz do nowych wydarzeń.
          </p>
        </div>

        <div className="space-y-8">
          {/* Created Groups Section */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Grupy, które stworzyłem</h2>
              <Button asChild className="bg-red-500 hover:bg-red-600 text-white">
                <a href="/groups/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Utwórz nową grupę
                </a>
              </Button>
            </div>

            {hasCreatedGroups ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {createdGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            ) : (
              <Card className="border-2 border-dashed border-gray-300">
                <CardContent className="pt-6">
                  <EmptyState
                    title="Nie masz jeszcze żadnych grup"
                    description="Rozpocznij przygodę z Secret Santa tworząc swoją pierwszą grupę! Zaproś przyjaciół i rodzinę na wymianę prezentów."
                    actionText="Utwórz pierwszą grupę"
                    actionHref="/groups/new"
                  />
                </CardContent>
              </Card>
            )}
          </section>

          {/* Joined Groups Section */}
          {hasJoinedGroups && (
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Grupy, do których należę
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {joinedGroups.map((group) => (
                  <GroupCard key={group.id} group={group} />
                ))}
              </div>
            </section>
          )}

          {/* Quick Stats */}
          {(hasCreatedGroups || hasJoinedGroups) && (
            <section className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Twoje statystyki</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{createdGroups.length}</div>
                  <div className="text-sm text-gray-600">Utworzonych grup</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{joinedGroups.length}</div>
                  <div className="text-sm text-gray-600">Dołączonych grup</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {createdGroups.length + joinedGroups.length}
                  </div>
                  <div className="text-sm text-gray-600">Razem grup</div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
