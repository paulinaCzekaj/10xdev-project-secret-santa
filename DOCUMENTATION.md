# Aplikacja - Secret Santa (MVP)

## Główny problem

Manualna organizacja wymian prezentów (np. "Secret Santa") jest niepraktyczna, zwłaszcza zdalnie, i często narusza anonimowość losowania. Aplikacja automatyzuje proces, gwarantując poufność i sprawiedliwość dla wszystkich uczestników.

## Najmniejszy zestaw funkcjonalności

1. Uwierzytelnianie (Auth):

- Rejestracja, logowanie i wylogowywanie użytkownika (e-mail/hasło).

2. Zarządzanie grupami (CRUD):

- Tworzenie grup prezentowych z nazwą i budżetem.
- Przeglądanie własnych grup i listy ich członków.
- Edycja nazwy i budżetu grupy (dla twórcy).
- Usuwanie grupy (dla twórcy).

3. Logika biznesowa (Losowanie):

- Definiowanie reguł wykluczeń (kto kogo nie może wylosować).
- Uruchomienie losowania, które uwzględnia reguły i uniemożliwia wylosowanie siebie.
- Poufny wgląd w wynik – każdy widzi tylko osobę, której kupuje prezent.
- Listy życzeń (wishlists).

### Co NIE wchodzi w zakres MVP

- Powiadomienia (e-mail, push).
- Formalny system zaproszeń (dołączanie przez link/kod).
- Chat grupowy.
- Edycja grupy po zakończeniu losowania.

### Kryteria sukcesu

- Pozytywne zaliczenie projektu.
- Działający główny scenariusz: od rejestracji po zobaczenie wyniku losowania z wykluczeniami.
- Poprawność logiki losowania potwierdzona działającymi testami jednostkowymi.
- Automatyczne testy uruchamiane przez CI/CD (GitHub Actions) po każdym pushu.

\<conversation_summary\>
\<decisions\>

1.  **Zarządzanie Uczestnikami:** Twórca grupy dodaje uczestników podając ich imię oraz opcjonalny adres e-mail. Twórca może edytować te dane do momentu rozpoczęcia losowania.
2.  **Dostęp dla Niezarejestrowanych:** Użytkownicy bez konta otrzymują unikalny, trudny do odgadnięcia link do swojego wyniku. Alternatywnie, mogą skorzystać z ogólnego linku do losowania, gdzie po wpisaniu swojego imienia (zakładając jego unikalność w grupie) zobaczą wynik.
3.  **Uwierzytelnianie:** Aplikacja będzie zawierać standardową funkcję "Zapomniałem hasła".
4.  **Reguły Wykluczeń:** Wykluczenia będą jednokierunkowe (np. "Użytkownik A nie może wylosować Użytkownika B"). Zostanie zaimplementowana walidacja uniemożliwiająca rozpoczęcie losowania przy niemożliwych do spełnienia regułach.
5.  **Lista Życzeń (Wishlist):** Będzie to pole tekstowe (textarea), w którym system automatycznie rozpozna i przekształci tekst w klikalne linki. Edycja listy życzeń będzie możliwa do daty zakończenia wydarzenia.
6.  **Budżet:** Pole będzie akceptować wyłącznie liczby całkowite większe od zera. Walutą domyślną i jedyną w MVP będzie PLN.
7.  **Usuwanie Grupy:** Twórca może usunąć grupę po prostym potwierdzeniu w oknie modalnym. Usunięcie konta przez właściciela grupy powoduje również usunięcie grupy.
8.  **Logika Grupy:** Minimalna liczba uczestników w grupie to 3. Twórca grupy jest zawsze jej uczestnikiem.
9.  **Kryteria Sukcesu (KPIs):** Głównym wskaźnikiem sukcesu będzie 100% wyświetleń wyników przez uczestników danego losowania. Dodatkowym celem jest osiągnięcie 50% aktywacji wśród zarejestrowanych użytkowników.
10. **Data Zakończenia Wydarzenia:** Każde losowanie będzie miało zdefiniowaną datę zakończenia, która determinuje, do kiedy można edytować listę życzeń.

\</decisions\>

\<matched_recommendations\>

1.  **Śledzenie Wyświetleń:** Zostanie zaimplementowany mechanizm statusów dla linków do wyników (np. "wyświetlono"/"nie wyświetlono"), aby umożliwić mierzenie kluczowego wskaźnika sukcesu (100% wyświetleń).
2.  **Minimalna Liczba Uczestników:** Wprowadzona zostanie walidacja uniemożliwiająca rozpoczęcie losowania dla grup mniejszych niż 3 osoby.
3.  **Rola Twórcy:** Twórca grupy jest domyślnie jej uczestnikiem, co upraszcza logikę aplikacji w wersji MVP.
4.  **Ekran Wyniku:** Po losowaniu użytkownik zobaczy ekran zawierający imię wylosowanej osoby, nazwę wydarzenia, budżet, listę życzeń tej osoby oraz własną listę życzeń z możliwością edycji.
5.  **Responsywność (RWD):** Aplikacja musi być w pełni responsywna i zoptymalizowana pod kątem urządzeń mobilnych.
6.  **Unikalność Uczestników:** Wprowadzona zostanie walidacja uniemożliwiająca dodanie tego samego adresu e-mail więcej niż raz w ramach jednego losowania.
7.  **Dashboard Użytkownika:** Po zalogowaniu użytkownik zobaczy ekran główny z listą grup, które stworzył, oraz tych, do których należy.
8.  **Funkcjonalność Listy Życzeń:** Lista życzeń będzie prostym polem tekstowym z funkcją automatycznego renderowania klikalnych linków.
9.  **Walidacja Reguł:** Interfejs uniemożliwi rozpoczęcie losowania, jeśli zdefiniowane reguły wykluczeń sprawią, że będzie ono matematycznie niemożliwe do przeprowadzenia.
10. **Odzyskiwanie Konta:** Do zakresu MVP włączona zostanie funkcja "Zapomniałem hasła", aby zapewnić użytkownikom możliwość samodzielnego odzyskania dostępu do konta.
    \</matched_recommendations\>

\<prd_planning_summary\>

### Podsumowanie Planowania PRD dla Secret Santa MVP

Na podstawie przeprowadzonej dyskusji, określono kluczowe wymagania i założenia dla pierwszej wersji produktu (MVP).

#### Główne Wymagania Funkcjonalne

1.  **Uwierzytelnianie:** Rejestracja, logowanie, wylogowywanie oraz funkcja resetowania hasła.
2.  **Zarządzanie Grupami (CRUD):**
    - Tworzenie grupy z nazwą, budżetem (liczba całkowita, PLN) i datą zakończenia.
    - Dodawanie uczestników przez twórcę (imię, opcjonalny e-mail).
    - Możliwość edycji danych uczestników przez twórcę przed losowaniem.
    - Usuwanie grupy przez twórcę (z prostym potwierdzeniem).
3.  **Logika Biznesowa (Losowanie):**
    - Definiowanie jednokierunkowych reguł wykluczeń.
    - Walidacja uniemożliwiająca losowanie przy minimalnej liczbie uczestników \< 3 oraz przy konfliktowych regułach.
    - Uruchomienie losowania, które uwzględnia reguły i uniemożliwia wylosowanie siebie.
4.  **Wyniki i Listy Życzeń:**
    - Poufny wgląd w wynik – każdy widzi tylko osobę, której kupuje prezent.
    - Dostęp do wyniku dla niezarejestrowanych poprzez unikalny link lub link ogólny + podanie imienia.
    - Listy życzeń w formie pola tekstowego z obsługą klikalnych linków, edytowalne do daty zakończenia wydarzenia.

#### Kluczowe Historie Użytkownika (User Stories)

- **Jako Twórca Grupy,** chcę stworzyć grupę, dodać do niej znajomych (podając ich imiona i e-maile), zdefiniować, kto kogo nie może wylosować, a następnie uruchomić losowanie, aby zautomatyzować organizację Secret Santa.
- **Jako Uczestnik (zarejestrowany),** chcę po zalogowaniu zobaczyć, do jakich grup należę, dodać swoją listę życzeń, a po losowaniu dowiedzieć się, komu kupuję prezent i zobaczyć jego listę życzeń.
- **Jako Uczestnik (niezarejestrowany),** chcę otrzymać link, po kliknięciu którego od razu zobaczę, komu mam kupić prezent, bez konieczności zakładania konta.

#### Kryteria Sukcesu i Mierniki

- **Kluczowy Wskaźnik Biznesowy:** 100% uczestników w każdym zakończonym losowaniu wyświetliło swój wynik (mierzone za pomocą statusu otwarcia unikalnego linku).
- **Wskaźnik Aktywacji:** 50% zarejestrowanych użytkowników bierze udział w co najmniej jednym losowaniu.
- **Kryteria Techniczne:** Pomyślne zaliczenie projektu, działający główny scenariusz (od rejestracji do wyniku), poprawność logiki losowania potwierdzona testami jednostkowymi i integracyjnymi, działający pipeline CI/CD.

\</prd_planning_summary\>

\<unresolved_issues\>

1.  **Niespójność Identyfikacji Użytkownika:** Stwierdzono, że "email jest opcjonalny", ale jednocześnie jest on używany do łączenia użytkowników z losowaniem i musi być unikalny. Należy jednoznacznie zdefiniować, co jest głównym identyfikatorem uczestnika, jeśli nie jest to adres e-mail.
2.  **Ryzyko Związane z Dostępem po Imieniu:** Mechanizm dostępu do wyniku przez ogólny link i podanie imienia zakłada, że imiona w grupie są unikalne. Jest to ryzykowne założenie, które może prowadzić do naruszenia prywatności (np. gdy w grupie są dwie osoby o imieniu "Anna"). Należy rozważyć rezygnację z tej funkcji na rzecz wyłącznie unikalnych linków dla każdego.
3.  **Niejasna Funkcjonalność "Daty Zakończenia":** Wprowadzono koncepcję "daty zakończenia wydarzenia", ale nie określono, co dokładnie dzieje się po jej upływie. Czy dostęp do wyników jest blokowany? Czy grupy są archiwizowane? Wymaga to doprecyzowania.
4.  **Doświadczenie Użytkownika przy Usuwaniu Grupy:** Usunięcie konta przez właściciela powoduje usunięcie całej grupy bez powiadomienia pozostałych uczestników. Jest to bardzo negatywne doświadczenie, które może prowadzić do utraty danych i zaufania. Należy rozważyć, czy takie zachowanie jest akceptowalne nawet w MVP.
    \</unresolved_issues\>
    \</conversation_summary\>
