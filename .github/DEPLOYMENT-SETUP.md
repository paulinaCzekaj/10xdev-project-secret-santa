# Deployment Setup - Cloudflare Pages z GitHub Actions

## Wprowadzenie

Projekt jest skonfigurowany do automatycznego deploymentu na Cloudflare Pages przy każdym push do brancha `master`. Poniżej znajdują się instrukcje konfiguracji.

## 1. Wymagane GitHub Secrets

Aby workflow działał poprawnie, musisz skonfigurować następujące secrets w repozytorium GitHub:

### Krok po kroku:
1. Przejdź do swojego repozytorium na GitHub
2. Kliknij **Settings** → **Secrets and variables** → **Actions**
3. Kliknij **New repository secret** i dodaj każdy z poniższych secrets:

### Cloudflare Secrets

#### `CLOUDFLARE_API_TOKEN`
- **Jak uzyskać:**
  1. Zaloguj się do [Cloudflare Dashboard](https://dash.cloudflare.com/)
  2. Przejdź do **My Profile** → **API Tokens**
  3. Kliknij **Create Token**
  4. Wybierz template **Edit Cloudflare Workers** lub stwórz custom token z uprawnieniami:
     - Account → Cloudflare Pages → Edit
     - Zone → Workers Scripts → Edit (jeśli używasz Workers)
  5. Skopiuj wygenerowany token i dodaj jako secret

#### `CLOUDFLARE_ACCOUNT_ID`
- **Jak uzyskać:**
  1. Zaloguj się do [Cloudflare Dashboard](https://dash.cloudflare.com/)
  2. Wybierz swoją strefę (domenę)
  3. W prawym panelu znajdziesz **Account ID**
  4. Skopiuj Account ID i dodaj jako secret

### Supabase Secrets

#### `SUPABASE_URL`
- URL twojego projektu Supabase, np. `https://abcdefgh.supabase.co`
- Znajdziesz w Supabase Dashboard → Project Settings → API

#### `SUPABASE_KEY` 
- Anon/Public Key z Supabase
- Znajdziesz w Supabase Dashboard → Project Settings → API → Project API keys → `anon` `public`

#### `PUBLIC_SUPABASE_URL`
- To samo co `SUPABASE_URL`
- Prefiks `PUBLIC_` oznacza, że może być dostępny w kodzie po stronie klienta

#### `PUBLIC_SUPABASE_ANON_KEY`
- To samo co `SUPABASE_KEY`
- Prefiks `PUBLIC_` oznacza, że może być dostępny w kodzie po stronie klienta


### Opcjonalny Secret dla Codecov

#### `CODECOV_TOKEN`
- Token do uploadowania raportów coverage do Codecov
- Jeśli nie używasz Codecov, możesz pominąć ten krok
- Znajdziesz w [Codecov Dashboard](https://codecov.io/) → Settings

## 2. Konfiguracja Cloudflare Pages Project

Przed pierwszym deploymentem musisz utworzyć projekt w Cloudflare Pages:

1. Zaloguj się do [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Przejdź do **Workers & Pages**
3. Kliknij **Create application** → **Pages**
4. Wybierz **Direct Upload** (GitHub Actions będzie przesyłać pliki)
5. Nazwa projektu: `secret-santa-app` (zgodne z `wrangler.toml`)

## 3. Konfiguracja KV Namespace (dla sesji)

Projekt używa Cloudflare KV do przechowywania sesji użytkowników:

1. W Cloudflare Dashboard przejdź do **Workers & Pages** → **KV**
2. Kliknij **Create namespace**
3. Nazwa: `secret-santa-sessions`
4. Skopiuj **Namespace ID**
5. Zaktualizuj `wrangler.toml`:
   ```toml
   [[kv_namespaces]]
   binding = "SESSION"
   id = "skopiowany-namespace-id"
   preview_id = "opcjonalny-preview-namespace-id"
   ```

## 4. Workflow CI/CD

### `.github/workflows/master.yml`

> **ℹ️ Informacja techniczna**: Projekt używa `cloudflare/wrangler-action@v3` do deploymentu na Cloudflare Pages. Jest to oficjalna, zalecana metoda od Cloudflare. Starsza akcja `cloudflare/pages-action` została zdeprecjonowana i nie powinna być używana w nowych projektach.

Workflow wykonuje następujące kroki:

1. **Lint** - sprawdzenie jakości kodu
2. **Unit Tests** - uruchomienie testów jednostkowych z coverage
3. **Build & Deploy** - zbudowanie aplikacji i deployment na Cloudflare Pages

### Triggery:
- Automatycznie przy każdym `push` do brancha `master`

### Jobs:
- `lint` - sprawdzenie kodu ESLint
- `unit-tests` - testy jednostkowe z Vitest
- `build-and-deploy` - build aplikacji i wdrożenie przez Wrangler
- `status-notification` - informacja o statusie deploymentu

## 5. Weryfikacja konfiguracji

Aby sprawdzić czy wszystko działa poprawnie:

1. Upewnij się, że wszystkie secrets są ustawione
2. Push zmian do brancha `master`
3. Przejdź do zakładki **Actions** w repozytorium GitHub
4. Obserwuj wykonanie workflow
5. Po sukcesie, aplikacja powinna być dostępna pod adresem Cloudflare Pages

## 6. Troubleshooting

### Deployment fails z błędem 401/403
- Sprawdź czy `CLOUDFLARE_API_TOKEN` jest poprawny i ma odpowiednie uprawnienia
- Sprawdź czy `CLOUDFLARE_ACCOUNT_ID` jest poprawny

### Build fails z błędem "Missing environment variables"
- Sprawdź czy wszystkie Supabase secrets są ustawione
- Upewnij się, że nazwy secrets są dokładnie takie jak w workflow

### KV binding error
- Sprawdź czy KV namespace istnieje w Cloudflare Dashboard
- Sprawdź czy ID w `wrangler.toml` jest poprawne

### Więcej informacji
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)

