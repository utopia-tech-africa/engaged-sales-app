"use client";

import { CalendarIcon } from "lucide-react";
import { type ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
};

const toDateInputValue = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(year)}-${month}-${day}`;
};

const parseDateInputValue = (value: string): Date | undefined => {
  if (value.trim().length === 0) {
    return undefined;
  }
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed;
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className
}: DatePickerProps): ReactElement {
  const selected = parseDateInputValue(value);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "mt-1 h-10 w-full justify-start rounded-lg border-input bg-background text-left text-sm font-normal",
            selected === undefined ? "text-muted-foreground" : "text-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 opacity-70" aria-hidden />
          {selected !== undefined ? selected.toLocaleDateString() : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          captionLayout="dropdown"
          selected={selected}
          onSelect={(next) => {
            if (next === undefined) {
              onChange("");
              return;
            }
            onChange(toDateInputValue(next));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
