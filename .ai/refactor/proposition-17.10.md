# Propozycja Refaktoryzacji - 17.10.2025

## Przegląd

Analiza komponentów w folderze `src/components` w celu identyfikacji plików o największej złożoności (LOC) i zaproponowania kierunków refaktoryzacji zgodnych ze stosem technologicznym projektu.

---

## 1. TOP 5 Plików o Największej Liczbie LOC

| #   | Plik                                      | LOC   | Kategoria           |
| --- | ----------------------------------------- | ----- | ------------------- |
| 1   | `src/components/group/GroupView.tsx`      | 289   | Group Management    |
| 2   | `src/components/result/ResultView.tsx`    | 259   | Result Display      |
| 3   | `src/components/result/ResultReveal.tsx`  | 235   | Result Interaction  |
| 4   | `src/components/auth/ForgotPasswordForm.tsx` | 223 | Authentication      |
| 5   | `src/components/group/GroupEditModal.tsx` | 221   | Group Management    |

**Uwaga:** Wykluczono komponenty UI z biblioteki shadcn/ui (np. `dropdown-menu.tsx` - 255 LOC, `select.tsx` - 185 LOC).

---

## 2. Szczegółowa Analiza i Propozycje Refaktoryzacji

### **1. GroupView.tsx (289 linii)**
**Lokalizacja:** `src/components/group/GroupView.tsx`

#### Analiza
Główny komponent orkiestrujący widok grupy. Już przeszedł znaczącą refaktoryzację (widoczne użycie custom hooks: `useGroupData`, `useParticipants`, `useExclusions`, `useDraw`, `useModalState`, `useGroupViewModel`). Jednak nadal zawiera dużo event handlerów (linie 69-163) i logiki koordynacyjnej renderowania 5 modali (linie 249-286).

#### Potencjalne Kierunki Refaktoryzacji

##### a) **Wzorzec: Custom Hook dla Event Handlers**
**Linie:** 69-163 (~90 linii)

**Problem:** Event handlers są rozproszone po całym komponencie, co utrudnia nawigację i testowanie.

**Rozwiązanie:**
```typescript
// hooks/useGroupViewHandlers.ts
export const useGroupViewHandlers = ({
  modals,
  refetchGroup,
  refetchParticipants,
  refetchExclusions,
  deleteParticipant,
  deleteExclusion,
  executeDraw
}) => {
  const handleGroupUpdated = useCallback(() => {
    refetchGroup();
    modals.closeModal();
  }, [refetchGroup, modals]);

  const handleParticipantDeleted = useCallback(() => {
    refetchParticipants();
  }, [refetchParticipants]);

  // ... pozostałe handlery

  return {
    handleGroupUpdated,
    handleGroupDeleted,
    handleParticipantAdded,
    handleParticipantUpdated,
    handleParticipantDeleted,
    handleExclusionAdded,
    handleExclusionDeleted,
    handleDrawComplete,
    handleEditGroupClick,
    handleDeleteGroupClick,
    handleDrawClick,
    handleEditParticipant,
    handleDeleteParticipant,
    handleConfirmDeleteParticipant,
    handleCopyParticipantToken,
    handleDeleteExclusion,
  };
};
```

**Użycie w komponencie:**
```typescript
const handlers = useGroupViewHandlers({
  modals,
  refetchGroup,
  refetchParticipants,
  refetchExclusions,
  deleteParticipant,
  deleteExclusion,
  executeDraw,
});
```

**Korzyści:**
- ✅ Redukcja głównego komponentu o ~90 linii
- ✅ Łatwiejsze testowanie jednostkowe handlerów jako osobnej logiki
- ✅ Lepsza czytelność głównego komponentu (fokus na strukturę UI)
- ✅ Zgodność z React best practices (separacja logiki)

##### b) **React 19: useOptimistic dla operacji DELETE**
**Linie:** 129-141, 156-163

**Problem:** Optimistic updates są implementowane ręcznie z ręcznym zarządzaniem rollback.

**Rozwiązanie (React 19):**
```typescript
import { useOptimistic } from "react";

const [optimisticParticipants, deleteOptimisticParticipant] = useOptimistic(
  participants,
  (state, deletedId: number) => state.filter(p => p.id !== deletedId)
);

const handleConfirmDeleteParticipant = async () => {
  if (!modals.participantToDelete) return;

  // Optimistic update
  deleteOptimisticParticipant(modals.participantToDelete.id);

  // Wywołaj API
  const result = await deleteParticipant(modals.participantToDelete.id);

  // Jeśli błąd, React automatycznie przywróci stan
  if (!result.success) {
    toast.error("Nie udało się usunąć uczestnika");
  }

  modals.closeModal();
};
```

**Korzyści:**
- ✅ Automatyczne zarządzanie rollback przez React
- ✅ Lepsza synchronizacja UI z backendem
- ✅ Mniej boilerplate code
- ✅ Lepsze wsparcie dla concurrent features React 19

##### c) **Wzorzec: Modal Registry Pattern**
**Linie:** 249-286

**Problem:** Renderowanie 5 modali bezpośrednio w JSX prowadzi do dużej ilości powtarzalnego kodu.

**Rozwiązanie:**
```typescript
// constants/modalRegistry.tsx
import { GroupEditModal } from "@/components/group/GroupEditModal";
import { DeleteGroupModal } from "@/components/group/DeleteGroupModal";
// ... pozostałe

export const MODAL_REGISTRY = {
  editGroup: GroupEditModal,
  deleteGroup: DeleteGroupModal,
  deleteParticipant: DeleteParticipantModal,
  editParticipant: EditParticipantModal,
  drawConfirmation: DrawConfirmationModal,
} as const;

// W GroupView.tsx
const modalsConfig = [
  {
    key: 'editGroup',
    Component: MODAL_REGISTRY.editGroup,
    isOpen: modals.isEditGroupModalOpen,
    props: { group: groupViewModel, onClose: modals.closeModal, onSave: handleGroupUpdated }
  },
  // ... pozostałe
];

return (
  <>
    {/* Main content */}

    {/* Modals */}
    {modalsConfig.map(({ key, Component, isOpen, props }) => (
      <Component key={key} isOpen={isOpen} {...props} />
    ))}
  </>
);
```

**Korzyści:**
- ✅ Redukcja powtórzeń w renderowaniu modali
- ✅ Łatwiejsze dodawanie nowych modali (wystarczy dodać do config)
- ✅ Lepsze typowanie TypeScript
- ✅ Centralizacja konfiguracji modali

**Priorytet:** 🟡 Średni (głównie dla poprawy maintainability)

---

### **2. ResultView.tsx (259 linii)**
**Lokalizacja:** `src/components/result/ResultView.tsx`

#### Analiza
Komponent zawiera masywny łańcuch if/else (linie 51-189, ~140 linii) do obsługi różnych stanów błędów. Każdy błąd ma podobną strukturę z `ErrorWrapper`, różniąc się tylko ikoną, tytułem, opisem i akcją.

#### Potencjalne Kierunki Refaktoryzacji

##### a) **Wzorzec: Error Component Mapping** ⭐ PRIORYTET
**Linie:** 51-189 (~140 linii)

**Problem:** Duża ilość powtarzalnego kodu dla każdego typu błędu.

**Rozwiązanie:**
```typescript
// components/result/errors/ErrorWrapper.tsx
export const ErrorWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center px-4">
    <div className="text-center max-w-md bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
      {children}
    </div>
  </div>
);

// components/result/errors/DrawNotCompletedError.tsx
export const DrawNotCompletedError = () => (
  <ErrorWrapper>
    <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
      Losowanie nie zostało przeprowadzone
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-6">
      Losowanie dla tej grupy nie zostało jeszcze przeprowadzone. Skontaktuj się z organizatorem grupy.
    </p>
    <Button onClick={() => (window.location.href = "/dashboard")}>
      <ArrowLeft className="mr-2 h-4 w-4" />
      Powrót do pulpitu
    </Button>
  </ErrorWrapper>
);

// components/result/errors/index.ts
export const ERROR_COMPONENTS = {
  DRAW_NOT_COMPLETED: DrawNotCompletedError,
  UNAUTHORIZED: UnauthorizedError,
  FORBIDDEN: ForbiddenError,
  INVALID_TOKEN: InvalidTokenError,
  GROUP_NOT_FOUND: GroupNotFoundError,
  NETWORK_ERROR: NetworkError,
} as const;

// W ResultView.tsx
import { ERROR_COMPONENTS } from "./errors";
import { GenericError } from "./errors/GenericError";

if (error) {
  const ErrorComponent = error.code && ERROR_COMPONENTS[error.code]
    ? ERROR_COMPONENTS[error.code]
    : GenericError;

  return <ErrorComponent error={error} isAuthenticated={isAuthenticated} refetch={refetch} />;
}
```

**Struktura folderów:**
```
src/components/result/errors/
├── ErrorWrapper.tsx
├── DrawNotCompletedError.tsx
├── UnauthorizedError.tsx
├── ForbiddenError.tsx
├── InvalidTokenError.tsx
├── GroupNotFoundError.tsx
├── NetworkError.tsx
├── GenericError.tsx
└── index.ts
```

**Korzyści:**
- ✅ **Eliminacja ~130 linii** z głównego komponentu
- ✅ Znacząca poprawa czytelności ResultView.tsx
- ✅ Łatwiejsze testowanie każdego błędu osobno
- ✅ Łatwe dodawanie nowych typów błędów
- ✅ Zgodność z Single Responsibility Principle
- ✅ Lepsze wykorzystanie TypeScript type checking

**Priorytet:** 🔴 **NAJWYŻSZY** (największy impact na czytelność)

##### b) **React 19: Error Boundary z fallback prop**

**Rozwiązanie:**
```typescript
// components/result/ResultErrorBoundary.tsx
import { ErrorBoundary } from "react";
import { GenericError } from "./errors/GenericError";

export const ResultErrorBoundary = ({ children }) => (
  <ErrorBoundary fallback={<GenericError />}>
    {children}
  </ErrorBoundary>
);

// W ResultView.tsx
return (
  <ResultErrorBoundary>
    <ResultContent result={result} />
  </ResultErrorBoundary>
);
```

**Korzyści:**
- ✅ Centralizacja obsługi nieoczekiwanych błędów
- ✅ Catchowanie błędów renderowania
- ✅ Czystszy kod głównego komponentu

**Priorytet:** 🟢 Niski (nice to have, ale nie konieczne)

---

### **3. ResultReveal.tsx (235 linii)**
**Lokalizacja:** `src/components/result/ResultReveal.tsx`

#### Analiza
Komponent z dużą ilością JSX dla animowanego prezentu (linie 142-205, ~60 linii). Logika animacji (linie 50-106) jest zmieszana z logiką biznesową (API call do śledzenia reveal). Dodatkowo logika konfetti jest rozproszona.

#### Potencjalne Kierunki Refaktoryzacji

##### a) **Ekstrakcja: GiftBox Component** ⭐ PRIORYTET
**Linie:** 172-205 (~60 linii JSX)

**Problem:** Prezent zajmuje ~25% całego komponentu, utrudniając nawigację i utrzymanie.

**Rozwiązanie:**
```typescript
// components/result/GiftBox.tsx
interface GiftBoxProps {
  isAnimating: boolean;
  onClick: () => void;
}

export const GiftBox = ({ isAnimating, onClick }: GiftBoxProps) => (
  <div
    className={`relative cursor-pointer transform transition-all duration-700 ease-out
      ${isAnimating ? "scale-110 rotate-12 opacity-50" : "hover:scale-110 hover:-translate-y-2"}`}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick();
      }
    }}
    tabIndex={0}
    role="button"
    aria-label="Kliknij, aby odkryć wynik losowania"
  >
    {/* Elegancki prezent */}
    <div className="relative">
      {/* Główna paczka */}
      <div className="w-36 h-28 bg-gradient-to-br from-red-400 via-red-500 to-red-600 rounded-xl shadow-2xl border-4 border-red-300 relative overflow-hidden">
        {/* Wzorek na papierze */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-2 left-2 w-3 h-3 bg-white/30 rounded-full"></div>
          <div className="absolute top-4 right-4 w-2 h-2 bg-white/20 rounded-full"></div>
          <div className="absolute bottom-3 left-6 w-2.5 h-2.5 bg-white/25 rounded-full"></div>
          <div className="absolute bottom-2 right-3 w-1.5 h-1.5 bg-white/35 rounded-full"></div>
        </div>

        {/* Wstążka pozioma */}
        <div className="absolute top-1/2 left-0 right-0 h-3 bg-gradient-to-r from-green-400 via-green-500 to-green-400 rounded-full shadow-md transform -translate-y-1/2"></div>

        {/* Wstążka pionowa */}
        <div className="absolute top-0 bottom-0 left-1/2 w-3 bg-gradient-to-b from-green-400 via-green-500 to-green-400 rounded-full shadow-md transform -translate-x-1/2"></div>

        {/* Kokarda */}
        <div className="absolute top-1/2 left-1/2 w-8 h-8 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full shadow-lg border-2 border-yellow-200 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center">
          <div className="w-3 h-3 bg-yellow-100 rounded-full shadow-inner"></div>
        </div>

        {/* Błyszczący efekt */}
        <div className="absolute top-3 right-6 w-3 h-3 bg-white/60 rounded-full blur-sm"></div>
        <div className="absolute bottom-4 left-4 w-2 h-2 bg-white/40 rounded-full blur-sm"></div>
      </div>

      {/* Cień pod prezentem */}
      <div className="absolute -bottom-2 left-1/2 w-32 h-4 bg-black/20 rounded-full blur-md transform -translate-x-1/2"></div>
    </div>

    {/* Efekt świetlny */}
    <div className="absolute -top-4 -left-4 w-40 h-40 bg-gradient-to-br from-yellow-200/20 via-yellow-100/5 to-transparent rounded-full pointer-events-none blur-lg"></div>
  </div>
);

// W ResultReveal.tsx
<GiftBox isAnimating={isAnimating} onClick={handleReveal} />
```

**Korzyści:**
- ✅ Redukcja ResultReveal.tsx o ~60 linii (25%)
- ✅ Potencjalna reużywalność prezentu w innych miejscach
- ✅ Łatwiejsze testowanie animacji prezentu osobno
- ✅ Lepsza separacja odpowiedzialności

**Priorytet:** 🔴 **WYSOKI** (duży impact na czytelność)

##### b) **Custom Hook: useRevealAnimation**
**Linie:** 46-106

**Problem:** Logika animacji zmieszana z logiką komponentu.

**Rozwiązanie:**
```typescript
// hooks/useRevealAnimation.ts
export const useRevealAnimation = ({
  participantId,
  groupId,
  accessToken,
  onReveal,
  isRevealed,
}: {
  participantId: number;
  groupId: number;
  accessToken?: string;
  onReveal: () => void;
  isRevealed: boolean;
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleReveal = useCallback(async () => {
    if (isRevealed || isAnimating) return;

    setIsAnimating(true);

    setTimeout(async () => {
      // Update UI first
      onReveal();

      // Then track in database
      try {
        const url = accessToken
          ? `/api/participants/${participantId}/reveal?token=${accessToken}`
          : `/api/participants/${participantId}/reveal`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          console.warn("Failed to track result reveal");
        }
      } catch (error) {
        console.warn("Error tracking result reveal:", error);
      }

      setIsAnimating(false);
    }, 800);
  }, [isRevealed, isAnimating, onReveal, participantId, accessToken]);

  return {
    isAnimating,
    handleReveal,
    prefersReducedMotion,
  };
};

// W ResultReveal.tsx
const { isAnimating, handleReveal, prefersReducedMotion } = useRevealAnimation({
  participantId,
  groupId,
  accessToken,
  onReveal,
  isRevealed,
});
```

**Korzyści:**
- ✅ Separacja logiki biznesowej od UI
- ✅ Łatwiejsze testowanie logiki reveal osobno
- ✅ Potencjalna reużywalność w innych miejscach
- ✅ Zgodność z React best practices

**Priorytet:** 🟡 Średni

##### c) **Custom Hook: useConfetti**
**Linie:** 47-48, 99-104, 109-120

**Problem:** Logika konfetti rozproszona po całym komponencie.

**Rozwiązanie:**
```typescript
// hooks/useConfetti.ts
export const useConfetti = () => {
  const [showConfetti, setShowConfetti] = useState(false);
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (typeof window !== "undefined") {
      const updateSize = () => {
        setWindowSize({ width: window.innerWidth, height: window.innerHeight });
      };
      updateSize();
      window.addEventListener("resize", updateSize);
      return () => window.removeEventListener("resize", updateSize);
    }
  }, []);

  const triggerConfetti = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
  }, []);

  const ConfettiComponent = showConfetti ? (
    <Suspense fallback={null}>
      <Confetti
        width={windowSize.width}
        height={windowSize.height}
        recycle={false}
        numberOfPieces={300}
        gravity={0.3}
        colors={["#dc2626", "#16a34a", "#fbbf24", "#ef4444", "#22c55e"]}
      />
    </Suspense>
  ) : null;

  return {
    showConfetti,
    triggerConfetti,
    ConfettiComponent,
  };
};

// W ResultReveal.tsx
const { triggerConfetti, ConfettiComponent } = useConfetti();

// W handleReveal
if (!prefersReducedMotion) {
  triggerConfetti();
}
```

**Korzyści:**
- ✅ Reużywalność konfetti w innych miejscach aplikacji
- ✅ Czystszy kod głównego komponentu
- ✅ Enkapsulacja logiki window resize

**Priorytet:** 🟢 Niski (nice to have)

##### d) **React 19: useTransition dla animacji**

**Rozwiązanie:**
```typescript
import { useTransition } from "react";

const [isPending, startTransition] = useTransition();

const handleReveal = () => {
  startTransition(async () => {
    await revealResult(participantId, accessToken);
    onReveal();
  });
};
```

**Korzyści:**
- ✅ Lepsze wsparcie dla concurrent features React 19
- ✅ Automatyczne zarządzanie pending state
- ✅ Unikanie race conditions

**Priorytet:** 🟢 Niski (opcjonalne, dla forward compatibility)

---

### **4. ForgotPasswordForm.tsx (223 linie)**
**Lokalizacja:** `src/components/auth/ForgotPasswordForm.tsx`

#### Analiza
Komponent z dwoma całkowicie różnymi renderami: formularz (linie 132-222, ~90 linii) i stan sukcesu (linie 78-128, ~50 linii). Dodatkowo zawiera dużo powtarzających się struktur (info boxy w liniach 93-117 i 143-166).

#### Potencjalne Kierunki Refaktoryzacji

##### a) **Ekstrakcja: Success State Component**
**Linie:** 78-128 (~50 linii)

**Problem:** Dwa różne stany UI w jednym komponencie utrudniają nawigację.

**Rozwiązanie:**
```typescript
// components/auth/ForgotPasswordSuccess.tsx
interface ForgotPasswordSuccessProps {
  email: string;
}

export const ForgotPasswordSuccess = ({ email }: ForgotPasswordSuccessProps) => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-8 shadow-lg">
    <div className="text-center">
      {/* Success Icon */}
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
        <Mail className="w-8 h-8 text-green-600" />
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Sprawdź swoją skrzynkę!</h2>
      <p className="text-sm text-gray-600 mb-6">
        Wysłaliśmy link do resetowania hasła na adres <strong>{email}</strong>.
      </p>

      {/* Info Box */}
      <InfoBox variant="warning" title="Nie otrzymałeś emaila?">
        Sprawdź folder spam. Link wygasa po 1 godzinie. Jeśli nie otrzymasz wiadomości, spróbuj ponownie.
      </InfoBox>

      {/* Back to Login */}
      <Button
        onClick={() => (window.location.href = "/login")}
        className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
      >
        Wróć do logowania
      </Button>
    </div>
  </div>
);

// W ForgotPasswordForm.tsx
if (emailSent) {
  return <ForgotPasswordSuccess email={form.getValues("email")} />;
}
```

**Korzyści:**
- ✅ Redukcja głównego komponentu o ~50 linii
- ✅ Łatwiejsze testowanie każdego stanu osobno
- ✅ Zgodność z Single Responsibility Principle
- ✅ Lepsza czytelność głównego komponentu

**Priorytet:** 🟡 Średni

##### b) **Wykorzystanie: InfoBox Component**
**Linie:** 93-117, 143-166

**Problem:** Powtarzalny kod dla info boxów, mimo że w projekcie już istnieje komponent `src/components/ui/info-box.tsx`.

**Rozwiązanie:**
```typescript
import { InfoBox } from "@/components/ui/info-box";

// Zamiast inline JSX (linie 93-117)
<InfoBox variant="warning" title="Nie otrzymałeś emaila?">
  Sprawdź folder spam. Link wygasa po 1 godzinie. Jeśli nie otrzymasz wiadomości, spróbuj ponownie.
</InfoBox>

// Zamiast inline JSX (linie 143-166)
<InfoBox variant="info" title="">
  Jesteś już zalogowany. Możesz zmienić hasło w ustawieniach konta.
</InfoBox>
```

**Korzyści:**
- ✅ DRY principle
- ✅ Konsystentny wygląd info boxów w całej aplikacji
- ✅ Redukcja kodu o ~40 linii
- ✅ Wykorzystanie istniejącego komponentu

**Priorytet:** 🟡 Średni (quick win - wykorzystanie istniejącego komponentu)

##### c) **React 19: useFormStatus**

**Rozwiązanie:**
```typescript
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold shadow-md hover:shadow-lg transition-all"
      disabled={pending}
    >
      {pending && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
      {pending ? "Wysyłanie..." : "Wyślij link resetujący"}
    </Button>
  );
}
```

**Korzyści:**
- ✅ Uproszczenie zarządzania stanem formularza
- ✅ Lepsze wsparcie dla Server Actions (React 19)
- ✅ Automatyczne śledzenie pending state

**Priorytet:** 🟢 Niski (opcjonalne, dla forward compatibility)

---

### **5. GroupEditModal.tsx (221 linii)**
**Lokalizacja:** `src/components/group/GroupEditModal.tsx`

#### Analiza
Modal z formularzem edycji grupy. Trzy pola formularza (name, budget, date) zajmują większość kodu (linie 133-206, ~70 linii). Szczególnie date picker (linie 166-206) to 40 linii powtarzalnego kodu.

#### Potencjalne Kierunki Refaktoryzacji

##### a) **Ekstrakcja: Form Fields Components**
**Linie:** 133-206 (~70 linii)

**Problem:** Pola formularza powielane w wielu miejscach (CreateGroupForm, GroupEditModal).

**Rozwiązanie:**
```typescript
// components/forms/fields/GroupFormFields.tsx
export const NameField = ({ control }: { control: Control<any> }) => (
  <FormField
    control={control}
    name="name"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Nazwa grupy</FormLabel>
        <FormControl>
          <Input placeholder="np. Rodzina Kowalskich" {...field} />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const BudgetField = ({ control }: { control: Control<any> }) => (
  <FormField
    control={control}
    name="budget"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Budżet (PLN)</FormLabel>
        <FormControl>
          <Input
            type="number"
            placeholder="100"
            {...field}
            onChange={(e) => field.onChange(Number(e.target.value))}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);

export const EndDateField = ({ control }: { control: Control<any> }) => (
  <FormField
    control={control}
    name="end_date"
    render={({ field }) => (
      <FormItem className="flex flex-col">
        <FormLabel>Data zakończenia</FormLabel>
        <DatePickerField field={field} />
        <FormMessage />
      </FormItem>
    )}
  />
);

// W GroupEditModal.tsx
import { NameField, BudgetField, EndDateField } from "@/components/forms/fields/GroupFormFields";

<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
  <NameField control={form.control} />
  <BudgetField control={form.control} />
  <EndDateField control={form.control} />

  <DialogFooter>
    {/* ... */}
  </DialogFooter>
</form>
```

**Korzyści:**
- ✅ Redukcja o ~70 linii w modalu
- ✅ Reużywalność w CreateGroupForm i innych formularzach
- ✅ Łatwiejsze testowanie pól osobno
- ✅ Zgodność z DRY principle
- ✅ Pattern już używany w projekcie (`src/components/forms/fields/FormFields.tsx`)

**Priorytet:** 🟡 Średni (głównie dla reużywalności)

##### b) **Ekstrakcja: DatePickerField Component**
**Linie:** 166-206 (~40 linii)

**Problem:** Date picker jest używany w wielu miejscach projektu z identyczną logiką.

**Rozwiązanie:**
```typescript
// components/forms/fields/DatePickerField.tsx
interface DatePickerFieldProps {
  field: ControllerRenderProps<any>;
  disablePast?: boolean;
  placeholder?: string;
}

export const DatePickerField = ({
  field,
  disablePast = true,
  placeholder = "Wybierz datę"
}: DatePickerFieldProps) => (
  <Popover>
    <PopoverTrigger asChild>
      <FormControl>
        <Button
          variant="outline"
          className={cn(
            "w-full pl-3 text-left font-normal",
            !field.value && "text-muted-foreground"
          )}
        >
          {field.value ? (
            format(field.value, "PPP", { locale: pl })
          ) : (
            <span>{placeholder}</span>
          )}
          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </FormControl>
    </PopoverTrigger>
    <PopoverContent className="w-auto p-0" align="start">
      <Calendar
        mode="single"
        selected={field.value}
        onSelect={field.onChange}
        disabled={(date) =>
          disablePast
            ? date < new Date() || date < new Date("1900-01-01")
            : date < new Date("1900-01-01")
        }
        initialFocus
      />
    </PopoverContent>
  </Popover>
);

// Użycie w EndDateField
<DatePickerField field={field} disablePast />
```

**Korzyści:**
- ✅ Reużywalność date pickera w całej aplikacji
- ✅ Spójność UX (jednolite formatowanie dat, locale)
- ✅ Redukcja kodu o ~40 linii w każdym miejscu użycia
- ✅ Łatwiejsze testowanie

**Priorytet:** 🟡 Średni (dobrze mieć dla konsystencji)

##### c) **Custom Hook: useGroupForm**
**Linie:** 79-119

**Problem:** Logika formularza zmieszana z logiką UI modalu.

**Rozwiązanie:**
```typescript
// hooks/useGroupForm.ts
export const useGroupForm = (group: GroupViewModel, onSuccess: () => void) => {
  const { updateGroup } = useGroupData(group.id);

  const form = useForm<EditGroupFormViewModel>({
    resolver: zodResolver(editGroupFormSchema),
    defaultValues: {
      name: group.name,
      budget: group.budget,
      end_date: new Date(group.end_date),
    },
  });

  // Reset form when group changes
  useEffect(() => {
    form.reset({
      name: group.name,
      budget: group.budget,
      end_date: new Date(group.end_date),
    });
  }, [group, form]);

  const onSubmit = async (values: EditGroupFormViewModel) => {
    try {
      const command: UpdateGroupCommand = {
        name: values.name,
        budget: values.budget,
        end_date: values.end_date.toISOString(),
      };

      const result = await updateGroup(command);

      if (result.success) {
        onSuccess();
      } else {
        toast.error(result.error || "Nie udało się zaktualizować grupy");
      }
    } catch (error) {
      console.error("Błąd podczas aktualizacji grupy:", error);
      toast.error("Wystąpił błąd podczas aktualizacji grupy");
    }
  };

  return { form, onSubmit };
};

// W GroupEditModal.tsx
const { form, onSubmit } = useGroupForm(group, () => {
  onSave();
  onClose();
});
```

**Korzyści:**
- ✅ Separacja logiki biznesowej od UI
- ✅ Łatwiejsze testowanie logiki formularza
- ✅ Potencjalna reużywalność w innych miejscach
- ✅ Czystszy komponent modalny (fokus na UI)

**Priorytet:** 🟢 Niski (nice to have)

---

## 3. Podsumowanie Priorytetów

### 🔴 **Najwyższy Priorytet** (największy impact na czytelność)

| #   | Plik             | Refaktoryzacja                   | Redukcja LOC | Impact       |
| --- | ---------------- | -------------------------------- | ------------ | ------------ |
| 1   | ResultView.tsx   | Error Component Mapping          | ~130 linii   | ⭐⭐⭐ Ogromny |
| 2   | ResultReveal.tsx | GiftBox Component Extraction     | ~60 linii    | ⭐⭐⭐ Duży    |

**Uzasadnienie:**
- **ResultView.tsx**: Eliminacja 130 linii powtarzalnego kodu if/else zapewni dramatyczną poprawę czytelności i maintainability
- **ResultReveal.tsx**: Wydzielenie prezentu usunie 25% kodu, znacząco poprawiając strukturę komponentu

### 🟡 **Średni Priorytet** (poprawa maintainability i reużywalności)

| #   | Plik                   | Refaktoryzacja                | Redukcja LOC | Impact      |
| --- | ---------------------- | ----------------------------- | ------------ | ----------- |
| 3   | GroupView.tsx          | useGroupViewHandlers hook     | ~90 linii    | ⭐⭐ Średni  |
| 4   | ForgotPasswordForm.tsx | Success State Component       | ~50 linii    | ⭐⭐ Średni  |
| 5   | ForgotPasswordForm.tsx | Wykorzystanie InfoBox         | ~40 linii    | ⭐ Mały     |
| 6   | GroupEditModal.tsx     | Form Fields Components        | ~70 linii    | ⭐⭐ Średni  |
| 7   | ResultReveal.tsx       | useRevealAnimation hook       | ~40 linii    | ⭐ Mały     |

**Uzasadnienie:**
- Poprawia organizację kodu i testowanie
- Zwiększa reużywalność komponentów
- Zgodność z zasadą DRY

### 🟢 **Niski Priorytet** (nice to have, opcjonalne)

| #   | Plik               | Refaktoryzacja          | Impact       |
| --- | ------------------ | ----------------------- | ------------ |
| 8   | GroupView.tsx      | Modal Registry Pattern  | ⭐ Mały      |
| 9   | ResultReveal.tsx   | useConfetti hook        | ⭐ Mały      |
| 10  | GroupEditModal.tsx | useGroupForm hook       | ⭐ Mały      |
| 11  | Wszystkie          | React 19 features       | 🔮 Przyszłość |

**Uzasadnienie:**
- Głównie dla forward compatibility
- Lepsze wykorzystanie nowych funkcji React 19
- Mniejszy natychmiastowy impact

---

## 4. Rekomendowana Kolejność Implementacji

### **Faza 1: Quick Wins (1-2 dni)**
1. ✅ **ResultView.tsx** - Error Component Mapping
   - Największy impact vs effort ratio
   - Eliminacja 130 linii

2. ✅ **ForgotPasswordForm.tsx** - Wykorzystanie InfoBox
   - Wykorzystanie istniejącego komponentu
   - Szybka implementacja (~30 min)

### **Faza 2: Major Refactorings (3-5 dni)**
3. ✅ **ResultReveal.tsx** - GiftBox Component + useRevealAnimation
   - Znacząca poprawa struktury
   - Redukcja ~100 linii łącznie

4. ✅ **GroupView.tsx** - useGroupViewHandlers
   - Poprawa testowania
   - Redukcja ~90 linii

5. ✅ **ForgotPasswordForm.tsx** - Success State Component
   - Better separation of concerns
   - Redukcja ~50 linii

### **Faza 3: Reusability (2-3 dni)**
6. ✅ **GroupEditModal.tsx** - Form Fields Components
   - Reużywalność w CreateGroupForm
   - Redukcja ~70 linii

7. ✅ **GroupEditModal.tsx** - DatePickerField Component
   - Reużywalność w całej aplikacji
   - Spójność UX

### **Faza 4: Polish & Future (opcjonalne)**
8. 🔮 **React 19 Features** - useOptimistic, useTransition, useFormStatus
   - Forward compatibility
   - Lepsze wykorzystanie nowych API

---

## 5. Zgodność z Tech Stack

Wszystkie propozycje są zgodne z wytycznymi projektu:

### ✅ **REACT_CODING_STANDARDS**
- Funkcjonalne komponenty z hooks ✓
- React.memo() dla expensive components ✓
- React.lazy() dla code-splitting (Confetti) ✓
- useCallback/useMemo dla optymalizacji ✓
- Custom hooks dla logiki biznesowej ✓

### ✅ **CODING_PRACTICES**
- Clear variable names ✓
- Defensive coding patterns ✓
- Validation for user inputs ✓
- Separacja odpowiedzialności (SRP) ✓

### ✅ **TESTING**
- Łatwiejsze testowanie jednostkowe ✓
- Izolacja logiki od UI ✓
- Testowalne komponenty ✓

---

## 6. Metryki Sukcesu

Po implementacji wszystkich refaktoryzacji:

- **Redukcja LOC**: ~680 linii (28% z TOP 5 plików)
- **Poprawa maintainability**: Separacja concerns, lepsze SRP
- **Zwiększenie reużywalności**: 8+ nowych reużywalnych komponentów/hooks
- **Poprawa testowania**: Izolacja logiki, łatwiejsze unit testy
- **Developer Experience**: Lepsza nawigacja, czytelniejszy kod

---

## 7. Ryzyka i Mitygacje

| Ryzyko                           | Prawdopodobieństwo | Impact | Mitygacja                                      |
| -------------------------------- | ------------------ | ------ | ---------------------------------------------- |
| Breaking existing functionality  | Średnie            | Wysoki | Testy E2E przed i po refaktoryzacji            |
| Zwiększenie complexity           | Niskie             | Średni | Code review, dokumentacja                      |
| Performance regression           | Bardzo niskie      | Niski  | React.memo(), performance monitoring           |
| Merge conflicts                  | Średnie            | Niski  | Krótkie PR, częste merge z main branch         |

---

## 8. Następne Kroki

1. ✅ **Review** tej propozycji z zespołem
2. ✅ **Priorytetyzacja** - zaakceptowanie kolejności implementacji
3. ✅ **Proof of Concept** - implementacja #1 (ResultView Error Mapping)
4. ✅ **Iteracja** - implementacja kolejnych refaktoryzacji
5. ✅ **Dokumentacja** - aktualizacja README/docs po zmianach

---

**Dokument przygotowany:** 2025-10-17
**Autor analizy:** Claude Code
**Wersja:** 1.0
