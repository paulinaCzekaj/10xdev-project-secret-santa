# Project Onboarding: Secret Santa

## Welcome

Welcome to the Secret Santa project! This is a web-based tool designed to simplify and automate the Secret Santa gift exchange process, enabling users to create gift groups, invite participants, define drawing rules, and conduct the drawing fully automatically and anonymously.

## Project Overview & Structure

The core functionality revolves around organizing Secret Santa events with complete anonymity and automated drawing logic. The project is organized as a single full-stack application built with Astro 5 for routing and SSR, React 19 for interactive components, and Supabase as the backend (PostgreSQL database + authentication), with the following key components:

## Development Timeline

Based on git history analysis, the project has evolved through distinct phases:

- **October 14, 2025:** Complete authentication system implementation
- **October 15-16, 2025:** Testing infrastructure setup (Vitest unit tests + Playwright E2E)
- **October 17, 2025:** Major component refactoring with hook extraction for maintainability
- **October 21-23, 2025:** Code quality initiative (systematic linting cleanup) + API security hardening phase
- **October 22, 2025:** Cloudflare Pages deployment configuration
- **October 23, 2025:** Responsive mobile UI rollout + wishlist statistics feature
- **October 31, 2025:** Centralized notification system implementation (affects 7+ files)
- **November 2, 2025:** Type safety polish phase + **critical draw algorithm randomness fix**

**Current State:** The project appears feature-complete for MVP and is in the **stabilization/polish phase** - recent commits focus on refinement (type safety, error handling) rather than new features, indicating preparation for production deployment.

## Core Modules

### `src/components/group`

- **Role:** Group management UI components - the heart of the Secret Santa creation and configuration flow
- **Key Files/Areas:**
  - **Core Views:** `GroupView.tsx` (main orchestrator), `GroupHeader.tsx`, `ParticipantsSection.tsx`, `ExclusionsSection.tsx`, `DrawSection.tsx`, `ResultsSection.tsx`
  - **Forms & Modals:** `AddParticipantForm.tsx`, `AddExclusionForm.tsx`, `DrawConfirmationModal.tsx`, `GroupEditModal.tsx`, `DeleteGroupModal.tsx`, `DeleteParticipantModal.tsx`, `EditParticipantModal.tsx`
  - **List Components:** `ParticipantsList.tsx`, `ParticipantCard.tsx`, `ExclusionsList.tsx`
  - **State Components:** `states/GroupViewSkeleton.tsx`, `states/GroupViewError.tsx`, `states/GroupViewEmpty.tsx`
- **Top Contributed Files:** `GroupView.tsx`, `DrawConfirmationModal.tsx`, `AddExclusionForm.tsx`
- **Recent Focus:** Major refactoring to support bidirectional exclusions, draw validation improvements, type safety enhancements in exclusion forms, and optimistic UI updates using React 19's useOptimistic hook

### `src/components/result`

- **Role:** Result viewing and reveal experience for participants after the draw
- **Key Files/Areas:**
  - **Core Components:** `ResultView.tsx`, `ResultReveal.tsx`, `ResultHeader.tsx`
  - **Wishlist Management:** `WishlistEditor.tsx`, `WishlistDisplay.tsx`, `WishlistSection.tsx`
  - **Visual Elements:** `GiftBox.tsx`, `AssignedPersonCard.tsx`
  - **Error Handling:** `errors/` subdirectory for error states
- **Top Contributed Files:** `ResultReveal.tsx`, `ResultView.tsx`, `WishlistEditor.tsx`
- **Recent Focus:** Enhanced reveal animations with confetti effects, added participant name to reveal text for clarity, improved wishlist autosave functionality with debouncing, and mobile-responsive design improvements

### `src/hooks`

- **Role:** Custom React hooks for state management, data fetching, and business logic encapsulation
- **Key Files/Areas:**
  - **Data Hooks:** `useGroupData.ts`, `useParticipants.ts`, `useExclusions.ts`, `useResultData.ts`
  - **Action Hooks:** `useDraw.ts`, `useCreateGroup.ts`, `useWishlistEditor.ts`
  - **Auth Hooks:** `useRegister.ts`, `useForgotPassword.ts`, `useResetPassword.ts`, `usePasswordValidation.ts`, `useTokenVerification.ts`
  - **UI/Animation Hooks:** `useRevealState.ts`, `useRevealAnimation.ts`, `useRevealTracking.ts`, `useConfetti.ts`, `useModalState.ts`
  - **ViewModel Hooks:** `useGroupViewModel.ts`, `useGroupViewHandlers.ts`, `useWishlistLinking.ts`
- **Top Contributed Files:** `useResultData.ts`, `useWishlistEditor.ts`, `useGroupViewHandlers.ts`, `useGroupViewModel.ts`
- **Recent Focus:** Implementation of result data fetching with token-based access for unregistered users, wishlist editor with autosave, password reset flow improvements, and group view handlers refactoring

### `src/lib/services`

- **Role:** Backend service layer handling business logic and database operations
- **Key Files/Areas:**
  - **Core Services:** `group.service.ts`, `participant.service.ts`, `exclusion-rule.service.ts`, `assignments.service.ts`
  - **Draw Logic:** `draw.service.ts` (Secret Santa algorithm with exclusion rules)
  - **Result & Wishlist:** `results.service.ts`, `wishlist.service.ts`
  - **Tests:** `__tests__/` subdirectory, `wishlist.service.test.ts`
- **Top Contributed Files:** `results.service.ts`, `participant.service.ts`, `group.service.ts`, `draw.service.ts`
- **Recent Focus:** Results service enhancements for dual access modes (authenticated vs token-based), draw algorithm randomness fixes, exclusion rule validation improvements, and comprehensive service-layer testing

### `src/pages/api/groups/[groupId]`

- **Role:** API endpoints for group-specific operations (RESTful API routes in Astro)
- **Key Files/Areas:**
  - **Group Operations:** `index.ts` (GET, PATCH, DELETE for individual groups)
  - **Nested Resources:** `draw/` subdirectory for draw execution and validation endpoints
  - **Participants Management:** Related participant endpoints for adding/removing participants
  - **Exclusions Management:** Related exclusion rule endpoints
- **Top Contributed Files:** API route handlers for group CRUD operations, draw validation, and execution
- **Recent Focus:** API authentication improvements with Bearer token support, draw validation endpoint enhancements, error handling standardization

### `src/components/ui`

- **Role:** Reusable UI component library based on Shadcn/ui (Radix UI primitives + Tailwind)
- **Key Files/Areas:**
  - **Form Components:** Button, Input, Label, Select, Checkbox, Calendar components
  - **Overlay Components:** Dialog, AlertDialog, Popover, Tooltip, DropdownMenu
  - **Feedback Components:** Toast (Sonner), Badge, Avatar, Skeleton
  - **Utility Components:** Card, Separator
- **Top Contributed Files:** Various Shadcn/ui components customized for the project
- **Recent Focus:** Mobile-responsive improvements, accessibility enhancements, theme system integration

### `src/components/auth`

- **Role:** Authentication flow components (login, register, password reset)
- **Key Files/Areas:**
  - **Form Components:** Login forms, registration forms, password reset forms
  - **Layout Components:** Auth page layouts
  - **Validation Components:** Password strength indicators, error displays
- **Top Contributed Files:** Password reset components with PKCE flow
- **Recent Focus:** Implementation of PKCE flow for password reset, mobile UI improvements, centralized error handling

### `src/pages`

- **Role:** Astro page routes defining the application's routing structure
- **Key Files/Areas:**
  - **Main Routes:** `index.astro` (landing page), `dashboard.astro`
  - **Group Routes:** `groups/[groupId]/` subdirectory
  - **Result Routes:** `results/[token]/` subdirectory for token-based access
  - **API Routes:** `api/` subdirectory for all backend endpoints
- **Top Contributed Files:** Landing page, dashboard, group detail pages
- **Recent Focus:** Landing page redesign with full-section backgrounds, SEO improvements, mobile navigation

### `src/components/forms`

- **Role:** Reusable form components using React Hook Form + Zod validation
- **Key Files/Areas:**
  - **Group Forms:** `CreateGroupForm.tsx`
  - **Field Components:** `fields/` subdirectory for reusable form fields
- **Top Contributed Files:** `CreateGroupForm.tsx`
- **Recent Focus:** Form validation improvements, better error messaging, date picker integration

### `src/types.ts` (Type System Foundation)

- **Role:** Central type definition file serving as the architectural backbone and contract enforcer between all layers
- **Significance:** 12 changes - highest change frequency in the codebase, reflecting active schema evolution
- **Key Components:**
  - API contracts (DTOs and Commands for request/response)
  - Database type aliases (Supabase-generated types)
  - ViewModels with computed/formatted fields for UI consumption
  - Form-specific ViewModels for React Hook Form integration
- **Recent Focus:** Bidirectional exclusion type refinement (Nov 2), type inconsistency resolution across forms, progressive enhancement of ViewModel pattern
- **Why Important:** Every component, hook, service, and API endpoint imports from this file. Understanding this type system is essential for making changes anywhere in the codebase

## Top Files by Change Frequency

Based on git history analysis, these 10 files have the highest change frequency and represent critical areas for understanding the codebase:

### 1. **src/types.ts** (12 changes)
- **Role:** Architectural contract between all layers
- **Recent Activity:** Type safety improvements, bidirectional exclusion support, ViewModel refinement
- **Onboarding Priority:** HIGH - Read first to understand data flow contracts

### 2. **src/components/forms/CreateGroupForm.tsx** (12 changes)
- **Role:** Primary user entry point for group creation
- **Recent Activity:** Notification system integration, responsive design, validation refinement
- **Onboarding Priority:** HIGH - Demonstrates form patterns used throughout

### 3. **src/components/group/DrawConfirmationModal.tsx** (11 changes)
- **Role:** Safety gate for critical irreversible draw operation
- **Recent Activity:** Warning improvements, statistics display, error handling
- **Onboarding Priority:** MEDIUM - Shows modal and critical action patterns

### 4. **src/pages/api/groups/index.ts** (10 changes)
- **Role:** Main API endpoint for group CRUD operations
- **Recent Activity:** Authentication fixes (Oct 22-23), type issue resolution
- **Onboarding Priority:** HIGH - Exemplifies API layer patterns and security

### 5. **src/lib/services/results.service.ts** (10 changes, 504 lines)
- **Role:** Most complex service - dual-access result retrieval
- **Recent Activity:** Wishlist statistics, participant matching, Bearer token auth
- **Onboarding Priority:** HIGH - Most complex service showing business logic patterns

### 6. **src/components/group/GroupView.tsx** (10 changes, 216 lines)
- **Role:** Central orchestrator coordinating 8 hooks and 10+ child components
- **Recent Activity:** Handler extraction refactoring (Oct 17), React 19 useOptimistic integration
- **Onboarding Priority:** CRITICAL - Demonstrates component composition and state management philosophy

### 7. **src/components/group/AddExclusionForm.tsx** (10 changes)
- **Role:** Complex form with bidirectional exclusion logic and validation
- **Recent Activity:** Type inconsistency fixes (Nov 2, multiple commits), bidirectional support
- **Onboarding Priority:** MEDIUM - Shows complex form logic with validation

### 8. **package.json** (10 changes)
- **Role:** Project configuration and dependency management
- **Recent Activity:** Testing setup, Cloudflare Pages config, linting tools
- **Onboarding Priority:** MEDIUM - Understanding tooling and scripts

### 9. **src/pages/api/participants/[participantId].ts** (9 changes)
- **Role:** Dynamic API endpoint with strict authorization
- **Recent Activity:** API auth fixes, draw-state-aware validation
- **Onboarding Priority:** MEDIUM - Shows authorization patterns and business rules

### 10. **src/components/group/ParticipantsList.tsx** (next most active)
- **Role:** Dual-mode participant display with rich status indicators
- **Recent Activity:** Wishlist statistics, responsive UI, status tracking
- **Onboarding Priority:** LOW - Good example of list component patterns

**Key Insight:** High change frequency in types.ts (12), CreateGroupForm.tsx (12), and multiple group components indicates this was the most active development area. The October 21-23 period shows synchronized changes across many files, indicating the code quality initiative and security hardening phase.

## Key Contributors

- **Paulina Czekaj (arinstreal@gmail.com):** Primary developer and architect - responsible for the entire application architecture, all major features including group management, draw algorithm, result viewing system, authentication flows, mobile responsiveness, CI/CD setup, and Cloudflare Pages deployment. Demonstrates expertise in full-stack TypeScript development, React patterns, testing strategies, and cloud deployment.

### Development Phases & Expertise Areas

**Foundational Phase (Oct 14-17, 2025):**
- Complete authentication system with Supabase integration
- Testing infrastructure (Vitest + Playwright setup)
- Component architecture with hook extraction pattern
- React Hook Form + Zod validation standardization

**Hardening & Quality Phase (Oct 21-23, 2025):**
- Systematic linting and formatting cleanup (affects 15+ files)
- API security improvements (multiple authentication fixes)
- Responsive mobile UI implementation
- Wishlist statistics feature implementation

**Infrastructure Phase (Oct 22-31, 2025):**
- Cloudflare Pages deployment configuration
- Centralized notification system architecture
- Performance optimizations (React 19 useOptimistic)

**Polish & Stability Phase (Nov 2, 2025):**
- **Critical:** Draw algorithm randomness restoration (high-priority bug fix)
- TypeScript type safety improvements across forms
- Bidirectional exclusion field type resolution
- UX personalization (participant names in reveal text)

**Key Technical Contributions:**
- Advanced React patterns (React 19 useOptimistic, custom hook composition)
- Security implementation (PKCE flow, Bearer token authentication, cryptographic result tokens)
- Complex algorithm development (Secret Santa draw with graph theory concepts)
- Full-stack type safety (types.ts with 683 lines covering all layers)
- Modern DevOps practices (CI/CD, automated testing, pre-commit hooks)

## Overall Takeaways & Recent Focus

### Development Evolution

The project has evolved through four distinct phases with clear focus areas:

**Phase 1: Foundation (Oct 14-17, 2025)**
- Complete authentication system with PKCE flow foundation
- Testing infrastructure setup (both unit and E2E)
- Component architecture refactoring with hook extraction
- React Hook Form + Zod validation patterns established

**Phase 2: Hardening (Oct 21-23, 2025)**
- **Major code quality push:** Systematic linting error resolution across 15+ files
- **API security focus:** Multiple authentication fixes on Oct 22-23 (api/groups/index.ts, api/participants/[participantId].ts)
- Responsive mobile UI implementation throughout
- Feature completion: wishlist statistics, participant matching improvements

**Phase 3: Deployment & Infrastructure (Oct 22-31, 2025)**
- Cloudflare Pages configuration and deployment automation
- Centralized notification system (Oct 31) affecting 7+ files
- Performance optimizations with React 19 features
- Infrastructure maturation

**Phase 4: Polish & Stability (Nov 2, 2025)**
- **Critical bug fix:** Draw algorithm randomness restoration (highest priority fix)
- Type safety improvements: types.ts, AddExclusionForm.tsx, form components
- UX personalization: participant names in result reveal text (2 iterations)
- Final type contract refinements

### Current State Analysis

**Feature Completeness:** Project appears feature-complete for MVP. Recent commits (Nov 2) focus on refinement rather than new features:
- Type safety improvements (not new features)
- Bug fixes (draw algorithm)
- UX polish (reveal text personalization)

**Architectural Maturity:**
1. **Type System:** 683-line types.ts with comprehensive DTOs, ViewModels, and Commands
2. **Component Composition:** GroupView.tsx demonstrates mature patterns with 8 custom hooks
3. **State Management:** No external library; React 19 useOptimistic + custom hooks approach
4. **Security-First:** Multiple authentication layers, draw-state-aware permissions
5. **Testing Coverage:** Dual strategy (unit + E2E) with comprehensive test suites

### Key Technical Achievements

1. **Dual-Access Architecture:** Sophisticated system supporting both authenticated users (Supabase Auth) and anonymous participants (cryptographic tokens) throughout the entire stack (API → services → hooks → components).

2. **Draw Algorithm Complexity:** Graph theory-based Secret Santa algorithm (draw.service.ts) with exclusion rule validation. Recent Nov 2 fix shows this was non-trivial - required algorithm restoration and test updates.

3. **React 19 Adoption:** Early adoption of cutting-edge patterns (useOptimistic for instant UI feedback) demonstrating technical currency and willingness to use modern approaches.

4. **Type Safety Excellence:** Full-stack TypeScript with strict typing from database → DTO → ViewModel → component props, enforced by 683-line types.ts acting as architectural contract.

5. **Form Architecture:** Standardized React Hook Form + Zod validation across all forms with consistent error handling and user feedback patterns.

6. **Security Implementation:** PKCE flow for password reset (modern OAuth 2.0 best practice), Bearer token authentication, encrypted result access tokens, and comprehensive authorization guards.

7. **DevOps Maturity:** CI/CD with GitHub Actions, pre-commit hooks (Husky + lint-staged), dual testing strategy, automated Cloudflare Pages deployment.

## Potential Complexity/Areas to Note

### High-Change-Rate Files (Complexity Indicators)

Analysis reveals these files have the highest change frequency, indicating either complexity or critical importance:

- **src/types.ts (12 changes, 683 lines)** - Architectural backbone with complex type relationships. Any modification here affects the entire codebase. Recent Nov 2 commits show ongoing type refinement, suggesting this is still evolving. **Caution:** Test thoroughly when making changes.

- **src/components/forms/CreateGroupForm.tsx (12 changes)** - High iteration count indicates UI/UX refinement and validation complexity. Recent centralized notification system integration shows this file tracks architectural changes.

- **src/components/group/DrawConfirmationModal.tsx (11 changes)** - Guards critical irreversible operation. High change count reflects iterative safety improvements and user feedback refinement.

- **src/lib/services/results.service.ts (10 changes, 504 lines)** - Largest and most complex service. Handles dual-access patterns (authenticated + token-based), permission validation, and multi-table queries. Recent wishlist statistics addition shows ongoing feature enhancement.

- **src/components/group/GroupView.tsx (10 changes, 216 lines)** - Central orchestrator coordinating 8 hooks. October 17 refactoring extracted handlers, but complexity remains in coordination logic.

- **src/components/group/AddExclusionForm.tsx (10 changes, 240 lines)** - Complex form with bidirectional logic. **November 2 had multiple type inconsistency fixes**, indicating non-trivial type relationships.

### Critical Complexity Areas

**1. Draw Algorithm Logic (CRITICAL - Recent Bug Fixed Nov 2)**

The Secret Santa drawing algorithm (`src/lib/services/draw.service.ts`) is complex and had a **critical randomness bug fixed on November 2, 2025**. This indicates:
- Algorithm is non-trivial and requires deep understanding
- Edge cases exist that may not be immediately obvious
- Cross-pair validation tests were updated post-fix
- Graph theory concepts used for exclusion rule validation

**Risk Level:** HIGH - This is core business logic. The recent bug suggests:
- Thorough testing required for any changes
- Edge cases like circular exclusions need careful consideration
- Performance implications with large groups and many exclusions

**2. Authentication Layer (Multiple Fixes Oct 22-23)**

API authentication had **multiple fixes across 2 days** (Oct 22-23) in:
- `src/pages/api/groups/index.ts`
- `src/pages/api/participants/[participantId].ts`
- Service layer authentication functions

**Implications:**
- Authentication patterns were initially non-trivial to implement correctly
- Guard clause patterns are critical (see numbered comments in API files)
- Bearer token vs session authentication requires careful handling

**Risk Level:** MEDIUM - Patterns are now established, but authentication changes require security review.

**3. Bidirectional Exclusions (Recent Type Fixes Nov 2)**

`AddExclusionForm.tsx` had **multiple type inconsistency fixes on November 2**, suggesting:
- Complex type relationships between participants and exclusion rules
- Bidirectional logic creates additional validation complexity
- Form state management is non-trivial

**Risk Level:** MEDIUM - Type system now stable, but logic is complex.

**4. Dual Access Patterns (Throughout Stack)**

The application supports both authenticated users (via Supabase Auth) and anonymous users (via cryptographic tokens). This creates complexity in:
- Middleware and authentication checks
- API endpoints (`results.service.ts` - 504 lines handling both patterns)
- Result access token generation and validation
- Hook implementations (`useTokenVerification.ts`, `useResultData.ts`)

**Risk Level:** HIGH - Security-sensitive area requiring careful token handling and permission validation.

**5. Type System Architecture (683 Lines, 12 Changes)**

The sophisticated type system (`src/types.ts`) has multiple layers:
- Database types (Supabase-generated)
- DTOs for API contracts
- ViewModels with computed fields for UI
- Form ViewModels for React Hook Form

**Complexity factors:**
- Types flow through 4+ layers: database → service → API → component
- Recent changes (12 commits) indicate active evolution
- Breaking changes here cascade throughout codebase
- ViewModel pattern adds transformation layer

**Risk Level:** HIGH - Central to all code. Changes require comprehensive testing.

**6. State Management Philosophy (No External Library)**

The application intentionally avoids Redux/Zustand, using instead:
- React 19's useOptimistic for instant UI feedback
- Custom hooks for data fetching with SWR-like patterns
- localStorage for reveal state persistence
- Modal state consolidation (`useModalState`)
- Component-level state for UI concerns

**Complexity factors:**
- Developers must understand when to use each pattern
- No single source of truth documentation
- GroupView.tsx demonstrates the pattern but requires careful study

**Risk Level:** MEDIUM - Patterns are consistent once understood.

**7. Form Validation & Business Rules (Dual-Layer Enforcement)**

Forms use React Hook Form + Zod for validation, BUT business rules are enforced in multiple places:
- Client-side validation (Zod schemas)
- API endpoint validation (separate Zod schemas)
- Service layer business logic
- Database constraints

Example: "Minimum 3 participants for draw" is checked in:
1. DrawConfirmationModal.tsx (UI)
2. API endpoint guard clause
3. Draw service validation

**Risk Level:** MEDIUM - Understand all validation layers before making changes.

**8. Testing Strategy (Multi-Layer)**

Three different testing approaches:
- Unit tests (Vitest) for services and hooks
- Component tests (React Testing Library) for components
- E2E tests (Playwright) for user flows

**Complexity:**
- Determining which level to test at requires judgment
- Recent test updates (Nov 2 - draw algorithm tests) show tests evolve with code
- Coverage thresholds reduced from 70% to 1% (see package.json) - **Question why?**

**Risk Level:** LOW - Clear patterns once familiar with each tool.

## Questions for the Team

### Critical Questions Based on Analysis

**1. Draw Algorithm Bug (Nov 2, 2025)**
What caused the critical randomness bug in the Secret Santa draw algorithm that was fixed on November 2? Understanding this will help prevent similar issues. Specifically:
- What was the nature of the bug? (algorithm logic vs implementation?)
- Why didn't existing tests catch it before production?
- What led to discovering the bug?
- Should additional test cases or monitoring be added?

**2. Multiple Authentication Fixes (Oct 22-23, 2025)**
API authentication required multiple fixes across two days in `api/groups/index.ts` and `api/participants/[participantId].ts`. Questions:
- What authentication issues were discovered?
- Were these security vulnerabilities or implementation bugs?
- Are there architectural lessons learned about authentication patterns?
- Should we document authentication requirements more explicitly?
- Is there a security review checklist for new API endpoints?

**3. Type System Evolution Strategy**
`types.ts` has 12 changes and is still evolving (recent Nov 2 type fixes). Questions:
- What is the process for making breaking type changes?
- How do we communicate type changes to avoid breaking existing code?
- Should we version the type contracts?
- Is there a migration strategy when database schema changes require type updates?
- How do we ensure ViewModels stay in sync with DTOs and database types?

**4. Test Coverage Threshold Reduction**
The `package.json` configuration shows test coverage thresholds were reduced from 70% (mentioned in CI/CD docs) to 1% (current configuration). Questions:
- What is the actual test coverage expectation?
- Why was the threshold reduced?
- Is 1% a temporary setting or permanent?
- What areas should have mandatory test coverage?
- Should critical files (draw.service.ts, results.service.ts) have higher thresholds?

**5. Centralized Notification System (Oct 31, 2025)**
A centralized notification system was implemented affecting 7+ files. Questions:
- What was the previous notification pattern?
- What drove this architectural refactoring?
- Are there other cross-cutting concerns that should be centralized similarly?
- Is this pattern documented for new contributors?

**6. Bidirectional Exclusions Complexity**
`AddExclusionForm.tsx` required multiple type inconsistency fixes on Nov 2. Questions:
- Why was bidirectional exclusion implementation complex?
- Are there known edge cases in the current implementation?
- Should bidirectional be the default option?
- How does this interact with the draw algorithm validation?

**7. State Management Documentation**
The project uses custom hooks + React 19 useOptimistic instead of Redux/Zustand. Questions:
- Is there documentation on when to use each state management pattern?
- Should `GroupView.tsx` be considered the reference implementation?
- How do new contributors learn these patterns?
- Are there anti-patterns to avoid?

### Original Questions (Still Relevant)

**8. Post-MVP Features & Architecture**
What are the planned features for post-MVP development, and are there any architectural decisions that should be made now to support them (e.g., notification system - now implemented, multi-currency support, external integrations)?

**9. Database Schema Management**
How is the Supabase database schema managed and deployed? Are there migration files, schema versioning, or a process for applying database changes to production? Where is the schema documentation?

**10. Performance Benchmarks**
What are the current performance benchmarks and monitoring strategies for the draw algorithm with large participant counts and complex exclusion rules? Are there known performance limits?

**11. Environment Configuration**
How should contributors handle environment variable configuration for local development, testing, and CI/CD? Is there an `.env.example` file or documentation for all required environment variables?

**12. Release Process**
What is the code review and release process? Are there specific reviewers for different areas of the codebase? How are changes merged to master and deployed to production? (Current branch: `feature/update-gift-result-text` suggests feature branch workflow)

## Next Steps

### Recommended Onboarding Path

Based on file analysis and change frequency patterns, follow this structured approach:

### Phase 1: Environment Setup & Initial Exploration (Day 1)

**1. Set up the development environment:**
- Install Node.js v22.14.0 (use nvm with `.nvmrc`)
- Run `npm install`
- Configure `.env` file with Supabase credentials (see `.github/DEPLOYMENT-SETUP.md`)
- Start dev server: `npm run dev` at http://localhost:4321
- Verify Playwright browsers: `npx playwright install chromium`

**2. Explore the running application:**
- Create a test group with 3-5 participants
- Add exclusion rules (try both unidirectional and bidirectional)
- Observe validation behavior
- Execute a draw and view results
- **Goal:** Understand user journey and business logic from user perspective

**3. Run the test suite:**
- Unit tests: `npm run test`
- Unit tests with coverage: `npm run test:coverage`
- E2E tests: `npm run dev:e2e` (separate terminal), then `npm run test:e2e`
- **Goal:** Understand test output and coverage expectations

### Phase 2: Type System & Architecture (Day 2)

**4. Study the type system (CRITICAL FIRST STEP):**
Read in this order:
- `src/types.ts` (683 lines, 12 changes) - Start here! This is the contract for everything
  - Note the DTO pattern (API responses)
  - Note the ViewModel pattern (computed UI fields)
  - Note the Command pattern (API mutations)
  - Understand the flow: Database types → DTOs → ViewModels → Components

**5. Understand the API layer patterns:**
- `src/pages/api/groups/index.ts` (10 changes) - Study the guard clause pattern
  - Note numbered comments documenting validation sequence
  - Observe Zod validation usage
  - See how GroupService is called
  - Understand error response standardization
- `src/pages/api/participants/[participantId].ts` (9 changes) - See authorization patterns
  - Note owner verification
  - Note draw-state-aware validation
  - See business rules enforcement

**6. Examine the service layer:**
- `src/lib/services/results.service.ts` (504 lines, 10 changes) - Most complex service
  - Study dual-access patterns (authenticated + token-based)
  - Note permission validation before data exposure
  - See multi-table query patterns
- `src/lib/services/draw.service.ts` - **CRITICAL** algorithm (recent bug fixed Nov 2)
  - Read the algorithm logic carefully
  - Study the tests in `__tests__/draw.service.test.ts`
  - Understand exclusion rule validation

### Phase 3: Frontend Architecture (Day 3)

**7. Study the central orchestration component:**
- `src/components/group/GroupView.tsx` (216 lines, 10 changes) - **REFERENCE IMPLEMENTATION**
  - This demonstrates the project's state management philosophy
  - Note how 8 custom hooks are composed
  - Observe React 19 useOptimistic usage
  - See modal state management with `useModalState`
  - Understand the pattern: separate hooks for data, actions, UI state

**8. Examine form patterns:**
- `src/components/forms/CreateGroupForm.tsx` (12 changes) - Primary user entry point
  - Study React Hook Form + Zod integration
  - Note notification system usage
  - See validation error handling
- `src/components/group/AddExclusionForm.tsx` (240 lines, 10 changes) - Complex form
  - Note bidirectional logic implementation
  - See duplicate validation
  - Understand the type challenges (recent Nov 2 fixes)

**9. Understand the component patterns:**
- `src/components/group/DrawConfirmationModal.tsx` (11 changes) - Critical safety gate
  - Study the confirmation pattern
  - Note warning displays
  - See loading state management
- `src/components/group/ParticipantsList.tsx` - Dual-mode display
  - Note pre-draw vs post-draw rendering
  - See status indicators implementation

### Phase 4: Deep Dives (Days 4-5)

**10. Trace complete feature flows:**

**Flow 1: Create Group → Add Participants → Execute Draw**
1. Start: `CreateGroupForm.tsx`
2. Hook: `useCreateGroup.ts`
3. API: `api/groups/index.ts` (POST)
4. Service: `group.service.ts`
5. Result: Navigate to GroupView

**Flow 2: Add Exclusion Rules**
1. Start: `AddExclusionForm.tsx`
2. Hook: `useExclusions.ts`
3. API: `api/exclusions/index.ts`
4. Service: `exclusion-rule.service.ts`

**Flow 3: Execute Draw**
1. Start: `DrawConfirmationModal.tsx`
2. Hook: `useDraw.ts`
3. API: `api/groups/[groupId]/draw/index.ts`
4. Service: `draw.service.ts` (critical algorithm)
5. Result: Assignments created

**Flow 4: View Result (Token-Based)**
1. Start: `results/[token]/index.astro`
2. Hook: `useResultData.ts`
3. API: `api/results/[token]/index.ts`
4. Service: `results.service.ts` (dual-access logic)

**11. Study recent critical changes:**
Review these specific commits to understand recent issues and fixes:
- **Nov 2, 2025:** Draw algorithm randomness fix (commit: e0e94b9)
- **Nov 2, 2025:** Type inconsistency fixes in AddExclusionForm (commit: 1755ac6)
- **Oct 31, 2025:** Centralized notification system (commit: a0f06de)
- **Oct 22-23, 2025:** Multiple authentication fixes
- **Oct 17, 2025:** Component refactoring with handler extraction (commit: decb237)

**12. Review Pull Requests for architectural context:**
- PR #15: Gift result text updates (Nov 2025)
- PR #14: Draw algorithm fixes (Nov 2025)
- PR #13 & #12: Mobile improvements
- PR #11: Landing page redesign
- Earlier PRs: Deployment setup and CI/CD configuration

### Phase 5: Contributing (Day 6+)

**13. Documentation improvements to consider:**

Based on analysis findings, these documentation additions would be valuable:
1. **Architecture Decision Records (ADRs):**
   - Why no Redux/Zustand? (Document state management philosophy)
   - Why centralized notification system? (Oct 31 decision)
   - Authentication patterns and lessons from Oct 22-23 fixes

2. **Type System Guide:**
   - When to use DTOs vs ViewModels vs Commands
   - How to make breaking type changes
   - ViewModel transformation examples

3. **State Management Patterns:**
   - When to use useOptimistic vs regular state
   - Custom hook composition patterns (using GroupView as reference)
   - Modal state management guide

4. **Security Checklist:**
   - API endpoint security requirements
   - Authentication vs authorization patterns
   - Token generation and validation best practices

5. **Testing Guidelines:**
   - Which layer to test what
   - Critical paths requiring tests (draw algorithm, authentication)
   - Explanation of coverage threshold decisions

**14. Start contributing:**
- Pick a good first issue (look for `good-first-issue` label)
- Start with documentation improvements or test additions
- Ensure pre-commit hooks are working (`npm run lint`, `npm run format`)
- Follow the feature branch workflow (current branch: `feature/update-gift-result-text`)
- Run full test suite before opening PR

## Development Environment Setup

1. **Prerequisites:** Node.js v22.14.0 (as specified in `.nvmrc` - recommend using nvm), Git
2. **Dependency Installation:** `npm install`
3. **Environment Variables:** Create a `.env` file in the project root with Supabase configuration (e.g., `SUPABASE_URL`, `SUPABASE_ANON_KEY`). Consult `.github/DEPLOYMENT-SETUP.md` and `.github/SECRETS_SETUP.md` for required variables. An `.env.example` file may be needed for reference.
4. **Running the Application/Service:** `npm run dev` (starts development server at http://localhost:4321)
5. **Building the Project:** `npm run build` (creates production build), `npm run preview` (preview production build locally)
6. **Running Tests:**
   - Unit tests: `npm run test` or `npm run test:watch` for watch mode
   - Unit tests with coverage: `npm run test:coverage`
   - E2E tests: `npm run test:e2e` (requires dev server running separately with `npm run dev:e2e`)
   - E2E with UI: `npm run test:e2e:ui`
7. **Code Quality:**
   - Linting: `npm run lint` (check) or `npm run lint:fix` (auto-fix)
   - Formatting: `npm run format`
8. **Common Issues:**
   - Playwright browsers not installed: Run `npx playwright install chromium`
   - Supabase connection errors: Verify environment variables are correctly set
   - Port 4321 already in use: Kill the process or change the port in Astro config

## Helpful Resources

- **Documentation:**
  - Project README: [README.md](../README.md)
  - Testing Guide: [TESTING.md](../TESTING.md)
  - Deployment Setup: [.github/DEPLOYMENT-SETUP.md](.github/DEPLOYMENT-SETUP.md)
  - CI/CD Pipeline: [.github/README.md](.github/README.md)
  - Cloudflare Deployment: [CLOUDFLARE-DEPLOYMENT.md](../CLOUDFLARE-DEPLOYMENT.md)
  - Project Requirements (Polish): [CLAUDE.md](../CLAUDE.md) - comprehensive PRD
- **Issue Tracker:** https://github.com/paulinaCzekaj/10xdev-project-secret-santa/issues (inferred from repository structure)
- **Contribution Guide:** Not found in checked files - consult with team lead
- **Communication Channels:** Not found in checked files - consult with team lead
- **Learning Resources:**
  - Astro Documentation: https://docs.astro.build
  - React 19 Documentation: https://react.dev
  - Supabase Documentation: https://supabase.com/docs
  - Shadcn/ui Components: https://ui.shadcn.com
  - Vitest Documentation: https://vitest.dev
  - Playwright Documentation: https://playwright.dev

---

## Document Update Summary

**Last Updated:** Based on comprehensive git history and file analysis (November 2025)

### What Was Added to This Document

This onboarding document was significantly enhanced with insights from detailed code analysis:

**New Sections:**
1. **Development Timeline** - Complete chronological view of project evolution through 4 distinct phases
2. **Top Files by Change Frequency** - Data-driven identification of 10 most critical files with onboarding priorities
3. **Development Phases & Expertise Areas** (under Key Contributors) - Detailed timeline of technical contributions

**Enhanced Sections:**
1. **Core Modules** - Added `src/types.ts` as a core module with detailed explanation of its architectural significance
2. **Overall Takeaways & Recent Focus** - Restructured with:
   - Four development phases (Foundation, Hardening, Deployment, Polish)
   - Current state analysis (feature-complete for MVP)
   - Seven key technical achievements with specific examples
3. **Potential Complexity/Areas to Note** - Significantly expanded with:
   - High-change-rate files as complexity indicators
   - Eight critical complexity areas with risk levels
   - Specific dates and commits for recent issues (draw algorithm bug, authentication fixes, type inconsistencies)
4. **Questions for the Team** - Added 7 new critical questions based on analysis findings:
   - Draw algorithm bug investigation
   - Authentication fixes context
   - Type system evolution strategy
   - Test coverage threshold reduction explanation
   - Centralized notification system rationale
   - Bidirectional exclusions complexity
   - State management documentation
5. **Next Steps** - Completely restructured into 5-phase onboarding path:
   - Day-by-day recommended file reading order
   - Four complete feature flow traces
   - Specific commits to review with dates and hashes
   - Documentation improvement recommendations

### Key Insights Documented

**From Git History:**
- Critical draw algorithm bug fixed November 2, 2025
- Multiple authentication fixes October 22-23, 2025 indicating initial implementation complexity
- Centralized notification system October 31, 2025 affecting 7+ files
- Type safety improvements throughout (types.ts: 12 changes)
- Project in stabilization phase (recent commits focus on polish, not features)

**From File Analysis:**
- types.ts (683 lines) is architectural backbone with 12 changes
- results.service.ts (504 lines) is most complex service
- GroupView.tsx (216 lines) demonstrates reference architecture pattern
- API layer uses guard clause pattern with numbered comments
- No external state management library (React 19 useOptimistic + custom hooks)

**Preserved from Original:**
- All core module descriptions
- Project overview and structure
- Development environment setup instructions
- Helpful resources links
- Original questions for the team (now augmented with new ones)

This enhanced document provides new developers with concrete, data-driven guidance based on actual codebase analysis rather than just documentation review.
