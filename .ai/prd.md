# Dokument wymagań produktu (PRD) - Secret Santa

## 1. Przegląd produktu

Aplikacja "Secret Santa" to narzędzie webowe zaprojektowane w celu uproszczenia i automatyzacji procesu organizacji wymiany prezentów. Głównym celem produktu w wersji MVP (Minimum Viable Product) jest zapewnienie użytkownikom możliwości tworzenia grup prezentowych, zapraszania uczestników, definiowania reguł losowania oraz przeprowadzenia samego losowania w sposób w pełni zautomatyzowany i anonimowy. Aplikacja eliminuje potrzebę manualnej organizacji, gwarantując poufność i sprawiedliwość losowania, co jest szczególnie istotne w przypadku grup organizujących wymianę zdalnie. Produkt kierowany jest do wszystkich osób, które chcą zorganizować tego typu wydarzenie w gronie rodziny, przyjaciół czy współpracowników.

## 2. Problem użytkownika

Tradycyjna, manualna organizacja wymiany prezentów "Secret Santa" jest procesem czasochłonnym, podatnym na błędy i często niepraktycznym, zwłaszcza gdy uczestnicy znajdują się w różnych lokalizacjach. Główne problemy, które rozwiązuje aplikacja, to:

- Brak anonimowości: W metodach manualnych (np. losowanie karteczek z imionami) organizator często poznaje wszystkie pary, co psuje element niespodzianki.
- Logistyka: Zbieranie uczestników, ustalanie reguł (np. kto nie powinien kogo losować) i przekazywanie wyników jest trudne do skoordynowania, szczególnie zdalnie.
- Ryzyko błędu: Istnieje ryzyko, że ktoś wylosuje samego siebie lub losowanie będzie niezgodne z ustalonymi wcześniej wykluczeniami.
- Brak centralnego miejsca na informacje: Listy życzeń są często rozproszone w różnych kanałach komunikacji, co utrudnia zakup trafionego prezentu.
- Trudność w tworzeniu list życzeń: Wiele osób ma problem z wymyśleniem treści listu do świętego Mikołaja, co prowadzi do ogólnych wskazówek, bez świątecznej atmosfery.

Aplikacja "Secret Santa" adresuje te problemy, oferując scentralizowaną, zautomatyzowaną i gwarantującą poufność platformę do organizacji wymiany prezentów.

## 3. Wymagania funkcjonalne

### 3.1. Uwierzytelnianie i Zarządzanie Kontem

- Użytkownik może założyć nowe konto za pomocą adresu e-mail i hasła.
- Użytkownik może zalogować się na istniejące konto.
- Użytkownik może się wylogować ze swojego konta.
- Użytkownik może skorzystać z funkcji "Zapomniałem hasła", aby zresetować swoje hasło dostępu.

### 3.2. Zarządzanie Grupami (CRUD)

- Zalogowany użytkownik (Twórca) może stworzyć nową grupę, podając jej nazwę, budżet oraz datę zakończenia wydarzenia.
- Twórca grupy jest automatycznie dodawany jako jej uczestnik.
- Minimalna liczba uczestników w grupie, aby rozpocząć losowanie, wynosi 3.
- Twórca może dodawać uczestników do grupy, podając ich imię oraz opcjonalny adres e-mail. Adres e-mail musi być unikalny w obrębie jednej grupy.
- Twórca może edytować dane uczestników (imię, e-mail) oraz parametry grupy (nazwa, budżet) do momentu rozpoczęcia losowania.
- Twórca może usunąć stworzoną przez siebie grupę (po wyświetleniu prostego okna modalnego z potwierdzeniem).
- Każdy zalogowany użytkownik widzi na swoim pulpicie (dashboard) listę grup, które stworzył oraz tych, do których został dodany.

### 3.3. Logika Losowania

- Przed losowaniem Twórca grupy może zdefiniować jednokierunkowe reguły wykluczeń (np. "Użytkownik A nie może wylosować Użytkownika B").
- System zawiera walidację uniemożliwiającą rozpoczęcie losowania, jeśli zdefiniowane reguły wykluczeń czynią je niemożliwym do przeprowadzenia.
- Uruchomienie losowania jest możliwe tylko dla grup z co najmniej 3 uczestnikami.
- Proces losowania jest nieodwracalny – po jego zakończeniu edycja grupy jest niemożliwa.
- Algorytm losujący zapewnia, że nikt nie wylosuje samego siebie oraz że wszystkie zdefiniowane reguły wykluczeń zostaną uwzględnione.

### 3.4. Wyniki i Listy Życzeń

- Po losowaniu każdy uczestnik widzi wyłącznie imię osoby, dla której ma przygotować prezent.
- Zarejestrowani użytkownicy widzą wynik losowania po zalogowaniu się na swoje konto.
- Niezarejestrowani uczestnicy (dodani tylko z imieniem lub z e-mailem, ale bez konta) otrzymują dostęp do wyniku poprzez unikalny, trudny do odgadnięcia link.
- Zostanie zaimplementowany mechanizm śledzenia, czy unikalny link do wyniku został otwarty, kiedy i ile razy.
- Każdy uczestnik (zarejestrowany i niezarejestrowany) może stworzyć i edytować swoją listę życzeń (wishlist).
- Lista życzeń jest prostym polem tekstowym, w którym system automatycznie wykrywa i konwertuje wklejony tekst na klikalne hiperłącza.
- Edycja listy życzeń jest możliwa do upłynięcia zdefiniowanej przez Twórcę "daty zakończenia wydarzenia". Po tej dacie pole staje się tylko do odczytu.
- Na ekranie wyniku losowania użytkownik widzi: imię wylosowanej osoby, jej listę życzeń, nazwę grupy, ustalony budżet oraz własną listę życzeń z możliwością jej edycji.

#### 3.4.1. AI-generowanie listu do Mikołaja (Wersja 1.1)

- Obok pola tekstowego listy życzeń znajduje się przycisk "Wygeneruj list do Mikołaja z pomocą AI".
- Po kliknięciu przycisku wyświetla się modal z polem do wpisania preferencji/zainteresowań użytkownika.
- System wykorzystuje API OpenRouter (model openai/gpt-4o-mini) do wygenerowania spersonalizowanego listu do świętego Mikołaja zawierającego listę życzeń w tematyce świątecznej.
- Wygenerowany list ma formę narracyjną (nie suchej listy punktów), zawiera emoji świąteczne, ciepły świąteczny ton komunikacji oraz odpowiednie formatowanie.
- Użytkownik widzi podgląd wygenerowanej treści z opcjami: "Akceptuj", "Odrzuć" lub "Generuj ponownie".
- Po zaakceptowaniu treść jest automatycznie wstawiana do pola edycji listy życzeń.
- Użytkownik ma pełną możliwość edycji wygenerowanej treści po jej zaakceptowaniu.
- Liczba generowań jest limitowana per-grupa:
  - Niezarejestrowani użytkownicy: 3 generowania
  - Zarejestrowani użytkownicy: 5 generowań
- Każde wygenerowanie (nawet odrzucone) zmniejsza licznik dostępnych użyć.
- Regeneracja z tym samym promptem jest możliwa bez dodatkowych ograniczeń (w ramach dostępnych limitów).
- Licznik pozostałych generowań jest widoczny przy przycisku AI.
- Po wykorzystaniu wszystkich generowań przycisk staje się nieaktywny z odpowiednim komunikatem.

### 3.5. Wymagania Niefunkcjonalne

- Aplikacja musi być w pełni responsywna (RWD) i poprawnie wyświetlać się na urządzeniach mobilnych oraz desktopowych.
- Interfejs użytkownika musi być prosty i intuicyjny.

### 3.6. Funkcjonalność Elfa (Wersja 1.1)

- Twórca grupy może przypisać uczestnikowi rolę "Elfa" (pomocnika) dla innego uczestnika.
- Przypisanie odbywa się ręcznie podczas dodawania lub edycji uczestnika w widoku grupy.
- Jeden uczestnik może mieć maksymalnie jednego elfa (relacja 1:many od elfa do pomaganych osób).
- Jeden elf może pomagać wielu osobom (relacja 1:many od elfa do pomaganych osób).
- Przypisanie elfa jest możliwe tylko przed losowaniem.
- Po uruchomieniu losowania role elfów stają się niemutowalne.
- System automatycznie tworzy jednokierunkowe wykluczenia: każda osoba, która ma przypisanego elfa, nie może wylosować swojego elfa.
- Elf może wylosować osobę, której pomaga (wykluczenia działają tylko w jedną stronę).
- Elf zalogowany widzi na stronie swojego wyniku przyciski "Zobacz wynik [Imię] 🧝" dla każdej osoby, której pomaga.
- Po kliknięciu przycisku elf jest przekierowywany na dedykowaną stronę `/groups/[groupId]/elf-result`.
- Na tej stronie elf widzi pełny wynik losowania osoby, której pomaga: imię wylosowanej osoby, jej listę życzeń, budżet grupy.
- Elf z kontem może edytować listy życzeń osób, którym pomaga (do upłynięcia daty zakończenia wydarzenia).
- Osoba, która ma przypisanego elfa, widzi na stronie swojego wyniku informację "Twój pomocnik: [Imię] 🧝".
- System oddzielnie trackuje moment otwarcia wyniku przez elfa w kolumnie `elf_accessed_at`.
- W widoku grupy elf jest oznaczony badge "🧝 Elf dla: [Imię]".
- W widoku grupy uczestnik z elfem ma informację "Pomocnik: [Imię] 🧝".
- Niezarejestrowani elfowie (bez user_id) nie mogą otworzyć widoku `/elf-result` - elf musi być zalogowany.

## 4. Granice produktu

### 4.1. Funkcjonalności wchodzące w zakres MVP

- Pełen proces uwierzytelniania: rejestracja, logowanie, wylogowanie, reset hasła.
- Pełen cykl życia grupy: tworzenie, dodawanie/edycja członków, edycja danych grupy, usunięcie.
- Definiowanie jednokierunkowych reguł wykluczeń.
- Przeprowadzenie losowania z uwzględnieniem reguł.
- Poufny dostęp do wyników dla zalogowanych i niezalogowanych użytkowników (poprzez unikalny link).
- Tworzenie i edycja prostych list życzeń (pole tekstowe z auto-linkowaniem).

### 4.2. Funkcjonalności wyłączone z zakresu MVP

- System powiadomień (e-mail, push) o dodaniu do grupy, zbliżającym się losowaniu czy jego wyniku.
- Formalny system zaproszeń do grupy (np. dołączanie przez link lub kod).
- Wbudowany czat grupowy.
- Możliwość edycji grupy lub ponownego losowania po jego zakończeniu.
- Integracje z zewnętrznymi serwisami (np. listy życzeń z Amazon).
- Zaawansowane role użytkowników (np. współorganizator).
- Obsługa wielu walut (domyślną i jedyną walutą jest PLN).
- Dostęp do wyniku losowania poprzez podanie samego imienia (zrezygnowano na rzecz bezpieczniejszej metody unikalnych linków).

### 4.3. Funkcjonalności zrealizowane w wersji 1.1

- ✅ **AI-generowanie listu do Mikołaja**: Inteligentny asystent pomagający użytkownikom w tworzeniu spersonalizowanych listów do świętego Mikołaja zawierających listę życzeń. Funkcjonalność wykorzystuje model AI (openai/gpt-4o-mini via OpenRouter) do generowania listu w ciepłym, świątecznym tonie narracyjnym.
- ✅ **Rola Elfa (Pomocnika)**: Opcjonalna funkcjonalność umożliwiająca przypisanie uczestnika jako pomocnika dla innego uczestnika w grupie. Elf ma dostęp do wyniku losowania osoby, której pomaga, i może wspierać ją w wyborze prezentu.

### 4.4. Funkcjonalności planowane na przyszłe wersje (1.2+)

- Rozszerzenie mechanizmu śledzenia: Szczegółowe statystyki dotyczące korzystania z AI-generatora (liczba użyć, akceptacje vs odrzucenia).
- Optymalizacja UX: Udoskonalenia interfejsu na podstawie feedbacku z wersji 1.1.
- System powiadomień email: Powiadomienia o dodaniu do grupy, zakończeniu losowania, przypomnienia.
- Formalny system zaproszeń: Dołączanie do grupy przez link zapraszający lub kod.
- Możliwość ponownego losowania: Z opcją zachowania niektórych przydziałów.
- Zaawansowane role użytkowników: Współorganizator grupy.

## 5. Historyjki użytkowników

### Uwierzytelnianie i Zarządzanie Kontem

- ID: US-001
- Tytuł: Rejestracja nowego użytkownika
- Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji przy użyciu mojego adresu e-mail i hasła, aby móc tworzyć własne grupy Secret Santa.
- Kryteria akceptacji:
  1.  Formularz rejestracji zawiera pola: adres e-mail, hasło, potwierdzenie hasła.
  2.  System waliduje, czy podany adres e-mail ma poprawny format.
  3.  System sprawdza, czy podany adres e-mail nie jest już zarejestrowany.
  4.  System waliduje, czy hasło i jego potwierdzenie są identyczne.
  5.  Po pomyślnej rejestracji jestem automatycznie logowany i przekierowany na główny pulpit (dashboard).

- ID: US-002
- Tytuł: Logowanie użytkownika
- Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na moje konto, aby uzyskać dostęp do moich grup i losowań.
- Kryteria akceptacji:
  1.  Formularz logowania zawiera pola: adres e-mail, hasło.
  2.  Po podaniu poprawnych danych jestem zalogowany i przekierowany na pulpit.
  3.  Po podaniu błędnych danych widzę stosowny komunikat o błędzie.
  4.  Użytkownik może logować się do systemu poprzez przycisk w prawym górnym rogu.
  5.  Użytkownik nie może wchodzić na widok grupy bez logowania (US-005, US-006, US-007, US-008, US-009)
  6.  Użytkownik może widzieć swój wynik w losowaniu bez logowania (US-013)

- ID: US-003
- Tytuł: Resetowanie hasła
- Opis: Jako zarejestrowany użytkownik, który zapomniał hasła, chcę móc je zresetować, aby odzyskać dostęp do mojego konta.
- Kryteria akceptacji:
  1.  Na stronie logowania znajduje się link "Zapomniałem hasła".
  2.  Po kliknięciu i podaniu mojego adresu e-mail, system (w przyszłości) wysłałby link do resetu (w MVP może to być uproszczone).
  3.  Mechanizm pozwala na ustawienie nowego hasła.

- ID: US-004
- Tytuł: Wylogowanie użytkownika
- Opis: Jako zalogowany użytkownik, chcę móc się wylogować, aby zakończyć moją sesję.
- Kryteria akceptacji:
  1.  W interfejsie aplikacji znajduje się widoczny przycisk/link "Wyloguj".
  2.  Po kliknięciu zostaję wylogowany i przekierowany na stronę główną lub stronę logowania.
  3.  Użytkownik może się wylogować z systemu poprzez przycisk w prawym górnym rogu w głównym @Layout.astro.

### Zarządzanie Grupą

- ID: US-005
- Tytuł: Tworzenie nowej grupy
- Opis: Jako zalogowany użytkownik, chcę stworzyć nową grupę Secret Santa, podając jej nazwę, sugerowany budżet i datę zakończenia, abym mógł zorganizować wymianę prezentów.
- Kryteria akceptacji:
  1.  Formularz tworzenia grupy zawiera pola: nazwa grupy (tekst), budżet (liczba całkowita > 0), data zakończenia (data).
  2.  Waluta budżetu jest stała i ustawiona na PLN.
  3.  Po utworzeniu grupy jestem automatycznie dodawany jako jej pierwszy uczestnik.
  4.  Zostaję przekierowany do widoku zarządzania nowo utworzoną grupą.

- ID: US-006
- Tytuł: Dodawanie uczestników do grupy
- Opis: Jako twórca grupy, chcę móc dodawać do niej uczestników, podając ich imię i opcjonalnie adres e-mail, aby zbudować listę osób biorących udział w losowaniu.
- Kryteria akceptacji:
  1.  W widoku zarządzania grupą znajduje się formularz do dodawania uczestnika.
  2.  Formularz wymaga podania imienia i opcjonalnie adresu e-mail.
  3.  System nie pozwala na dodanie dwóch uczestników z tym samym adresem e-mail w ramach jednej grupy.
  4.  Nowo dodany uczestnik pojawia się na liście członków grupy.

- ID: US-007
- Tytuł: Definiowanie reguł wykluczeń
- Opis: Jako twórca grupy, chcę móc zdefiniować reguły, kto kogo nie może wylosować, aby uniknąć niechcianych par (np. małżeństwo losujące siebie nawzajem).
- Kryteria akceptacji:
  1.  W widoku grupy mogę dodać regułę wykluczenia, wybierając z listy uczestników osobę A i osobę B.
  2.  Reguła oznacza, że "Osoba A nie może wylosować Osoby B".
  3.  Wszystkie zdefiniowane reguły są widoczne na liście.
  4.  Mogę usunąć zdefiniowaną wcześniej regułę.

- ID: US-008
- Tytuł: Uruchomienie losowania
- Opis: Jako twórca grupy, po dodaniu wszystkich uczestników i zdefiniowaniu reguł, chcę uruchomić losowanie, aby system przydzielił każdemu osobę do obdarowania.
- Kryteria akceptacji:
  1.  Przycisk "Rozpocznij losowanie" jest aktywny tylko, jeśli w grupie jest co najmniej 3 uczestników.
  2.  Przed uruchomieniem losowania system waliduje, czy da się je przeprowadzić z zadanymi regułami wykluczeń. Jeśli nie, wyświetla błąd.
  3.  Po kliknięciu przycisku i potwierdzeniu, proces losowania jest wykonywany.
  4.  Po zakończeniu losowania, widok zarządzania grupą jest blokowany do edycji.

- ID: US-009
- Tytuł: Usunięcie grupy
- Opis: Jako twórca grupy, chcę móc usunąć grupę, jeśli np. została stworzona przez pomyłkę lub wydarzenie zostało odwołane.
- Kryteria akceptacji:
  1.  W widoku zarządzania grupą jest dostępna opcja "Usuń grupę".
  2.  Po kliknięciu pojawia się okno modalne z prośbą o potwierdzenie decyzji.
  3.  Po potwierdzeniu grupa i wszystkie powiązane z nią dane są trwale usuwane.

### Uczestnictwo i Wyniki

- ID: US-010
- Tytuł: Przeglądanie pulpitu użytkownika
- Opis: Jako zalogowany użytkownik, chcę widzieć na jednym ekranie listę wszystkich grup, których jestem twórcą lub członkiem, aby mieć szybki dostęp do moich wydarzeń.
- Kryteria akceptacji:
  1.  Po zalogowaniu widzę pulpit (dashboard).
  2.  Na pulpicie znajdują się dwie sekcje: "Grupy, które stworzyłem" i "Grupy, do których należę".
  3.  Każda pozycja na liście jest linkiem do widoku szczegółowego danej grupy.

- ID: US-011
- Tytuł: Dodawanie/Edycja listy życzeń
- Opis: Jako uczestnik losowania, chcę móc dodać lub edytować moją listę życzeń, aby osoba, która mnie wylosowała, wiedziała, co chciałbym dostać.
- Kryteria akceptacji:
  1.  W widoku grupy (lub na stronie wyniku) znajduje się pole tekstowe na moją listę życzeń.
  2.  Mogę w nim wpisać dowolny tekst i wkleić linki.
  3.  Wszystkie wklejone linki (zaczynające się od http/https) są automatycznie renderowane jako klikalne.
  4.  Mogę edytować listę życzeń do momentu upłynięcia "daty zakończenia wydarzenia".

- ID: US-012
- Tytuł: Sprawdzanie wyniku losowania (użytkownik zarejestrowany)
- Opis: Jako zarejestrowany uczestnik, po zakończeniu losowania chcę zobaczyć, komu mam kupić prezent oraz sprawdzić jego listę życzeń.
- Kryteria akceptacji:
  1.  Po wejściu do widoku grupy, która ma zakończone losowanie, widzę ekran wyniku.
  2.  Na ekranie wyświetla się imię osoby, którą wylosowałem.
  3.  Widzę listę życzeń tej osoby.
  4.  Widzę także nazwę grupy, budżet i moją własną listę życzeń.

- ID: US-013
- Tytuł: Sprawdzanie wyniku losowania (użytkownik niezarejestrowany)
- Opis: Jako niezarejestrowany uczestnik, chcę otrzymać link, po kliknięciu którego zobaczę, komu kupuję prezent, bez konieczności zakładania konta.
- Kryteria akceptacji:
  1.  Po losowaniu generowany jest unikalny, trudny do odgadnięcia link dla każdego niezarejestrowanego uczestnika.
  2.  Po otwarciu linku widzę stronę z wynikiem losowania.
  3.  Strona zawiera te same informacje co dla użytkownika zalogowanego: imię wylosowanej osoby, jej listę życzeń, budżet, oraz moją listę życzeń z możliwością edycji.
  4.  System odnotowuje fakt, że link został otwarty.

- ID: US-014:

* Tytuł: Grupy
* Opis: Jako użytkownik chcę móc zapisywać i edytować grupy, członków grupy oraz wykluczenia
* Kryteria akceptacji:
  - Użytkownik może utworzyć grupę a potem ją edytować (US-005) oraz usunąć (US-009).
  - Użytkownik, który jest twórcą grupy może dodawać uczestników (US-006) oraz definiować wykluczenia (US-007).
  - Użytkownik, który jest twórca grupy moze uruchomić losowanie (US-008).
  - Użytkownik może widzieć grupy do których należy i wyniki losowania (US-011).
  - Użytkownik może szybko sprawdzić wyniki losowania (US-012)
  - Funkcjonalność opisania w tym US nie jest dostępna bez logowania się do systemu (US-002).

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

- ID: US-016
- Tytuł: Rola Elfa - pomocnika w grupie Secret Santa (Wersja 1.1)
- Opis: Jako Twórca grupy, chcę móc przypisać uczestnikowi pomocnika (Elfa), który będzie pomagał w wyborze prezentu, mając dostęp do wyniku losowania tej osoby.
- Kryteria akceptacji:
  1.  W formularzu dodawania uczestnika znajduje się opcjonalny select "Elf dla uczestnika (opcjonalnie)".
  2.  Twórca może wybrać z listy rozwijanej, dla którego uczestnika nowa osoba będzie elfem.
  3.  Lista pokazuje tylko uczestników, którzy nie mają jeszcze przypisanego elfa.
  4.  Twórca może edytować przypisanie elfa w modalu edycji uczestnika do momentu rozpoczęcia losowania.
  5.  Po losowaniu przypisania elfów są niemutowalne (pole select staje się disabled).
  6.  W liście uczestników w widoku grupy jest widoczny badge "🧝 Elf dla: [Imię]" dla uczestników będących elfami.
  7.  Uczestnik, który ma przypisanego elfa, widzi info "Pomocnik: [Imię] 🧝" w liście uczestników.
  8.  Elf zalogowany na stronie swojego wyniku (`/groups/[groupId]/result`) widzi przycisk "Zobacz wynik [Imię] 🧝".
  9.  Po kliknięciu przycisku elf jest przekierowywany na dedykowaną stronę `/groups/[groupId]/elf-result`.
  10. Na stronie `/elf-result` wyświetla się banner z informacją "Pomagasz: [Imię]" i opis roli elfa.
  11. Elf widzi pełny wynik losowania osoby, której pomaga: imię wylosowanej osoby, jej listę życzeń, nazwę grupy i budżet.
  12. Elf z kontem (user_id) może edytować listę życzeń osoby, której pomaga (do upłynięcia daty zakończenia wydarzenia).
  13. Niezarejestrowani elfowie (bez user_id) nie mają dostępu do strony `/elf-result` - wymagane jest logowanie.
  14. System automatycznie tworzy wykluczenie: osoba z elfem nie może wylosować swojego elfa podczas losowania.
  15. Elf może wylosować osobę, której pomaga (wykluczenie jest jednokierunkowe).
  16. System trackuje moment otwarcia wyniku przez elfa w osobnej kolumnie `elf_accessed_at` (oddzielnie od `result_viewed_at`).
  17. W przypadku próby otwarcia `/elf-result` przez użytkownika, który nie jest elfem, następuje redirect do dashboard z błędem.

## 6. Metryki sukcesu

### 6.1. Metryki Biznesowe / Produktowe

**MVP:**
- Kluczowy wskaźnik sukcesu (KPI): 100% wyświetleń wyników przez uczestników w każdym zakończonym losowaniu. Mierzone poprzez śledzenie otwarć unikalnych linków oraz dostępów do strony wyniku przez zalogowanych użytkowników.
- Wskaźnik aktywacji użytkowników: Osiągnięcie 50% aktywacji, gdzie "aktywny użytkownik" jest zdefiniowany jako osoba zarejestrowana, która wzięła udział w co najmniej jednym losowaniu (jako twórca lub uczestnik).

**Wersja 1.1 (AI-generowanie listu do Mikołaja):**
- Wskaźnik adopcji AI: Odsetek uczestników korzystających z funkcji AI-generowania listu do Mikołaja (cel: 30% użytkowników w ciągu pierwszego miesiąca).
- Współczynnik akceptacji: Procent wygenerowanych listów, które zostały zaakceptowane przez użytkowników (cel: min. 60%).
- Średni czas tworzenia listy życzeń: Porównanie czasu między metodą manualną a AI-generowaniem (oczekiwana redukcja o 50%).
- Średnia liczba generowań na użytkownika: Monitorowanie, czy użytkownicy wykorzystują dostępne limity (3/5 generowań per-grupa).
- Wskaźnik wypełnienia list życzeń: Procent uczestników, którzy mają wypełnioną listę życzeń po wprowadzeniu AI (oczekiwany wzrost z bazowego poziomu MVP).

**Wersja 1.1 (Rola Elfa):**
- Wskaźnik adopcji Elfa: Odsetek grup wykorzystujących funkcjonalność Elfa (cel: 20% nowych grup w ciągu pierwszego miesiąca).
- Aktywność elfów: Procent elfów którzy otworzyli wynik osoby, której pomagają (cel: min. 70% elfów otwiera wynik).
- Edycja przez elfów: Procent list życzeń edytowanych przez elfów (cel: min. 30% elfów edytuje listę życzeń osoby, której pomaga).
- Completion rate: Procent grup z elfami które ukończyły losowanie pomyślnie (cel: identyczny jak grupy bez elfów, 99%+).
- Średni czas od losowania do otwarcia wyniku przez elfa: Monitorowanie zaangażowania elfów (cel: <24h od losowania).

### 6.2. Metryki Techniczne / Projektowe

**MVP:**
- Pozytywne zaliczenie projektu akademickiego.
- W 100% działający główny scenariusz użytkownika: od rejestracji, przez stworzenie grupy, dodanie członków, zdefiniowanie wykluczeń, uruchomienie losowania, aż po poprawne wyświetlenie wyniku każdemu uczestnikowi.
- Logika losowania w pełni pokryta testami jednostkowymi, które potwierdzają jej poprawność (uwzględnienie wykluczeń, brak wylosowania siebie).
- Skonfigurowany i działający pipeline CI/CD (np. GitHub Actions), który automatycznie uruchamia testy po każdym pushu do repozytorium.

**Wersja 1.1:**
- Pokrycie testami funkcjonalności AI-generowania: Testy jednostkowe dla serwisu AI, testy integracyjne dla API endpoints, testy E2E dla przepływu użytkownika.
- Czas odpowiedzi API AI: Maksymalnie 10 sekund na wygenerowanie listu do Mikołaja (95 percentyl).
- Obsługa błędów: Graceful degradation w przypadku niedostępności API OpenRouter - wyświetlenie komunikatu i możliwość powrotu do manualnej edycji.

## 7. Wymagania Techniczne (Wersja 1.1)

### 7.1. Integracja z OpenRouter API

**API Provider:** OpenRouter (https://openrouter.ai)
- Model: `openai/gpt-4o-mini`
- Parametry generowania:
  - Max tokens: 1000
  - Temperature: 0.7
  - Top P: 1.0

**Zmienne środowiskowe:**
```env
OPENROUTER_API_KEY=<api_key>
AI_MODEL=aopenai/gpt-4o-mini
AI_MAX_TOKENS=1000
AI_TEMPERATURE=0.7
```

**Rate limiting:**
- Timeout na request: 15 sekund
- Retry policy: 2 próby w przypadku timeout lub 5xx errors
- Backoff: Exponential backoff (1s, 2s)

### 7.2. Baza danych

**Rozszerzenie tabeli `wishes`:**
```sql
ALTER TABLE wishes ADD COLUMN ai_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE wishes ADD COLUMN ai_generation_count_per_group INTEGER DEFAULT 0;
ALTER TABLE wishes ADD COLUMN ai_last_generated_at TIMESTAMPTZ NULL;
```

**Indeksy:**
- `wishes_participant_id_idx` (już istnieje)
- Nowy: `wishes_ai_generation_count_idx` (dla query limitów)

### 7.3. API Endpoints

**POST /api/participants/:participantId/wishlist/generate-ai**
- Autentykacja: Bearer token (zalogowani) lub participant access token (niezarejestrowani)
- Body: `{ prompt: string }`
- Response: `{ generated_content: string, remaining_generations: number, can_generate_more: boolean }`
- Kody błędów:
  - 400: END_DATE_PASSED, INVALID_PROMPT
  - 403: FORBIDDEN
  - 429: AI_GENERATION_LIMIT_REACHED
  - 500: AI_API_ERROR

**GET /api/participants/:participantId/wishlist/ai-status**
- Response: `{ ai_generation_count: number, remaining_generations: number, can_generate: boolean, last_generated_at: string | null }`

### 7.4. Frontend Components

**Nowe komponenty React:**
- `AIGenerateButton.tsx` - Przycisk z licznikiem
- `AIGenerateModal.tsx` - Modal z promptem
- `AIPreviewModal.tsx` - Podgląd wygenerowanej treści
- `AIGenerationLimit.tsx` - Komponent licznika
- `AIGeneratingSpinner.tsx` - Loading state

**Nowe hooki:**
- `useAIGeneration.ts` - Obsługa generowania
- `useAIGenerationStatus.ts` - Status limitów

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
```

## 8. Bezpieczeństwo i Prywatność

### 8.1. Ochrona danych osobowych (RODO)

**Dane przekazywane do API AI:**
- System przekazuje do OpenRouter API **wyłącznie** treść promptu wprowadzonego przez użytkownika (preferencje/zainteresowania).
- **NIE** są przekazywane żadne dane identyfikujące: imiona, nazwiska, adresy e-mail, tokeny dostępu.
- Kontekst budżetu jest przekazywany jako liczba bez powiązania z konkretną grupą.

**Informowanie użytkowników:**
- Przed pierwszym użyciem funkcji AI wyświetlany jest disclaimer o wykorzystaniu zewnętrznego API.
- W polityce prywatności dodany punkt o OpenRouter i Anthropic jako podmiotach przetwarzających.
- Użytkownik ma możliwość opt-out - może korzystać wyłącznie z manualnej edycji.

**Przechowywanie danych:**
- W bazie danych przechowywane są tylko liczniki użyć i timestamp ostatniego generowania.
- Prompt użytkownika i wygenerowana treść **nie są** logowane w systemie (za wyjątkiem celów debugowania w środowisku dev).

### 8.2. Content Moderation

**Walidacja promptów:**
- Minimalna długość: 10 znaków
- Maksymalna długość: 1000 znaków
- Filtrowanie potencjalnie obraźliwych treści na poziomie klienta (podstawowa walidacja)

**Walidacja wygenerowanej treści:**
- Sprawdzanie długości (max 1000 znaków z API)
- Sanityzacja HTML przed wyświetleniem (XSS protection)
- Automatyczne linkowanie URLs z escapowaniem

**Fallback:**
- W przypadku wygenerowania nieodpowiednich treści użytkownik może odrzucić wynik
- Możliwość zgłoszenia problematycznej treści (przyszła funkcjonalność)

### 8.3. Rate Limiting i zabezpieczenia

**Limity API:**
- Per-participant-per-grupa: 3 generowania (niezarejestrowani) / 5 generowań (zarejestrowani)
- Timeout na pojedyncze żądanie: 15 sekund
- Brak możliwości obejścia limitów przez zmianę tokenu

**Koszty:**
- Monitoring kosztów API w czasie rzeczywistym
- Alert przy przekroczeniu miesięcznego budżetu
- Możliwość wyłączenia funkcji AI w przypadku nadmiernych kosztów

**Bezpieczeństwo kluczy API:**
- `OPENROUTER_API_KEY` przechowywany wyłącznie w zmiennych środowiskowych (nie w kodzie)
- Klucz nie jest nigdy wysyłany do klienta (frontend)
- Rotacja kluczy co 90 dni (zalecane)
