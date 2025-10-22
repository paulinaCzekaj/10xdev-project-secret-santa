# Usage Examples & Best Practices

**Practical examples for using the new refactored architecture**

---

## Table of Contents

1. [API Services Examples](#api-services-examples)
2. [Custom Hooks Examples](#custom-hooks-examples)
3. [Component Patterns](#component-patterns)
4. [Common Scenarios](#common-scenarios)
5. [Anti-Patterns to Avoid](#anti-patterns-to-avoid)

---

## API Services Examples

### Example 1: Simple GET Request

```typescript
import { groupsService } from "@/services/groupsService";
import { toast } from "sonner";

async function loadGroup(groupId: number) {
  try {
    const group = await groupsService.getById(groupId);
    console.log("Group loaded:", group.name);
    return group;
  } catch (error) {
    toast.error("Failed to load group");
    console.error(error);
    return null;
  }
}
```

### Example 2: Creating a Resource

```typescript
import { participantsService } from "@/services/participantsService";
import { toast } from "sonner";

async function addParticipant(groupId: number, name: string, email?: string) {
  try {
    const participant = await participantsService.create(groupId, {
      name,
      email: email || undefined,
    });

    // Handle unregistered user with access token
    if (participant.access_token) {
      const link = `${window.location.origin}/results/${participant.access_token}`;
      await navigator.clipboard.writeText(link);
      toast.success("Participant added! Access link copied to clipboard.");
    } else {
      toast.success("Participant added successfully!");
    }

    return participant;
  } catch (error) {
    toast.error("Failed to add participant");
    return null;
  }
}
```

### Example 3: Updating a Resource

```typescript
import { groupsService } from "@/services/groupsService";
import { toast } from "sonner";

async function updateGroupBudget(groupId: number, newBudget: number) {
  try {
    const updated = await groupsService.update(groupId, {
      budget: newBudget,
    });

    toast.success(`Budget updated to ${newBudget} PLN`);
    return updated;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    toast.error(message);
    return null;
  }
}
```

### Example 4: Deleting with Confirmation

```typescript
import { exclusionsService } from "@/services/exclusionsService";
import { toast } from "sonner";

async function deleteExclusion(exclusionId: number, onSuccess: () => void) {
  // Show confirmation dialog
  const confirmed = window.confirm("Are you sure you want to delete this exclusion?");
  if (!confirmed) return;

  try {
    await exclusionsService.delete(exclusionId);
    toast.success("Exclusion deleted");
    onSuccess(); // Refresh list
  } catch (error) {
    toast.error("Failed to delete exclusion");
  }
}
```

### Example 5: Multiple Sequential Requests

```typescript
import { groupsService } from "@/services/groupsService";
import { participantsService } from "@/services/participantsService";

async function duplicateGroup(originalGroupId: number) {
  try {
    // 1. Get original group
    const original = await groupsService.getById(originalGroupId);

    // 2. Create new group with same data
    const newGroup = await groupsService.create({
      name: `${original.name} (Copy)`,
      budget: original.budget,
      end_date: original.end_date,
    });

    // 3. Copy participants
    const { data: participants } = await participantsService.getByGroupId(originalGroupId);

    for (const participant of participants) {
      await participantsService.create(newGroup.id, {
        name: participant.name,
        email: participant.email || undefined,
      });
    }

    return newGroup;
  } catch (error) {
    console.error("Duplication failed:", error);
    throw error;
  }
}
```

### Example 6: Parallel Requests

```typescript
import { groupsService } from "@/services/groupsService";
import { participantsService } from "@/services/participantsService";
import { exclusionsService } from "@/services/exclusionsService";

async function loadAllGroupData(groupId: number) {
  try {
    // Load all data in parallel
    const [group, participantsResult, exclusionsResult] = await Promise.all([
      groupsService.getById(groupId),
      participantsService.getByGroupId(groupId),
      exclusionsService.getByGroupId(groupId),
    ]);

    return {
      group,
      participants: participantsResult.data,
      exclusions: exclusionsResult.data,
    };
  } catch (error) {
    console.error("Failed to load group data:", error);
    throw error;
  }
}
```

---

## Custom Hooks Examples

### Example 1: useModalState - Basic Usage

```typescript
import { useModalState } from '@/hooks/useModalState';

export default function MyComponent() {
  const modals = useModalState();

  const handleEdit = () => {
    modals.openEditGroupModal();
  };

  const handleSave = () => {
    // Save logic here
    modals.closeModal();
  };

  return (
    <div>
      <button onClick={handleEdit}>Edit</button>

      <EditModal
        isOpen={modals.isEditGroupModalOpen}
        onClose={modals.closeModal}
        onSave={handleSave}
      />
    </div>
  );
}
```

### Example 2: useModalState - With Data

```typescript
import { useModalState } from '@/hooks/useModalState';
import type { ParticipantViewModel } from '@/types';

export default function ParticipantsList({ participants }: { participants: ParticipantViewModel[] }) {
  const modals = useModalState();

  const handleEdit = (participant: ParticipantViewModel) => {
    modals.openEditParticipantModal(participant);
  };

  const handleDelete = (participant: ParticipantViewModel) => {
    modals.openDeleteParticipantModal(participant);
  };

  return (
    <div>
      {participants.map((participant) => (
        <div key={participant.id}>
          <span>{participant.name}</span>
          <button onClick={() => handleEdit(participant)}>Edit</button>
          <button onClick={() => handleDelete(participant)}>Delete</button>
        </div>
      ))}

      <EditParticipantModal
        participant={modals.selectedParticipant}
        isOpen={modals.isEditParticipantModalOpen}
        onClose={modals.closeModal}
      />

      <DeleteParticipantModal
        participant={modals.participantToDelete}
        isOpen={modals.isDeleteParticipantModalOpen}
        onClose={modals.closeModal}
      />
    </div>
  );
}
```

### Example 3: useGroupViewModel - Basic Usage

```typescript
import { useState, useEffect } from 'react';
import { useGroupData } from '@/hooks/useGroupData';
import { useParticipants } from '@/hooks/useParticipants';
import { useExclusions } from '@/hooks/useExclusions';
import { useGroupViewModel } from '@/hooks/useGroupViewModel';
import { supabaseClient } from '@/db/supabase.client';

export default function GroupSummary({ groupId }: { groupId: number }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const { group } = useGroupData(groupId);
  const { participants } = useParticipants(groupId);
  const { exclusions } = useExclusions(groupId);

  // Get current user
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  // Transform data
  const { groupViewModel, participantViewModels, exclusionViewModels } = useGroupViewModel({
    group,
    participants,
    exclusions,
    currentUserId,
  });

  if (!groupViewModel) return <div>Loading...</div>;

  return (
    <div>
      <h1>{groupViewModel.name}</h1>
      <p>Budget: {groupViewModel.formattedBudget}</p>
      <p>End Date: {groupViewModel.formattedEndDate}</p>
      <p>Days until end: {groupViewModel.daysUntilEnd}</p>
      <p>Status: {groupViewModel.statusBadge}</p>

      <h2>Participants ({groupViewModel.participantsCount})</h2>
      {participantViewModels.map((p) => (
        <div key={p.id}>
          {p.displayName}
          {p.isCurrentUser && ' (You)'}
          {p.isCreator && ' 👑'}
        </div>
      ))}

      <h2>Exclusions ({groupViewModel.exclusionsCount})</h2>
      {exclusionViewModels.map((e) => (
        <div key={e.id}>{e.displayText}</div>
      ))}
    </div>
  );
}
```

### Example 4: Combining Hooks with Services

```typescript
import { useState } from 'react';
import { useGroupData } from '@/hooks/useGroupData';
import { participantsService } from '@/services/participantsService';
import { toast } from 'sonner';

export default function QuickAddParticipant({ groupId }: { groupId: number }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { refetch } = useGroupData(groupId);

  const handleAdd = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }

    setLoading(true);
    try {
      await participantsService.create(groupId, { name: name.trim() });
      toast.success('Participant added!');
      setName('');
      refetch(); // Refresh group data
    } catch (error) {
      toast.error('Failed to add participant');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Participant name"
        disabled={loading}
      />
      <button onClick={handleAdd} disabled={loading || !name.trim()}>
        {loading ? 'Adding...' : 'Add'}
      </button>
    </div>
  );
}
```

---

## Component Patterns

### Pattern 1: Loading States

```typescript
import { GroupViewSkeleton } from '@/components/group/states/GroupViewSkeleton';
import { GroupViewError } from '@/components/group/states/GroupViewError';
import { useGroupData } from '@/hooks/useGroupData';

export default function GroupPage({ groupId }: { groupId: number }) {
  const { group, loading, error, refetch } = useGroupData(groupId);

  // Handle loading
  if (loading && !group) {
    return <GroupViewSkeleton />;
  }

  // Handle error
  if (error) {
    return <GroupViewError error={error} onRetry={refetch} />;
  }

  // Handle no data
  if (!group) {
    return <div>Group not found</div>;
  }

  // Render content
  return <div>{group.name}</div>;
}
```

### Pattern 2: Optimistic Updates

```typescript
import { useState } from 'react';
import { participantsService } from '@/services/participantsService';
import { toast } from 'sonner';

export default function ParticipantItem({ participant, onUpdate }) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    // Optimistic UI update
    setIsDeleting(true);

    try {
      await participantsService.delete(participant.id);
      onUpdate(); // Refresh list
      toast.success('Participant deleted');
    } catch (error) {
      // Revert on error
      setIsDeleting(false);
      toast.error('Failed to delete participant');
    }
  };

  if (isDeleting) {
    return <div className="opacity-50">Deleting...</div>;
  }

  return (
    <div>
      <span>{participant.name}</span>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

### Pattern 3: Form with Validation

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { groupsService } from '@/services/groupsService';
import { toast } from 'sonner';

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  budget: z.number().positive('Budget must be positive'),
});

type FormData = z.infer<typeof schema>;

export default function EditGroupForm({ groupId, initialData, onSuccess }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData,
  });

  const onSubmit = async (data: FormData) => {
    try {
      await groupsService.update(groupId, data);
      toast.success('Group updated!');
      onSuccess();
    } catch (error) {
      toast.error('Update failed');
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('name')} />
      {form.formState.errors.name && <span>{form.formState.errors.name.message}</span>}

      <input type="number" {...form.register('budget', { valueAsNumber: true })} />
      {form.formState.errors.budget && <span>{form.formState.errors.budget.message}</span>}

      <button type="submit" disabled={form.formState.isSubmitting}>
        {form.formState.isSubmitting ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

---

## Common Scenarios

### Scenario 1: Creating a New Feature

**Goal:** Add a "Archive Group" feature

**Step 1:** Add API endpoint to service

```typescript
// src/services/groupsService.ts
export const groupsService = {
  // ... existing methods

  archive: (groupId: number): Promise<GroupDTO> => apiClient.patch<GroupDTO>(`/api/groups/${groupId}/archive`, {}),
};
```

**Step 2:** Add to hook

```typescript
// src/hooks/useGroupData.ts
export function useGroupData(groupId: number) {
  // ... existing code

  const archiveGroup = useCallback(async () => {
    try {
      await groupsService.archive(groupId);
      await refetch(); // Refresh data
      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }, [groupId, refetch]);

  return {
    // ... existing returns
    archiveGroup,
  };
}
```

**Step 3:** Add UI button

```typescript
// src/components/group/GroupView.tsx
export default function GroupView({ groupId }) {
  const { archiveGroup } = useGroupData(groupId);

  const handleArchive = async () => {
    const confirmed = window.confirm('Archive this group?');
    if (!confirmed) return;

    const result = await archiveGroup();
    if (result.success) {
      toast.success('Group archived');
      window.location.href = '/dashboard';
    } else {
      toast.error(result.error);
    }
  };

  return <button onClick={handleArchive}>Archive Group</button>;
}
```

### Scenario 2: Handling Complex Forms

**Goal:** Multi-step form for group creation

```typescript
import { useState } from 'react';
import { groupsService } from '@/services/groupsService';
import { participantsService } from '@/services/participantsService';

export default function CreateGroupWizard() {
  const [step, setStep] = useState(1);
  const [groupData, setGroupData] = useState({});
  const [participants, setParticipants] = useState([]);

  const handleCreateGroup = async () => {
    try {
      // Step 1: Create group
      const group = await groupsService.create(groupData);

      // Step 2: Add participants
      for (const participant of participants) {
        await participantsService.create(group.id, participant);
      }

      toast.success('Group created with participants!');
      window.location.href = `/groups/${group.id}`;
    } catch (error) {
      toast.error('Failed to create group');
    }
  };

  return (
    <div>
      {step === 1 && (
        <GroupDetailsStep onNext={(data) => { setGroupData(data); setStep(2); }} />
      )}
      {step === 2 && (
        <AddParticipantsStep onNext={(data) => { setParticipants(data); setStep(3); }} />
      )}
      {step === 3 && (
        <ReviewStep groupData={groupData} participants={participants} onSubmit={handleCreateGroup} />
      )}
    </div>
  );
}
```

### Scenario 3: Real-time Updates

**Goal:** Auto-refresh group data every 30 seconds

```typescript
import { useEffect } from 'react';
import { useGroupData } from '@/hooks/useGroupData';

export default function LiveGroupView({ groupId }) {
  const { group, refetch } = useGroupData(groupId);

  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  return <div>{group?.name}</div>;
}
```

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Direct API Calls

**DON'T:**

```typescript
// ❌ Bypassing service layer
const response = await fetch("/api/groups/123");
const group = await response.json();
```

**DO:**

```typescript
// ✅ Using service layer
import { groupsService } from "@/services/groupsService";
const group = await groupsService.getById(123);
```

### ❌ Anti-Pattern 2: Multiple Modal States

**DON'T:**

```typescript
// ❌ Managing modals separately
const [isEdit, setIsEdit] = useState(false);
const [isDelete, setIsDelete] = useState(false);
const [isShare, setIsShare] = useState(false);
```

**DO:**

```typescript
// ✅ Using useModalState
const modals = useModalState();
```

### ❌ Anti-Pattern 3: Inline Transformations

**DON'T:**

```typescript
// ❌ Transforming in component
const formattedBudget = formatCurrency(group.budget);
const formattedDate = formatDate(group.end_date);
// ... repeated everywhere
```

**DO:**

```typescript
// ✅ Using useGroupViewModel
const { groupViewModel } = useGroupViewModel({ group, ... });
// groupViewModel.formattedBudget
// groupViewModel.formattedEndDate
```

### ❌ Anti-Pattern 4: Ignoring Errors

**DON'T:**

```typescript
// ❌ No error handling
await groupsService.update(id, data);
toast.success("Updated!");
```

**DO:**

```typescript
// ✅ Proper error handling
try {
  await groupsService.update(id, data);
  toast.success("Updated!");
} catch (error) {
  toast.error(error instanceof Error ? error.message : "Update failed");
}
```

### ❌ Anti-Pattern 5: Prop Drilling

**DON'T:**

```typescript
// ❌ Passing modals through many components
<Parent modals={modals}>
  <Child modals={modals}>
    <GrandChild modals={modals}>
      <GreatGrandChild modals={modals} />
    </GrandChild>
  </Child>
</Parent>
```

**DO:**

```typescript
// ✅ Use hook where needed
function GreatGrandChild() {
  const modals = useModalState();
  // Use directly
}
```

**Note:** `useModalState` creates separate instances. For shared state, use Context or pass as prop.

### ❌ Anti-Pattern 6: Mixing Service Types

**DON'T:**

```typescript
// ❌ Mixing direct calls with service calls
const group = await groupsService.getById(123);
const response = await fetch(`/api/groups/${group.id}/participants`);
```

**DO:**

```typescript
// ✅ Consistent service usage
const group = await groupsService.getById(123);
const { data } = await participantsService.getByGroupId(group.id);
```

---

## Performance Tips

### Tip 1: Memoize Expensive Computations

```typescript
import { useMemo } from 'react';

function ParticipantsList({ participants }) {
  // ✅ Memoize filtered list
  const activeParticipants = useMemo(
    () => participants.filter(p => !p.isDeleted),
    [participants]
  );

  return <div>{activeParticipants.map(...)}</div>;
}
```

### Tip 2: Debounce Search

```typescript
import { useState, useEffect } from 'react';
import { participantsService } from '@/services/participantsService';

function SearchParticipants({ groupId }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    // ✅ Debounce search
    const timer = setTimeout(async () => {
      if (query.length > 2) {
        const { data } = await participantsService.getByGroupId(groupId);
        setResults(data.filter(p => p.name.includes(query)));
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, groupId]);

  return <input value={query} onChange={e => setQuery(e.target.value)} />;
}
```

### Tip 3: Batch Updates

```typescript
// ✅ Batch multiple updates
async function updateMultipleParticipants(updates) {
  const promises = updates.map(({ id, data }) => participantsService.update(id, data));

  await Promise.all(promises);
  toast.success(`Updated ${updates.length} participants`);
}
```

---

## Quick Reference

### Service Methods Cheat Sheet

```typescript
// Groups
groupsService.getById(id)
groupsService.create({ name, budget, end_date })
groupsService.update(id, { budget })
groupsService.delete(id)

// Participants
participantsService.getByGroupId(groupId)
participantsService.create(groupId, { name, email? })
participantsService.update(id, { name })
participantsService.delete(id)

// Exclusions
exclusionsService.getByGroupId(groupId)
exclusionsService.create(groupId, { blocker_participant_id, blocked_participant_id })
exclusionsService.delete(id)
```

### Hook Usage Cheat Sheet

```typescript
// Modal Management
const modals = useModalState();
modals.openEditGroupModal();
modals.openDeleteParticipantModal(participant);
modals.closeModal();
modals.isEditGroupModalOpen;

// Data Transformations
const { groupViewModel, participantViewModels, exclusionViewModels } = useGroupViewModel({
  group,
  participants,
  exclusions,
  currentUserId,
});

// Data Fetching
const { group, loading, error, refetch } = useGroupData(groupId);
const { participants, refetch } = useParticipants(groupId);
const { exclusions, refetch } = useExclusions(groupId);
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-16
