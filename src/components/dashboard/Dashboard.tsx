import * as React from "react";
import { Link } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface GroupListItemDTO {
  id: number;
  name: string;
  budget: number;
  end_date: string;
  participants_count: number;
  is_drawn: boolean;
  created_at: string;
}

interface DashboardProps {
  user: {
    id: string;
    email: string;
  };
  createdGroups: GroupListItemDTO[];
  joinedGroups: GroupListItemDTO[];
}

export default function Dashboard({ user, createdGroups, joinedGroups }: DashboardProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with welcome message */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Witaj, {user.email.split("@")[0]}!</h1>
        <p className="text-lg text-gray-600">Zarządzaj swoimi grupami Secret Santa i sprawdzaj wyniki losowań.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Created Groups Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🎄</span>
              Grupy, które stworzyłem
            </CardTitle>
            <CardDescription>Zarządzaj grupami, które utworzyłeś</CardDescription>
          </CardHeader>
          <CardContent>
            {createdGroups.length === 0 ? (
              <EmptyState
                title="Brak utworzonych grup"
                description="Utwórz swoją pierwszą grupę Secret Santa"
                action={
                  <Button asChild className="bg-red-500 hover:bg-red-600">
                    <a href="/groups/new">Utwórz nową grupę</a>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-4">
                {createdGroups.map((group) => (
                  <GroupCard key={group.id} group={group} isCreator={true} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Joined Groups Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🎁</span>
              Grupy, do których należę
            </CardTitle>
            <CardDescription>Grupy, do których zostałeś dodany przez innych organizatorów</CardDescription>
          </CardHeader>
          <CardContent>
            {joinedGroups.length === 0 ? (
              <EmptyState title="Brak grup" description="Nie należysz jeszcze do żadnej grupy" action={null} />
            ) : (
              <div className="space-y-4">
                {joinedGroups.map((group) => (
                  <GroupCard key={group.id} group={group} isCreator={false} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTA Section */}
      <div className="mt-12 text-center">
        <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-xl p-8 border border-red-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Gotowy na nowe losowanie?</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Utwórz nową grupę Secret Santa i zaproś swoich znajomych lub rodzinę.
          </p>
          <Button asChild size="lg" className="bg-red-500 hover:bg-red-600 text-white">
            <a href="/groups/new">
              <span className="mr-2">🎅</span>
              Utwórz nową grupę Secret Santa
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface GroupCardProps {
  group: GroupListItemDTO;
  isCreator: boolean;
}

function GroupCard({ group, isCreator }: GroupCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pl-PL", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pl-PL", {
      style: "currency",
      currency: "PLN",
    }).format(amount);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">{group.name}</h3>
          <p className="text-sm text-gray-500">{group.participants_count} uczestników</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-red-600">{formatCurrency(group.budget)}</p>
          <p className="text-xs text-gray-500">budżet</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Zakończenie:</span> {formatDate(group.end_date)}
        </div>
        <div className="flex gap-2">
          {group.is_drawn ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Wylosowano
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              W trakcie
            </span>
          )}
          <Button asChild variant="outline" size="sm">
            <a href={`/groups/${group.id}`}>{isCreator ? "Zarządzaj" : "Zobacz"}</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action: React.ReactNode | null;
}

function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      <div className="text-4xl mb-4">🎄</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-4">{description}</p>
      {action}
    </div>
  );
}
