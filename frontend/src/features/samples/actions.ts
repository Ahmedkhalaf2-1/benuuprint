/**
 * UI metadata for the lifecycle actions the backend reports in `allowedActions`. This is NOT a state machine: which
 * actions are available is decided by the backend (status + the caller's permissions); the frontend only supplies
 * the route, wording and whether a reason is collected. Unknown action names are ignored.
 */
export interface ActionMeta {
  action: string;
  route: string;
  label: string;
  confirmLabel: string;
  description: string;
  /** Reason collection: required (hold, reject, cancel, request-changes), optional (resume) or none. */
  reason: "required" | "optional" | "none";
  tone: "primary" | "neutral" | "danger";
}

export const ACTION_META: Record<string, ActionMeta> = {
  submit: { action: "submit", route: "submit", label: "Submit sample", confirmLabel: "Submit", description: "Sends the sample for internal review. The specification is locked after submission.", reason: "none", tone: "primary" },
  "start-review": { action: "start-review", route: "review", label: "Start review", confirmLabel: "Start review", description: "Marks the sample as under internal review.", reason: "none", tone: "primary" },
  "request-changes": { action: "request-changes", route: "request-changes", label: "Request changes", confirmLabel: "Return to draft", description: "Returns the sample to DRAFT so the specification can be edited. A reason is required.", reason: "required", tone: "neutral" },
  hold: { action: "hold", route: "hold", label: "Put on hold", confirmLabel: "Put on hold", description: "Pauses the sample. It returns to its previous status when resumed.", reason: "required", tone: "neutral" },
  resume: { action: "resume", route: "resume", label: "Resume", confirmLabel: "Resume", description: "Returns the sample to the status it had before the hold.", reason: "optional", tone: "primary" },
  reject: { action: "reject", route: "reject", label: "Reject", confirmLabel: "Reject sample", description: "Rejects the sample. This is final.", reason: "required", tone: "danger" },
  cancel: { action: "cancel", route: "cancel", label: "Cancel sample", confirmLabel: "Cancel sample", description: "Cancels the sample. This is final.", reason: "required", tone: "danger" },
  complete: { action: "complete", route: "complete", label: "Mark completed", confirmLabel: "Mark completed", description: "Closes the approved sample.", reason: "none", tone: "primary" },
  revise: { action: "revise", route: "revise", label: "Create revision", confirmLabel: "Create revision", description: "Starts a new revision of this sample as a new draft; the history of this one is kept.", reason: "none", tone: "neutral" },
};

/** Actions to render, in a stable order: primary first, destructive last. */
export function visibleActions(allowed: readonly string[]): ActionMeta[] {
  const order = Object.keys(ACTION_META);
  const known = allowed.flatMap((a) => (ACTION_META[a] ? [ACTION_META[a]!] : []));
  const rank = { primary: 0, neutral: 1, danger: 2 } as const;
  // stable, independent of the order the backend lists them in
  return [...known].sort((a, b) => rank[a.tone] - rank[b.tone] || order.indexOf(a.action) - order.indexOf(b.action));
}
