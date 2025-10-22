# Cloudflare Pages Deployment Guide

## 1. Konfiguracja Cloudflare Pages

### Wymagane zmienne środowiskowe w Cloudflare Pages:
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_ACCESS_TOKEN=your-service-role-key
```

### Build Settings:
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `/` (lub zostaw puste)

## 2. Konfiguracja KV Namespace

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

## 3. Deployment Steps

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

## 4. Troubleshooting

### Częste problemy:
- **Build fails**: Sprawdź czy wszystkie dependencies są w `dependencies`, nie `devDependencies`
- **Environment variables**: Upewnij się, że wszystkie zmienne są ustawione w Cloudflare Dashboard
- **KV binding error**: Sprawdź czy KV namespace istnieje i ID jest poprawne

### Logi:
- Sprawdź logi w Cloudflare Dashboard → Pages → Twój projekt → Functions
- Użyj `wrangler tail` do monitorowania w czasie rzeczywistym
