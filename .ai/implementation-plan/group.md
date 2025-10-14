# Plan implementacji widoku grupy Secret Santa

## 1. Przegląd

Widok grupy jest centralnym elementem aplikacji Secret Santa, umożliwiającym twórcy grupy pełne zarządzanie wydarzeniem od momentu utworzenia do zakończenia losowania. Widok obsługuje dwa główne stany:

- **Przed losowaniem**: Pełna funkcjonalność edycji - zarządzanie uczestnikami, definiowanie wykluczeń, edycja parametrów grupy
- **Po losowaniu**: Widok tylko do odczytu z dodatkowymi informacjami o statusie uczestników (wishlist, dostęp do wyniku)

### Główne cele widoku:

1. **Zarządzanie informacjami o grupie** - nazwa, budżet, data zakończenia
2. **Zarządzanie uczestnikami** - dodawanie, edycja, usuwanie (przed losowaniem)
3. **Definiowanie wykluczeń** - jednokierunkowe reguły określające, kto nie może kogo wylosować
4. **Przeprowadzenie losowania** - walidacja, potwierdzenie i wykonanie nieodwracalnego losowania
5. **Wyświetlanie statusu po losowaniu** - informacje o wishlistach i dostępie uczestników do wyników

## 2. Routing widoku

### Ścieżka
```
/groups/:id
```

### Parametry URL
- `id` (number) - ID grupy w bazie danych

### Middleware i zabezpieczenia
- **Autentykacja**: Wymagana aktywna sesja użytkownika (sprawdzana w `[id].astro`)
- **Autoryzacja**: Użytkownik musi być członkiem grupy (sprawdzana przez API)
- **Przekierowania**:
  - Brak sesji → `/login`
  - Nieprawidłowe ID → `/dashboard`
  - Brak dostępu → `/dashboard` (po próbie wywołania API)

### Implementacja routingu (src/pages/groups/[id].astro)

```astro
---
import Layout from "@/layouts/Layout.astro";
import GroupView from "@/components/group/GroupView.tsx";
import { supabaseClient } from "@/db/supabase.client";

export const prerender = false;

const { id } = Astro.params;
const groupId = parseInt(id);

// Walidacja ID
if (!groupId || isNaN(groupId)) {
  return Astro.redirect("/dashboard");
}

// Sprawdzenie sesji
const {
  data: { session },
} = await supabaseClient.auth.getSession();

if (!session) {
  return Astro.redirect("/login");
}
---

<Layout title={`Grupa ${groupId} | Secret Santa`}>
  <div class="min-h-screen bg-gray-50">
    <div class="container mx-auto px-4 py-8">
      <GroupView client:load groupId={groupId} />
    </div>
  </div>
</Layout>
```

## 3. Struktura komponentów

### Diagram hierarchii komponentów

```
[id].astro (Astro Page)
└── Layout
    └── GroupView (React, główny kontener)
        ├── Toaster (powiadomienia)
        │
        ├── GroupHeader
        │   └── Card
        │       ├── CardTitle (nazwa + status badge)
        │       ├── Informacje (budżet, data)
        │       └── Przyciski akcji (edytuj, usuń)
        │
        ├── ParticipantsSection
        │   └── Card
        │       ├── AddParticipantForm (tylko przed losowaniem)
        │       ├── ParticipantsList (desktop, tabela)
        │       │   └── Table
        │       │       └── TableRow[]
        │       │           └── Akcje (edytuj, usuń, kopiuj token)
        │       └── ParticipantCard[] (mobile, karty)
        │           └── Akcje (edytuj, usuń, kopiuj token)
        │
        ├── ExclusionsSection
        │   └── Card
        │       ├── AddExclusionForm (tylko przed losowaniem)
        │       └── ExclusionsList
        │           └── Lista wykluczeń z przyciskami usuwania
        │
        ├── DrawSection (tylko przed losowaniem)
        │   └── Card
        │       ├── Status gotowości (karty informacyjne)
        │       ├── Alerty walidacji
        │       └── Przycisk rozpoczęcia losowania
        │
        ├── ResultsSection (tylko po losowaniu)
        │   └── Card
        │       ├── Informacje o losowaniu
        │       └── Przycisk "Zobacz mój wynik"
        │
        └── Modale (warunkowe renderowanie)
            ├── GroupEditModal
            ├── DeleteGroupModal
            ├── EditParticipantModal
            └── DrawConfirmationModal
```

### Komponenty pomocnicze z Shadcn/ui

- `Button` - przyciski akcji
- `Card`, `CardHeader`, `CardTitle`, `CardContent` - kontenery sekcji
- `Badge` - statusy i etykiety
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell` - tabela uczestników
- `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogFooter` - modale
- `Alert`, `AlertDescription` - komunikaty walidacji
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage` - formularze
- `Input` - pola tekstowe
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` - selecty
- `Toaster`, `toast` - powiadomienia

## 4. Szczegóły komponentów

### 4.1. GroupView (główny komponent)

**Lokalizacja**: `src/components/group/GroupView.tsx`

**Opis**: Główny kontener widoku grupy. Zarządza stanem aplikacji, koordynuje komunikację między komponentami potomnymi a API, obsługuje wszystkie modalne i przepływ danych.

**Główne elementy**:
- Logika pobierania danych z API (poprzez custom hooki)
- Transformacja DTO na ViewModels
- Zarządzanie stanem modalów
- Obsługa wszystkich zdarzeń z komponentów potomnych
- Conditional rendering (przed/po losowaniu)
- Loading states i error states

**Obsługiwane zdarzenia**:
- `handleGroupUpdated()` - po aktualizacji grupy
- `handleGroupDeleted()` - po usunięciu grupy (przekierowanie)
- `handleParticipantAdded()` - po dodaniu uczestnika
- `handleParticipantUpdated()` - po edycji uczestnika
- `handleParticipantDeleted()` - po usunięciu uczestnika
- `handleExclusionAdded()` - po dodaniu wykluczenia
- `handleExclusionDeleted()` - po usunięciu wykluczenia
- `handleDrawComplete()` - po zakończeniu losowania
- `handleEditGroupClick()` - otwarcie modala edycji grupy
- `handleDeleteGroupClick()` - otwarcie modala usuwania grupy
- `handleDrawClick()` - otwarcie modala potwierdzenia losowania
- `handleEditParticipant(participant)` - otwarcie modala edycji uczestnika
- `handleDeleteParticipant(id)` - usunięcie uczestnika
- `handleCopyParticipantToken(participant)` - skopiowanie linku z tokenem

**Warunki walidacji**:
- Sprawdzenie czy użytkownik jest zalogowany (pobieranie `currentUserId`)
- Weryfikacja czy użytkownik jest twórcą grupy (`isCreator`)
- Sprawdzenie czy można edytować (`canEdit = !is_drawn`)
- Walidacja minimum 3 uczestników do losowania (w `DrawSection`)

**Typy**:
- Props: `{ groupId: number }`
- State:
  - `currentUserId: string | null`
  - `isEditGroupModalOpen: boolean`
  - `isDeleteGroupModalOpen: boolean`
  - `isDrawConfirmationModalOpen: boolean`
  - `isEditParticipantModalOpen: boolean`
  - `selectedParticipant: ParticipantViewModel | null`
- Używane typy: `GroupDetailDTO`, `GroupViewModel`, `ParticipantViewModel`, `ExclusionViewModel`

**Propsy**: Brak (otrzymuje `groupId` jako props)

---

### 4.2. GroupHeader

**Lokalizacja**: `src/components/group/GroupHeader.tsx`

**Opis**: Nagłówek widoku grupy wyświetlający podstawowe informacje o grupie (nazwa, budżet, data zakończenia, status) oraz przyciski akcji dla twórcy grupy.

**Główne elementy**:
- `Card` z `CardHeader`
- Tytuł grupy z badge'em statusu
- Ikony i formatowane informacje (budżet, data)
- Przyciski "Edytuj grupę" i "Usuń grupę" (warunkowe)

**Obsługiwane interakcje**:
- `onEditClick()` - kliknięcie przycisku edycji
- `onDeleteClick()` - kliknięcie przycisku usuwania

**Obsługiwana walidacja**:
- Przycisk "Edytuj grupę" widoczny tylko gdy:
  - `isCreator === true`
  - `canEdit === true` (czyli `!isDrawn`)
- Przycisk "Usuń grupę" widoczny tylko gdy:
  - `isCreator === true`

**Typy**:
- `GroupViewModel` - dla danych grupy
- Props: `{ group: GroupViewModel; isCreator: boolean; canEdit: boolean; isDrawn: boolean; onEditClick: () => void; onDeleteClick: () => void }`

**Propsy**:
```typescript
interface GroupHeaderProps {
  group: GroupViewModel;
  isCreator: boolean;
  canEdit: boolean;
  isDrawn: boolean;
  onEditClick: () => void;
  onDeleteClick: () => void;
}
```

---

### 4.3. ParticipantsSection

**Lokalizacja**: `src/components/group/ParticipantsSection.tsx`

**Opis**: Sekcja zarządzania uczestnikami grupy. Zawiera formularz dodawania nowych uczestników oraz listę/karty istniejących uczestników z możliwością edycji i usuwania.

**Główne elementy**:
- `Card` z nagłówkiem "Uczestnicy"
- `AddParticipantForm` (tylko przed losowaniem)
- `ParticipantsList` (desktop - tabela, hidden na mobile)
- `ParticipantCard[]` (mobile - karty, hidden na desktop)
- Empty state gdy brak uczestników

**Obsługiwane interakcje**:
- `onParticipantAdded()` - po dodaniu uczestnika
- `onEditParticipant(participant)` - po kliknięciu edycji
- `onDeleteParticipant(id)` - po kliknięciu usunięcia
- `onCopyParticipantToken(participant)` - po kliknięciu kopiowania tokenu (po losowaniu)

**Obsługiwana walidacja**:
- Formularz dodawania widoczny tylko gdy `canEdit && !isDrawn`
- Akcje edycji/usuwania dostępne tylko przed losowaniem
- Przycisk kopiowania tokenu widoczny tylko po losowaniu dla niezarejestrowanych uczestników

**Typy**:
- `ParticipantViewModel[]` - lista uczestników

**Propsy**:
```typescript
interface ParticipantsSectionProps {
  groupId: number;
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  isCreator: boolean;
  onParticipantAdded: () => void;
  onParticipantUpdated: () => void;
  onParticipantDeleted: () => void;
  onEditParticipant: (participant: ParticipantViewModel) => void;
  onDeleteParticipant: (participantId: number) => void;
  onCopyParticipantToken: (participant: ParticipantViewModel) => void;
  onRefresh: () => void;
}
```

---

### 4.4. AddParticipantForm

**Lokalizacja**: `src/components/group/AddParticipantForm.tsx`

**Opis**: Formularz do dodawania nowych uczestników do grupy. Zawiera pola: imię (wymagane) i email (opcjonalny).

**Główne elementy**:
- `Form` z React Hook Form
- `Input` dla imienia (required)
- `Input` dla emaila (optional, walidacja formatu)
- `Button` submit

**Obsługiwane interakcje**:
- `onSubmit()` - wysłanie formularza (POST /api/groups/:groupId/participants)
- `onSuccess(participant)` - callback po pomyślnym dodaniu

**Obsługiwana walidacja**:
- **Imię** (name):
  - Wymagane
  - Min. 1 znak
  - Max. 255 znaków
  - Trimmed
- **Email** (email):
  - Opcjonalny
  - Jeśli podany: poprawny format email
  - Unikalność w grupie (walidacja backend)

**Typy**:
- `AddParticipantFormViewModel` (form data)
- `CreateParticipantCommand` (request body)
- `ParticipantWithTokenDTO` (response)

**Propsy**:
```typescript
interface AddParticipantFormProps {
  groupId: number;
  onSuccess: (participant: ParticipantWithTokenDTO) => void;
}
```

---

### 4.5. ParticipantsList (desktop)

**Lokalizacja**: `src/components/group/ParticipantsList.tsx`

**Opis**: Tabela uczestników dla widoku desktop. Wyświetla uczestników w formacie tabelarycznym z kolumnami: Avatar, Imię, Email, Status wishlist (po losowaniu), Akcje.

**Główne elementy**:
- `Table` z `TableHeader` i `TableBody`
- `TableRow` dla każdego uczestnika
- Kolumny:
  - Avatar (inicjały)
  - Imię (z oznaczeniem "Ty" dla zalogowanego)
  - Email (zamaskowany lub pełny)
  - Wishlist status (badge, tylko po losowaniu)
  - Akcje (edytuj, usuń, kopiuj token)

**Obsługiwane interakcje**:
- `onEdit(participant)` - kliknięcie ikony edycji
- `onDelete(id)` - kliknięcie ikony usunięcia
- `onCopyToken(participant)` - kliknięcie ikony kopiowania (po losowaniu)

**Obsługiwana walidacja**:
- Przycisk edycji widoczny tylko gdy `canEdit && !isDrawn`
- Przycisk usunięcia widoczny tylko gdy `canEdit && !isDrawn && participant.canDelete`
- Przycisk kopiowania tokenu widoczny tylko gdy `isDrawn && participant.resultLink`
- Kolumna wishlist status widoczna tylko gdy `isDrawn`

**Typy**:
- `ParticipantViewModel[]`

**Propsy**:
```typescript
interface ParticipantsListProps {
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  isCreator: boolean;
  onEdit: (participant: ParticipantViewModel) => void;
  onDelete: (participantId: number) => void;
  onCopyToken: (participant: ParticipantViewModel) => void;
}
```

---

### 4.6. ParticipantCard (mobile)

**Lokalizacja**: `src/components/group/ParticipantCard.tsx`

**Opis**: Karta uczestnika dla widoku mobilnego. Wyświetla te same informacje co tabela, ale w formacie karty przyjaznej dla małych ekranów.

**Główne elementy**:
- `Card` z układem pionowym
- Avatar z inicjałami
- Imię i email
- Badge'e statusu (wishlist, twórca)
- Przyciski akcji (edytuj, usuń, kopiuj token)

**Obsługiwane interakcje**:
- Identyczne jak `ParticipantsList`

**Obsługiwana walidacja**:
- Identyczna jak `ParticipantsList`

**Typy**:
- `ParticipantViewModel`

**Propsy**:
```typescript
interface ParticipantCardProps {
  participant: ParticipantViewModel;
  canEdit: boolean;
  isDrawn: boolean;
  isCreator: boolean;
  onEdit: (participant: ParticipantViewModel) => void;
  onDelete: (participantId: number) => void;
  onCopyToken: (participant: ParticipantViewModel) => void;
}
```

---

### 4.7. EditParticipantModal

**Lokalizacja**: `src/components/group/EditParticipantModal.tsx`

**Opis**: Modal do edycji danych uczestnika (imię i email).

**Główne elementy**:
- `Dialog` z formularzem
- Pola: imię (required), email (optional)
- Przyciski: Anuluj, Zapisz

**Obsługiwane interakcje**:
- `onClose()` - zamknięcie modala
- `onSave()` - zapisanie zmian (PATCH /api/participants/:id)

**Obsługiwana walidacja**:
- Identyczna jak `AddParticipantForm`
- Dodatkowo: nie można zostawić pustego imienia

**Typy**:
- `ParticipantViewModel` (dane do edycji)
- `EditParticipantFormViewModel` (form data)
- `UpdateParticipantCommand` (request body)

**Propsy**:
```typescript
interface EditParticipantModalProps {
  participant: ParticipantViewModel | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}
```

---

### 4.8. ExclusionsSection

**Lokalizacja**: `src/components/group/ExclusionsSection.tsx`

**Opis**: Sekcja zarządzania regułami wykluczeń. Zawiera formularz dodawania wykluczeń oraz listę istniejących reguł.

**Główne elementy**:
- `Card` z nagłówkiem "Wykluczenia"
- `AddExclusionForm` (tylko przed losowaniem)
- `ExclusionsList`
- Empty state gdy brak wykluczeń

**Obsługiwane interakcje**:
- `onExclusionAdded()` - po dodaniu wykluczenia
- `onDeleteExclusion(id)` - po usunięciu wykluczenia

**Obsługiwana walidacja**:
- Formularz widoczny tylko gdy `canEdit && !isDrawn`
- Usuwanie wykluczeń możliwe tylko przed losowaniem

**Typy**:
- `ExclusionViewModel[]`
- `ParticipantViewModel[]` (dla selectów w formularzu)

**Propsy**:
```typescript
interface ExclusionsSectionProps {
  groupId: number;
  exclusions: ExclusionViewModel[];
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  onExclusionAdded: () => void;
  onExclusionDeleted: () => void;
  onDeleteExclusion: (exclusionId: number) => void;
}
```

---

### 4.9. AddExclusionForm

**Lokalizacja**: `src/components/group/AddExclusionForm.tsx`

**Opis**: Formularz do dodawania jednokierunkowych reguł wykluczeń.

**Główne elementy**:
- `Form` z React Hook Form
- `Select` dla blocker_participant (kto nie może wylosować)
- `Select` dla blocked_participant (kogo nie można wylosować)
- `Button` submit

**Obsługiwane interakcje**:
- `onSubmit()` - wysłanie formularza (POST /api/groups/:groupId/exclusions)
- `onSuccess()` - callback po pomyślnym dodaniu

**Obsługiwana walidacja**:
- **Blocker participant**:
  - Wymagany
  - Musi istnieć w liście uczestników
- **Blocked participant**:
  - Wymagany
  - Musi istnieć w liście uczestników
  - Nie może być taki sam jak blocker (frontend validation)
- **Backend validation**:
  - Nie może być duplikatu reguły
  - Obaj uczestnicy muszą należeć do tej grupy

**Typy**:
- `AddExclusionFormViewModel` (form data)
- `CreateExclusionRuleCommand` (request body)
- `ExclusionRuleDTO` (response)
- `ParticipantViewModel[]` (dla selectów)

**Propsy**:
```typescript
interface AddExclusionFormProps {
  groupId: number;
  participants: ParticipantViewModel[];
  onSuccess: () => void;
}
```

---

### 4.10. ExclusionsList

**Lokalizacja**: `src/components/group/ExclusionsList.tsx`

**Opis**: Lista istniejących reguł wykluczeń z możliwością ich usuwania.

**Główne elementy**:
- Lista wykluczeń w formacie "X nie może wylosować Y"
- Przycisk usuwania przy każdej regule (tylko przed losowaniem)
- Ikona kierunku (→) dla lepszej czytelności

**Obsługiwane interakcje**:
- `onDelete(id)` - usunięcie wykluczenia (DELETE /api/exclusions/:id)

**Obsługiwana walidacja**:
- Przycisk usuwania widoczny tylko gdy `!isDrawn`

**Typy**:
- `ExclusionViewModel[]`

**Propsy**:
```typescript
interface ExclusionsListProps {
  exclusions: ExclusionViewModel[];
  onDelete: (exclusionId: number) => void;
}
```

---

### 4.11. DrawSection

**Lokalizacja**: `src/components/group/DrawSection.tsx`

**Opis**: Sekcja odpowiedzialna za przeprowadzenie losowania. Wyświetla status gotowości, walidację wykluczeń oraz przycisk rozpoczęcia losowania.

**Główne elementy**:
- `Card` z nagłówkiem "Losowanie"
- 3 karty informacyjne (uczestnicy, minimum wymagane, wykluczenia)
- `Alert` z komunikatami walidacji
- Przycisk "Rozpocznij losowanie"

**Obsługiwane interakcje**:
- `onDrawClick()` - otwarcie modala potwierdzenia (walidacja przed otwarciem)

**Obsługiwana walidacja**:
- **Minimum uczestników**: `participantsCount >= 3`
- **Uprawnienia**: `isCreator === true`
- **Walidacja wykluczeń**: wywołanie POST /api/groups/:groupId/draw/validate
- **Status przycisku**:
  - Disabled gdy: `!canDraw || !isValid || isValidating`
  - Enabled gdy: wszystkie warunki spełnione

**Typy**:
- `DrawValidationDTO` (response z walidacji)
- `DrawStatusViewModel` (opcjonalny, dla rozszerzenia)

**Propsy**:
```typescript
interface DrawSectionProps {
  groupId: number;
  participantsCount: number;
  exclusionsCount: number;
  isCreator: boolean;
  onDrawClick: () => void;
}
```

---

### 4.12. DrawConfirmationModal

**Lokalizacja**: `src/components/group/DrawConfirmationModal.tsx`

**Opis**: Modal potwierdzenia przed rozpoczęciem losowania. Ostrzega o nieodwracalności operacji.

**Główne elementy**:
- `Dialog` z ostrzeżeniem
- Podsumowanie (liczba uczestników, wykluczeń)
- Informacja o nieodwracalności
- Przyciski: Anuluj, Potwierdź

**Obsługiwane interakcje**:
- `onClose()` - anulowanie
- `onConfirm()` - potwierdzenie (POST /api/groups/:groupId/draw)

**Obsługiwana walidacja**:
- Brak (walidacja odbywa się przed otwarciem modala)

**Typy**:
- `DrawResultDTO` (response)

**Propsy**:
```typescript
interface DrawConfirmationModalProps {
  isOpen: boolean;
  groupId: number;
  participantsCount: number;
  exclusionsCount: number;
  onClose: () => void;
  onConfirm: () => void;
}
```

---

### 4.13. GroupEditModal

**Lokalizacja**: `src/components/group/GroupEditModal.tsx`

**Opis**: Modal do edycji podstawowych informacji o grupie.

**Główne elementy**:
- `Dialog` z formularzem
- Pola: nazwa, budżet, data zakończenia
- Przyciski: Anuluj, Zapisz

**Obsługiwane interakcje**:
- `onClose()` - zamknięcie modala
- `onSave()` - zapisanie zmian (PATCH /api/groups/:id)

**Obsługiwana walidacja**:
- **Nazwa**:
  - Wymagana
  - Min. 1 znak
  - Max. 255 znaków
- **Budżet**:
  - Wymagany
  - Liczba > 0
  - Liczba całkowita
- **Data zakończenia**:
  - Wymagana
  - Format ISO 8601
  - Powinna być w przyszłości (zalecane, nie wymagane)

**Typy**:
- `GroupViewModel` (dane do edycji)
- `EditGroupFormViewModel` (form data)
- `UpdateGroupCommand` (request body)

**Propsy**:
```typescript
interface GroupEditModalProps {
  group: GroupViewModel;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}
```

---

### 4.14. DeleteGroupModal

**Lokalizacja**: `src/components/group/DeleteGroupModal.tsx`

**Opis**: Modal potwierdzenia usunięcia grupy.

**Główne elementy**:
- `AlertDialog` z ostrzeżeniem
- Nazwa grupy do potwierdzenia
- Ostrzeżenie o trwałym usunięciu
- Przyciski: Anuluj, Usuń

**Obsługiwane interakcje**:
- `onClose()` - anulowanie
- `onConfirm()` - potwierdzenie (DELETE /api/groups/:id)

**Obsługiwana walidacja**:
- Brak (operacja jest zawsze dozwolona dla twórcy)

**Typy**:
- Brak specjalnych typów (tylko string dla nazwy grupy)

**Propsy**:
```typescript
interface DeleteGroupModalProps {
  isOpen: boolean;
  groupName: string;
  groupId: number;
  onClose: () => void;
  onConfirm: () => void;
}
```

---

### 4.15. ResultsSection

**Lokalizacja**: `src/components/group/ResultsSection.tsx`

**Opis**: Sekcja wyświetlana po zakończeniu losowania. Pokazuje informacje o losowaniu i przycisk "Zobacz mój wynik" dla uczestników.

**Główne elementy**:
- `Card` z informacjami o zakończonym losowaniu
- Data losowania
- Liczba uczestników
- Przycisk "Zobacz mój wynik" (tylko dla uczestników)

**Obsługiwane interakcje**:
- Kliknięcie przycisku "Zobacz mój wynik" - przekierowanie do widoku wyniku

**Obsługiwana walidacja**:
- Przycisk widoczny tylko gdy `isParticipant === true`

**Typy**:
- Brak specjalnych typów

**Propsy**:
```typescript
interface ResultsSectionProps {
  groupId: number;
  drawnAt: string;
  participantsCount: number;
  isParticipant: boolean;
  currentUserId: string;
}
```

## 5. Typy

### 5.1. Typy DTO (z API)

#### GroupDetailDTO
```typescript
interface GroupDetailDTO {
  id: number;
  name: string;
  budget: number;
  end_date: string; // ISO 8601
  creator_id: string;
  is_drawn: boolean;
  created_at: string;
  updated_at: string;
  drawn_at?: string; // nullable, tylko po losowaniu
  participants: ParticipantDTO[];
  exclusions: ExclusionRuleDTO[];
  is_creator: boolean; // computed, czy current user jest twórcą
  can_edit: boolean; // computed, czy można edytować (!is_drawn)
}
```

#### ParticipantDTO
```typescript
interface ParticipantDTO {
  id: number;
  group_id: number;
  user_id: string | null; // null dla niezarejestrowanych
  name: string;
  email: string | null;
  access_token: string; // unikalny token dla niezarejestrowanych
  created_at: string;
}
```

#### ParticipantListItemDTO
```typescript
interface ParticipantListItemDTO extends Omit<ParticipantDTO, "access_token"> {
  has_wishlist: boolean; // czy uczestnik ma wishlist
  access_token?: string; // tylko dla twórcy grupy po losowaniu
}
```

#### ExclusionRuleDTO
```typescript
interface ExclusionRuleDTO {
  id: number;
  group_id: number;
  blocker_participant_id: number;
  blocked_participant_id: number;
  created_at: string;
}
```

#### ExclusionRuleListItemDTO
```typescript
interface ExclusionRuleListItemDTO extends ExclusionRuleDTO {
  blocker_name: string; // joined z tabeli participants
  blocked_name: string; // joined z tabeli participants
}
```

#### DrawResultDTO
```typescript
interface DrawResultDTO {
  success: boolean;
  message: string;
  group_id: number;
  drawn_at: string;
  participants_notified: number; // liczba uczestników
}
```

#### DrawValidationDTO
```typescript
interface DrawValidationDTO {
  valid: boolean;
  participants_count: number;
  exclusions_count: number;
  message: string;
  details?: string; // tylko gdy valid === false
}
```

### 5.2. Typy ViewModel (dla UI)

#### GroupViewModel
```typescript
interface GroupViewModel extends GroupDetailDTO {
  // Formatowane wartości dla wyświetlania
  formattedBudget: string; // "150 PLN"
  formattedEndDate: string; // "25 grudnia 2025, 23:59"
  formattedCreatedAt: string; // "10 października 2025"

  // Pola obliczeniowe
  isExpired: boolean; // czy data zakończenia minęła
  daysUntilEnd: number; // ile dni do końca (-1 jeśli przeszła)
  participantsCount: number; // liczba uczestników
  exclusionsCount: number; // liczba wykluczeń

  // Status
  statusBadge: {
    text: string; // "Przed losowaniem" | "Losowanie zakończone"
    variant: "default" | "success"; // dla Shadcn badge
  };
}
```

**Transformacja**: `GroupDetailDTO` → `GroupViewModel` odbywa się w `GroupView.transformGroupToViewModel()`

**Pola obliczeniowe**:
- `formattedBudget`: `formatCurrency(group.budget)` → "150 PLN"
- `formattedEndDate`: `formatDate(group.end_date)` → "25 grudnia 2025, 23:59"
- `formattedCreatedAt`: `formatRelativeDate(group.created_at)` → "10 października 2025"
- `isExpired`: `isDateExpired(group.end_date)` → true/false
- `daysUntilEnd`: `calculateDaysUntilEnd(group.end_date)` → liczba dni
- `participantsCount`: `group.participants.length`
- `exclusionsCount`: `group.exclusions.length`
- `statusBadge`: `formatGroupStatusBadge(group.is_drawn)` → `{ text, variant }`

#### ParticipantViewModel
```typescript
interface ParticipantViewModel extends Omit<ParticipantListItemDTO, "access_token"> {
  // Flagi
  isCreator: boolean; // czy uczestnik jest twórcą grupy
  isCurrentUser: boolean; // czy to zalogowany użytkownik
  canDelete: boolean; // czy można usunąć (false dla twórcy)

  // Formatowane wartości
  displayEmail: string; // "j***@example.com" | "john@example.com" | "Brak"
  displayName: string; // "John Doe" | "John Doe (Ty)"
  initials: string; // "JD" dla avatara

  // Status (po losowaniu)
  wishlistStatus?: {
    hasWishlist: boolean;
    text: string; // "Dodana" | "Brak"
    variant: "success" | "secondary";
  };

  resultStatus?: {
    viewed: boolean;
    text: string; // "Zobaczył" | "Nie zobaczył"
    variant: "success" | "warning";
  };

  // Token (dla niezarejestrowanych)
  resultLink?: string; // pełny URL: /results/:token
}
```

**Transformacja**: `ParticipantListItemDTO[]` → `ParticipantViewModel[]` odbywa się w `GroupView.transformParticipantsToViewModels()`

**Pola obliczeniowe**:
- `isCreator`: `participant.user_id === group.creator_id`
- `isCurrentUser`: `participant.user_id === currentUserId`
- `canDelete`: `!isCreator` (twórca nie może być usunięty)
- `displayEmail`: `formatParticipantEmail(email, isCurrentUser)`
- `displayName`: `formatParticipantName(name, isCurrentUser)`
- `initials`: `getInitials(name)` → "JD"
- `wishlistStatus`: `formatWishlistStatus(has_wishlist)` (tylko po losowaniu)
- `resultStatus`: `formatResultStatus(viewed)` (tylko po losowaniu, TODO)
- `resultLink`: `${window.location.origin}/results/${access_token}` (jeśli access_token)

#### ExclusionViewModel
```typescript
interface ExclusionViewModel extends ExclusionRuleListItemDTO {
  // Formatowane wartości
  displayText: string; // "Jan Kowalski nie może wylosować Anny Nowak"
  shortDisplayText: string; // "JK → AN" (dla mobile)

  // Flagi
  canDelete: boolean; // czy można usunąć (false po losowaniu)
}
```

**Transformacja**: `ExclusionRuleListItemDTO[]` → `ExclusionViewModel[]` odbywa się w `GroupView.transformExclusionsToViewModels()`

**Pola obliczeniowe**:
- `displayText`: `formatExclusionText(blocker_name, blocked_name)`
- `shortDisplayText`: `formatExclusionShortText(blocker_name, blocked_name)`
- `canDelete`: `!group.is_drawn`

### 5.3. Typy Command (dla API requests)

#### CreateParticipantCommand
```typescript
interface CreateParticipantCommand {
  name: string; // required, min 1, max 255
  email?: string; // optional, valid email format
}
```

#### UpdateParticipantCommand
```typescript
type UpdateParticipantCommand = Partial<CreateParticipantCommand>;
```

#### UpdateGroupCommand
```typescript
interface UpdateGroupCommand {
  name?: string; // optional, min 1, max 255
  budget?: number; // optional, > 0
  end_date?: string; // optional, ISO 8601
}
```

#### CreateExclusionRuleCommand
```typescript
interface CreateExclusionRuleCommand {
  blocker_participant_id: number; // required
  blocked_participant_id: number; // required, != blocker_participant_id
}
```

### 5.4. Typy Form ViewModel (dla formularzy)

#### AddParticipantFormViewModel
```typescript
interface AddParticipantFormViewModel {
  name: string;
  email?: string;
}
```

#### EditParticipantFormViewModel
```typescript
interface EditParticipantFormViewModel {
  name: string;
  email?: string;
}
```

#### EditGroupFormViewModel
```typescript
interface EditGroupFormViewModel {
  name: string;
  budget: number;
  end_date: Date; // w formularzu Date, zamieniane na ISO string przy submicie
}
```

#### AddExclusionFormViewModel
```typescript
interface AddExclusionFormViewModel {
  blocker_participant_id: number;
  blocked_participant_id: number;
}
```

### 5.5. Typy pomocnicze

#### ApiError
```typescript
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
```

## 6. Zarządzanie stanem

### 6.1. Custom Hooki

Widok grupy wykorzystuje architekturę opartą na custom hookach, które enkapsulują logikę pobierania i modyfikacji danych. Każdy hook jest odpowiedzialny za jeden obszar funkcjonalności.

#### useGroupData(groupId: number)

**Lokalizacja**: `src/hooks/useGroupData.ts`

**Cel**: Zarządzanie danymi grupy - pobieranie, aktualizacja, usuwanie.

**Zwracane wartości**:
```typescript
{
  group: GroupDetailDTO | null;
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  updateGroup: (command: UpdateGroupCommand) => Promise<ApiResponse>;
  deleteGroup: () => Promise<ApiResponse>;
}
```

**Implementacja**:
- Pobiera dane grupy z `GET /api/groups/:id` przy montowaniu
- Automatyczne odświeżanie po aktualizacji
- Obsługuje stany loading i error
- Używa Supabase client do pobierania tokenu autoryzacji

**Użycie w GroupView**:
```typescript
const {
  group,
  loading: groupLoading,
  error: groupError,
  refetch: refetchGroup,
  updateGroup,
  deleteGroup,
} = useGroupData(groupId);
```

---

#### useParticipants(groupId: number)

**Lokalizacja**: `src/hooks/useParticipants.ts`

**Cel**: Zarządzanie uczestnikami grupy - pobieranie listy, dodawanie, edycja, usuwanie.

**Zwracane wartości**:
```typescript
{
  participants: ParticipantListItemDTO[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  addParticipant: (command: CreateParticipantCommand) => Promise<ApiResponse<ParticipantWithTokenDTO>>;
  updateParticipant: (id: number, command: UpdateParticipantCommand) => Promise<ApiResponse>;
  deleteParticipant: (id: number) => Promise<ApiResponse>;
}
```

**Implementacja**:
- Pobiera listę uczestników z `GET /api/groups/:groupId/participants`
- Dodawanie: `POST /api/groups/:groupId/participants`
- Edycja: `PATCH /api/participants/:id`
- Usuwanie: `DELETE /api/participants/:id`
- Po każdej operacji CUD automatycznie wywołuje `refetch()`

**Użycie w GroupView**:
```typescript
const {
  participants,
  loading: participantsLoading,
  refetch: refetchParticipants,
  addParticipant,
  updateParticipant,
  deleteParticipant,
} = useParticipants(groupId);
```

---

#### useExclusions(groupId: number)

**Lokalizacja**: `src/hooks/useExclusions.ts`

**Cel**: Zarządzanie regułami wykluczeń - pobieranie listy, dodawanie, usuwanie.

**Zwracane wartości**:
```typescript
{
  exclusions: ExclusionRuleListItemDTO[];
  loading: boolean;
  error: ApiError | null;
  refetch: () => Promise<void>;
  addExclusion: (command: CreateExclusionRuleCommand) => Promise<ApiResponse>;
  deleteExclusion: (id: number) => Promise<ApiResponse>;
}
```

**Implementacja**:
- Pobiera listę wykluczeń z `GET /api/groups/:groupId/exclusions`
- Dodawanie: `POST /api/groups/:groupId/exclusions`
- Usuwanie: `DELETE /api/exclusions/:id`
- Po każdej operacji automatycznie wywołuje `refetch()`

**Użycie w GroupView**:
```typescript
const {
  exclusions,
  loading: exclusionsLoading,
  refetch: refetchExclusions,
  addExclusion,
  deleteExclusion,
} = useExclusions(groupId);
```

---

#### useDraw(groupId: number)

**Lokalizacja**: `src/hooks/useDraw.ts`

**Cel**: Zarządzanie losowaniem - walidacja możliwości losowania i wykonanie losowania.

**Zwracane wartości**:
```typescript
{
  validation: DrawValidationDTO | null;
  isValidating: boolean;
  isDrawing: boolean;
  error: ApiError | null;
  validateDraw: () => Promise<ApiResponse<DrawValidationDTO>>;
  executeDraw: () => Promise<ApiResponse<DrawResultDTO>>;
}
```

**Implementacja**:
- Walidacja: `POST /api/groups/:groupId/draw/validate`
- Wykonanie: `POST /api/groups/:groupId/draw`
- Śledzi stan walidacji i losowania
- Nie automatyczne odświeżanie - trzeba wywołać ręcznie po zakończeniu

**Użycie w GroupView**:
```typescript
const {
  validation,
  isValidating,
  isDrawing,
  validateDraw,
  executeDraw,
} = useDraw(groupId);
```

**Użycie w DrawSection**:
```typescript
useEffect(() => {
  if (isCreator && participantsCount >= 3) {
    validateDraw();
  }
}, [groupId, isCreator, participantsCount, validateDraw]);
```

### 6.2. Stan lokalny w GroupView

#### Stan modalów
```typescript
const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
const [isDrawConfirmationModalOpen, setIsDrawConfirmationModalOpen] = useState(false);
const [isEditParticipantModalOpen, setIsEditParticipantModalOpen] = useState(false);
const [selectedParticipant, setSelectedParticipant] = useState<ParticipantViewModel | null>(null);
```

**Cel**: Kontrola widoczności modalów i przechowywanie danych edytowanego uczestnika.

#### Stan użytkownika
```typescript
const [currentUserId, setCurrentUserId] = useState<string | null>(null);
```

**Cel**: Identyfikacja zalogowanego użytkownika dla wyróżnienia w liście uczestników.

**Pobieranie**:
```typescript
useEffect(() => {
  supabaseClient.auth.getSession().then(({ data: { session } }) => {
    setCurrentUserId(session?.user?.id || null);
  });
}, []);
```

### 6.3. Memoizacja i optymalizacja

#### Funkcje transformacji
```typescript
const transformGroupToViewModel = useMemo(
  () => (group: GroupDetailDTO): GroupViewModel => { /* ... */ },
  []
);

const transformParticipantsToViewModels = useMemo(
  () => (participants: ParticipantListItemDTO[]): ParticipantViewModel[] => { /* ... */ },
  [currentUserId, group?.creator_id, group?.is_drawn]
);

const transformExclusionsToViewModels = useMemo(
  () => (exclusions: ExclusionRuleListItemDTO[]): ExclusionViewModel[] => { /* ... */ },
  [group?.is_drawn]
);
```

**Cel**: Unikanie ponownego tworzenia funkcji przy każdym renderze.

#### Zmemoizowane dane
```typescript
const groupViewModel = useMemo(
  () => (group ? transformGroupToViewModel(group) : null),
  [group, transformGroupToViewModel]
);

const participantViewModels = useMemo(
  () => transformParticipantsToViewModels(participants),
  [participants, transformParticipantsToViewModels]
);

const exclusionViewModels = useMemo(
  () => transformExclusionsToViewModels(exclusions),
  [exclusions, transformExclusionsToViewModels]
);
```

**Cel**: Unikanie ponownej transformacji danych przy każdym renderze, tylko gdy zmienią się dane źródłowe.

## 7. Integracja API

### 7.1. Pobieranie danych grupy

**Endpoint**: `GET /api/groups/:id`

**Request**:
```http
GET /api/groups/1
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Family Christmas 2025",
  "budget": 150,
  "end_date": "2025-12-25T23:59:59Z",
  "creator_id": "uuid-123",
  "is_drawn": false,
  "created_at": "2025-10-09T10:00:00Z",
  "updated_at": "2025-10-09T10:00:00Z",
  "participants": [
    {
      "id": 1,
      "group_id": 1,
      "user_id": "uuid-123",
      "name": "John Doe",
      "email": "john@example.com",
      "created_at": "2025-10-09T10:00:00Z",
      "has_wishlist": false
    }
  ],
  "exclusions": [],
  "is_creator": true,
  "can_edit": true
}
```

**Typ odpowiedzi**: `GroupDetailDTO`

**Obsługa błędów**:
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → przekierowanie na `/dashboard` (brak dostępu)
- 404 Not Found → wyświetlenie "Grupa nie znaleziona"

---

### 7.2. Aktualizacja grupy

**Endpoint**: `PATCH /api/groups/:id`

**Request**:
```http
PATCH /api/groups/1
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Updated Group Name",
  "budget": 200,
  "end_date": "2025-12-31T23:59:59Z"
}
```

**Request Body Type**: `UpdateGroupCommand`

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "Updated Group Name",
  "budget": 200,
  "end_date": "2025-12-31T23:59:59Z",
  "creator_id": "uuid-123",
  "is_drawn": false,
  "created_at": "2025-10-09T10:00:00Z",
  "updated_at": "2025-10-10T12:00:00Z"
}
```

**Typ odpowiedzi**: `GroupDTO`

**Obsługa błędów**:
- 400 Bad Request (DRAW_COMPLETED) → toast "Nie można edytować po losowaniu"
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → toast "Tylko twórca może edytować grupę"
- 404 Not Found → toast "Grupa nie znaleziona"

**Callback po sukcesie**: `refetchGroup()` + zamknięcie modala + toast sukcesu

---

### 7.3. Usunięcie grupy

**Endpoint**: `DELETE /api/groups/:id`

**Request**:
```http
DELETE /api/groups/1
Authorization: Bearer {access_token}
```

**Response** (204 No Content): Brak body

**Obsługa błędów**:
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → toast "Tylko twórca może usunąć grupę"
- 404 Not Found → toast "Grupa nie znaleziona"

**Callback po sukcesie**: Przekierowanie na `/dashboard` + toast sukcesu

---

### 7.4. Dodanie uczestnika

**Endpoint**: `POST /api/groups/:groupId/participants`

**Request**:
```http
POST /api/groups/1/participants
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Jane Smith",
  "email": "jane@example.com"
}
```

**Request Body Type**: `CreateParticipantCommand`

**Response** (201 Created):
```json
{
  "id": 2,
  "group_id": 1,
  "user_id": null,
  "name": "Jane Smith",
  "email": "jane@example.com",
  "access_token": "unique-secure-token-xyz",
  "created_at": "2025-10-09T10:00:00Z"
}
```

**Typ odpowiedzi**: `ParticipantWithTokenDTO`

**Obsługa błędów**:
- 400 Bad Request (EMAIL_EXISTS) → toast "Email już istnieje w grupie"
- 400 Bad Request (DRAW_COMPLETED) → toast "Nie można dodawać uczestników po losowaniu"
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → toast "Tylko twórca może dodawać uczestników"
- 422 Unprocessable Entity → toast z błędem walidacji

**Callback po sukcesie**:
- `refetchParticipants()`
- Reset formularza
- Toast sukcesu z opcją skopiowania tokenu (jeśli niezarejestrowany)

---

### 7.5. Aktualizacja uczestnika

**Endpoint**: `PATCH /api/participants/:id`

**Request**:
```http
PATCH /api/participants/2
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Jane Updated",
  "email": "jane.updated@example.com"
}
```

**Request Body Type**: `UpdateParticipantCommand`

**Response** (200 OK):
```json
{
  "id": 2,
  "group_id": 1,
  "user_id": null,
  "name": "Jane Updated",
  "email": "jane.updated@example.com",
  "access_token": "unique-secure-token-xyz",
  "created_at": "2025-10-09T10:00:00Z"
}
```

**Typ odpowiedzi**: `ParticipantDTO`

**Obsługa błędów**: Identyczna jak przy dodawaniu

**Callback po sukcesie**: `refetchParticipants()` + zamknięcie modala + toast sukcesu

---

### 7.6. Usunięcie uczestnika

**Endpoint**: `DELETE /api/participants/:id`

**Request**:
```http
DELETE /api/participants/2
Authorization: Bearer {access_token}
```

**Response** (204 No Content): Brak body

**Obsługa błędów**:
- 400 Bad Request (CANNOT_DELETE_CREATOR) → toast "Nie można usunąć twórcy grupy"
- 400 Bad Request (DRAW_COMPLETED) → toast "Nie można usuwać uczestników po losowaniu"
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → toast "Tylko twórca może usuwać uczestników"
- 404 Not Found → toast "Uczestnik nie znaleziony"

**Callback po sukcesie**: `refetchParticipants()` + toast sukcesu

---

### 7.7. Dodanie wykluczenia

**Endpoint**: `POST /api/groups/:groupId/exclusions`

**Request**:
```http
POST /api/groups/1/exclusions
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "blocker_participant_id": 1,
  "blocked_participant_id": 2
}
```

**Request Body Type**: `CreateExclusionRuleCommand`

**Response** (201 Created):
```json
{
  "id": 1,
  "group_id": 1,
  "blocker_participant_id": 1,
  "blocked_participant_id": 2,
  "created_at": "2025-10-09T10:00:00Z"
}
```

**Typ odpowiedzi**: `ExclusionRuleDTO`

**Obsługa błędów**:
- 400 Bad Request (PARTICIPANTS_ARE_SAME) → toast "Uczestnik nie może wykluczyć samego siebie"
- 400 Bad Request (DUPLICATE_RULE) → toast "Takie wykluczenie już istnieje"
- 400 Bad Request (DRAW_COMPLETED) → toast "Nie można dodawać wykluczeń po losowaniu"
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → toast "Tylko twórca może dodawać wykluczenia"
- 404 Not Found → toast "Uczestnik nie znaleziony"

**Callback po sukcesie**:
- `refetchExclusions()`
- Reset formularza
- Toast sukcesu
- Automatyczna rewalidacja losowania (`validateDraw()`)

---

### 7.8. Usunięcie wykluczenia

**Endpoint**: `DELETE /api/exclusions/:id`

**Request**:
```http
DELETE /api/exclusions/1
Authorization: Bearer {access_token}
```

**Response** (204 No Content): Brak body

**Obsługa błędów**:
- 400 Bad Request (DRAW_COMPLETED) → toast "Nie można usuwać wykluczeń po losowaniu"
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → toast "Tylko twórca może usuwać wykluczenia"
- 404 Not Found → toast "Wykluczenie nie znalezione"

**Callback po sukcesie**:
- `refetchExclusions()`
- Toast sukcesu
- Automatyczna rewalidacja losowania (`validateDraw()`)

---

### 7.9. Walidacja losowania

**Endpoint**: `POST /api/groups/:groupId/draw/validate`

**Request**:
```http
POST /api/groups/1/draw/validate
Authorization: Bearer {access_token}
```

**Response** (200 OK) - sukces:
```json
{
  "valid": true,
  "participants_count": 5,
  "exclusions_count": 2,
  "message": "Draw can be executed successfully"
}
```

**Response** (200 OK) - błąd walidacji:
```json
{
  "valid": false,
  "participants_count": 3,
  "exclusions_count": 5,
  "message": "Draw is impossible with current exclusion rules",
  "details": "Too many exclusions create an impossible scenario"
}
```

**Typ odpowiedzi**: `DrawValidationDTO`

**Obsługa błędów**:
- 400 Bad Request (NOT_ENOUGH_PARTICIPANTS) → alert "Minimum 3 uczestników wymagane"
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → alert "Tylko twórca może walidować losowanie"
- 404 Not Found → toast "Grupa nie znaleziona"

**Użycie**:
- Automatyczne wywołanie w `DrawSection` przy montowaniu (jeśli `participantsCount >= 3`)
- Automatyczne wywołanie po dodaniu/usunięciu wykluczenia
- Ręczne wywołanie przed otwarciem `DrawConfirmationModal`

---

### 7.10. Wykonanie losowania

**Endpoint**: `POST /api/groups/:groupId/draw`

**Request**:
```http
POST /api/groups/1/draw
Authorization: Bearer {access_token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Draw completed successfully",
  "group_id": 1,
  "drawn_at": "2025-10-09T10:00:00Z",
  "participants_notified": 5
}
```

**Typ odpowiedzi**: `DrawResultDTO`

**Obsługa błędów**:
- 400 Bad Request (NOT_ENOUGH_PARTICIPANTS) → toast "Minimum 3 uczestników wymagane"
- 400 Bad Request (DRAW_ALREADY_COMPLETED) → toast "Losowanie już zostało wykonane"
- 400 Bad Request (DRAW_IMPOSSIBLE) → toast "Losowanie niemożliwe z obecnymi wykluczeniami"
- 401 Unauthorized → przekierowanie na `/login`
- 403 Forbidden → toast "Tylko twórca może wykonać losowanie"
- 404 Not Found → toast "Grupa nie znaleziona"

**Callback po sukcesie**:
- `refetchGroup()` - odświeżenie danych grupy (zmiana `is_drawn` na true)
- `refetchParticipants()` - odświeżenie danych uczestników (tokeny dla niezarejestrowanych)
- `refetchExclusions()` - odświeżenie wykluczeń (zmiana `canDelete` na false)
- Zamknięcie modala
- Toast sukcesu "Losowanie zakończone pomyślnie!"
- Automatyczne przejście na widok "po losowaniu" (`ResultsSection`)

## 8. Interakcje użytkownika

### 8.1. Scenariusz: Wejście na stronę grupy

**Akcja użytkownika**: Nawigacja do `/groups/:id`

**Przepływ**:
1. Astro sprawdza sesję użytkownika
2. Jeśli brak sesji → przekierowanie na `/login`
3. Jeśli ID nieprawidłowe → przekierowanie na `/dashboard`
4. Renderowanie `GroupView` z `client:load`
5. `GroupView` wywołuje `useGroupData(groupId)`
6. Hook pobiera dane z `GET /api/groups/:id`
7. Wyświetlenie loading state (skeleton)
8. Po otrzymaniu danych → transformacja do ViewModel
9. Renderowanie pełnego widoku

**Możliwe rezultaty**:
- **Sukces**: Wyświetlenie widoku grupy z wszystkimi danymi
- **404**: Wyświetlenie "Grupa nie znaleziona" z przyciskiem powrotu
- **403**: Wyświetlenie "Brak dostępu" (jako error state)
- **Błąd sieci**: Wyświetlenie error state z przyciskiem "Spróbuj ponownie"

---

### 8.2. Scenariusz: Edycja grupy

**Akcja użytkownika**: Kliknięcie przycisku "Edytuj grupę"

**Warunki początkowe**:
- `isCreator === true`
- `canEdit === true` (grupa nie została wylosowana)

**Przepływ**:
1. Kliknięcie przycisku w `GroupHeader`
2. Wywołanie `handleEditGroupClick()` w `GroupView`
3. Ustawienie `isEditGroupModalOpen = true`
4. Otwarcie `GroupEditModal` z danymi grupy
5. Użytkownik edytuje pola (nazwa, budżet, data)
6. Kliknięcie "Zapisz"
7. Walidacja formularza (React Hook Form)
8. Wywołanie `updateGroup(command)` z hooka `useGroupData`
9. Wysłanie `PATCH /api/groups/:id`
10. Wyświetlenie loading state na przycisku
11. Po sukcesie:
    - Wywołanie `refetchGroup()`
    - Zamknięcie modala
    - Toast "Grupa zaktualizowana"
12. Po błędzie:
    - Wyświetlenie błędu w formularzu lub toast
    - Modal pozostaje otwarty

**Możliwe rezultaty**:
- **Sukces**: Grupa zaktualizowana, modal zamknięty, dane odświeżone
- **Błąd walidacji**: Komunikat w formularzu
- **400 DRAW_COMPLETED**: Toast "Nie można edytować po losowaniu"
- **403 Forbidden**: Toast "Tylko twórca może edytować"

---

### 8.3. Scenariusz: Usunięcie grupy

**Akcja użytkownika**: Kliknięcie przycisku "Usuń grupę"

**Warunki początkowe**:
- `isCreator === true`

**Przepływ**:
1. Kliknięcie przycisku w `GroupHeader`
2. Wywołanie `handleDeleteGroupClick()` w `GroupView`
3. Ustawienie `isDeleteGroupModalOpen = true`
4. Otwarcie `DeleteGroupModal` z nazwą grupy
5. Użytkownik przeczyta ostrzeżenie o trwałym usunięciu
6. Kliknięcie "Usuń"
7. Wywołanie `deleteGroup()` z hooka `useGroupData`
8. Wysłanie `DELETE /api/groups/:id`
9. Wyświetlenie loading state
10. Po sukcesie:
    - Przekierowanie na `/dashboard`
    - Toast "Grupa usunięta"
11. Po błędzie:
    - Toast z komunikatem błędu
    - Modal pozostaje otwarty

**Możliwe rezultaty**:
- **Sukces**: Grupa usunięta, przekierowanie na dashboard
- **403 Forbidden**: Toast "Tylko twórca może usunąć grupę"
- **404 Not Found**: Toast "Grupa nie znaleziona"

---

### 8.4. Scenariusz: Dodanie uczestnika

**Akcja użytkownika**: Wypełnienie formularza i kliknięcie "Dodaj uczestnika"

**Warunki początkowe**:
- `canEdit === true`
- `isDrawn === false`

**Przepływ**:
1. Wypełnienie pól w `AddParticipantForm` (imię required, email optional)
2. Kliknięcie "Dodaj"
3. Walidacja formularza (React Hook Form)
4. Wywołanie `addParticipant(command)` z hooka `useParticipants`
5. Wysłanie `POST /api/groups/:groupId/participants`
6. Wyświetlenie loading state na przycisku
7. Po sukcesie:
    - Wywołanie `refetchParticipants()`
    - Reset formularza
    - Toast "Uczestnik dodany"
    - Jeśli niezarejestrowany (brak user_id):
      - Toast z opcją skopiowania tokenu
      - Wyświetlenie linku: `/results/{access_token}`
8. Po błędzie:
    - Wyświetlenie błędu w formularzu lub toast
    - Formularz pozostaje wypełniony

**Możliwe rezultaty**:
- **Sukces (zarejestrowany)**: Uczestnik dodany, lista odświeżona
- **Sukces (niezarejestrowany)**: Uczestnik dodany, wyświetlenie tokenu
- **400 EMAIL_EXISTS**: Toast "Email już istnieje w grupie"
- **400 DRAW_COMPLETED**: Toast "Nie można dodawać uczestników po losowaniu"
- **422 Validation Error**: Błąd w formularzu

---

### 8.5. Scenariusz: Edycja uczestnika

**Akcja użytkownika**: Kliknięcie ikony edycji przy uczestniku

**Warunki początkowe**:
- `canEdit === true`
- `isDrawn === false`

**Przepływ**:
1. Kliknięcie ikony edycji w `ParticipantsList` lub `ParticipantCard`
2. Wywołanie `handleEditParticipant(participant)` w `GroupView`
3. Ustawienie `selectedParticipant = participant`
4. Ustawienie `isEditParticipantModalOpen = true`
5. Otwarcie `EditParticipantModal` z danymi uczestnika
6. Użytkownik edytuje pola (imię, email)
7. Kliknięcie "Zapisz"
8. Walidacja formularza
9. Wywołanie `updateParticipant(id, command)` z hooka `useParticipants`
10. Wysłanie `PATCH /api/participants/:id`
11. Po sukcesie:
    - Wywołanie `refetchParticipants()`
    - Zamknięcie modala
    - Reset `selectedParticipant`
    - Toast "Uczestnik zaktualizowany"
12. Po błędzie:
    - Wyświetlenie błędu w formularzu lub toast
    - Modal pozostaje otwarty

**Możliwe rezultaty**: Analogiczne do dodawania uczestnika

---

### 8.6. Scenariusz: Usunięcie uczestnika

**Akcja użytkownika**: Kliknięcie ikony usunięcia przy uczestniku

**Warunki początkowe**:
- `canEdit === true`
- `isDrawn === false`
- `participant.canDelete === true` (nie jest twórcą)

**Przepływ**:
1. Kliknięcie ikony usunięcia
2. Opcjonalnie: Wyświetlenie potwierdzenia (Alert Dialog)
3. Wywołanie `handleDeleteParticipant(id)` w `GroupView`
4. Wywołanie `deleteParticipant(id)` z hooka `useParticipants`
5. Wysłanie `DELETE /api/participants/:id`
6. **Optimistic update**: Uczestnik znika z listy natychmiast
7. Po sukcesie:
    - Toast "Uczestnik usunięty"
8. Po błędzie:
    - Wywołanie `refetchParticipants()` (rollback)
    - Toast z komunikatem błędu

**Możliwe rezultaty**:
- **Sukces**: Uczestnik usunięty, lista odświeżona
- **400 CANNOT_DELETE_CREATOR**: Toast "Nie można usunąć twórcy grupy"
- **400 DRAW_COMPLETED**: Toast "Nie można usuwać uczestników po losowaniu"

---

### 8.7. Scenariusz: Dodanie wykluczenia

**Akcja użytkownika**: Wybór uczestników w selectach i kliknięcie "Dodaj wykluczenie"

**Warunki początkowe**:
- `canEdit === true`
- `isDrawn === false`
- `participants.length >= 2`

**Przepływ**:
1. Wybór "kto nie może wylosować" (blocker) w pierwszym select
2. Wybór "kogo nie może wylosować" (blocked) w drugim select
3. Walidacja frontend: blocker !== blocked
4. Kliknięcie "Dodaj wykluczenie"
5. Wywołanie `addExclusion(command)` z hooka `useExclusions`
6. Wysłanie `POST /api/groups/:groupId/exclusions`
7. Po sukcesie:
    - Wywołanie `refetchExclusions()`
    - Reset formularza
    - Toast "Wykluczenie dodane"
    - **Automatyczna walidacja losowania**: `validateDraw()`
8. Po błędzie:
    - Toast z komunikatem błędu

**Możliwe rezultaty**:
- **Sukces**: Wykluczenie dodane, lista odświeżona, rewalidacja losowania
- **400 PARTICIPANTS_ARE_SAME**: Toast "Uczestnik nie może wykluczyć samego siebie"
- **400 DUPLICATE_RULE**: Toast "Takie wykluczenie już istnieje"
- **400 DRAW_COMPLETED**: Toast "Nie można dodawać wykluczeń po losowaniu"

---

### 8.8. Scenariusz: Usunięcie wykluczenia

**Akcja użytkownika**: Kliknięcie ikony usunięcia przy wykluczeniu

**Warunki początkowe**:
- `canEdit === true`
- `isDrawn === false`

**Przepływ**:
1. Kliknięcie ikony usunięcia w `ExclusionsList`
2. Wywołanie `handleDeleteExclusion(id)` w `GroupView`
3. Wywołanie `deleteExclusion(id)` z hooka `useExclusions`
4. Wysłanie `DELETE /api/exclusions/:id`
5. **Optimistic update**: Wykluczenie znika z listy natychmiast
6. Po sukcesie:
    - Toast "Wykluczenie usunięte"
    - **Automatyczna walidacja losowania**: `validateDraw()`
7. Po błędzie:
    - Wywołanie `refetchExclusions()` (rollback)
    - Toast z komunikatem błędu

**Możliwe rezultaty**:
- **Sukces**: Wykluczenie usunięte, lista odświeżona, rewalidacja losowania
- **400 DRAW_COMPLETED**: Toast "Nie można usuwać wykluczeń po losowaniu"

---

### 8.9. Scenariusz: Rozpoczęcie losowania

**Akcja użytkownika**: Kliknięcie przycisku "Rozpocznij losowanie"

**Warunki początkowe**:
- `isCreator === true`
- `participantsCount >= 3`
- Walidacja losowania przeszła (`validation.valid === true`)

**Przepływ**:
1. Automatyczna walidacja w `DrawSection` (useEffect)
2. Wyświetlenie statusu gotowości (3 karty informacyjne)
3. Jeśli walidacja OK: przycisk enabled, alert sukcesu
4. Jeśli walidacja failed: przycisk disabled, alert błędu z szczegółami
5. Kliknięcie "Rozpocznij losowanie"
6. Wywołanie `handleDrawClick()` w `GroupView`
7. Ustawienie `isDrawConfirmationModalOpen = true`
8. Otwarcie `DrawConfirmationModal`
9. Użytkownik czyta ostrzeżenie o nieodwracalności
10. Kliknięcie "Potwierdź"
11. Wywołanie `executeDraw()` z hooka `useDraw`
12. Wysłanie `POST /api/groups/:groupId/draw`
13. Wyświetlenie loading state
14. Po sukcesie:
    - Wywołanie `refetchGroup()` (zmiana `is_drawn` na true)
    - Wywołanie `refetchParticipants()` (tokeny dla niezarejestrowanych)
    - Wywołanie `refetchExclusions()`
    - Zamknięcie modala
    - Toast "Losowanie zakończone pomyślnie!"
    - Automatyczne przejście na widok "po losowaniu"
15. Po błędzie:
    - Toast z komunikatem błędu
    - Modal pozostaje otwarty

**Możliwe rezultaty**:
- **Sukces**: Losowanie wykonane, widok zmienia się na "po losowaniu"
- **400 NOT_ENOUGH_PARTICIPANTS**: Toast "Minimum 3 uczestników wymagane"
- **400 DRAW_ALREADY_COMPLETED**: Toast "Losowanie już zostało wykonane"
- **400 DRAW_IMPOSSIBLE**: Toast "Losowanie niemożliwe z obecnymi wykluczeniami"

---

### 8.10. Scenariusz: Kopiowanie linku z tokenem (po losowaniu)

**Akcja użytkownika**: Kliknięcie ikony kopiowania przy niezarejestrowanym uczestniku

**Warunki początkowe**:
- `isDrawn === true`
- `participant.resultLink` istnieje (uczestnik niezarejestrowany)
- `isCreator === true` (tylko twórca widzi tokeny)

**Przepływ**:
1. Kliknięcie ikony kopiowania w `ParticipantsList` lub `ParticipantCard`
2. Wywołanie `handleCopyParticipantToken(participant)` w `GroupView`
3. Wywołanie `navigator.clipboard.writeText(participant.resultLink)`
4. Po sukcesie:
    - Toast "Link skopiowany do schowka"
5. Po błędzie (brak uprawnień do schowka):
    - Fallback: Wyświetlenie linku w input field z możliwością ręcznego skopiowania
    - Toast "Skopiuj link ręcznie"

**Możliwe rezultaty**:
- **Sukces**: Link skopiowany do schowka
- **Błąd**: Wyświetlenie linku do ręcznego skopiowania

---

### 8.11. Scenariusz: Zobacz mój wynik (po losowaniu)

**Akcja użytkownika**: Kliknięcie przycisku "Zobacz mój wynik" w `ResultsSection`

**Warunki początkowe**:
- `isDrawn === true`
- `isParticipant === true` (zalogowany użytkownik jest uczestnikiem)

**Przepływ**:
1. Kliknięcie przycisku
2. Przekierowanie na `/results/:token` lub `/groups/:id/result`
3. Wyświetlenie widoku wyniku (implementacja poza tym widokiem)

**Możliwe rezultaty**:
- **Sukces**: Wyświetlenie widoku z wynikiem losowania

## 9. Warunki i walidacja

### 9.1. Warunki widoczności komponentów

#### Przed losowaniem (`!isDrawn`)

**Widoczne komponenty**:
- `GroupHeader` z przyciskami edycji (jeśli `isCreator`)
- `AddParticipantForm` (jeśli `canEdit`)
- Przyciski edycji/usuwania uczestników (jeśli `canEdit`)
- `AddExclusionForm` (jeśli `canEdit`)
- Przyciski usuwania wykluczeń (jeśli `canEdit`)
- `DrawSection` z przyciskiem losowania (jeśli `isCreator`)

**Ukryte komponenty**:
- Kolumna "Status wishlist" w `ParticipantsList`
- Przyciski kopiowania tokenów
- `ResultsSection`

#### Po losowaniu (`isDrawn`)

**Widoczne komponenty**:
- `GroupHeader` bez przycisku edycji, tylko przycisk usunięcia (jeśli `isCreator`)
- Lista uczestników (read-only) z dodatkowymi kolumnami:
  - "Status wishlist" (badge "Dodana"/"Brak")
  - "Status wyniku" (TODO)
- Przyciski kopiowania tokenów (tylko dla `isCreator`, tylko dla niezarejestrowanych)
- Lista wykluczeń (read-only, bez przycisków usuwania)
- `ResultsSection` (zamiast `DrawSection`)

**Ukryte komponenty**:
- `AddParticipantForm`
- `AddExclusionForm`
- Wszystkie przyciski edycji/usuwania
- `DrawSection`

### 9.2. Warunki uprawnień

#### Twórca grupy (`isCreator`)

**Uprawnienia**:
- Edycja grupy (przed losowaniem)
- Usunięcie grupy (zawsze)
- Dodawanie uczestników (przed losowaniem)
- Edycja uczestników (przed losowaniem)
- Usuwanie uczestników (przed losowaniem, oprócz siebie)
- Dodawanie wykluczeń (przed losowaniem)
- Usuwanie wykluczeń (przed losowaniem)
- Rozpoczęcie losowania (jeśli warunki spełnione)
- Kopiowanie tokenów uczestników (po losowaniu)

#### Uczestnik (nie twórca)

**Uprawnienia**:
- Przeglądanie informacji o grupie
- Przeglądanie listy uczestników
- Przeglądanie listy wykluczeń
- Przeglądanie swojego wyniku (po losowaniu)

**Brak uprawnień**:
- Wszystkie operacje edycji/modyfikacji

### 9.3. Warunki biznesowe

#### Minimum uczestników do losowania
```typescript
const canStartDraw = participantsCount >= 3 && isCreator;
```

**Implementacja**:
- Walidacja w `DrawSection` - przycisk disabled jeśli `participantsCount < 3`
- Alert z komunikatem "Do losowania wymagane jest minimum 3 uczestników"
- Dodatkowa walidacja w backend (400 NOT_ENOUGH_PARTICIPANTS)

#### Nie można usunąć twórcy grupy
```typescript
const canDelete = !participant.isCreator;
```

**Implementacja**:
- `ParticipantViewModel.canDelete = false` dla twórcy
- Przycisk usuwania ukryty/disabled dla twórcy
- Dodatkowa walidacja w backend (400 CANNOT_DELETE_CREATOR)

#### Blocker !== Blocked w wykluczeniach
```typescript
const isValid = blocker_participant_id !== blocked_participant_id;
```

**Implementacja**:
- Walidacja frontend w `AddExclusionForm`
- Przycisk submit disabled jeśli warunek nie spełniony
- Komunikat "Uczestnik nie może wykluczyć samego siebie"
- Dodatkowa walidacja w backend (400 PARTICIPANTS_ARE_SAME)

#### Unikalność emaila w grupie
```typescript
// Backend validation only
const emailExists = participants.some(p => p.email === newEmail);
```

**Implementacja**:
- Walidacja tylko w backend (sprawdzenie w bazie danych)
- Frontend wyświetla błąd z API (400 EMAIL_EXISTS)
- Toast "Email już istnieje w grupie"

#### Nieodwracalność losowania
```typescript
const canEdit = !group.is_drawn;
```

**Implementacja**:
- Flaga `can_edit` zwracana z API
- Wszystkie formularze i przyciski edycji warunkowane `canEdit`
- Backend blokuje wszystkie operacje modyfikacji jeśli `is_drawn === true`
- Toast "Nie można edytować po losowaniu" przy próbie edycji

### 9.4. Walidacja wykluczeń

#### Czy losowanie jest możliwe z danymi wykluczeniami?

**Algorytm walidacji** (backend):
1. Dla każdego uczestnika utwórz listę możliwych przydziałów
2. Usuń z listy samego siebie
3. Usuń z listy wszystkie wykluczenia dla tego uczestnika
4. Jeśli którakolwiek lista jest pusta → losowanie niemożliwe
5. Sprawdź czy istnieje cykl Hamiltona w grafie przydziałów

**Implementacja w UI**:
- Wywołanie `POST /api/groups/:groupId/draw/validate` w `DrawSection`
- Automatyczne wywołanie przy:
  - Montowaniu komponentu (jeśli `participantsCount >= 3`)
  - Dodaniu wykluczenia
  - Usunięciu wykluczenia
- Wyświetlenie wyniku:
  - Sukces: Alert zielony "Wykluczenia zostały zweryfikowane. Losowanie jest możliwe."
  - Błąd: Alert czerwony z `message` i `details`
- Przycisk "Rozpocznij losowanie" disabled jeśli `!validation.valid`

**Przykładowe scenariusze błędów**:
- "Za dużo wykluczeń uniemożliwia znalezienie rozwiązania"
- "Wykluczenia tworzą niemożliwy do rozwiązania scenariusz"
- "Uczestnik X nie ma nikogo do wylosowania"

### 9.5. Walidacja formularzy

#### AddParticipantForm & EditParticipantForm

**Pole: name**
- Type: `string`
- Required: `true`
- Min length: `1`
- Max length: `255`
- Trim: `true`
- Komunikat błędu: "Imię jest wymagane" / "Imię jest za długie"

**Pole: email**
- Type: `string`
- Required: `false`
- Pattern: valid email format
- Komunikat błędu: "Nieprawidłowy format email"

**Zod schema**:
```typescript
const ParticipantSchema = z.object({
  name: z.string().min(1, "Imię jest wymagane").max(255, "Imię jest za długie").trim(),
  email: z.string().email("Nieprawidłowy format email").optional().or(z.literal("")),
});
```

#### AddExclusionForm

**Pole: blocker_participant_id**
- Type: `number`
- Required: `true`
- Komunikat błędu: "Wybierz uczestnika"

**Pole: blocked_participant_id**
- Type: `number`
- Required: `true`
- Custom validation: `!== blocker_participant_id`
- Komunikat błędu: "Wybierz uczestnika" / "Uczestnik nie może wykluczyć samego siebie"

**Zod schema**:
```typescript
const ExclusionSchema = z.object({
  blocker_participant_id: z.number().positive("Wybierz uczestnika"),
  blocked_participant_id: z.number().positive("Wybierz uczestnika"),
}).refine(
  (data) => data.blocker_participant_id !== data.blocked_participant_id,
  { message: "Uczestnik nie może wykluczyć samego siebie" }
);
```

#### GroupEditModal

**Pole: name**
- Type: `string`
- Required: `true`
- Min length: `1`
- Max length: `255`
- Komunikat błędu: "Nazwa jest wymagana" / "Nazwa jest za długa"

**Pole: budget**
- Type: `number`
- Required: `true`
- Min: `1`
- Komunikat błędu: "Budżet jest wymagany" / "Budżet musi być większy niż 0"

**Pole: end_date**
- Type: `Date` (w formularzu) → konwersja na ISO string przy submicie
- Required: `true`
- Komunikat błędu: "Data zakończenia jest wymagana"

**Zod schema**:
```typescript
const GroupSchema = z.object({
  name: z.string().min(1, "Nazwa jest wymagana").max(255, "Nazwa jest za długa").trim(),
  budget: z.number().positive("Budżet musi być większy niż 0"),
  end_date: z.date({ required_error: "Data zakończenia jest wymagana" }),
});
```

## 10. Obsługa błędów

### 10.1. Błędy HTTP

#### 401 Unauthorized
**Przyczyna**: Brak lub nieprawidłowy token autoryzacji

**Obsługa**:
- W middleware Astro: Przekierowanie na `/login`
- W komponentach React: Rzadko występuje (middleware chroni)
- Jeśli wystąpi: Przekierowanie na `/login` lub wyświetlenie komunikatu + przycisk "Zaloguj się"

#### 403 Forbidden
**Przyczyna**: Użytkownik nie ma uprawnień do wykonania operacji

**Obsługa**:
- **Dla GET (brak dostępu do grupy)**: Wyświetlenie error state "Nie masz dostępu do tej grupy" z przyciskiem powrotu
- **Dla operacji modyfikacji**: Toast z komunikatem "Tylko twórca może wykonać tę operację"
- Nie powinno wystąpić jeśli UI poprawnie ukrywa niedostępne akcje

#### 404 Not Found
**Przyczyna**: Zasób nie istnieje (grupa, uczestnik, wykluczenie)

**Obsługa**:
- **Dla GET grupy**: Wyświetlenie "Grupa nie została znaleziona" z przyciskiem powrotu
- **Dla operacji modyfikacji**: Toast "Zasób nie znaleziony" + refresh danych

#### 400 Bad Request
**Przyczyny**: Błędy biznesowe lub walidacji

**Kody błędów** (z API):
- `INVALID_INPUT` - błąd walidacji danych
- `EMAIL_EXISTS` - email już istnieje w grupie
- `DRAW_COMPLETED` - próba edycji po losowaniu
- `DUPLICATE_RULE` - wykluczenie już istnieje
- `PARTICIPANTS_ARE_SAME` - próba wykluczenia samego siebie
- `CANNOT_DELETE_CREATOR` - próba usunięcia twórcy
- `NOT_ENOUGH_PARTICIPANTS` - za mało uczestników do losowania
- `DRAW_ALREADY_COMPLETED` - losowanie już wykonane
- `DRAW_IMPOSSIBLE` - losowanie niemożliwe z danymi wykluczeniami

**Obsługa**:
- Wyświetlenie toast z komunikatem błędu (`error.message`)
- Dla błędów formularza: Wyświetlenie komunikatu pod polem
- Dla błędów business logic: Alert lub toast

#### 422 Unprocessable Entity
**Przyczyna**: Błąd walidacji pól (backend Zod)

**Obsługa**:
- Parsowanie `error.details.errors` (array błędów Zod)
- Wyświetlenie komunikatów przy odpowiednich polach formularza
- Jeśli nie można zmapować na pole: Toast z listą błędów

#### 500 Internal Server Error
**Przyczyna**: Nieoczekiwany błąd serwera

**Obsługa**:
- Toast "Wystąpił nieoczekiwany błąd. Spróbuj ponownie."
- Logowanie błędu do konsoli (dla dev)
- Nie powinno wpływać na stan UI - dane pozostają niezmienione

### 10.2. Błędy sieciowe

#### Network Error (brak połączenia)
**Obsługa**:
- Toast "Brak połączenia z serwerem. Sprawdź połączenie internetowe."
- Przycisk "Spróbuj ponownie" w error state
- Dla operacji CUD: Dane pozostają w stanie przed operacją

#### Timeout
**Obsługa**:
- Toast "Operacja trwa zbyt długo. Spróbuj ponownie."
- Możliwość anulowania operacji
- Timeout ustawiony w hookach (domyślnie brak, można dodać)

### 10.3. Obsługa błędów w hookach

#### useGroupData
```typescript
try {
  // fetch data
} catch (err) {
  setError({
    code: "FETCH_ERROR",
    message: err instanceof Error ? err.message : "Nieznany błąd",
  });
} finally {
  setLoading(false);
}
```

**Propagacja błędu**: Hook zwraca `error`, komponent decyduje jak go wyświetlić

#### useParticipants, useExclusions
```typescript
const addParticipant = async (command) => {
  try {
    const response = await fetch(/* ... */);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Błąd");
    }
    await refetch(); // auto-refresh
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Nieznany błąd",
    };
  }
};
```

**Propagacja błędu**: Hook zwraca `{ success, error }`, komponent wyświetla toast

### 10.4. Error boundaries (opcjonalnie)

**Implementacja** (nie obecna w kodzie, zalecana):
```typescript
class GroupViewErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    console.error("GroupView error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => window.location.reload()} />;
    }
    return this.props.children;
  }
}
```

**Cel**: Złapanie nieoczekiwanych błędów renderowania

### 10.5. Obsługa stanu pustego (empty states)

#### Brak uczestników
```tsx
{participants.length === 0 && (
  <div className="text-center py-8">
    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
    <p className="text-muted-foreground">Brak uczestników w grupie</p>
    {canEdit && !isDrawn && (
      <p className="text-sm text-muted-foreground mt-2">
        Dodaj pierwszego uczestnika używając formularza powyżej
      </p>
    )}
  </div>
)}
```

#### Brak wykluczeń
```tsx
{exclusions.length === 0 && (
  <div className="text-center py-4">
    <p className="text-muted-foreground text-sm">
      Nie zdefiniowano żadnych wykluczeń
    </p>
  </div>
)}
```

### 10.6. Loading states

#### Skeleton loading (initial load)
```tsx
if (isLoading && !group) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          {/* ... more skeleton elements */}
        </div>
      </div>
    </div>
  );
}
```

#### Inline loading (akcje)
```tsx
<Button disabled={isSubmitting}>
  {isSubmitting ? "Zapisywanie..." : "Zapisz"}
</Button>
```

#### Loading overlay (dla modalów)
```tsx
{isLoading && (
  <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
    <Spinner />
  </div>
)}
```

## 11. Potencjalne ulepszenia

### 11.1. Implementacja statusu wyniku uczestnika

**Aktualny stan**:
- `ParticipantViewModel.resultStatus` jest zdefiniowany, ale zawsze ustawiony na `formatResultStatus(false)`
- TODO w kodzie: `// TODO: Implement result status`

**Wymagane zmiany**:
1. **Backend**:
   - Dodanie pola `result_viewed_at` do tabeli `participants`
   - Tracking otwarcia linku wyniku (POST /api/results/:token/track)
   - Zwracanie `result_viewed: boolean` w `ParticipantListItemDTO`

2. **Frontend**:
   - Aktualizacja `ParticipantListItemDTO` o pole `result_viewed`
   - Zmiana w `transformParticipantsToViewModels`:
     ```typescript
     resultStatus: group?.is_drawn
       ? formatResultStatus(participant.result_viewed || false)
       : undefined
     ```
   - Wyświetlenie kolumny/badge "Status wyniku" w `ParticipantsList` i `ParticipantCard`

### 11.2. Potwierdzenie przed usunięciem uczestnika

**Aktualny stan**: Usunięcie uczestnika następuje natychmiast po kliknięciu ikony

**Sugerowana zmiana**:
- Dodanie `AlertDialog` z potwierdzeniem przed usunięciem
- Komunikat: "Czy na pewno chcesz usunąć uczestnika [Imię]? Tej operacji nie można cofnąć."
- Przyciski: "Anuluj" / "Usuń"

**Implementacja**:
```typescript
const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
const [participantToDelete, setParticipantToDelete] = useState<number | null>(null);

// W komponencie:
<AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Usuń uczestnika</AlertDialogTitle>
      <AlertDialogDescription>
        Czy na pewno chcesz usunąć tego uczestnika? Tej operacji nie można cofnąć.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Anuluj</AlertDialogCancel>
      <AlertDialogAction onClick={() => handleConfirmDelete()}>
        Usuń
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 11.3. Optymistyczne UI dla dodawania uczestnika

**Aktualny stan**: Po dodaniu uczestnika czekamy na odpowiedź API i refetch

**Sugerowana zmiana**:
- Natychmiastowe dodanie uczestnika do listy po submicie
- Wyświetlenie loading state przy nowym uczestniku
- W przypadku błędu: usunięcie z listy + wyświetlenie toastu
- W przypadku sukcesu: aktualizacja danych uczestnika (ID, created_at)

**Korzyści**: Szybsze wrażenie dla użytkownika

### 11.4. Auto-save dla formularza edycji grupy

**Aktualny stan**: Edycja poprzez modal z przyciskiem "Zapisz"

**Sugerowana zmiana** (opcjonalna):
- Inline editing w `GroupHeader`
- Auto-save po opuszczeniu pola (onBlur) lub debounce
- Wizualna informacja o zapisywaniu ("Zapisywanie..." / "Zapisano")

**Implementacja**:
```typescript
const debouncedUpdate = useMemo(
  () => debounce((field, value) => {
    updateGroup({ [field]: value });
  }, 1000),
  [updateGroup]
);
```

### 11.5. Walidacja daty zakończenia

**Aktualny stan**: Można ustawić datę zakończenia w przeszłości

**Sugerowana zmiana**:
- Walidacja w formularzu: data zakończenia >= dzisiaj
- Komunikat: "Data zakończenia musi być w przyszłości"
- Backend validation (opcjonalnie): soft warning, ale nie blokowanie

**Implementacja**:
```typescript
const GroupSchema = z.object({
  // ...
  end_date: z.date()
    .refine((date) => date >= new Date(), {
      message: "Data zakończenia musi być w przyszłości"
    }),
});
```

### 11.7. Powiadomienia email (poza MVP)

**Funkcjonalność**:
- Automatyczne wysyłanie emaili do uczestników z linkami do wyników
- Email po zakończeniu losowania
- Email przypominający X dni przed datą zakończenia

**Wymagania**:
- Integracja z serwisem email (np. SendGrid, Mailgun)
- Template dla emaili
- Kolejka zadań dla wysyłania (np. Bull, BullMQ)

**Implementacja**: Poza zakresem widoku, wymaga backend service
<!-- 
### 11.8. Historia zmian (audit log)

**Funkcjonalność**:
- Logowanie wszystkich operacji modyfikacji
- Wyświetlenie historii w widoku grupy
- Informacje: kto, kiedy, co zmienił

**Wymagania**:
- Tabela `audit_log` w bazie danych
- Middleware logujący wszystkie operacje CUD
- Komponent `AuditLogSection` w widoku grupy

**Użyteczność**: Transparentność zmian, debugging, audyt -->

### 11.9. Widok podglądu (preview mode)

**Funkcjonalność**:
- Przycisk "Podgląd losowania" (przed wykonaniem)
- Symulacja losowania bez zapisywania
- Wyświetlenie przykładowych par

**Użyteczność**: Testowanie wykluczeń przed faktycznym losowaniem

**Implementacja**:
- Endpoint `POST /api/groups/:id/draw/preview`
- Modal z wynikami symulacji
- Ostrzeżenie: "To tylko podgląd, rzeczywiste losowanie może być inne"

### 11.10. Responsywność - tryb tabletu

**Aktualny stan**:
- Desktop: Tabele (md:block)
- Mobile: Karty (md:hidden)

**Sugerowana zmiana**:
- Dodanie breakpointu dla tabletów (lg:)
- Ulepszona tabela dla średnich ekranów (skrócone nagłówki, kompaktowy layout)

**Implementacja**:
```tsx
{/* Desktop */}
<div className="hidden lg:block">
  <ParticipantsList /* full */ />
</div>

{/* Tablet */}
<div className="hidden md:block lg:hidden">
  <ParticipantsList compact />
</div>

{/* Mobile */}
<div className="md:hidden">
  <ParticipantCard[] />
</div>
```

<!-- ### 11.11. Wyszukiwanie i filtrowanie uczestników

**Funkcjonalność**:
- Pole wyszukiwania w `ParticipantsSection`
- Filtrowanie po: imię, email, status wishlist
- Dla dużych grup (20+ uczestników)

**Implementacja**:
```typescript
const [searchQuery, setSearchQuery] = useState("");

const filteredParticipants = useMemo(() => {
  return participants.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );
}, [participants, searchQuery]);
``` -->

<!-- ### 11.12. Dark mode

**Funkcjonalność**: Wsparcie dla trybu ciemnego

**Wymagania**:
- Konfiguracja Tailwind dla dark mode
- Toggle w głównym layoucie
- Persistencja wyboru w localStorage
- Dostosowanie wszystkich komponentów

**Implementacja**: Poza zakresem pojedynczego widoku, wymaga globalnych zmian

### 11.13. Internationalization (i18n)

**Funkcjonalność**: Wsparcie wielu języków (EN, PL, DE, etc.)

**Wymagania**:
- Biblioteka i18n (react-i18next)
- Pliki tłumaczeń (locales/)
- Przetłumaczenie wszystkich stringów w UI
- Selector języka w layoucie

**Implementacja**: Poza zakresem MVP, wymaga refaktoru całej aplikacji -->

---

## Podsumowanie

Widok grupy Secret Santa jest **w pełni zaimplementowany** i gotowy do użycia. Dokument ten stanowi kompleksową dokumentację techniczną, która może służyć jako:

1. **Odniesienie dla programistów** - pełny opis architektury, komponentów i przepływu danych
2. **Podstawa do code review** - weryfikacja poprawności implementacji względem wymagań
3. **Plan dalszego rozwoju** - sekcja "Potencjalne ulepszenia" zawiera propozycje rozszerzeń
4. **Materiał onboardingowy** - dla nowych członków zespołu pracujących nad projektem

### Kluczowe cechy implementacji:

✅ Pełna obsługa dwóch stanów: przed i po losowaniu
✅ Responsywność (desktop/mobile) z dedykowanymi komponentami
✅ Architektura oparta na custom hookach (separation of concerns)
✅ Transformacja DTO → ViewModel dla optymalizacji UI
✅ Comprehensive error handling i loading states
✅ Walidacja na poziomie frontend i backend
✅ Optimistic updates dla lepszego UX
✅ Accessibility (ARIA labels, keyboard navigation)
✅ Zgodność z PRD i wszystkimi User Stories

### Obszary wymagające dokończenia:

⚠️ Status wyniku uczestnika (TODO w kodzie)
⚠️ Potwierdzenie przed usunięciem uczestnika (zalecane)

### Rekomendacje:

1. **Krótkoterminowe** (przed production):
   - Implementacja statusu wyniku uczestnika
   - Dodanie potwierdzenia przed usunięciem
   <!-- - Testy E2E dla głównych scenariuszy -->

2. **Średnioterminowe** (post-MVP):
   - Optymistyczne UI dla dodawania uczestnika
   - Walidacja daty zakończenia
   - Eksport listy uczestników

3. **Długoterminowe** (future):
   - Powiadomienia email
   - Historia zmian (audit log)
   - Internationalization
