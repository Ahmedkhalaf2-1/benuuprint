"use client";

import { Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Input } from "./input";

/** Debounced search box; commits to `onValueChange` after `delay` ms of silence. */
export function SearchInput({
  value,
  onValueChange,
  placeholder = "Search…",
  delay = 300,
  className,
  "aria-label": ariaLabel = "Search",
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  "aria-label"?: string;
}) {
  const [local, setLocal] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    // External change (e.g. "clear filters" or back navigation): adopt it.
    setSeen(value);
    setLocal(value);
  }
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onValueChange(local), delay);
    return () => clearTimeout(t);
  }, [local, value, delay, onValueChange]);

  return (
    <div className={cn("relative", className)}>
      <Search aria-hidden className="pointer-events-none absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" aria-label={ariaLabel} value={local} placeholder={placeholder} onChange={(e) => setLocal(e.target.value)} className="ps-8 pe-8 [&::-webkit-search-cancel-button]:hidden" />
      {local ? (
        <button type="button" aria-label="Clear search" onClick={() => { setLocal(""); onValueChange(""); }} className="absolute end-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground">
          <X aria-hidden className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
