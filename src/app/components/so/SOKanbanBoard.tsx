import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import type { SalesOrder, SOStatus } from "./types";
import { SOStatusBadge, SO_STATUS_CSS_VAR } from "./StatusBadge";
import {
  Search, ArrowUpDown, GripVertical, Check,
  CalendarDays, MoreHorizontal, X, Package, Truck, Box, ArrowUpRight,
} from "lucide-react";

/* ═══ Typography — CSS variable tokens only, Inter font ═══ */
const font: React.CSSProperties = {};
const caption: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" };
const captionNormal: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" };
const captionSemi: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" };
const micro: React.CSSProperties = { fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" };
const microNormal: React.CSSProperties = { fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-normal)" };
const microSemi: React.CSSProperties = { ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" };
const labelStyle: React.CSSProperties = { ...font, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" };
const labelMedium: React.CSSProperties = { ...font, fontSize: "var(--text-label)", fontWeight: "var(--font-weight-medium)" };
const baseStyle: React.CSSProperties = { ...font, fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" };

/* ═══ Kanban column definitions ═══ */
const KANBAN_COLUMNS: { status: SOStatus; label: string; matchStatuses?: SOStatus[] }[] = [
  { status: "Draft", label: "Draft" },
  { status: "Pending Review", label: "Pending Review" },
  { status: "Cleared", label: "Cleared by Ops" },
  { status: "Partially Shipped", label: "Partially Shipped" },
  { status: "Shipped", label: "Shipped" },
  { status: "Cancelled", label: "Cancelled", matchStatuses: ["Cancelled", "Cancellation Requested", "Partially Cancelled"] },
];

/* ═══ Sort options matching reference ═══ */
type SortOption = "Last Updated" | "SO Value" | "Creation Date" | "Line Items";
const SORT_OPTIONS: SortOption[] = ["Last Updated", "SO Value", "Creation Date", "Line Items"];

/* ═══ Avatar palette ═══ */
const AVATAR_COLORS = [
  { bgClass: "bg-primary/15", color: "var(--primary)" },
  { bgClass: "bg-chart-5/15", color: "var(--chart-5)" },
  { bgClass: "bg-accent/15", color: "var(--accent)" },
  { bgClass: "bg-chart-3/15", color: "var(--chart-3)" },
  { bgClass: "bg-chart-4/15", color: "var(--chart-4)" },
];

const POC_NAMES = ["Meredith", "Toby", "Robert", "Ryan", "Kevin", "Pam", "Holly", "Creed"];

/* ═══ Version colors matching listing table ═══ */
/* Version badge: gray → progressively denser blue based on version number (Tailwind classes only) */
function getVersionClasses(vNum: number): string {
  if (vNum <= 1) return "bg-secondary text-foreground border-border";
  if (vNum === 2) return "bg-primary/[0.06] text-primary border-primary/15";
  if (vNum === 3) return "bg-primary/10 text-primary border-primary/[0.22]";
  if (vNum === 4) return "bg-primary/[0.16] text-primary border-primary/30";
  return "bg-primary/[0.22] text-primary border-primary/[0.38]";
}

/* ═══ Shipped column detection (final/green state) ═══ */
const SHIPPED_FINAL_STATUSES: SOStatus[] = ["Shipped"];

/* ═══ Helpers ═══ */
function daysAgo(dateStr: string): string {
  const parts = dateStr.split("/").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date(2026, 2, 9);
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "1d ago";
  if (diff < 30) return `${diff}d ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

function expiresIn(dateStr: string): string {
  const parts = dateStr.split("/").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const now = new Date(2026, 2, 9);
  const diff = Math.floor((d.getTime() - now.getTime()) / 86400000);
  if (diff <= 0) return "Overdue";
  if (diff < 30) return `${diff}d`;
  return `${Math.floor(diff / 30)}mo`;
}

function allocatedPct(so: SalesOrder): number {
  const totalOrdered = so.lines.reduce((s, l) => s + l.orderedQty, 0);
  const totalAllocated = so.lines.reduce((s, l) => s + l.allocatedQty, 0);
  if (totalOrdered === 0) return 0;
  return Math.round((totalAllocated / totalOrdered) * 100);
}

function shippedPct(so: SalesOrder): number {
  const totalOrdered = so.lines.reduce((s, l) => s + l.orderedQty, 0);
  const totalShipped = so.lines.reduce((s, l) => s + l.shippedQty, 0);
  if (totalOrdered === 0) return 0;
  return Math.round((totalShipped / totalOrdered) * 100);
}

function fulfilledPct(so: SalesOrder): number {
  const totalOrdered = so.lines.reduce((s, l) => s + l.orderedQty, 0);
  const totalDelivered = so.lines.reduce((s, l) => s + l.deliveredQty, 0);
  if (totalOrdered === 0) return 0;
  return Math.round((totalDelivered / totalOrdered) * 100);
}

function sortSOs(items: SalesOrder[], sortBy: SortOption): SalesOrder[] {
  const sorted = [...items];
  switch (sortBy) {
    case "Last Updated":
      return sorted.sort((a, b) => {
        const dateA = a.activityLog.length > 0 ? new Date(a.activityLog[a.activityLog.length - 1].timestamp).getTime() : 0;
        const dateB = b.activityLog.length > 0 ? new Date(b.activityLog[b.activityLog.length - 1].timestamp).getTime() : 0;
        return dateB - dateA;
      });
    case "SO Value":
      return sorted.sort((a, b) => b.total - a.total);
    case "Creation Date":
      return sorted.sort((a, b) => {
        const pa = a.createdDate.split("/").map(Number);
        const pb = b.createdDate.split("/").map(Number);
        return new Date(pb[0], pb[1] - 1, pb[2]).getTime() - new Date(pa[0], pa[1] - 1, pa[2]).getTime();
      });
    case "Line Items":
      return sorted.sort((a, b) => b.lines.length - a.lines.length);
    default:
      return sorted;
  }
}

/* ═══════════════════════════════════════════════════════
   SOKanbanBoard
   ═══════════════════════════════════════════════════════ */
interface Props {
  salesOrders: SalesOrder[];
  search: string;
}

export function SOKanbanBoard({ salesOrders, search }: Props) {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [colSearchOpen, setColSearchOpen] = useState<Record<string, boolean>>({});
  const [colSearchText, setColSearchText] = useState<Record<string, string>>({});
  const [colSort, setColSort] = useState<Record<string, SortOption>>({});
  const [colSortOpen, setColSortOpen] = useState<Record<string, boolean>>({});
  const sortRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      Object.keys(colSortOpen).forEach(key => {
        if (colSortOpen[key]) {
          const ref = sortRefs.current[key];
          if (ref && !ref.contains(e.target as Node)) {
            setColSortOpen(prev => ({ ...prev, [key]: false }));
          }
        }
      });
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [colSortOpen]);

  const filtered = useMemo(() => {
    let list = salesOrders;
    const q = search.toLowerCase();
    if (q) list = list.filter(so => so.soNumber.toLowerCase().includes(q) || so.customer.toLowerCase().includes(q) || so.salesRep.toLowerCase().includes(q));
    return list;
  }, [salesOrders, search]);

  const columns = useMemo(() => {
    return KANBAN_COLUMNS.map(kc => {
      const matchStatuses = kc.matchStatuses || [kc.status];
      let items = filtered.filter(so => matchStatuses.includes(so.status));
      const localQ = (colSearchText[kc.status] || "").toLowerCase();
      if (localQ) items = items.filter(so => so.soNumber.toLowerCase().includes(localQ) || so.customer.toLowerCase().includes(localQ) || so.description.toLowerCase().includes(localQ));
      const sortBy = colSort[kc.status] || "Last Updated";
      items = sortSOs(items, sortBy);
      const colTotal = items.reduce((s, so) => s + so.total, 0);
      const statusColor = SO_STATUS_CSS_VAR[kc.status] || "var(--foreground)";
      const isShippedCol = SHIPPED_FINAL_STATUSES.includes(kc.status);
      return { ...kc, items, colTotal, count: items.length, statusColor, isShippedCol };
    });
  }, [filtered, colSearchText, colSort]);

  const totalValue = filtered.reduce((s, so) => s + so.total, 0);
  const totalCount = filtered.length;

  const toggleColSearch = useCallback((status: string) => {
    setColSearchOpen(prev => {
      const next = !prev[status];
      if (!next) setColSearchText(p => ({ ...p, [status]: "" }));
      return { ...prev, [status]: next };
    });
  }, []);

  const toggleColSort = useCallback((status: string) => {
    setColSortOpen(prev => ({ ...prev, [status]: !prev[status] }));
  }, []);

  return (
    <div className="flex flex-col" style={{ minHeight: 0, flex: 1 }}>
      {/* ── Summary bar ── */}
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px var(--space-card-padding)",
          background: "var(--secondary)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ ...baseStyle, color: "var(--foreground)" }}>${totalValue.toLocaleString()}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {[
              { label: "Total SOs", val: String(totalCount) },
              { label: "Avg Value", val: `$${totalCount > 0 ? Math.round(totalValue / totalCount).toLocaleString() : "0"}` },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ ...micro, color: "var(--foreground)", opacity: 0.45 }}>{s.label}</span>
                <span style={{ ...captionSemi, color: "var(--foreground)" }}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Kanban columns ── */}
      <div
        className="flex overflow-x-auto flex-1"
        style={{ gap: 0, padding: "var(--space-card-padding)", paddingTop: 12 }}
      >
        {columns.map((col, colIdx) => {
          const isSearchOpen = !!colSearchOpen[col.status];
          const isSortOpen = !!colSortOpen[col.status];
          const currentSort = colSort[col.status] || "Last Updated";
          const isShipped = col.isShippedCol;

          /* For shipped (final) column: green header with white elements */
          const headerBg = isShipped
            ? "var(--accent)"
            : "var(--card)";
          const headerTextColor = isShipped ? "var(--accent-foreground)" : "var(--foreground)";
          const headerMutedColor = isShipped ? "var(--accent-foreground)" : undefined;
          const headerIconColor = isShipped ? "var(--accent-foreground)" : "var(--foreground)";
          const headerBorderColor = isShipped ? "var(--accent)" : "var(--border)";

          return (
            <div
              key={col.status}
              className="flex flex-col shrink-0"
              style={{ width: 280, marginRight: colIdx < columns.length - 1 ? 12 : 0 }}
            >
              {/* ─── Column header ─── */}
              <div
                style={{
                  borderRadius: "10px 10px 0 0",
                  border: `1px solid ${headerBorderColor}`,
                  borderBottom: "none",
                  borderTop: isShipped ? "none" : `3px solid ${col.statusColor}`,
                  padding: "12px 12px 8px",
                  background: headerBg,
                }}
              >
                {/* Title row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {!isShipped && (
                      <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: col.statusColor, flexShrink: 0 }} />
                    )}
                    {isShipped && (
                      <Check style={{ width: 14, height: 14, color: headerTextColor }} />
                    )}
                    <span style={{ ...captionSemi, color: headerTextColor }}>{col.label}</span>
                    <span
                      className={isShipped ? "bg-accent-foreground/20" : ""}
                      style={{
                        ...microSemi, color: headerTextColor, opacity: isShipped ? 0.8 : 0.6,
                        background: isShipped ? undefined : "var(--secondary)",
                        padding: "1px 8px", borderRadius: 999,
                      }}
                    >
                      {col.count}
                    </span>
                  </div>

                  {/* Action icons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <button
                      onClick={() => toggleColSearch(col.status)}
                      className={isSearchOpen && isShipped ? "bg-accent-foreground/20" : ""}
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "none", cursor: "pointer",
                        background: isSearchOpen ? (isShipped ? undefined : "var(--secondary)") : "transparent",
                        color: isSearchOpen ? (isShipped ? headerTextColor : "var(--primary)") : headerIconColor,
                        opacity: isSearchOpen ? 1 : 0.35,
                        transition: "all 120ms",
                      }}
                    >
                      <Search style={{ width: 13, height: 13 }} />
                    </button>

                    <div className="relative" ref={el => { sortRefs.current[col.status] = el; }}>
                      <button
                        onClick={() => toggleColSort(col.status)}
                        className={isSortOpen && isShipped ? "bg-accent-foreground/20" : ""}
                        style={{
                          width: 24, height: 24, borderRadius: 6,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          border: "none", cursor: "pointer",
                          background: isSortOpen ? (isShipped ? undefined : "var(--secondary)") : "transparent",
                          color: isSortOpen ? (isShipped ? headerTextColor : "var(--primary)") : headerIconColor,
                          opacity: isSortOpen ? 1 : 0.35,
                          transition: "all 120ms",
                        }}
                      >
                        <ArrowUpDown style={{ width: 13, height: 13 }} />
                      </button>

                      {isSortOpen && (
                        <div style={{
                          position: "absolute", top: "100%", right: 0, marginTop: 4,
                          width: 180, zIndex: 50,
                          background: "var(--popover)", border: "1px solid var(--border)",
                          borderRadius: 10, boxShadow: "var(--elevation-2)",
                          padding: "8px 0", overflow: "hidden",
                        }}>
                          <div style={{ ...microSemi, color: "var(--foreground)", opacity: 0.35, padding: "4px 16px 8px", letterSpacing: "0.06em", textTransform: "uppercase" }}>Sort By</div>
                          {SORT_OPTIONS.map(opt => (
                            <button
                              key={opt}
                              onClick={() => { setColSort(prev => ({ ...prev, [col.status]: opt })); setColSortOpen(prev => ({ ...prev, [col.status]: false })); }}
                              style={{
                                width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                                padding: "7px 14px", border: "none", cursor: "pointer",
                                background: currentSort === opt ? "var(--secondary)" : "transparent",
                                ...labelMedium,
                                color: currentSort === opt ? "var(--primary)" : "var(--foreground)",
                                transition: "all 100ms",
                              }}
                              onMouseEnter={e => { if (currentSort !== opt) (e.currentTarget as HTMLElement).style.background = "var(--secondary)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = currentSort === opt ? "var(--secondary)" : "transparent"; }}
                            >
                              <span>{opt}</span>
                              {currentSort === opt && <Check style={{ width: 14, height: 14, color: "var(--primary)" }} />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <button
                      style={{
                        width: 24, height: 24, borderRadius: 6,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        border: "none", background: "transparent", cursor: "grab",
                        color: headerIconColor, opacity: 0.35,
                        transition: "all 120ms",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = "0.6"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = "0.35"; }}
                    >
                      <GripVertical style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>

                {/* Per-column search */}
                {isSearchOpen && (
                  <div
                    className={isShipped ? "border-accent-foreground/25 bg-accent-foreground/10" : ""}
                    style={{
                      marginTop: 8, display: "flex", alignItems: "center",
                      border: isShipped ? undefined : "1px solid var(--border)",
                      borderRadius: 8, background: isShipped ? undefined : "var(--input-background)",
                      padding: "0 8px", height: 30,
                    }}
                  >
                    <Search style={{ width: 12, height: 12, color: headerTextColor, opacity: 0.4, flexShrink: 0 }} />
                    <input
                      autoFocus
                      value={colSearchText[col.status] || ""}
                      onChange={e => setColSearchText(prev => ({ ...prev, [col.status]: e.target.value }))}
                      placeholder={`Search ${col.label.toLowerCase()}...`}
                      style={{
                        flex: 1, border: "none", background: "transparent",
                        outline: "none", padding: "0 6px",
                        ...captionNormal, color: headerTextColor,
                      }}
                    />
                    {(colSearchText[col.status] || "").length > 0 && (
                      <button
                        onClick={() => setColSearchText(prev => ({ ...prev, [col.status]: "" }))}
                        style={{ width: 16, height: 16, borderRadius: 4, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: headerTextColor, opacity: 0.4 }}
                      >
                        <X style={{ width: 10, height: 10 }} />
                      </button>
                    )}
                  </div>
                )}

                {/* Total Value */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: isSearchOpen ? 8 : 4 }}>
                  <span style={{ ...micro, color: headerMutedColor || "var(--foreground)", opacity: headerMutedColor ? 1 : 0.4 }}>Total Value</span>
                  <span style={{ ...labelStyle, color: headerTextColor }}>${col.colTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* ─── Cards container ─── */}
              <div
                className="flex-1 overflow-y-auto"
                style={{
                  padding: 6, maxHeight: 520,
                  border: `1px solid ${headerBorderColor}`,
                  borderTop: "none",
                  borderRadius: "0 0 10px 10px",
                  background: "var(--secondary)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {col.items.map((so, soIdx) => (
                    <KanbanCard
                      key={so.id}
                      so={so}
                      soIdx={soIdx}
                      colStatus={col.status}
                      statusColor={col.statusColor}
                      isHovered={hoveredCard === so.id}
                      onHover={setHoveredCard}
                      onNavigate={navigate}
                    />
                  ))}
                  {col.items.length === 0 && (
                    <div style={{
                      padding: "28px 12px", textAlign: "center",
                      borderRadius: 10, border: "1.5px dashed var(--border)",
                      ...captionNormal, color: "var(--foreground)", opacity: 0.3,
                    }}>
                      No orders
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   KanbanCard — individual SO card with hover-expand
   ═══════════════════════════════════════════════════════ */
interface KanbanCardProps {
  so: SalesOrder;
  soIdx: number;
  colStatus: SOStatus;
  statusColor: string;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onNavigate: (path: string) => void;
}

function KanbanCard({ so, soIdx, colStatus, statusColor, isHovered, onHover, onNavigate }: KanbanCardProps) {
  const pctAlloc = allocatedPct(so);
  const pctShipped = shippedPct(so);
  const pctFulfilled = fulfilledPct(so);
  const pocName = POC_NAMES[soIdx % POC_NAMES.length];
  const pocColor = AVATAR_COLORS[soIdx % AVATAR_COLORS.length];
  const repInitials = so.salesRep.split(" ").map(w => w[0]).join("").slice(0, 2);
  const repColor = AVATAR_COLORS[(soIdx + 3) % AVATAR_COLORS.length];
  const versionNum = so.version?.number ?? 1;
  const versionKey = `v${versionNum}`;
  const versionClasses = getVersionClasses(versionNum);

  /* Progress logic */
  const isShippedPlus = ["Shipped", "Partially Shipped"].includes(so.status);
  const progressPct = isShippedPlus ? pctShipped : pctAlloc;
  const progressLabel = isShippedPlus ? "Shipped" : "Allocated";
  const progressBarColor = isShippedPlus
    ? (pctShipped >= 100 ? "var(--accent)" : "var(--chart-3)")
    : (pctAlloc >= 100 ? "var(--accent)" : pctAlloc >= 50 ? "var(--primary)" : "var(--chart-3)");

  /* Date context: use order date as "Created" context, + delivery date estimate */
  const orderDateStr = so.orderDate;
  const daysSince = daysAgo(orderDateStr);

  /* Hover-expand data */
  const activeLines = so.lines.filter(l => !l.cancelled);
  const totalOrdered = activeLines.reduce((s, l) => s + l.orderedQty, 0);
  const totalAllocated = activeLines.reduce((s, l) => s + l.allocatedQty, 0);
  const totalShippedVal = activeLines.reduce((s, l) => s + l.shippedQty, 0);
  const totalDelivered = activeLines.reduce((s, l) => s + l.deliveredQty, 0);

  return (
    <div
      style={{
        background: "var(--card)",
        borderRadius: 10,
        border: `1px solid ${isHovered ? "var(--primary)" : "var(--border)"}`,
        boxShadow: isHovered ? "var(--elevation-2)" : "var(--elevation-1)",
        transform: isHovered ? "translateY(-1px)" : "none",
        transition: "all 180ms ease, max-height 250ms ease",
        cursor: "pointer",
        overflow: "hidden",
        display: "flex",
      }}
      onClick={() => onNavigate(`/sales-orders/${so.id}`)}
      onMouseEnter={() => onHover(so.id)}
      onMouseLeave={() => onHover(null)}
    >
      {/* Left accent bar */}
      <div style={{ width: 3, flexShrink: 0, background: statusColor, borderRadius: "10px 0 0 10px" }} />

      <div style={{ flex: 1, padding: 12, minWidth: 0 }}>
        {/* Row 1: SO # + version badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ ...micro, color: "var(--foreground)", opacity: 0.4 }}>{so.soNumber}</span>
          <span
            className={`group/ver inline-flex items-center border ${versionClasses}`}
            style={{
              ...microSemi, padding: "1px 5px", borderRadius: 4, lineHeight: "1.4",
              minWidth: 32,
            }}
          >
            {versionKey}
            <ArrowUpRight className="w-2.5 h-2.5 ml-0.5 opacity-0 group-hover/ver:opacity-100 transition-opacity duration-150" />
          </span>
        </div>

        {/* Row 2: Customer */}
        <div style={{
          ...captionSemi, color: "var(--foreground)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginBottom: 2, lineHeight: "1.3",
        }}>
          {so.customer}
        </div>

        {/* Row 3: Description */}
        <div style={{
          ...microNormal, color: "var(--foreground)", opacity: 0.5,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginBottom: 10, lineHeight: "1.3",
        }}>
          {so.description || `${so.lines.length} line items · ${so.warehouse}`}
        </div>

        {/* Row 4: Value + labeled progress bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ ...captionSemi, color: "var(--foreground)" }}>${so.total.toLocaleString()}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ ...microNormal, color: "var(--foreground)", opacity: 0.35 }}>{progressLabel}</span>
            <span style={{ ...micro, color: "var(--foreground)", opacity: 0.6 }}>{progressPct}%</span>
          </div>
        </div>

        {/* Progress bar with label */}
        <div style={{
          width: "100%", height: 3, borderRadius: 2, overflow: "hidden",
          background: "var(--secondary)",
          marginBottom: 10,
        }}>
          <div style={{
            height: "100%", borderRadius: 2,
            width: `${Math.min(100, progressPct)}%`,
            background: progressBarColor,
            transition: "width 300ms ease",
          }} />
        </div>

        {/* Row 5: Labeled avatars + date */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {/* POC */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div
                className={pocColor.bgClass}
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: pocColor.color,
                  ...microSemi, border: "2px solid var(--card)",
                }}
              >
                {pocName.charAt(0)}
              </div>
              <span style={{ ...microNormal, color: "var(--foreground)", opacity: 0.3 }}>POC</span>
            </div>
            {/* Rep */}
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <div
                className={repColor.bgClass}
                style={{
                  width: 20, height: 20, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: repColor.color,
                  ...microSemi, border: "2px solid var(--card)",
                }}
              >
                {repInitials}
              </div>
              <span style={{ ...microNormal, color: "var(--foreground)", opacity: 0.3 }}>Rep</span>
            </div>
          </div>

          {/* Date with context */}
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <CalendarDays style={{ width: 10, height: 10, color: "var(--foreground)", opacity: 0.3 }} />
            <span style={{ ...microNormal, color: "var(--foreground)", opacity: 0.4 }}>Created {daysSince}</span>
          </div>
        </div>

        {/* Sub-status badge */}
        {so.status !== colStatus && (
          <div style={{ marginTop: 8 }}><SOStatusBadge status={so.status} /></div>
        )}

        {/* ═══ Hover-expand section — summary stats ═══ */}
        <div style={{
          maxHeight: isHovered ? 80 : 0,
          opacity: isHovered ? 1 : 0,
          overflow: "hidden",
          transition: "max-height 250ms ease, opacity 200ms ease, margin 200ms ease",
          marginTop: isHovered ? 10 : 0,
        }}>
          <div style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 8,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
          }}>
            {/* Allocated */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Box style={{ width: 10, height: 10, color: "var(--primary)", opacity: 0.6 }} />
              <div>
                <div style={{ ...microNormal, color: "var(--foreground)", opacity: 0.35, lineHeight: 1.2 }}>Alloc</div>
                <div style={{ ...microSemi, color: "var(--foreground)", lineHeight: 1.3 }}>{totalAllocated}/{totalOrdered}</div>
              </div>
            </div>
            {/* Shipped */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Truck style={{ width: 10, height: 10, color: "var(--chart-4)", opacity: 0.6 }} />
              <div>
                <div style={{ ...microNormal, color: "var(--foreground)", opacity: 0.35, lineHeight: 1.2 }}>Shipped</div>
                <div style={{ ...microSemi, color: "var(--foreground)", lineHeight: 1.3 }}>{totalShippedVal}/{totalOrdered}</div>
              </div>
            </div>
            {/* Delivered */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <Package style={{ width: 10, height: 10, color: "var(--accent)", opacity: 0.6 }} />
              <div>
                <div style={{ ...microNormal, color: "var(--foreground)", opacity: 0.35, lineHeight: 1.2 }}>Delivered</div>
                <div style={{ ...microSemi, color: "var(--foreground)", lineHeight: 1.3 }}>{totalDelivered}/{totalOrdered}</div>
              </div>
            </div>
          </div>
          {/* Line item count */}
          <div style={{ marginTop: 4, ...microNormal, color: "var(--foreground)", opacity: 0.35 }}>
            {so.lines.length} line items · {so.warehouse}
          </div>
        </div>
      </div>
    </div>
  );
}