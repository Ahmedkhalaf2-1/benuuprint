"use client";

import { UploadCloud } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils/cn";
import { useI18n } from "@/i18n/provider";

/**
 * UI shell only. It hands the chosen File objects to `onFiles` and nothing else: files are never
 * sent anywhere from here. Backend assets are private; real uploads go through backend routes later.
 */
export function FileDropzoneShell({
  onFiles,
  accept,
  multiple = false,
  disabled,
  hint,
  className,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  hint?: string;
  className?: string;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
      className={cn("flex flex-col items-center gap-1 rounded-lg border border-dashed bg-surface-muted px-4 py-8 text-center", over && "border-brand bg-brand-soft", disabled && "opacity-60", className)}
    >
      <UploadCloud aria-hidden className="size-6 text-muted-foreground" />
      <p className="text-sm">{t("common.dropFilesHereOr")}{" "}
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="font-medium text-brand underline-offset-2 hover:underline">{t("common.browse")}</button>
      </p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
