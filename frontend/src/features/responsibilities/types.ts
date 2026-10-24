/**
 * Shapes from docs/PHASE_RESPONSIBILITY_PROCESS_VISIBILITY.md and the live OpenAPI. Staff/Admin only: nothing here is ever
 * rendered in the customer portal. Where the document names a field without spelling out its inner shape, the field is typed
 * loosely (optional / nullable) rather than invented.
 */
export interface UserRef { id: string; name: string }
export type Health = "OK" | "NEEDS_ATTENTION" | "NOT_CONFIGURED";
export type AssignmentSource = "GLOBAL_DEFAULT" | "CUSTOMER_OVERRIDE" | "MANUAL" | "UNASSIGNED";

export interface ResponsibilityRule {
  scope: "GLOBAL" | "CUSTOMER"; customerId: string | null; stageKey: string;
  primaryUser: UserRef; additionalUsers: UserRef[];
  health: "OK" | "NEEDS_ATTENTION"; reason: "ASSIGNEE_DISABLED" | "ASSIGNEE_INELIGIBLE" | null; updatedAt: string;
}

export interface ResponsibilityOverviewItem {
  stageKey: string; label: string; group: "FACTORY" | "FULFILLMENT"; eligibleRoleCodes: string[];
  globalDefault: ResponsibilityRule | null; effectiveUser: UserRef | null; source: "GLOBAL_DEFAULT" | "UNASSIGNED";
  health: Health; reason: string | null; activeWork: number;
}

export interface CustomerResponsibilityItem {
  stageKey: string; label: string; group: "FACTORY" | "FULFILLMENT"; eligibleRoleCodes: string[];
  source: "CUSTOMER_OVERRIDE" | "GLOBAL_DEFAULT" | "UNASSIGNED";
  effectiveUser: UserRef | null; globalDefaultUser: UserRef | null; customerOverrideUser: UserRef | null;
  health: Health; reason: string | null; activeWork: number;
}
/** The matrix is an array in the OpenAPI; the document adds `commercial.salesOwner`, so an enveloped form is accepted too. */
export interface CustomerMatrix { items: CustomerResponsibilityItem[]; commercial: { salesOwner?: unknown } | null }

export interface AttentionFeed {
  rulesNeedingAttention?: { count: number; items: Array<{ scope: string; customerId: string | null; stageKey: string; configuredUser: UserRef | null; effectiveUser: UserRef | null; health: string; reason: string | null }> };
  unassignedActiveStages?: { count: number; byStageKey?: Array<{ stageKey: string; label?: string; count?: number }> };
}

export type ApplyMode = "UNASSIGNED_ONLY" | "REPLACE";
export type ApplyResult = Record<string, unknown> | null;

export interface Blocker { active: boolean; reason: string | null; type: string | null; since: string | null }
export interface Handoff { toStageKey: string; toLabel: string; toStatus: string; toUser: UserRef | null }
export interface ProcessStage {
  stageKey: string; label: string; sequence: number; attempt?: number; status: string; isOnHold?: boolean;
  responsibleUser: UserRef | null; additionalUsers?: UserRef[]; assignmentSource?: AssignmentSource | null;
  assignedAt?: string | null; readyAt?: string | null; startedAt?: string | null; startedBy?: UserRef | null;
  completedAt?: string | null; completedBy?: UserRef | null; durationMinutes?: number | null; dueAt?: string | null;
  blocker?: Blocker | null; handoff?: Handoff | null;
}
/** currentStage / nextStage / lastCompleted: the document does not spell out their inner shape, so only the stage-item fields are read, all optional. */
export type StageSummary = Partial<ProcessStage>;
export interface Progress { completedStages: number; totalStages: number; percent: number }
export interface JobProcess {
  jobId?: string; jobNumber?: string; batchNumber?: string | null;
  currentStage: StageSummary | null; nextStage: StageSummary | null; lastCompleted: StageSummary | null;
  activeStages?: StageSummary[]; stages: ProcessStage[]; progress?: Progress | null;
  blocker?: Blocker | null; attention?: unknown;
}

export interface WorkItem {
  referenceType: "SAMPLE" | "ORDER"; referenceId: string; referenceNumber: string; jobId: string; jobNumber: string; batchNumber?: string | null;
  currentStage: StageSummary | null; nextStage: StageSummary | null; progress?: Progress | null; blocker?: Blocker | null;
  attention?: unknown; priority?: string; productName?: string | null; eta?: unknown;
}
export interface CustomerOperations { currentWork: WorkItem[]; activeSamples?: unknown[]; activeOrders?: unknown[] }

export interface CurrentProcess {
  referenceNumber: string; jobNumber: string; stage: string; stageLabel: string; status: string; attention?: unknown;
  responsibleUser: UserRef | null; startedAt: string | null; progressPercent: number; blocked: boolean;
}
export interface ResponsibilitySummary {
  salesOwner?: unknown; areas: Array<{ stageKey: string; label: string; user: UserRef | null; source: string; health: string }>;
  configuredCount: number; totalAreas: number; needsAttention: number;
}
export interface CustomerOpsSummary {
  responsibilitySummary?: ResponsibilitySummary; currentProcess?: CurrentProcess | null; currentProcesses?: CurrentProcess[]; activeJobCount?: number;
}
