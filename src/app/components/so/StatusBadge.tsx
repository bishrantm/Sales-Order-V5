import type { SOStatus, ShipmentStatus } from "./types";
import { Copy } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Display labels — maps internal status keys to user-facing strings.
 * "Cleared" is shown as "Cleared by Ops" across the module.
 */
export const SO_STATUS_DISPLAY: Record<SOStatus, string> = {
  Draft: "Draft",
  "Pending Review": "Pending Review",
  Cleared: "Cleared by Ops",
  "Partially Shipped": "Partially Shipped",
  Shipped: "Shipped",
  Closed: "Closed",
  "Cancellation Requested": "Cancellation Requested",
  "Partially Cancelled": "Partially Cancelled",
  Cancelled: "Cancelled",
  Archived: "Archived",
};

/**
 * Shared status → CSS variable color mapping.
 * Used by both status pills and the header gradient.
 */
export const SO_STATUS_CSS_VAR: Record<SOStatus, string> = {
  Draft: "var(--foreground)",
  "Pending Review": "var(--chart-3)",
  Cleared: "var(--primary)",
  "Partially Shipped": "var(--chart-4)",
  Shipped: "var(--accent)",
  Closed: "var(--chart-4)",
  "Cancellation Requested": "var(--destructive)",
  "Partially Cancelled": "var(--chart-3)",
  Cancelled: "var(--destructive)",
  Archived: "var(--foreground)",
};

const soStatusColors: Record<SOStatus, { bg: string; text: string; dot: string }> = {
  Draft: { bg: "bg-secondary", text: "text-foreground/70", dot: "bg-foreground/35" },
  "Pending Review": { bg: "bg-chart-3/10", text: "text-chart-3", dot: "bg-chart-3" },
  Cleared: { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  "Partially Shipped": { bg: "bg-chart-4/10", text: "text-chart-4", dot: "bg-chart-4" },
  Shipped: { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent" },
  Closed: { bg: "bg-chart-4/10", text: "text-chart-4", dot: "bg-chart-4" },
  "Cancellation Requested": { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive animate-pulse" },
  "Partially Cancelled": { bg: "bg-chart-3/10", text: "text-chart-3", dot: "bg-chart-3" },
  Cancelled: { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
  Archived: { bg: "bg-secondary", text: "text-foreground/50", dot: "bg-foreground/35" },
};

const shipStatusColors: Record<ShipmentStatus, { bg: string; text: string; dot: string }> = {
  Draft: { bg: "bg-secondary", text: "text-foreground/70", dot: "bg-foreground/35" },
  "Ready to Pick": { bg: "bg-primary/10", text: "text-primary", dot: "bg-primary" },
  "In Progress": { bg: "bg-chart-3/15", text: "text-chart-3", dot: "bg-chart-3" },
  Ready: { bg: "bg-chart-4/10", text: "text-chart-4", dot: "bg-chart-4" },
  Shipped: { bg: "bg-accent/10", text: "text-accent", dot: "bg-accent" },
  Cancelled: { bg: "bg-destructive/10", text: "text-destructive", dot: "bg-destructive" },
};

export function SOStatusBadge({ status, trailingIcon }: { status: SOStatus; trailingIcon?: ReactNode }) {
  const c = soStatusColors[status] || soStatusColors.Draft;
  const label = SO_STATUS_DISPLAY[status] || status;
  return (
    <span
      className={`inline-flex items-center rounded-full ${c.bg} ${c.text}`}
      style={{
        gap: "8px",
        padding: "4px 12px",
        fontSize: "var(--text-caption)",
        fontWeight: "var(--font-weight-medium)",
        whiteSpace: "nowrap",
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {label}
      {trailingIcon}
    </span>
  );
}

export function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  const c = shipStatusColors[status] || shipStatusColors.Draft;
  return (
    <span
      className={`inline-flex items-center rounded-full ${c.bg} ${c.text}`}
      style={{
        gap: "8px",
        padding: "4px 12px",
        fontSize: "var(--text-caption)",
        fontWeight: "var(--font-weight-medium)",
        whiteSpace: "nowrap",
      }}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {status}
    </span>
  );
}

export function ItemTypeBadge({ type }: { type: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    Serialized: { bg: "bg-primary/10", text: "text-primary" },
    "Non-Serialized": { bg: "bg-secondary", text: "text-foreground/60" },
    "Lot Controlled": { bg: "bg-chart-4/10", text: "text-chart-4" },
  };
  const c = colors[type] || colors["Non-Serialized"];
  return (
    <span
      className={`inline-flex items-center ${c.bg} ${c.text}`}
      style={{
        padding: "2px 8px",
        fontSize: "var(--text-micro)",
        fontWeight: "var(--font-weight-semibold)",
        borderRadius: 4,
        lineHeight: 1,
        whiteSpace: "nowrap",
      }}
    >
      {type}
    </span>
  );
}

/**
 * "Duplicate of #N" pill — dashed outline, transparent background,
 * purple (chart-4) stroke / text / icon. Rounded rect to match type pills.
 */
export function DuplicateBadge({ ofIndex }: { ofIndex: number }) {
  return (
    <span
      className="inline-flex items-center text-chart-4"
      style={{
        fontSize: "var(--text-micro)",
        fontWeight: "var(--font-weight-semibold)",
        padding: "2px 8px",
        gap: "4px",
        whiteSpace: "nowrap",
        border: "1.5px dashed var(--chart-4)",
        background: "transparent",
        borderRadius: 4,
        lineHeight: 1,
      }}
    >
      <Copy style={{ width: 10, height: 10, flexShrink: 0 }} />
      Duplicate of #{ofIndex}
    </span>
  );
}