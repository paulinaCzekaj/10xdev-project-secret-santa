import type { SupabaseClient } from "../../db/supabase.client";
import type {
  CreateExclusionRuleCommand,
  ExclusionRuleDTO,
  ExclusionRuleInsert,
  ExclusionRuleListItemDTO,
  UserId,
} from "../../types";

/**
 * Service for managing Secret Santa exclusion rules
 */
export class ExclusionRuleService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Creates a new exclusion rule for a Secret Santa group
   *
   * An exclusion rule specifies that a participant (blocker) cannot be assigned
   * to give a gift to another participant (blocked). This is useful for preventing
   * conflicts like spouses drawing each other.
   *
   * Only the group creator can add exclusion rules, and only before the draw.
   *
   * @param groupId - The ID of the group to add the exclusion rule to
   * @param userId - The ID of the user attempting to create the rule (must be creator)
   * @param command - The exclusion rule data (blocker and blocked participant IDs)
   * @returns ExclusionRuleDTO with the created rule including generated ID
   * @throws {Error} "GROUP_NOT_FOUND" - If group doesn't exist
   * @throws {Error} "FORBIDDEN" - If user is not the group creator
   * @throws {Error} "DRAW_COMPLETED" - If draw has already been completed
   * @throws {Error} "SAME_PARTICIPANT" - If blocker and blocked are the same
   * @throws {Error} "INVALID_PARTICIPANTS" - If participants don't exist or don't belong to group
   * @throws {Error} "DUPLICATE_RULE" - If this exact rule already exists
   * @throws {Error} "Failed to create exclusion rule" - If database operation fails
   *
   * @example
   * const rule = await exclusionRuleService.createExclusionRule(
   *   1,
   *   "user-id-123",
   *   { blocker_participant_id: 1, blocked_participant_id: 2 }
   * );
   * // Returns: { id: 1, group_id: 1, blocker_participant_id: 1, blocked_participant_id: 2, created_at: "..." }
   */
  async createExclusionRule(
    groupId: number,
    userId: UserId,
    command: CreateExclusionRuleCommand
  ): Promise<ExclusionRuleDTO> {
    // Guard: Check if groupId and userId exist
    if (!groupId || !userId) {
      throw new Error("Group ID and User ID are required");
    }

    console.log("[ExclusionRuleService.createExclusionRule] Starting", {
      groupId,
      userId,
      blockerParticipantId: command.blocker_participant_id,
      blockedParticipantId: command.blocked_participant_id,
    });

    try {
      // Step 1: Validate group exists and get group data
      const { data: group, error: groupError } = await this.supabase
        .from("groups")
        .select("id, creator_id")
        .eq("id", groupId)
        .single();

      // Guard: Check if group exists
      if (groupError || !group) {
        console.log("[ExclusionRuleService.createExclusionRule] Group not found", {
          groupId,
          error: groupError?.message,
        });
        throw new Error("GROUP_NOT_FOUND");
      }

      console.log("[ExclusionRuleService.createExclusionRule] Group found", {
        groupId,
        creatorId: group.creator_id,
      });

      // Step 2: Check if user is creator
      if (group.creator_id !== userId) {
        console.log("[ExclusionRuleService.createExclusionRule] User not authorized", {
          userId,
          creatorId: group.creator_id,
        });
        throw new Error("FORBIDDEN");
      }

      console.log("[ExclusionRuleService.createExclusionRule] User is creator - authorized");

      // Step 3: Check if draw has been completed
      const { data: hasAssignments } = await this.supabase
        .from("assignments")
        .select("id")
        .eq("group_id", groupId)
        .limit(1)
        .maybeSingle();

      // Guard: Check if draw completed
      if (hasAssignments !== null) {
        console.log("[ExclusionRuleService.createExclusionRule] Draw already completed", {
          groupId,
        });
        throw new Error("DRAW_COMPLETED");
      }

      console.log("[ExclusionRuleService.createExclusionRule] Draw not completed - can add exclusion rule");

      // Step 4: Validate participants are different
      if (command.blocker_participant_id === command.blocked_participant_id) {
        console.log("[ExclusionRuleService.createExclusionRule] Same participant for blocker and blocked", {
          participantId: command.blocker_participant_id,
        });
        throw new Error("SAME_PARTICIPANT");
      }

      console.log("[ExclusionRuleService.createExclusionRule] Participants are different");

      // Step 5: Validate both participants exist and belong to the group
      const { data: participants } = await this.supabase
        .from("participants")
        .select("id")
        .in("id", [command.blocker_participant_id, command.blocked_participant_id])
        .eq("group_id", groupId);

      // Guard: Check if both participants exist and belong to group
      if (!participants || participants.length !== 2) {
        console.log("[ExclusionRuleService.createExclusionRule] Invalid participants", {
          groupId,
          blockerParticipantId: command.blocker_participant_id,
          blockedParticipantId: command.blocked_participant_id,
          foundCount: participants?.length || 0,
        });
        throw new Error("INVALID_PARTICIPANTS");
      }

      console.log("[ExclusionRuleService.createExclusionRule] Both participants exist and belong to group");

      // Step 6: Check for duplicate exclusion rule
      const { data: existingRule } = await this.supabase
        .from("exclusion_rules")
        .select("id")
        .eq("group_id", groupId)
        .eq("blocker_participant_id", command.blocker_participant_id)
        .eq("blocked_participant_id", command.blocked_participant_id)
        .maybeSingle();

      // Guard: Check if rule already exists
      if (existingRule) {
        console.log("[ExclusionRuleService.createExclusionRule] Duplicate exclusion rule", {
          groupId,
          blockerParticipantId: command.blocker_participant_id,
          blockedParticipantId: command.blocked_participant_id,
          existingRuleId: existingRule.id,
        });
        throw new Error("DUPLICATE_RULE");
      }

      console.log("[ExclusionRuleService.createExclusionRule] No duplicate rule found");

      // Step 7: Insert exclusion rule
      const exclusionRuleInsert: ExclusionRuleInsert = {
        group_id: groupId,
        blocker_participant_id: command.blocker_participant_id,
        blocked_participant_id: command.blocked_participant_id,
      };

      const { data: exclusionRule, error: insertError } = await this.supabase
        .from("exclusion_rules")
        .insert(exclusionRuleInsert)
        .select()
        .single();

      if (insertError || !exclusionRule) {
        console.error("[ExclusionRuleService.createExclusionRule] Failed to insert exclusion rule:", insertError);
        throw new Error("Failed to create exclusion rule");
      }

      console.log("[ExclusionRuleService.createExclusionRule] Exclusion rule created successfully", {
        exclusionRuleId: exclusionRule.id,
        groupId: exclusionRule.group_id,
        blockerParticipantId: exclusionRule.blocker_participant_id,
        blockedParticipantId: exclusionRule.blocked_participant_id,
      });

      // Step 8: Return ExclusionRuleDTO
      return exclusionRule;
    } catch (error) {
      console.error("[ExclusionRuleService.createExclusionRule] Error:", error);
      throw error;
    }
  }

  /**
   * Retrieves all exclusion rules for a Secret Santa group with participant names
   *
   * Returns a list of exclusion rules including the names of both the blocker
   * and blocked participants. Only group participants can access this information.
   *
   * @param groupId - The ID of the group to get exclusion rules for
   * @param userId - The ID of the user requesting the list (must be group participant)
   * @returns Promise resolving to array of exclusion rules with participant names
   * @throws {Error} "GROUP_NOT_FOUND" - If group doesn't exist
   * @throws {Error} "FORBIDDEN" - If user is not a participant in the group
   * @throws {Error} "Failed to get exclusion rules" - If database operation fails
   *
   * @example
   * const rules = await exclusionRuleService.getExclusionRulesForGroup(1, "user-123");
   * // Returns: [{ id: 1, group_id: 1, blocker_participant_id: 1, blocker_name: "John", blocked_participant_id: 2, blocked_name: "Jane", ... }]
   */
  async getExclusionRulesForGroup(groupId: number, userId: UserId): Promise<ExclusionRuleListItemDTO[]> {
    // Guard: Check if groupId and userId exist
    if (!groupId || !userId) {
      throw new Error("Group ID and User ID are required");
    }

    console.log("[ExclusionRuleService.getExclusionRulesForGroup] Starting", {
      groupId,
      userId,
    });

    try {
      // Step 1: Check if group exists and user is authorized
      const { data: isUserInGroup, error: authError } = await this.supabase.rpc("is_user_in_group", {
        p_group_id: groupId,
        p_user_id: userId,
      });

      if (authError) {
        console.error("[ExclusionRuleService.getExclusionRulesForGroup] Authorization check failed:", authError);
        throw new Error("Failed to verify user access");
      }

      if (!isUserInGroup) {
        // Check if group exists first
        const { data: group } = await this.supabase.from("groups").select("id").eq("id", groupId).maybeSingle();

        if (!group) {
          console.log("[ExclusionRuleService.getExclusionRulesForGroup] Group not found", { groupId });
          throw new Error("GROUP_NOT_FOUND");
        }

        console.log("[ExclusionRuleService.getExclusionRulesForGroup] User not in group", {
          groupId,
          userId,
        });
        throw new Error("FORBIDDEN");
      }

      console.log("[ExclusionRuleService.getExclusionRulesForGroup] User authorized to view exclusion rules");

      // Step 2: Get all exclusion rules for the group with participant names
      // Using two LEFT JOINs to efficiently get both blocker and blocked participant names
      const { data: exclusionRulesWithNames, error: queryError } = await this.supabase
        .from("exclusion_rules")
        .select(
          `
          id,
          group_id,
          blocker_participant_id,
          blocked_participant_id,
          created_at,
          blocker:participants!exclusion_rules_blocker_participant_id_fkey(name),
          blocked:participants!exclusion_rules_blocked_participant_id_fkey(name)
        `
        )
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });

      if (queryError) {
        console.error(
          "[ExclusionRuleService.getExclusionRulesForGroup] Failed to get exclusion rules:",
          queryError
        );
        throw new Error("Failed to get exclusion rules");
      }

      if (!exclusionRulesWithNames || exclusionRulesWithNames.length === 0) {
        console.log("[ExclusionRuleService.getExclusionRulesForGroup] No exclusion rules found", { groupId });
        return [];
      }

      console.log("[ExclusionRuleService.getExclusionRulesForGroup] Found exclusion rules", {
        groupId,
        ruleCount: exclusionRulesWithNames.length,
      });

      // Step 3: Transform the data to match ExclusionRuleListItemDTO format
      const exclusionRules: ExclusionRuleListItemDTO[] = exclusionRulesWithNames.map((rule) => ({
        id: rule.id,
        group_id: rule.group_id,
        blocker_participant_id: rule.blocker_participant_id,
        blocked_participant_id: rule.blocked_participant_id,
        created_at: rule.created_at,
        blocker_name: (rule.blocker as any)?.name || "Unknown",
        blocked_name: (rule.blocked as any)?.name || "Unknown",
      }));

      console.log("[ExclusionRuleService.getExclusionRulesForGroup] Successfully retrieved exclusion rules", {
        groupId,
        ruleCount: exclusionRules.length,
      });

      return exclusionRules;
    } catch (error) {
      console.error("[ExclusionRuleService.getExclusionRulesForGroup] Error:", error);
      throw error;
    }
  }
}
