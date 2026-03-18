// SOLineGrid.tsx - Line Items table with bulk actions
import { useState, useRef, useEffect } from "react";
import { Plus, Package, Ban, ChevronDown, ChevronUp, Target, Layers, Check } from "lucide-react";
import { ItemTypeBadge, DuplicateBadge } from "./StatusBadge";
import { ProgressFractionCell } from "./ProgressFractionCell";
import type { SalesOrder, SOLine } from "./types";
import { Button } from "./ui/Button";

interface SOLineGridProps {
  so: SalesOrder;
  onAddLine: () => void;
  onAllocateLine?: (line: SOLine) => void;
  onAllocateAll?: () => void;
  onDeleteLine: (lineId: string) => void;
  onCancelLines?: (lineIds: string[]) => void;
  onConfigureLine?: (line: SOLine) => void;
  onUpdateLine?: (lineId: string, updates: Partial<SOLine>) => void;
}

const UOM_OPTIONS = [
  { code: "EA", label: "Each", isDefault: true },
  { code: "BOX", label: "Box (12 units)" },
  { code: "CTN", label: "Carton (24 units)" },
  { code: "PLT", label: "Pallet (480 units)" },
  { code: "PCS", label: "Pieces" },
  { code: "SET", label: "Set" },
  { code: "KG", label: "Kilogram" },
  { code: "LB", label: "Pound" },
];

const DOLLAR = "\u0024";

function PriceCapsule({ price, cancelled }: { price: number; cancelled?: boolean }) {
  const formatted = DOLLAR + price.toLocaleString(undefined, { minimumFractionDigits: 2 });
  return (
    <div className={`flex flex-col items-end ${cancelled ? "opacity-50" : ""}`} style={{ gap: "2px" }}>
      <span className={`inline-flex items-center border border-border rounded-md bg-input-background text-foreground tabular-nums ${cancelled ? "line-through" : ""}`}
        style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)", padding: "5px var(--space-inline-gap)" }}>
        {formatted}
      </span>
      <span className="text-foreground/30" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" }}>Each</span>
    </div>
  );
}

function QtyUomCapsule({ qty, unit = "EA", cancelled, editable, onChangeQty, onChangeUnit }: {
  qty: number; unit?: string; cancelled?: boolean; editable?: boolean;
  onChangeQty?: (v: number) => void; onChangeUnit?: (u: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(qty));
  const [unitOpen, setUnitOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const capsuleRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!editing) setDraft(String(qty)); }, [qty, editing]);
  useEffect(() => { if (editing && inputRef.current) inputRef.current.select(); }, [editing]);
  useEffect(() => {
    if (!unitOpen) return;
    const handler = (e: MouseEvent) => { if (capsuleRef.current && !capsuleRef.current.contains(e.target as Node)) setUnitOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [unitOpen]);
  const commit = () => {
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed !== qty && onChangeQty) onChangeQty(parsed);
    else setDraft(String(qty));
    setEditing(false);
  };
  const isCan = !!cancelled;
  return (
    <div className="relative" ref={capsuleRef}>
      <div className={`inline-flex items-center border rounded-md bg-input-background overflow-hidden transition-colors ${isCan ? "opacity-50 border-border" : editing ? "border-primary ring-1 ring-primary/20" : "border-border"} ${editable && !editing ? "hover:border-foreground/15" : ""}`}>
        {editing ? (
          <input ref={inputRef} type="number" min={0} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={e => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(String(qty)); setEditing(false); } }}
            className="w-[40px] bg-transparent text-foreground tabular-nums text-center outline-none"
            style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)", padding: "5px 8px" }} />
        ) : (
          <button onClick={editable ? () => { setDraft(String(qty)); setEditing(true); } : undefined}
            className={`tabular-nums text-foreground ${isCan ? "line-through" : ""} ${editable ? "cursor-text" : "cursor-default"}`}
            style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)", padding: "5px var(--space-inline-gap)" }}
            tabIndex={editable ? 0 : -1}>{qty}</button>
        )}
        <div className="w-px self-stretch bg-border" />
        <button onClick={editable ? () => setUnitOpen(!unitOpen) : undefined}
          className={`flex items-center text-foreground/50 transition-colors ${editable ? "hover:text-foreground/70 cursor-pointer" : "cursor-default"} ${isCan ? "line-through" : ""}`}
          style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)", padding: "5px 8px", gap: "4px" }} tabIndex={editable ? 0 : -1}>
          {unit}{editable && <ChevronDown className="w-3 h-3 text-foreground/25" />}
        </button>
      </div>
      {unitOpen && (
        <div className="absolute top-full right-0 mt-1.5 bg-card border border-border rounded-lg" style={{ zIndex: "var(--z-dropdown)", boxShadow: "var(--elevation-2)", minWidth: "200px", padding: "4px 0" }}>
          {UOM_OPTIONS.map(opt => (
            <button key={opt.code} onClick={() => { if (onChangeUnit) onChangeUnit(opt.code); setUnitOpen(false); }}
              className={`w-full flex items-center justify-between transition-colors ${opt.code === unit ? "bg-secondary/70" : "hover:bg-secondary/40"}`}
              style={{ padding: "8px var(--space-card-padding)" }}>
              <div className="flex flex-col items-start">
                <div className="flex items-center" style={{ gap: "8px" }}>
                  <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)", fontSize: "var(--text-caption)" }}>{opt.code}</span>
                  {opt.isDefault && <span className="text-foreground/25 uppercase tracking-wider" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" }}>DEFAULT</span>}
                </div>
                <span className="text-foreground/40" style={{ fontSize: "var(--text-caption)" }}>{opt.label}</span>
              </div>
              {opt.code === unit && <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-primary-foreground" strokeWidth={2.5} /></div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function LineRow({ line, idx, isEditable, expandedRows, selectedLineIds, duplicateOfMap, onCancelLines, onConfigureLine, onUpdateLine, toggleExpand, toggleSelectLine }: {
  line: SOLine; idx: number; isEditable: boolean; expandedRows: Set<string>; selectedLineIds: Set<string>; duplicateOfMap: Map<number, number>;
  onCancelLines?: (ids: string[]) => void; onConfigureLine?: (l: SOLine) => void; onUpdateLine?: (id: string, u: Partial<SOLine>) => void;
  toggleExpand: (id: string) => void; toggleSelectLine: (id: string) => void;
}) {
  const isExp = expandedRows.has(line.id);
  const isCan = line.cancelled;
  const isPen = line.cancellationPending;
  const isSel = selectedLineIds.has(line.id);
  const canSel = !isCan && !isPen && line.shippedQty < line.orderedQty;
  const toShip = Math.max(0, line.orderedQty - line.shippedQty);
  const dash = <span className="text-foreground/15" style={{ fontSize: "var(--text-caption)" }}>{"\u2014"}</span>;
  return (
    <tr className={`border-b border-border/40 transition-colors group cursor-pointer ${isCan ? "bg-secondary/50 opacity-60" : isPen ? "bg-destructive/3 opacity-80" : isSel ? "bg-destructive/5" : "hover:bg-secondary/30"}`}
      onClick={e => { const t = e.target as HTMLElement; if (!t.closest('input, button, select, a, [role="button"]') && onConfigureLine) onConfigureLine(line); }}>
      <td className="align-top" style={{ padding: "10px 8px 10px var(--space-inline-gap)" }}>
        {onCancelLines && canSel ? <input type="checkbox" className="w-3.5 h-3.5 rounded accent-primary" checked={isSel} onChange={() => toggleSelectLine(line.id)} />
          : <input type="checkbox" className="w-3.5 h-3.5 rounded accent-primary" disabled checked={!!(isCan || isPen)} readOnly />}
      </td>
      <td className="align-top text-foreground/25 tabular-nums" style={{ padding: "10px 0 10px 4px", fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" }}>{idx + 1}</td>
      <td style={{ padding: "8px var(--space-inline-gap)" }}>
        <div className="flex items-start" style={{ gap: "8px" }}>
          <div className="w-8 h-8 rounded-md bg-secondary/70 flex items-center justify-center shrink-0"><Package className="w-3.5 h-3.5 text-foreground/15" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center flex-wrap" style={{ gap: "6px" }}>
              <span className={`text-foreground ${isCan ? "line-through" : ""}`} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>{line.itemCode}</span>
              <ItemTypeBadge type={line.itemType} />
              {duplicateOfMap.has(idx) && <DuplicateBadge ofIndex={duplicateOfMap.get(idx)!} />}
              {isCan && <span className="inline-flex items-center rounded bg-destructive/8 text-destructive" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", padding: "1px 6px" }}>CANCELLED</span>}
              {isPen && <span className="inline-flex items-center animate-pulse rounded bg-chart-3/8 text-chart-3" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", padding: "1px 6px", gap: "3px" }}>CANCELLATION PENDING</span>}
            </div>
            <div className="text-foreground/40" style={{ fontSize: "var(--text-caption)", lineHeight: "1.4", marginTop: "1px" }}>
              {isExp ? line.itemName : (line.itemName.length > 55 ? line.itemName.slice(0, 55) + "..." : line.itemName)}
              {!isPen && line.itemName.length > 55 && <>{" "}<button onClick={e => { e.stopPropagation(); toggleExpand(line.id); }} className="text-primary hover:underline inline-flex items-center" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)", gap: "2px" }}>{isExp ? "less" : "more"}{isExp ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button></>}
            </div>
            {isCan && line.cancelledReason && <div className="text-destructive" style={{ fontSize: "var(--text-caption)", marginTop: "2px" }}>{line.cancelledReason}</div>}
            {isPen && line.cancelledReason && <div className="text-chart-3" style={{ fontSize: "var(--text-caption)", marginTop: "2px" }}>Pending: {line.cancelledReason}</div>}
          </div>
        </div>
      </td>
      <td className="align-top text-right" style={{ padding: "10px 8px" }}><div className="flex justify-end"><QtyUomCapsule qty={line.orderedQty} unit="EA" cancelled={isCan} editable={isEditable && !isCan && !isPen && !!onUpdateLine} onChangeQty={v => onUpdateLine?.(line.id, { orderedQty: v })} /></div></td>
      <td className="align-top text-right" style={{ padding: "10px 8px" }}><div className="flex justify-end"><PriceCapsule price={line.unitPrice} cancelled={isCan} /></div></td>
      <td className="align-top text-right" style={{ padding: "10px 8px" }}>{!isCan ? <ProgressFractionCell value={line.allocatedQty} total={toShip} /> : dash}</td>
      <td className="align-top text-right" style={{ padding: "10px 8px" }}>{!isCan ? <ProgressFractionCell value={line.shippedQty} total={line.orderedQty} altPartialColor /> : dash}</td>
      <td className="align-top" style={{ padding: "10px 6px" }}>
        {!isCan && onCancelLines && canSel ? (<div className="flex items-center justify-end" style={{ gap: "2px" }}><button onClick={e => { e.stopPropagation(); onCancelLines([line.id]); }} className="w-7 h-7 rounded-md flex items-center justify-center text-foreground/10 hover:text-destructive hover:bg-destructive/5 transition-colors group-hover:text-foreground/20" title="Cancel Line"><Ban className="w-3.5 h-3.5" /></button></div>) : null}
      </td>
    </tr>
  );
}

export function SOLineGrid({ so, onAddLine, onAllocateLine, onAllocateAll, onDeleteLine, onCancelLines, onConfigureLine, onUpdateLine }: SOLineGridProps) {
  const isEditable = !["Cancelled", "Closed", "Shipped", "Archived"].includes(so.status);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedLineIds, setSelectedLineIds] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) => setExpandedRows(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectLine = (id: string) => setSelectedLineIds(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleSelectAll = () => { const c = so.lines.filter(l => !l.cancelled && !l.cancellationPending && l.shippedQty < l.orderedQty); setSelectedLineIds(selectedLineIds.size === c.length ? new Set() : new Set(c.map(l => l.id))); };
  const handleBulkCancel = () => { if (onCancelLines && selectedLineIds.size > 0) { onCancelLines(Array.from(selectedLineIds)); setSelectedLineIds(new Set()); } };
  const cancelledLines = so.lines.filter(l => l.cancelled);
  const activeLines = so.lines.filter(l => !l.cancelled);
  const fullyAllocCount = activeLines.filter(l => l.allocatedQty >= l.orderedQty).length;
  const partAllocCount = activeLines.filter(l => l.allocatedQty > 0 && l.allocatedQty < l.orderedQty).length;
  const isDraft = so.status === "Draft";
  const isPendingConfirm = so.status === "Pending Review";
  const cols = [{ label: "PRODUCT", align: "text-left", width: "" }, { label: "QTY / UOM", align: "text-right", width: "w-[130px]" }, { label: "PPU", align: "text-right", width: "w-[120px]" }, { label: "ALLOCATED", align: "text-right", width: "w-[100px]" }, { label: "SHIPPED", align: "text-right", width: "w-[100px]" }];
  const firstMap = new Map<string, number>();
  const dupMap = new Map<number, number>();
  so.lines.forEach((l, i) => { if (firstMap.has(l.itemCode)) dupMap.set(i, firstMap.get(l.itemCode)!); else firstMap.set(l.itemCode, i + 1); });
  return (
    <div className="bg-card border border-border" style={{ borderRadius: "var(--radius-xl)", boxShadow: "var(--elevation-1)" }}>
      <div className="flex items-center justify-between border-b border-border" style={{ padding: "10px var(--space-card-padding)" }}>
        <div className="flex items-center" style={{ gap: "var(--space-inline-gap)" }}>
          <span className="text-foreground" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>Line Items</span>
          {selectedLineIds.size > 0 ? (
            <span className="text-primary" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>{selectedLineIds.size} selected</span>
          ) : (
            <>
              <span className="text-foreground/35" style={{ fontSize: "var(--text-caption)" }}>{activeLines.length} active{cancelledLines.length > 0 ? `, ${cancelledLines.length} cancelled` : ""}</span>
              <div className="w-px h-3.5 bg-border" />
              <span className="text-foreground/35" style={{ fontSize: "var(--text-caption)" }}>Allocation{" "}<span className={fullyAllocCount === activeLines.length && activeLines.length > 0 ? "text-accent" : "text-primary"} style={{ fontWeight: "var(--font-weight-semibold)" }}>{fullyAllocCount}/{activeLines.length}</span></span>
              {partAllocCount > 0 && <span className="text-chart-3" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>{partAllocCount} partial</span>}
            </>
          )}
        </div>
        <div className="flex items-center" style={{ gap: "8px" }}>
          {onCancelLines && selectedLineIds.size > 0 && <Button variant="ghost" size="sm" icon={<Ban className="w-3.5 h-3.5 text-destructive" />} onClick={handleBulkCancel} className="border border-destructive/30 text-destructive hover:bg-destructive/5">Cancel {selectedLineIds.size} line item{selectedLineIds.size !== 1 ? "s" : ""}</Button>}
          {onAllocateAll && <Button variant="secondary" size="sm" icon={<Layers className="w-3.5 h-3.5" />} onClick={onAllocateAll} className="border-primary/15 text-primary hover:bg-primary/5">Allocate Inventory</Button>}
          {isEditable && <Button variant="primary" size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={onAddLine}>Add Line Item</Button>}
        </div>
      </div>
      {isDraft && activeLines.length > 0 && <div className="flex items-center rounded-md bg-primary/5" style={{ margin: "var(--space-card-padding) var(--space-card-padding) 0", padding: "var(--space-inline-gap) var(--space-card-padding)", gap: "var(--space-inline-gap)" }}><Target className="w-3.5 h-3.5 text-primary shrink-0" /><span className="text-primary" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>Allocate inventory to reserve stock for this order.</span></div>}
      {isPendingConfirm && activeLines.length > 0 && <div className="flex items-center rounded-md bg-chart-3/5" style={{ margin: "var(--space-card-padding) var(--space-card-padding) 0", padding: "var(--space-inline-gap) var(--space-card-padding)", gap: "var(--space-inline-gap)" }}><Package className="w-3.5 h-3.5 text-chart-3 shrink-0" /><span className="text-chart-3" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>Inventory allocated. Clear this Sales Order to enable shipping.</span></div>}
      <div style={{ paddingTop: "var(--space-inline-gap)", overflow: "visible" }}>
        <table className="w-full" style={{ overflow: "visible" }}>
          <thead><tr className="border-b border-border/60">
            <th style={{ width: "40px", padding: "8px var(--space-inline-gap)" }}>{onCancelLines ? <input type="checkbox" className="w-3.5 h-3.5 rounded accent-primary" checked={selectedLineIds.size > 0 && selectedLineIds.size === so.lines.filter(l => !l.cancelled && l.shippedQty < l.orderedQty).length} onChange={toggleSelectAll} /> : <input type="checkbox" className="w-3.5 h-3.5 rounded accent-primary" checked={false} readOnly />}</th>
            <th className="text-left text-foreground/30 tracking-wider uppercase" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", padding: "8px 0 8px var(--space-inline-gap)", letterSpacing: "0.06em", width: "32px" }}>#</th>
            {cols.map(c => <th key={c.label} className={`${c.align} ${c.width} text-foreground/30 tracking-wider uppercase`} style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", padding: "8px var(--space-inline-gap)", letterSpacing: "0.06em" }}>{c.label}</th>)}
            <th style={{ width: "52px", padding: "8px 8px" }} />
          </tr></thead>
          <tbody>
            {so.lines.map((line, i) => <LineRow key={line.id} line={line} idx={i} isEditable={isEditable} expandedRows={expandedRows} selectedLineIds={selectedLineIds} duplicateOfMap={dupMap} onCancelLines={onCancelLines} onConfigureLine={onConfigureLine} onUpdateLine={onUpdateLine} toggleExpand={toggleExpand} toggleSelectLine={toggleSelectLine} />)}
            {so.lines.length === 0 && <tr><td colSpan={8} className="text-center text-foreground/40" style={{ padding: "var(--space-section-gap) var(--space-card-padding)", fontSize: "var(--text-caption)" }}>No line items yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}