import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * ResponsiveForm - Wrapper dla formularzy z mobile-first podejściem
 *
 * @example
 * <ResponsiveForm onSubmit={handleSubmit}>
 *   <FormFields columns={2}>
 *     <Input name="name" />
 *     <Input name="email" />
 *   </FormFields>
 * </ResponsiveForm>
 */
interface ResponsiveFormProps {
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  className?: string;
  testId?: string;
}

export function ResponsiveForm({ children, onSubmit, className, testId }: ResponsiveFormProps) {
  return (
    <form onSubmit={onSubmit} className={cn("space-y-6", className)} data-testid={testId}>
      {children}
    </form>
  );
}

/**
 * FormFields - Grid z konfigurowalnymi kolumnami dla pól formularza
 * Mobile: zawsze 1 kolumna
 * Tablet+: 2 lub 3 kolumny w zależności od konfiguracji
 *
 * @example
 * <FormFields columns={2}>
 *   <Input name="firstName" />
 *   <Input name="lastName" />
 * </FormFields>
 */
interface FormFieldsProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3;
  className?: string;
}

export function FormFields({ children, columns = 2, className }: FormFieldsProps) {
  const gridClasses = cn(
    "grid gap-4",
    {
      "grid-cols-1": columns === 1,
      "grid-cols-1 md:grid-cols-2": columns === 2,
      "grid-cols-1 md:grid-cols-2 lg:grid-cols-3": columns === 3,
    },
    className
  );

  return <div className={gridClasses}>{children}</div>;
}

/**
 * FormFooter - Responsywny footer z przyciskami i opcjonalnym opisem
 * Mobile: Przycisk na górze (order-1), opis na dole (order-2), oba full-width
 * Tablet+: Opis po lewej, przyciski po prawej, oba auto-width
 *
 * @example
 * <FormFooter description="Email jest opcjonalny">
 *   <Button type="submit">Wyślij</Button>
 * </FormFooter>
 */
interface FormFooterProps {
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function FormFooter({ description, children, className }: FormFooterProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center", className)}>
      {description && <div className="text-sm text-muted-foreground order-2 sm:order-1">{description}</div>}
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
        {React.Children.map(children, (child) => {
          if (React.isValidElement<{ className?: string }>(child)) {
            return React.cloneElement(child, {
              className: cn("w-full sm:w-auto", child.props.className),
            });
          }
          return child;
        })}
      </div>
    </div>
  );
}

/**
 * FormSection - Flexbox kontener dla elementów formularza z konfigurowalnąorientacją
 * Mobile: zawsze vertical (flex-col)
 * Tablet+: horizontal (flex-row) lub vertical w zależności od konfiguracji
 *
 * @example
 * <FormSection orientation="horizontal">
 *   <Select name="from" />
 *   <ArrowRight />
 *   <Select name="to" />
 * </FormSection>
 */
interface FormSectionProps {
  children: React.ReactNode;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function FormSection({ children, orientation = "horizontal", className }: FormSectionProps) {
  const flexClasses = cn(
    "flex gap-4",
    {
      "flex-col md:flex-row md:items-center": orientation === "horizontal",
      "flex-col": orientation === "vertical",
    },
    className
  );

  return <div className={flexClasses}>{children}</div>;
}

/**
 * ResponsiveDialogFooter - Wrapper dla DialogFooter z mobile-first podejściem
 * Mobile: Stack vertically, przyciski full-width
 * Tablet+: Horizontal layout, przyciski auto-width
 *
 * Używaj tego zamiast standardowego DialogFooter gdy chcesz zapewnić
 * pełną responsywność przycisków.
 *
 * @example
 * <ResponsiveDialogFooter>
 *   <Button variant="outline">Anuluj</Button>
 *   <Button>Potwierdź</Button>
 * </ResponsiveDialogFooter>
 */
interface ResponsiveDialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveDialogFooter({ children, className }: ResponsiveDialogFooterProps) {
  return (
    <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-6", className)}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement<{ className?: string }>(child)) {
          return React.cloneElement(child, {
            className: cn("w-full sm:w-auto", child.props.className),
          });
        }
        return child;
      })}
    </div>
  );
}

/**
 * MobileSeparator - Komponent, który jest ukryty na mobile, widoczny na tablet+
 * Użyteczny dla wizualnych separatorów typu strzałka między elementami
 *
 * @example
 * <MobileSeparator>
 *   <ArrowRight className="h-4 w-4" />
 * </MobileSeparator>
 */
interface MobileSeparatorProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileSeparator({ children, className }: MobileSeparatorProps) {
  return <div className={cn("hidden md:flex items-center justify-center py-2", className)}>{children}</div>;
}
