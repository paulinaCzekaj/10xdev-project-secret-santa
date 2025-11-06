Jesteś wykwalifikowanym architektem frontend, którego zadaniem jest zaktualizowanie kompleksowej architektury interfejsu użytkownika w oparciu o dokument wymagań produktu (PRD), plan API i notatki z sesji planowania. Twoim celem jest zaktualizowanie struktury interfejsu użytkownika, która skutecznie spełnia wymagania produktu, jest zgodna z możliwościami API i zawiera spostrzeżenia z sesji planowania.

Najpierw dokładnie przejrzyj następujące dokumenty:

Dokument wymagań produktu (PRD):
<prd>
{{prd}} <- zamień na referencję do @prd.md
</prd>

Plan API:
<api_plan>
{{api-plan}} <- zamień na referencję do @api-plan.md
</api_plan>

Session Notes:
<session_notes>
- ID: US-015
- Tytuł: AI-generowanie listu do Mikołaja (Wersja 1.1)
- Opis: Jako uczestnik losowania (zarejestrowany lub niezarejestrowany), chcę móc wygenerować swój list do świętego Mikołaja z pomocą AI, aby łatwiej stworzyć atrakcyjną i konkretną listę życzeń w ciepłym, świątecznym tonie.
- Kryteria akceptacji:
  1.  Na stronie wyniku losowania, obok pola edycji listy życzeń, znajduje się przycisk "Wygeneruj list do Mikołaja z pomocą AI" z ikoną sparkles.
  2.  Przycisk wyświetla licznik pozostałych generowań (3 dla niezarejestrowanych, 5 dla zalogowanych, per-grupa).
  3.  Po kliknięciu przycisku wyświetla się modal z prostym formularzem zawierającym jedno pole tekstowe na prompt (preferencje/zainteresowania).
  4.  Po wpisaniu promptu i kliknięciu "Generuj" wyświetla się loading state z animacją.
  5.  System wysyła request do OpenRouter API (model openai/gpt-4o-mini) z promptem użytkownika i kontekstem świątecznym.
  6.  Po otrzymaniu odpowiedzi wyświetla się modal z podglądem wygenerowanego listu do Mikołaja zawierającego: emoji świąteczne, ciepły narracyjny ton komunikacji (nie sucha lista punktów), sformatowaną treść z listą życzeń.
  7.  W modalu podglądu dostępne są trzy opcje: "Akceptuj", "Odrzuć", "Generuj ponownie".
  8.  Po kliknięciu "Akceptuj" wygenerowana treść jest wstawiana do pola edycji listy życzeń i licznik generowań zmniejsza się o 1.
  9.  Po kliknięciu "Odrzuć" modal zamyka się, licznik generowań zmniejsza się o 1, pole listy życzeń pozostaje niezmienione.
  10. Po kliknięciu "Generuj ponownie" proces generowania powtarza się z tym samym promptem, licznik zmniejsza się o kolejną 1.
  11. Użytkownik może edytować wygenerowaną treść po jej zaakceptowaniu jak zwykły tekst.
  12. Po wykorzystaniu wszystkich generowań przycisk staje się nieaktywny z komunikatem "Wykorzystałeś wszystkie generowania AI".
  13. System zapisuje w bazie danych licznik użyć AI per-participant-per-grupa.
  14. Wygenerowany list zawiera maksymalnie 1000 znaków i jest zgodny z limitami pola listy życzeń (10000 znaków).
  
  ### 7.5. System Prompt dla AI

```
Jesteś asystentem pomagającym tworzyć listy do świętego Mikołaja na Gwiazdkę (Secret Santa).

Zadanie:
Na podstawie preferencji użytkownika wygeneruj ciepły, narracyjny list do Mikołaja zawierający listę życzeń.

Wytyczne:
1. Użyj formy listu (np. "Drogi Mikołaju,..." lub "Hej Mikołaju!")
2. Ton ma być ciepły, personalny i świąteczny (nie oficjalny czy suchy)
3. Zawrzyj pomysły na prezenty wysłane przez użytkownika w narracji listu
4. Dodaj emoji świąteczne (🎁, 🎄, ⭐, 🎅, ❄️, 🔔)
5. Maksymalnie 1000 znaków
6. Odpowiadaj TYLKO po polsku
7. Zakończ list w ciepły, świąteczny sposób

Przykład:
Cześć Mikołaju! 🎅

W tym roku byłam/em grzeczna/y i marze o kilku rzeczach pod choinkę 🎄. Mega chciałabym/bym dostać "Wiedźmin: Ostatnie życzenie" Sapkowskiego 📚, bo fantasy to moja ulubiona bajka! Poza tym uwielbiam dobrą kawę ☕ - jakiś ciekawy zestaw z różnych zakątków świata byłby super. I jeszcze ciepły, kolorowy szalik 🧣, bo zima idzie!

Dzięki i wesołych Świąt! ⭐
</session_notes>

Twoim zadaniem jest stworzenie aktualizacji szczegółowej architektury interfejsu użytkownika, która obejmuje niezbędne widoki, mapowanie podróży użytkownika, strukturę nawigacji i kluczowe elementy dla każdego widoku. Projekt powinien uwzględniać doświadczenie użytkownika, dostępność i bezpieczeństwo.

Wykonaj następujące kroki, aby ukończyć zadanie:

1. Dokładnie przeanalizuj PRD, plan API i notatki z sesji.
2. Wyodrębnij i wypisz kluczowe wymagania z PRD.
3. Zidentyfikuj i wymień główne punkty końcowe API i ich cele.
4. Utworzenie listy wszystkich niezbędnych widoków na podstawie PRD, planu API i notatek z sesji.
5. Określenie głównego celu i kluczowych informacji dla każdego widoku.
6. Zaplanuj podróż użytkownika między widokami, w tym podział krok po kroku dla głównego przypadku użycia.
7. Zaprojektuj strukturę nawigacji.
8. Zaproponuj kluczowe elementy interfejsu użytkownika dla każdego widoku, biorąc pod uwagę UX, dostępność i bezpieczeństwo.
9. Rozważ potencjalne przypadki brzegowe lub stany błędów.
10. Upewnij się, że architektura interfejsu użytkownika jest zgodna z planem API.
11. Przejrzenie i zmapowanie wszystkich historyjek użytkownika z PRD do architektury interfejsu użytkownika.
12. Wyraźne mapowanie wymagań na elementy interfejsu użytkownika.
13. Rozważ potencjalne punkty bólu użytkownika i sposób, w jaki interfejs użytkownika je rozwiązuje.

Dla każdego głównego kroku pracuj wewnątrz tagów <ui_architecture_planning> w bloku myślenia, aby rozbić proces myślowy przed przejściem do następnego kroku. Ta sekcja może być dość długa. To w porządku, że ta sekcja może być dość długa.

Przedstaw ostateczną architekturę interfejsu użytkownika w następującym formacie Markdown:

```markdown
# Architektura UI dla [Nazwa produktu]

## 1. Przegląd struktury UI

[Przedstaw ogólny przegląd struktury UI]

## 2. Lista widoków

[Dla każdego widoku podaj:
- Nazwa widoku
- Ścieżka widoku
- Główny cel
- Kluczowe informacje do wyświetlenia
- Kluczowe komponenty widoku
- UX, dostępność i względy bezpieczeństwa]

## 3. Mapa podróży użytkownika

[Opisz przepływ między widokami i kluczowymi interakcjami użytkownika]

## 4. Układ i struktura nawigacji

[Wyjaśnij, w jaki sposób użytkownicy będą poruszać się między widokami]

## 5. Kluczowe komponenty

[Wymień i krótko opisz kluczowe komponenty, które będą używane w wielu widokach].
```

Skup się wyłącznie na architekturze interfejsu użytkownika, podróży użytkownika, nawigacji i kluczowych elementach dla każdego widoku. Nie uwzględniaj szczegółów implementacji, konkretnego projektu wizualnego ani przykładów kodu, chyba że są one kluczowe dla zrozumienia architektury.

Końcowy rezultat powinien składać się wyłącznie z architektury UI w formacie Markdown w języku polskim, aktualizacja pliku .ai/ui-plan.md. Nie powielaj ani nie powtarzaj żadnej pracy wykonanej w bloku myślenia.