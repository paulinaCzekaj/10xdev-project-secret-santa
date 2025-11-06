import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";

/**
 * Text input field wrapper for React Hook Form
 */
interface TextFormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  testId?: string;
  className?: string;
}

export function TextFormField({
  name,
  label,
  placeholder,
  disabled,
  maxLength,
  testId,
  className = "h-11 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500",
}: TextFormFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-900 font-medium">{label}</FormLabel>
          <FormControl>
            <Input
              placeholder={placeholder}
              {...field}
              disabled={disabled}
              autoComplete="off"
              maxLength={maxLength}
              className={className}
              data-testid={testId}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Number input field wrapper with optional suffix (e.g., currency)
 */
interface NumberFormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  suffix?: string;
  min?: number;
  step?: number;
  disabled?: boolean;
  testId?: string;
}

export function NumberFormField({
  name,
  label,
  placeholder,
  suffix,
  min,
  step,
  disabled,
  testId,
}: NumberFormFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-gray-900 font-medium">{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <Input
                type="number"
                placeholder={placeholder}
                {...field}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === "" ? undefined : Number(value));
                }}
                value={field.value ?? ""}
                disabled={disabled}
                className={`h-11 bg-gray-50 border-gray-300 focus:border-red-500 focus:ring-red-500 ${
                  suffix ? "pr-16" : ""
                }`}
                min={min}
                step={step}
                data-testid={testId}
              />
              {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none">
                  {suffix}
                </span>
              )}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

/**
 * Date picker field wrapper
 */
interface DateFormFieldProps {
  name: string;
  label: string;
  placeholder?: string;
  minDate?: Date;
  disabled?: boolean;
  testId?: string;
  className?: string;
}

export function DateFormField({
  name,
  label,
  placeholder,
  minDate,
  disabled,
  testId,
  className = "bg-gray-50 border-gray-300",
}: DateFormFieldProps) {
  const { control } = useFormContext();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel className="text-gray-900 font-medium">{label}</FormLabel>
          <FormControl>
            <DatePicker
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
              minDate={minDate}
              placeholder={placeholder}
              className={className}
              data-testid={testId}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
