# 📚 Dokumentacja Projektu Secret Santa

Witaj w dokumentacji projektu Secret Santa! Ta dokumentacja jest zorganizowana w sposób ułatwiający nawigację i znajdowanie potrzebnych informacji.

## 📁 Struktura Dokumentacji

### 👥 Dokumentacja Użytkownika (`docs/user/`)

Dokumentacja dla użytkowników końcowych aplikacji.

- **[README.md](../README.md)** - Główna dokumentacja projektu (pozostaje w katalogu głównym dla kompatybilności z GitHub)
- **[POSTMAN-README.md](user/api-testing.md)** - Przewodnik testowania API z Postman
- **[curl-examples.md](user/api-examples.md)** - Przykłady użycia API z cURL

### 🛠️ Dokumentacja Deweloperska (`docs/developer/`)

Dokumentacja techniczna dla programistów pracujących nad projektem.

- **[DOCUMENTATION.md](developer/project-overview.md)** - Ogólny opis projektu i wymagań

### 🚀 Dokumentacja Deploymentu (`docs/deployment/`)

Instrukcje wdrażania aplikacji w różnych środowiskach.

- **[SETUP-CLOUDFLARE.md](deployment/cloudflare-setup.md)** - Szybki start z Cloudflare Pages
- **[CLOUDFLARE-DEPLOYMENT.md](deployment/cloudflare-deployment.md)** - Szczegółowa dokumentacja deploymentu
- **[CHANGELOG-CLOUDFLARE.md](deployment/cloudflare-changelog.md)** - Historia zmian deploymentu

### 🧪 Dokumentacja Testowania (`docs/testing/`)

Wszystko co związane z testowaniem aplikacji.

- **[TESTING.md](testing/guide.md)** - Główny przewodnik testowania
- **[TEST-COVERAGE-ANALYSIS.md](testing/coverage-analysis.md)** - Analiza pokrycia kodu testami

### 🔌 Dokumentacja API (`docs/api/`)

Dokumentacja techniczna API aplikacji.

- **[POSTMAN-README.md](api/postman-guide.md)** - Przewodnik testowania API
- **[curl-examples.md](api/curl-examples.md)** - Przykłady użycia API

### 🔒 Dokumentacja Bezpieczeństwa (`docs/security/`)

Dokumentacja modelu bezpieczeństwa i polityk dostępu.

- **[rls-policies.md](security/rls-policies.md)** - Dokumentacja Row-Level Security (RLS)

## 📄 Pliki w Katalogu Głównym

Niektóre pliki dokumentacji pozostają w katalogu głównym dla kompatybilności z platformami takimi jak GitHub:

- **README.md** - Główna dokumentacja projektu
- **CLAUDE.md** - Specyficzne instrukcje dla Claude AI
- **Secret-Santa-API.postman_collection.json** - Kolekcja Postman dla API

## 🔍 Szybkie Wyszukiwanie

### Dla Użytkowników Końcowych:

- Jak zacząć korzystać z aplikacji? → [README.md](../README.md)
- Jak testować API? → [docs/user/api-testing.md](user/api-testing.md)

### Dla Deweloperów:

- Architektura projektu → [docs/developer/project-overview.md](developer/project-overview.md)
- Polityki bezpieczeństwa (RLS) → [docs/security/rls-policies.md](security/rls-policies.md)
- Jak uruchomić testy? → [docs/testing/guide.md](testing/guide.md)
- Jak wdrożyć aplikację? → [docs/deployment/cloudflare-setup.md](deployment/cloudflare-setup.md)

### Dla Testerów:

- Strategia testowania → [docs/testing/guide.md](testing/guide.md)
- Analiza pokrycia → [docs/testing/coverage-analysis.md](testing/coverage-analysis.md)

## 📝 Konwencje

- Wszystkie pliki są w języku polskim (z wyjątkiem kodu)
- Dokumentacja jest aktualizowana wraz z rozwojem projektu
- Ważne informacje są oznaczone odpowiednimi emoji:
  - ⚠️ **Uwaga/Ważne**
  - ✅ **Gotowe/Zrobione**
  - 🚧 **W trakcie/W budowie**
  - ❌ **Błąd/Nie działa**

## 🤝 Przyczynianie się

Jeśli chcesz poprawić dokumentację:

1. Sprawdź czy zmiany są potrzebne w odpowiednim pliku
2. Zachowaj spójność formatowania
3. Zaktualizuj ten przewodnik jeśli dodajesz nowe pliki

---

_Ta dokumentacja jest stale aktualizowana. Jeśli czegoś brakuje lub znalazłeś błąd, zgłoś issue w repozytorium._
