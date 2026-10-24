import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PriorityBadge } from "@/components/data-display/priority-badge";
import { SeverityBadge } from "@/components/data-display/severity-badge";
import { statusTone } from "@/components/data-display/status";
import { StatusBadge } from "@/components/data-display/status-badge";
import { AccessDeniedState, EmptyState, ErrorState, PageSkeleton, TableSkeleton } from "@/components/feedback/states";
import { normalizeError } from "@/lib/api/errors";

const REQUIRED = ["DRAFT","SUBMITTED","UNDER_REVIEW","PENDING","READY","PLANNED","CONFIRMED","IN_PROGRESS","IN_PRODUCTION","PARTIALLY_COMPLETED","BLOCKED","ON_HOLD","AWAITING_PAYMENT","AWAITING_APPROVAL","APPROVED","COMPLETED","FAILED","REJECTED","CANCELLED","DISPATCHED","IN_TRANSIT","DELIVERED","RETURNED","SUPERSEDED"];

describe("StatusBadge", () => {
  it("maps every required status semantically", () => { for (const s of REQUIRED) expect(statusTone[s], s).toBeDefined(); });
  it("renders a readable label, not colour only", () => {
    render(<StatusBadge status="IN_PRODUCTION" />);
    expect(screen.getByText("In production")).toBeInTheDocument();
  });
  it("tones", () => {
    const { container } = render(<><StatusBadge status="BLOCKED" /><StatusBadge status="DELIVERED" /><StatusBadge status="WHATEVER" /></>);
    expect([...container.querySelectorAll("[data-tone]")].map((e) => e.getAttribute("data-tone"))).toEqual(["blocked", "success", "neutral"]);
  });
});

describe("PriorityBadge", () => {
  it("renders all priorities; URGENT is emphasised, NORMAL subtle", () => {
    render(<><PriorityBadge priority="NORMAL" /><PriorityBadge priority="URGENT" /><PriorityBadge priority="HIGH" /><PriorityBadge priority="LOW" /></>);
    expect(screen.getByText("Urgent").className).toContain("bg-danger");
    expect(screen.getByText("Normal").className).not.toContain("bg-");
  });
});

describe("SeverityBadge", () => {
  it("has accessible semantics and label", () => {
    render(<SeverityBadge severity="CRITICAL" />);
    expect(screen.getByRole("status", { name: "Severity: Critical" })).toBeInTheDocument();
  });
  it("icon-only keeps an sr label", () => {
    render(<SeverityBadge severity="WARNING" iconOnly />);
    expect(screen.getByText("Warning")).toHaveClass("sr-only");
  });
});

describe("feedback states", () => {
  it("loading", () => { render(<><TableSkeleton /><PageSkeleton /></>); expect(screen.getAllByRole("status").length).toBe(2); });
  it("empty", () => { render(<EmptyState title="No samples" description="Create one" />); expect(screen.getByRole("status")).toHaveTextContent("No samples"); });
  it("error shows requestId and retry", () => {
    render(<ErrorState error={normalizeError(500, { requestId: "abc-123" })} onRetry={() => {}} />);
    expect(screen.getByRole("alert")).toHaveTextContent("abc-123");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
  it("access denied", () => { render(<AccessDeniedState />); expect(screen.getByRole("alert")).toHaveTextContent("Access denied"); });
});
