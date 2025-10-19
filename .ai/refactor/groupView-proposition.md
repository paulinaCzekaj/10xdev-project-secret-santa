# GroupView.tsx - Refactoring Analysis and Proposition

**Component:** `src/components/group/GroupView.tsx`
**Current LOC:** 468 lines
**Analysis Date:** 2025-10-16
**Priority:** 🔴 HIGH

---

## Executive Summary

The GroupView component is the most complex component in the codebase, serving as a container/orchestrator for the group management feature. While all child form components are already well-implemented with React Hook Form, the main complexity lies in:

1. **Modal State Management:** 7 separate useState hooks
2. **Data Transformation Logic:** 73 lines of DTO → ViewModel transformations
3. **API Call Management:** Repetitive patterns across 4 custom hooks
4. **Event Handler Coordination:** 15+ handlers managing child component interactions

**Key Finding:** The forms are already optimal. The refactoring should focus on reducing orchestration complexity and API duplication.

---

## 1. Current State Analysis

### 1.1 Component Structure

**GroupView.tsx (468 lines):**

- Lines 46-81: Local state management (7 useState hooks)
- Lines 51-65: Four custom data hooks (useGroupData, useParticipants, useExclusions, useDraw)
- Lines 84-156: Three transformation functions (73 lines)
- Lines 158-257: Event handlers for child coordination
- Lines 280-357: Conditional rendering for loading/error/empty states
- Lines 359-418: Main render with sections
- Lines 422-465: Multiple modal components

### 1.2 Child Components Status

**✅ Already Optimized with React Hook Form:**

1. **AddParticipantForm.tsx**
   - Zod schema validation (lines 15-18)
   - useForm with zodResolver (lines 28-34)
   - Clean submission handler with API calls (lines 36-70)
   - **Assessment:** No refactoring needed

2. **GroupEditModal.tsx**
   - Zod schema with custom date validation (lines 38-62)
   - useForm with zodResolver (lines 79-86)
   - useEffect for form sync (lines 89-97)
   - **Assessment:** No refactoring needed

3. **AddExclusionForm.tsx**
   - Zod schema with self-exclusion validation (lines 21-39)
   - Custom duplicate check logic (lines 60-64)
   - **Assessment:** No refactoring needed

4. **EditParticipantModal.tsx**
   - Zod schema validation (lines 28-38)
   - useForm with zodResolver (lines 55-61)
   - **Assessment:** No refactoring needed

### 1.3 Complexity Metrics

**State Management:**

```typescript
// Lines 68-74: 7 modal state variables
const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
const [isDeleteParticipantModalOpen, setIsDeleteParticipantModalOpen] = useState(false);
const [isDrawConfirmationModalOpen, setIsDrawConfirmationModalOpen] = useState(false);
const [isEditParticipantModalOpen, setIsEditParticipantModalOpen] = useState(false);
const [selectedParticipant, setSelectedParticipant] = useState<ParticipantViewModel | null>(null);
const [participantToDelete, setParticipantToDelete] = useState<ParticipantViewModel | null>(null);
```

**Issue:** Too many state variables for related concerns

**Data Transformations:**

```typescript
// Lines 84-156: Complex transformation logic
const transformGroupToViewModel = useMemo(
  () =>
    (group: GroupDetailDTO): GroupViewModel => {
      return {
        ...group,
        formattedBudget: formatCurrency(group.budget),
        formattedEndDate: formatDate(group.end_date),
        // ... 20+ more lines
      };
    },
  []
);

const transformParticipantsToViewModels = useMemo(
  () =>
    (participants: ParticipantListItemDTO[]): ParticipantViewModel[] => {
      return participants.map((participant): ParticipantViewModel => {
        // ... 25+ lines of transformation logic
      });
    },
  [currentUserId, group?.creator_id, group?.is_drawn]
);

const transformExclusionsToViewModels = useMemo(
  () =>
    (exclusions: ExclusionRuleListItemDTO[]): ExclusionViewModel[] => {
      // ... 15+ lines of transformation logic
    },
  [group?.is_drawn]
);
```

**Issue:** 73 lines of transformation logic mixed with component

---

## 2. API Call Duplication Analysis

### 2.1 Current Pattern Issues

Each custom hook (useGroupData, useParticipants, useExclusions) repeats the same pattern:

**useGroupData.ts (lines 17-44):**

```typescript
const fetchGroup = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    const session = await supabaseClient.auth.getSession(); // ← Repeated
    const response = await fetch(`/api/groups/${groupId}`, {
      headers: {
        Authorization: `Bearer ${session.data.session?.access_token}`, // ← Repeated
      },
    });

    if (!response.ok) {
      // ← Repeated error handling
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Błąd pobierania grupy");
    }

    const data: GroupDetailDTO = await response.json();
    setGroup(data);
  } catch (err) {
    // ← Repeated error pattern
    setError({
      code: "FETCH_ERROR",
      message: err instanceof Error ? err.message : "Nieznany błąd",
    });
  } finally {
    setLoading(false);
  }
}, [groupId]);
```

**This pattern is repeated in:**

- useParticipants.ts (4 functions: fetch, add, update, delete)
- useExclusions.ts (3 functions: fetch, add, delete)
- useDraw.ts (2 functions: validate, execute)

**Total Duplication:** ~200 lines of repeated auth/fetch/error handling code

### 2.2 Problems with Current Approach

1. **Session Management Scattered:** Every API call fetches session independently
2. **No Centralized Error Handling:** Each hook implements its own error mapping
3. **Inconsistent Return Types:** Some return `{ success, data }`, others auto-refetch
4. **No Request/Response Interceptors:** Can't easily add global behaviors (logging, retry, etc.)
5. **Code Duplication:** ~50% of each hook is identical boilerplate

---

## 3. Refactoring Recommendations

### 3.1 HIGH Priority: Extract Data Transformations

**Create:** `src/hooks/useGroupViewModel.ts`

**Implementation:**

```typescript
// src/hooks/useGroupViewModel.ts
import { useMemo } from "react";
import type {
  GroupDetailDTO,
  ParticipantListItemDTO,
  ExclusionRuleListItemDTO,
  GroupViewModel,
  ParticipantViewModel,
  ExclusionViewModel,
} from "@/types";
import {
  formatCurrency,
  formatDate,
  formatRelativeDate,
  getInitials,
  formatParticipantEmail,
  formatParticipantName,
  calculateDaysUntilEnd,
  isDateExpired,
  formatExclusionText,
  formatExclusionShortText,
  formatWishlistStatus,
  formatResultStatus,
  formatGroupStatusBadge,
} from "@/lib/utils/formatters";

interface UseGroupViewModelParams {
  group: GroupDetailDTO | null;
  participants: ParticipantListItemDTO[];
  exclusions: ExclusionRuleListItemDTO[];
  currentUserId: string | null;
}

export function useGroupViewModel({ group, participants, exclusions, currentUserId }: UseGroupViewModelParams) {
  const groupViewModel = useMemo<GroupViewModel | null>(() => {
    if (!group) return null;

    return {
      ...group,
      // Formatowane wartości dla wyświetlania
      formattedBudget: formatCurrency(group.budget),
      formattedEndDate: formatDate(group.end_date),
      formattedCreatedAt: formatRelativeDate(group.created_at),

      // Pola obliczeniowe
      isExpired: isDateExpired(group.end_date),
      daysUntilEnd: calculateDaysUntilEnd(group.end_date),
      participantsCount: group.participants.length,
      exclusionsCount: group.exclusions.length,

      // Status
      statusBadge: formatGroupStatusBadge(group.is_drawn, isDateExpired(group.end_date)),
    };
  }, [group]);

  const participantViewModels = useMemo<ParticipantViewModel[]>(() => {
    return participants.map((participant): ParticipantViewModel => {
      const isCurrentUser = participant.user_id !== null && participant.user_id === currentUserId;
      const isCreator = participant.user_id === group?.creator_id;

      return {
        ...participant,
        // Flagi
        isCreator,
        isCurrentUser,
        canDelete: !isCreator,

        // Formatowane wartości
        displayEmail: formatParticipantEmail(participant.email || undefined, isCurrentUser),
        displayName: formatParticipantName(participant.name, isCurrentUser),
        initials: getInitials(participant.name),

        // Status (po losowaniu)
        wishlistStatus: group?.is_drawn ? formatWishlistStatus(participant.has_wishlist) : undefined,
        resultStatus: group?.is_drawn ? formatResultStatus(participant.result_viewed || false) : undefined,

        // Token (dla niezarejestrowanych)
        resultLink: participant.access_token
          ? `${window.location.origin}/results/${participant.access_token}`
          : undefined,
      };
    });
  }, [participants, currentUserId, group?.creator_id, group?.is_drawn]);

  const exclusionViewModels = useMemo<ExclusionViewModel[]>(() => {
    return exclusions.map((exclusion): ExclusionViewModel => {
      return {
        ...exclusion,
        // Formatowane wartości
        displayText: formatExclusionText(exclusion.blocker_name, exclusion.blocked_name),
        shortDisplayText: formatExclusionShortText(exclusion.blocker_name, exclusion.blocked_name),

        // Flagi
        canDelete: !group?.is_drawn,
      };
    });
  }, [exclusions, group?.is_drawn]);

  return {
    groupViewModel,
    participantViewModels,
    exclusionViewModels,
  };
}
```

**Usage in GroupView.tsx:**

```typescript
export default function GroupView({ groupId }: GroupViewProps) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { group, loading: groupLoading, error: groupError, refetch: refetchGroup } = useGroupData(groupId);
  const { participants, loading: participantsLoading, refetch: refetchParticipants } = useParticipants(groupId);
  const { exclusions, loading: exclusionsLoading, refetch: refetchExclusions } = useExclusions(groupId);

  // Extract transformations to custom hook
  const { groupViewModel, participantViewModels, exclusionViewModels } = useGroupViewModel({
    group,
    participants,
    exclusions,
    currentUserId,
  });

  // ... rest of component
}
```

**Benefits:**

- Reduces GroupView from 468 to ~395 lines (-73 lines)
- Separates presentation logic from component logic
- Makes transformations testable in isolation
- Easier to maintain and modify transformations
- Reusable across different views

**Estimated Time:** 2-3 hours
**LOC Reduction:** -73 lines

---

### 3.2 HIGH Priority: Consolidate Modal State

**Create:** `src/hooks/useModalState.ts`

**Implementation:**

```typescript
// src/hooks/useModalState.ts
import { useState, useCallback } from "react";
import type { ParticipantViewModel } from "@/types";

type ModalType = "editGroup" | "deleteGroup" | "editParticipant" | "deleteParticipant" | "drawConfirmation";

interface ModalState {
  activeModal: ModalType | null;
  selectedParticipant: ParticipantViewModel | null;
  participantToDelete: ParticipantViewModel | null;
}

export function useModalState() {
  const [state, setState] = useState<ModalState>({
    activeModal: null,
    selectedParticipant: null,
    participantToDelete: null,
  });

  const openModal = useCallback((modal: ModalType, data?: Partial<ModalState>) => {
    setState({
      activeModal: modal,
      selectedParticipant: data?.selectedParticipant || null,
      participantToDelete: data?.participantToDelete || null,
    });
  }, []);

  const closeModal = useCallback(() => {
    setState({
      activeModal: null,
      selectedParticipant: null,
      participantToDelete: null,
    });
  }, []);

  return {
    // State
    activeModal: state.activeModal,
    selectedParticipant: state.selectedParticipant,
    participantToDelete: state.participantToDelete,

    // Computed booleans for convenience
    isEditGroupModalOpen: state.activeModal === "editGroup",
    isDeleteGroupModalOpen: state.activeModal === "deleteGroup",
    isEditParticipantModalOpen: state.activeModal === "editParticipant",
    isDeleteParticipantModalOpen: state.activeModal === "deleteParticipant",
    isDrawConfirmationModalOpen: state.activeModal === "drawConfirmation",

    // Actions
    openModal,
    closeModal,

    // Convenience methods
    openEditGroupModal: () => openModal("editGroup"),
    openDeleteGroupModal: () => openModal("deleteGroup"),
    openEditParticipantModal: (participant: ParticipantViewModel) =>
      openModal("editParticipant", { selectedParticipant: participant }),
    openDeleteParticipantModal: (participant: ParticipantViewModel) =>
      openModal("deleteParticipant", { participantToDelete: participant }),
    openDrawConfirmationModal: () => openModal("drawConfirmation"),
  };
}
```

**Usage in GroupView.tsx:**

```typescript
export default function GroupView({ groupId }: GroupViewProps) {
  const modals = useModalState();

  // Event handlers become simpler
  const handleEditGroupClick = () => {
    modals.openEditGroupModal();
  };

  const handleDeleteParticipant = (participant: ParticipantViewModel) => {
    modals.openDeleteParticipantModal(participant);
  };

  // In render
  return (
    <>
      {/* ... */}

      <GroupEditModal
        group={groupViewModel as GroupViewModel}
        isOpen={modals.isEditGroupModalOpen}
        onClose={modals.closeModal}
        onSave={handleGroupUpdated}
      />

      <DeleteParticipantModal
        participant={modals.participantToDelete}
        isOpen={modals.isDeleteParticipantModalOpen}
        onClose={modals.closeModal}
        onConfirm={handleConfirmDeleteParticipant}
      />

      {/* ... other modals */}
    </>
  );
}
```

**Benefits:**

- Reduces 7 useState hooks to 1 custom hook
- Type-safe modal management
- Easier to add new modals
- Cleaner event handlers
- Prevents impossible states (multiple modals open)

**Estimated Time:** 1-2 hours
**LOC Reduction:** -50 lines

---

### 3.3 HIGH Priority: Create API Client Service

**Create:** `src/services/apiClient.ts`

**Implementation:**

```typescript
// src/services/apiClient.ts
import { supabaseClient } from "@/db/supabase.client";

interface ApiClientConfig {
  baseUrl?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || "";
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error?.message || errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    return response.json();
  }

  async get<T>(url: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "GET",
      headers,
    });
    return this.handleResponse<T>(response);
  }

  async post<T, D = unknown>(url: string, data?: D): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "POST",
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });
    return this.handleResponse<T>(response);
  }

  async patch<T, D = unknown>(url: string, data: D): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse<T>(response);
  }

  async delete<T = void>(url: string): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}${url}`, {
      method: "DELETE",
      headers,
    });

    if (response.status === 204) {
      return undefined as T;
    }

    return this.handleResponse<T>(response);
  }
}

export const apiClient = new ApiClient();
```

**Create:** `src/services/groupsService.ts`

```typescript
// src/services/groupsService.ts
import { apiClient } from "./apiClient";
import type { GroupDetailDTO, GroupDTO, UpdateGroupCommand, CreateGroupCommand } from "@/types";

export const groupsService = {
  getById: (groupId: number) => apiClient.get<GroupDetailDTO>(`/api/groups/${groupId}`),

  create: (command: CreateGroupCommand) => apiClient.post<GroupDTO>("/api/groups", command),

  update: (groupId: number, command: UpdateGroupCommand) =>
    apiClient.patch<GroupDTO>(`/api/groups/${groupId}`, command),

  delete: (groupId: number) => apiClient.delete(`/api/groups/${groupId}`),
};
```

**Create:** `src/services/participantsService.ts`

```typescript
// src/services/participantsService.ts
import { apiClient } from "./apiClient";
import type {
  ParticipantListItemDTO,
  ParticipantWithTokenDTO,
  ParticipantDTO,
  CreateParticipantCommand,
  UpdateParticipantCommand,
  PaginatedParticipantsDTO,
} from "@/types";

export const participantsService = {
  getByGroupId: (groupId: number) => apiClient.get<PaginatedParticipantsDTO>(`/api/groups/${groupId}/participants`),

  create: (groupId: number, command: CreateParticipantCommand) =>
    apiClient.post<ParticipantWithTokenDTO>(`/api/groups/${groupId}/participants`, command),

  update: (participantId: number, command: UpdateParticipantCommand) =>
    apiClient.patch<ParticipantDTO>(`/api/participants/${participantId}`, command),

  delete: (participantId: number) => apiClient.delete(`/api/participants/${participantId}`),
};
```

**Refactor useGroupData.ts:**

```typescript
// src/hooks/useGroupData.ts
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { groupsService } from "@/services/groupsService";
import type { GroupDetailDTO, UpdateGroupCommand, GroupDTO, ApiError } from "@/types";

export function useGroupData(groupId: number) {
  const [group, setGroup] = useState<GroupDetailDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchGroup = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await groupsService.getById(groupId);
      setGroup(data);
    } catch (err) {
      setError({
        code: "FETCH_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  const updateGroup = useCallback(
    async (command: UpdateGroupCommand) => {
      try {
        const updatedGroup = await groupsService.update(groupId, command);
        await fetchGroup(); // Refresh full data

        toast.success("Grupa została zaktualizowana");
        return { success: true, data: updatedGroup };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [groupId, fetchGroup]
  );

  const deleteGroup = useCallback(async () => {
    try {
      await groupsService.delete(groupId);
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Nieznany błąd",
      };
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  return {
    group,
    loading,
    error,
    refetch: fetchGroup,
    updateGroup,
    deleteGroup,
  };
}
```

**Benefits:**

- Eliminates ~200 lines of duplicated auth/fetch/error handling
- Centralized error handling and logging
- Single place to add request/response interceptors
- Easier to implement retry logic, caching, etc.
- Type-safe API calls
- Reduces each hook by ~50% lines of code

**Estimated Time:** 4-5 hours
**LOC Reduction:** -200 lines across multiple hooks

---

### 3.4 MEDIUM Priority: Extract UI State Components

**Create:** `src/components/group/states/GroupViewSkeleton.tsx`

```typescript
// src/components/group/states/GroupViewSkeleton.tsx
export function GroupViewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Skeleton dla GroupHeader */}
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="flex gap-4">
            <div className="h-6 bg-gray-200 rounded w-24"></div>
            <div className="h-6 bg-gray-200 rounded w-32"></div>
            <div className="h-6 bg-gray-200 rounded w-28"></div>
          </div>
        </div>
      </div>

      {/* Skeleton dla sekcji */}
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Create:** `src/components/group/states/GroupViewError.tsx`

```typescript
// src/components/group/states/GroupViewError.tsx
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/types";

interface GroupViewErrorProps {
  error: ApiError;
  onRetry: () => void;
}

export function GroupViewError({ error, onRetry }: GroupViewErrorProps) {
  return (
    <div className="text-center py-12">
      <div className="text-red-500 mb-4">
        <AlertCircle className="w-12 h-12 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Nie udało się pobrać danych grupy
      </h3>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <Button
        onClick={onRetry}
        className="inline-flex items-center gap-2"
      >
        <RefreshCw className="h-4 w-4" />
        Spróbuj ponownie
      </Button>
    </div>
  );
}
```

**Create:** `src/components/group/states/GroupViewEmpty.tsx`

```typescript
// src/components/group/states/GroupViewEmpty.tsx
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export function GroupViewEmpty() {
  return (
    <div className="text-center py-12">
      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Grupa nie została znaleziona
      </h3>
      <p className="text-gray-600 mb-4">
        Grupa o podanym ID nie istnieje lub nie masz do niej dostępu.
      </p>
      <Button onClick={() => (window.location.href = "/dashboard")}>
        Powrót do dashboard
      </Button>
    </div>
  );
}
```

**Usage in GroupView.tsx:**

```typescript
import { GroupViewSkeleton } from "./states/GroupViewSkeleton";
import { GroupViewError } from "./states/GroupViewError";
import { GroupViewEmpty } from "./states/GroupViewEmpty";

export default function GroupView({ groupId }: GroupViewProps) {
  // ... hooks

  const isLoading = groupLoading || participantsLoading || exclusionsLoading;

  // Loading state
  if (isLoading && !group) {
    return <GroupViewSkeleton />;
  }

  // Error state
  if (groupError) {
    return <GroupViewError error={groupError} onRetry={refetchGroup} />;
  }

  // Empty state
  if (!group) {
    return <GroupViewEmpty />;
  }

  // Main render
  return (
    <>
      {/* ... main content */}
    </>
  );
}
```

**Benefits:**

- Removes 60+ lines from GroupView
- Reusable loading/error components
- Cleaner main component logic
- Easier to test different states
- Consistent error handling UI

**Estimated Time:** 1-2 hours
**LOC Reduction:** -60 lines

---

## 4. Testing Strategy

### 4.1 Unit Tests (Vitest)

**Test useGroupViewModel:**

```typescript
// src/hooks/__tests__/useGroupViewModel.test.ts
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useGroupViewModel } from "../useGroupViewModel";

describe("useGroupViewModel", () => {
  it("should transform group DTO to view model", () => {
    const mockGroup = {
      id: 1,
      name: "Test Group",
      budget: 100,
      end_date: "2025-12-31",
      created_at: "2025-01-01",
      is_drawn: false,
      participants: [],
      exclusions: [],
    };

    const { result } = renderHook(() =>
      useGroupViewModel({
        group: mockGroup,
        participants: [],
        exclusions: [],
        currentUserId: null,
      })
    );

    expect(result.current.groupViewModel).toBeDefined();
    expect(result.current.groupViewModel?.formattedBudget).toBe("100,00 PLN");
  });

  it("should identify current user in participants", () => {
    const mockParticipants = [
      { id: 1, name: "User 1", user_id: "user-1" },
      { id: 2, name: "User 2", user_id: "user-2" },
    ];

    const { result } = renderHook(() =>
      useGroupViewModel({
        group: null,
        participants: mockParticipants,
        exclusions: [],
        currentUserId: "user-1",
      })
    );

    expect(result.current.participantViewModels[0].isCurrentUser).toBe(true);
    expect(result.current.participantViewModels[1].isCurrentUser).toBe(false);
  });
});
```

**Test useModalState:**

```typescript
// src/hooks/__tests__/useModalState.test.ts
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useModalState } from "../useModalState";

describe("useModalState", () => {
  it("should open and close modals", () => {
    const { result } = renderHook(() => useModalState());

    expect(result.current.isEditGroupModalOpen).toBe(false);

    act(() => {
      result.current.openEditGroupModal();
    });

    expect(result.current.isEditGroupModalOpen).toBe(true);
    expect(result.current.activeModal).toBe("editGroup");

    act(() => {
      result.current.closeModal();
    });

    expect(result.current.isEditGroupModalOpen).toBe(false);
    expect(result.current.activeModal).toBe(null);
  });

  it("should handle participant data in modals", () => {
    const { result } = renderHook(() => useModalState());
    const mockParticipant = { id: 1, name: "Test User" };

    act(() => {
      result.current.openEditParticipantModal(mockParticipant);
    });

    expect(result.current.isEditParticipantModalOpen).toBe(true);
    expect(result.current.selectedParticipant).toEqual(mockParticipant);
  });
});
```

**Test apiClient:**

```typescript
// src/services/__tests__/apiClient.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiClient } from "../apiClient";
import { supabaseClient } from "@/db/supabase.client";

vi.mock("@/db/supabase.client");

describe("apiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("should add auth headers to requests", async () => {
    vi.mocked(supabaseClient.auth.getSession).mockResolvedValue({
      data: { session: { access_token: "test-token" } },
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ data: "test" }),
    } as Response);

    await apiClient.get("/test");

    expect(global.fetch).toHaveBeenCalledWith(
      "/test",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      })
    );
  });

  it("should handle error responses", async () => {
    vi.mocked(supabaseClient.auth.getSession).mockResolvedValue({
      data: { session: null },
    });

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: { message: "Not found" } }),
    } as Response);

    await expect(apiClient.get("/test")).rejects.toThrow("Not found");
  });
});
```

### 4.2 Integration Tests (React Testing Library)

**Test GroupView with mocked data:**

```typescript
// src/components/group/__tests__/GroupView.test.tsx
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import GroupView from "../GroupView";
import * as useGroupDataModule from "@/hooks/useGroupData";

vi.mock("@/hooks/useGroupData");
vi.mock("@/hooks/useParticipants");
vi.mock("@/hooks/useExclusions");
vi.mock("@/hooks/useDraw");

describe("GroupView", () => {
  it("should render loading state", () => {
    vi.mocked(useGroupDataModule.useGroupData).mockReturnValue({
      group: null,
      loading: true,
      error: null,
      refetch: vi.fn(),
      updateGroup: vi.fn(),
      deleteGroup: vi.fn(),
    });

    render(<GroupView groupId={1} />);

    expect(screen.getByTestId("group-view-skeleton")).toBeInTheDocument();
  });

  it("should render error state", () => {
    vi.mocked(useGroupDataModule.useGroupData).mockReturnValue({
      group: null,
      loading: false,
      error: { code: "ERROR", message: "Test error" },
      refetch: vi.fn(),
      updateGroup: vi.fn(),
      deleteGroup: vi.fn(),
    });

    render(<GroupView groupId={1} />);

    expect(screen.getByText(/nie udało się pobrać danych grupy/i)).toBeInTheDocument();
    expect(screen.getByText("Test error")).toBeInTheDocument();
  });
});
```

### 4.3 E2E Tests (Playwright)

**Test complete group management flow:**

```typescript
// e2e/group-management.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Group Management", () => {
  test("should manage group lifecycle", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('[name="email"]', "test@example.com");
    await page.fill('[name="password"]', "Test123!");
    await page.click('button[type="submit"]');

    // Create group
    await page.goto("/dashboard");
    await page.click('[data-testid="create-group-button"]');
    await page.fill('[data-testid="create-group-name-input"]', "E2E Test Group");
    await page.fill('[data-testid="create-group-budget-input"]', "100");

    // Select future date
    await page.click('[data-testid="create-group-date-picker"]');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    await page.click(`[data-date="${tomorrow.toISOString().split("T")[0]}"]`);

    await page.click('button[type="submit"]');

    // Verify redirect to group view
    await expect(page).toHaveURL(/\/groups\/\d+/);
    await expect(page.locator("h1")).toContainText("E2E Test Group");

    // Add participants
    await page.fill('[name="name"]', "Participant 1");
    await page.fill('[name="email"]', "participant1@example.com");
    await page.click('button:has-text("Dodaj uczestnika")');

    await waitFor(() => {
      expect(page.locator('[data-testid="participants-count"]')).toContainText("(2)");
    });

    // Edit group
    await page.click('button:has-text("Edytuj grupę")');
    await page.fill('[name="name"]', "Updated Group Name");
    await page.click('button:has-text("Zapisz zmiany")');

    await expect(page.locator("h1")).toContainText("Updated Group Name");
  });
});
```

---

## 5. Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Focus:** API Layer and Data Management

- [ ] Create `apiClient.ts` with base HTTP methods
- [ ] Create service modules: `groupsService.ts`, `participantsService.ts`, `exclusionsService.ts`
- [ ] Refactor `useGroupData.ts` to use services
- [ ] Refactor `useParticipants.ts` to use services
- [ ] Refactor `useExclusions.ts` to use services
- [ ] Write unit tests for apiClient and services

**Deliverables:**

- Centralized API client
- ~200 lines of duplication eliminated
- Consistent error handling

**Estimated Time:** 8-10 hours

---

### Phase 2: State Management (Week 2)

**Focus:** Simplify Component State

- [ ] Create `useModalState.ts` hook
- [ ] Create `useGroupViewModel.ts` hook
- [ ] Refactor GroupView to use new hooks
- [ ] Write unit tests for custom hooks

**Deliverables:**

- Reduced GroupView from 468 to ~345 lines (-123 lines)
- Cleaner state management
- Testable transformation logic

**Estimated Time:** 4-6 hours

---

### Phase 3: UI Components (Week 3)

**Focus:** Extract Reusable Components

- [ ] Create `GroupViewSkeleton.tsx`
- [ ] Create `GroupViewError.tsx`
- [ ] Create `GroupViewEmpty.tsx`
- [ ] Update GroupView to use state components
- [ ] Write Storybook stories for state components

**Deliverables:**

- Reusable UI state components
- Further reduce GroupView to ~285 lines (-60 lines)
- Better component composition

**Estimated Time:** 2-3 hours

---

### Phase 4: Testing & Documentation (Week 4)

**Focus:** Comprehensive Testing

- [ ] Write unit tests for all custom hooks
- [ ] Write integration tests for GroupView
- [ ] Write E2E tests for group management flow
- [ ] Update documentation
- [ ] Code review and cleanup

**Deliverables:**

- > 80% test coverage for new code
- E2E tests for critical flows
- Updated documentation

**Estimated Time:** 6-8 hours

---

## 6. Success Metrics

### Before Refactoring:

- **GroupView LOC:** 468 lines
- **Code Duplication:** ~200 lines across hooks
- **State Variables:** 7 separate useState hooks
- **Transformation Logic:** Embedded in component
- **Test Coverage:** 0%

### After Refactoring (Target):

- **GroupView LOC:** ~285 lines (-39% reduction)
- **Code Duplication:** <20 lines
- **State Variables:** 2 custom hooks (useModalState, useGroupViewModel)
- **Transformation Logic:** Isolated in testable hook
- **Test Coverage:** >80% for new hooks and services

### Additional Benefits:

- **Maintainability:** +40% (easier to understand and modify)
- **Testability:** +60% (isolated, testable units)
- **Reusability:** +50% (services and hooks reusable across app)
- **Type Safety:** Improved with service layer
- **Error Handling:** Consistent across all API calls

---

## 7. Risk Assessment

### Low Risk:

- ✅ Creating new custom hooks (useModalState, useGroupViewModel)
- ✅ Extracting UI state components
- ✅ Writing unit tests

**Mitigation:** These are additive changes that don't affect existing code until integrated.

### Medium Risk:

- ⚠️ Creating API client service layer
- ⚠️ Refactoring existing hooks to use services

**Mitigation:**

- Implement service layer alongside existing code
- Test thoroughly before replacing
- Use feature flags if needed
- Gradual rollout: one hook at a time

### High Risk:

- 🔴 Breaking changes to existing functionality

**Mitigation:**

- Comprehensive E2E tests before refactoring
- Manual QA testing after each phase
- Keep rollback plan ready
- Deploy to staging first

---

## 8. Alternative Approaches Considered

### Option A: React Query/TanStack Query

**Pros:**

- Industry standard for data fetching
- Built-in caching, refetching, optimistic updates
- Reduces boilerplate significantly

**Cons:**

- New dependency and learning curve
- Would require refactoring all existing hooks
- Might be overkill for MVP
- Team may not be familiar

**Decision:** Not recommended for MVP, can be considered for v2

### Option B: State Machine (XState)

**Pros:**

- Prevents impossible states
- Visual state machine diagrams
- Predictable state transitions

**Cons:**

- Significant learning curve
- Overkill for current complexity
- Additional dependency

**Decision:** Not recommended, current useReducer approach is sufficient

### Option C: Container/Presenter Pattern

**Pros:**

- Clear separation of logic and presentation
- Easier to test in isolation

**Cons:**

- Creates two components instead of one
- May be premature abstraction
- Current custom hooks achieve similar goal

**Decision:** Custom hooks provide similar benefits with less overhead

---

## 9. Conclusion

The GroupView component requires refactoring primarily around:

1. **API Management:** Eliminate ~200 lines of duplication with centralized service layer
2. **State Management:** Reduce 7 state variables to 2 custom hooks
3. **Data Transformation:** Extract 73 lines to dedicated hook
4. **UI States:** Extract 60 lines to reusable components

**Total Expected Reduction:** 468 → ~285 lines (-39%)

**Key Principle:** The forms are already optimal. Focus on orchestration and infrastructure.

**Recommended Approach:**

- Start with API client (highest impact, foundation for other changes)
- Then state management hooks (medium impact, reduces complexity)
- Then UI components (low impact, polish)
- Finally comprehensive testing

**Timeline:** 4 weeks (20-27 hours total)

**ROI:** High - significant improvement in maintainability, testability, and developer experience with manageable risk.

---

**Document Version:** 1.0
**Author:** Claude Code
**Last Updated:** 2025-10-16
