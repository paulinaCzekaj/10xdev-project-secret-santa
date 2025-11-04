import { z } from "zod";

export const participantEmailSchema = z.object({
  email: z
    .string()
    .min(1, "Email nie może być pusty")
    .email("Niepoprawny format adresu email")
    .max(254, "Email nie może przekraczać 254 znaków"),
});

export type ParticipantEmailFormData = z.infer<typeof participantEmailSchema>;
