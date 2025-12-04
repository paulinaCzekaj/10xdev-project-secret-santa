# Changelog

Wszystkie znaczące zmiany w projekcie Secret Santa będą dokumentowane w tym pliku.

Format bazuje na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
a projekt stosuje [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.1.0] - 2025-11-17

### Added

#### Funkcjonalność Elfa (Helper Role)
- **Rola Elfa**: Opcjonalna rola pomocnika w grupie Secret Santa umożliwiająca wsparcie uczestnika w wyborze prezentu
- Twórca grupy może przypisać uczestnikowi rolę elfa dla innego uczestnika podczas dodawania lub edycji
- Elf zalogowany widzi pełny wynik losowania osoby, której pomaga (kogo wylosowała, lista życzeń)
- Elf z kontem może edytować listę życzeń osoby, której pomaga (do daty zakończenia wydarzenia)
- Automatyczne jednokierunkowe wykluczenie: osoba z elfem nie może wylosować swojego elfa
- Elf może wylosować osobę, której pomaga (wykluczenie działa tylko w jedną stronę)
- Relacja 1:1: jeden uczestnik = max 1 elf, jeden elf pomaga max 1 osobie
- Przypisanie elfa możliwe tylko przed losowaniem (niemutowalne po losowaniu)

#### UI Components
- Nowy komponent: `ElfHelpSection` - sekcja z przyciskiem "Zobacz wynik [Imię] 🧝" dla elfów
- Nowy komponent: `ElfInfoBox` - info box "Twój pomocnik: [Imię] 🧝" dla uczestników z elfem
- Nowy komponent: `ElfResultView` - pełny widok wyniku osoby, której elf pomaga
- Select dropdown "Elf dla uczestnika" w `AddParticipantForm` i `EditParticipantModal`
- Badge "🧝 Elf dla: [Imię]" w liście uczestników (`ParticipantsList`)
- Info "Pomocnik: [Imię] 🧝" dla uczestników z przypisanym elfem

#### API Endpoints
- `GET /api/participants/:participantId/elf-result` - pobiera wynik osoby, której elf pomaga
- `POST /api/participants/:participantId/track-elf-access` - trackuje moment otwarcia wyniku przez elfa
- Rozszerzono `PATCH /api/participants/:participantId` o pole `elfForParticipantId`
- Rozszerzono `POST /api/groups/:groupId/participants` o pole `elfForParticipantId`
- Rozszerzono `GET /api/groups/:groupId/participants` o informacje o elfach w response

#### Routing
- Nowa strona: `/groups/[groupId]/elf-result` - widok wyniku dla elfa (wymaga logowania)
- Walidacja: redirect do dashboard jeśli użytkownik nie jest elfem

#### Backend Services
- `ParticipantService.validateElfAssignment()` - walidacja przypisania elfa (ta sama grupa, brak duplikatów)
- `ParticipantService.addParticipantToGroup()` - rozszerzono o parametr `elfForParticipantId`
- `ParticipantService.updateParticipant()` - rozszerzono o możliwość edycji `elfForParticipantId`
- `DrawService.buildExclusionMap()` - automatyczne dodawanie wykluczeń elfów
- `DrawService.getElfExclusionsForGroup()` - helper zwracający pary [elf, uczestnik]
- `ResultsService.getResultAsElf()` - pobiera wynik osoby, której elf pomaga (z walidacją uprawnień)
- `ResultsService.trackElfAccess()` - ustawia timestamp `elf_accessed_at`
- `WishlistService.createOrUpdateWishlist()` - rozszerzono o uprawnienia edycji dla elfa

#### Hooks
- `useElfResult()` - hook do pobierania wyniku jako elf i trackowania dostępu

#### Database
- Dodano kolumnę `elf_for_participant_id BIGINT NULL` do tabeli `participants`
- Dodano kolumnę `elf_accessed_at TIMESTAMPTZ NULL` do tabeli `participants`
- Dodano foreign key constraint: `elf_for_participant_id -> participants.id`
- Dodano check constraint: uczestnik nie może być elfem sam dla siebie
- Dodano unique constraint: jeden uczestnik może mieć max 1 elfa w grupie
- Dodano indeksy: `participants_elf_for_idx`, `participants_elf_accessed_at_idx`
- Migracja: `20251117000001_add_elf_functionality.sql`

#### Tests
- Testy jednostkowe dla `DrawService` - wykluczenia elfów
- Testy jednostkowe dla `ParticipantService` - walidacja przypisania elfa
- Testy jednostkowe dla `ResultsService` - uprawnienia dostępu elfa
- Testy E2E dla pełnego flow elfa (Playwright): `elf-workflow.spec.ts`

#### Documentation
- Zaktualizowano PRD - dodano sekcję 3.6 "Funkcjonalność Elfa (Wersja 1.1)"
- Dodano User Story US-016: "Rola Elfa - pomocnika w grupie Secret Santa"
- Dodano dokumentację użytkownika o roli Elfa w README
- Utworzono plan implementacji: `.ai/versions/v1.1-elf-feature-plan.md`

### Changed
- Rozszerzono `ParticipantDTO` o pola: `elf_for_participant_id`, `elf_for_participant_name`, `elf_accessed_at`
- Rozszerzono `ParticipantViewModel` o pola: `elfForParticipantId`, `elfForParticipantName`, `isElfForSomeone`, `hasElf`, `elfName`, `elfAccessedAt`
- Rozszerzono `ResultData` o pole `elf` z informacją o przypisanym elfie
- Algorytm losowania `DrawService.isDrawPossible()` uwzględnia wykluczenia elfów

### Security
- Endpoint `/api/participants/:id/elf-result` wymaga Bearer token (elf musi być zalogowany)
- Walidacja uprawnień: tylko elf z `user_id` może zobaczyć wynik osoby, której pomaga
- Niezarejestrowani elfowie (bez `user_id`) nie mają dostępu do wyniku cudzego
- Access token nie daje dostępu do wyniku osoby, której elf pomaga (tylko do własnego)
- Oddzielny tracking `elf_accessed_at` vs `result_viewed_at` dla transparentności

---

## [1.0.0] - 2025-11-03

### Added - MVP Release

#### Uwierzytelnianie
- Rejestracja użytkownika (email + hasło)
- Logowanie użytkownika
- Wylogowanie
- Reset hasła (uproszczona wersja)
- Integracja z Supabase Auth

#### Zarządzanie Grupami
- Tworzenie nowej grupy (nazwa, budżet PLN, data zakończenia)
- Dodawanie uczestników (imię + opcjonalny email)
- Edycja uczestników (imię, email) przed losowaniem
- Usuwanie uczestników przed losowaniem
- Usuwanie grup (z modalem potwierdzenia)
- Dashboard użytkownika z listą grup (stworzone + uczestnictwo)
- Twórca automatycznie dodawany jako pierwszy uczestnik

#### Wykluczenia (Exclusions)
- Definiowanie jednokierunkowych reguł wykluczeń
- Walidacja możliwości przeprowadzenia losowania z wykluczeniami
- Usuwanie reguł wykluczeń przed losowaniem
- UI: select blocker + blocked participant

#### Losowanie (Draw)
- Algorytm losowania (backtracking + randomizacja)
- Min 3 uczestników do rozpoczęcia losowania
- Walidacja przed losowaniem (każdy ma min 1 możliwego receivera)
- Losowanie nieodwracalne (blokada edycji po losowaniu)
- Brak self-assignment (nikt nie losuje siebie)
- Timeout 15s dla algorytmu

#### Wyniki (Results)
- Widok wyniku dla zalogowanych użytkowników
- Widok wyniku dla niezarejestrowanych (unikalny access token)
- Wyświetlanie: imię wylosowanej osoby, jej lista życzeń, budżet
- Tracking otwarcia wyniku (`result_viewed_at`)
- Statusy w liście uczestników: "Zobaczył wynik" / "Nie zobaczył wyniku"

#### Listy życzeń (Wishlists)
- Tworzenie i edycja listy życzeń (pole tekstowe)
- Auto-linking URLs (konwersja do klikalnych linków)
- Blokada edycji po dacie zakończenia wydarzenia
- Edycja możliwa dla zalogowanych (Bearer token) i niezalogowanych (access token)
- Dual authentication: Bearer token OR participant token
- Statusy: "Ma listę życzeń" / "Brak listy życzeń"

#### AI-generowanie listu do Mikołaja
- Integracja z OpenRouter API (model: openai/gpt-4o-mini)
- Przycisk "Generuj list z AI 🎅" obok pola listy życzeń
- Modal z promptem (preferencje/zainteresowania użytkownika)
- Modal podglądu z opcjami: Akceptuj, Odrzuć, Generuj ponownie
- Limity generowań per-grupa: 3 (niezarejestrowani) / 5 (zarejestrowani)
- Licznik pozostałych generowań przy przycisku
- System prompt: ciepły, narracyjny ton świąteczny z emoji
- Walidacja: prompt 10-1000 znaków, output max 1000 znaków
- Tracking: `ai_generation_count_per_group`, `ai_last_generated_at`, `ai_generated`
- Komponenty: `AIGenerateButton`, `AIPromptModal`, `AIPreviewModal`

#### Database
- Tabela `groups` (nazwa, budżet, data zakończenia, twórca)
- Tabela `participants` (imię, email, access_token, result_viewed_at)
- Tabela `exclusion_rules` (blocker_participant_id, blocked_participant_id)
- Tabela `assignments` (giver_participant_id, receiver_participant_id)
- Tabela `wishes` (wishlist, ai_generated, ai_generation_count_per_group, ai_last_generated_at)
- Row Level Security (RLS) włączone na tabeli `groups`
- Indeksy dla performance
- Unique constraints (access_token, email per group, exclusion rules, assignments)

#### API Endpoints
- Auth: `/api/auth/signup`, `/api/auth/signin`, `/api/auth/signout`
- Groups: CRUD endpoints `/api/groups/*`
- Participants: CRUD endpoints `/api/participants/*`
- Exclusions: CRUD endpoints `/api/exclusions/*`
- Draw: `/api/groups/:groupId/draw`, `/api/groups/:groupId/draw/validate`
- Results: `/api/results/:token`, `/api/participants/:id/reveal`
- Wishlist: `/api/participants/:id/wishlist` (GET/PUT/DELETE)
- AI: `/api/participants/:id/wishlist/generate-ai`, `/api/participants/:id/wishlist/ai-status`

#### Frontend Components
- `GroupView` - główny widok grupy
- `ParticipantsList` - lista uczestników z statusami
- `AddParticipantForm`, `EditParticipantModal`, `DeleteParticipantModal`
- `ExclusionsSection` - sekcja wykluczeń
- `DrawSection` - przycisk losowania z walidacją
- `ResultsSection` - wyniki po losowaniu
- `ResultView` - widok wyniku dla uczestnika
- `ResultReveal` - animacja otwierania prezentu
- `GiftBox` - komponent pudełka z prezentem
- `AssignedPersonCard` - karta wylosowanej osoby
- `WishlistSection` - sekcja z listami życzeń
- `WishlistEditor` - edytor z auto-save
- `AIGenerateButton`, `AIPromptModal`, `AIPreviewModal` - komponenty AI

#### Testing
- Vitest setup dla testów jednostkowych
- Playwright setup dla testów E2E
- Testy dla `DrawService` (algorytm losowania)
- CI/CD: GitHub Actions z automatycznymi testami

#### Documentation
- PRD (Product Requirements Document): `.ai/prd.md`
- User stories: US-001 do US-015
- Metryki sukcesu (KPI, wskaźniki adopcji AI)
- Wymagania techniczne (API, baza danych, frontend)
- Bezpieczeństwo i prywatność (RODO, content moderation, rate limiting)

#### Deployment
- Supabase (PostgreSQL + Auth)
- Cloudflare Pages
- Node.js 22.14.0
- Astro + React + TypeScript
- Tailwind CSS

### Changed
- N/A (first release)

### Deprecated
- N/A (first release)

### Removed
- N/A (first release)

### Fixed
- N/A (first release)

### Security
- Dual authentication: Bearer token + participant access token
- RLS policies na tabeli `groups`
- OPENROUTER_API_KEY w zmiennych środowiskowych (nie w kodzie)
- Walidacja uprawnień: tylko creator może edytować/usuwać grupę
- Walidacja email uniqueness per group
- Rate limiting dla AI (3/5 generowań per-grupa)
- Sanityzacja HTML dla wishlist (XSS protection)

---

## Format

### Types of changes
- `Added` - nowe funkcjonalności
- `Changed` - zmiany w istniejących funkcjonalnościach
- `Deprecated` - funkcjonalności które zostaną usunięte
- `Removed` - usunięte funkcjonalności
- `Fixed` - bugfixy
- `Security` - zmiany związane z bezpieczeństwem

### Version numbering (SemVer)
- **MAJOR** (X.0.0) - breaking changes (niekompatybilne zmiany API)
- **MINOR** (1.X.0) - nowe funkcjonalności (backward compatible)
- **PATCH** (1.0.X) - bugfixy (backward compatible)

---

## Unreleased

### Planned for v1.2.0
- System powiadomień email (dodanie do grupy, losowanie wykonane, przypomnienie)
- Formalny system zaproszeń do grupy (link zapraszający lub kod)
- Możliwość ponownego losowania (z opcją zachowania niektórych przydziałów)
- Zaawansowane role użytkowników (współorganizator grupy)
- Wbudowany czat grupowy dla uczestników
- Obsługa wielu walut (nie tylko PLN)
- Integracje z zewnętrznymi serwisami (wishlist z Amazon)
- Dark mode

### Planned for v2.0.0
- Redesign UI/UX (Material Design 3 lub nowy design system)
- Mobile app (React Native)
- Recurring events (cykliczne grupy, np. co roku)
- Public group discovery (przeglądanie publicznych grup)
- Social features (profil użytkownika, follow)

---

**[Unreleased]**: https://github.com/user/secret-santa/compare/v1.1.0...HEAD
**[1.1.0]**: https://github.com/user/secret-santa/compare/v1.0.0...v1.1.0
**[1.0.0]**: https://github.com/user/secret-santa/releases/tag/v1.0.0
