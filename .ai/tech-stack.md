Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

Testowanie:

- Vitest do uruchamiania testów jednostkowych i integracyjnych, z natywną integracją z Vite
- React Testing Library (RTL) do testowania komponentów React z perspektywy użytkownika
- Playwright do testów End-to-End, umożliwiający automatyzację w prawdziwych przeglądarkach (Chromium, Firefox, WebKit)
- Mock Service Worker (MSW) do mockowania API na poziomie sieci
- Zod do testowania logiki walidacji schematów
- Storybook do tworzenia i testowania izolowanych komponentów UI
- Chromatic do automatyzacji testów wizualnej regresji
- axe-core do testowania dostępności (a11y), zintegrowany z Playwright i RTL

CI/CD i Hosting:

- Github Actions do tworzenia pipeline'ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
