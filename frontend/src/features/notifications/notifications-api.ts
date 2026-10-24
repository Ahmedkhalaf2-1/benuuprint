import { api } from "@/lib/api/client";
import type { Paginated } from "@/types/api";

/** Fields from the Notification model (PHASE_6B §4); only what the staff in-app UI needs. */
export interface StaffNotification {
  id: string;
  type: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | string;
  title: string;
  body?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  readAt: string | null;
  createdAt: string;
}

export function listNotifications(query: { unread?: boolean; page?: number; pageSize?: number } = {}, signal?: AbortSignal) {
  return api.get<Paginated<StaffNotification> & { unreadCount: number }>("/staff/notifications", { query, signal });
}

/** Verified: `{ unreadCount: number }`. */
export async function fetchUnreadCount(signal?: AbortSignal): Promise<number> {
  const r = await api.get<{ unreadCount: number }>("/staff/notifications/unread-count", { signal });
  return r.unreadCount;
}

export const markNotificationRead = (id: string) => api.post<unknown>(`/staff/notifications/${encodeURIComponent(id)}/read`);
export const markAllNotificationsRead = () => api.post<unknown>("/staff/notifications/read-all");
