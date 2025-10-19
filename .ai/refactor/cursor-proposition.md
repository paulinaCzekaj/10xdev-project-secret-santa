# 📊 Analiza refaktoryzacji TOP 5 największych komponentów

## 🔍 Metodologia analizy

Przeanalizowałem wszystkie pliki w folderze `src/components/` pod kątem liczby linii kodu (LOC), identyfikując TOP 5 plików o największej złożoności. Analiza została przeprowadzona w kontekście wykorzystywanego tech stacka:

- **Frontend**: Astro 5, React 19, TypeScript 5, Tailwind 4, Shadcn/ui
- **Architektura**: Komponenty funkcyjne z hooks, separacja odpowiedzialności

## 📈 TOP 5 plików o największej złożoności

| Pozycja | Plik | Liczba linii | Lokalizacja |
|---------|------|-------------|-------------|
| 1 | GroupView.tsx | 468 linii | `src/components/group/GroupView.tsx` |
| 2 | ResetPasswordForm.tsx | 320 linii | `src/components/auth/ResetPasswordForm.tsx` |
| 3 | RegisterForm.tsx | 312 linii | `src/components/auth/RegisterForm.tsx` |
| 4 | ResultView.tsx | 259 linii | `src/components/result/ResultView.tsx` |
| 5 | ResultReveal.tsx | 235 linii | `src/components/result/ResultReveal.tsx` |

---

## 🔧 Szczegółowe propozycje refaktoryzacji

### 1. **GroupView.tsx** (468 linii) - Główny kontener widoku grupy

**Potencjalne problemy złożoności:**
- **Wielozadaniowość**: Komponent zarządza 5+ różnymi hookami, wieloma modalami, złożoną logiką transformacji danych
- **Duże funkcje transformacji**: `transformGroupToViewModel` (30+ linii) i `transformParticipantsToViewModels` (30+ linii)
- **Złożona obsługa zdarzeń**: Ponad 15 funkcji obsługi zdarzeń w jednym komponencie
- **Wielokrotne warunki renderowania**: Loading, error, success states w jednej funkcji

**Sugerowane refaktoryzacje:**

#### 🔄 Custom Hook: `useGroupViewLogic`
```typescript
// src/hooks/useGroupViewLogic.ts
export function useGroupViewLogic(groupId: number) {
  // Wszystkie hooki (useGroupData, useParticipants, useExclusions, useDraw)
  // Wszystkie funkcje transformacji
  // Wszystkie handlery zdarzeń
  // Zwraca czysty interfejs dla komponentu

  return {
    // Dane
    groupViewModel,
    participantViewModels,
    exclusionViewModels,

    // Stany
    isLoading,
    isCreator,
    canEdit,
    isDrawn,

    // Akcje
    handleEditGroup,
    handleDeleteGroup,
    handleParticipantActions,
    handleExclusionActions,
    handleDrawActions
  };
}
```

#### 🔄 Komponenty potomne dla stanów:
```typescript
// GroupViewLoading.tsx, GroupViewError.tsx, GroupViewContent.tsx
function GroupViewContent({ groupViewModel, ...props }) {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <GroupHeader {...headerProps} />
      <ParticipantsSection {...participantsProps} />
      {/* inne sekcje */}
    </div>
  );
}
```

#### 🔄 Memoizacja złożonych transformacji:
```typescript
const transformGroupToViewModel = useMemo(
  () => createGroupTransformer(currentUserId),
  [currentUserId]
);
```

**💡 Korzyści:** Redukcja komponentu z 468 do ~100 linii, lepsza testowalność, separacja odpowiedzialności.

---

### 2. **ResetPasswordForm.tsx** (320 linii) - Formularz resetowania hasła

**Potencjalne problemy złożoności:**
- **Złożona logika tokenów**: Wielokrotne warunki sprawdzania tokenów z URL hash
- **Duplikacja UI**: Podobne pola hasła z toggle'ami widoczności
- **Wielokrotne stany ładowania**: Token verification + form submission
- **Zagnieżdżone warunki renderowania**: Loading → Error → Success flow

**Sugerowane refaktoryzacje:**

#### 🔄 Custom Hook: `usePasswordReset`
```typescript
// src/hooks/usePasswordReset.ts
export function usePasswordReset(accessToken?: string) {
  const [tokenState, setTokenState] = useState<TokenState>("verifying");

  const verifyToken = useCallback(async () => {
    // Cała logika weryfikacji tokenów
    // Obsługa URL hash, Supabase session, error handling
  }, [accessToken]);

  return { tokenState, tokenError, submitPasswordReset };
}
```

#### 🔄 Reużywalny komponent pola hasła:
```typescript
// PasswordField.tsx
interface PasswordFieldProps {
  label: string;
  placeholder: string;
  showRequirements?: boolean;
  requirements?: PasswordRequirement[];
}

export function PasswordField({
  label,
  showRequirements = false,
  requirements = []
}: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField name="password">
      {/* Implementacja z toggle'em i opcjonalnymi wymaganiami */}
    </FormField>
  );
}
```

#### 🔄 Stan maszyny dla flow:
```typescript
type ResetFlowState = "verifying_token" | "token_error" | "ready" | "submitting" | "success";

const [flowState, setFlowState] = useState<ResetFlowState>("verifying_token");
```

#### 🔄 Komponenty dla stanów flow:
```typescript
function ResetPasswordFlow({ flowState, tokenError, onSubmit }) {
  switch (flowState) {
    case "verifying_token": return <TokenVerificationLoader />;
    case "token_error": return <TokenErrorMessage error={tokenError} />;
    case "ready": return <PasswordResetForm onSubmit={onSubmit} />;
    // ...
  }
}
```

**💡 Korzyści:** Redukcja z 320 do ~150 linii, reużywalne komponenty, lepsza obsługa stanów.

---

### 3. **RegisterForm.tsx** (312 linii) - Formularz rejestracji

**Potencjalne problemy złożoności:**
- **Duplikacja pól hasła**: Identyczna logika dla password i confirmPassword
- **Złożone wymagania hasła**: Wielokrotne warunki sprawdzania regex w JSX
- **Wielokrotne walidacje**: Zod schema + real-time validation w UI
- **Duży JSX z warunkami**: Password requirements z dynamicznymi stylami

**Sugerowane refaktoryzacje:**

#### 🔄 Custom Hook: `usePasswordValidation`
```typescript
// src/hooks/usePasswordValidation.ts
export function usePasswordValidation(password: string) {
  const requirements = useMemo(() => [
    { key: "length", label: "8+ znaków", regex: /.{8,}/ },
    { key: "lowercase", label: "mała litera", regex: /[a-z]/ },
    { key: "uppercase", label: "duża litera", regex: /[A-Z]/ },
    { key: "number", label: "cyfra", regex: /\d/ },
  ], []);

  const validationResults = useMemo(() =>
    requirements.map(req => ({
      ...req,
      isValid: req.regex.test(password),
    })),
    [password, requirements]
  );

  return { requirements: validationResults, isValid: validationResults.every(r => r.isValid) };
}
```

#### 🔄 Komponent wymagań hasła:
```typescript
// PasswordRequirements.tsx
export function PasswordRequirements({ password }: { password: string }) {
  const { requirements } = usePasswordValidation(password);

  return (
    <ul className="space-y-1">
      {requirements.map(({ key, label, isValid }) => (
        <li key={key} className={`flex items-center gap-2 ${isValid ? "text-green-600" : "text-gray-500"}`}>
          <span className={`text-xs ${isValid ? "text-green-600" : "text-gray-400"}`}>
            {isValid ? "✓" : "○"}
          </span>
          {label}
        </li>
      ))}
    </ul>
  );
}
```

#### 🔄 Reużywalny komponent pól formularza:
```typescript
// FormFieldComponents.tsx
export function PasswordInput({ name, label, placeholder }: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <FormField control={form.control} name={name}>
      <FormControl>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            placeholder={placeholder}
            {...field}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </button>
        </div>
      </FormControl>
    </FormField>
  );
}
```

#### 🔄 Separacja logiki biznesowej:
```typescript
// useRegistration.ts
export function useRegistration() {
  const form = useForm<RegisterFormData>({ /* config */ });

  const onSubmit = async (data: RegisterFormData) => {
    // Logika rejestracji
  };

  return { form, onSubmit, isSubmitting, apiError };
}
```

**💡 Korzyści:** Redukcja z 312 do ~180 linii, reużywalne komponenty, lepsza separacja logiki.

---

### 4. **ResultView.tsx** (259 linii) - Widok wyników

**Potencjalne problemy złożoności:**
- **Wielokrotne komponenty błędów**: 6 różnych stanów błędów z podobnym JSX
- **Złożona logika dostępu**: Wielokrotne warunki dla authenticated/unauthenticated
- **Duplikacja wrapperów błędów**: Powtarzający się `ErrorWrapper` pattern
- **Zagnieżdżone warunki renderowania**: Success path na samym końcu

**Sugerowane refaktoryzacje:**

#### 🔄 Komponenty stanów błędów:
```typescript
// ResultErrorStates.tsx
export function DrawNotCompletedError() {
  return (
    <ErrorWrapper>
      <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto" />
      <h3>Losowanie nie zostało przeprowadzone</h3>
      <p>Skontaktuj się z organizatorem grupy.</p>
      <Button onClick={() => window.location.href = "/dashboard"}>
        Powrót do pulpitu
      </Button>
    </ErrorWrapper>
  );
}

// Podobnie dla innych błędów: UnauthorizedError, ForbiddenError, InvalidTokenError, etc.
```

#### 🔄 Custom Hook: `useResultViewState`
```typescript
// src/hooks/useResultViewState.ts
export function useResultViewState(groupId?: number, token?: string, isAuthenticated?: boolean) {
  const { result, isLoading, error } = useResultData(groupId, token, isAuthenticated);

  const viewState = useMemo(() => {
    if (isLoading) return "loading";
    if (error) return `error_${error.code}`;
    if (!result) return "no_data";
    return "success";
  }, [isLoading, error, result]);

  return { viewState, result, error };
}
```

#### 🔄 Główny komponent z pattern matching:
```typescript
// ResultViewRenderer.tsx
export function ResultViewRenderer({ viewState, result, error }) {
  switch (viewState) {
    case "loading": return <ResultLoading />;
    case "error_DRAW_NOT_COMPLETED": return <DrawNotCompletedError />;
    case "error_UNAUTHORIZED": return <UnauthorizedError />;
    case "error_FORBIDDEN": return <ForbiddenError />;
    case "error_INVALID_TOKEN": return <InvalidTokenError />;
    case "error_GROUP_NOT_FOUND": return <GroupNotFoundError />;
    case "error_NETWORK_ERROR": return <NetworkError />;
    case "error_generic": return <GenericError error={error} />;
    case "no_data": return <NoDataError />;
    case "success": return <ResultSuccess result={result} />;
    default: return <GenericError />;
  }
}
```

#### 🔄 Lazy loading dla ciężkich komponentów:
```typescript
const ResultSuccess = lazy(() => import("./ResultSuccess"));
const ResultReveal = lazy(() => import("./ResultReveal"));

// W komponencie głównym:
<Suspense fallback={<ResultLoading />}>
  <ResultSuccess result={result} />
</Suspense>
```

**💡 Korzyści:** Redukcja z 259 do ~100 linii, łatwiejsze testowanie stanów błędów, lepsze UX z lazy loading.

---

### 5. **ResultReveal.tsx** (235 linii) - Komponent odkrywania wyników

**Potencjalne problemy złożoności:**
- **Złożona animacja prezentu**: Dużo JSX dla wizualnych efektów
- **Wielokrotne warunki renderowania**: Revealed vs not revealed states
- **Złożona logika konfetti**: Sprawdzanie preferencji użytkownika, lazy loading
- **Duży JSX dla animacji**: Szczegółowe style inline dla prezentu

**Sugerowane refaktoryzacje:**

#### 🔄 Separacja komponentów wizualnych:
```typescript
// GiftBox.tsx - Komponent prezentu
export function GiftBox({ onClick, isAnimating }: GiftBoxProps) {
  return (
    <div className={`cursor-pointer transform transition-all duration-700 ${isAnimating ? "scale-110 rotate-12" : "hover:scale-110"}`}>
      <div className="relative">
        {/* Główna paczka */}
        <div className="w-36 h-28 bg-gradient-to-br from-red-400 to-red-600 rounded-xl shadow-2xl">
          {/* Wzorek na papierze */}
          {/* Wstążki */}
          {/* Kokarda */}
        </div>
        {/* Cień */}
      </div>
    </div>
  );
}

// RevealButton.tsx - Przycisk odkrycia
export function RevealButton({ onClick, isAnimating }: RevealButtonProps) {
  if (isAnimating) {
    return (
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-red-600 font-semibold">Odkrywanie...</p>
      </div>
    );
  }

  return (
    <Button onClick={onClick} size="lg" className="bg-gradient-to-r from-red-500 to-red-700">
      <Sparkles className="w-6 h-6 mr-3 animate-pulse" />
      Kliknij, aby odkryć!
    </Button>
  );
}
```

#### 🔄 Custom Hook: `useGiftReveal`
```typescript
// src/hooks/useGiftReveal.ts
export function useGiftReveal({
  isRevealed,
  participantId,
  accessToken,
  onReveal
}: GiftRevealProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const handleReveal = useCallback(async () => {
    if (isRevealed || isAnimating) return;

    setIsAnimating(true);

    // Logika odkrycia z timeout'em
    setTimeout(async () => {
      onReveal();

      // API call do zapisania w bazie
      try {
        const response = await fetch(`/api/participants/${participantId}/reveal`, {
          method: "POST",
          headers: accessToken ? { "Authorization": `Bearer ${accessToken}` } : {},
        });
        // obsługa odpowiedzi
      } catch (error) {
        console.warn("Failed to track reveal:", error);
      }

      setIsAnimating(false);
    }, 800);
  }, [isRevealed, isAnimating, participantId, accessToken, onReveal]);

  return { handleReveal, isAnimating, prefersReducedMotion };
}
```

#### 🔄 Lazy loading konfetti:
```typescript
// useConfetti.ts
export function useConfetti(isActive: boolean, prefersReducedMotion: boolean) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isActive && !prefersReducedMotion) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, prefersReducedMotion]);

  const ConfettiComponent = showConfetti ? (
    <Suspense fallback={null}>
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={300}
        gravity={0.3}
      />
    </Suspense>
  ) : null;

  return ConfettiComponent;
}
```

#### 🔄 Separacja stanów renderowania:
```typescript
function RevealedState({ assignedPerson }: { assignedPerson: Person }) {
  return (
    <div className="text-center py-8 px-6">
      <h2>🎅 Twój los padł na... 🎅</h2>
      <AssignedPersonCard person={assignedPerson} />
    </div>
  );
}

function UnrevealedState({ onReveal, isAnimating }: UnrevealedStateProps) {
  return (
    <div className="text-center py-12 px-6">
      <h2>🎄 Odkryj wynik losowania! 🎄</h2>
      <div className="flex flex-col items-center space-y-8">
        <GiftBox onClick={onReveal} isAnimating={isAnimating} />
        <RevealButton onClick={onReveal} isAnimating={isAnimating} />
      </div>
    </div>
  );
}
```

**💡 Korzyści:** Redukcja z 235 do ~120 linii, lepsze komponenty wizualne, łatwiejsze testowanie animacji.

---

## 📊 **Podsumowanie rekomendacji refaktoryzacji**

| Plik | Aktualnie | Po refaktoryzacji | Główna strategia |
|------|-----------|-------------------|------------------|
| GroupView.tsx | 468 linii | ~100 linii | Custom hooks + komponenty potomne |
| ResetPasswordForm.tsx | 320 linii | ~150 linii | Stan maszyny + reużywalne komponenty |
| RegisterForm.tsx | 312 linii | ~180 linii | Hooks walidacji + komponenty pól |
| ResultView.tsx | 259 linii | ~100 linii | Komponenty stanów + lazy loading |
| ResultReveal.tsx | 235 linii | ~120 linii | Separacja wizualna + hooks animacji |

## 🔑 Kluczowe wzorce refaktoryzacji

1. **Custom Hooks** dla logiki biznesowej
2. **Komponenty potomne** dla różnych stanów UI
3. **Reużywalne komponenty** dla wspólnych elementów
4. **Lazy loading** dla ciężkich komponentów
5. **Stan maszyny** dla złożonych flow
6. **Memoizacja** dla kosztownych obliczeń

## 🎯 Korzyści biznesowe

- **Lepsze DX**: Łatwiejsze utrzymanie i debugowanie
- **Lepsze testowanie**: Mniejsze komponenty, izolowane logiki
- **Lepsze UX**: Lazy loading, lepsze ładowanie
- **Lepsza wydajność**: Memoizacja, code splitting
- **Łatwiejsza skalowalność**: Modularna architektura

## 🏗️ Zgodność z tech stackiem

Refaktoryzacje te są zgodne z **tech stackiem Astro + React + TypeScript**, wykorzystując nowoczesne wzorce React (hooks, lazy loading, memo) oraz najlepsze praktyki komponentowe zgodnie z wytycznymi w `src/components/`.
