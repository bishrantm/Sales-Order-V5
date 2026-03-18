import { useState } from "react";
import { Clock, User, ChevronDown, ChevronRight, Eye, RotateCcw, FileText, Pencil, Check, Package, Truck, Ban, Archive, Layers } from "lucide-react";
import { HighlightText, TabSearchBar } from "./SearchHighlight";
import type { SalesOrder } from "./types";

interface VersionEntry {
  id: string;
  version: string;
  timestamp: string;
  user: string;
  userInitials: string;
  action: string;
  summary: string;
  changes: { field: string; from: string; to: string }[];
  isCurrent: boolean;
}

function generateVersionHistory(so: SalesOrder): VersionEntry[] {
  const reps = ["Sarah Lindquist", "Michael Tran", "Emily Rios", "David Kowalski"];
  const initials = (name: string) => name.split(" ").map(w => w[0]).join("");
  const entries: VersionEntry[] = [];
  let vNum = 1;

  // v1 — Creation
  entries.push({
    id: `VH-${so.id}-${vNum}`,
    version: `v${vNum}`,
    timestamp: `${so.createdDate.replace(/\//g, "/")} 09:00 AM`,
    user: reps[0],
    userInitials: initials(reps[0]),
    action: "Created",
    summary: `Sales Order created with ${so.lines.length} line items`,
    changes: [
      { field: "Status", from: "—", to: "Draft" },
      { field: "Customer", from: "—", to: so.customer },
      { field: "Line Items", from: "0", to: String(so.lines.length) },
      { field: "Payment Terms", from: "—", to: so.paymentTerms },
    ],
    isCurrent: false,
  });
  vNum++;

  // v2 — Line item edits
  entries.push({
    id: `VH-${so.id}-${vNum}`,
    version: `v${vNum}`,
    timestamp: `${so.createdDate.replace(/\//g, "/")} 10:30 AM`,
    user: reps[0],
    userInitials: initials(reps[0]),
    action: "Updated",
    summary: "Modified line item quantities and added warehouse assignment",
    changes: [
      { field: `Line ${so.lines[0]?.itemCode || "000-100-001"} Qty`, from: "1", to: String(so.lines[0]?.orderedQty || 2) },
      { field: "Warehouse", from: "—", to: so.warehouse },
      { field: "Internal Notes", from: "—", to: so.internalNotes || "Added dock instructions" },
    ],
    isCurrent: false,
  });
  vNum++;

  // v3 — Cleared (if not draft)
  if (so.status !== "Draft") {
    entries.push({
      id: `VH-${so.id}-${vNum}`,
      version: `v${vNum}`,
      timestamp: `${so.createdDate.replace(/\//g, "/")} 02:15 PM`,
      user: reps[1 % reps.length],
      userInitials: initials(reps[1 % reps.length]),
      action: "Cleared",
      summary: "Sales Order cleared by Ops — ready for picking and shipping",
      changes: [
        { field: "Status", from: "Draft", to: "Cleared by Ops" },
      ],
      isCurrent: false,
    });
    vNum++;
  }

  // v4 — Allocation (if allocated)
  if (["Cleared", "Partially Shipped", "Shipped", "Closed"].includes(so.status)) {
    entries.push({
      id: `VH-${so.id}-${vNum}`,
      version: `v${vNum}`,
      timestamp: `${so.createdDate.replace(/\//g, "/")} 04:45 PM`,
      user: reps[2 % reps.length],
      userInitials: initials(reps[2 % reps.length]),
      action: "Allocated",
      summary: `Inventory allocated for ${so.lines.filter(l => l.allocatedQty > 0).length} line items`,
      changes: so.lines.filter(l => l.allocatedQty > 0 && !l.cancelled).slice(0, 3).map(l => ({
        field: `${l.itemCode} Allocated`,
        from: "0",
        to: String(l.allocatedQty),
      })),
      isCurrent: false,
    });
    vNum++;
  }

  // v5 — Shipped
  if (["Shipped", "Partially Shipped", "Closed"].includes(so.status)) {
    entries.push({
      id: `VH-${so.id}-${vNum}`,
      version: `v${vNum}`,
      timestamp: `${so.createdDate.replace(/\//g, "/")} — +3d`,
      user: reps[3 % reps.length],
      userInitials: initials(reps[3 % reps.length]),
      action: "Shipped",
      summary: `Shipment created — ${so.lines.filter(l => l.shippedQty > 0).length} items shipped`,
      changes: [
        { field: "Status", from: "Cleared", to: so.status === "Partially Shipped" ? "Partially Shipped" : "Shipped" },
        { field: "Shipments", from: "0", to: String(so.shipmentIds.length || 1) },
      ],
      isCurrent: false,
    });
    vNum++;
  }

  // v6 — Delivered / Cancelled / Closed
  if (so.status === "Shipped" || so.status === "Closed") {
    entries.push({
      id: `VH-${so.id}-${vNum}`,
      version: `v${vNum}`,
      timestamp: `${so.createdDate.replace(/\//g, "/")} — +7d`,
      user: reps[0],
      userInitials: initials(reps[0]),
      action: so.status === "Closed" ? "Closed" : "Shipped",
      summary: so.status === "Closed" ? "Sales Order closed — books settled" : "All shipments delivered — order fulfilled",
      changes: [
        { field: "Status", from: "Shipped", to: so.status },
      ],
      isCurrent: false,
    });
    vNum++;
  }

  if (so.status === "Cancelled") {
    entries.push({
      id: `VH-${so.id}-${vNum}`,
      version: `v${vNum}`,
      timestamp: `${so.createdDate.replace(/\//g, "/")} — +2d`,
      user: reps[0],
      userInitials: initials(reps[0]),
      action: "Cancelled",
      summary: "Sales Order cancelled — unshipped reservations released",
      changes: [
        { field: "Status", from: so.lines.some(l => l.shippedQty > 0) ? "Partially Shipped" : "Cleared", to: "Cancelled" },
        { field: "Released Qty", from: "—", to: String(so.lines.filter(l => l.cancelled).reduce((s, l) => s + l.orderedQty, 0)) },
      ],
      isCurrent: false,
    });
    vNum++;
  }

  // Mark last as current
  if (entries.length > 0) {
    entries[entries.length - 1].isCurrent = true;
  }

  return entries.reverse(); // newest first
}

const ACTION_ICONS: Record<string, typeof Clock> = {
  Created: FileText,
  Updated: Pencil,
  Cleared: Check,
  Allocated: Layers,
  Shipped: Truck,
  Delivered: Package,
  Closed: Archive,
  Cancelled: Ban,
};

const ACTION_COLORS: Record<string, string> = {
  Created: "bg-primary/10 text-primary",
  Updated: "bg-chart-3/10 text-chart-3",
  Cleared: "bg-accent/10 text-accent",
  Allocated: "bg-chart-4/10 text-chart-4",
  Shipped: "bg-primary/10 text-primary",
  Delivered: "bg-accent/10 text-accent",
  Closed: "bg-foreground/10 text-foreground/60",
  Cancelled: "bg-destructive/10 text-destructive",
};

export function VersionHistoryTab({ so }: { so: SalesOrder }) {
  const versions = generateVersionHistory(so);
  const [expandedId, setExpandedId] = useState<string | null>(versions[0]?.id || null);
  const [search, setSearch] = useState("");

  const filteredVersions = versions.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return v.action.toLowerCase().includes(q) ||
      v.summary.toLowerCase().includes(q) ||
      v.user.toLowerCase().includes(q) ||
      v.changes.some(c => c.field.toLowerCase().includes(q) || c.to.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="border border-border rounded-lg overflow-hidden shadow-elevation-sm">
        <div className="bg-secondary px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-foreground/50" />
            <span className="text-[length:var(--text-caption)] text-foreground font-semibold">Version History</span>
            <span className="text-[length:var(--text-micro)] bg-primary/10 text-primary px-1.5 py-[1px] rounded-full font-semibold">{filteredVersions.length}</span>
          </div>
          <div className="flex items-center gap-2 text-[length:var(--text-small)] text-foreground/50">
            <span>Current: <span className="text-foreground font-medium">{versions.find(v => v.isCurrent)?.version || "v1"}</span></span>
          </div>
        </div>

        <TabSearchBar
          search={search}
          onSearchChange={setSearch}
          placeholder="Search version history..."
          resultCount={filteredVersions.length}
          resultLabel="versions"
        />

        <div className="bg-card">
          {filteredVersions.map((entry, idx) => {
            const isExpanded = expandedId === entry.id;
            const IconComponent = ACTION_ICONS[entry.action] || Clock;
            const colorClass = ACTION_COLORS[entry.action] || "bg-foreground/10 text-foreground/60";

            return (
              <div key={entry.id} className={`border-b border-border/50 last:border-b-0 ${isExpanded ? "bg-secondary/30" : ""}`}>
                {/* Row header */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
                >
                  {/* Timeline dot + connector */}
                  <div className="flex flex-col items-center shrink-0 relative">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${colorClass}`}>
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    {idx < versions.length - 1 && (
                      <div className="w-px h-3 bg-border absolute -bottom-3 left-1/2 -translate-x-1/2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-1.5 py-[1px] rounded text-[length:var(--text-micro)] bg-foreground/5 text-foreground/60 border border-border/50 font-semibold">
                        {entry.version}
                      </span>
                      <span className="text-[length:var(--text-caption)] text-foreground font-medium">{entry.action}</span>
                      {entry.isCurrent && (
                        <span className="text-[length:var(--text-micro)] bg-accent/10 text-accent px-1.5 py-[1px] rounded font-semibold">CURRENT</span>
                      )}
                    </div>
                    <div className="text-[length:var(--text-small)] text-foreground/50 mt-0.5 truncate"><HighlightText text={entry.summary} search={search} /></div>
                  </div>

                  {/* Meta */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1.5 text-[length:var(--text-small)] text-foreground/50">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[length:var(--text-micro)] shrink-0 font-semibold">{entry.userInitials}</span>
                      <span className="hidden xl:inline">{entry.user}</span>
                    </div>
                    <span className="text-[length:var(--text-small)] text-foreground/35 whitespace-nowrap">{entry.timestamp}</span>
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-foreground/35" /> : <ChevronRight className="w-3.5 h-3.5 text-foreground/35" />}
                  </div>
                </button>

                {/* Expanded: change details */}
                {isExpanded && entry.changes.length > 0 && (
                  <div className="px-4 pb-3 pl-[52px]">
                    <div className="border border-border rounded-md overflow-hidden">
                      <div className="bg-secondary px-3 py-1.5 text-[length:var(--text-micro)] text-foreground/50 tracking-wider font-medium">
                        CHANGES
                      </div>
                      <div className="bg-card divide-y divide-border/50">
                        {entry.changes.map((change, ci) => (
                          <div key={ci} className="flex items-center justify-between px-3 py-2 text-[length:var(--text-caption)]">
                            <span className="text-foreground/50">{change.field}</span>
                            <div className="flex items-center gap-2">
                              {change.from !== "—" && (
                                <>
                                  <span className="text-foreground/35 line-through">{change.from}</span>
                                  <span className="text-foreground/20">&rarr;</span>
                                </>
                              )}
                              <span className="text-foreground font-medium">{change.to}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions row */}
                    <div className="flex items-center gap-2 mt-2">
                      <button className="flex items-center gap-1 px-2.5 py-1 text-[length:var(--text-small)] text-foreground/50 border border-border rounded-md hover:bg-secondary font-medium transition-colors">
                        <Eye className="w-3 h-3" /> View Snapshot
                      </button>
                      {!entry.isCurrent && (
                        <button className="flex items-center gap-1 px-2.5 py-1 text-[length:var(--text-small)] text-chart-3 border border-chart-3/20 rounded-md hover:bg-chart-3/5 font-medium transition-colors">
                          <RotateCcw className="w-3 h-3" /> Revert to {entry.version}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredVersions.length === 0 && (
            <div className="px-5 py-8 text-center text-foreground/50 text-[length:var(--text-caption)]">
              No version history yet. Changes to this order will be tracked here.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}