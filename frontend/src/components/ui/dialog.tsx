"use client";

import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button } from "./button";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  className,
  title,
  description,
  children,
  ...props
}: ComponentProps<typeof D.Content> & { title: string; description?: string }) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/70" />
      <D.Content
        className={cn("fixed start-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-y-1/2 rounded-lg border border-border-strong bg-surface-muted p-5 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] ltr:-translate-x-1/2 rtl:translate-x-1/2", className)}
        {...props}
      >
        <D.Title className="text-lg font-semibold tracking-tight">{title}</D.Title>
        {description ? <D.Description className="mt-1 text-sm text-muted-foreground">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
        <div className="mt-4">{children}</div>
        <D.Close aria-label="Close" className="absolute end-3 top-3 rounded-sm p-1 text-muted-foreground hover:bg-white/5">
          <X aria-hidden className="size-4" />
        </D.Close>
      </D.Content>
    </D.Portal>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}): ReactNode {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description={description}>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={destructive ? "danger" : "primary"} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
