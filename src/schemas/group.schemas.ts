import { z } from "zod";
import { isFutureDate } from "@/lib/validators/dateValidators";

/**
 * Zod schema for CreateGroupForm validation
 */
export const createGroupFormSchema = z.object({
  name: z
    .string()
    .min(3, "Nazwa loterii musi mieć co najmniej 3 znaki")
    .max(50, "Nazwa loterii nie może przekraczać 50 znaków"),
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
    .refine(isFutureDate, {
      message: "Data zakończenia musi być w przyszłości",
    }),
});

/**
 * Type inference from createGroupFormSchema
 */
export type CreateGroupFormViewModel = z.infer<typeof createGroupFormSchema>;
