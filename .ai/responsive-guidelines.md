# Responsive Design Guidelines

## Overview

Ten dokument definiuje zasady responsywnego projektowania dla aplikacji Secret Santa. Wszystkie komponenty UI powinny być projektowane z podejściem **mobile-first**, zapewniając optymalne doświadczenie użytkownika na wszystkich urządzeniach.

## Breakpoints

Aplikacja używa standardowych breakpointów Tailwind CSS:

- **Mobile**: < 640px (default, bez prefiksu)
- **Tablet**: 640px - 1024px (prefiksy: `sm:`, `md:`)
- **Desktop**: > 1024px (prefiksy: `lg:`, `xl:`, `2xl:`)

### Rekomendowane rozmiary testowe

- **Mobile**: 375px (iPhone SE), 414px (iPhone Plus)
- **Tablet**: 768px (iPad portrait), 1024px (iPad landscape)
- **Desktop**: 1280px, 1920px

## Form Layouts

### Zasada ogólna

Wszystkie formularze powinny być w pełni funkcjonalne i łatwe w użyciu na urządzeniach mobilnych. Oznacza to:

1. Pola formularza zawsze full-width na mobile
2. Przyciski akcji full-width na mobile, auto-width na tablet+
3. Tekst pomocniczy zawsze czytelny i nie zasłaniający elementów interaktywnych
4. Odpowiednie odstępy między elementami (min. 16px gap)

### Pattern: Pola formularza

#### Single column (mobile)
```tsx
<div className="space-y-4">
  <FormField />
  <FormField />
</div>
```

#### Multi-column (tablet+)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <FormField />
  <FormField />
</div>
```

#### Maksymalnie 3 kolumny (desktop)
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <FormField />
  <FormField />
  <FormField />
</div>
```

### Pattern: Przyciski akcji

#### Single button
```tsx
{/* Mobile: full-width, Tablet+: auto-width */}
<Button className="w-full sm:w-auto">
  Akcja
</Button>
```

#### Multiple buttons
```tsx
<div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
  <Button className="w-full sm:w-auto">Anuluj</Button>
  <Button className="w-full sm:w-auto">Potwierdź</Button>
</div>
```

### Pattern: Footer z przyciskiem i opisem

#### Mobile: Stack vertically (przycisk na górze)
```tsx
<div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
  <p className="text-sm text-muted-foreground order-2 sm:order-1">
    Opis pomocniczy dla użytkownika
  </p>
  <Button className="w-full sm:w-auto order-1 sm:order-2">
    Akcja
  </Button>
</div>
```

**Uzasadnienie:** Na mobile przycisk akcji powinien być pierwszy (bardziej widoczny), a opis drugorzędny.

## Dialog & Modal Layouts

### DialogFooter Pattern

```tsx
<DialogFooter className="flex-col sm:flex-row gap-2">
  <Button variant="outline" className="w-full sm:w-auto">
    Anuluj
  </Button>
  <Button className="w-full sm:w-auto">
    Potwierdź
  </Button>
</DialogFooter>
```

### AlertDialogFooter Pattern

```tsx
<AlertDialogFooter className="flex-col sm:flex-row gap-2">
  <AlertDialogCancel className="w-full sm:w-auto">
    Anuluj
  </AlertDialogCancel>
  <AlertDialogAction className="w-full sm:w-auto">
    Potwierdź
  </AlertDialogAction>
</AlertDialogFooter>
```

## Component-Specific Guidelines

### Select/Dropdown Components

Na mobile select powinien być full-width:

```tsx
<Select>
  <SelectTrigger className="w-full">
    <SelectValue placeholder="Wybierz opcję" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="1">Opcja 1</SelectItem>
  </SelectContent>
</Select>
```

### Form z wieloma Select (horizontal layout)

```tsx
<div className="flex flex-col md:flex-row items-stretch md:items-center gap-4">
  <div className="flex-1 w-full">
    <Select>...</Select>
  </div>

  {/* Separator - ukryty na mobile */}
  <div className="hidden md:flex items-center justify-center">
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
  </div>

  <div className="flex-1 w-full">
    <Select>...</Select>
  </div>
</div>
```

### Card Headers z akcjami

```tsx
<CardHeader>
  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
    <CardTitle>Tytuł</CardTitle>
    <div className="flex gap-2">
      <Button size="icon">...</Button>
      <Button size="icon">...</Button>
    </div>
  </div>
</CardHeader>
```

## Spacing Guidelines

### Recommended gaps

- **Tight spacing**: `gap-2` (8px) - dla przycisków obok siebie
- **Normal spacing**: `gap-4` (16px) - dla pól formularza, sekcji
- **Loose spacing**: `gap-6` (24px) - dla głównych sekcji strony

### Padding w komponentach

- **Mobile**: `p-4` lub `p-6` (16-24px)
- **Tablet+**: `sm:p-6` lub `sm:p-8` (24-32px)

## Typography Responsiveness

### Headings

```tsx
{/* Mobile: 2xl, Desktop: 4xl */}
<h1 className="text-2xl md:text-4xl font-bold">Tytuł</h1>

{/* Mobile: xl, Desktop: 2xl */}
<h2 className="text-xl md:text-2xl font-bold">Podtytuł</h2>
```

### Body text

Tekst body zazwyczaj nie wymaga skalowania, ale długie paragrafy mogą mieć:

```tsx
<p className="text-sm md:text-base">Treść</p>
```

## Best Practices

### ✅ DO:

1. Zawsze testuj na rzeczywistych urządzeniach mobilnych
2. Używaj `flex-col sm:flex-row` dla przełączania układu
3. Używaj `w-full sm:w-auto` dla przycisków
4. Ukrywaj dekoracyjne elementy na mobile (`hidden sm:flex`)
5. Używaj `order-1` i `order-2` do zmiany kolejności na mobile

### ❌ DON'T:

1. Nie używaj fixed width na mobile (`w-[300px]` bez `sm:`)
2. Nie ściskaj przycisków (min-width dla przycisków tekstowych)
3. Nie ukrywaj ważnych informacji na mobile
4. Nie używaj zbyt małych touch targets (min 44x44px)
5. Nie używaj hover states jako jedynego wskaźnika interakcji

## Component Library

Aplikacja udostępnia gotowe komponenty responsywne:

- `ResponsiveForm` - wrapper dla formularzy
- `FormFields` - grid z konfigurowalnymi kolumnami
- `FormFooter` - responsywny footer z przyciskami
- `ResponsiveDialogFooter` - wrapper dla DialogFooter

Przykład użycia:

```tsx
import { ResponsiveForm, FormFields, FormFooter } from '@/components/ui/responsive-form';

<ResponsiveForm onSubmit={handleSubmit}>
  <FormFields columns={2}>
    <FormField name="name" />
    <FormField name="email" />
  </FormFields>

  <FormFooter description="Opis pomocniczy">
    <Button type="submit">Wyślij</Button>
  </FormFooter>
</ResponsiveForm>
```

## Testing Checklist

Przed commitem zmian upewnij się, że:

- [ ] Komponent wygląda dobrze na 375px (iPhone SE)
- [ ] Komponent wygląda dobrze na 768px (iPad)
- [ ] Komponent wygląda dobrze na 1920px (Desktop)
- [ ] Wszystkie przyciski są klikalne (min 44x44px)
- [ ] Tekst jest czytelny na wszystkich rozmiarach
- [ ] Nie ma poziomego scrollowania na mobile
- [ ] Formularz jest użyteczny jedną ręką na mobile

## Resources

- [Tailwind CSS Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
