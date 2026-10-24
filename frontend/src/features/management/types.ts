/**
 * Shapes verified against the live backend (2026-10-22). The OpenAPI document types these responses only as "object", so every
 * field below was read from real responses. `null` means "not computable" and is NEVER shown as zero.
 */
export type Range = { from?: string; to?: string };
export type Severity = "CRITICAL" | "WARNING" | "INFO";
export type Department = "FABRIC" | "PATTERN" | "CUTTING" | "PRINTING" | "SEWING" | "QC" | "PACKAGING" | "GENERAL" | "DELIVERY";
export const DEPARTMENTS = ["FABRIC", "PATTERN", "CUTTING", "PRINTING", "SEWING", "QC", "PACKAGING", "GENERAL"] as const;

export interface Stamped { generatedAt: string; timezone?: string }
export interface RangeInfo { range: { from: string; to: string } }

export interface AttentionItem {
  type: string;
  severity: Severity | string;
  score?: number;
  entityType?: string;
  entityId?: string;
  reference?: string;
  title: string;
  reason?: string;
  priority?: string;
  responsible?: { department?: string | null; users?: Array<{ id?: string; name?: string } | string> };
  ageMinutes?: number | null;
  dueAt?: string | null;
  context?: Record<string, string | null | undefined>;
}
export interface NeedsAttention {
  generatedAt: string;
  summary: { total: number; bySeverity: Record<Severity, number>; byType: Record<string, number> };
  items: AttentionItem[];
  note?: string;
}

export interface ProductionKpis extends Stamped, RangeInfo {
  activeJobs: number; plannedJobs: number; onHoldJobs: number; blockedJobs: number; delayedJobs: number; completedJobs: number; completedToday: number; completedThisWeek: number;
  averageLeadTimeMinutes: number | null; averageStageDurationMinutes: number | null; stagesMeasured: number;
  onTimeCompletion: { onTime: number; measured: number; ratePercent: number | null };
  definitions?: Record<string, string>;
}
export interface OrderKpis extends Stamped, RangeInfo {
  current: { inProduction: number; productionCompleted: number; readyForDelivery: number; partiallyShipped: number; outForDelivery: number; delivered: number; completed: number; cancelled: number; onHold: number; delayed: number };
  inRange: { delivered: number; completed: number; cancelled: number };
  averageCycleTimeMinutes: number | null;
  onTimeDelivery: { onTime: number; measured: number; ratePercent: number | null };
  definitions?: Record<string, string>;
}
export interface QualityKpis extends Stamped, RangeInfo {
  inspections: { completed: number; inProgress: number; pass: number; fail: number; conditionalPass: number; passRatePercent: number | null; failRatePercent: number | null; conditionalPassRatePercent: number | null; inspectedUnits: number; failedUnits: number };
  rework: { created: number; open: number; affectedQuantity: number; note?: string };
  rejectedUnits: number; reworkFlaggedUnits: number;
  failuresByStage: Array<{ stageCode: string; stageName: string; failures: number; failedUnits: number }>;
  failuresByProduct: Array<{ productTypeId: string; productName: string; failures: number }>;
  repeatFailure: { jobStagesWithFailure: number; repeated: number; ratePercent: number | null; definition?: string };
  notDerived?: string[];
}
export interface CurrencyBlock { currency: string; ordersWithAcceptedQuotation: number; acceptedQuotationValue: string; verifiedPayments: string; outstandingBalance: string; overpaidAmount: string }
export interface CommercialKpis extends Stamped, RangeInfo {
  byCurrency: CurrencyBlock[];
  verifiedInRange: Array<{ currency: string; target: string; total: string; payments: number }>;
  orders: { unpaid: number; partiallyPaid: number; paid: number; withoutAcceptedQuotation: number; commercialReapprovalRequired: number };
  definitions?: Record<string, string>;
}
export interface DeliveryKpis extends Stamped, RangeInfo {
  shipments: { draft: number; ready: number; dispatched: number; inTransit: number; failed: number; deliveredInRange: number; returnedInRange: number };
  averageDispatchToDeliveryMinutes: number | null; dispatchToDeliveryMeasured: number; partialDeliveryOrders: number;
  overdueDeliveryCommitments: { ordersPastTargetDate: number; shipmentsPastScheduledDate: number };
  definitions?: Record<string, string>;
}
export interface BottleneckStage {
  stageCode: string; stageName: string; department: string; completedInRange: number; averageDurationMinutes: number | null; startedInRange: number; averageWaitBeforeStartMinutes: number | null;
  queuedNow: number; queuedJobsNow: number; blockedNow: number; overdueNow: number; qcInspections: number | null; qcFailureRatePercent: number | null; reworkTargeted: number; reworkRatePercent: number | null; totalWaitMinutes: number;
}
export interface Bottlenecks extends Stamped, RangeInfo { orderedBy: string; caution?: string; definitions?: Record<string, string>; stages: BottleneckStage[] }
interface Qty { stages: number; jobs: number; units: number }
export interface WipStage { stageCode: string; stageName: string; department: string; sequence: number; queued: Qty; active: Qty; blocked: Qty; upcomingStages: number; completedToday: { stages: number; units: number } }
export interface Wip { generatedAt: string; todayStartsAt?: string; stages: WipStage[] }
export interface DepartmentWorkload { department: string; readyStages: number; inProgressStages: number; blockedStages: number; jobsInvolved: number; plannedUnits: number; remainingUnits: number; overdueStages: number; unassignedReadyStages: number; assignedStaffCount: number; eligibleStaffCount: number }
export interface WorkloadDepartments { generatedAt: string; note?: string; departments: DepartmentWorkload[] }
export interface StaffWorkload {
  userId: string; name: string; roles: string[]; activeAssignments: number; readyAssignments: number; inProgressAssignments: number; blockedAssignments: number; overdueAssignments: number; plannedQuantity: number;
  assignedExpectedMinutes: number; capacityMinutesPerDay: number | null; stagesCompleted: number; producedQuantity: number; rejectedQuantity: number; averageCompletionMinutes: number | null; onTimeCompletionRate: number | null; reworkOnAssignedStages: number;
}
export interface StaffWorkloadPage { data: StaffWorkload[]; meta: { page: number; pageSize: number; total: number }; note?: string }
export interface UtilizationDay { date: string; demand: number; capacity: number; utilizationPercent: number | null; overloaded: boolean; remainingCapacity: number; capacityUnit: string }
export interface UtilizationSeries { departmentType: string; stageDefinitionId: string | null; stageCode: string | null; days: UtilizationDay[]; overloadedDays: number }
export interface Utilization { timezone: string; from: string; to: string; generatedAt: string; assumptions: string[]; series: UtilizationSeries[]; departmentsWithoutCapacity: Array<string | { departmentType?: string }> }

export type EtaQuality = "HIGH" | "MEDIUM" | "LOW" | string;
export interface BoardStage { stageId: string; stageCode: string; stageName: string; department: string; status: string; dueAt: string | null; assignees: Array<{ name?: string } | string> }
export interface BoardRow {
  jobId: string; jobNumber: string; kind: "SAMPLE" | "BULK" | string; orderId: string | null; orderNumber: string | null; sampleId: string | null; sampleNumber: string | null; batchNumber: string | null;
  customerName: string; brandName: string; productName: string; priority: string; status: string; currentStages: BoardStage[];
  progress: { stagesCompleted: number; stagesRequired: number; percent: number; completedQuantity: number; plannedQuantity: number | null };
  assignees: Array<{ name?: string } | string>; blocked: boolean; delayed: boolean; delayReasons: string[]; delayMinutes: number; targetCompletionDate: string | null;
  /** Present only for callers with eta.read. */
  estimatedCompletionAt?: string | null; etaDataQuality?: EtaQuality; projectedLate?: boolean;
}
export interface ManagementBoard { data: BoardRow[]; meta: { page: number; pageSize: number; total: number }; generatedAt: string; etaIncluded: boolean }

export interface AlertRow {
  id: string; type: string; entityType: string; entityId: string; status: "OPEN" | "RESOLVED" | string; severity: Severity | string; reference: string; title: string; reason: string; department: string | null;
  firstDetectedAt: string; lastDetectedAt: string; resolvedAt: string | null; lastNotifiedAt: string | null; lastNotifiedSeverity: string | null; escalationLevel: number;
}
export interface AlertsPage { data: AlertRow[]; meta: { page: number; pageSize: number; total: number } }
export interface SchedulerHealth { enabled: boolean; intervals: { outbox: number; dispatch: number; alerts: number }; runningNow: string[] }

export interface PipelineDashboard { generatedAt?: string; timezone?: string; pipeline?: { samples?: Record<string, number>; orders?: Record<string, number> } }
