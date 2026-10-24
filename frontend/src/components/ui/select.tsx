"use client";

import { Check, ChevronDown } from "lucide-react";
import { Select as S } from "radix-ui";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";
import { fieldClass } from "./input";

export interface Option {
  value: string;
  label: string;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  className,
  id,
  "aria-label": ariaLabel,
}: {
  value?: string;
  onValueChange: (v: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}) {
  const { t } = useI18n();
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger id={id} aria-label={ariaLabel} className={cn(fieldClass, "flex h-9 items-center justify-between gap-2 data-[placeholder]:text-muted-foreground", className)}>
        <S.Value placeholder={placeholder ? t.text(placeholder) : t("common.selectEllipsis")} />
        <S.Icon><ChevronDown aria-hidden className="size-4 text-muted-foreground" /></S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={4} className="z-50 max-h-72 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border bg-surface shadow-md">
          <S.Viewport className="p-1">
            {options.map((o) => (
              <S.Item key={o.value} value={o.value} className="relative flex h-8 cursor-pointer select-none items-center rounded-sm ps-7 pe-2 text-sm outline-none data-[highlighted]:bg-white/5">
                <S.ItemIndicator className="absolute start-2"><Check aria-hidden className="size-3.5" /></S.ItemIndicator>
                <S.ItemText>{t.text(o.label)}</S.ItemText>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}
