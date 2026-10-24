"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { StatusBadge } from "@/components/data-display/status-badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchInput } from "@/components/ui/search-input";
import { fieldClass } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { useCustomerOptions } from "./hooks";
import { useI18n } from "@/i18n/provider";

export interface PickedCustomer {
  id: string;
  customerNumber: string;
  displayName: string;
}

/** Searchable customer selector backed by remote search (10 results at a time); never loads the full table. */
export function CustomerPicker({
  id,
  value,
  onChange,
  disabled,
  invalid,
  describedBy,
}: {
  id?: string;
  value: PickedCustomer | null;
  onChange: (customer: PickedCustomer) => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const q = useCustomerOptions(search, open);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(fieldClass, "flex h-9 items-center justify-between gap-2 text-start", !value && "text-muted-foreground")}
      >
        <span className="truncate">{value ? `${value.customerNumber} · ${value.displayName}` : t("customers.selectACustomer")}</span>
        <ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent className="w-[min(26rem,calc(100vw-2rem))] p-2">
        <SearchInput value={search} onValueChange={setSearch} placeholder={t("customers.searchCustomers")} aria-label={t("customers.searchCustomers2")} />
        <ul role="listbox" aria-label={t("customers.customers")} className="mt-2 max-h-64 overflow-y-auto">
          {q.isLoading ? <li className="px-2 py-3 text-sm text-muted-foreground">{t("common.searching")}</li> : q.error ? (
            <li role="alert" className="px-2 py-3 text-sm text-danger">{t("customers.couldNotLoadCustomers")}</li>
          ) : q.data && q.data.data.length === 0 ? (
            <li className="px-2 py-3 text-sm text-muted-foreground">{t("customers.noCustomersMatch")}</li>
          ) : (
            q.data?.data.map((c) => (
              <li key={c.id} role="option" aria-selected={value?.id === c.id}>
                <button
                  type="button"
                  onClick={() => { onChange({ id: c.id, customerNumber: c.customerNumber, displayName: c.displayName }); setOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-start text-sm hover:bg-white/5"
                >
                  <span className="w-20 shrink-0 font-mono text-xs">{c.customerNumber}</span>
                  <span className="min-w-0 flex-1 truncate">{c.displayName}</span>
                  {c.status !== "ACTIVE" ? <StatusBadge status={c.status} /> : null}
                  {value?.id === c.id ? <Check aria-hidden className="size-4 text-brand" /> : null}
                </button>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
