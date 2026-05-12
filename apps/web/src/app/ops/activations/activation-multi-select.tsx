"use client";

import { ChevronDown } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactElement } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ActivationMultiSelectOption = {
  id: string;
  label: string;
  isActive: boolean;
};

type ActivationMultiSelectProps = {
  options: readonly ActivationMultiSelectOption[];
  valueIds: readonly string[];
  onValueChange: (nextIds: string[]) => void;
  placeholder?: string;
  isLoading?: boolean;
  emptyListHint?: string;
  disabled?: boolean;
  id?: string;
};

function buildTriggerLabel(args: {
  isLoading: boolean;
  optionsLength: number;
  emptyListHint: string;
  placeholder: string;
  selectedLabels: string[];
}): string {
  if (args.isLoading) {
    return "Loading…";
  }
  if (args.optionsLength === 0) {
    return args.emptyListHint;
  }
  if (args.selectedLabels.length === 0) {
    return args.placeholder;
  }
  if (args.selectedLabels.length <= 2) {
    return args.selectedLabels.join(", ");
  }
  const [first, second] = args.selectedLabels;
  return `${first}, ${second} +${String(args.selectedLabels.length - 2)} more`;
}

export function ActivationMultiSelect({
  options,
  valueIds,
  onValueChange,
  placeholder = "Select…",
  isLoading = false,
  emptyListHint = "No options available.",
  disabled = false,
  id
}: ActivationMultiSelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [panelWidth, setPanelWidth] = useState<number | undefined>(undefined);

  useLayoutEffect(() => {
    if (!open || triggerRef.current === null) {
      return;
    }
    setPanelWidth(triggerRef.current.offsetWidth);
  }, [open]);

  const selectedLabels = valueIds
    .map((vid) => options.find((o) => o.id === vid)?.label)
    .filter((n): n is string => n !== undefined);

  const triggerLabel = buildTriggerLabel({
    isLoading,
    optionsLength: options.length,
    emptyListHint,
    placeholder,
    selectedLabels
  });

  const triggerDisabled = disabled || isLoading || options.length === 0;
  const showMutedTrigger = !isLoading && options.length > 0 && selectedLabels.length === 0;

  const toggle = (optionId: string): void => {
    if (valueIds.includes(optionId)) {
      onValueChange(valueIds.filter((v) => v !== optionId));
    } else {
      onValueChange([...valueIds, optionId]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          id={id}
          disabled={triggerDisabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm outline-none ring-offset-background",
            "focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            showMutedTrigger && "text-muted-foreground"
          )}
        >
          <span className="min-w-0 flex-1 truncate text-left">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={4}
        className={cn(
          "max-h-72 overflow-y-auto border-border p-1 shadow-md",
          "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
        )}
        style={panelWidth !== undefined ? { width: panelWidth } : undefined}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <ul role="listbox" aria-multiselectable className="space-y-0.5">
          {options.map((opt) => {
            const checked = valueIds.includes(opt.id);
            return (
              <li key={opt.id} role="option" aria-selected={checked}>
                <label
                  className={cn(
                    "flex cursor-pointer select-none items-start gap-2 rounded-md px-2 py-1.5 text-sm text-foreground outline-none",
                    "hover:bg-accent hover:text-accent-foreground focus-within:bg-accent focus-within:text-accent-foreground"
                  )}
                  onPointerDown={(e) => {
                    e.preventDefault();
                  }}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 size-4 shrink-0 rounded border-input"
                    checked={checked}
                    onChange={() => {
                      toggle(opt.id);
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{opt.label}</span>
                    {!opt.isActive ? (
                      <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
