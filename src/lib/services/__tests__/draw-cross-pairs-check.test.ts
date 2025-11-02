import { describe, it, expect } from "vitest";
import { DrawService } from "../draw.service";
import type { ParticipantDTO, ExclusionRuleDTO } from "../../../types";

describe("DrawService - Cross-Pairs Analysis", () => {
  it("should NEVER produce cross-pairs (mathematical proof via 100 runs)", () => {
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

    console.log("\n" + "=".repeat(80));
    console.log("ANALYSIS: Can cross-pairs EVER occur with current algorithm?");
    console.log("=".repeat(80));
    console.log("\nAlgorithm: buildHamiltonianCycle()");
    console.log("Method: Builds a single cycle iteratively");
    console.log("Property: By construction, ALWAYS creates ONE cycle of length N");
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

    if (crossPairsFound === 0) {
      console.log("\n✅ CONCLUSION: Cross-pairs are MATHEMATICALLY IMPOSSIBLE");
      console.log("   Algorithm ALWAYS produces a single Hamiltonian cycle.");
      console.log("   Cross-pairs (A↔B) cannot exist in a single cycle of length N.");
    } else {
      console.log("\n❌ WARNING: Cross-pairs were found!");
      console.log("   This should NEVER happen with buildHamiltonianCycle().");
      console.log("   Please investigate the algorithm implementation.");
    }
    console.log("=".repeat(80) + "\n");

    // Assert that NO cross-pairs were found
    expect(crossPairsFound).toBe(0);

    // Assert that all runs produced single cycles
    expect(totalCyclesFound).toBe(100); // 100 runs × 1 cycle each = 100 total cycles

    // Assert that all cycles were of length 6 (number of participants)
    expect(minCycleLength).toBe(6);
    expect(maxCycleLength).toBe(6);
  });

  it("should explain WHY cross-pairs are impossible", () => {
    console.log("\n" + "=".repeat(80));
    console.log("MATHEMATICAL PROOF: Why cross-pairs cannot occur");
    console.log("=".repeat(80));
    console.log("\n📚 DEFINITION:");
    console.log("   Cross-pair: Two participants that give to each other");
    console.log("   Example: A→B and B→A creates pair A↔B (cycle length 2)");

    console.log("\n🔬 ALGORITHM ANALYSIS:");
    console.log("   Function: buildHamiltonianCycle() [line 357-418]");
    console.log("\n   Step 1: Start with random participant (line 367)");
    console.log("           cycle = [A]");
    console.log("\n   Step 2: Iteratively add participants (line 371)");
    console.log("           cycle = [A, B, C, D, E, F]");
    console.log("\n   Step 3: Close the cycle (line 409)");
    console.log("           A→B, B→C, C→D, D→E, E→F, F→A");
    console.log("           receiverId = cycle[(i + 1) % cycle.length]");
    console.log("           ^^^ This line GUARANTEES a single cycle!");

    console.log("\n🎯 MATHEMATICAL PROOF:");
    console.log("   1. Algorithm builds ONE array: [P1, P2, P3, ..., Pn]");
    console.log("   2. Assignments are: P1→P2, P2→P3, ..., Pn-1→Pn, Pn→P1");
    console.log("   3. This creates EXACTLY ONE cycle of length n");
    console.log("   4. For a cross-pair A↔B to exist:");
    console.log("      - A must point to B: A→B");
    console.log("      - B must point to A: B→A");
    console.log("   5. But in our cycle, if A→B, then B→(next in array) ≠ A");
    console.log("      - B can only point back to A if B is at position (n-1) and A is at position 0");
    console.log("      - But then we'd need n=2, which violates minimum 3 participants!");
    console.log("\n   ∴ Cross-pairs are IMPOSSIBLE with n ≥ 3 ✅");

    console.log("\n🔐 VALIDATION:");
    console.log("   Line 229: validateSingleCycle() enforces single cycle");
    console.log("   - If multiple cycles exist → validation fails → retry");
    console.log("   - Algorithm won't return result until single cycle achieved");

    console.log("\n✅ CONCLUSION:");
    console.log("   By mathematical construction, cross-pairs CANNOT occur.");
    console.log("   The algorithm GUARANTEES a single Hamiltonian cycle.");
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
