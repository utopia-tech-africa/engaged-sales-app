"use client";

import { Calendar as CalendarIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const pad2 = (n: number): string => String(n).padStart(2, "0");

/** Parse `YYYY-MM-DDTHH:mm` (datetime-local) into parts in local time. */
export function parseDatetimeLocalValue(value: string): { date: Date; time: string } | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return {
    date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    time: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  };
}

export function composeDatetimeLocal(date: Date, time: string): string {
  const [hRaw = "0", mRaw = "0"] = time.split(":");
  const h = Number.parseInt(hRaw, 10);
  const m = Number.parseInt(mRaw, 10);
  const next = new Date(date);
  next.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return `${String(next.getFullYear())}-${pad2(next.getMonth() + 1)}-${pad2(next.getDate())}T${pad2(next.getHours())}:${pad2(next.getMinutes())}`;
}

export type DatetimePickerProps = {
  id?: string;
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
  emptyLabel?: string;
  clearable?: boolean;
  onClear?: () => void;
};

export function DatetimePicker({
  id,
  value,
  onChange,
  disabled = false,
  className,
  emptyLabel = "Select date & time",
  clearable = false,
  onClear
}: DatetimePickerProps): React.ReactElement {
  const parsed = parseDatetimeLocalValue(value);
  const [open, setOpen] = React.useState(false);
  const reactTimeId = React.useId();
  const timeInputId = id ? `${id}-time` : reactTimeId;

  const displayLabel = parsed
    ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : emptyLabel;

  const defaultMonth = parsed?.date ?? new Date();
  const selectedDay = parsed?.date;
  const timeValue = parsed?.time ?? "09:00";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "mt-1 h-auto min-h-10 w-full justify-start text-left font-normal",
            !parsed && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 size-4 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{displayLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex flex-col gap-2 p-3">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            defaultMonth={defaultMonth}
            selected={selectedDay}
            onSelect={(day) => {
              if (!day) {
                return;
              }
              onChange(composeDatetimeLocal(day, timeValue));
            }}
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-2">
            <label className="text-xs font-medium text-muted-foreground" htmlFor={timeInputId}>
              Time
            </label>
            <input
              id={timeInputId}
              type="time"
              step={60}
              value={timeValue}
              disabled={disabled}
              className={cn(
                "min-w-0 flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
              onChange={(e) => {
                const t = e.target.value;
                const baseDate = parsed?.date ?? new Date();
                onChange(composeDatetimeLocal(baseDate, t));
              }}
            />
          </div>
          {clearable && parsed && onClear ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
            >
              Clear date
            </Button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
