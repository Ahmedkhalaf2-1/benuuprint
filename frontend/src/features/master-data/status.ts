import type { RefRow } from "./types";

/** isActive + archivedAt -> one status code for StatusBadge. Inactive/archived are retired rows, not deletions. */
export function rowStatus(row: Pick<RefRow, "isActive" | "archivedAt">): "ACTIVE" | "INACTIVE" | "ARCHIVED" {
  return row.archivedAt ? "ARCHIVED" : row.isActive ? "ACTIVE" : "INACTIVE";
}
