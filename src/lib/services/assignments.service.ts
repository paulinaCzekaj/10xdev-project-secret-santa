import type { SupabaseClient } from "../../db/supabase.client";
import type { AssignmentDTO, AssignmentInsert } from "../../types";

/**
 * Service for managing Secret Santa assignments
 */
export class AssignmentsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Retrieves all assignments for a specific group
   *
   * @param groupId - The ID of the group
   * @returns Array of assignments for the group
   * @throws {Error} If database operation fails
   */
  async getByGroupId(groupId: number): Promise<AssignmentDTO[]> {
    // Guard: Validate groupId
    if (!groupId) {
      throw new Error("Group ID is required");
    }

    const { data, error } = await this.supabase
      .from("assignments")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error("Failed to fetch assignments");
    }

    return data || [];
  }

  /**
   * Creates multiple assignments in a single transaction
   *
   * This is the core operation for saving Secret Santa draw results.
   * All assignments are inserted atomically to ensure consistency.
   *
   * @param groupId - The ID of the group
   * @param assignments - Array of assignments to create
   * @returns Array of created assignments with generated IDs
   * @throws {Error} If database operation fails or transaction fails
   */
  async createBatch(
    groupId: number,
    assignments: { giver_participant_id: number; receiver_participant_id: number }[]
  ): Promise<AssignmentDTO[]> {
    // Guard: Validate input
    if (!groupId) {
      throw new Error("Group ID is required");
    }

    if (!assignments || assignments.length === 0) {
      throw new Error("Assignments array cannot be empty");
    }

    // Prepare insert data
    const assignmentsToInsert: AssignmentInsert[] = assignments.map((assignment) => ({
      group_id: groupId,
      giver_participant_id: assignment.giver_participant_id,
      receiver_participant_id: assignment.receiver_participant_id,
    }));

    // Execute batch insert
    // Note: Supabase handles this as a single transaction automatically
    const { data, error } = await this.supabase.from("assignments").insert(assignmentsToInsert).select();

    if (error) {
      throw new Error("Failed to create assignments");
    }

    if (!data || data.length !== assignments.length) {
      throw new Error("Failed to create all assignments");
    }

    return data;
  }

  /**
   * Checks if a draw has already been executed for a group
   *
   * @param groupId - The ID of the group to check
   * @returns true if draw has been executed, false otherwise
   * @throws {Error} If database operation fails
   */
  async hasDrawBeenExecuted(groupId: number): Promise<boolean> {
    // Guard: Validate groupId
    if (!groupId) {
      throw new Error("Group ID is required");
    }

    const { data, error } = await this.supabase
      .from("assignments")
      .select("id")
      .eq("group_id", groupId)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to check draw status");
    }

    return data !== null;
  }

  /**
   * Gets the timestamp when the draw was executed
   *
   * @param groupId - The ID of the group
   * @returns ISO timestamp of first assignment creation, or null if no draw
   * @throws {Error} If database operation fails
   */
  async getDrawTimestamp(groupId: number): Promise<string | null> {
    // Guard: Validate groupId
    if (!groupId) {
      throw new Error("Group ID is required");
    }

    const { data, error } = await this.supabase
      .from("assignments")
      .select("created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error("Failed to fetch draw timestamp");
    }

    return data?.created_at || null;
  }
}
