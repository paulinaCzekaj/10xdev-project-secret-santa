import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Mail, User } from "lucide-react";
import { toast } from "sonner";
import type { AddParticipantFormViewModel, ParticipantWithTokenDTO } from "@/types";

// Schema walidacji dla formularza dodawania uczestnika
const addParticipantFormSchema = z.object({
  name: z
    .string()
    .min(2, "Imię musi mieć co najmniej 2 znaki")
    .max(50, "Imię nie może przekraczać 50 znaków"),
  email: z
    .string()
    .email("Niepoprawny format adresu email")
    .optional()
    .or(z.literal("")),
});

interface AddParticipantFormProps {
  groupId: number;
  onSuccess: (participant: ParticipantWithTokenDTO) => void;
}

export function AddParticipantForm({ groupId, onSuccess }: AddParticipantFormProps) {
  const form = useForm<AddParticipantFormViewModel>({
    resolver: zodResolver(addParticipantFormSchema),
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (values: AddParticipantFormViewModel) => {
    try {
      // Tutaj będzie wywołanie API
      // const response = await fetch(`/api/groups/${groupId}/participants`, {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     // Authorization header
      //   },
      //   body: JSON.stringify({
      //     name: values.name,
      //     email: values.email || undefined,
      //   }),
      // });

      // const participant: ParticipantWithTokenDTO = await response.json();

      // Na razie symuluję odpowiedź API
      const participant: ParticipantWithTokenDTO = {
        id: Math.random(),
        group_id: groupId,
        user_id: null, // niezarejestrowany użytkownik
        name: values.name,
        email: values.email || null,
        access_token: `token_${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Kopiuj link do schowka jeśli uczestnik jest niezarejestrowany
      if (participant.access_token) {
        const link = `${window.location.origin}/results/${participant.access_token}`;
        try {
          await navigator.clipboard.writeText(link);
          toast.success("Uczestnik dodany. Link dostępu skopiowany do schowka.");
        } catch (error) {
          toast.success("Uczestnik dodany. Nie udało się skopiować linku.");
          console.error("Failed to copy to clipboard:", error);
        }
      }

      form.reset();
      onSuccess(participant);
    } catch (error) {
      console.error("Błąd podczas dodawania uczestnika:", error);
      toast.error("Nie udało się dodać uczestnika. Spróbuj ponownie.");
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Imię i nazwisko
              </Label>
              <Input
                id="name"
                placeholder="np. Jan Kowalski"
                {...form.register("name")}
                className={form.formState.errors.name ? "border-destructive" : ""}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email (opcjonalny)
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="jan.kowalski@example.com"
                {...form.register("email")}
                className={form.formState.errors.email ? "border-destructive" : ""}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Email jest opcjonalny. Uczestnicy bez konta otrzymają link dostępu.
            </p>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              {form.formState.isSubmitting ? "Dodawanie..." : "Dodaj uczestnika"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
