# 🚀 Setup Cloudflare Pages - Szybki Start

## ✅ Co zostało zrobione

Projekt został w pełni przygotowany do deploymentu na Cloudflare Pages z automatycznym CI/CD przez GitHub Actions.

### Nowe pliki:
- ✅ `.github/workflows/master.yml` - Workflow CI/CD dla deploymentu
- ✅ `.github/DEPLOYMENT-SETUP.md` - Szczegółowa dokumentacja konfiguracji
- ✅ `CHANGELOG-CLOUDFLARE.md` - Lista wszystkich wprowadzonych zmian

### Zaktualizowane pliki:
- ✅ `.github/workflows/pull-request.yml` - Poprawiono parametr codecov
- ✅ `wrangler.toml` - Zaktualizowano datę kompatybilności
- ✅ `README.md` - Dodano sekcję Deployment
- ✅ `CLOUDFLARE-DEPLOYMENT.md` - Rozszerzono dokumentację

---

## 🎯 Co musisz zrobić teraz

### Krok 1: Uzyskaj Cloudflare API Token

1. Zaloguj się na [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Kliknij na swój profil → **My Profile** → **API Tokens**
3. Kliknij **Create Token**
4. Wybierz **Edit Cloudflare Workers** lub stwórz custom token z uprawnieniami:
   - Account → **Cloudflare Pages** → **Edit**
5. Kliknij **Continue to summary** → **Create Token**
6. **Skopiuj token** (nie będzie już widoczny później!)

### Krok 2: Znajdź Cloudflare Account ID

1. W [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Wybierz swoją strefę/domenę
3. W prawym panelu znajdziesz **Account ID**
4. Skopiuj Account ID

### Krok 3: Dodaj GitHub Secrets

1. Przejdź do swojego repozytorium na GitHub
2. Kliknij **Settings** → **Secrets and variables** → **Actions**
3. Kliknij **New repository secret** i dodaj (łącznie 6 secrets):

#### Wymagane Cloudflare Secrets:
| Nazwa | Wartość |
|-------|---------|
| `CLOUDFLARE_API_TOKEN` | Token z Kroku 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID z Kroku 2 |

#### Wymagane Supabase Secrets:
| Nazwa | Wartość | Gdzie znaleźć |
|-------|---------|---------------|
| `SUPABASE_URL` | `https://xxx.supabase.co` | Supabase Dashboard → Settings → API |
| `SUPABASE_KEY` | Anon/Public Key | Supabase Dashboard → Settings → API → anon public |
| `PUBLIC_SUPABASE_URL` | To samo co `SUPABASE_URL` | - |
| `PUBLIC_SUPABASE_ANON_KEY` | To samo co `SUPABASE_KEY` | - |

### Krok 4: Utwórz Cloudflare Pages Project

1. W [Cloudflare Dashboard](https://dash.cloudflare.com/) przejdź do **Workers & Pages**
2. Kliknij **Create application** → **Pages**
3. Wybierz **Direct Upload**
4. Nazwa projektu: **`secret-santa-app`** (ważne - zgodne z `wrangler.toml`)
5. Kliknij **Create project**

### Krok 5: Utwórz KV Namespace (dla sesji)

1. W Cloudflare Dashboard przejdź do **Workers & Pages** → **KV**
2. Kliknij **Create namespace**
3. Nazwa: `secret-santa-sessions`
4. Kliknij **Add**
5. **Skopiuj Namespace ID** który się pojawi
6. Otwórz plik `wrangler.toml` i zaktualizuj:
   ```toml
   [[kv_namespaces]]
   binding = "SESSION"
   id = "WKLEJ-TUTAJ-NAMESPACE-ID"
   preview_id = "OPCJONALNY-PREVIEW-ID"
   ```

### Krok 6: Testuj Deployment

1. Commit i push zmian do brancha `master`:
   ```bash
   git add .
   git commit -m "Configure Cloudflare Pages deployment"
   git push origin master
   ```

2. Przejdź do zakładki **Actions** w repozytorium GitHub
3. Obserwuj wykonanie workflow "Deploy to Cloudflare Pages"
4. Po sukcesie, aplikacja będzie dostępna pod adresem Cloudflare Pages

---

## 📚 Dodatkowa dokumentacja

- **Szczegółowa konfiguracja**: [.github/DEPLOYMENT-SETUP.md](.github/DEPLOYMENT-SETUP.md)
- **Lista zmian**: [CHANGELOG-CLOUDFLARE.md](CHANGELOG-CLOUDFLARE.md)
- **Cloudflare Deployment**: [CLOUDFLARE-DEPLOYMENT.md](CLOUDFLARE-DEPLOYMENT.md)

---

## 🆘 Troubleshooting

### Deployment failuje z błędem 401/403
- Sprawdź czy `CLOUDFLARE_API_TOKEN` ma poprawne uprawnienia (Cloudflare Pages - Edit)
- Sprawdź czy `CLOUDFLARE_ACCOUNT_ID` jest poprawny

### Build failuje z "Missing environment variables"
- Upewnij się, że wszystkie Supabase secrets są ustawione w GitHub
- Sprawdź czy nazwy secrets są dokładnie takie jak w dokumentacji (case-sensitive!)

### "Project not found" podczas deploymentu
- Upewnij się, że nazwa projektu w Cloudflare Pages to dokładnie `secret-santa-app`
- Alternatywnie, zmień `--project-name` w pliku `.github/workflows/master.yml`

### KV binding error
- Sprawdź czy KV namespace istnieje w Cloudflare Dashboard
- Sprawdź czy ID w `wrangler.toml` jest poprawne (skopiowane z Cloudflare Dashboard)

---

## 🎉 Gotowe!

Po wykonaniu wszystkich kroków, każdy push do brancha `master` będzie automatycznie:
1. Sprawdzał jakość kodu (lint)
2. Uruchamiał testy jednostkowe
3. Budował aplikację
4. Deployował na Cloudflare Pages

Twoja aplikacja będzie dostępna globalnie z wykorzystaniem Cloudflare CDN! 🚀

