import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { notify } from "@/lib/notifications";
import { useGroupData } from "@/hooks/useGroupData";
import { ResponsiveDialogFooter } from "@/components/ui/responsive-form";
import type { GroupViewModel, EditGroupFormViewModel, UpdateGroupCommand } from "@/types";

// Schema walidacji dla formularza edycji grupy
const editGroupFormSchema = z.object({
  name: z
    .string()
    .min(3, "Nazwa grupy musi mieć co najmniej 3 znaki")
    .max(50, "Nazwa grupy nie może przekraczać 50 znaków"),
  budget: z
    .number({
      required_error: "Budżet jest wymagany",
      invalid_type_error: "Budżet musi być liczbą",
    })
    .int("Budżet musi być liczbą całkowitą")
    .positive("Budżet musi być większy od 0"),
  end_date: z
    .date({
      required_error: "Data zakończenia jest wymagana",
    })
    .refine(
      (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
      },
      { message: "Data zakończenia musi być w przyszłości" }
    ),
});

interface GroupEditModalProps {
  group: GroupViewModel;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void; // Zmiana - tylko callback bez parametrów
}

export function GroupEditModal({ group, isOpen, onClose, onSave }: GroupEditModalProps) {
  const { updateGroup } = useGroupData(group.id);

  const form = useForm<EditGroupFormViewModel>({
    resolver: zodResolver(editGroupFormSchema),
    defaultValues: {
      name: group.name,
      budget: group.budget,
      end_date: new Date(group.end_date),
    },
  });

  // Aktualizuj wartości formularza gdy grupa się zmieni
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        name: group.name,
        budget: group.budget,
        end_date: new Date(group.end_date),
      });
    }
  }, [group, isOpen, form]);

  const onSubmit = async (values: EditGroupFormViewModel) => {
    try {
      const command: UpdateGroupCommand = {
        name: values.name,
        budget: values.budget,
        end_date: values.end_date.toISOString(),
      };

      const result = await updateGroup(command);

      if (result.success) {
        onSave();
        onClose();
      } else {
        notify.error({ title: result.error || "Nie udało się zaktualizować grupy" });
      }
    } catch (error) {
      console.error("Błąd podczas aktualizacji grupy:", error);
      notify.error("GROUP.UPDATE_ERROR");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj grupę</DialogTitle>
          <DialogDescription>Zmień podstawowe informacje o grupie Secret Santa.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nazwa grupy</FormLabel>
                  <FormControl>
                    <Input placeholder="np. Rodzina Kowalskich" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Budżet (PLN)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="100"
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="end_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data zakończenia</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                        >
                          {field.value ? format(field.value, "PPP", { locale: pl }) : <span>Wybierz datę</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date() || date < new Date("1900-01-01")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <ResponsiveDialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Anuluj
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
