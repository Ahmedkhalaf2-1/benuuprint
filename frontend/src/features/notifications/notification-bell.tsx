"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SeverityBadge } from "@/components/data-display/severity-badge";
import { ErrorState } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/query/keys";
import { cn } from "@/lib/utils/cn";

import {
  fetchUnreadCount, listNotifications, markAllNotificationsRead, markNotificationRead, type StaffNotification,
} from "./notifications-api";
import { useI18n } from "@/i18n/provider";

export function NotificationBell() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const unread = useQuery({ queryKey: queryKeys.notifications.unreadCount, queryFn: ({ signal }) => fetchUnreadCount(signal), refetchInterval: 60_000, staleTime: 30_000 });
  const latest = useQuery({
    queryKey: queryKeys.notifications.list({ latest: true }),
    queryFn: ({ signal }) => listNotifications({ pageSize: 8 }, signal),
    enabled: open,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
  const markRead = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
  const markAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });

  const count = unread.data ?? 0;
  const label = count > 0 ? `Notifications, ${count} unread` : "Notifications";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span className="relative inline-flex">
          <IconButton label={label} icon={<Bell />} />
          {count > 0 ? (
            <span aria-hidden className="pointer-events-none absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-semibold leading-none text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(24rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="text-sm font-semibold">{t("notifications.notifications")}</h2>
          <Button variant="ghost" size="sm" disabled={count === 0} loading={markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck />{" "}{t("notifications.markAllRead")}</Button>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {latest.isLoading ? (
            <div className="space-y-2 p-3"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
          ) : latest.error ? (
            <ErrorState error={latest.error} onRetry={() => latest.refetch()} className="py-6" />
          ) : !latest.data || latest.data.data.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">{t("notifications.youReAllCaughtUp")}</p>
          ) : (
            <ul className="divide-y">
              {latest.data.data.map((n) => (
                <NotificationRow key={n.id} n={n} onRead={() => !n.readAt && markRead.mutate(n.id)} />
              ))}
            </ul>
          )}
        </div>
        <div className="border-t px-3 py-2 text-center">
          <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm font-medium text-brand hover:underline">{t("notifications.viewAll")}</Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function NotificationRow({ n, onRead }: { n: StaffNotification; onRead: () => void }) {
  const { fmt } = useI18n();
  const isUnread = !n.readAt;
  return (
    <li>
      <button type="button" onClick={onRead} aria-label={`${isUnread ? "Unread: " : ""}${n.title}`} className={cn("flex w-full flex-col gap-1 px-3 py-2.5 text-start hover:bg-surface-muted", isUnread && "bg-brand-soft/40")}>
        <span className="flex items-center gap-2">
          {isUnread ? <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-brand" /> : null}
          <span className={cn("truncate text-sm", isUnread && "font-semibold")}>{n.title}</span>
          <SeverityBadge severity={n.severity} iconOnly className="ms-auto" />
        </span>
        {n.body ? <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span> : null}
        <span className="text-[0.6875rem] text-muted-foreground">{fmt.dateTime(n.createdAt)}</span>
      </button>
    </li>
  );
}
