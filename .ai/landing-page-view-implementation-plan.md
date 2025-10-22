# Plan implementacji widoku Landing Page (Strona Startowa)

## 1. Przegląd

Landing Page to strona powitalna aplikacji Secret Santa, widoczna dla niezalogowanych użytkowników pod ścieżką `/`. Jej głównym celem jest przedstawienie możliwości aplikacji, wzbudzenie zainteresowania i zachęcenie do rejestracji lub logowania. Strona ma charakter świąteczny, jest prosta, intuicyjna i w pełni responsywna (RWD). Zalogowani użytkownicy są automatycznie przekierowywani do `/dashboard`.

Widok składa się z trzech głównych sekcji:
- **Hero Section** - główna sekcja powitalna z nagłówkiem, opisem i przyciskami CTA
- **Features Section** - prezentacja kluczowych funkcjonalności aplikacji (minimum 3-4 funkcje)
- **CTA Section** - końcowa sekcja z wezwaniem do działania

## 2. Routing widoku

**Ścieżka:** `/` (root)

**Plik:** `src/pages/index.astro`

**Logika routingu:**
- Plik `index.astro` już istnieje i zawiera logikę sprawdzania sesji użytkownika
- Jeśli użytkownik jest zalogowany (`Astro.locals.user` istnieje), następuje przekierowanie do `/dashboard`
- Jeśli użytkownik nie jest zalogowany, renderowany jest komponent `Welcome.astro` z landing page
- SSR jest włączony (`export const prerender = false`)

**Uwaga:** Plik `index.astro` nie wymaga modyfikacji - działa poprawnie.

## 3. Struktura komponentów

```
index.astro (SSR, sprawdzenie sesji, przekierowanie)
└── Layout.astro (nawigacja z przyciskami Login/Register - już istnieje)
    └── Welcome.astro (główny komponent landing page - DO MODYFIKACJI)
        ├── HeroSection (sekcja)
        │   ├── Heading (nagłówek H1)
        │   ├── Subheading (podtytuł)
        │   ├── Description (opis)
        │   └── CTAButtons (grupa przycisków)
        │       ├── Button → /register (główny CTA)
        │       └── Button → /login (drugorzędny CTA)
        ├── FeaturesSection (sekcja)
        │   ├── SectionHeading (nagłówek H2)
        │   └── FeaturesGrid (siatka kart)
        │       └── FeatureCard[] (4 karty funkcjonalności)
        │           ├── Icon (ikona z Lucide React)
        │           ├── Title (tytuł funkcji)
        │           └── Description (opis funkcji)
        └── CTASection (sekcja)
            ├── FinalMessage (końcowy komunikat)
            └── CTAButton → /register (główny przycisk)
```

## 4. Szczegóły komponentów

### 4.1. Welcome.astro (główny komponent)

**Opis:** Główny kontener landing page. Składa się z trzech sekcjiułożonych wertykalnie w responsywnym layoutcie. Używa gradientowego tła w świątecznych kolorach (czerwień, zieleń, złoto).

**Główne elementy:**
- Element główny: `<div>` z klasami Tailwind dla tła gradientowego i paddingu
- Trzy sekcje: Hero, Features, CTA
- Każda sekcja jest oddzielonym blokiem `<section>` z odpowiednimi klasami

**Obsługiwane zdarzenia:** Brak (strona statyczna w Astro)

**Warunki walidacji:** Brak (nie ma formularzy)

**Typy:** `Feature` (lokalny interface dla danych funkcjonalności)

**Propsy:** Brak (komponent główny)

**Szczegóły implementacji:**
```astro
---
// Definicja lokalnego typu dla funkcjonalności
interface Feature {
  icon: string; // Nazwa ikony z Lucide (np. "Gift", "Users", "Lock")
  title: string;
  description: string;
}

// Lista funkcjonalności (hardcoded)
const features: Feature[] = [
  {
    icon: "Gift",
    title: "Losowanie anonimowe",
    description: "Algorytm gwarantuje pełną anonimowość - nikt nie pozna wszystkich par."
  },
  // ... pozostałe funkcjonalności
];
---

<div class="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50">
  <!-- Hero Section -->
  <!-- Features Section -->
  <!-- CTA Section -->
</div>
```

### 4.2. HeroSection

**Opis:** Sekcja powitalna z głównym przekazem aplikacji. Zawiera nagłówek, podtytuł, krótki opis i dwa przyciski CTA. Wyśrodkowana wertykalnie i horyzontalnie.

**Główne elementy:**
- `<section>` - kontener sekcji z paddingiem
- `<div class="text-center">` - wyśrodkowanie treści
- `<h1>` - główny nagłówek (np. "Zorganizuj Secret Santa w 5 minut")
- `<p class="text-xl">` - podtytuł/opis
- `<div class="flex gap-4">` - kontener przycisków CTA
  - `<a href="/register">` - główny przycisk (emerald/green)
  - `<a href="/login">` - drugorzędny przycisk (outline)

**Obsługiwane zdarzenia:** Kliknięcia w linki (natywna nawigacja)

**Warunki walidacji:** Brak

**Typy:** Brak

**Propsy:** Brak (część Welcome.astro)

**Szczegóły stylowania:**
- Nagłówek: `text-5xl md:text-6xl font-bold` z gradientem tekstu
- Opis: `text-lg md:text-xl text-gray-700`
- Przycisk główny: `bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-lg`
- Przycisk drugorzędny: `border-2 border-gray-300 hover:border-gray-400 px-8 py-4 rounded-lg`
- Responsywność: mniejsze fonty i padding na mobile

### 4.3. FeaturesSection

**Opis:** Sekcja prezentująca kluczowe funkcjonalności aplikacji w formie siatki kart. Każda karta przedstawia jedną funkcję z ikoną, tytułem i opisem.

**Główne elementy:**
- `<section>` - kontener sekcji
- `<h2>` - nagłówek sekcji (np. "Dlaczego Secret Santa?")
- `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">` - responsywna siatka kart
- Dla każdej funkcjonalności z listy `features`:
  - `<div class="card">` - karta funkcjonalności
    - Ikona (dynamicznie importowana z Lucide React)
    - `<h3>` - tytuł funkcjonalności
    - `<p>` - opis funkcjonalności

**Obsługiwane zdarzenia:** Brak

**Warunki walidacji:** Brak

**Typy:** `Feature[]` (lista funkcjonalności)

**Propsy:** Brak (część Welcome.astro)

**Szczegóły implementacji:**

Ponieważ Astro nie pozwala na dynamiczny import komponentów React w pętli w prosty sposób, ikony można zaimplementować na dwa sposoby:

**Opcja A (prostsza):** Użycie emoji lub SVG jako ikon
```astro
const features = [
  { icon: "🎁", title: "...", description: "..." },
  { icon: "👥", title: "...", description: "..." },
  // ...
];
```

**Opcja B (lepsza):** Stworzenie pomocniczego komponentu React `FeatureCard.tsx`, który przyjmuje nazwę ikony jako prop i renderuje odpowiednią ikonę z Lucide

**Zalecana implementacja:** Opcja B z komponentem React

### 4.4. FeatureCard.tsx (komponent React - do utworzenia)

**Opis:** Komponent React prezentujący pojedynczą funkcjonalność aplikacji. Przyjmuje nazwę ikony, tytuł i opis jako props. Renderuje kartę z ikoną Lucide, tytułem i opisem.

**Główne elementy:**
- `<div>` - kontener karty z Tailwind classes
- Dynamicznie renderowana ikona z Lucide React
- `<h3>` - tytuł funkcjonalności
- `<p>` - opis funkcjonalności

**Obsługiwane zdarzenia:** Brak (statyczna karta)

**Warunki walidacji:** Brak

**Typy:** `FeatureCardProps`

**Propsy:**
```typescript
interface FeatureCardProps {
  iconName: string; // Nazwa ikony z Lucide (np. "Gift", "Users", "Lock", "Sparkles")
  title: string;
  description: string;
}
```

**Szczegóły implementacji:**
```tsx
import * as Icons from "lucide-react";

interface FeatureCardProps {
  iconName: string;
  title: string;
  description: string;
}

export function FeatureCard({ iconName, title, description }: FeatureCardProps) {
  // Dynamiczny import ikony
  const Icon = Icons[iconName as keyof typeof Icons] as Icons.LucideIcon;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="mb-4">
        {Icon && <Icon className="w-10 h-10 text-emerald-500" />}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}
```

**Użycie w Welcome.astro:**
```astro
---
import { FeatureCard } from "@/components/landing/FeatureCard";

const features = [
  { iconName: "Gift", title: "Losowanie anonimowe", description: "..." },
  { iconName: "Users", title: "Zarządzanie grupą", description: "..." },
  { iconName: "Lock", title: "Pełna poufność", description: "..." },
  { iconName: "Sparkles", title: "Listy życzeń", description: "..." },
];
---

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
  {features.map(feature => (
    <FeatureCard
      iconName={feature.iconName}
      title={feature.title}
      description={feature.description}
      client:load
    />
  ))}
</div>
```

### 4.5. CTASection

**Opis:** Końcowa sekcja z wezwaniem do działania. Zawiera motywujący komunikat i główny przycisk CTA do rejestracji. Sekcja ma wyróżniające się tło (gradient lub kolor) oddzielające ją od reszty strony.

**Główne elementy:**
- `<section>` - kontener sekcji z wyróżniającym się tłem (np. gradient emerald)
- `<div class="text-center">` - wyśrodkowanie treści
- `<h2>` - końcowy nagłówek (np. "Gotowy na zorganizowanie Secret Santa?")
- `<p>` - krótki tekst motywujący
- `<a href="/register">` - duży przycisk CTA

**Obsługiwane zdarzenia:** Kliknięcie w link (natywna nawigacja)

**Warunki walidacji:** Brak

**Typy:** Brak

**Propsy:** Brak (część Welcome.astro)

**Szczegóły stylowania:**
- Tło: `bg-gradient-to-r from-emerald-500 to-green-600` lub `bg-emerald-500`
- Tekst: biały (`text-white`)
- Przycisk: `bg-white text-emerald-600 hover:bg-gray-100 px-10 py-5 text-lg rounded-lg font-semibold`
- Padding sekcji: `py-16 md:py-24` dla przestrzeni oddechowej

## 5. Typy

### 5.1. Feature (lokalny typ w Welcome.astro)

**Opis:** Interface opisujący pojedynczą funkcjonalność aplikacji prezentowaną na landing page.

**Pola:**
```typescript
interface Feature {
  iconName: string;    // Nazwa ikony z Lucide React (np. "Gift", "Users", "Lock", "Sparkles")
  title: string;       // Tytuł funkcjonalności (np. "Losowanie anonimowe")
  description: string; // Opis funkcjonalności (1-2 zdania)
}
```

### 5.2. FeatureCardProps (props komponentu React)

**Opis:** Interface dla propsów komponentu `FeatureCard.tsx`.

**Pola:**
```typescript
interface FeatureCardProps {
  iconName: string;    // Nazwa ikony z Lucide React
  title: string;       // Tytuł funkcjonalności
  description: string; // Opis funkcjonalności
}
```

## 6. Zarządzanie stanem

**Brak zarządzania stanem** - landing page jest w pełni statyczna.

- Komponent `Welcome.astro` renderuje statyczny HTML
- Brak interaktywnych elementów wymagających stanu (poza nawigacją, która jest natywna)
- Brak custom hooków
- Brak zmiennych stanu React

**Jedyna logika:** Sprawdzenie sesji użytkownika w `index.astro` (server-side) - już zaimplementowane.

## 7. Integracja API

**Brak bezpośredniej integracji z API** w komponencie Landing Page.

**Jedyne wywołanie związane z API:**
- **Sprawdzenie sesji użytkownika** (server-side w `index.astro`)
  - Metoda: `Astro.locals.user` (middleware Supabase w Astro)
  - Typ odpowiedzi: `User | null`
  - Akcja: Jeśli użytkownik istnieje → przekierowanie do `/dashboard`

**Nie ma żadnych wywołań API** z poziomu komponentu `Welcome.astro` - jest to czysto prezentacyjny widok.

## 8. Interakcje użytkownika

### 8.1. Odwiedzenie strony startowej (`/`)

**Scenariusz A: Użytkownik niezalogowany**
- Akcja: Wyświetlenie landing page (`Welcome.astro`)
- Rezultat: Użytkownik widzi sekcje Hero, Features i CTA z przyciskami do logowania/rejestracji

**Scenariusz B: Użytkownik zalogowany**
- Akcja: Automatyczne przekierowanie do `/dashboard`
- Rezultat: Użytkownik nigdy nie widzi landing page

### 8.2. Kliknięcie przycisku "Zarejestruj się" (Hero Section)

- Akcja: Kliknięcie linku `<a href="/register">`
- Rezultat: Natywne przekierowanie do `/register` (strona rejestracji)
- Typ nawigacji: Pełne przeładowanie strony (natywna nawigacja)

### 8.3. Kliknięcie przycisku "Zaloguj się" (Hero Section)

- Akcja: Kliknięcie linku `<a href="/login">`
- Rezultat: Natywne przekierowanie do `/login` (strona logowania)
- Typ nawigacji: Pełne przeładowanie strony (natywna nawigacja)

### 8.4. Kliknięcie przycisku CTA (CTA Section)

- Akcja: Kliknięcie linku `<a href="/register">`
- Rezultat: Natywne przekierowanie do `/register`
- Typ nawigacji: Pełne przeładowanie strony (natywna nawigacja)

### 8.5. Kliknięcie przycisku "Logowanie" w nawigacji (Layout)

- Akcja: Kliknięcie linku w `Layout.astro`
- Rezultat: Przekierowanie do `/login`
- **Uwaga:** Ta funkcjonalność już istnieje w `Layout.astro`, nie wymaga implementacji

### 8.6. Kliknięcie przycisku "Rejestracja" w nawigacji (Layout)

- Akcja: Kliknięcie linku w `Layout.astro`
- Rezultat: Przekierowanie do `/register`
- **Uwaga:** Ta funkcjonalność już istnieje w `Layout.astro`, nie wymaga implementacji

### 8.7. Scrollowanie strony

- Akcja: Użytkownik przewija stronę w dół
- Rezultat: Płynne przewijanie przez sekcje (Hero → Features → CTA)
- **Uwaga:** Natywne zachowanie przeglądarki, brak dodatkowej implementacji

## 9. Warunki i walidacja

### 9.1. Warunek dostępu do widoku

**Warunek:** Użytkownik NIE jest zalogowany
**Weryfikacja:** Server-side w `index.astro`
**Implementacja:**
```typescript
const { user } = Astro.locals;
if (user) {
  return Astro.redirect("/dashboard");
}
```
**Wpływ na UI:**
- Jeśli warunek spełniony (user === null) → renderowanie `Welcome.astro`
- Jeśli warunek niespełniony (user !== null) → przekierowanie, brak renderowania

**Komponent:** `index.astro`

### 9.2. Brak walidacji formularzy

Landing page nie zawiera żadnych formularzy, więc nie ma walidacji pól.

### 9.3. Brak warunków biznesowych

Strona jest czysto prezentacyjna, nie weryfikuje żadnych warunków biznesowych.

## 10. Obsługa błędów

### 10.1. Błąd sprawdzenia sesji użytkownika

**Scenariusz:** Błąd komunikacji z Supabase podczas sprawdzania `Astro.locals.user`

**Rozwiązanie:**
- Domyślne zachowanie: Traktowanie użytkownika jako niezalogowanego
- Wyświetlenie landing page
- Brak komunikatu błędu (graceful degradation)

**Implementacja:**
```typescript
let user = null;
try {
  user = Astro.locals.user;
} catch (error) {
  console.error("Error checking user session:", error);
  // Użytkownik traktowany jako niezalogowany
}

if (user) {
  return Astro.redirect("/dashboard");
}
```

### 10.2. Błąd przekierowania

**Scenariusz:** Błąd podczas wykonywania `Astro.redirect("/dashboard")`

**Rozwiązanie:**
- Fallback: Wyświetlenie landing page z komunikatem
- Alternatywnie: Pokazanie komunikatu "Przekierowanie do dashboardu..." z linkiem manualnym

**Implementacja:**
```typescript
if (user) {
  try {
    return Astro.redirect("/dashboard");
  } catch (error) {
    console.error("Redirect error:", error);
    // Fallback - wyświetlenie landing page lub komunikatu
  }
}
```

### 10.3. Brak połączenia z backendem

**Scenariusz:** Supabase niedostępny, brak możliwości sprawdzenia sesji

**Rozwiązanie:**
- Wyświetlenie landing page bez sprawdzania sesji
- Przyciski logowania/rejestracji działają normalnie
- Użytkownik może ręcznie przejść do `/dashboard` jeśli jest zalogowany

**Uwaga:** Ten scenariusz jest mało prawdopodobny, ponieważ Astro middleware powinien obsłużyć błędy Supabase.

### 10.4. Brak JavaScript po stronie klienta

**Scenariusz:** Użytkownik ma wyłączony JavaScript w przeglądarce

**Rozwiązanie:**
- Landing page działa w pełni bez JS (Astro generuje statyczny HTML)
- Nawigacja działa (natywne linki `<a href="">`)
- Komponenty React (`FeatureCard`) mogą nie działać - należy zapewnić fallback

**Implementacja:** Rozważenie użycia emoji zamiast ikon Lucide, lub renderowanie ikon server-side

## 11. Kroki implementacji

### Krok 1: Stworzenie komponentu React dla karty funkcjonalności

**Plik:** `src/components/landing/FeatureCard.tsx`

**Zadanie:**
1. Utworzyć folder `src/components/landing/` (jeśli nie istnieje)
2. Utworzyć plik `FeatureCard.tsx`
3. Zaimplementować komponent React z dynamicznym renderowaniem ikon Lucide
4. Dodać TypeScript interface `FeatureCardProps`
5. Zastosować Tailwind classes dla stylowania karty
6. Przetestować komponent z różnymi ikonami

**Szczegóły:**
```tsx
// src/components/landing/FeatureCard.tsx
import * as Icons from "lucide-react";

interface FeatureCardProps {
  iconName: string;
  title: string;
  description: string;
}

export function FeatureCard({ iconName, title, description }: FeatureCardProps) {
  const Icon = Icons[iconName as keyof typeof Icons] as Icons.LucideIcon;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200">
      <div className="mb-4">
        {Icon && <Icon className="w-10 h-10 text-emerald-500" strokeWidth={1.5} />}
      </div>
      <h3 className="text-xl font-semibold mb-2 text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
  );
}
```

### Krok 2: Zdefiniowanie listy funkcjonalności

**Plik:** `src/components/Welcome.astro` (na początku części script)

**Zadanie:**
1. Zdefiniować interface `Feature`
2. Stworzyć tablicę `features` z 4 funkcjonalnościami aplikacji
3. Wybrać odpowiednie ikony z Lucide dla każdej funkcjonalności

**Szczegóły:**
```astro
---
import { FeatureCard } from "@/components/landing/FeatureCard";

interface Feature {
  iconName: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    iconName: "Gift",
    title: "Losowanie anonimowe",
    description: "Algorytm gwarantuje pełną anonimowość - nikt nie pozna wszystkich par prezentowych."
  },
  {
    iconName: "Users",
    title: "Zarządzanie grupą",
    description: "Twórz grupy, dodawaj uczestników i definiuj reguły wykluczeń w prosty sposób."
  },
  {
    iconName: "Lock",
    title: "Pełna poufność",
    description: "Wyniki losowania są bezpieczne. Każdy widzi tylko swoją osobę do obdarowania."
  },
  {
    iconName: "Sparkles",
    title: "Listy życzeń",
    description: "Każdy uczestnik może stworzyć listę życzeń, aby ułatwić wybór idealnego prezentu."
  },
];
---
```

**Sugerowane ikony Lucide:**
- `Gift` - prezenty, losowanie
- `Users` - grupa, uczestnicy
- `Lock` lub `ShieldCheck` - bezpieczeństwo, poufność
- `Sparkles` lub `Heart` - listy życzeń, magia świąt
- `Calendar` - data zakończenia wydarzenia
- `Shuffle` - losowanie, mieszanie

### Krok 3: Implementacja sekcji Hero

**Plik:** `src/components/Welcome.astro`

**Zadanie:**
1. Stworzyć sekcję `<section>` z klasami dla Hero
2. Dodać główny nagłówek `<h1>` z gradientowym tekstem
3. Dodać podtytuł i opis
4. Stworzyć kontener z dwoma przyciskami CTA (Rejestracja, Logowanie)
5. Zapewnić responsywność (mniejsze fonty na mobile)

**Szczegóły:**
```astro
<section class="container mx-auto px-4 py-16 md:py-24 flex items-center min-h-[80vh]">
  <div class="max-w-4xl mx-auto text-center">
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-gradient-to-r from-emerald-600 via-red-500 to-green-600 text-transparent bg-clip-text">
      Zorganizuj Secret Santa w 5 minut
    </h1>
    <p class="text-lg md:text-xl text-gray-700 mb-8 max-w-2xl mx-auto">
      Prosta i bezpieczna platforma do organizacji wymiany prezentów.
      Losowanie anonimowe, zarządzanie grupą i listy życzeń w jednym miejscu.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center items-center">
      <a
        href="/register"
        class="inline-flex items-center px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-lg rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
      >
        Rozpocznij za darmo
      </a>
      <a
        href="/login"
        class="inline-flex items-center px-8 py-4 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-semibold text-lg rounded-lg transition-all duration-200"
      >
        Mam już konto
      </a>
    </div>
  </div>
</section>
```

### Krok 4: Implementacja sekcji Features

**Plik:** `src/components/Welcome.astro`

**Zadanie:**
1. Stworzyć sekcję `<section>` dla funkcjonalności
2. Dodać nagłówek sekcji `<h2>`
3. Stworzyć responsywną siatkę (1 kolumna na mobile, 2 na tablet, 4 na desktop)
4. Zmapować tablicę `features` do komponentów `FeatureCard`
5. Dodać `client:load` directive dla komponentów React

**Szczegóły:**
```astro
<section class="bg-gray-50 py-16 md:py-24">
  <div class="container mx-auto px-4">
    <h2 class="text-3xl md:text-4xl font-bold text-center mb-12 text-gray-900">
      Dlaczego warto wybrać Secret Santa?
    </h2>
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
      {features.map((feature) => (
        <FeatureCard
          iconName={feature.iconName}
          title={feature.title}
          description={feature.description}
          client:load
        />
      ))}
    </div>
  </div>
</section>
```

### Krok 5: Implementacja sekcji CTA

**Plik:** `src/components/Welcome.astro`

**Zadanie:**
1. Stworzyć sekcję `<section>` z wyróżniającym się tłem (gradient emerald)
2. Dodać końcowy nagłówek i tekst motywujący
3. Dodać duży przycisk CTA do rejestracji
4. Zastosować białe tło przycisku kontrastujące z tłem sekcji

**Szczegóły:**
```astro
<section class="bg-gradient-to-r from-emerald-500 to-green-600 py-16 md:py-24">
  <div class="container mx-auto px-4 text-center">
    <h2 class="text-3xl md:text-4xl font-bold text-white mb-6">
      Gotowy na zorganizowanie Secret Santa?
    </h2>
    <p class="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto">
      Dołącz do tysięcy użytkowników, którzy ułatwili sobie organizację wymiany prezentów.
      Zarejestruj się za darmo i rozpocznij swoją pierwszą grupę już dziś!
    </p>
    <a
      href="/register"
      class="inline-flex items-center px-10 py-5 bg-white text-emerald-600 hover:bg-gray-100 font-bold text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
    >
      Załóż darmowe konto
    </a>
  </div>
</section>
```

### Krok 6: Zastąpienie zawartości Welcome.astro

**Plik:** `src/components/Welcome.astro`

**Zadanie:**
1. Usunąć obecną zawartość demo startera z `Welcome.astro`
2. Zastąpić zawartością landing page Secret Santa (Hero + Features + CTA)
3. Dodać import komponentu `FeatureCard`
4. Dodać definicję interface `Feature` i tablicy `features`
5. Zachować główny kontener `<div>` z odpowiednim tłem

**Szczegóły:**
```astro
---
import { FeatureCard } from "@/components/landing/FeatureCard";

// ... interface Feature i tablica features (z Kroku 2)
---

<div class="min-h-screen bg-gradient-to-br from-red-50 via-white to-green-50">
  <!-- Hero Section (z Kroku 3) -->
  <!-- Features Section (z Kroku 4) -->
  <!-- CTA Section (z Kroku 5) -->
</div>
```

### Krok 7: Dostosowanie kolorystyki świątecznej

**Zadanie:**
1. Przejrzeć wszystkie sekcje i dostosować kolory do świątecznej palety
2. Upewnić się, że gradient tła jest subtelny (czerwień, zieleń, złoto)
3. Sprawdzić kontrast tekstu dla dostępności
4. Dodać akcenty świąteczne (opcjonalnie: dekoracyjne elementy SVG)

**Paleta świąteczna:**
- Główny zielony: `emerald-500`, `emerald-600`, `green-500`, `green-600`
- Czerwony: `red-500`, `red-600`
- Złoty: `yellow-500`, `amber-500`
- Neutralne: `gray-50`, `gray-100`, `gray-700`, `gray-900`
- Tła gradientowe: `from-red-50 via-white to-green-50`

### Krok 8: Testowanie responsywności

**Zadanie:**
1. Przetestować landing page na różnych rozmiarach ekranu:
   - Mobile (320px - 640px)
   - Tablet (640px - 1024px)
   - Desktop (1024px+)
2. Sprawdzić czy:
   - Siatka funkcjonalności układa się poprawnie (1/2/4 kolumny)
   - Przyciski CTA są widoczne i klikalne
   - Teksty są czytelne
   - Padding i spacing są odpowiednie
3. Użyć narzędzi deweloperskich przeglądarki (Responsive Design Mode)

### Krok 9: Testowanie nawigacji

**Zadanie:**
1. Przetestować wszystkie linki na stronie:
   - Przyciski "Rozpocznij za darmo" → `/register`
   - Przyciski "Mam już konto" → `/login`
   - Przycisk "Załóż darmowe konto" → `/register`
   - Logo w nawigacji → `/` (dla niezalogowanych)
   - Przyciski w nawigacji → `/login` i `/register`
2. Upewnić się, że wszystkie linki działają poprawnie
3. Sprawdzić, że zalogowani użytkownicy są przekierowywani do `/dashboard`

### Krok 10: Testowanie logiki przekierowania

**Zadanie:**
1. Przetestować scenariusz użytkownika niezalogowanego:
   - Otworzyć stronę `/` w trybie incognito
   - Sprawdzić, czy wyświetla się landing page
2. Przetestować scenariusz użytkownika zalogowanego:
   - Zalogować się do aplikacji
   - Otworzyć stronę `/`
   - Sprawdzić, czy następuje automatyczne przekierowanie do `/dashboard`
3. Sprawdzić zachowanie w przypadku błędu sesji

### Krok 11: Optymalizacja wydajności

**Zadanie:**
1. Sprawdzić rozmiar bundle'a JavaScript (dev tools → Network)
2. Upewnić się, że Astro generuje statyczny HTML dla większości strony
3. Zweryfikować, że komponenty React są hydratowane tylko tam, gdzie potrzebne (`client:load`)
4. Rozważyć użycie `client:visible` dla komponentów poniżej fold (opcjonalne)
5. Sprawdzić czas ładowania strony (Lighthouse, PageSpeed Insights)

**Optymalizacje:**
- Użycie `client:visible` dla `FeatureCard` jeśli są poniżej pierwszego ekranu
- Lazy loading obrazów (jeśli zostaną dodane w przyszłości)
- Minifikacja CSS i JS (automatyczna w Astro production build)

### Krok 12: Testowanie dostępności (a11y)

**Zadanie:**
1. Sprawdzić hierarchię nagłówków (H1 → H2 → H3)
2. Dodać atrybuty `aria-label` do linków bez tekstu (jeśli istnieją)
3. Sprawdzić kontrast kolorów (WCAG AA standard)
4. Upewnić się, że strona jest nawigowalna za pomocą klawiatury (Tab)
5. Przetestować z czytnikiem ekranu (opcjonalnie)
6. Uruchomić Lighthouse Accessibility audit

### Krok 13: Dodanie meta tagów i SEO

**Zadanie:**
1. Zaktualizować tytuł strony w `Layout.astro` (lub przekazać jako prop)
2. Dodać meta description dla SEO
3. Dodać Open Graph tags dla social media
4. Dodać favicon (jeśli jeszcze nie istnieje)

**Plik:** `src/layouts/Layout.astro` lub `src/pages/index.astro`

**Szczegóły:**
```astro
---
// W index.astro - przekazanie tytułu do Layout
---
<Layout title="Secret Santa - Zorganizuj wymianę prezentów w 5 minut">
  <Welcome />
</Layout>
```

Opcjonalnie dodać meta tagi w `Layout.astro`:
```html
<meta name="description" content="Prosta i bezpieczna platforma do organizacji wymiany prezentów Secret Santa. Losowanie anonimowe, zarządzanie grupą i listy życzeń w jednym miejscu." />
<meta property="og:title" content="Secret Santa - Zorganizuj wymianę prezentów" />
<meta property="og:description" content="Prosta i bezpieczna platforma do organizacji Secret Santa" />
<meta property="og:type" content="website" />
```

### Krok 14: Weryfikacja końcowa i przegląd kodu

**Zadanie:**
1. Przejrzeć cały kod pod kątem:
   - Konsystencji stylowania (Tailwind classes)
   - Poprawności TypeScript (brak błędów type checking)
   - Czytelności i komentarzy
   - Zgodności z konwencjami projektu
2. Uruchomić lintery (ESLint, Prettier)
3. Sprawdzić, czy nie ma console.log() lub debugowania
4. Przetestować całą stronę raz jeszcze end-to-end

**Komendy:**
```bash
npm run lint
npm run format
npm run build
npm run preview
```

### Krok 15: Dokumentacja i commit

**Zadanie:**
1. Zaktualizować dokumentację projektu (jeśli istnieje)
2. Przygotować commit message zgodnie z konwencją projektu
3. Utworzyć pull request (jeśli wymagane)

**Przykładowy commit message:**
```
feat: implement landing page for Secret Santa

- Replace Welcome.astro demo content with Secret Santa landing page
- Add FeatureCard React component for features section
- Implement Hero, Features, and CTA sections
- Add Christmas-themed color palette (red, green, emerald)
- Ensure full responsiveness (mobile, tablet, desktop)
- Maintain existing authentication redirect logic
```

---

## Dodatkowe uwagi

### Świąteczny charakter

Aby zachować świąteczny charakter aplikacji, sugeruje się:
1. **Kolorystyka:** Czerwień (red-500), zieleń (emerald-500, green-600), złoto/żółty (amber-500)
2. **Emoji w nagłówkach:** 🎅 🎁 🎄 ⛄ ❄️ ✨
3. **Gradient tła:** Subtelny gradient `from-red-50 via-white to-green-50`
4. **Efekty wizualne:** Delikatne cienie, zaokrąglone rogi, hover effects

### Opcjonalne rozszerzenia (poza MVP)

Po zaimplementowaniu podstawowej wersji można rozważyć:
1. **Animacje:** Dodanie animacji pojawienia się przy scrollowaniu (Intersection Observer)
2. **Efekt śniegu:** Delikatny efekt spadających płatków śniegu (CSS lub lightweight library)
3. **Ilustracje:** Dodanie ilustracji lub zdjęć związanych ze świętami
4. **Testimoniale:** Sekcja z opiniami użytkowników (jeśli dostępne)
5. **FAQ:** Sekcja z najczęściej zadawanymi pytaniami
6. **Footer:** Rozbudowany footer z linkami (polityka prywatności, regulamin, kontakt)

### Najlepsze praktyki

1. **Semantic HTML:** Używaj semantycznych tagów (`<section>`, `<nav>`, `<main>`)
2. **Accessibility:** Zapewnij odpowiedni kontrast i nawigację klawiaturową
3. **Performance:** Minimalizuj JS, używaj Astro dla statycznej treści
4. **SEO:** Dodaj odpowiednie meta tagi i structured data
5. **Responsive Design:** Testuj na różnych urządzeniach i rozmiarach ekranu

### Wskazówki debugowania

Jeśli coś nie działa:
1. **Sprawdź konsolę przeglądarki** - błędy JavaScript
2. **Sprawdź Network tab** - czy zasoby się ładują
3. **Sprawdź Astro dev server logs** - błędy kompilacji
4. **Użyj React DevTools** - inspekcja komponentów React
5. **Sprawdź Tailwind classes** - czy są poprawnie zastosowane
