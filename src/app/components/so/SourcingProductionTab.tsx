import { useState, useMemo } from "react";
import {
  ChevronDown, ChevronUp, ChevronRight, ShoppingCart, Package, AlertTriangle,
  ExternalLink, Copy, Clock, Wrench, RotateCcw,
} from "lucide-react";
import { HighlightText, TabSearchBar, FilterPills } from "./SearchHighlight";
import { ThTooltip, Tooltip } from "./Tooltip";
import type {
  SalesOrder, ProcurementStatus, BackorderStatus,
} from "./types";

/* ═══════════════════════════════════════════
   Shared item cell — thumbnail + code + truncated description + "more >>"
   Matches SOLineGrid listing pattern exactly.
   ═══════════════════════════════════════════ */

const DESC_TRUNCATE = 100; // chars visible in ~2 lines before "more >>"

function ItemCell({
  itemCode,
  itemName,
  search,
  expanded,
  onToggleExpand,
}: {
  itemCode: string;
  itemName: string;
  search: string;
  expanded: boolean;
  onToggleExpand: () => void;
}) {
  const needsTruncate = itemName.length > DESC_TRUNCATE;
  const displayText = expanded || !needsTruncate ? itemName : itemName.slice(0, DESC_TRUNCATE) + "...";

  return (
    <div className="flex items-start" style={{ gap: 8 }}>
      <div
        className="rounded-md bg-secondary/70 flex items-center justify-center shrink-0"
        style={{ width: 32, height: 32 }}
      >
        <Package className="w-3.5 h-3.5 text-foreground/15" />
      </div>
      <div className="min-w-0 flex-1">
        <span
          className="text-foreground"
          style={{
            fontSize: "var(--text-caption)",
            fontWeight: "var(--font-weight-semibold)",
          }}
        >
          <HighlightText text={itemCode} search={search} />
        </span>
        <div
          className="text-foreground/40"
          style={{
            fontSize: "var(--text-caption)",
            lineHeight: "1.4",
            marginTop: 1,
          }}
        >
          <HighlightText text={displayText} search={search} />
          {needsTruncate && (
            <>
              {" "}
              <button
                onClick={e => { e.stopPropagation(); onToggleExpand(); }}
                className="text-primary hover:underline inline-flex items-center"
                style={{
                  fontSize: "var(--text-caption)",
                  fontWeight: "var(--font-weight-medium)",
                  gap: 2,
                }}
              >
                {expanded ? "less" : "more"}
                {expanded
                  ? <ChevronUp className="w-3 h-3" />
                  : <ChevronDown className="w-3 h-3" />}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Qty + EA unit label — matches SOLineGrid capsule style
   ═══════════════════════════════════════════ */

function QtyUnit({ qty }: { qty: number }) {
  return (
    <div className="inline-flex items-center border border-border rounded-md bg-input-background overflow-hidden">
      <span
        className="tabular-nums text-foreground"
        style={{
          fontSize: "var(--text-caption)",
          fontWeight: "var(--font-weight-medium)",
          padding: "4px 8px",
        }}
      >
        {qty}
      </span>
      <div className="w-px self-stretch bg-border" />
      <span
        className="text-foreground/50"
        style={{
          fontSize: "var(--text-caption)",
          fontWeight: "var(--font-weight-medium)",
          padding: "4px 8px",
        }}
      >
        EA
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Style helpers
   ═══════════════════════════════════════════ */

const PO_STATUS_STYLES: Record<ProcurementStatus, { bg: string; text: string }> = {
  Draft: { bg: "bg-secondary", text: "text-foreground/70" },
  Submitted: { bg: "bg-primary/10", text: "text-primary" },
  Acknowledged: { bg: "bg-chart-3/10", text: "text-chart-3" },
  "Partially Received": { bg: "bg-chart-3/10", text: "text-chart-3" },
  Received: { bg: "bg-accent/10", text: "text-accent" },
  Cancelled: { bg: "bg-destructive/10", text: "text-destructive" },
};

const BO_STATUS_STYLES: Record<BackorderStatus, { bg: string; text: string }> = {
  Pending: { bg: "bg-chart-3/10", text: "text-chart-3" },
  "On Order": { bg: "bg-primary/10", text: "text-primary" },
  "Partially Fulfilled": { bg: "bg-chart-3/10", text: "text-chart-3" },
  Fulfilled: { bg: "bg-accent/10", text: "text-accent" },
  Cancelled: { bg: "bg-destructive/10", text: "text-destructive" },
};

const AVATAR_COLORS = [
  { bg: "bg-accent/10", text: "text-accent" },
  { bg: "bg-chart-3/10", text: "text-chart-3" },
  { bg: "bg-primary/10", text: "text-primary" },
  { bg: "bg-chart-4/10", text: "text-chart-4" },
  { bg: "bg-destructive/10", text: "text-destructive" },
];

function avatarColor(initials: string) {
  let h = 0;
  for (let i = 0; i < initials.length; i++) h = initials.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ═══════════════════════════════════════════
   Progress bar component
   ═══════════════════════════════════════════ */

function MiniProgressBar({ pct, barColor }: { pct: number; barColor: string }) {
  return (
    <div className="flex items-center" style={{ gap: 6, minWidth: 80 }}>
      <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: barColor }}
        />
      </div>
      <span
        className="text-foreground/50 tabular-nums shrink-0"
        style={{ fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" }}
      >
        {Math.round(pct)}%
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Summary stat pill
   ═══════════════════════════════════════════ */

function StatPill({ label, value, colorClass }: { label: string; value: number | string; colorClass: string }) {
  return (
    <div className="flex items-center bg-card rounded-lg border border-border" style={{ gap: 8, padding: "8px 12px" }}>
      <span
        className={`tabular-nums ${colorClass}`}
        style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
      >
        {value}
      </span>
      <span
        className="text-foreground/50"
        style={{ fontSize: "var(--text-caption)" }}
      >
        {label}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Section wrapper (collapsible)
   ═══════════════════════════════════════════ */

function SectionCard({
  icon,
  title,
  count,
  rightLabel,
  open,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  rightLabel?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden shadow-elevation-sm">
      <div className="flex items-center justify-between bg-secondary px-4">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 py-2.5 text-left hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-expanded={open}
        >
          {open
            ? <ChevronDown className="w-4 h-4 text-foreground/50" aria-hidden="true" />
            : <ChevronRight className="w-4 h-4 text-foreground/50" aria-hidden="true" />}
          {icon}
          <span
            className="text-foreground"
            style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}
          >
            {title}
          </span>
          <span
            className="text-foreground/50 bg-border rounded-full text-center"
            style={{
              fontSize: "var(--text-small)",
              fontWeight: "var(--font-weight-medium)",
              padding: "1px 6px",
              minWidth: 18,
            }}
          >
            {count}
          </span>
        </button>
        {rightLabel && (
          <span
            className="text-foreground"
            style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}
          >
            {rightLabel}
          </span>
        )}
      </div>
      {open && children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main tab component
   ═══════════════════════════════════════════ */

type FilterKey = "all" | "procurement" | "backorders" | "work-orders";

interface Props {
  so: SalesOrder;
}

export function SourcingProductionTab({ so }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggle = (k: string) => setCollapsed(p => ({ ...p, [k]: !p[k] }));

  // Expanded item descriptions (keyed by "po-id--soLineId" or "bo-id")
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const toggleItemExpand = (key: string) => setExpandedItems(p => {
    const n = new Set(p); if (n.has(key)) n.delete(key); else n.add(key); return n;
  });

  // Consume real store data
  const procurementOrders = so.procurementOrders;
  const backorders = so.backorders;

  // Search filtering
  const filteredPOs = useMemo(() => {
    let list = procurementOrders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(po =>
        po.poNumber.toLowerCase().includes(q) ||
        po.vendor.toLowerCase().includes(q) ||
        po.items.some(it => it.itemCode.toLowerCase().includes(q) || it.itemName.toLowerCase().includes(q))
      );
    }
    return list;
  }, [procurementOrders, search]);

  const filteredBackorders = useMemo(() => {
    let list = backorders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(bo =>
        bo.itemCode.toLowerCase().includes(q) ||
        bo.itemName.toLowerCase().includes(q) ||
        (bo.linkedPONumber && bo.linkedPONumber.toLowerCase().includes(q))
      );
    }
    return list;
  }, [backorders, search]);

  // Counts
  const totalItems = procurementOrders.length + backorders.length;
  const filteredTotal = (filter === "all" || filter === "procurement" ? filteredPOs.length : 0)
    + (filter === "all" || filter === "backorders" ? filteredBackorders.length : 0);

  const poTotalAmount = procurementOrders.reduce((s, po) => s + po.totalAmount, 0);

  const pills: { key: FilterKey; label: string; count: number }[] = [
    { key: "all", label: "All", count: totalItems },
    { key: "procurement", label: "Procurement Orders", count: procurementOrders.length },
    { key: "backorders", label: "Backorders", count: backorders.length },
    { key: "work-orders", label: "Work Orders", count: 0 },
  ];

  // Summary stats
  const poReceived = procurementOrders.filter(po => po.status === "Received").length;
  const poInTransit = procurementOrders.filter(po => ["Submitted", "Acknowledged", "Partially Received"].includes(po.status)).length;
  const poDraft = procurementOrders.filter(po => po.status === "Draft").length;
  const boPending = backorders.filter(bo => bo.status === "Pending").length;
  const boOnOrder = backorders.filter(bo => bo.status === "On Order" || bo.status === "Partially Fulfilled").length;
  const boFulfilled = backorders.filter(bo => bo.status === "Fulfilled").length;

  if (totalItems === 0) {
    return (
      <div className="bg-card rounded-lg border border-border shadow-elevation-sm" style={{ padding: "var(--space-section-gap) var(--space-card-padding)" }}>
        <div className="flex flex-col items-center justify-center" style={{ gap: "var(--space-inline-gap)" }}>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-primary" />
          </div>
          <div
            className="text-foreground"
            style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
          >
            No Sourcing Required
          </div>
          <div
            className="text-foreground/40 text-center max-w-[360px]"
            style={{ fontSize: "var(--text-caption)" }}
          >
            All allocated items are available in inventory. Procurement orders and backorders will appear here when items need sourcing.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-elevation-sm" role="region" aria-label="Sourcing & Production">
      <TabSearchBar
        search={search}
        onSearchChange={setSearch}
        placeholder="Search POs, items, vendors..."
        resultCount={filteredTotal}
        resultLabel={`record${filteredTotal !== 1 ? "s" : ""}`}
      />
      <FilterPills pills={pills} active={filter} onSelect={setFilter} />

      {/* Summary stats row */}
      <div className="flex flex-wrap" style={{ gap: 8, padding: "0 var(--space-card-padding) var(--space-card-padding)" }}>
        {poDraft > 0 && <StatPill label="POs Draft" value={poDraft} colorClass="text-foreground/60" />}
        <StatPill label="POs Active" value={poInTransit} colorClass="text-primary" />
        <StatPill label="POs Received" value={poReceived} colorClass="text-accent" />
        <StatPill label="Backorders Pending" value={boPending} colorClass="text-chart-3" />
        <StatPill label="On Order" value={boOnOrder} colorClass="text-primary" />
        {boFulfilled > 0 && <StatPill label="Fulfilled" value={boFulfilled} colorClass="text-accent" />}
        {poTotalAmount > 0 && (
          <StatPill label="PO Value" value={`$${poTotalAmount.toLocaleString()}`} colorClass="text-foreground" />
        )}
      </div>

      {/* Sourcing status badge */}
      {so.sourcingStatus !== "N/A" && (
        <div style={{ padding: "0 var(--space-card-padding) var(--space-card-padding)" }}>
          <div className="inline-flex items-center rounded-md border border-border" style={{ gap: 6, padding: "4px 10px" }}>
            <span
              className="rounded-full"
              style={{
                display: "block",
                width: 6, height: 6, minWidth: 6, minHeight: 6,
                backgroundColor:
                  so.sourcingStatus === "Fully Sourced" ? "var(--accent)"
                  : so.sourcingStatus === "Partially Sourced" ? "var(--chart-3)"
                  : so.sourcingStatus === "Sourcing" ? "var(--primary)"
                  : "var(--foreground)",
              }}
            />
            <span
              className="text-foreground"
              style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}
            >
              {so.sourcingStatus}
            </span>
          </div>
        </div>
      )}

      <div style={{ padding: "0 var(--space-card-padding) var(--space-card-padding)" }} className="space-y-3">

        {/* ── Section: Procurement Orders ── */}
        {(filter === "all" || filter === "procurement") && filteredPOs.length > 0 && (
          <SectionCard
            icon={<ShoppingCart className="w-4 h-4 text-foreground/50" aria-hidden="true" />}
            title="Procurement Orders"
            count={filteredPOs.length}
            rightLabel={`$${filteredPOs.reduce((s, po) => s + po.totalAmount, 0).toLocaleString()}`}
            open={collapsed["procurement"] !== true}
            onToggle={() => toggle("procurement")}
          >
            <div className="overflow-x-auto bg-card">
              <table className="w-full table-fixed" style={{ fontSize: "var(--text-caption)" }} role="table" aria-label="Procurement orders list">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { col: "PO NUMBER", width: "14%", align: "text-left", hide: "", tip: "Purchase order reference number" },
                      { col: "VENDOR", width: "18%", align: "text-left", hide: "", tip: "Supplier / vendor name" },
                      { col: "STATUS", width: "13%", align: "text-left", hide: "", tip: "Current PO lifecycle status" },
                      { col: "ITEMS", width: "8%", align: "text-center", hide: "hidden md:table-cell", tip: "Number of line items on this PO" },
                      { col: "PROGRESS", width: "14%", align: "text-left", hide: "hidden sm:table-cell", tip: "Receiving progress percentage" },
                      { col: "EXPECTED", width: "11%", align: "text-left", hide: "hidden md:table-cell", tip: "Expected delivery date" },
                      { col: "AMOUNT", width: "12%", align: "text-right", hide: "", tip: "Total PO value" },
                    ].map(c => (
                      <th
                        key={c.col}
                        scope="col"
                        className={`py-1.5 px-4 text-foreground/50 whitespace-nowrap ${c.align} ${c.hide}`}
                        style={{ width: c.width, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" }}
                      >
                        <ThTooltip label={c.col} tooltip={c.tip} />
                      </th>
                    ))}
                    <th className="w-[6%]"><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPOs.map(po => {
                    const ss = PO_STATUS_STYLES[po.status];
                    const ac = avatarColor(po.vendorInitials);
                    const barColor = po.status === "Received" ? "var(--accent)" : po.status === "Partially Received" ? "var(--chart-3)" : "var(--primary)";
                    return (
                      <tr key={po.id} className="border-b border-border hover:bg-secondary transition-colors group">
                        <td className="py-2 px-4">
                          <Tooltip text={`Open ${po.poNumber}`} position="top">
                            <button
                              className="text-primary hover:underline"
                              style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}
                              aria-label={`Open ${po.poNumber}`}
                            >
                              <HighlightText text={po.poNumber} search={search} />
                            </button>
                          </Tooltip>
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center" style={{ gap: 6 }}>
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${ac.bg} ${ac.text}`}
                              style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" }}
                              aria-hidden="true"
                            >
                              {po.vendorInitials}
                            </span>
                            <span className="text-foreground truncate" style={{ fontSize: "var(--text-caption)" }}>
                              <HighlightText text={po.vendor} search={search} />
                            </span>
                          </div>
                        </td>
                        <td className="py-2 px-4">
                          <span className={`inline-flex items-center px-2 py-[2px] rounded ${ss.bg} ${ss.text}`} style={{ fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" }}>
                            {po.status}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-center text-foreground/50 hidden md:table-cell" style={{ fontSize: "var(--text-caption)" }}>
                          {po.items.length}
                        </td>
                        <td className="py-2 px-4 hidden sm:table-cell">
                          <MiniProgressBar pct={po.receivedPct} barColor={barColor} />
                        </td>
                        <td className="py-2 px-4 text-foreground/50 whitespace-nowrap hidden md:table-cell" style={{ fontSize: "var(--text-caption)" }}>
                          {po.expectedDate}
                        </td>
                        <td className="py-2 px-4 text-right text-foreground whitespace-nowrap" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                          ${po.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-2 px-4">
                          <div className="flex items-center justify-end" style={{ gap: 2 }}>
                            <Tooltip text={`Open ${po.poNumber} in Procurement`} position="top">
                              <button
                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary transition-colors opacity-40 group-hover:opacity-100"
                                aria-label={`Open ${po.poNumber} in procurement module`}
                              >
                                <ExternalLink className="w-3 h-3 text-foreground/35" />
                              </button>
                            </Tooltip>
                            <Tooltip text={`Copy ${po.poNumber}`} position="top">
                              <button
                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary transition-colors opacity-40 group-hover:opacity-100"
                                aria-label={`Copy ${po.poNumber}`}
                              >
                                <Copy className="w-3 h-3 text-foreground/35" />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* PO detail expansion: show items per PO */}
              {filteredPOs.flatMap(po => {
                const items = po.items.filter(it => {
                  if (!search) return true;
                  const q = search.toLowerCase();
                  return it.itemCode.toLowerCase().includes(q) || it.itemName.toLowerCase().includes(q);
                });
                if (items.length === 0) return [];
                return [(
                  <div key={`${po.id}-items`} className="border-t border-border bg-secondary/30" style={{ padding: "8px 16px" }}>
                    <div className="flex items-center" style={{ gap: 6, marginBottom: 6 }}>
                      <Package className="w-3 h-3 text-foreground/35" />
                      <span
                        className="text-foreground/50"
                        style={{ fontSize: "var(--text-small)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.04em" }}
                      >
                        {po.poNumber} ITEMS ({items.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {items.map(it => {
                        const pct = it.orderedQty > 0 ? Math.round((it.receivedQty / it.orderedQty) * 100) : 0;
                        const expandKey = `${po.id}--${it.soLineId}`;
                        return (
                          <div key={`${po.id}-${it.soLineId}`} className="flex items-start bg-card rounded-md border border-border" style={{ padding: "8px 10px", gap: 10 }}>
                            <div className="flex-1 min-w-0">
                              <ItemCell
                                itemCode={it.itemCode}
                                itemName={it.itemName}
                                search={search}
                                expanded={expandedItems.has(expandKey)}
                                onToggleExpand={() => toggleItemExpand(expandKey)}
                              />
                            </div>
                            <div className="flex items-center shrink-0" style={{ gap: 10, paddingTop: 4 }}>
                              <span className="text-foreground/50 shrink-0 tabular-nums" style={{ fontSize: "var(--text-caption)" }}>
                                {it.receivedQty}/{it.orderedQty}
                              </span>
                              <QtyUnit qty={it.orderedQty} />
                              <div className="shrink-0" style={{ width: 60 }}>
                                <MiniProgressBar pct={pct} barColor={pct >= 100 ? "var(--accent)" : "var(--chart-3)"} />
                              </div>
                              <span className="text-foreground/50 tabular-nums shrink-0" style={{ fontSize: "var(--text-caption)", minWidth: 60, textAlign: "right" }}>
                                ${(it.orderedQty * it.unitCost).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )];
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Section: Backorders ── */}
        {(filter === "all" || filter === "backorders") && filteredBackorders.length > 0 && (
          <SectionCard
            icon={<RotateCcw className="w-4 h-4 text-foreground/50" aria-hidden="true" />}
            title="Backorders"
            count={filteredBackorders.length}
            rightLabel={`${filteredBackorders.reduce((s, bo) => s + bo.backorderedQty, 0)} units`}
            open={collapsed["backorders"] !== true}
            onToggle={() => toggle("backorders")}
          >
            <div className="overflow-x-auto bg-card">
              <table className="w-full table-fixed" style={{ fontSize: "var(--text-caption)" }} role="table" aria-label="Backorders list">
                <thead>
                  <tr className="border-b border-border">
                    {[
                      { col: "PRODUCT", width: "38%", align: "text-left", hide: "", tip: "Product code and description" },
                      { col: "STATUS", width: "13%", align: "text-left", hide: "", tip: "Backorder resolution status" },
                      { col: "BACKORDERED", width: "13%", align: "text-right", hide: "", tip: "Quantity on backorder" },
                      { col: "ALLOCATED", width: "11%", align: "text-right", hide: "hidden md:table-cell", tip: "Current allocated quantity on SO" },
                      { col: "LINKED PO", width: "13%", align: "text-left", hide: "hidden md:table-cell", tip: "Purchase order sourcing this backorder" },
                      { col: "EXPECTED", width: "11%", align: "text-left", hide: "hidden lg:table-cell", tip: "Expected fulfillment date" },
                    ].map(c => (
                      <th
                        key={c.col}
                        scope="col"
                        className={`py-1.5 px-4 text-foreground/50 whitespace-nowrap ${c.align} ${c.hide}`}
                        style={{ width: c.width, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" }}
                      >
                        <ThTooltip label={c.col} tooltip={c.tip} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredBackorders.map(bo => {
                    const ss = BO_STATUS_STYLES[bo.status];
                    const boExpandKey = `bo--${bo.id}`;
                    return (
                      <tr key={bo.id} className="border-b border-border hover:bg-secondary transition-colors group">
                        <td style={{ padding: "8px 16px" }}>
                          <ItemCell
                            itemCode={bo.itemCode}
                            itemName={bo.itemName}
                            search={search}
                            expanded={expandedItems.has(boExpandKey)}
                            onToggleExpand={() => toggleItemExpand(boExpandKey)}
                          />
                        </td>
                        <td className="py-2 px-4 align-top" style={{ paddingTop: 10 }}>
                          <span className={`inline-flex items-center px-2 py-[2px] rounded ${ss.bg} ${ss.text}`} style={{ fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" }}>
                            {bo.status}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-right align-top" style={{ paddingTop: 10 }}>
                          <div className="flex justify-end">
                            <QtyUnit qty={bo.backorderedQty} />
                          </div>
                        </td>
                        <td className="py-2 px-4 text-right text-foreground/50 tabular-nums hidden md:table-cell align-top" style={{ fontSize: "var(--text-caption)", paddingTop: 12 }}>
                          {bo.allocatedQty} EA
                        </td>
                        <td className="py-2 px-4 hidden md:table-cell align-top" style={{ paddingTop: 10 }}>
                          {bo.linkedPONumber ? (
                            <Tooltip text={`Open ${bo.linkedPONumber} in Procurement`} position="top">
                              <button
                                className="inline-flex items-center text-primary hover:underline"
                                style={{ gap: 4, fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}
                              >
                                <HighlightText text={bo.linkedPONumber} search={search} />
                                <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                              </button>
                            </Tooltip>
                          ) : (
                            <span className="text-foreground/30" style={{ fontSize: "var(--text-caption)" }}>&mdash;</span>
                          )}
                        </td>
                        <td className="py-2 px-4 text-foreground/50 whitespace-nowrap hidden lg:table-cell align-top" style={{ fontSize: "var(--text-caption)", paddingTop: 12 }}>
                          {bo.expectedDate ? (
                            <span className="flex items-center" style={{ gap: 4 }}>
                              <Clock className="w-3 h-3 text-foreground/25 shrink-0" />
                              {bo.expectedDate}
                            </span>
                          ) : (
                            <span className="text-chart-3 flex items-center" style={{ gap: 4, fontSize: "var(--text-caption)" }}>
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              TBD
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </SectionCard>
        )}

        {/* ── Section: Work Orders (placeholder / coming soon) ── */}
        {(filter === "all" || filter === "work-orders") && (
          <SectionCard
            icon={<Wrench className="w-4 h-4 text-foreground/50" aria-hidden="true" />}
            title="Work Orders"
            count={0}
            open={collapsed["work-orders"] !== true}
            onToggle={() => toggle("work-orders")}
          >
            <div className="bg-card" style={{ padding: "var(--space-section-gap) var(--space-card-padding)" }}>
              <div className="flex flex-col items-center justify-center" style={{ gap: "var(--space-inline-gap)" }}>
                <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                  <Wrench className="w-4 h-4 text-chart-4" />
                </div>
                <div
                  className="text-foreground"
                  style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}
                >
                  Work Orders
                </div>
                <span
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-chart-3/10 text-chart-3"
                  style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}
                >
                  Coming Soon
                </span>
                <div
                  className="text-muted-foreground text-center max-w-[340px]"
                  style={{ fontSize: "var(--text-caption)", lineHeight: 1.5 }}
                >
                  Production work orders, assembly tracking, and BOM management will be available here.
                </div>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Empty state when filtered to zero */}
        {filteredTotal === 0 && search && (
          <div
            className="text-center text-foreground/40 py-8"
            style={{ fontSize: "var(--text-caption)" }}
          >
            No results matching &ldquo;{search}&rdquo;
          </div>
        )}
      </div>
    </div>
  );
}