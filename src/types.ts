import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";
import type React from "react";
import type { APIContext } from "astro";

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Extended API context for Cloudflare Workers environment
 * Includes the env property that's available in Cloudflare Workers runtime
 */
export interface CloudflareWorkersAPIContext extends APIContext {
  env?: {
    OPENROUTER_API_KEY?: string;
    PUBLIC_SITE_URL?: string;
    [key: string]: string | undefined;
  };
}

/**
 * Pagination metadata returned with list endpoints
 */
export interface PaginationMetadata {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

/**
 * Standard error response format
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination?: PaginationMetadata;
}

// ============================================================================
// GROUP DTOs and COMMANDS
// ============================================================================

/**
 * Command for creating a new Secret Santa group
 * POST /api/groups
 */
export interface CreateGroupCommand {
  name: string;
  budget: number;
  end_date: string; // ISO 8601 datetime string
}

/**
 * Command for updating an existing group
 * PATCH /api/groups/:groupId
 * All fields are optional
 */
export type UpdateGroupCommand = Partial<CreateGroupCommand>;

/**
 * Base Group DTO - extends database row with computed is_drawn field
 * Note: is_drawn is derived from whether assignments exist, not stored in DB
 */
export interface GroupDTO {
  id: number;
  name: string;
  budget: number;
  end_date: string;
  creator_id: string;
  is_drawn: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Group DTO for list views with additional computed fields
 * GET /api/groups
 */
export interface GroupListItemDTO extends GroupDTO {
  participants_count: number;
  is_creator: boolean;
}

/**
 * Detailed Group DTO with nested participants and exclusions
 * GET /api/groups/:groupId
 */
export interface GroupDetailDTO extends GroupDTO {
  participants: ParticipantDTO[];
  exclusions: ExclusionRuleDTO[];
  is_creator: boolean;
  can_edit: boolean;
  drawn_at?: string; // Timestamp when draw was executed, only present when group is drawn
}

/**
 * Paginated response for groups list
 */
export type PaginatedGroupsDTO = PaginatedResponse<GroupListItemDTO>;

// ============================================================================
// PARTICIPANT DTOs and COMMANDS
// ============================================================================

/**
 * Command for adding a participant to a group
 * POST /api/groups/:groupId/participants
 */
export interface CreateParticipantCommand {
  name: string;
  email?: string; // Optional - for registered participants
}

/**
 * Command for updating participant details
 * PATCH /api/participants/:participantId
 * All fields are optional
 */
export type UpdateParticipantCommand = Partial<CreateParticipantCommand>;

/**
 * Base Participant DTO - maps directly to database row
 */
export type ParticipantDTO = Tables<"participants">;

/**
 * Participant DTO returned after creation, includes access token
 * POST /api/groups/:groupId/participants response
 * Note: access_token is now stored in DB (participants.access_token column)
 */
export interface ParticipantWithTokenDTO extends ParticipantDTO {
  access_token: string;
}

/**
 * Participant DTO with associated group information
 * Used internally by services for validation and business logic
 */
export interface ParticipantWithGroupDTO extends ParticipantDTO {
  group: {
    id: number;
    end_date: string;
    creator_id: string;
  };
}

/**
 * Participant DTO for list views with wishlist status
 * GET /api/groups/:groupId/participants
 * Note: access_token is included only when requested by group creator
 */
export interface ParticipantListItemDTO {
  id: number;
  group_id: number;
  user_id: string | null;
  name: string;
  email: string | null;
  created_at: string;
  result_viewed_at: string | null;
  has_wishlist: boolean;
  access_token?: string; // Only included for group creator
  result_viewed?: boolean; // Only present when group is drawn
}

/**
 * Paginated response for participants list
 */
export type PaginatedParticipantsDTO = PaginatedResponse<ParticipantListItemDTO>;

// ============================================================================
// EXCLUSION RULE DTOs and COMMANDS
// ============================================================================

/**
 * Command for creating an exclusion rule
 * POST /api/groups/:groupId/exclusions
 */
export interface CreateExclusionRuleCommand {
  blocker_participant_id: number;
  blocked_participant_id: number;
}

/**
 * Base Exclusion Rule DTO - maps directly to database row
 */
export type ExclusionRuleDTO = Tables<"exclusion_rules">;

/**
 * Exclusion Rule DTO for list views with participant names
 * GET /api/groups/:groupId/exclusions
 */
export interface ExclusionRuleListItemDTO extends ExclusionRuleDTO {
  blocker_name: string;
  blocked_name: string;
}

/**
 * Paginated response for exclusion rules list
 */
export type PaginatedExclusionRulesDTO = PaginatedResponse<ExclusionRuleListItemDTO>;

// ============================================================================
// DRAW DTOs
// ============================================================================

/**
 * Response from executing a Secret Santa draw
 * POST /api/groups/:groupId/draw
 */
export interface DrawResultDTO {
  success: boolean;
  message: string;
  group_id: number;
  drawn_at: string;
  participants_notified: number;
}

/**
 * Response from validating if a draw is possible
 * POST /api/groups/:groupId/draw/validate
 */
export interface DrawValidationDTO {
  valid: boolean;
  participants_count: number;
  exclusions_count: number;
  message: string;
  details?: string; // Only present when validation fails
}

// ============================================================================
// ASSIGNMENT DTOs
// ============================================================================

/**
 * Base Assignment DTO - maps directly to database row
 * Used to store Secret Santa draw results (who gives to whom)
 */
export type AssignmentDTO = Tables<"assignments">;

// ============================================================================
// RESULT DTOs
// ============================================================================

/**
 * Minimal group info for result display
 */
export interface ResultGroupInfo {
  id: number;
  name: string;
  budget: number;
  end_date: string;
}

/**
 * Minimal participant info for result display
 */
export interface ResultParticipantInfo {
  id: number;
  name: string;
  result_viewed_at?: string; // When the participant viewed their result
}

/**
 * Assigned participant info with their wishlist
 */
export interface ResultAssignedParticipant {
  id: number;
  name: string;
  wishlist?: string; // May be null if no wishlist exists
}

/**
 * Current participant's wishlist info
 */
export interface ResultMyWishlist {
  content?: string; // May be null if no wishlist exists
  can_edit: boolean;
}

/**
 * Wishlist statistics for motivating participants
 */
export interface WishlistStats {
  total_participants: number;
  participants_with_wishlist: number;
}

/**
 * Complete draw result response for a participant
 * GET /api/groups/:groupId/result
 * GET /api/results/:token
 */
export interface DrawResultResponseDTO {
  group: ResultGroupInfo;
  participant: ResultParticipantInfo;
  assigned_to: ResultAssignedParticipant;
  my_wishlist: ResultMyWishlist;
  wishlist_stats: WishlistStats;
}

/**
 * Result access tracking information
 * POST /api/results/:token/track response
 */
export interface ResultAccessTrackingDTO {
  participant_id: number;
  access_count: number;
  first_accessed_at: string;
  last_accessed_at: string;
}

// ============================================================================
// WISHLIST DTOs and COMMANDS
// ============================================================================

/**
 * Command for creating or updating a wishlist
 * PUT /api/participants/:participantId/wishlist
 */
export interface CreateOrUpdateWishlistCommand {
  wishlist: string;
}

/**
 * Base Wishlist DTO - maps directly to database row
 */
export type WishlistDTO = Tables<"wishes">;

/**
 * Wishlist DTO with HTML-rendered content and edit capability
 * GET /api/participants/:participantId/wishlist
 */
export interface WishlistWithHtmlDTO extends WishlistDTO {
  wishlist_html: string; // Auto-linked URLs converted to HTML
  can_edit: boolean;
}

/**
 * Response from generating Santa letter from existing wishlist content
 * POST /api/participants/:participantId/wishlist/generate-from-wishlist
 */
export interface GenerateSantaLetterFromWishlistResponse {
  generated_content: string; // The generated Santa letter content
  suggested_gifts: string[]; // List of suggested gifts extracted from AI
  remaining_generations: number; // Remaining AI generation quota
  can_generate_more: boolean; // Whether user can generate more letters
  is_registered: boolean; // Whether the participant is a registered user
  metadata: {
    model: string; // AI model used for generation
    tokens_used: number; // Total tokens consumed
    generation_time: number; // Time taken for generation in milliseconds
  };
}

// ============================================================================
// QUERY PARAMETER TYPES
// ============================================================================

/**
 * Query parameters for listing groups
 * GET /api/groups
 */
export interface GroupsListQuery {
  filter?: "created" | "joined" | "all";
  page?: number;
  limit?: number;
}

/**
 * Query parameters for pagination
 */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}

/**
 * Query parameter for unregistered participant access
 */
export interface ParticipantTokenQuery {
  token?: string;
}

// ============================================================================
// DATABASE ENTITY ALIASES (for convenience)
// ============================================================================

/**
 * Type aliases for database insert operations
 * These can be used directly for database inserts
 */
export type GroupInsert = TablesInsert<"groups">;
export type ParticipantInsert = TablesInsert<"participants">;
export type ExclusionRuleInsert = TablesInsert<"exclusion_rules">;
export type WishlistInsert = TablesInsert<"wishes">;
export type AssignmentInsert = TablesInsert<"assignments">;
/**
 * Type aliases for database update operations
 * These can be used directly for database updates
 */
export type GroupUpdate = TablesUpdate<"groups">;
export type ParticipantUpdate = TablesUpdate<"participants">;
export type ExclusionRuleUpdate = TablesUpdate<"exclusion_rules">;
export type WishlistUpdate = TablesUpdate<"wishes">;

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Helper type for API response that may contain data or error
 */
export type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiErrorResponse["error"] };

/**
 * User ID type (from Supabase Auth)
 */
export type UserId = string;

/**
 * Participant access token type (for unregistered users)
 */
export type ParticipantToken = string;

// ============================================================================
// VIEW MODELS (Extended types for the frontend)
// ============================================================================

/**
 * Extended group model with additional formatting fields for the view
 */
export interface GroupViewModel extends GroupDetailDTO {
  // Formatted values for display
  formattedBudget: string; // np. "150 PLN"
  formattedEndDate: string; // "25 grudnia 2025, 23:59"
  formattedCreatedAt: string; // "10 października 2025"

  // Computed fields
  isExpired: boolean; // whether the end date has passed
  daysUntilEnd: number; // number of days until the end (-1 if passed)
  participantsCount: number; // number of participants
  exclusionsCount: number; // number of exclusions

  // Status
  statusBadge: {
    text: string; // "Przed losowaniem" | "Losowanie zakończone"
    variant: "default" | "secondary"; // dla Shadcn badge
  };
}

/**
 * Extended participant model with additional fields for the view
 */
export interface ParticipantViewModel extends Omit<ParticipantListItemDTO, "access_token"> {
  // Flags
  isCreator: boolean; // whether the participant is the creator of the group
  isCurrentUser: boolean; // whether the participant is the current user
  canDelete: boolean; // whether the participant can be deleted (false for the creator)

  // Formatted values
  displayEmail: string; // "j***@example.com" or "john@example.com" or "Brak"
  rawEmail: string | null; // Original, unformatted email (null if missing)
  displayName: string; // "John Doe" or "John Doe (You)" for the current user
  initials: string; // "JD" for the avatar

  // Status (after drawing)
  wishlistStatus?: {
    hasWishlist: boolean;
    text: string; // "Added" | "Missing"
    variant: "default" | "destructive";
    icon: React.ComponentType<{ className?: string }>;
  };

  resultStatus?: {
    // only after drawing
    viewed: boolean;
    text: string; // "Viewed" | "Not viewed"
    variant: "default" | "outline";
    icon: React.ComponentType<{ className?: string }>;
  };

  // Token (for unregistered users)
  resultLink?: string; // full URL: /results/:token
}

/**
 * Extended exclusion model with formatting for the view
 */
export interface ExclusionViewModel extends ExclusionRuleListItemDTO {
  // Formatted values
  displayText: string; // "Jan Kowalski cannot draw Anna Nowak"
  shortDisplayText: string; // "Jan → Anna" (for mobile)

  // Flags
  canDelete: boolean; // whether it can be deleted (false after drawing)
}

/**
 * Model status of the possibility of conducting a drawing
 */
export interface DrawStatusViewModel {
  // Validation
  canDraw: boolean; // whether it can be started
  isValid: boolean; // whether the exclusions allow for drawing

  // Reason (if !canDraw)
  reason?: string; // "Minimum 3 participants required"
  validationMessage: string; // validation message
  validationDetails?: string; // validation error details

  // Statistics
  participantsCount: number;
  exclusionsCount: number;

  // UI
  buttonText: string; // text on the button
  buttonDisabled: boolean;
  alertVariant: "default" | "warning" | "destructive";
}

// ============================================================================
// FORM VIEW MODELS (for React Hook Form)
// ============================================================================

/**
 * ViewModel for the group edit form
 */
export interface EditGroupFormViewModel {
  name: string;
  budget: number;
  end_date: Date;
}

/**
 * ViewModel for the participant add form
 */
export interface AddParticipantFormViewModel {
  name: string;
  email?: string;
}

/**
 * ViewModel for the participant edit form
 */
export interface EditParticipantFormViewModel {
  name: string;
  email?: string;
}

/**
 * ViewModel for the exclusion add form
 */
export interface AddExclusionFormViewModel {
  blocker_participant_id?: number;
  blocked_participant_id?: number;
  bidirectional: boolean;
}

// ============================================================================
// HELPER TYPES (extended)
// ============================================================================

/**
 * Status of the API response
 */
export type ApiStatus = "idle" | "loading" | "success" | "error";

/**
 * Standard error from the API
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Type for the copy action
 */
export interface CopyToClipboardResult {
  success: boolean;
  message: string;
}

// ============================================================================
// RESULT VIEW MODELS (extended types for the result view)
// ============================================================================

/**
 * ViewModel for the result view
 * Extends DTO with formatted and computed fields for the frontend
 */
export interface ResultViewModel {
  // Data from the API
  group: ResultGroupInfo;
  participant: ResultParticipantInfo;
  assigned_to: ResultAssignedParticipant;
  my_wishlist: ResultMyWishlist;
  wishlist_stats: WishlistStats;

  // Formatted values for display
  formattedBudget: string; // "150 PLN"
  formattedEndDate: string; // "25 grudnia 2025"
  formattedShortEndDate: string; // "25.12.2025"

  // Computed values
  isExpired: boolean; // whether the end date has passed
  daysUntilEnd: number; // number of days until the end (-1 if passed)

  // Data of the assigned person (extended)
  assignedPersonInitials: string; // "JK" - initials for the avatar
  assignedPersonWishlistHtml?: string; // HTML with auto-linked URLs

  // Access and authentication context
  isAuthenticated: boolean; // whether the participant is authenticated
  accessToken?: string; // access token for unregistered participants

  // Convenience properties
  resultViewedAt?: string; // when the participant viewed their result (convenience property)
}

/**
 * State of the wishlist editor
 * Used in useWishlistEditor hook
 */
export interface WishlistEditorState {
  content: string; // current content
  originalContent: string; // original content (from API)
  isSaving: boolean; // whether it is saving
  hasChanges: boolean; // whether there are unsaved changes
  lastSaved: Date | null; // when last saved
  saveError: string | null; // save error message
  characterCount: number; // number of characters
  canEdit: boolean; // whether it can be edited
}

/**
 * State of the result discovery (localStorage)
 * Stored in localStorage with the key:
 * result_revealed_${groupId}_${participantId}
 */
export interface ResultRevealState {
  groupId: number;
  participantId: number;
  revealed: boolean; // whether the result is revealed
  revealedAt: number; // timestamp of the discovery (Date.now())
}

/**
 * State of the confetti (for animation)
 */
export interface ConfettiState {
  isActive: boolean; // whether the animation is active
  numberOfPieces: number; // number of confetti elements (200-400)
  recycle: boolean; // whether to recycle (false = one reuse)
}

// ============================================================================
// RESULT HOOK TYPES (types for custom hooks)
// ============================================================================

/**
 * Return type from useResultData hook
 */
export interface UseResultDataReturn {
  result: ResultViewModel | null;
  isLoading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
}

/**
 * Return type from useRevealState hook
 */
export interface UseRevealStateReturn {
  isRevealed: boolean;
  reveal: () => void;
  reset: () => void;
}

/**
 * Return type from useWishlistEditor hook
 */
export interface UseWishlistEditorReturn {
  state: WishlistEditorState;
  content: string;
  setContent: (content: string) => void;
  isSaving: boolean;
  saveError: string | null;
  lastSaved: Date | null;
  canEdit: boolean;
  characterCount: number;
  hasChanges: boolean;
  save: () => Promise<void>;
}

/**
 * Return type from useWishlistLinking hook
 */
export interface UseWishlistLinkingReturn {
  convertToHtml: (text: string) => string;
  extractUrls: (text: string) => string[];
}

/**
 * Props for AIGenerateButton component
 */
export interface AIGenerateButtonProps {
  participantId: number;
  token?: string;
  onGenerateSuccess?: () => void;
  disabled?: boolean;
  className?: string;
  status?: AIGenerationStatusResponse | null;
  isLoading?: boolean;
}

// ============================================================================
// AI GENERATION TYPES
// ============================================================================

/**
 * Request for generating AI letter to Santa
 * POST /api/participants/:participantId/wishlist/generate-ai
 */
export interface GenerateAIRequest {
  prompt: string;
}

/**
 * Response for generating AI letter to Santa
 */
export interface GenerateAIResponse {
  generated_content: string;
  remaining_generations: number;
  can_generate_more: boolean;
}

/**
 * Status generating AI
 * GET /api/participants/:participantId/wishlist/ai-status
 */
export interface AIGenerationStatusResponse {
  ai_generation_count: number;
  remaining_generations: number;
  max_generations: number;
  can_generate: boolean;
  is_registered: boolean;
  last_generated_at: string | null;
}

/**
 * AI generation error
 */
export interface AIGenerationError {
  code: string;
  message: string;
}

/**
 * Return type from useAIGeneration hook
 */
export interface UseAIGenerationReturn {
  isGenerating: boolean;
  isRegenerating: boolean;
  error: AIGenerationError | null;
  generatedContent: string | null;
  currentPrompt: string | null;
  remainingGenerations: number | null;
  generateLetter: (prompt: string) => Promise<void>;
  regenerateLetter: () => Promise<void>;
  acceptLetter: () => Promise<void>;
  rejectLetter: () => Promise<void>;
  reset: () => void;
}

/**
 * Return type from useAIGenerationStatus hook
 */
export interface UseAIGenerationStatusReturn {
  status: AIGenerationStatusResponse | null;
  isLoading: boolean;
  error: AIGenerationError | null;
  refetch: () => Promise<void>;
}

/**
 * Props for AIPromptModal component
 */
export interface AIPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => Promise<void>;
  isLoading: boolean;
  error: AIGenerationError | null;
}

/**
 * Props for AIPreviewModal component
 */
export interface AIPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  generatedContent: string;
  onAccept: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  isRegenerating: boolean;
  remainingGenerations: number;
  currentPrompt: string;
}
