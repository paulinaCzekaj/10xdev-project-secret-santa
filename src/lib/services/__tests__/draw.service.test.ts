import { describe, it, expect, vi } from "vitest";
import { DrawService } from "../draw.service";
import type { ParticipantDTO, ExclusionRuleDTO } from "../../../types";

describe("DrawService - Algorithm Validation", () => {
  const drawService = new DrawService();

  describe("executeDrawAlgorithm - basic requirements", () => {
    it("should produce valid assignment for simple case", () => {
      const participants: ParticipantDTO[] = [
        {
          id: 1,
          name: "Alice",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token1",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 2,
          name: "Bob",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token2",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 3,
          name: "Charlie",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token3",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 4,
          name: "David",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token4",
          result_viewed_at: null,
          user_id: null,
        },
      ];

      const exclusions: ExclusionRuleDTO[] = [];

      const result = drawService.executeDrawAlgorithm(participants, exclusions);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(4);

      if (result) {
        // Verify each participant gives exactly once
        const givers = new Set(result.map((a) => a.giver_participant_id));
        expect(givers.size).toBe(4);

        // Verify each participant receives exactly once
        const receivers = new Set(result.map((a) => a.receiver_participant_id));
        expect(receivers.size).toBe(4);

        // Verify no self-assignment
        for (const a of result) {
          expect(a.giver_participant_id).not.toBe(a.receiver_participant_id);
        }
      }
    });

    it("should respect exclusions", () => {
      const participants: ParticipantDTO[] = [
        {
          id: 1,
          name: "Alice",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token1",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 2,
          name: "Bob",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token2",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 3,
          name: "Charlie",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token3",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 4,
          name: "David",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token4",
          result_viewed_at: null,
          user_id: null,
        },
      ];

      const exclusions: ExclusionRuleDTO[] = [
        {
          id: 1,
          group_id: 1,
          blocker_participant_id: 1,
          blocked_participant_id: 2, // Alice cannot draw Bob
          created_at: "",
        },
      ];

      const result = drawService.executeDrawAlgorithm(participants, exclusions);

      expect(result).not.toBeNull();

      if (result) {
        // Verify exclusion respected
        const aliceAssignment = result.find((a) => a.giver_participant_id === 1);
        expect(aliceAssignment?.receiver_participant_id).not.toBe(2);
      }
    });

    it("should respect automatic elf exclusions (elf cannot draw the person they help)", () => {
      const participants: ParticipantDTO[] = [
        {
          id: 1,
          name: "Alice (Helper)",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token1",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 2,
          name: "Bob (Helped)",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token2",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 3,
          name: "Charlie",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token3",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 4,
          name: "David",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token4",
          result_viewed_at: null,
          user_id: null,
        },
      ];

      // Automatic exclusion: Bob (person being helped) cannot draw Alice (his elf/helper)
      const exclusions: ExclusionRuleDTO[] = [
        {
          id: 1,
          group_id: 1,
          blocker_participant_id: 2, // Bob cannot draw...
          blocked_participant_id: 1,  // ...Alice (his elf)
          created_at: "",
        },
      ];

      const result = drawService.executeDrawAlgorithm(participants, exclusions);

      expect(result).not.toBeNull();

      if (result) {
        // Verify automatic elf exclusion is respected
        const bobAssignment = result.find((a) => a.giver_participant_id === 2);
        expect(bobAssignment?.receiver_participant_id).not.toBe(1); // Bob should not draw Alice

        // Verify all other rules are still respected
        expect(drawService.validateAssignments(result, participants, exclusions)).toBe(true);
      }
    });
  });

  describe("executeDrawAlgorithm - Randomness", () => {
    it("should produce different results on multiple runs", () => {
      const participants: ParticipantDTO[] = [
        {
          id: 1,
          name: "A",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token1",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 2,
          name: "B",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token2",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 3,
          name: "C",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token3",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 4,
          name: "D",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token4",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 5,
          name: "E",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token5",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 6,
          name: "F",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token6",
          result_viewed_at: null,
          user_id: null,
        },
      ];

      const exclusions: ExclusionRuleDTO[] = [];

      // Run algorithm 20 times to check for variety
      const results = [];
      for (let i = 0; i < 20; i++) {
        const result = drawService.executeDrawAlgorithm(participants, exclusions);
        if (!result) {
          expect.fail("Result should not be null");
        }

        // Convert to comparable format
        const signature = result
          .map((a) => `${a.giver_participant_id}->${a.receiver_participant_id}`)
          .sort()
          .join(",");

        results.push(signature);
      }

      // Check that not all results are identical
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBeGreaterThan(1);

      // Log for debugging
      console.log(`Generated ${uniqueResults.size} different results out of 20 attempts`);
    });

    it("should allow various cycle structures (including cross-pairs)", () => {
      const participants: ParticipantDTO[] = [
        {
          id: 1,
          name: "A",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token1",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 2,
          name: "B",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token2",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 3,
          name: "C",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token3",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 4,
          name: "D",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token4",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 5,
          name: "E",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token5",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 6,
          name: "F",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token6",
          result_viewed_at: null,
          user_id: null,
        },
      ];

      const exclusions: ExclusionRuleDTO[] = [];

      const cycleStructures: Record<string, number> = {};

      // Run 50 times and analyze cycle structures
      for (let i = 0; i < 50; i++) {
        const result = drawService.executeDrawAlgorithm(participants, exclusions);
        if (!result) {
          expect.fail("Result should not be null");
        }

        // Analyze cycle structure
        const structure = analyzeCycleStructure(result, participants);
        cycleStructures[structure] = (cycleStructures[structure] || 0) + 1;
      }

      console.log("Cycle structure distribution:");
      for (const [structure, count] of Object.entries(cycleStructures)) {
        console.log(`  ${structure}: ${count} times`);
      }

      // We should see variety - not just one structure
      expect(Object.keys(cycleStructures).length).toBeGreaterThan(1);
    });

    it("should still meet all requirements with any structure", () => {
      const participants: ParticipantDTO[] = [
        {
          id: 1,
          name: "A",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token1",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 2,
          name: "B",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token2",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 3,
          name: "C",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token3",
          result_viewed_at: null,
          user_id: null,
        },
        {
          id: 4,
          name: "D",
          group_id: 1,
          email: null,
          created_at: "",
          access_token: "token4",
          result_viewed_at: null,
          user_id: null,
        },
      ];

      const exclusions: ExclusionRuleDTO[] = [
        {
          id: 1,
          group_id: 1,
          blocker_participant_id: 1,
          blocked_participant_id: 2,
          created_at: "",
        },
      ];

      // Run 10 times
      for (let i = 0; i < 10; i++) {
        const result = drawService.executeDrawAlgorithm(participants, exclusions);

        if (!result) {
          expect.fail("Result should not be null");
        }
        expect(result).toHaveLength(4);

        // Check requirement 1: Everyone receives
        const receivers = new Set(result.map((a) => a.receiver_participant_id));
        expect(receivers.size).toBe(4);

        // Check requirement 2: No self-assignment
        for (const a of result) {
          expect(a.giver_participant_id).not.toBe(a.receiver_participant_id);
        }

        // Check requirement 3: Exclusions respected
        const violation = result.find((a) => a.giver_participant_id === 1 && a.receiver_participant_id === 2);
        expect(violation).toBeUndefined();
      }
    });
  });
});

// Helper function to analyze cycle structure
function analyzeCycleStructure(
  assignments: { giver_participant_id: number; receiver_participant_id: number }[],
  participants: ParticipantDTO[]
): string {
  const nextMap = new Map<number, number>();
  for (const a of assignments) {
    nextMap.set(a.giver_participant_id, a.receiver_participant_id);
  }

  const visited = new Set<number>();
  const cycleLengths: number[] = [];

  for (const p of participants) {
    if (visited.has(p.id)) continue;

    // Follow cycle
    let current = p.id;
    let length = 0;
    const cycleStart = current;

    do {
      visited.add(current);
      const next = nextMap.get(current);
      if (!next) break;
      current = next;
      length++;
    } while (current !== cycleStart);

    cycleLengths.push(length);
  }

  cycleLengths.sort((a, b) => a - b);
  return cycleLengths.join("+");
}
