# Plan implementacji widoku grupy

## 1. Przegląd

Widok grupy (`/groups/:id`) jest centralnym miejscem zarządzania grupą Secret Santa. Widok ten obsługuje dwa główne stany:

**Przed losowaniem (stan edytowalny):**
- Zarządzanie informacjami o grupie (nazwa, budżet, data zakończenia)
- Dodawanie, edytowanie i usuwanie uczestników
- Definiowanie i usuwanie reguł wykluczeń (kto nie może wylosować kogo)
- Walidacja możliwości przeprowadzenia losowania
- Uruchomienie procesu losowania
- Usunięcie grupy

**Po losowaniu (stan read-only):**
- Wyświetlanie informacji o grupie (bez możliwości edycji)
- Lista uczestników ze statusem listy życzeń
- Kopiowanie unikalnych linków dostępu dla uczestników
- Przycisk "Zobacz mój wynik" dla zalogowanego użytkownika

Widok zapewnia pełną funkcjonalność CRUD dla grupy zgodnie z wymaganiami PRD oraz wszystkimi historyjkami użytkownika (US-005 do US-009). Interfejs jest w pełni responsywny - na urządzeniach mobilnych tabele zastępowane są kartami, a wszystkie elementy są dostępne (ARIA labels, focus management).

## 2. Routing widoku

**Ścieżka:** `/groups/:id`

**Typ strony:** Dynamiczna strona Astro (SSR) z osadzonymi komponentami React dla interaktywności

**Plik:** `src/pages/groups/[id].astro`

**Parametry URL:**
- `:id` - ID grupy (number)

**Dostęp:**
- Tylko dla zalogowanych użytkowników
- Użytkownik musi być członkiem grupy (uczestnikiem lub twórcą)
- W przypadku braku autoryzacji: przekierowanie do `/login`
- W przypadku braku dostępu do grupy: komunikat błędu 403

**Navigation flow:**
- Z dashboardu (`/dashboard`) po kliknięciu w grupę
- Po utworzeniu grupy (`/groups/new`) - automatyczne przekierowanie
- Z listy grup użytkownika

## 3. Struktura komponentów

```
GroupViewPage (Astro page)
└── GroupView (główny komponent React)
    ├── GroupHeader
    │   ├── GroupEditModal
    │   └── DeleteGroupModal
    ├── ParticipantsSection
    │   ├── AddParticipantForm
    │   ├── ParticipantsList (desktop)
    │   │   └── EditParticipantModal
    │   └── ParticipantCard[] (mobile)
    │       └── EditParticipantModal
    ├── ExclusionsSection
    │   ├── AddExclusionForm
    │   └── ExclusionsList
    ├── DrawSection (przed losowaniem)
    │   └── DrawConfirmationModal
    └── ResultsSection (po losowaniu)
```

## 4. Szczegóły komponentów

### 4.1. GroupView (główny kontener)

**Opis komponentu:**
Główny komponent React będący kontenerem dla całego widoku grupy. Zarządza stanem globalnym widoku, pobiera dane grupy z API, koordynuje komunikację między komponentami potomnymi oraz obsługuje routing i autoryzację. Komponent sprawdza czy użytkownik jest twórcą grupy oraz czy losowanie zostało przeprowadzone, aby odpowiednio dostosować interfejs (edytowalny vs. read-only).

**Główne elementy:**
- `<div>` - główny kontener z paddingiem i max-width
- `<Toaster>` - komponent Sonner do wyświetlania powiadomień
- Stan ładowania (skeleton/spinner) podczas pobierania danych
- Komunikat błędu w przypadku problemów z pobraniem danych
- Komponenty potomne (GroupHeader, ParticipantsSection, ExclusionsSection, DrawSection/ResultsSection)

**Obsługiwane zdarzenia:**
- Inicjalizacja: pobieranie danych grupy przy montowaniu komponentu
- Odświeżanie danych: po operacjach CRUD (dodanie uczestnika, edycja grupy, etc.)
- Przekierowanie: po usunięciu grupy lub wykonaniu losowania

**Warunki walidacji:**
- Sprawdzenie autoryzacji użytkownika (zalogowany, token aktywny)
- Sprawdzenie dostępu do grupy (użytkownik jest członkiem)
- Sprawdzenie stanu grupy (is_drawn) dla wyświetlenia odpowiedniego interfejsu

**Typy:**
- `GroupDetailDTO` - dane grupy z API
- `ParticipantListItemDTO[]` - lista uczestników
- `ExclusionRuleListItemDTO[]` - lista wykluczeń

**Propsy:**
```typescript
interface GroupViewProps {
  groupId: number; // ID grupy z URL params
}
```

### 4.2. GroupHeader

**Opis komponentu:**
Nagłówek widoku grupy wyświetlający kluczowe informacje: nazwę grupy, budżet, datę zakończenia oraz status losowania. Zawiera przyciski akcji: edycję grupy (tylko dla twórcy, przed losowaniem) oraz usunięcie grupy (tylko dla twórcy). W stanie po losowaniu wyświetla informację o dacie przeprowadzenia losowania. Komponent jest responsywny - na mobile układ przechodzi na tryb kolumnowy.

**Główne elementy:**
- `<header>` z klasą dla semantyki
- `<div>` - kontener informacji o grupie
  - `<h1>` - nazwa grupy
  - `<div>` - badge z budżetem (z ikoną PLN)
  - `<div>` - badge z datą zakończenia (z ikoną kalendarza)
  - `<div>` - badge statusu losowania (przed/po)
- `<div>` - kontener przycisków akcji
  - `<Button>` - "Edytuj grupę" (warunkowy)
  - `<Button>` - "Usuń grupę" (warunkowy)
- `<GroupEditModal>` - modal edycji
- `<DeleteGroupModal>` - modal usunięcia

**Obsługiwane zdarzenia:**
- `onEditClick` - otwarcie modalu edycji grupy
- `onDeleteClick` - otwarcie modalu potwierdzenia usunięcia
- `onEditSave` - zapisanie edycji grupy (callback z modalu)
- `onDeleteConfirm` - potwierdzenie usunięcia grupy (callback z modalu)

**Warunki walidacji:**
- Przycisk "Edytuj grupę": widoczny gdy `isCreator && canEdit && !isDrawn`
- Przycisk "Usuń grupę": widoczny gdy `isCreator`
- Badge statusu: kolor zielony po losowaniu, szary przed

**Typy:**
- `GroupViewModel` - rozszerzony GroupDTO z formatowaniem

**Propsy:**
```typescript
interface GroupHeaderProps {
  group: GroupViewModel;
  isCreator: boolean;
  canEdit: boolean;
  isDrawn: boolean;
  onGroupUpdated: () => void;
  onGroupDeleted: () => void;
}
```

### 4.3. GroupEditModal

**Opis komponentu:**
Modal do edycji podstawowych informacji o grupie. Zawiera formularz z polami: nazwa grupy, budżet (w PLN) i data zakończenia wydarzenia. Wykorzystuje React Hook Form z Zod do walidacji. Modal otwiera się po kliknięciu przycisku "Edytuj grupę" w nagłówku. Walidacja zapewnia, że budżet jest liczbą całkowitą większą od 0, nazwa ma minimum 3 znaki, a data jest w przyszłości. Po zapisaniu, wywołuje API PATCH /api/groups/:id i zamyka modal.

**Główne elementy:**
- `<Dialog>` z Shadcn/ui
- `<DialogContent>` - zawartość modalu
  - `<DialogHeader>` z tytułem "Edytuj grupę"
  - `<Form>` - formularz React Hook Form
    - `<FormField name="name">` - pole nazwy grupy
    - `<FormField name="budget">` - pole budżetu (z suffixem "PLN")
    - `<FormField name="end_date">` - pole daty (DatePicker)
  - `<DialogFooter>` - przyciski
    - `<Button variant="outline">` - "Anuluj"
    - `<Button type="submit">` - "Zapisz zmiany"

**Obsługiwane zdarzenia:**
- `onSubmit` - wysłanie formularza (PATCH /api/groups/:id)
- `onCancel` - zamknięcie modalu bez zapisywania
- Walidacja real-time (onChange) dla wszystkich pól

**Warunki walidacji:**
- `name`:
  - Niepuste
  - Min. 3 znaki
  - Max. 50 znaków
- `budget`:
  - Wymagane
  - Liczba całkowita
  - Większa od 0
- `end_date`:
  - Wymagane
  - Data w przyszłości (> dzisiaj)

**Typy:**
- `UpdateGroupCommand` - dane do wysłania
- `GroupViewModel` - dane grupy do edycji

**Propsy:**
```typescript
interface GroupEditModalProps {
  group: GroupViewModel;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedGroup: GroupDTO) => void;
}
```

### 4.4. DeleteGroupModal

**Opis komponentu:**
Modal potwierdzenia usunięcia grupy. Wyświetla ostrzeżenie, że operacja jest nieodwracalna i wszystkie dane grupy (uczestnicy, wykluczenia, wyniki losowania) zostaną trwale usunięte. Wymaga od użytkownika świadomej decyzji poprzez kliknięcie czerwonego przycisku "Usuń grupę". Po potwierdzeniu wywołuje DELETE /api/groups/:id i przekierowuje na dashboard.

**Główne elementy:**
- `<AlertDialog>` z Shadcn/ui
- `<AlertDialogContent>`
  - `<AlertDialogHeader>`
    - `<AlertDialogTitle>` - "Czy na pewno chcesz usunąć tę grupę?"
    - `<AlertDialogDescription>` - ostrzeżenie o nieodwracalności
  - `<AlertDialogFooter>`
    - `<AlertDialogCancel>` - "Anuluj"
    - `<AlertDialogAction>` - "Usuń grupę" (czerwony przycisk)

**Obsługiwane zdarzenia:**
- `onConfirm` - potwierdzenie usunięcia (DELETE /api/groups/:id)
- `onCancel` - zamknięcie modalu bez usuwania

**Warunki walidacji:**
- Brak walidacji - tylko potwierdzenie akcji

**Typy:**
- Brak specjalnych typów (string dla groupName)

**Propsy:**
```typescript
interface DeleteGroupModalProps {
  isOpen: boolean;
  groupName: string;
  groupId: number;
  onClose: () => void;
  onConfirm: () => void;
}
```

### 4.5. ParticipantsSection

**Opis komponentu:**
Sekcja zarządzania uczestnikami grupy. Wyświetla nagłówek sekcji, licznik uczestników oraz listę uczestników (tabela na desktop, karty na mobile). Przed losowaniem zawiera formularz dodawania nowych uczestników. Po losowaniu sekcja jest w trybie read-only z dodatkowymi kolumnami statusu (lista życzeń, czy uczestnik zobaczył wynik). Komponent agreguje operacje CRUD na uczestnikach i przekazuje je do komponentów potomnych.

**Główne elementy:**
- `<section>` - semantyczny kontener sekcji
- `<div>` - nagłówek sekcji
  - `<h2>` - "Uczestnicy" + liczba uczestników
  - `<p>` - opis sekcji (warunkowy)
- `<AddParticipantForm>` - formularz (tylko przed losowaniem)
- `<ParticipantsList>` - lista/tabela (desktop)
- `<div>` - kontener kart (mobile)
  - `<ParticipantCard>[]` - karty uczestników

**Obsługiwane zdarzenia:**
- `onParticipantAdded` - callback po dodaniu uczestnika
- `onParticipantUpdated` - callback po edycji uczestnika
- `onParticipantDeleted` - callback po usunięciu uczestnika

**Warunki walidacji:**
- Formularz dodawania: widoczny gdy `canEdit && !isDrawn`
- Akcje edycji/usuwania: dostępne gdy `canEdit && !isDrawn`
- Minimum 3 uczestników dla aktywacji losowania

**Typy:**
- `ParticipantListItemDTO[]` - lista uczestników
- `ParticipantViewModel[]` - rozszerzony model z dodatkowymi polami

**Propsy:**
```typescript
interface ParticipantsSectionProps {
  groupId: number;
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  isCreator: boolean;
  onRefresh: () => void;
}
```

### 4.6. AddParticipantForm

**Opis komponentu:**
Inline formularz do dodawania nowych uczestników. Zawiera pola: imię (wymagane) i email (opcjonalny). Wykorzystuje React Hook Form z Zod. Waliduje format email, jeśli został podany. Po pomyślnym dodaniu uczestnika, formularz jest resetowany i wyświetlany toast z potwierdzeniem. Token dostępu jest automatycznie generowany i zapisywany w bazie danych - twórca będzie mógł skopiować link PO losowaniu z listy uczestników. Formularz jest wyświetlany tylko przed losowaniem.

**Główne elementy:**
- `<form>` - formularz React Hook Form
- `<div>` - kontener pól (grid layout)
  - `<FormField name="name">` - pole imienia (Input)
  - `<FormField name="email">` - pole email (Input, opcjonalny)
  - `<Button type="submit">` - "Dodaj uczestnika"
- `<p>` - helper text o opcjonalności email

**Obsługiwane zdarzenia:**
- `onSubmit` - wysłanie formularza (POST /api/groups/:groupId/participants)
- Walidacja real-time dla pól

**Warunki walidacji:**
- `name`:
  - Wymagane
  - Min. 2 znaki
  - Max. 50 znaków
- `email`:
  - Opcjonalny
  - Jeśli podany: poprawny format email
  - Unikalny w obrębie grupy (walidacja API)

**Typy:**
- `CreateParticipantCommand` - dane do wysłania
- `ParticipantWithTokenDTO` - odpowiedź z API (zawiera token)

**Propsy:**
```typescript
interface AddParticipantFormProps {
  groupId: number;
  onSuccess: (participant: ParticipantWithTokenDTO) => void;
}
```

### 4.7. ParticipantsList (desktop)

**Opis komponentu:**
Tabela uczestników wyświetlana na urządzeniach desktop (> 768px). Kolumny tabeli różnią się w zależności od stanu grupy. Przed losowaniem: imię, email, akcje (edytuj/usuń). Po losowaniu: imię, email, status listy życzeń, status wyniku (czy uczestnik widział wynik), akcje (kopiuj link z wynikiem). Przycisk "Kopiuj link" jest widoczny TYLKO PO losowaniu i tylko dla twórcy grupy (pozwala skopiować unikalny link dostępu uczestnika do wyniku). Tabela wykorzystuje Shadcn/ui Table components. Każdy wiersz zawiera przyciski akcji. Twórca grupy nie może być usunięty (przycisk disabled z tooltipem).

**Główne elementy:**
- `<Table>` z Shadcn/ui
- `<TableHeader>`
  - `<TableRow>`
    - `<TableHead>` - "Imię"
    - `<TableHead>` - "Email"
    - `<TableHead>` - "Status listy życzeń" (po losowaniu)
    - `<TableHead>` - "Wynik" (po losowaniu)
    - `<TableHead>` - "Akcje"
- `<TableBody>`
  - `<TableRow>[]` - wiersze uczestników
    - `<TableCell>` - imię (bold jeśli twórca)
    - `<TableCell>` - email lub "Brak"
    - `<TableCell>` - badge statusu (po losowaniu)
    - `<TableCell>` - badge statusu (po losowaniu)
    - `<TableCell>` - przyciski akcji

**Obsługiwane zdarzenia:**
- `onEdit(participant)` - otwarcie modalu edycji (tylko przed losowaniem)
- `onDelete(participantId)` - usunięcie uczestnika (tylko przed losowaniem)
- `onCopyToken(participant)` - kopiowanie linku z tokenem (tylko PO losowaniu, tylko dla twórcy)

**Warunki walidacji:**
- Przycisk "Usuń": disabled gdy uczestnik jest twórcą grupy
- Przyciski edycji/usuwania: widoczne tylko przed losowaniem (`!isDrawn && isCreator`)
- Przycisk "Kopiuj link": widoczny tylko PO losowaniu i tylko dla twórcy (`isDrawn && isCreator`)

**Typy:**
- `ParticipantViewModel[]` - lista uczestników z rozszerzonymi polami

**Propsy:**
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

### 4.8. ParticipantCard (mobile)

**Opis komponentu:**
Karta pojedynczego uczestnika wyświetlana na urządzeniach mobilnych (< 768px). Zastępuje wiersz tabeli z ParticipantsList. Wyświetla te same informacje co tabela, ale w bardziej przyjaznym dla mobile układzie wertykalnym. Zawiera avatar z inicjałami, imię, email, statusy (po losowaniu) oraz dropdown menu z akcjami. Karta ma hover effect i subtle shadow dla lepszej interaktywności.

**Główne elementy:**
- `<div>` - kontener karty (border, rounded, padding)
- `<div>` - header karty
  - `<div>` - avatar z inicjałami
  - `<div>` - informacje
    - `<h3>` - imię (bold jeśli twórca)
    - `<p>` - email lub "Brak email"
- `<div>` - statusy (po losowaniu)
  - Badge listy życzeń
  - Badge wyniku
- `<div>` - akcje
  - `<DropdownMenu>` - menu akcji
    - "Edytuj" (przed losowaniem)
    - "Usuń" (przed losowaniem, disabled dla twórcy)
    - "Kopiuj link" (po losowaniu)

**Obsługiwane zdarzenia:**
- `onEdit(participant)` - otwarcie modalu edycji
- `onDelete(participantId)` - usunięcie uczestnika
- `onCopyToken(participant)` - kopiowanie linku

**Warunki walidacji:**
- Takie same jak ParticipantsList

**Typy:**
- `ParticipantViewModel` - pojedynczy uczestnik

**Propsy:**
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

### 4.9. EditParticipantModal

**Opis komponentu:**
Modal edycji danych uczestnika. Podobny do GroupEditModal, zawiera formularz z polami imię i email. Wykorzystuje React Hook Form z Zod. Otwiera się po kliknięciu "Edytuj" przy uczestniku. Walidacja zapewnia, że imię nie jest puste (min 2 znaki) i email ma poprawny format (jeśli podany). Po zapisaniu wywołuje PATCH /api/participants/:id, aktualizuje listę uczestników i zamyka modal.

**Główne elementy:**
- `<Dialog>` z Shadcn/ui
- `<DialogContent>`
  - `<DialogHeader>`
    - `<DialogTitle>` - "Edytuj uczestnika"
  - `<Form>` - formularz React Hook Form
    - `<FormField name="name">` - pole imienia
    - `<FormField name="email">` - pole email (opcjonalny)
  - `<DialogFooter>`
    - `<Button variant="outline">` - "Anuluj"
    - `<Button type="submit">` - "Zapisz zmiany"

**Obsługiwane zdarzenia:**
- `onSubmit` - wysłanie formularza (PATCH /api/participants/:id)
- `onCancel` - zamknięcie modalu bez zapisywania

**Warunki walidacji:**
- `name`:
  - Wymagane
  - Min. 2 znaki
  - Max. 50 znaków
- `email`:
  - Opcjonalny
  - Jeśli podany: poprawny format email
  - Unikalny w obrębie grupy (walidacja API)

**Typy:**
- `UpdateParticipantCommand` - dane do wysłania
- `ParticipantViewModel` - dane uczestnika do edycji

**Propsy:**
```typescript
interface EditParticipantModalProps {
  participant: ParticipantViewModel;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedParticipant: ParticipantDTO) => void;
}
```

### 4.10. ExclusionsSection

**Opis komponentu:**
Sekcja zarządzania regułami wykluczeń. Wyświetla nagłówek, opis reguł (jednokierunkowe wykluczenia) oraz formularz dodawania nowych wykluczeń (przed losowaniem). Poniżej znajduje się lista istniejących wykluczeń z możliwością usuwania (przed losowaniem). Po losowaniu sekcja jest w trybie read-only. Jeśli nie ma uczestników, wyświetla komunikat "Dodaj uczestników, aby móc definiować wykluczenia".

**Główne elementy:**
- `<section>` - semantyczny kontener
- `<div>` - nagłówek sekcji
  - `<h2>` - "Reguły wykluczeń" + liczba wykluczeń
  - `<p>` - opis (np. "Para małżeńska nie losuje siebie")
- `<AddExclusionForm>` - formularz (tylko przed losowaniem)
- `<ExclusionsList>` - lista wykluczeń
- `<div>` - empty state (gdy brak uczestników lub wykluczeń)

**Obsługiwane zdarzenia:**
- `onExclusionAdded` - callback po dodaniu wykluczenia
- `onExclusionDeleted` - callback po usunięciu wykluczenia

**Warunki walidacji:**
- Formularz: widoczny gdy `canEdit && !isDrawn && participants.length >= 2`
- Akcje usuwania: dostępne gdy `canEdit && !isDrawn`

**Typy:**
- `ExclusionRuleListItemDTO[]` - lista wykluczeń
- `ExclusionViewModel[]` - rozszerzony model

**Propsy:**
```typescript
interface ExclusionsSectionProps {
  groupId: number;
  exclusions: ExclusionViewModel[];
  participants: ParticipantViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  onRefresh: () => void;
}
```

### 4.11. AddExclusionForm

**Opis komponentu:**
Inline formularz do dodawania reguł wykluczeń. Zawiera dwa selecty (dropdowny): "Kto" (blocker) i "Nie może wylosować" (blocked). Wykorzystuje React Hook Form z Zod. Waliduje, że wybrano dwie różne osoby. Po pomyślnym dodaniu, formularz jest resetowany i wyświetlany toast. Selecty są wypełnione listą uczestników (wyświetlane jako "Imię (email)" lub tylko "Imię").

**Główne elementy:**
- `<form>` - formularz React Hook Form
- `<div>` - kontener pól (flex layout, responsive)
  - `<FormField name="blocker_participant_id">` - Select "Kto"
  - `<span>` - separator "nie może wylosować"
  - `<FormField name="blocked_participant_id">` - Select "Kogo"
  - `<Button type="submit">` - "Dodaj wykluczenie"
- Helper text o jednokierunkowości reguł

**Obsługiwane zdarzenia:**
- `onSubmit` - wysłanie formularza (POST /api/groups/:groupId/exclusions)
- Walidacja real-time

**Warunki walidacji:**
- `blocker_participant_id`:
  - Wymagane
  - Musi być wybrany
- `blocked_participant_id`:
  - Wymagane
  - Musi być wybrany
  - Musi być różny od blocker_participant_id
- Duplikaty wykluczeń (walidacja API)

**Typy:**
- `CreateExclusionRuleCommand` - dane do wysłania
- `ExclusionRuleDTO` - odpowiedź z API

**Propsy:**
```typescript
interface AddExclusionFormProps {
  groupId: number;
  participants: ParticipantViewModel[];
  existingExclusions: ExclusionViewModel[];
  onSuccess: (exclusion: ExclusionRuleDTO) => void;
}
```

### 4.12. ExclusionsList

**Opis komponentu:**
Lista istniejących reguł wykluczeń. Wyświetla każdą regułę w formacie czytelnym dla człowieka: "Jan Kowalski nie może wylosować Anny Nowak". Przed losowaniem każda reguła ma przycisk usuwania (ikona X). Po losowaniu lista jest read-only. Jeśli brak wykluczeń, wyświetla komunikat "Brak zdefiniowanych wykluczeń".

**Główne elementy:**
- `<div>` - kontener listy
- `<div>[]` - karty wykluczeń
  - `<div>` - tekst wykluczenia
    - Ikona (strzałka z przekreśleniem)
    - `<span>` - "Imię1 nie może wylosować Imię2"
  - `<Button>` - przycisk usuwania (tylko przed losowaniem)
- Empty state (gdy brak wykluczeń)

**Obsługiwane zdarzenia:**
- `onDelete(exclusionId)` - usunięcie wykluczenia (DELETE /api/exclusions/:id)

**Warunki walidacji:**
- Przycisk usuwania: widoczny tylko gdy `canEdit && !isDrawn`

**Typy:**
- `ExclusionViewModel[]` - lista wykluczeń

**Propsy:**
```typescript
interface ExclusionsListProps {
  exclusions: ExclusionViewModel[];
  canEdit: boolean;
  isDrawn: boolean;
  onDelete: (exclusionId: number) => void;
}
```

### 4.13. DrawSection

**Opis komponentu:**
Sekcja uruchamiania losowania, wyświetlana tylko przed losowaniem. Zawiera informacje o statusie gotowości do losowania (liczba uczestników, liczba wykluczeń), przycisk "Rozpocznij losowanie" oraz komunikaty walidacyjne. Przycisk jest disabled, jeśli jest mniej niż 3 uczestników lub jeśli wykluczenia czynią losowanie niemożliwym. Po kliknięciu przycisku, najpierw wywoływana jest walidacja (POST /api/groups/:groupId/draw/validate), a następnie otwierany jest modal potwierdzenia.

**Główne elementy:**
- `<section>` - semantyczny kontener
- `<div>` - header
  - `<h2>` - "Losowanie"
  - `<p>` - opis procesu
- `<div>` - status card
  - Ikona statusu (check lub alert)
  - Informacje:
    - Liczba uczestników
    - Liczba wykluczeń
    - Status walidacji
- `<Button>` - "Rozpocznij losowanie" (duży, czerwony)
- Alert z ostrzeżeniem o nieodwracalności
- `<DrawConfirmationModal>` - modal potwierdzenia

**Obsługiwane zdarzenia:**
- `onDrawClick` - walidacja i otwarcie modalu
- `onDrawConfirm` - wykonanie losowania (callback z modalu)

**Warunki walidacji:**
- Przycisk disabled gdy:
  - `participantsCount < 3`
  - `!isCreator`
  - `isValidating` (ładowanie)
  - `!validationResult?.valid` (wykluczenia czynią losowanie niemożliwym)

**Typy:**
- `DrawValidationDTO` - wynik walidacji z API
- `DrawResultDTO` - wynik losowania

**Propsy:**
```typescript
interface DrawSectionProps {
  groupId: number;
  participantsCount: number;
  exclusionsCount: number;
  isCreator: boolean;
  onDrawComplete: () => void;
}
```

### 4.14. DrawConfirmationModal

**Opis komponentu:**
Modal potwierdzenia rozpoczęcia losowania. Wyświetla podsumowanie (liczba uczestników, liczba wykluczeń), ostrzeżenie o nieodwracalności operacji oraz przycisk potwierdzenia. Po kliknięciu "Potwierdź i rozpocznij losowanie" wywołuje POST /api/groups/:groupId/draw, wyświetla toast z wynikiem i zamyka modal. Następnie parent komponent odświeża dane grupy (przejście do stanu po losowaniu).

**Główne elementy:**
- `<AlertDialog>` z Shadcn/ui
- `<AlertDialogContent>`
  - `<AlertDialogHeader>`
    - `<AlertDialogTitle>` - "Potwierdź rozpoczęcie losowania"
    - `<AlertDialogDescription>` - ostrzeżenie
  - `<div>` - podsumowanie
    - Liczba uczestników
    - Liczba wykluczeń
  - `<div>` - info box o nieodwracalności
  - `<AlertDialogFooter>`
    - `<AlertDialogCancel>` - "Anuluj"
    - `<AlertDialogAction>` - "Potwierdź i rozpocznij" (czerwony)

**Obsługiwane zdarzenia:**
- `onConfirm` - wykonanie losowania (POST /api/groups/:groupId/draw)
- `onCancel` - zamknięcie modalu

**Warunki walidacji:**
- Brak walidacji - tylko potwierdzenie

**Typy:**
- `DrawValidationDTO` - dane walidacji dla wyświetlenia

**Propsy:**
```typescript
interface DrawConfirmationModalProps {
  isOpen: boolean;
  groupId: number;
  participantsCount: number;
  exclusionsCount: number;
  onClose: () => void;
  onConfirm: (result: DrawResultDTO) => void;
}
```

### 4.15. ResultsSection

**Opis komponentu:**
Sekcja wyświetlana tylko po przeprowadzeniu losowania. Zawiera informację o dacie losowania, liczbę uczestników którzy zobaczyli swój wynik oraz przycisk "Zobacz mój wynik" dla zalogowanego użytkownika (jeśli jest uczestnikiem). Sekcja może również zawierać statystyki: ile osób ma listę życzeń, ile osób otworzyło link z wynikiem. Wyświetla komunikat sukcesu i gratulacje dla twórcy grupy.

**Główne elementy:**
- `<section>` - semantyczny kontener
- `<div>` - header
  - Ikona sukcesu (check w kółku)
  - `<h2>` - "Losowanie zakończone!"
  - `<p>` - data losowania
- `<div>` - statystyki (karty)
  - Liczba uczestników
  - Liczba osób z listą życzeń
  - Liczba osób które zobaczyły wynik
- `<Button>` - "Zobacz mój wynik" (tylko dla uczestnika)
- Info box z instrukcjami dla twórcy

**Obsługiwane zdarzenia:**
- `onViewResult` - przekierowanie do /groups/:groupId/result

**Warunki walidacji:**
- Przycisk "Zobacz mój wynik": widoczny tylko gdy użytkownik jest uczestnikiem grupy

**Typy:**
- `DrawResultDTO` - informacje o losowaniu

**Propsy:**
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

Typy te są już zdefiniowane w `src/types.ts` i będą wykorzystywane bezpośrednio:

```typescript
// Z src/types.ts
GroupDetailDTO
ParticipantListItemDTO
ExclusionRuleListItemDTO
DrawValidationDTO
DrawResultDTO
CreateParticipantCommand
UpdateParticipantCommand
CreateExclusionRuleCommand
UpdateGroupCommand
```

### 5.2. ViewModele (nowe typy dla widoku)

Te typy rozszerzają DTO o dodatkowe pola obliczeniowe lub formatowanie dla frontendu:

#### GroupViewModel

```typescript
/**
 * Rozszerzony model grupy z dodatkowymi polami formatującymi dla widoku
 */
interface GroupViewModel extends GroupDetailDTO {
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
    variant: "default" | "success"; // dla Shadcn badge
  };
}
```

#### ParticipantViewModel

```typescript
/**
 * Rozszerzony model uczestnika z dodatkowymi polami dla widoku
 */
interface ParticipantViewModel extends ParticipantListItemDTO {
  // Flagi
  isCreator: boolean; // czy uczestnik jest twórcą grupy
  isCurrentUser: boolean; // czy to zalogowany użytkownik
  canDelete: boolean; // czy można usunąć (false dla twórcy)

  // Formatowane wartości
  displayEmail: string; // "j***@example.com" lub "john@example.com" lub "Brak"
  displayName: string; // "John Doe" lub "John Doe (Ty)" dla current user
  initials: string; // "JD" dla avatara

  // Status (po losowaniu)
  wishlistStatus: {
    hasWishlist: boolean;
    text: string; // "Dodana" | "Brak"
    variant: "success" | "secondary";
  };

  resultStatus?: { // tylko po losowaniu
    viewed: boolean;
    text: string; // "Zobaczył" | "Nie zobaczył"
    variant: "success" | "warning";
  };

  // Token (dostępny tylko dla twórcy grupy)
  access_token?: string; // Unikalny token dla dostępu do wyniku
  resultLink?: string; // pełny URL: /results/:token (obliczony z access_token)
}
```

#### ExclusionViewModel

```typescript
/**
 * Rozszerzony model wykluczenia z formatowaniem dla widoku
 */
interface ExclusionViewModel extends ExclusionRuleListItemDTO {
  // Formatowane wartości
  displayText: string; // "Jan Kowalski nie może wylosować Anny Nowak"
  shortDisplayText: string; // "Jan → Anna" (dla mobile)

  // Flagi
  canDelete: boolean; // czy można usunąć (false po losowaniu)
}
```

#### DrawStatusViewModel

```typescript
/**
 * Model statusu możliwości przeprowadzenia losowania
 */
interface DrawStatusViewModel {
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
```

### 5.3. Form ViewModele (dla React Hook Form)

```typescript
/**
 * ViewModel dla formularza edycji grupy
 */
interface EditGroupFormViewModel {
  name: string;
  budget: number;
  end_date: Date;
}

/**
 * ViewModel dla formularza dodawania uczestnika
 */
interface AddParticipantFormViewModel {
  name: string;
  email?: string;
}

/**
 * ViewModel dla formularza edycji uczestnika
 */
interface EditParticipantFormViewModel {
  name: string;
  email?: string;
}

/**
 * ViewModel dla formularza dodawania wykluczenia
 */
interface AddExclusionFormViewModel {
  blocker_participant_id: number;
  blocked_participant_id: number;
}
```

### 5.4. Typy pomocnicze

```typescript
/**
 * Status odpowiedzi API
 */
type ApiStatus = "idle" | "loading" | "success" | "error";

/**
 * Standardowy error z API
 */
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Typ dla akcji kopiowania
 */
interface CopyToClipboardResult {
  success: boolean;
  message: string;
}
```

## 6. Zarządzanie stanem

### 6.1. Architektura stanu

Zarządzanie stanem opiera się na **React hooks** z lokalnym stanem komponentów oraz **custom hooks** dla logiki związanej z API. Nie używamy zewnętrznych bibliotek state management (Redux, Zustand) dla uproszczenia MVP. Stan jest podzielony na:

1. **Stan globalny widoku** - w głównym komponencie GroupView
2. **Stan lokalny komponentów** - w poszczególnych komponentach (modals, forms)
3. **Custom hooks** - dla operacji API i logiki biznesowej

### 6.2. Custom hooks

#### useGroupData

```typescript
/**
 * Hook do zarządzania danymi grupy
 * Pobiera dane grupy z API, śledzi stan ładowania i błędów
 * Udostępnia funkcję odświeżania danych
 */
function useGroupData(groupId: number) {
  const [group, setGroup] = useState<GroupDetailDTO | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Pobieranie danych grupy
  const fetchGroup = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}`, {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd pobierania grupy");
      }

      const data: GroupDetailDTO = await response.json();
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

  // Aktualizacja grupy
  const updateGroup = useCallback(async (command: UpdateGroupCommand) => {
    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd aktualizacji grupy");
      }

      const updatedGroup: GroupDTO = await response.json();
      // Odśwież pełne dane grupy
      await fetchGroup();

      return { success: true, data: updatedGroup };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Nieznany błąd",
      };
    }
  }, [groupId, fetchGroup]);

  // Usunięcie grupy
  const deleteGroup = useCallback(async () => {
    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd usuwania grupy");
      }

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Nieznany błąd",
      };
    }
  }, [groupId]);

  // Pobierz dane przy montowaniu
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

#### useParticipants

```typescript
/**
 * Hook do zarządzania uczestnikami grupy
 * Obsługuje CRUD operacje na uczestnikach
 */
function useParticipants(groupId: number) {
  const [participants, setParticipants] = useState<ParticipantListItemDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Pobieranie uczestników
  const fetchParticipants = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}/participants`, {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd pobierania uczestników");
      }

      const data = await response.json();
      setParticipants(data.data);
    } catch (err) {
      setError({
        code: "FETCH_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Dodawanie uczestnika
  const addParticipant = useCallback(
    async (command: CreateParticipantCommand) => {
      try {
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/groups/${groupId}/participants`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd dodawania uczestnika");
        }

        const newParticipant: ParticipantWithTokenDTO = await response.json();
        await fetchParticipants(); // Odśwież listę

        return { success: true, data: newParticipant };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [groupId, fetchParticipants]
  );

  // Aktualizacja uczestnika
  const updateParticipant = useCallback(
    async (participantId: number, command: UpdateParticipantCommand) => {
      try {
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/participants/${participantId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd aktualizacji uczestnika");
        }

        const updated: ParticipantDTO = await response.json();
        await fetchParticipants(); // Odśwież listę

        return { success: true, data: updated };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [fetchParticipants]
  );

  // Usuwanie uczestnika
  const deleteParticipant = useCallback(
    async (participantId: number) => {
      try {
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/participants/${participantId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd usuwania uczestnika");
        }

        await fetchParticipants(); // Odśwież listę

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [fetchParticipants]
  );

  // Pobierz dane przy montowaniu
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  return {
    participants,
    loading,
    error,
    refetch: fetchParticipants,
    addParticipant,
    updateParticipant,
    deleteParticipant,
  };
}
```

#### useExclusions

```typescript
/**
 * Hook do zarządzania regułami wykluczeń
 * Obsługuje dodawanie i usuwanie wykluczeń
 */
function useExclusions(groupId: number) {
  const [exclusions, setExclusions] = useState<ExclusionRuleListItemDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Pobieranie wykluczeń
  const fetchExclusions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}/exclusions`, {
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd pobierania wykluczeń");
      }

      const data = await response.json();
      setExclusions(data.data);
    } catch (err) {
      setError({
        code: "FETCH_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  // Dodawanie wykluczenia
  const addExclusion = useCallback(
    async (command: CreateExclusionRuleCommand) => {
      try {
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/groups/${groupId}/exclusions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
          body: JSON.stringify(command),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd dodawania wykluczenia");
        }

        const newExclusion: ExclusionRuleDTO = await response.json();
        await fetchExclusions(); // Odśwież listę

        return { success: true, data: newExclusion };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [groupId, fetchExclusions]
  );

  // Usuwanie wykluczenia
  const deleteExclusion = useCallback(
    async (exclusionId: number) => {
      try {
        const session = await supabaseClient.auth.getSession();
        const response = await fetch(`/api/exclusions/${exclusionId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Błąd usuwania wykluczenia");
        }

        await fetchExclusions(); // Odśwież listę

        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Nieznany błąd",
        };
      }
    },
    [fetchExclusions]
  );

  // Pobierz dane przy montowaniu
  useEffect(() => {
    fetchExclusions();
  }, [fetchExclusions]);

  return {
    exclusions,
    loading,
    error,
    refetch: fetchExclusions,
    addExclusion,
    deleteExclusion,
  };
}
```

#### useDraw

```typescript
/**
 * Hook do zarządzania procesem losowania
 * Obsługuje walidację i wykonanie losowania
 */
function useDraw(groupId: number) {
  const [validation, setValidation] = useState<DrawValidationDTO | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Walidacja możliwości losowania
  const validateDraw = useCallback(async () => {
    setIsValidating(true);
    setError(null);

    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}/draw/validate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd walidacji losowania");
      }

      const data: DrawValidationDTO = await response.json();
      setValidation(data);

      return { success: true, data };
    } catch (err) {
      const errorObj = {
        code: "VALIDATION_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      };
      setError(errorObj);
      return { success: false, error: errorObj };
    } finally {
      setIsValidating(false);
    }
  }, [groupId]);

  // Wykonanie losowania
  const executeDraw = useCallback(async () => {
    setIsDrawing(true);
    setError(null);

    try {
      const session = await supabaseClient.auth.getSession();
      const response = await fetch(`/api/groups/${groupId}/draw`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "Błąd wykonania losowania");
      }

      const result: DrawResultDTO = await response.json();

      return { success: true, data: result };
    } catch (err) {
      const errorObj = {
        code: "DRAW_ERROR",
        message: err instanceof Error ? err.message : "Nieznany błąd",
      };
      setError(errorObj);
      return { success: false, error: errorObj };
    } finally {
      setIsDrawing(false);
    }
  }, [groupId]);

  return {
    validation,
    isValidating,
    isDrawing,
    error,
    validateDraw,
    executeDraw,
  };
}
```

### 6.3. Stan w głównym komponencie GroupView

```typescript
function GroupView({ groupId }: GroupViewProps) {
  // Custom hooks
  const { group, loading: groupLoading, error: groupError, refetch: refetchGroup, updateGroup, deleteGroup } = useGroupData(groupId);
  const { participants, loading: participantsLoading, refetch: refetchParticipants, addParticipant, updateParticipant, deleteParticipant } = useParticipants(groupId);
  const { exclusions, loading: exclusionsLoading, refetch: refetchExclusions, addExclusion, deleteExclusion } = useExclusions(groupId);
  const { validation, isValidating, isDrawing, validateDraw, executeDraw } = useDraw(groupId);

  // Stan modalów
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [isDeleteGroupModalOpen, setIsDeleteGroupModalOpen] = useState(false);
  const [isDrawConfirmationModalOpen, setIsDrawConfirmationModalOpen] = useState(false);

  // Stan edycji uczestnika
  const [selectedParticipant, setSelectedParticipant] = useState<ParticipantViewModel | null>(null);
  const [isEditParticipantModalOpen, setIsEditParticipantModalOpen] = useState(false);

  // Stan użytkownika
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Pobierz ID zalogowanego użytkownika
  useEffect(() => {
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setCurrentUserId(session?.user?.id || null);
    });
  }, []);

  // Funkcje transformacji DTO -> ViewModel
  // ...

  // Obsługa zdarzeń
  // ...

  return (
    // JSX
  );
}
```

## 7. Integracja API

### 7.1. Mapowanie endpointów do akcji

| Endpoint | Metoda | Akcja | Komponent | Request Type | Response Type |
|----------|--------|-------|-----------|--------------|---------------|
| `/api/groups/:id` | GET | Pobieranie danych grupy | GroupView (useGroupData) | - | GroupDetailDTO |
| `/api/groups/:id` | PATCH | Aktualizacja grupy | GroupEditModal | UpdateGroupCommand | GroupDTO |
| `/api/groups/:id` | DELETE | Usunięcie grupy | DeleteGroupModal | - | 204 No Content |
| `/api/groups/:groupId/participants` | POST | Dodanie uczestnika | AddParticipantForm | CreateParticipantCommand | ParticipantWithTokenDTO |
| `/api/groups/:groupId/participants` | GET | Pobieranie uczestników | ParticipantsSection (useParticipants) | - | PaginatedParticipantsDTO |
| `/api/participants/:id` | PATCH | Aktualizacja uczestnika | EditParticipantModal | UpdateParticipantCommand | ParticipantDTO |
| `/api/participants/:id` | DELETE | Usunięcie uczestnika | ParticipantsList/Card | - | 204 No Content |
| `/api/groups/:groupId/exclusions` | POST | Dodanie wykluczenia | AddExclusionForm | CreateExclusionRuleCommand | ExclusionRuleDTO |
| `/api/groups/:groupId/exclusions` | GET | Pobieranie wykluczeń | ExclusionsSection (useExclusions) | - | PaginatedExclusionRulesDTO |
| `/api/exclusions/:id` | DELETE | Usunięcie wykluczenia | ExclusionsList | - | 204 No Content |
| `/api/groups/:groupId/draw/validate` | POST | Walidacja losowania | DrawSection (useDraw) | - | DrawValidationDTO |
| `/api/groups/:groupId/draw` | POST | Wykonanie losowania | DrawConfirmationModal (useDraw) | - | DrawResultDTO |

### 7.2. Autoryzacja

Wszystkie requesty do API wymagają tokenu autoryzacji w headerze:

```typescript
const session = await supabaseClient.auth.getSession();
const headers: HeadersInit = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${session.data.session?.access_token}`,
};
```

### 7.3. Obsługa odpowiedzi API

#### Sukces (2xx)

```typescript
if (response.ok) {
  const data = await response.json();
  // Przetwórz dane, zaktualizuj stan
  toast.success("Operacja zakończona pomyślnie");
  return { success: true, data };
}
```

#### Błędy (4xx, 5xx)

```typescript
if (!response.ok) {
  const errorData = await response.json();
  const errorMessage = errorData.error?.message || "Wystąpił błąd";

  // Mapowanie błędów
  if (response.status === 401) {
    // Brak autoryzacji - przekieruj do logowania
    window.location.href = "/login";
  } else if (response.status === 403) {
    toast.error("Brak uprawnień do wykonania tej operacji");
  } else if (response.status === 404) {
    toast.error("Zasób nie został znaleziony");
  } else if (response.status === 400) {
    // Błędy walidacji lub logiki biznesowej
    toast.error(errorMessage);
  } else {
    toast.error("Wystąpił nieoczekiwany błąd");
  }

  throw new Error(errorMessage);
}
```

### 7.4. Optimistic updates

Dla lepszego UX, niektóre operacje mogą używać optimistic updates (aktualizacja UI przed potwierdzeniem z API):

```typescript
// Przykład: usunięcie uczestnika
const handleDeleteParticipant = async (participantId: number) => {
  // Optimistic update
  setParticipants((prev) => prev.filter((p) => p.id !== participantId));

  const result = await deleteParticipant(participantId);

  if (!result.success) {
    // Przywróć stan w przypadku błędu
    await refetchParticipants();
    toast.error(result.error);
  } else {
    toast.success("Uczestnik został usunięty");
  }
};
```

## 8. Interakcje użytkownika

### 8.1. Edycja grupy

**Krok po kroku:**

1. Użytkownik klika przycisk "Edytuj grupę" w GroupHeader
2. Otwiera się GroupEditModal z wypełnionymi aktualnymi danymi
3. Użytkownik modyfikuje pola (nazwa, budżet, data)
4. Walidacja działa real-time przy każdej zmianie
5. Użytkownik klika "Zapisz zmiany"
6. Modal wyświetla loader na przycisku (disabled)
7. Wywołanie PATCH /api/groups/:id
8. W przypadku sukcesu:
   - Modal się zamyka
   - Dane grupy są odświeżane (refetchGroup)
   - Toast: "Grupa została zaktualizowana"
9. W przypadku błędu:
   - Modal pozostaje otwarty
   - Wyświetlenie błędu pod formularzem
   - Toast: komunikat błędu z API

**Warunki:**
- Przycisk "Zapisz" disabled gdy formularz jest niepoprawny
- Modal można zamknąć tylko przyciskiem "Anuluj" lub "X" (nie przez kliknięcie tła podczas submit)

### 8.2. Usunięcie grupy

**Krok po kroku:**

1. Użytkownik klika przycisk "Usuń grupę" w GroupHeader
2. Otwiera się DeleteGroupModal z ostrzeżeniem
3. Modal wyświetla nazwę grupy i komunikat o nieodwracalności
4. Użytkownik klika "Usuń grupę" (czerwony przycisk)
5. Modal wyświetla loader
6. Wywołanie DELETE /api/groups/:id
7. W przypadku sukcesu:
   - Modal się zamyka
   - Przekierowanie do dashboard (/dashboard)
   - Toast: "Grupa została usunięta"
8. W przypadku błędu:
   - Modal pozostaje otwarty
   - Toast: komunikat błędu z API

**Warunki:**
- Modal można zamknąć tylko przyciskiem "Anuluj" (nie przez kliknięcie tła podczas delete)

### 8.3. Dodanie uczestnika

**Krok po kroku:**

1. Użytkownik wypełnia formularz AddParticipantForm (imię, opcjonalnie email)
2. Walidacja działa real-time
3. Użytkownik klika "Dodaj uczestnika"
4. Przycisk wyświetla loader (disabled)
5. Wywołanie POST /api/groups/:groupId/participants
6. W przypadku sukcesu:
   - Formularz jest resetowany
   - Lista uczestników jest odświeżana
   - Token dostępu jest automatycznie generowany i zapisany w bazie
   - Toast: "Uczestnik [Imię] został dodany do grupy"
   - Twórca będzie mógł skopiować link z tokenem PO losowaniu
7. W przypadku błędu (np. email już istnieje):
   - Formularz pozostaje wypełniony
   - Wyświetlenie błędu pod odpowiednim polem
   - Toast: komunikat błędu z API

**Warunki:**
- Przycisk "Dodaj" disabled gdy formularz jest niepoprawny
- Email jest opcjonalny, ale jeśli podany musi być poprawny

### 8.4. Edycja uczestnika

**Krok po kroku:**

1. Użytkownik klika przycisk "Edytuj" przy uczestniku (w tabeli lub karcie)
2. Otwiera się EditParticipantModal z wypełnionymi danymi uczestnika
3. Użytkownik modyfikuje pola (imię, email)
4. Walidacja działa real-time
5. Użytkownik klika "Zapisz zmiany"
6. Modal wyświetla loader
7. Wywołanie PATCH /api/participants/:id
8. W przypadku sukcesu:
   - Modal się zamyka
   - Lista uczestników jest odświeżana
   - Toast: "Dane uczestnika zostały zaktualizowane"
9. W przypadku błędu:
   - Modal pozostaje otwarty
   - Wyświetlenie błędu
   - Toast: komunikat błędu z API

**Warunki:**
- Przycisk "Zapisz" disabled gdy formularz jest niepoprawny

### 8.5. Usunięcie uczestnika

**Krok po kroku:**

1. Użytkownik klika przycisk "Usuń" przy uczestniku
2. Wyświetla się inline confirmation lub mały modal "Czy na pewno?"
3. Użytkownik potwierdza
4. Wywołanie DELETE /api/participants/:id
5. W przypadku sukcesu:
   - Uczestnik znika z listy (optimistic update)
   - Toast: "Uczestnik został usunięty"
6. W przypadku błędu:
   - Lista uczestników jest przywracana (refetch)
   - Toast: komunikat błędu z API

**Warunki:**
- Przycisk "Usuń" disabled (z tooltipem) dla twórcy grupy
- Nie można usunąć twórcy

### 8.6. Dodanie wykluczenia

**Krok po kroku:**

1. Użytkownik wybiera osobę A z pierwszego selecta
2. Użytkownik wybiera osobę B z drugiego selecta
3. Walidacja sprawdza, czy A ≠ B
4. Użytkownik klika "Dodaj wykluczenie"
5. Przycisk wyświetla loader
6. Wywołanie POST /api/groups/:groupId/exclusions
7. W przypadku sukcesu:
   - Formularz jest resetowany
   - Lista wykluczeń jest odświeżana
   - Toast: "Wykluczenie zostało dodane"
8. W przypadku błędu (np. duplikat):
   - Formularz pozostaje wypełniony
   - Toast: komunikat błędu z API

**Warunki:**
- Przycisk "Dodaj" disabled gdy A == B lub nie wybrano obu osób
- Minimum 2 uczestników do wyboru

### 8.7. Usunięcie wykluczenia

**Krok po kroku:**

1. Użytkownik klika przycisk "X" przy wykluczeniu
2. Wywołanie DELETE /api/exclusions/:id (bez dodatkowego potwierdzenia)
3. W przypadku sukcesu:
   - Wykluczenie znika z listy (optimistic update)
   - Toast: "Wykluczenie zostało usunięte"
4. W przypadku błędu:
   - Lista wykluczeń jest przywracana
   - Toast: komunikat błędu z API

**Warunki:**
- Brak dodatkowego potwierdzenia (szybka akcja)

### 8.8. Rozpoczęcie losowania

**Krok po kroku:**

1. Użytkownik klika przycisk "Rozpocznij losowanie" w DrawSection
2. Wywołanie POST /api/groups/:groupId/draw/validate
3. Wyświetlenie loadera na przycisku
4. W przypadku valid == true:
   - Otwiera się DrawConfirmationModal z podsumowaniem
   - Modal wyświetla liczbę uczestników i wykluczeń
   - Ostrzeżenie o nieodwracalności
5. W przypadku valid == false:
   - Modal się nie otwiera
   - Toast: komunikat z validation.message
   - Wyświetlenie błędu w DrawSection
6. Użytkownik klika "Potwierdź i rozpocznij losowanie"
7. Modal wyświetla loader
8. Wywołanie POST /api/groups/:groupId/draw
9. W przypadku sukcesu:
   - Modal się zamyka
   - Dane grupy są odświeżane (is_drawn = true)
   - Widok przechodzi do stanu po losowaniu
   - Toast: "Losowanie zakończone! Wszyscy uczestnicy mogą sprawdzić wyniki."
10. W przypadku błędu:
    - Modal pozostaje otwarty
    - Toast: komunikat błędu z API

**Warunki:**
- Przycisk disabled gdy:
  - participantsCount < 3
  - !isCreator
  - isValidating (ładowanie)
- Walidacja przed otwarciem modalu (dry run)

### 8.9. Kopiowanie linku z tokenem (po losowaniu)

**Krok po kroku:**

1. Użytkownik (twórca grupy) klika przycisk "Kopiuj link" przy uczestniku w tabeli/karcie
2. Generowanie linku z tokenem: `${window.location.origin}/results/${participant.access_token}`
3. Kopiowanie do schowka (navigator.clipboard.writeText)
4. W przypadku sukcesu:
   - Toast: "Link do wyniku skopiowany dla [Imię uczestnika]"
   - Ikona przycisku zmienia się na "check" na 2 sekundy
   - Twórca może teraz wysłać ten link uczestnikowi (np. mailem, SMS-em)
5. W przypadku błędu (brak dostępu do clipboard):
   - Toast: "Nie udało się skopiować linku"
   - Wyświetlenie linku w inline text input do ręcznego kopiowania

**Warunki:**
- Przycisk widoczny TYLKO PO losowaniu (`isDrawn === true`)
- TYLKO dla twórcy grupy (`isCreator === true`)
- Token musi istnieć w bazie (jest generowany przy dodawaniu uczestnika)
- Link prowadzi do wyniku losowania uczestnika

### 8.10. Zobacz mój wynik (po losowaniu)

**Krok po kroku:**

1. Użytkownik klika przycisk "Zobacz mój wynik" w ResultsSection
2. Przekierowanie do `/groups/:groupId/result`
3. Wyświetlenie strony z wynikiem losowania (osobny widok)

**Warunki:**
- Przycisk widoczny tylko po losowaniu
- Tylko dla uczestników grupy

## 9. Warunki i walidacja

### 9.1. Warunki wyświetlania elementów UI

#### GroupHeader

| Element | Warunek | Opis |
|---------|---------|------|
| Przycisk "Edytuj grupę" | `isCreator && canEdit && !isDrawn` | Tylko twórca przed losowaniem |
| Przycisk "Usuń grupę" | `isCreator` | Tylko twórca (zawsze) |
| Badge "Losowanie zakończone" | `isDrawn` | Po losowaniu |
| Badge "Przed losowaniem" | `!isDrawn` | Przed losowaniem |
| Data losowania | `isDrawn && group.drawn_at` | Po losowaniu |

#### ParticipantsSection

| Element | Warunek | Opis |
|---------|---------|------|
| AddParticipantForm | `canEdit && !isDrawn` | Tylko przed losowaniem |
| Akcje edycji/usuwania | `canEdit && !isDrawn && isCreator` | Tylko przed losowaniem, tylko twórca |
| Przycisk "Usuń" uczestnika | `!participant.isCreator` | Nie dla twórcy (disabled) |
| Przycisk "Kopiuj link" | `isDrawn && isCreator` | TYLKO po losowaniu, tylko twórca |
| Kolumny statusu (wishlist, result) | `isDrawn` | Po losowaniu |

#### ExclusionsSection

| Element | Warunek | Opis |
|---------|---------|------|
| AddExclusionForm | `canEdit && !isDrawn && participants.length >= 2` | Przed losowaniem, min 2 uczestników |
| Przycisk usuwania wykluczenia | `canEdit && !isDrawn` | Tylko przed losowaniem |
| Empty state "Dodaj uczestników" | `participants.length < 2` | Mniej niż 2 uczestników |

#### DrawSection

| Element | Warunek | Opis |
|---------|---------|------|
| DrawSection (cała sekcja) | `!isDrawn` | Tylko przed losowaniem |
| Przycisk "Rozpocznij losowanie" | `isCreator && !isDrawn` | Tylko twórca przed losowaniem |
| Disabled przycisk | `participantsCount < 3 \|\| isValidating \|\| !validation?.valid` | Warunki blokujące |
| Alert o min. uczestnikach | `participantsCount < 3` | Mniej niż 3 uczestników |
| Alert o niemożliwości losowania | `validation && !validation.valid` | Wykluczenia blokują losowanie |

#### ResultsSection

| Element | Warunek | Opis |
|---------|---------|------|
| ResultsSection (cała sekcja) | `isDrawn` | Tylko po losowaniu |
| Przycisk "Zobacz mój wynik" | `isParticipant` | Tylko dla uczestników |

### 9.2. Walidacja formularzy

#### GroupEditModal (EditGroupFormViewModel)

```typescript
const editGroupFormSchema = z.object({
  name: z
    .string()
    .min(3, "Nazwa grupy musi mieć co najmniej 3 znaki")
    .max(50, "Nazwa grupy nie może przekraczać 50 znaków"),
  budget: z
    .number({
      required_error: "Budżet jest wymagany",
      invalid_type_error: "Budżet musi być liczbą",
    })
    .int("Budżet musi być liczbą całkowitą")
    .positive("Budżet musi być większy od 0"),
  end_date: z
    .date({
      required_error: "Data zakończenia jest wymagana",
    })
    .refine(
      (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date > today;
      },
      { message: "Data zakończenia musi być w przyszłości" }
    ),
});
```

#### AddParticipantForm (AddParticipantFormViewModel)

```typescript
const addParticipantFormSchema = z.object({
  name: z
    .string()
    .min(2, "Imię musi mieć co najmniej 2 znaki")
    .max(50, "Imię nie może przekraczać 50 znaków"),
  email: z
    .string()
    .email("Niepoprawny format adresu email")
    .optional()
    .or(z.literal("")),
});
```

#### EditParticipantModal (EditParticipantFormViewModel)

```typescript
const editParticipantFormSchema = z.object({
  name: z
    .string()
    .min(2, "Imię musi mieć co najmniej 2 znaki")
    .max(50, "Imię nie może przekraczać 50 znaków"),
  email: z
    .string()
    .email("Niepoprawny format adresu email")
    .optional()
    .or(z.literal("")),
});
```

#### AddExclusionForm (AddExclusionFormViewModel)

```typescript
const addExclusionFormSchema = z
  .object({
    blocker_participant_id: z
      .number({
        required_error: "Wybierz osobę",
        invalid_type_error: "Wybierz osobę",
      })
      .positive("Wybierz osobę"),
    blocked_participant_id: z
      .number({
        required_error: "Wybierz osobę",
        invalid_type_error: "Wybierz osobę",
      })
      .positive("Wybierz osobę"),
  })
  .refine(
    (data) => data.blocker_participant_id !== data.blocked_participant_id,
    {
      message: "Osoba nie może wykluczyć samej siebie",
      path: ["blocked_participant_id"],
    }
  );
```

### 9.3. Walidacja API (backend)

#### Warunki weryfikowane przez API:

1. **Dodawanie uczestnika:**
   - Email unikalny w obrębie grupy
   - Losowanie nie zostało przeprowadzone
   - Użytkownik jest twórcą grupy

2. **Edycja uczestnika:**
   - Email unikalny w obrębie grupy (jeśli zmieniony)
   - Losowanie nie zostało przeprowadzone
   - Użytkownik jest twórcą grupy

3. **Usuwanie uczestnika:**
   - Uczestnik nie jest twórcą grupy
   - Losowanie nie zostało przeprowadzone
   - Użytkownik jest twórcą grupy

4. **Dodawanie wykluczenia:**
   - blocker_participant_id ≠ blocked_participant_id
   - Brak duplikatu (ta sama para już istnieje)
   - Losowanie nie zostało przeprowadzone
   - Użytkownik jest twórcą grupy

5. **Walidacja losowania:**
   - Minimum 3 uczestników
   - Wykluczenia nie czynią losowania niemożliwym (algorytm backtracking)

6. **Wykonanie losowania:**
   - Minimum 3 uczestników
   - Losowanie nie zostało wcześniej przeprowadzone
   - Użytkownik jest twórcą grupy
   - Wykluczenia pozwalają na losowanie

### 9.4. Mapowanie błędów API na komunikaty UI

```typescript
function getErrorMessage(error: ApiError): string {
  switch (error.code) {
    case "UNAUTHORIZED":
      return "Musisz być zalogowany, aby wykonać tę operację";
    case "FORBIDDEN":
      return "Nie masz uprawnień do wykonania tej operacji";
    case "NOT_FOUND":
      return "Zasób nie został znaleziony";
    case "EMAIL_EXISTS":
      return "Ten adres email jest już używany przez innego uczestnika";
    case "DRAW_ALREADY_COMPLETED":
      return "Losowanie zostało już przeprowadzone. Nie można edytować grupy.";
    case "NOT_ENOUGH_PARTICIPANTS":
      return "Grupa musi mieć co najmniej 3 uczestników do losowania";
    case "DRAW_IMPOSSIBLE":
      return "Losowanie jest niemożliwe z aktualnymi regułami wykluczeń";
    case "CANNOT_DELETE_CREATOR":
      return "Nie można usunąć twórcy grupy";
    case "DUPLICATE_EXCLUSION":
      return "Ta reguła wykluczenia już istnieje";
    default:
      return error.message || "Wystąpił nieoczekiwany błąd";
  }
}
```

## 10. Obsługa błędów

### 10.1. Błędy HTTP

#### 401 Unauthorized

**Przyczyna:** Brak tokenu autoryzacji lub token wygasł

**Obsługa:**
```typescript
if (response.status === 401) {
  // Przekieruj do logowania
  window.location.href = "/login?redirect=" + window.location.pathname;
  toast.error("Sesja wygasła. Zaloguj się ponownie.");
}
```

#### 403 Forbidden

**Przyczyna:** Użytkownik nie ma dostępu do zasobu (nie jest członkiem grupy lub nie jest twórcą)

**Obsługa:**
```typescript
if (response.status === 403) {
  toast.error("Nie masz uprawnień do wykonania tej operacji");
  // Opcjonalnie: przekieruj do dashboard
  setTimeout(() => {
    window.location.href = "/dashboard";
  }, 2000);
}
```

#### 404 Not Found

**Przyczyna:** Grupa/uczestnik/wykluczenie nie istnieje

**Obsługa:**
```typescript
if (response.status === 404) {
  toast.error("Zasób nie został znaleziony");
  // Dla grupy: przekieruj do dashboard
  if (resourceType === "group") {
    window.location.href = "/dashboard";
  }
}
```

#### 400 Bad Request

**Przyczyna:** Błędy walidacji lub logiki biznesowej

**Obsługa:**
```typescript
if (response.status === 400) {
  const errorData = await response.json();
  const message = getErrorMessage(errorData.error);
  toast.error(message);

  // Dla formularzy: wyświetl błąd pod polem
  if (errorData.error.details) {
    form.setError(fieldName, { message });
  }
}
```

#### 500 Internal Server Error

**Przyczyna:** Błąd serwera

**Obsługa:**
```typescript
if (response.status === 500) {
  toast.error("Wystąpił błąd serwera. Spróbuj ponownie później.");
  // Loguj błąd do konsoli dla debugowania
  console.error("Server error:", error);
}
```

### 10.2. Błędy sieciowe

**Przyczyna:** Brak połączenia z internetem, timeout

**Obsługa:**
```typescript
try {
  const response = await fetch(url);
  // ...
} catch (error) {
  if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
    toast.error("Brak połączenia z internetem. Sprawdź swoje połączenie.");
  } else {
    toast.error("Wystąpił błąd połączenia. Spróbuj ponownie.");
  }
}
```

### 10.3. Przypadki brzegowe

#### Brak uczestników

**Wyświetlenie:**
```typescript
{participants.length === 0 && (
  <div className="text-center py-8">
    <p className="text-gray-500">Brak uczestników w grupie</p>
    <p className="text-sm text-gray-400 mt-2">
      Dodaj pierwszego uczestnika używając formularza powyżej
    </p>
  </div>
)}
```

#### Brak wykluczeń

**Wyświetlenie:**
```typescript
{exclusions.length === 0 && (
  <div className="text-center py-6">
    <p className="text-gray-500">Brak zdefiniowanych wykluczeń</p>
    <p className="text-sm text-gray-400 mt-2">
      Wykluczenia są opcjonalne
    </p>
  </div>
)}
```

#### Ładowanie danych

**Skeleton loader:**
```typescript
{loading && (
  <div className="space-y-4">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-32 w-full" />
    <Skeleton className="h-64 w-full" />
  </div>
)}
```

#### Błąd pobierania danych

**Error state:**
```typescript
{error && (
  <div className="text-center py-12">
    <div className="text-red-500 mb-4">
      <AlertCircle className="w-12 h-12 mx-auto" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">
      Nie udało się pobrać danych grupy
    </h3>
    <p className="text-gray-600 mb-4">{error.message}</p>
    <Button onClick={refetch}>
      <RefreshCw className="mr-2 h-4 w-4" />
      Spróbuj ponownie
    </Button>
  </div>
)}
```

### 10.4. Walidacja niemożliwości losowania

**Scenariusz:** Wykluczenia czynią losowanie niemożliwym

**Obsługa:**
```typescript
const handleStartDraw = async () => {
  const result = await validateDraw();

  if (!result.success || !result.data?.valid) {
    toast.error(
      result.data?.message || "Losowanie jest niemożliwe z aktualnymi wykluczeniami",
      {
        description: result.data?.details,
        duration: 5000,
      }
    );
    return;
  }

  setIsDrawConfirmationModalOpen(true);
};
```

### 10.5. Timeout operacji

**Obsługa długotrwałych operacji (np. losowanie):**
```typescript
const executeDrawWithTimeout = async () => {
  const timeoutId = setTimeout(() => {
    toast.warning("Losowanie trwa dłużej niż oczekiwano...");
  }, 5000); // 5 sekund

  try {
    const result = await executeDraw();
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
```

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

**Utworzenie struktury katalogów i plików:**

```bash
# Strona Astro
src/pages/groups/[id].astro

# Komponenty React
src/components/group/
├── GroupView.tsx
├── GroupHeader.tsx
├── GroupEditModal.tsx
├── DeleteGroupModal.tsx
├── ParticipantsSection.tsx
├── AddParticipantForm.tsx
├── ParticipantsList.tsx
├── ParticipantCard.tsx
├── EditParticipantModal.tsx
├── ExclusionsSection.tsx
├── AddExclusionForm.tsx
├── ExclusionsList.tsx
├── DrawSection.tsx
├── DrawConfirmationModal.tsx
└── ResultsSection.tsx

# Custom hooks
src/hooks/
├── useGroupData.ts
├── useParticipants.ts
├── useExclusions.ts
└── useDraw.ts

# Typy (rozszerzenie istniejącego pliku)
src/types.ts (ViewModele)

# Utilities
src/lib/utils/
├── formatters.ts (formatowanie dat, cen, etc.)
├── validators.ts (dodatkowe walidacje)
└── clipboard.ts (kopiowanie do schowka)
```

**Czas: ~30 minut**

### Krok 2: Implementacja ViewModeli i typów

**Zadania:**
1. Dodanie nowych typów do `src/types.ts`:
   - `GroupViewModel`
   - `ParticipantViewModel`
   - `ExclusionViewModel`
   - `DrawStatusViewModel`
   - Form ViewModele
2. Implementacja funkcji pomocniczych w `src/lib/utils/formatters.ts`:
   - `formatCurrency(amount: number): string`
   - `formatDate(date: string): string`
   - `formatRelativeDate(date: string): string`
   - `getInitials(name: string): string`

**Czas: ~1 godzina**

### Krok 3: Implementacja custom hooks

**Kolejność:**
1. `useGroupData.ts` - podstawowa funkcjonalność pobierania i zarządzania grupą
2. `useParticipants.ts` - CRUD uczestników
3. `useExclusions.ts` - CRUD wykluczeń
4. `useDraw.ts` - walidacja i wykonanie losowania

**Dla każdego hooka:**
- Implementacja funkcji fetch
- Obsługa stanów: loading, error, data
- Implementacja operacji (add, update, delete)
- Obsługa błędów z API
- Refetch po operacjach

**Czas: ~3 godziny**

### Krok 4: Implementacja GroupView (główny kontener)

**Zadania:**
1. Utworzenie komponentu `GroupView.tsx`
2. Użycie wszystkich custom hooks
3. Implementacja stanu lokalnego (modals, selected participant)
4. Implementacja funkcji transformacji DTO → ViewModel
5. Szkielet layoutu (sekcje bez szczegółów)
6. Implementacja loading state (skeleton)
7. Implementacja error state

**Czas: ~2 godziny**

### Krok 5: Implementacja GroupHeader i modali edycji/usuwania

**Kolejność:**
1. `GroupHeader.tsx`:
   - Layout nagłówka
   - Wyświetlanie informacji o grupie
   - Przyciski akcji (warunkowo)
   - Badge statusu
2. `GroupEditModal.tsx`:
   - Formularz React Hook Form + Zod
   - Integracja z `updateGroup` z hooka
   - Obsługa submit i błędów
3. `DeleteGroupModal.tsx`:
   - AlertDialog z potwierdzeniem
   - Integracja z `deleteGroup` z hooka
   - Przekierowanie po usunięciu

**Czas: ~2 godziny**

### Krok 6: Implementacja sekcji uczestników (desktop)

**Kolejność:**
1. `ParticipantsSection.tsx`:
   - Layout sekcji
   - Conditional rendering (desktop/mobile)
2. `AddParticipantForm.tsx`:
   - Formularz inline React Hook Form + Zod
   - Integracja z `addParticipant` z hooka
   - Obsługa tokenu (kopiowanie do schowka)
3. `ParticipantsList.tsx`:
   - Tabela z Shadcn/ui
   - Kolumny warunkowe (przed/po losowaniu)
   - Przyciski akcji
4. `EditParticipantModal.tsx`:
   - Formularz edycji
   - Integracja z `updateParticipant` z hooka

**Czas: ~3 godziny**

### Krok 7: Implementacja sekcji uczestników (mobile)

**Zadania:**
1. `ParticipantCard.tsx`:
   - Layout karty
   - Avatar z inicjałami
   - Dropdown menu akcji
   - Obsługa zdarzeń (edit, delete, copy)
2. Media queries w `ParticipantsSection.tsx`:
   - Conditional rendering: lista (desktop) vs karty (mobile)
   - Breakpoint: 768px (md)

**Czas: ~2 godziny**

### Krok 8: Implementacja sekcji wykluczeń

**Kolejność:**
1. `ExclusionsSection.tsx`:
   - Layout sekcji
   - Conditional rendering (brak uczestników, brak wykluczeń)
2. `AddExclusionForm.tsx`:
   - Formularz z dwoma selectami
   - Walidacja A ≠ B
   - Integracja z `addExclusion` z hooka
3. `ExclusionsList.tsx`:
   - Lista wykluczeń w formacie czytelnym
   - Przyciski usuwania (warunkowo)
   - Empty state

**Czas: ~2 godziny**

### Krok 9: Implementacja sekcji losowania

**Kolejność:**
1. `DrawSection.tsx`:
   - Layout sekcji
   - Status card z informacjami
   - Przycisk "Rozpocznij losowanie" (z warunkami disabled)
   - Alert o nieodwracalności
   - Obsługa walidacji przed otwarciem modalu
2. `DrawConfirmationModal.tsx`:
   - AlertDialog z podsumowaniem
   - Integracja z `executeDraw` z hooka
   - Obsługa sukcesu (callback do parent)

**Czas: ~2 godziny**

### Krok 10: Implementacja sekcji wyników (po losowaniu)

**Zadania:**
1. `ResultsSection.tsx`:
   - Layout sekcji
   - Ikona sukcesu
   - Data losowania
   - Statystyki (karty)
   - Przycisk "Zobacz mój wynik"
   - Info box dla twórcy

**Czas: ~1 godzina**

### Krok 11: Integracja z Astro i routing

**Zadania:**
1. Utworzenie strony `src/pages/groups/[id].astro`
2. Server-side logic:
   - Pobranie groupId z params
   - Sprawdzenie autoryzacji (getSession)
   - Przekierowanie jeśli niezalogowany
3. Osadzenie komponentu `GroupView` w Astro:
   ```astro
   <GroupView client:load groupId={groupId} />
   ```
4. Layout strony (header, footer)
5. SEO (title, description)

**Czas: ~1 godzina**

### Krok 12: Testowanie, refinement i accessibility

**Zadania:**
1. **Testowanie manualne:**
   - Scenariusze wszystkich user stories (US-005 do US-009)
   - Testowanie responsywności (desktop, tablet, mobile)
   - Testowanie stanów: loading, error, empty, success
   - Testowanie walidacji formularzy
   - Testowanie przepływu losowania

2. **Accessibility:**
   - Dodanie ARIA labels do interaktywnych elementów
   - Focus management w modalach
   - Keyboard navigation
   - Screen reader testing (z NVDA/JAWS)
   - Contrast ratio (WCAG AA)

3. **Refinement:**
   - Poprawki błędów znalezionych podczas testowania
   - Optymalizacja performance (React.memo, useCallback)
   - Code review i refactoring
   - Dokumentacja komponentów (JSDoc)

4. **Edge cases:**
   - Testowanie z bardzo długimi nazwami
   - Testowanie z dużą liczbą uczestników (50+)
   - Testowanie z dużą liczbą wykluczeń
   - Testowanie timeout operacji
   - Testowanie offline mode

**Czas: ~4 godziny**

---

## Podsumowanie

Całkowity szacowany czas implementacji: **~24 godziny** (3 dni pracy)

**Priorytety:**
1. Kroki 1-5 (fundament + core UI) - **Wysoki priorytet**
2. Kroki 6-9 (główna funkcjonalność) - **Wysoki priorytet**
3. Krok 10 (wyniki) - **Średni priorytet**
4. Kroki 11-12 (integracja, testy) - **Wysoki priorytet**

**Zależności:**
- Kroki 3-4 są kluczowe - wszystko inne od nich zależy
- Kroki 6-9 mogą być robione częściowo równolegle po zakończeniu kroku 4
- Krok 11 musi być na końcu (integracja wszystkiego)
- Krok 12 jest ciągły (testowanie na bieżąco)

**Ryzyka:**
- Złożoność stanu w `GroupView` - może wymagać refactoringu
- Responsywność tabel - wymaga dokładnego testowania
- Walidacja wykluczeń - integracja z algorytmem DrawService
- Performance przy dużej liczbie uczestników - może wymagać optymalizacji
