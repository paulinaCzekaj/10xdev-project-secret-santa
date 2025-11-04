import { describe, it, expect } from "vitest";
import { addExclusionSchema } from "../exclusion.schemas";

describe("addExclusionSchema", () => {
  describe("valid data", () => {
    it("should validate unidirectional exclusion", () => {
      const validData = {
        blocker_participant_id: 1,
        blocked_participant_id: 2,
        bidirectional: false,
      };

      const result = addExclusionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should validate bidirectional exclusion", () => {
      const validData = {
        blocker_participant_id: 1,
        blocked_participant_id: 2,
        bidirectional: true,
      };

      const result = addExclusionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });
  });

  describe("invalid data", () => {
    it("should reject missing blocker_participant_id", () => {
      const invalidData = {
        blocked_participant_id: 2,
        bidirectional: false,
      };

      const result = addExclusionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ["blocker_participant_id"],
              message: "Wybierz osobę",
            }),
          ])
        );
      }
    });

    it("should reject missing blocked_participant_id", () => {
      const invalidData = {
        blocker_participant_id: 1,
        bidirectional: false,
      };

      const result = addExclusionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ["blocked_participant_id"],
              message: "Wybierz osobę",
            }),
          ])
        );
      }
    });

    it("should reject zero blocker_participant_id", () => {
      const invalidData = {
        blocker_participant_id: 0,
        blocked_participant_id: 2,
        bidirectional: false,
      };

      const result = addExclusionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ["blocker_participant_id"],
              message: "Wybierz osobę",
            }),
          ])
        );
      }
    });

    it("should reject zero blocked_participant_id", () => {
      const invalidData = {
        blocker_participant_id: 1,
        blocked_participant_id: 0,
        bidirectional: false,
      };

      const result = addExclusionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ["blocked_participant_id"],
              message: "Wybierz osobę",
            }),
          ])
        );
      }
    });

    it("should reject self-exclusion", () => {
      const invalidData = {
        blocker_participant_id: 1,
        blocked_participant_id: 1,
        bidirectional: false,
      };

      const result = addExclusionSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              path: ["blocked_participant_id"],
              message: "Osoba nie może wykluczyć samej siebie",
            }),
          ])
        );
      }
    });
  });

  describe("type inference", () => {
    it("should correctly infer TypeScript types", () => {
      const validData = {
        blocker_participant_id: 1 as const,
        blocked_participant_id: 2 as const,
        bidirectional: true,
      };

      const result = addExclusionSchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        // TypeScript should infer the correct types
        const data: {
          blocker_participant_id: number;
          blocked_participant_id: number;
          bidirectional: boolean;
        } = result.data;

        expect(data.blocker_participant_id).toBe(1);
        expect(data.blocked_participant_id).toBe(2);
        expect(data.bidirectional).toBe(true);
      }
    });
  });
});
