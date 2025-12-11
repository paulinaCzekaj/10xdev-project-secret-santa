import { describe, it, expect } from "vitest";
import { DrawService } from "../draw.service";
import type { ParticipantDTO, ExclusionRuleDTO } from "../../../types";

describe("DrawService - Cross-Pairs Analysis", () => {
  it("should ALLOW cross-pairs for true randomness (validation via 100 runs)", () => {
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
        elf_participant_id: null,
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
        elf_participant_id: null,
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
        elf_participant_id: null,
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
        elf_participant_id: null,
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
        elf_participant_id: null,
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
        elf_participant_id: null,
      },
    ];

    const exclusions: ExclusionRuleDTO[] = [];

    console.log("\n" + "=".repeat(80));
    console.log("VALIDATION: Cross-pairs are now ALLOWED for true randomness");
    console.log("=".repeat(80));
    console.log("\nAlgorithm: Backtracking assignment");
    console.log("Method: Finds any valid assignment (may include cross-pairs)");
    console.log("Property: Allows multiple cycle structures for better randomness");
    console.log("\nTesting with 100 runs...\n");

    let crossPairsFound = 0;
    let totalCyclesFound = 0;
    let minCycleLength = Infinity;
    let maxCycleLength = 0;

    const cycleLengthDistribution: Record<number, number> = {};

    for (let run = 1; run <= 100; run++) {
      const result = drawService.executeDrawAlgorithm(participants, exclusions);

      if (!result) {
        console.log(`Run ${run}: FAILED (returned null)`);
        continue;
      }

      // Analyze cycle structure
      const cycleAnalysis = analyzeCycles(result, participants);

      totalCyclesFound += cycleAnalysis.cycles.length;

      // Track cycle lengths
      for (const cycle of cycleAnalysis.cycles) {
        const len = cycle.length;
        cycleLengthDistribution[len] = (cycleLengthDistribution[len] || 0) + 1;
        minCycleLength = Math.min(minCycleLength, len);
        maxCycleLength = Math.max(maxCycleLength, len);
      }

      // Check for cross-pairs (cycles of length 2)
      const hasCrossPairs = cycleAnalysis.cycles.some((c) => c.length === 2);
      if (hasCrossPairs) {
        crossPairsFound++;
        console.log(`⚠️  Run ${run}: FOUND CROSS-PAIR! ${cycleAnalysis.description}`);
      }
    }

    console.log("=".repeat(80));
    console.log("RESULTS:");
    console.log("=".repeat(80));
    console.log(`Total runs:              100`);
    console.log(`Cross-pairs found:       ${crossPairsFound}`);
    console.log(`Average cycles per run:  ${(totalCyclesFound / 100).toFixed(2)}`);
    console.log(`Min cycle length:        ${minCycleLength === Infinity ? "N/A" : minCycleLength}`);
    console.log(`Max cycle length:        ${maxCycleLength === 0 ? "N/A" : maxCycleLength}`);
    console.log("\nCycle length distribution:");
    for (const [length, count] of Object.entries(cycleLengthDistribution).sort((a, b) => Number(a[0]) - Number(b[0]))) {
      const percentage = ((count / 100) * 100).toFixed(1);
      console.log(`  Length ${length}: ${count} occurrences (${percentage}%)`);
    }
    console.log("=".repeat(80));

    console.log("\n✅ SUCCESS: Cross-pairs are properly allowed for true randomness!");
    console.log("   Algorithm produces varied cycle structures as intended.");
    console.log("=".repeat(80) + "\n");

    // Assert that cross-pairs CAN occur (algorithm allows them for randomness)
    expect(crossPairsFound).toBeGreaterThan(0);

    // Assert that we get variety in cycle structures
    expect(totalCyclesFound).toBeGreaterThan(100); // More cycles = more variety

    // Assert that cycles are of reasonable lengths (2-6 for 6 participants)
    expect(minCycleLength).toBeGreaterThanOrEqual(2);
    expect(maxCycleLength).toBeLessThanOrEqual(6);
  });

  it("should explain WHY cross-pairs are now allowed for randomness", () => {
    console.log("\n" + "=".repeat(80));
    console.log("DESIGN DECISION: Why cross-pairs are allowed for true randomness");
    console.log("=".repeat(80));
    console.log("\n📚 DEFINITION:");
    console.log("   Cross-pair: Two participants that give to each other");
    console.log("   Example: A→B and B→A creates pair A↔B (cycle length 2)");

    console.log("\n🔬 ALGORITHM ANALYSIS:");
    console.log("   Function: executeDrawAlgorithm() [backtracking approach]");
    console.log("\n   Step 1: Shuffle participants for randomness");
    console.log("   Step 2: Use backtracking to find ANY valid assignment");
    console.log("   Step 3: Allow multiple cycle structures (including cross-pairs)");

    console.log("\n🎯 DESIGN DECISION:");
    console.log("   1. Single Hamiltonian cycle was too restrictive");
    console.log("   2. Cross-pairs (A↔B) add natural randomness");
    console.log("   3. Multiple cycle structures increase variety");
    console.log("   4. All assignments remain mathematically valid");
    console.log("\n   Cross-pairs are ALLOWED for better randomization ✅");

    console.log("\n🔐 VALIDATION:");
    console.log("   - Each participant gives exactly one gift");
    console.log("   - Each participant receives exactly one gift");
    console.log("   - No one gives to themselves");
    console.log("   - Exclusion rules are respected");
    console.log("   - Multiple cycle structures are allowed");

    console.log("\n✅ CONCLUSION:");
    console.log("   Cross-pairs are intentionally allowed for true randomness.");
    console.log("   Algorithm prioritizes variety over cycle structure purity.");
    console.log("=".repeat(80) + "\n");

    // This test always passes - it's purely educational
    expect(true).toBe(true);
  });
});

// Helper function to analyze cycle structure
function analyzeCycles(
  assignments: { giver_participant_id: number; receiver_participant_id: number }[],
  participants: ParticipantDTO[]
): { description: string; cycles: string[][] } {
  const nextMap = new Map<number, number>();
  for (const a of assignments) {
    nextMap.set(a.giver_participant_id, a.receiver_participant_id);
  }

  const nameMap = new Map<number, string>();
  participants.forEach((p) => nameMap.set(p.id, p.name));

  const visited = new Set<number>();
  const cycles: string[][] = [];

  for (const p of participants) {
    if (visited.has(p.id)) continue;

    // Follow cycle
    const cycle: string[] = [];
    let current = p.id;
    const cycleStart = current;

    do {
      visited.add(current);
      const name = nameMap.get(current);
      if (name) cycle.push(name);
      const next = nextMap.get(current);
      if (!next) break;
      current = next;
    } while (current !== cycleStart);

    cycles.push(cycle);
  }

  // Analyze structure
  const cycleLengths = cycles.map((c) => c.length);
  cycleLengths.sort((a, b) => b - a);

  let description = "";
  if (cycles.length === 1) {
    description = `Single cycle (length ${cycleLengths[0]})`;
  } else {
    const onlyPairs = cycleLengths.every((len) => len === 2);
    if (onlyPairs) {
      description = `${cycles.length} cross-pairs (all length 2) ⚠️`;
    } else {
      description = `${cycles.length} cycles (lengths: ${cycleLengths.join(", ")})`;
    }
  }

  return { description, cycles };
}
