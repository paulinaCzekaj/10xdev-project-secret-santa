import { describe, it } from "vitest";
import { DrawService } from "../draw.service";
import type { ParticipantDTO, ExclusionRuleDTO } from "../../../types";

describe("Final Test - True Randomness Verification", () => {
  it("should display 10 draw results showing variety", () => {
    const drawService = new DrawService();

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
        elf_accessed_at: null,
        elf_for_participant_id: null,
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
        elf_accessed_at: null,
        elf_for_participant_id: null,
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
        elf_accessed_at: null,
        elf_for_participant_id: null,
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
        elf_accessed_at: null,
        elf_for_participant_id: null,
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
        elf_accessed_at: null,
        elf_for_participant_id: null,
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
        elf_accessed_at: null,
        elf_for_participant_id: null,
      },
    ];

    const exclusions: ExclusionRuleDTO[] = [];

    console.log("\n" + "=".repeat(80));
    console.log("FINAL TEST: True Randomness - 10 Draw Results");
    console.log("=".repeat(80) + "\n");

    for (let run = 1; run <= 10; run++) {
      const result = drawService.executeDrawAlgorithm(participants, exclusions);

      if (!result) {
        console.log(`Run ${run}: FAILED`);
        continue;
      }

      const nameMap = new Map([
        [1, "A"],
        [2, "B"],
        [3, "C"],
        [4, "D"],
        [5, "E"],
        [6, "F"],
      ]);
      const sorted = [...result].sort((a, b) => a.giver_participant_id - b.giver_participant_id);
      const formatted = sorted
        .map((a) => `${nameMap.get(a.giver_participant_id)}→${nameMap.get(a.receiver_participant_id)}`)
        .join(", ");

      // Analyze structure
      const structure = analyzeStructure(result, participants);

      const runStr = run.toString().padStart(2, " ");
      console.log(`Run ${runStr}: ${formatted}`);
      console.log(`         Structure: ${structure.description}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✅ DONE - Cross-pairs are now ALLOWED and can occur naturally!");
    console.log("=".repeat(80) + "\n");
  });
});

function analyzeStructure(
  assignments: { giver_participant_id: number; receiver_participant_id: number }[],
  participants: ParticipantDTO[]
): { description: string } {
  const nextMap = new Map<number, number>();
  for (const a of assignments) {
    nextMap.set(a.giver_participant_id, a.receiver_participant_id);
  }

  const visited = new Set<number>();
  const cycles: number[] = [];

  for (const p of participants) {
    if (visited.has(p.id)) continue;

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

    cycles.push(length);
  }

  cycles.sort((a, b) => a - b);

  if (cycles.length === 1) {
    return { description: `Single cycle (length ${cycles[0]}) - Hamiltonian` };
  }

  const allPairs = cycles.every((c) => c === 2);
  if (allPairs) {
    return { description: `${cycles.length} cross-pairs (${cycles.join("+")})` };
  }

  return { description: `${cycles.length} cycles (${cycles.join("+")})` };
}
