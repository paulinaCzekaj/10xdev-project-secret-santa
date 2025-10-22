# Cloudflare Pages Deployment Guide

## 1. Konfiguracja GitHub Secrets

Aby umożliwić automatyczny deployment przez GitHub Actions, ustaw następujące secrets w repozytorium:

1. Przejdź do Settings → Secrets and variables → Actions
2. Dodaj następujące secrets:

### Cloudflare Secrets:
```
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
```

### Supabase Secrets:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Jak uzyskać Cloudflare API Token:
1. Zaloguj się do Cloudflare Dashboard
2. Przejdź do My Profile → API Tokens
3. Utwórz token z uprawnieniami "Cloudflare Pages - Edit"
4. Skopiuj token do GitHub Secrets jako `CLOUDFLARE_API_TOKEN`

### Jak uzyskać Cloudflare Account ID:
1. Zaloguj się do Cloudflare Dashboard
2. Wybierz swoją domenę
3. Account ID znajdziesz w prawym panelu
4. Skopiuj ID do GitHub Secrets jako `CLOUDFLARE_ACCOUNT_ID`

## 2. Automatyczny Deployment przez GitHub Actions

Projekt jest skonfigurowany do automatycznego deploymentu na Cloudflare Pages przy każdym push do brancha `master`.

### Workflow wykonuje następujące kroki:
1. **Lint**: Sprawdzenie jakości kodu
2. **Unit Tests**: Uruchomienie testów jednostkowych z coverage
3. **Build & Deploy**: Zbudowanie aplikacji i wdrożenie na Cloudflare Pages

### Build Settings (dla ręcznej konfiguracji w Cloudflare):
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (lub zostaw puste)

## 3. Konfiguracja KV Namespace

1. Przejdź do Cloudflare Dashboard → Workers & Pages → KV
2. Utwórz nowy namespace o nazwie "secret-santa-sessions"
3. Skopiuj ID namespace
4. Zaktualizuj `wrangler.toml`:
```toml
[[kv_namespaces]]
binding = "SESSION"
id = "your-actual-kv-namespace-id"
preview_id = "your-actual-preview-kv-namespace-id"
```

## 4. Deployment Steps (Opcjonalne - Ręczne)

### Opcja A: Przez GitHub (Zalecane)
1. Połącz repozytorium GitHub z Cloudflare Pages
2. Ustaw zmienne środowiskowe w Cloudflare Dashboard
3. Cloudflare automatycznie zbuduje i wdroży przy każdym push

### Opcja B: Przez Wrangler CLI
```bash
# Zainstaluj Wrangler
npm install -g wrangler

# Zaloguj się
wrangler login

# Wdróż
wrangler pages deploy dist
```

## 5. Troubleshooting

### Częste problemy:
- **Build fails**: Sprawdź czy wszystkie dependencies są w `dependencies`, nie `devDependencies`
- **Environment variables**: Upewnij się, że wszystkie zmienne są ustawione w Cloudflare Dashboard
- **KV binding error**: Sprawdź czy KV namespace istnieje i ID jest poprawne

### Logi:
- Sprawdź logi w Cloudflare Dashboard → Pages → Twój projekt → Functions
- Użyj `wrangler tail` do monitorowania w czasie rzeczywistym
