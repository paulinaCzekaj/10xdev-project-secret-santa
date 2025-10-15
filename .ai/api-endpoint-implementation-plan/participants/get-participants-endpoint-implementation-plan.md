# API Endpoint Implementation Plan: List Participants

## 1. Przegląd punktu końcowego
Endpoint umożliwia użytkownikom pobranie wszystkich uczestników konkretnej grupy. Wymaga autoryzacji oraz sprawdza, czy użytkownik jest częścią grupy przed udostępnieniem listy uczestników.

## 2. Szczegóły żądania
- Metoda HTTP: `GET`
- Struktura URL: `/api/groups/:groupId/participants`
- Parametry:
  - Wymagane: `Authorization: Bearer {access_token}`, `groupId` (parametr ścieżki)
  - Opcjonalne: Brak

## 3. Wykorzystywane typy
- `ParticipantListItemDTO`:
  ```typescript
  export interface ParticipantListItemDTO extends ParticipantDTO {
    has_wishlist: boolean;
  }
  ```

## 4. Szczegóły odpowiedzi
- Struktura odpowiedzi:
  ```json
  {
    "data": [
      {
        "id": number,
        "group_id": number,
        "user_id": number | null,
        "name": string,
        "email": string | null,
        "created_at": string,
        "has_wishlist": boolean
      }
    ]
  }
  ```
- Kody statusu:
  - 200: Pomyślny odczyt
  - 401: Nieautoryzowany
  - 403: Zakazany (użytkownik nie jest częścią grupy)
  - 404: Grupa nie znaleziona
  - 500: Błąd po stronie serwera

## 5. Przepływ danych
- Przyjmowanie żądania HTTP z tokenem autoryzacyjnym i parametrem groupId.
- Weryfikacja dostępu i sprawdzenie czy użytkownik jest uczestnikiem grupy.
- Pozyskiwanie danych uczestników z bazy danych przy użyciu metody w serwisie.
- Dodanie pola `has_wishlist` na podstawie istnienia listy życzeń.
- Zwracanie danych w ustalonej strukturze.

## 6. Względy bezpieczeństwa
- Upewnienie się, że tylko uczestnicy grupy mogą uzyskać dostęp do listy uczestników.
- Walidacja parametrów wejściowych w celu uniknięcia ataków SQL Injection.
- Sprawdzenie uprawnień użytkownika przed udostępnieniem danych.

## 7. Obsługa błędów
- 401: Nieautoryzowany - loguj próbę dostępu bez ważnego tokena.
- 403: Zakazany - loguj próby dostępu do grup, których użytkownik nie jest częścią.
- 404: Grupa nie znaleziona - loguj próby dostępu do nieistniejących grup.
- W przypadku błędu serwera, zwracaj 500 i loguj szczegóły błędu.

## 8. Rozważania dotyczące wydajności
- Użycie indeksów na kluczach obcych dla szybszego wyszukiwania.
- Optymalizacja zapytania poprzez łączenie tabel participants i wishes dla pola has_wishlist.
- Rozważenie cachowania dla często dostępu grup.

## 9. Etapy wdrożenia
1. Zdefiniować endpoint w `src/pages/api/groups/[groupId]/participants.ts`.
2. Utworzyć metodę `getGroupParticipants` w `src/lib/services/participant.service.ts`.
3. Dodać walidację parametrów i sprawdzenie uprawnień w middleware.
4. Zaimplementować odpowiedzi na sukcesy i błędy z odpowiednim logowaniem.
5. Przetestować endpoint przy użyciu narzędzi takich jak Postman lub Insomnia.
