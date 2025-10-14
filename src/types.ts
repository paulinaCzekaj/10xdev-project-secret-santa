import type { Tables, TablesInsert, TablesUpdate } from "./db/database.types";

// ============================================================================
// COMMON TYPES
// ============================================================================

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
 * Complete draw result response for a participant
 * GET /api/groups/:groupId/result
 * GET /api/results/:token
 */
export interface DrawResultResponseDTO {
  group: ResultGroupInfo;
  participant: ResultParticipantInfo;
  assigned_to: ResultAssignedParticipant;
  my_wishlist: ResultMyWishlist;
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
// VIEW MODELS (Rozszerzone typy dla frontendu)
// ============================================================================

/**
 * Rozszerzony model grupy z dodatkowymi polami formatującymi dla widoku
 */
export interface GroupViewModel extends GroupDetailDTO {
  // Formatowane wartości dla wyświetlania
  formattedBudget: string; // np. "150 PLN"
  formattedEndDate: string; // np. "25 grudnia 2025, 23:59"
  formattedCreatedAt: string; // np. "10 października 2025"

  // Pola obliczeniowe
  isExpired: boolean; // czy data zakończenia minęła
  daysUntilEnd: number; // ile dni do końca (-1 jeśli przeszła)
  participantsCount: number; // liczba uczestników
  exclusionsCount: number; // liczba wykluczeń

  // Status
  statusBadge: {
    text: string; // "Przed losowaniem" | "Losowanie zakończone"
    variant: "default" | "secondary"; // dla Shadcn badge
  };
}

/**
 * Rozszerzony model uczestnika z dodatkowymi polami dla widoku
 */
export interface ParticipantViewModel extends Omit<ParticipantListItemDTO, "access_token"> {
  // Flagi
  isCreator: boolean; // czy uczestnik jest twórcą grupy
  isCurrentUser: boolean; // czy to zalogowany użytkownik
  canDelete: boolean; // czy można usunąć (false dla twórcy)

  // Formatowane wartości
  displayEmail: string; // "j***@example.com" lub "john@example.com" lub "Brak"
  displayName: string; // "John Doe" lub "John Doe (Ty)" dla current user
  initials: string; // "JD" dla avatara

  // Status (po losowaniu)
  wishlistStatus?: {
    hasWishlist: boolean;
    text: string; // "Dodana" | "Brak"
    variant: "secondary";
  };

  resultStatus?: {
    // tylko po losowaniu
    viewed: boolean;
    text: string; // "Zobaczył" | "Nie zobaczył"
    variant: "secondary";
  };

  // Token (dla niezarejestrowanych)
  resultLink?: string; // pełny URL: /results/:token
}

/**
 * Rozszerzony model wykluczenia z formatowaniem dla widoku
 */
export interface ExclusionViewModel extends ExclusionRuleListItemDTO {
  // Formatowane wartości
  displayText: string; // "Jan Kowalski nie może wylosować Anny Nowak"
  shortDisplayText: string; // "Jan → Anna" (dla mobile)

  // Flagi
  canDelete: boolean; // czy można usunąć (false po losowaniu)
}

/**
 * Model statusu możliwości przeprowadzenia losowania
 */
export interface DrawStatusViewModel {
  // Walidacja
  canDraw: boolean; // czy można rozpocząć losowanie
  isValid: boolean; // czy wykluczenia pozwalają na losowanie

  // Przyczyna (jeśli !canDraw)
  reason?: string; // np. "Minimum 3 uczestników wymagane"
  validationMessage: string; // wiadomość z walidacji
  validationDetails?: string; // szczegóły błędu walidacji

  // Statystyki
  participantsCount: number;
  exclusionsCount: number;

  // UI
  buttonText: string; // tekst na przycisku
  buttonDisabled: boolean;
  alertVariant: "default" | "warning" | "destructive";
}

// ============================================================================
// FORM VIEW MODELS (dla React Hook Form)
// ============================================================================

/**
 * ViewModel dla formularza edycji grupy
 */
export interface EditGroupFormViewModel {
  name: string;
  budget: number;
  end_date: Date;
}

/**
 * ViewModel dla formularza dodawania uczestnika
 */
export interface AddParticipantFormViewModel {
  name: string;
  email?: string;
}

/**
 * ViewModel dla formularza edycji uczestnika
 */
export interface EditParticipantFormViewModel {
  name: string;
  email?: string;
}

/**
 * ViewModel dla formularza dodawania wykluczenia
 */
export interface AddExclusionFormViewModel {
  blocker_participant_id: number;
  blocked_participant_id: number;
}

// ============================================================================
// HELPER TYPES (rozszerzone)
// ============================================================================

/**
 * Status odpowiedzi API
 */
export type ApiStatus = "idle" | "loading" | "success" | "error";

/**
 * Standardowy error z API
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Typ dla akcji kopiowania
 */
export interface CopyToClipboardResult {
  success: boolean;
  message: string;
}
