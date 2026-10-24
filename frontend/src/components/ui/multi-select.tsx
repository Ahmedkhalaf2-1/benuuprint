"use client";

import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Checkbox } from "./checkbox";
import { fieldClass } from "./input";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import type { Option } from "./select";

export function MultiSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  className,
  "aria-label": ariaLabel,
}: {
  value: string[];
  onValueChange: (v: string[]) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const selected = options.filter((o) => value.includes(o.value));
  const summary = selected.length === 0 ? placeholder : selected.length <= 2 ? selected.map((o) => o.label).join(", ") : `${selected.length} selected`;
  return (
    <Popover>
      <PopoverTrigger aria-label={ariaLabel} className={cn(fieldClass, "flex h-9 items-center justify-between gap-2 text-start", selected.length === 0 && "text-muted-foreground", className)}>
        <span className="truncate">{summary}</span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="max-h-72 w-64 overflow-y-auto p-1">
        {options.map((o) => {
          const id = `ms-${o.value}`;
          return (
            <label key={o.value} htmlFor={id} className="flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-white/5">
              <Checkbox
                id={id}
                checked={value.includes(o.value)}
                onCheckedChange={(c) => onValueChange(c === true ? [...value, o.value] : value.filter((v) => v !== o.value))}
              />
              {o.label}
            </label>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
