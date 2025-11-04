import type { ParticipantDTO, ExclusionRuleDTO } from "../../types";

/**
 * Internal representation of participant with exclusion rules
 * @internal
 */
interface DrawParticipant {
  id: number;
  name: string;
  exclusions: number[]; // IDs of participants this person cannot draw
}

/**
 * Represents a single gift assignment (giver -> receiver)
 * @internal
 */
interface DrawAssignment {
  giver_participant_id: number;
  receiver_participant_id: number;
}

/**
 * Service for executing Secret Santa draw algorithm using backtracking.
 * Ensures each participant gives to and receives from exactly one person,
 * respecting all exclusion rules and preventing self-assignments.
 */
export class DrawService {
  /** Maximum algorithm execution time (15 seconds) */
  private readonly MAX_ALGORITHM_TIME = 15000;

  /**
   * Checks if a draw is possible with current participants and exclusion rules.
   * Validates that each participant has at least one valid receiver option.
   *
   * @param participants - List of participants (minimum 3 required)
   * @param exclusions - List of exclusion rules
   * @returns true if draw is possible, false otherwise
   */
  isDrawPossible(participants: ParticipantDTO[], exclusions: ExclusionRuleDTO[]): boolean {
    // Guard: Need at least 3 participants
    if (participants.length < 3) {
      return false;
    }

    // Build exclusion map for quick lookup
    const exclusionMap = this.buildExclusionMap(exclusions);

    // Check if each participant has at least one valid receiver
    for (const participant of participants) {
      const possibleReceivers = participants.filter((p) => {
        // Cannot draw themselves
        if (p.id === participant.id) {
          return false;
        }

        // Check if excluded
        const participantExclusions = exclusionMap.get(participant.id) || [];
        if (participantExclusions.includes(p.id)) {
          return false;
        }

        return true;
      });

      // If any participant has no possible receivers, draw is impossible
      if (possibleReceivers.length === 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * Executes the Secret Santa draw algorithm using backtracking with randomization.
   *
   * @param participants - List of participants in the group
   * @param exclusions - List of exclusion rules
   * @returns Array of assignments if successful, null if impossible or timeout
   */
  executeDrawAlgorithm(participants: ParticipantDTO[], exclusions: ExclusionRuleDTO[]): DrawAssignment[] | null {
    // Guard: Quick validation check
    if (!this.isDrawPossible(participants, exclusions)) {
      return null;
    }

    // Build internal representation
    const drawParticipants = this.buildDrawParticipants(participants, exclusions);

    // Shuffle participants for randomness - different order = different results
    const shuffledParticipants = this.shuffleArray(drawParticipants);

    // Execute backtracking with timeout
    const startTime = Date.now();
    const result = this.backtrackAssignment(shuffledParticipants, [], new Set(), startTime);

    if (!result) {
      return null;
    }

    // Validate final result
    if (!this.validateAssignments(result, participants, exclusions)) {
      return null;
    }

    return result;
  }

  /**
   * Validates that assignments are correct and follow all rules.
   *
   * @param assignments - Generated assignments to validate
   * @param participants - List of participants
   * @param exclusions - List of exclusion rules
   * @returns true if valid, false otherwise
   */
  private validateAssignments(
    assignments: DrawAssignment[],
    participants: ParticipantDTO[],
    exclusions: ExclusionRuleDTO[]
  ): boolean {
    // Check 1: Each participant is a giver exactly once
    const givers = new Set(assignments.map((a) => a.giver_participant_id));
    if (givers.size !== participants.length) {
      return false;
    }

    // Check 2: Each participant is a receiver exactly once
    const receivers = new Set(assignments.map((a) => a.receiver_participant_id));
    if (receivers.size !== participants.length) {
      return false;
    }

    // Check 3: All participants are covered
    for (const participant of participants) {
      if (!givers.has(participant.id) || !receivers.has(participant.id)) {
        return false;
      }
    }

    // Check 4: No one draws themselves
    for (const assignment of assignments) {
      if (assignment.giver_participant_id === assignment.receiver_participant_id) {
        return false;
      }
    }

    // Check 5: No exclusion rules are violated
    const exclusionMap = this.buildExclusionMap(exclusions);
    for (const assignment of assignments) {
      const giverExclusions = exclusionMap.get(assignment.giver_participant_id) || [];
      if (giverExclusions.includes(assignment.receiver_participant_id)) {
        return false;
      }
    }

    // Note: We do NOT enforce single Hamiltonian cycle
    // Any valid structure (including cross-pairs) is allowed for true randomness

    return true;
  }

  /**
   * Builds exclusion map for quick lookup.
   * Map key: participant ID who cannot draw
   * Map value: array of participant IDs they cannot draw
   */
  private buildExclusionMap(exclusions: ExclusionRuleDTO[]): Map<number, number[]> {
    const exclusionMap = new Map<number, number[]>();

    for (const exclusion of exclusions) {
      const blockerId = exclusion.blocker_participant_id;
      const blockedId = exclusion.blocked_participant_id;

      const blockedList = exclusionMap.get(blockerId) || [];
      if (!exclusionMap.has(blockerId)) {
        exclusionMap.set(blockerId, blockedList);
      }
      blockedList.push(blockedId);
    }

    return exclusionMap;
  }

  /**
   * Builds internal DrawParticipant representation with exclusions.
   */
  private buildDrawParticipants(participants: ParticipantDTO[], exclusions: ExclusionRuleDTO[]): DrawParticipant[] {
    const exclusionMap = this.buildExclusionMap(exclusions);

    return participants.map((p) => ({
      id: p.id,
      name: p.name,
      exclusions: exclusionMap.get(p.id) || [],
    }));
  }

  /**
   * Backtracking algorithm to find valid assignment.
   *
   * @param participants - All participants with their exclusions
   * @param currentAssignments - Assignments made so far
   * @param usedReceivers - Set of participant IDs already assigned as receivers
   * @param startTime - Algorithm start time for timeout check
   * @returns Valid assignments or null if impossible
   */
  private backtrackAssignment(
    participants: DrawParticipant[],
    currentAssignments: DrawAssignment[],
    usedReceivers: Set<number>,
    startTime: number
  ): DrawAssignment[] | null {
    // Timeout check
    if (Date.now() - startTime > this.MAX_ALGORITHM_TIME) {
      return null;
    }

    // Base case: all participants assigned
    if (currentAssignments.length === participants.length) {
      return currentAssignments;
    }

    // Get current giver (next unassigned participant)
    const currentIndex = currentAssignments.length;
    const giver = participants[currentIndex];

    // Get available receivers for this giver
    const availableReceivers = participants.filter((p) => {
      // Cannot draw themselves
      if (p.id === giver.id) {
        return false;
      }

      // Already used as receiver
      if (usedReceivers.has(p.id)) {
        return false;
      }

      // Check exclusions
      if (giver.exclusions.includes(p.id)) {
        return false;
      }

      return true;
    });

    // Shuffle for randomness instead of heuristic sorting
    // This ensures true randomness in draw results
    const shuffledReceivers = this.shuffleArray(availableReceivers);

    // Try each available receiver in random order
    for (const receiver of shuffledReceivers) {
      // Make assignment
      const newAssignment: DrawAssignment = {
        giver_participant_id: giver.id,
        receiver_participant_id: receiver.id,
      };

      const newAssignments = [...currentAssignments, newAssignment];
      const newUsedReceivers = new Set(usedReceivers);
      newUsedReceivers.add(receiver.id);

      // Recurse
      const result = this.backtrackAssignment(participants, newAssignments, newUsedReceivers, startTime);

      if (result !== null) {
        return result; // Found valid solution
      }

      // Backtrack (implicit - we try next receiver)
    }

    // No valid assignment found
    return null;
  }

  /**
   * Shuffles array using Fisher-Yates algorithm.
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Counts remaining options for a potential receiver.
   * Used for heuristic optimization (most constrained first).
   *
   * @deprecated Currently unused - kept for potential future optimization
   */
  private countRemainingOptions(
    potentialReceiver: DrawParticipant,
    allParticipants: DrawParticipant[],
    usedReceivers: Set<number>,
    fromIndex: number
  ): number {
    // If this receiver is assigned, count how many givers can still assign to remaining receivers
    const remainingGivers = allParticipants.slice(fromIndex);
    const futureUsedReceivers = new Set(usedReceivers);
    futureUsedReceivers.add(potentialReceiver.id);

    let totalOptions = 0;

    for (const giver of remainingGivers) {
      const options = allParticipants.filter((p) => {
        if (p.id === giver.id) return false;
        if (futureUsedReceivers.has(p.id)) return false;
        if (giver.exclusions.includes(p.id)) return false;
        return true;
      });

      totalOptions += options.length;
    }

    return totalOptions;
  }
}
