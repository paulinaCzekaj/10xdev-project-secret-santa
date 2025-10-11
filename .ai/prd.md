# Dokument wymagań produktu (PRD) - Secret Santa
## 1. Przegląd produktu
Aplikacja "Secret Santa" to narzędzie webowe zaprojektowane w celu uproszczenia i automatyzacji procesu organizacji wymiany prezentów. Głównym celem produktu w wersji MVP (Minimum Viable Product) jest zapewnienie użytkownikom możliwości tworzenia grup prezentowych, zapraszania uczestników, definiowania reguł losowania oraz przeprowadzenia samego losowania w sposób w pełni zautomatyzowany i anonimowy. Aplikacja eliminuje potrzebę manualnej organizacji, gwarantując poufność i sprawiedliwość losowania, co jest szczególnie istotne w przypadku grup organizujących wymianę zdalnie. Produkt kierowany jest do wszystkich osób, które chcą zorganizować tego typu wydarzenie w gronie rodziny, przyjaciół czy współpracowników.

## 2. Problem użytkownika
Tradycyjna, manualna organizacja wymiany prezentów "Secret Santa" jest procesem czasochłonnym, podatnym na błędy i często niepraktycznym, zwłaszcza gdy uczestnicy znajdują się w różnych lokalizacjach. Główne problemy, które rozwiązuje aplikacja, to:
* Brak anonimowości: W metodach manualnych (np. losowanie karteczek z imionami) organizator często poznaje wszystkie pary, co psuje element niespodzianki.
* Logistyka: Zbieranie uczestników, ustalanie reguł (np. kto nie powinien kogo losować) i przekazywanie wyników jest trudne do skoordynowania, szczególnie zdalnie.
* Ryzyko błędu: Istnieje ryzyko, że ktoś wylosuje samego siebie lub losowanie będzie niezgodne z ustalonymi wcześniej wykluczeniami.
* Brak centralnego miejsca na informacje: Listy życzeń są często rozproszone w różnych kanałach komunikacji, co utrudnia zakup trafionego prezentu.

Aplikacja "Secret Santa" adresuje te problemy, oferując scentralizowaną, zautomatyzowaną i gwarantującą poufność platformę do organizacji wymiany prezentów.

## 3. Wymagania funkcjonalne
### 3.1. Uwierzytelnianie i Zarządzanie Kontem
* Użytkownik może założyć nowe konto za pomocą adresu e-mail i hasła.
* Użytkownik może zalogować się na istniejące konto.
* Użytkownik może się wylogować ze swojego konta.
* Użytkownik może skorzystać z funkcji "Zapomniałem hasła", aby zresetować swoje hasło dostępu.

### 3.2. Zarządzanie Grupami (CRUD)
* Zalogowany użytkownik (Twórca) może stworzyć nową grupę, podając jej nazwę, budżet oraz datę zakończenia wydarzenia.
* Twórca grupy jest automatycznie dodawany jako jej uczestnik.
* Minimalna liczba uczestników w grupie, aby rozpocząć losowanie, wynosi 3.
* Twórca może dodawać uczestników do grupy, podając ich imię oraz opcjonalny adres e-mail. Adres e-mail musi być unikalny w obrębie jednej grupy.
* Twórca może edytować dane uczestników (imię, e-mail) oraz parametry grupy (nazwa, budżet) do momentu rozpoczęcia losowania.
* Twórca może usunąć stworzoną przez siebie grupę (po wyświetleniu prostego okna modalnego z potwierdzeniem).
* Każdy zalogowany użytkownik widzi na swoim pulpicie (dashboard) listę grup, które stworzył oraz tych, do których został dodany.

### 3.3. Logika Losowania
* Przed losowaniem Twórca grupy może zdefiniować jednokierunkowe reguły wykluczeń (np. "Użytkownik A nie może wylosować Użytkownika B").
* System zawiera walidację uniemożliwiającą rozpoczęcie losowania, jeśli zdefiniowane reguły wykluczeń czynią je niemożliwym do przeprowadzenia.
* Uruchomienie losowania jest możliwe tylko dla grup z co najmniej 3 uczestnikami.
* Proces losowania jest nieodwracalny – po jego zakończeniu edycja grupy jest niemożliwa.
* Algorytm losujący zapewnia, że nikt nie wylosuje samego siebie oraz że wszystkie zdefiniowane reguły wykluczeń zostaną uwzględnione.

### 3.4. Wyniki i Listy Życzeń
* Po losowaniu każdy uczestnik widzi wyłącznie imię osoby, dla której ma przygotować prezent.
* Zarejestrowani użytkownicy widzą wynik losowania po zalogowaniu się na swoje konto.
* Niezarejestrowani uczestnicy (dodani tylko z imieniem lub z e-mailem, ale bez konta) otrzymują dostęp do wyniku poprzez unikalny, trudny do odgadnięcia link.
* Zostanie zaimplementowany mechanizm śledzenia, czy unikalny link do wyniku został otwarty, kiedy i ile razy.
* Każdy uczestnik (zarejestrowany i niezarejestrowany) może stworzyć i edytować swoją listę życzeń (wishlist).
* Lista życzeń jest prostym polem tekstowym, w którym system automatycznie wykrywa i konwertuje wklejony tekst na klikalne hiperłącza.
* Edycja listy życzeń jest możliwa do upłynięcia zdefiniowanej przez Twórcę "daty zakończenia wydarzenia". Po tej dacie pole staje się tylko do odczytu.
* Na ekranie wyniku losowania użytkownik widzi: imię wylosowanej osoby, jej listę życzeń, nazwę grupy, ustalony budżet oraz własną listę życzeń z możliwością jej edycji.

### 3.5. Wymagania Niefunkcjonalne
* Aplikacja musi być w pełni responsywna (RWD) i poprawnie wyświetlać się na urządzeniach mobilnych oraz desktopowych.
* Interfejs użytkownika musi być prosty i intuicyjny.

## 4. Granice produktu
### 4.1. Funkcjonalności wchodzące w zakres MVP
* Pełen proces uwierzytelniania: rejestracja, logowanie, wylogowanie, reset hasła.
* Pełen cykl życia grupy: tworzenie, dodawanie/edycja członków, edycja danych grupy, usunięcie.
* Definiowanie jednokierunkowych reguł wykluczeń.
* Przeprowadzenie losowania z uwzględnieniem reguł.
* Poufny dostęp do wyników dla zalogowanych i niezalogowanych użytkowników (poprzez unikalny link).
* Tworzenie i edycja prostych list życzeń (pole tekstowe z auto-linkowaniem).

### 4.2. Funkcjonalności wyłączone z zakresu MVP
* System powiadomień (e-mail, push) o dodaniu do grupy, zbliżającym się losowaniu czy jego wyniku.
* Formalny system zaproszeń do grupy (np. dołączanie przez link lub kod).
* Wbudowany czat grupowy.
* Możliwość edycji grupy lub ponownego losowania po jego zakończeniu.
* Integracje z zewnętrznymi serwisami (np. listy życzeń z Amazon).
* Zaawansowane role użytkowników (np. współorganizator).
* Obsługa wielu walut (domyślną i jedyną walutą jest PLN).
* Dostęp do wyniku losowania poprzez podanie samego imienia (zrezygnowano na rzecz bezpieczniejszej metody unikalnych linków).

## 5. Historyjki użytkowników
### Uwierzytelnianie i Zarządzanie Kontem
* ID: US-001
* Tytuł: Rejestracja nowego użytkownika
* Opis: Jako nowy użytkownik, chcę móc założyć konto w aplikacji przy użyciu mojego adresu e-mail i hasła, aby móc tworzyć własne grupy Secret Santa.
* Kryteria akceptacji:
    1.  Formularz rejestracji zawiera pola: adres e-mail, hasło, potwierdzenie hasła.
    2.  System waliduje, czy podany adres e-mail ma poprawny format.
    3.  System sprawdza, czy podany adres e-mail nie jest już zarejestrowany.
    4.  System waliduje, czy hasło i jego potwierdzenie są identyczne.
    5.  Po pomyślnej rejestracji jestem automatycznie logowany i przekierowany na główny pulpit (dashboard).

* ID: US-002
* Tytuł: Logowanie użytkownika
* Opis: Jako zarejestrowany użytkownik, chcę móc zalogować się na moje konto, aby uzyskać dostęp do moich grup i losowań.
* Kryteria akceptacji:
    1.  Formularz logowania zawiera pola: adres e-mail, hasło.
    2.  Po podaniu poprawnych danych jestem zalogowany i przekierowany na pulpit.
    3.  Po podaniu błędnych danych widzę stosowny komunikat o błędzie.

* ID: US-003
* Tytuł: Resetowanie hasła
* Opis: Jako zarejestrowany użytkownik, który zapomniał hasła, chcę móc je zresetować, aby odzyskać dostęp do mojego konta.
* Kryteria akceptacji:
    1.  Na stronie logowania znajduje się link "Zapomniałem hasła".
    2.  Po kliknięciu i podaniu mojego adresu e-mail, system (w przyszłości) wysłałby link do resetu (w MVP może to być uproszczone).
    3.  Mechanizm pozwala na ustawienie nowego hasła.

* ID: US-004
* Tytuł: Wylogowanie użytkownika
* Opis: Jako zalogowany użytkownik, chcę móc się wylogować, aby zakończyć moją sesję.
* Kryteria akceptacji:
    1.  W interfejsie aplikacji znajduje się widoczny przycisk/link "Wyloguj".
    2.  Po kliknięciu zostaję wylogowany i przekierowany na stronę główną lub stronę logowania.

### Zarządzanie Grupą
* ID: US-005
* Tytuł: Tworzenie nowej grupy
* Opis: Jako zalogowany użytkownik, chcę stworzyć nową grupę Secret Santa, podając jej nazwę, sugerowany budżet i datę zakończenia, abym mógł zorganizować wymianę prezentów.
* Kryteria akceptacji:
    1.  Formularz tworzenia grupy zawiera pola: nazwa grupy (tekst), budżet (liczba całkowita > 0), data zakończenia (data).
    2.  Waluta budżetu jest stała i ustawiona na PLN.
    3.  Po utworzeniu grupy jestem automatycznie dodawany jako jej pierwszy uczestnik.
    4.  Zostaję przekierowany do widoku zarządzania nowo utworzoną grupą.

* ID: US-006
* Tytuł: Dodawanie uczestników do grupy
* Opis: Jako twórca grupy, chcę móc dodawać do niej uczestników, podając ich imię i opcjonalnie adres e-mail, aby zbudować listę osób biorących udział w losowaniu.
* Kryteria akceptacji:
    1.  W widoku zarządzania grupą znajduje się formularz do dodawania uczestnika.
    2.  Formularz wymaga podania imienia i opcjonalnie adresu e-mail.
    3.  System nie pozwala na dodanie dwóch uczestników z tym samym adresem e-mail w ramach jednej grupy.
    4.  Nowo dodany uczestnik pojawia się na liście członków grupy.

* ID: US-007
* Tytuł: Definiowanie reguł wykluczeń
* Opis: Jako twórca grupy, chcę móc zdefiniować reguły, kto kogo nie może wylosować, aby uniknąć niechcianych par (np. małżeństwo losujące siebie nawzajem).
* Kryteria akceptacji:
    1.  W widoku grupy mogę dodać regułę wykluczenia, wybierając z listy uczestników osobę A i osobę B.
    2.  Reguła oznacza, że "Osoba A nie może wylosować Osoby B".
    3.  Wszystkie zdefiniowane reguły są widoczne na liście.
    4.  Mogę usunąć zdefiniowaną wcześniej regułę.

* ID: US-008
* Tytuł: Uruchomienie losowania
* Opis: Jako twórca grupy, po dodaniu wszystkich uczestników i zdefiniowaniu reguł, chcę uruchomić losowanie, aby system przydzielił każdemu osobę do obdarowania.
* Kryteria akceptacji:
    1.  Przycisk "Rozpocznij losowanie" jest aktywny tylko, jeśli w grupie jest co najmniej 3 uczestników.
    2.  Przed uruchomieniem losowania system waliduje, czy da się je przeprowadzić z zadanymi regułami wykluczeń. Jeśli nie, wyświetla błąd.
    3.  Po kliknięciu przycisku i potwierdzeniu, proces losowania jest wykonywany.
    4.  Po zakończeniu losowania, widok zarządzania grupą jest blokowany do edycji.

* ID: US-009
* Tytuł: Usunięcie grupy
* Opis: Jako twórca grupy, chcę móc usunąć grupę, jeśli np. została stworzona przez pomyłkę lub wydarzenie zostało odwołane.
* Kryteria akceptacji:
    1.  W widoku zarządzania grupą jest dostępna opcja "Usuń grupę".
    2.  Po kliknięciu pojawia się okno modalne z prośbą o potwierdzenie decyzji.
    3.  Po potwierdzeniu grupa i wszystkie powiązane z nią dane są trwale usuwane.

### Uczestnictwo i Wyniki
* ID: US-010
* Tytuł: Przeglądanie pulpitu użytkownika
* Opis: Jako zalogowany użytkownik, chcę widzieć na jednym ekranie listę wszystkich grup, których jestem twórcą lub członkiem, aby mieć szybki dostęp do moich wydarzeń.
* Kryteria akceptacji:
    1.  Po zalogowaniu widzę pulpit (dashboard).
    2.  Na pulpicie znajdują się dwie sekcje: "Grupy, które stworzyłem" i "Grupy, do których należę".
    3.  Każda pozycja na liście jest linkiem do widoku szczegółowego danej grupy.

* ID: US-011
* Tytuł: Dodawanie/Edycja listy życzeń
* Opis: Jako uczestnik losowania, chcę móc dodać lub edytować moją listę życzeń, aby osoba, która mnie wylosowała, wiedziała, co chciałbym dostać.
* Kryteria akceptacji:
    1.  W widoku grupy (lub na stronie wyniku) znajduje się pole tekstowe na moją listę życzeń.
    2.  Mogę w nim wpisać dowolny tekst i wkleić linki.
    3.  Wszystkie wklejone linki (zaczynające się od http/https) są automatycznie renderowane jako klikalne.
    4.  Mogę edytować listę życzeń do momentu upłynięcia "daty zakończenia wydarzenia".

* ID: US-012
* Tytuł: Sprawdzanie wyniku losowania (użytkownik zarejestrowany)
* Opis: Jako zarejestrowany uczestnik, po zakończeniu losowania chcę zobaczyć, komu mam kupić prezent oraz sprawdzić jego listę życzeń.
* Kryteria akceptacji:
    1.  Po wejściu do widoku grupy, która ma zakończone losowanie, widzę ekran wyniku.
    2.  Na ekranie wyświetla się imię osoby, którą wylosowałem.
    3.  Widzę listę życzeń tej osoby.
    4.  Widzę także nazwę grupy, budżet i moją własną listę życzeń.

* ID: US-013
* Tytuł: Sprawdzanie wyniku losowania (użytkownik niezarejestrowany)
* Opis: Jako niezarejestrowany uczestnik, chcę otrzymać link, po kliknięciu którego zobaczę, komu kupuję prezent, bez konieczności zakładania konta.
* Kryteria akceptacji:
    1.  Po losowaniu generowany jest unikalny, trudny do odgadnięcia link dla każdego niezarejestrowanego uczestnika.
    2.  Po otwarciu linku widzę stronę z wynikiem losowania.
    3.  Strona zawiera te same informacje co dla użytkownika zalogowanego: imię wylosowanej osoby, jej listę życzeń, budżet, oraz moją listę życzeń z możliwością edycji.
    4.  System odnotowuje fakt, że link został otwarty.

## 6. Metryki sukcesu
### 6.1. Metryki Biznesowe / Produktowe
* Kluczowy wskaźnik sukcesu (KPI): 100% wyświetleń wyników przez uczestników w każdym zakończonym losowaniu. Mierzone poprzez śledzenie otwarć unikalnych linków oraz dostępów do strony wyniku przez zalogowanych użytkowników.
* Wskaźnik aktywacji użytkowników: Osiągnięcie 50% aktywacji, gdzie "aktywny użytkownik" jest zdefiniowany jako osoba zarejestrowana, która wzięła udział w co najmniej jednym losowaniu (jako twórca lub uczestnik).

### 6.2. Metryki Techniczne / Projektowe
* Pozytywne zaliczenie projektu akademickiego.
* W 100% działający główny scenariusz użytkownika: od rejestracji, przez stworzenie grupy, dodanie członków, zdefiniowanie wykluczeń, uruchomienie losowania, aż po poprawne wyświetlenie wyniku każdemu uczestnikowi.
* Logika losowania w pełni pokryta testami jednostkowymi, które potwierdzają jej poprawność (uwzględnienie wykluczeń, brak wylosowania siebie).
* Skonfigurowany i działający pipeline CI/CD (np. GitHub Actions), który automatycznie uruchamia testy po każdym pushu do repozytorium.