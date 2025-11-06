import { z } from "zod";

/**
 * Schema for adding exclusion rules
 * Validates form data before submission
 */
export const addExclusionSchema = z
  .object({
    blocker_participant_id: z
      .number({
        required_error: "Wybierz osobę",
        invalid_type_error: "Wybierz osobę",
      })
      .positive("Wybierz osobę"),
    blocked_participant_id: z
      .number({
        required_error: "Wybierz osobę",
        invalid_type_error: "Wybierz osobę",
      })
      .positive("Wybierz osobę"),
    bidirectional: z.boolean(),
  })
  .refine(
    (data) => {
      // Only check if both values are provided
      if (data.blocker_participant_id && data.blocked_participant_id) {
        return data.blocker_participant_id !== data.blocked_participant_id;
      }
      return true; // Let required validation handle missing values
    },
    {
      message: "Osoba nie może wykluczyć samej siebie",
      path: ["blocked_participant_id"],
    }
  );

export type AddExclusionFormData = z.infer<typeof addExclusionSchema>;
