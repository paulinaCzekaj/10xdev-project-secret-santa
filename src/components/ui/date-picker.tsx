import * as React from "react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  disabled?: boolean;
  minDate?: Date;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  value,
  onChange,
  disabled,
  minDate,
  placeholder = "Wybierz datę",
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  const handleSelect = (date: Date | undefined) => {
    onChange(date);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "h-11 w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
          onClick={() => {
            setOpen(true);
          }}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, "dd.MM.yyyy", { locale: pl }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          disabled={(date) => {
            if (minDate) {
              return date < minDate;
            }
            return false;
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
