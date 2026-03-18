import { useState, useMemo, useCallback } from "react";
import {
  X, Ban, AlertTriangle, Package, Check,
  Truck, RotateCcw, Warehouse, Info,
  Minus, Plus, DollarSign, FileText, ArrowRight,
  ChevronDown, Paperclip, Upload, User,
  CreditCard, Calendar, Search, Scale,
  ShieldAlert, XOctagon,
} from "lucide-react";
import { ItemTypeBadge } from "./StatusBadge";
import { ItemDescription } from "./ItemDescription";
import { useModalShortcuts, KbdHint } from "./ModalKeyboard";
import { Button } from "./ui/Button";
import { CancellationConfirmDialog, useDiscardGuard } from "./ui/DiscardChangesDialog";
import type { SalesOrder, SOLine, CancellationReason, LineCancelAction } from "./types";

/* ═══════════════════════════════════════════════════════
   Constants & Helpers
   ═══════════════════════════════════════════════════════ */

const REASON_OPTIONS: { value: CancellationReason; label: string; description: string; icon: typeof Ban }[] = [
  { value: "Customer Request", label: "Customer requested cancellation", description: "The buyer changed their mind or no longer needs the order", icon: User },
  { value: "Out of Stock", label: "Item out of stock", description: "Product unavailable or insufficient inventory to fulfill the order", icon: Package },
  { value: "Pricing Error", label: "Pricing or quotation error", description: "Incorrect pricing, missing discounts, or disagreement on quoted terms", icon: DollarSign },
  { value: "Duplicate Order", label: "Duplicate order", description: "The same order was entered twice, either by the customer or internally", icon: FileText },
  { value: "Delivery Date", label: "Delivery date not acceptable", description: "The promised or revised lead time no longer works for the customer", icon: Calendar },
  { value: "Better Alternative", label: "Customer found a better alternative", description: "The customer sourced a comparable product from another vendor", icon: Search },
  { value: "Credit Issue", label: "Credit or payment issue", description: "Order fails credit check, or required payment was not received", icon: CreditCard },
  { value: "Product Discontinued", label: "Product discontinued or unavailable", description: "The item has been discontinued, recalled, or is permanently unavailable", icon: XOctagon },
  { value: "Regulatory", label: "Regulatory or export restriction", description: "Export control, sanctioned entity, or compliance block prevents fulfillment", icon: Scale },
  { value: "Fraudulent Order", label: "Fraudulent or suspicious order", description: "Order flagged for fraud review or confirmed as unauthorized", icon: ShieldAlert },
  { value: "Other", label: "Other reason", description: "Specify the cancellation reason below", icon: Info },
];

/** Determine what cancel action is needed per line based on its lifecycle position.
 *  For partially shipped lines, the shipped portion is protected — only the
 *  unshipped remainder is cancellable, so the action reflects that remainder. */
function getLineCancelAction(line: SOLine, soStatus: string): LineCancelAction {
  if (line.cancelled) return "none";
  if (line.deliveredQty >= line.orderedQty) return "rma";
  if (line.shippedQty >= line.orderedQty) return "intercept"; // fully shipped — shouldn't reach here via cancellableLines
  // Partially shipped: shipped units are protected, unshipped portion follows normal logic
  const unshippedQty = line.orderedQty - line.shippedQty;
  if (unshippedQty <= 0) return "none";
  if (line.pickedQty > 0) return "put-back";
  if (soStatus === "Cleared" && line.readyToPick) return "halt-pick";
  if (line.allocatedQty > 0) return "release";
  return "void";
}

const ACTION_LABELS: Record<LineCancelAction, { label: string; icon: typeof Ban; color: string }> = {
  void: { label: "No inventory impact — line will be voided", icon: Info, color: "var(--foreground)" },
  release: { label: "Allocated inventory will be released back to available stock", icon: Package, color: "var(--primary)" },
  "halt-pick": { label: "Warehouse will be notified to halt picking for this item", icon: Warehouse, color: "var(--chart-3)" },
  "put-back": { label: "Picked items require warehouse put-back confirmation", icon: RotateCcw, color: "var(--chart-3)" },
  intercept: { label: "Carrier intercept will be requested — not guaranteed", icon: Truck, color: "var(--destructive)" },
  rma: { label: "Fully delivered — use Returns / RMA module instead", icon: ArrowRight, color: "var(--chart-4)" },
  none: { label: "Already cancelled", icon: Ban, color: "var(--foreground)" },
};

/* ═══ Inline typography styles ═══ */
const captionStyle: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" };
const captionNormal: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" };
const microStyle: React.CSSProperties = { fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" as const };
const smallStyle: React.CSSProperties = { fontSize: "var(--text-small)", fontWeight: "var(--font-weight-normal)" };

interface Props {
  so: SalesOrder;
  mode: "full" | "partial";
  preselectedLineIds?: string[];
  onConfirmFull: (reason: CancellationReason, reasonText: string) => void;
  onConfirmPartial: (lineIds: string[], cancelQtys: Record<string, number>, reason: CancellationReason, reasonText: string) => void;
  onClose: () => void;
}

interface LineSelection {
  selected: boolean;
  cancelQty: number;
  maxCancelQty: number;
  action: LineCancelAction;
}

/* ═══════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════ */

export function CancellationModal({ so, mode: initialMode, preselectedLineIds, onConfirmFull, onConfirmPartial, onClose }: Props) {
  /* Track whether any active line has partially shipped units (informational) */
  const hasShippedItems = useMemo(() => so.lines.some(l => !l.cancelled && l.shippedQty > 0), [so.lines]);

  /* Compute cancellable lines upfront for disable logic.
     A line is cancellable when it has remaining unshipped, uncancelled qty. */
  const cancellableLinesForCheck = useMemo(() =>
    so.lines.filter(l => !l.cancelled && (l.orderedQty - l.shippedQty - (l.cancelledQty || 0)) > 0),
  [so.lines]);

  /* Partial cancellation is meaningless when:
     - Only 1 cancellable line with max cancel qty of 1 (no granularity possible)
     - 0 cancellable lines (nothing to partially cancel)
     - All lines are already cancelled */
  const isPartialMeaningless = useMemo(() => {
    if (cancellableLinesForCheck.length === 0) return true;
    if (cancellableLinesForCheck.length === 1) {
      const line = cancellableLinesForCheck[0];
      const maxQty = line.orderedQty - line.shippedQty - (line.cancelledQty || 0);
      if (maxQty <= 1) return true;
    }
    return false;
  }, [cancellableLinesForCheck]);

  /* Full cancellation is never blocked — it cancels all unshipped portions.
     It is only unavailable when there are zero cancellable lines. */
  const isFullBlocked = cancellableLinesForCheck.length === 0;

  const effectiveInitialMode = isFullBlocked ? "partial" : isPartialMeaningless ? "full" : initialMode;

  const [mode, setMode] = useState<"full" | "partial">(effectiveInitialMode);
  const [reason, setReason] = useState<CancellationReason | "">("");
  const [reasonText, setReasonText] = useState("");
  const [reasonDropdownOpen, setReasonDropdownOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  // Line selections — includes lines with partial shipments (unshipped portion is cancellable)
  const cancellableLines = useMemo(() =>
    so.lines.filter(l => !l.cancelled && (l.orderedQty - l.shippedQty - (l.cancelledQty || 0)) > 0),
  [so.lines]);

  const rmaLines = useMemo(() =>
    so.lines.filter(l => !l.cancelled && l.deliveredQty >= l.orderedQty),
  [so.lines]);

  /* Fully shipped lines (all units shipped, not yet delivered) — cannot cancel any portion */
  const nonCancellableLines = useMemo(() =>
    so.lines.filter(l => !l.cancelled && l.shippedQty >= l.orderedQty && l.deliveredQty < l.orderedQty),
  [so.lines]);

  const preselectedSet = useMemo(() => new Set(preselectedLineIds || []), [preselectedLineIds]);

  const initSelections = useCallback((): Record<string, LineSelection> => {
    const sel: Record<string, LineSelection> = {};
    cancellableLines.forEach(line => {
      const action = getLineCancelAction(line, so.status);
      const maxQty = line.orderedQty - line.shippedQty - (line.cancelledQty || 0);
      const isPreselected = preselectedSet.has(line.id);
      sel[line.id] = {
        selected: mode === "full" || isPreselected,
        cancelQty: (mode === "full" || isPreselected) ? Math.max(0, maxQty) : 0,
        maxCancelQty: Math.max(0, maxQty),
        action,
      };
    });
    return sel;
  }, [cancellableLines, mode, so.status, preselectedSet]);

  const [lineSelections, setLineSelections] = useState<Record<string, LineSelection>>(initSelections);

  const handleModeSwitch = (newMode: "full" | "partial") => {
    setMode(newMode);
    const sel: Record<string, LineSelection> = {};
    cancellableLines.forEach(line => {
      const action = getLineCancelAction(line, so.status);
      const maxQty = line.orderedQty - line.shippedQty - (line.cancelledQty || 0);
      sel[line.id] = {
        selected: newMode === "full",
        cancelQty: newMode === "full" ? Math.max(0, maxQty) : 0,
        maxCancelQty: Math.max(0, maxQty),
        action,
      };
    });
    setLineSelections(sel);
  };

  const toggleLine = (id: string) => {
    setLineSelections(prev => {
      const cur = prev[id];
      if (!cur) return prev;
      return { ...prev, [id]: { ...cur, selected: !cur.selected, cancelQty: !cur.selected ? cur.maxCancelQty : 0 } };
    });
  };

  const setQty = (id: string, qty: number) => {
    setLineSelections(prev => {
      const cur = prev[id];
      if (!cur) return prev;
      const clamped = Math.max(0, Math.min(qty, cur.maxCancelQty));
      return { ...prev, [id]: { ...cur, cancelQty: clamped, selected: clamped > 0 } };
    });
  };

  const toggleAll = () => {
    const allSelected = cancellableLines.every(l => lineSelections[l.id]?.selected);
    setLineSelections(prev => {
      const next = { ...prev };
      cancellableLines.forEach(l => {
        if (next[l.id]) {
          next[l.id] = { ...next[l.id], selected: !allSelected, cancelQty: !allSelected ? next[l.id].maxCancelQty : 0 };
        }
      });
      return next;
    });
  };

  const handleAddAttachment = () => {
    const mockFiles = ["cancellation-request.pdf", "customer-email.eml", "credit-memo-draft.xlsx", "return-authorization.pdf"];
    const next = mockFiles[attachments.length % mockFiles.length];
    if (!attachments.includes(next)) {
      setAttachments(prev => [...prev, next]);
    }
  };

  const handleRemoveAttachment = (name: string) => {
    setAttachments(prev => prev.filter(a => a !== name));
  };

  // Derived values
  const selectedLines = cancellableLines.filter(l => lineSelections[l.id]?.selected);
  const selectedCount = selectedLines.length;

  const totalCancelValue = selectedLines.reduce((sum, l) => {
    const qty = lineSelections[l.id]?.cancelQty || 0;
    return sum + qty * l.unitPrice;
  }, 0);

  const totalAllocToRelease = selectedLines.reduce((sum, l) => {
    const sel = lineSelections[l.id];
    if (!sel || sel.action === "intercept" || sel.action === "rma") return sum;
    return sum + l.allocations.filter(a => !a.locked).reduce((s, a) => s + a.qty, 0);
  }, 0);

  const totalPickedPutBack = selectedLines.reduce((sum, l) => {
    const sel = lineSelections[l.id];
    if (!sel || sel.action !== "put-back") return sum;
    return sum + l.pickedQty;
  }, 0);

  const totalShippedIntercept = selectedLines.reduce((sum, l) => {
    const sel = lineSelections[l.id];
    if (!sel || sel.action !== "intercept") return sum;
    return sum + l.shippedQty;
  }, 0);

  const hasInterceptLines = selectedLines.some(l => lineSelections[l.id]?.action === "intercept");
  const hasPutBackLines = selectedLines.some(l => lineSelections[l.id]?.action === "put-back");
  const hasHaltPickLines = selectedLines.some(l => lineSelections[l.id]?.action === "halt-pick");

  const reasonValid = reason !== "" && (reason !== "Other" || reasonText.trim().length > 0);
  const canReview = mode === "full" ? reasonValid : (selectedCount > 0 && reasonValid);

  const reasonLabel = REASON_OPTIONS.find(r => r.value === reason)?.label || "";

  // Discard guard — dirty when user has entered any meaningful data
  const isDirty = reason !== "" || reasonText.length > 0 || attachments.length > 0 || (mode === "partial" && selectedCount > 0);
  const { guardedClose, discardDialog } = useDiscardGuard(isDirty, onClose);

  const handleConfirm = () => {
    if (!reason) return;
    if (mode === "full") {
      onConfirmFull(reason as CancellationReason, reasonText);
    } else {
      const lineIds = selectedLines.map(l => l.id);
      const cancelQtys: Record<string, number> = {};
      selectedLines.forEach(l => { cancelQtys[l.id] = lineSelections[l.id]?.cancelQty || 0; });
      onConfirmPartial(lineIds, cancelQtys, reason as CancellationReason, reasonText);
    }
    onClose();
  };

  useModalShortcuts({
    onConfirm: () => { if (!showConfirmDialog && canReview) setShowConfirmDialog(true); },
    onClose: showConfirmDialog ? () => setShowConfirmDialog(false) : guardedClose,
    confirmDisabled: !canReview,
  });

  const allSelected = cancellableLines.length > 0 && cancellableLines.every(l => lineSelections[l.id]?.selected);
  const someSelected = cancellableLines.some(l => lineSelections[l.id]?.selected) && !allSelected;

  /* ═══ Line Item Card ═══ */
  const renderLineCard = (line: SOLine, selectable: boolean) => {
    const sel = lineSelections[line.id];
    const action = sel?.action || getLineCancelAction(line, so.status);
    const actionMeta = ACTION_LABELS[action];
    const isSelected = sel?.selected || false;

    return (
      <div
        key={line.id}
        className={`rounded-lg border transition-all ${
          isSelected ? "border-destructive/30 bg-destructive/[0.03]" : "border-border hover:border-border"
        } ${selectable ? "cursor-pointer" : ""}`}
        style={{ boxShadow: "var(--elevation-0)" }}
        onClick={selectable ? () => toggleLine(line.id) : undefined}
      >
        <div style={{ padding: "12px 16px" }} className="flex items-start gap-3">
          {/* Checkbox */}
          {selectable && (
            <div
              className={`w-[18px] h-[18px] rounded flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                isSelected ? "bg-destructive border-destructive" : "bg-card border-2 border-border"
              }`}
              style={{ borderRadius: "calc(var(--radius) - 6px)" }}
            >
              {isSelected && <Check className="w-3 h-3 text-destructive-foreground" strokeWidth={3} />}
            </div>
          )}

          {/* Thumbnail */}
          <div className="shrink-0 flex items-center justify-center bg-secondary/70 rounded-md" style={{ width: 36, height: 36 }}>
            <Package className="text-foreground/15" style={{ width: 16, height: 16 }} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
              <span className="text-foreground" style={{ ...captionStyle, fontWeight: "var(--font-weight-semibold)" }}>{line.itemCode}</span>
              <ItemTypeBadge type={line.itemType} />
            </div>

            {/* Description with proper overflow detection "more >>" */}
            <ItemDescription text={line.itemName} maxLines={2} />

            {/* Stats row — Allocated / Picked / Shipped */}
            <div className="text-foreground/35 mt-1" style={smallStyle}>
              Allocated: {line.allocatedQty} · Picked: {line.pickedQty} · Shipped: {line.shippedQty}
            </div>

            {/* Shipped units protected notice — shown for partially shipped lines */}
            {line.shippedQty > 0 && line.shippedQty < line.orderedQty && (
              <div className="flex items-center gap-1 mt-1" style={{ fontSize: "var(--text-small)" }}>
                <Truck style={{ width: 10, height: 10, flexShrink: 0, color: "var(--chart-3)", opacity: 0.7 }} />
                <span style={{ color: "var(--chart-3)", opacity: 0.7, fontWeight: "var(--font-weight-medium)" }}>
                  {line.shippedQty} shipped (protected) · {line.orderedQty - line.shippedQty} unshipped (cancellable)
                </span>
              </div>
            )}

            {/* Action description — subtle inline with icon */}
            {action !== "void" && action !== "none" && (
              <div className="flex items-center gap-1.5 mt-1.5" style={{ fontSize: "var(--text-small)" }}>
                <actionMeta.icon style={{ width: 11, height: 11, flexShrink: 0, color: actionMeta.color, opacity: 0.7 }} />
                <span style={{ color: actionMeta.color, opacity: 0.7, fontWeight: "var(--font-weight-normal)" }}>{actionMeta.label}</span>
              </div>
            )}
          </div>
        </div>

        {/* Qty adjuster — only show when selected & >1 possible */}
        {selectable && isSelected && sel && sel.maxCancelQty > 1 && (
          <div
            className="flex items-center gap-3 border-t border-border/50 mx-4"
            style={{ padding: "8px 0 10px 0" }}
            onClick={e => e.stopPropagation()}
          >
            <span className="text-foreground/50" style={captionStyle}>Cancel qty:</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setQty(line.id, sel.cancelQty - 1)}
                className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-secondary"
                style={{ background: "var(--card)" }}
              >
                <Minus className="w-3 h-3 text-foreground/70" />
              </button>
              <input
                type="number"
                value={sel.cancelQty}
                onChange={e => setQty(line.id, parseInt(e.target.value) || 0)}
                className="w-14 h-6 text-center border border-border rounded text-foreground bg-input-background outline-none focus:ring-1 focus:ring-ring"
                style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}
                min={0}
                max={sel.maxCancelQty}
              />
              <button
                onClick={() => setQty(line.id, sel.cancelQty + 1)}
                className="w-6 h-6 rounded border border-border flex items-center justify-center hover:bg-secondary"
                style={{ background: "var(--card)" }}
              >
                <Plus className="w-3 h-3 text-foreground/70" />
              </button>
              <span className="text-foreground/35 ml-1" style={smallStyle}>of {sel.maxCancelQty} EA</span>
            </div>
            <span className="text-foreground/35 ml-auto" style={smallStyle}>
              ${(sel.cancelQty * line.unitPrice).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ═══ Main Modal ═══ */}
      <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: "var(--z-modal)" }}>
        <div className="absolute inset-0 bg-foreground/40" onClick={guardedClose} />
        <div
          className="relative bg-card rounded-xl border border-border flex flex-col overflow-hidden"
          style={{
            width: 920,
            height: "min(calc(100vh - 64px), 860px)",
            boxShadow: "var(--elevation-3)",
          }}
        >

          {/* ══ Header ══ */}
          <div className="flex items-center justify-between shrink-0 border-b border-border" style={{ padding: "16px 20px" }}>
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-chart-3/10 flex items-center justify-center" style={{ width: 40, height: 40 }}>
                <Ban className="text-chart-3" style={{ width: 20, height: 20 }} />
              </div>
              <div>
                <h3 className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}>
                  Cancel Sales Order
                </h3>
                <p className="text-foreground/50 mt-0.5" style={captionNormal}>
                  {so.soNumber} · {so.customer}
                </p>
              </div>
            </div>
            <button
              onClick={guardedClose}
              className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
            >
              <X className="w-3.5 h-3.5 text-foreground/50" />
            </button>
          </div>

          {/* ══ Body — Split Panel ══ */}
          <div className="flex flex-1 overflow-hidden">

            {/* ═══ LEFT — Line Items ═══ */}
            <div className="flex-1 flex flex-col border-r border-border min-w-0">
              {/* Mode Toggle — modern card-style toggles with descriptions */}
              <div style={{ padding: "12px 16px 0 16px" }}>
                <div className="grid grid-cols-2 gap-2" style={{ marginBottom: 12 }}>
                  {/* Full cancellation card */}
                  <button
                    onClick={() => !isFullBlocked && handleModeSwitch("full")}
                    className={`flex items-start gap-2.5 rounded-lg border transition-all text-left ${
                      isFullBlocked
                        ? "border-border bg-secondary/30 text-foreground/25 cursor-not-allowed opacity-50"
                        : mode === "full"
                          ? "border-destructive/30 bg-destructive/[0.04]"
                          : "border-border bg-card hover:border-foreground/15"
                    }`}
                    style={{ padding: "10px 12px" }}
                    disabled={isFullBlocked}
                    title={isFullBlocked ? "Full cancellation unavailable — all items are fully shipped" : undefined}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        mode === "full" && !isFullBlocked ? "border-destructive bg-destructive" : "border-border"
                      }`}
                    >
                      {mode === "full" && !isFullBlocked && <div className="w-1.5 h-1.5 rounded-full bg-destructive-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Ban style={{ width: 12, height: 12, flexShrink: 0, color: mode === "full" && !isFullBlocked ? "var(--destructive)" : "currentColor" }} />
                        <span style={{ ...captionStyle, fontWeight: mode === "full" && !isFullBlocked ? "var(--font-weight-semibold)" : "var(--font-weight-medium)", color: mode === "full" && !isFullBlocked ? "var(--destructive)" : "currentColor" }}>
                          Cancel Entire Order
                        </span>
                      </div>
                      <div className="text-foreground/40 mt-0.5" style={{ fontSize: "var(--text-small)", lineHeight: 1.35 }}>
                        {hasShippedItems ? "Cancel all unshipped quantities" : "Cancel all line items and void the order"}
                      </div>
                    </div>
                  </button>

                  {/* Partial cancellation card */}
                  <button
                    onClick={() => !isPartialMeaningless && handleModeSwitch("partial")}
                    className={`flex items-start gap-2.5 rounded-lg border transition-all text-left ${
                      isPartialMeaningless
                        ? "border-border bg-secondary/30 text-foreground/25 cursor-not-allowed opacity-50"
                        : mode === "partial"
                          ? "border-chart-3/30 bg-chart-3/[0.04]"
                          : "border-border bg-card hover:border-foreground/15"
                    }`}
                    style={{ padding: "10px 12px" }}
                    disabled={isPartialMeaningless}
                    title={isPartialMeaningless ? "Partial cancellation unavailable — only one line item with one unit remaining" : undefined}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        mode === "partial" && !isPartialMeaningless ? "border-chart-3 bg-chart-3" : "border-border"
                      }`}
                    >
                      {mode === "partial" && !isPartialMeaningless && <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--card)" }} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Package style={{ width: 12, height: 12, flexShrink: 0, color: mode === "partial" && !isPartialMeaningless ? "var(--chart-3)" : "currentColor" }} />
                        <span style={{ ...captionStyle, fontWeight: mode === "partial" && !isPartialMeaningless ? "var(--font-weight-semibold)" : "var(--font-weight-medium)", color: mode === "partial" && !isPartialMeaningless ? "var(--chart-3)" : "currentColor" }}>
                          Partial Cancellation
                        </span>
                      </div>
                      <div className="text-foreground/40 mt-0.5" style={{ fontSize: "var(--text-small)", lineHeight: 1.35 }}>
                        {isPartialMeaningless
                          ? "Not available — only one cancellable unit"
                          : "Select specific lines and quantities to cancel"
                        }
                      </div>
                    </div>
                  </button>
                </div>

                {/* Shipped info note — informational, not blocking */}
                {hasShippedItems && (
                  <div className="flex items-start gap-2 rounded-lg border border-chart-3/15 bg-chart-3/[0.03]" style={{ padding: "8px 12px", marginBottom: 12 }}>
                    <Truck className="text-chart-3 shrink-0 mt-0.5" style={{ width: 13, height: 13 }} />
                    <span className="text-foreground/50" style={{ fontSize: "var(--text-small)" }}>
                      Shipped units are protected and cannot be cancelled. Only the unshipped portion of each line is available for cancellation.
                    </span>
                  </div>
                )}

                {/* Partial meaningless note */}
                {isPartialMeaningless && !hasShippedItems && (
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/30" style={{ padding: "8px 12px", marginBottom: 12 }}>
                    <Info className="text-foreground/40 shrink-0 mt-0.5" style={{ width: 13, height: 13 }} />
                    <span className="text-foreground/50" style={{ fontSize: "var(--text-small)" }}>
                      Partial cancellation is unavailable — this order has only one cancellable line with a single remaining unit.
                    </span>
                  </div>
                )}

                {/* Line Items header with left-aligned checkbox */}
                <div className="flex items-center" style={{ marginBottom: 8, gap: "var(--space-inline-gap)" }}>
                  {mode === "partial" && (
                    <div
                      onClick={toggleAll}
                      className={`w-[18px] h-[18px] rounded flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
                        allSelected ? "bg-destructive border-destructive" : someSelected ? "bg-destructive/50 border-destructive/50" : "bg-card border-2 border-border hover:border-foreground/20"
                      }`}
                      style={{ borderRadius: "calc(var(--radius) - 6px)" }}
                    >
                      {allSelected && <Check className="w-3 h-3 text-destructive-foreground" strokeWidth={3} />}
                      {someSelected && !allSelected && <Minus className="w-3 h-3 text-destructive-foreground" strokeWidth={3} />}
                    </div>
                  )}
                  <span className="text-foreground" style={{ ...captionStyle, fontWeight: "var(--font-weight-semibold)" }}>Line Items</span>
                  <span className="text-foreground/35" style={smallStyle}>({cancellableLines.length} cancellable)</span>
                </div>
              </div>

              {/* Scrollable card list */}
              <div className="flex-1 overflow-y-auto scroll-hover" style={{ padding: "0 16px 16px 16px" }}>
                {cancellableLines.length === 0 && (
                  <div className="text-center text-foreground/35" style={{ ...captionNormal, padding: "48px 0" }}>
                    No lines eligible for cancellation — all fully shipped.
                  </div>
                )}

                <div className="space-y-2">
                  {cancellableLines.map(line => renderLineCard(line, mode === "partial"))}
                </div>

                {/* Non-cancellable shipped lines */}
                {nonCancellableLines.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <Truck className="text-foreground/25 shrink-0" style={{ width: 13, height: 13 }} />
                      <span className="text-foreground/35" style={captionStyle}>Shipped — cannot cancel ({nonCancellableLines.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {nonCancellableLines.map(line => (
                        <div key={line.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary" style={{ padding: "8px 16px", opacity: 0.55 }}>
                          <Truck className="text-foreground/35 shrink-0" style={{ width: 14, height: 14 }} />
                          <span className="text-foreground/50 truncate flex-1" style={captionNormal}>
                            {line.itemCode} — {line.shippedQty} of {line.orderedQty} shipped
                          </span>
                          <span className="text-foreground/30 shrink-0" style={{ fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" }}>
                            Not cancellable
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RMA-only lines */}
                {rmaLines.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <span className="text-foreground/35" style={captionStyle}>Fully Delivered — Use Returns ({rmaLines.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {rmaLines.map(line => (
                        <div key={line.id} className="flex items-center gap-3 rounded-lg border border-border/50 bg-secondary opacity-60" style={{ padding: "8px 16px" }}>
                          <ArrowRight className="text-chart-4 shrink-0" style={{ width: 14, height: 14 }} />
                          <span className="text-foreground/50 truncate flex-1" style={captionNormal}>
                            {line.itemCode} — fully delivered ({line.deliveredQty}/{line.orderedQty})
                          </span>
                          <button className="text-chart-4 hover:underline shrink-0" style={{ ...captionStyle, fontSize: "var(--text-small)", color: "var(--chart-4)", background: "none", border: "none", cursor: "pointer" }}>
                            Create RMA →
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ RIGHT — Configuration Panel ═══ */}
            <div className="flex flex-col" style={{ width: 320 }}>
              <div className="flex-1 overflow-y-auto scroll-hover" style={{ padding: 16 }}>

                {/* Reason Picker */}
                <div style={{ marginBottom: 16 }}>
                  <div className="flex items-center gap-1" style={{ marginBottom: 6 }}>
                    <span className="text-foreground" style={{ ...captionStyle, fontWeight: "var(--font-weight-semibold)" }}>Cancellation Reason</span>
                    <span className="text-destructive" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" }}>REQUIRED</span>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setReasonDropdownOpen(!reasonDropdownOpen)}
                      className={`w-full flex items-center justify-between border rounded-lg transition-colors bg-input-background ${
                        reason ? "border-border text-foreground" : "border-destructive/30 text-foreground/35"
                      }`}
                      style={{ ...captionNormal, padding: "8px 12px", fontWeight: reason ? "var(--font-weight-medium)" : "var(--font-weight-normal)" }}
                    >
                      <span className="truncate text-left">{reason ? reasonLabel : "Select a reason..."}</span>
                      <ChevronDown className={`text-foreground/35 shrink-0 transition-transform ${reasonDropdownOpen ? "rotate-180" : ""}`} style={{ width: 14, height: 14 }} />
                    </button>
                    {reasonDropdownOpen && (
                      <>
                        <div className="fixed inset-0" style={{ zIndex: "var(--z-overlay)" }} onClick={() => setReasonDropdownOpen(false)} />
                        <div className="absolute left-0 right-0 top-full mt-1 bg-popover border border-border rounded-lg py-1 overflow-y-auto" style={{ zIndex: "var(--z-popover)", boxShadow: "var(--elevation-2)", maxHeight: 320 }}>
                          {REASON_OPTIONS.map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => { setReason(opt.value); setReasonDropdownOpen(false); }}
                              className={`w-full text-left flex items-start gap-2.5 hover:bg-secondary transition-colors ${
                                reason === opt.value ? "text-primary bg-primary/5" : "text-foreground/80"
                              }`}
                              style={{ padding: "8px 12px" }}
                            >
                              <opt.icon className="text-foreground/35 shrink-0 mt-0.5" style={{ width: 14, height: 14 }} />
                              <div className="flex-1 min-w-0">
                                <div style={{ ...captionNormal, fontWeight: reason === opt.value ? "var(--font-weight-medium)" : "var(--font-weight-normal)" }}>
                                  {opt.label}
                                </div>
                                <div className="text-foreground/35 mt-0.5" style={{ fontSize: "var(--text-small)" }}>
                                  {opt.description}
                                </div>
                              </div>
                              {reason === opt.value && <Check className="text-primary shrink-0 mt-0.5" style={{ width: 12, height: 12 }} />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {reason === "Other" && (
                    <textarea
                      value={reasonText}
                      onChange={e => setReasonText(e.target.value)}
                      placeholder="Please describe the reason..."
                      className={`w-full border rounded-lg text-foreground placeholder-foreground/35 outline-none focus:ring-2 resize-none bg-input-background ${
                        reasonText.trim().length === 0 ? "border-destructive/50 focus:ring-destructive/30" : "border-border focus:ring-ring"
                      }`}
                      style={{ ...captionNormal, padding: "8px 12px", marginTop: 8 }}
                      rows={2}
                    />
                  )}
                  {reason === "Other" && reasonText.trim().length === 0 && (
                    <div className="text-destructive mt-1 flex items-center gap-1" style={{ fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" }}>
                      <span>Reason text is required when "Other" is selected</span>
                    </div>
                  )}
                </div>

                {/* Attachments (optional) */}
                <div style={{ marginBottom: 16 }}>
                  <div className="flex items-center gap-1" style={{ marginBottom: 6 }}>
                    <span className="text-foreground" style={{ ...captionStyle, fontWeight: "var(--font-weight-semibold)" }}>Attachments</span>
                    <span className="text-foreground/35" style={{ fontSize: "var(--text-small)" }}>optional</span>
                  </div>

                  {attachments.length > 0 && (
                    <div className="space-y-1.5" style={{ marginBottom: 8 }}>
                      {attachments.map(name => (
                        <div key={name} className="flex items-center gap-2 border border-border rounded-md bg-secondary/50" style={{ padding: "6px 10px" }}>
                          <Paperclip className="text-foreground/35 shrink-0" style={{ width: 12, height: 12 }} />
                          <span className="truncate flex-1 text-foreground/70" style={{ fontSize: "var(--text-small)" }}>{name}</span>
                          <button
                            onClick={() => handleRemoveAttachment(name)}
                            className="text-foreground/30 hover:text-destructive shrink-0 transition-colors"
                          >
                            <X style={{ width: 12, height: 12 }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={handleAddAttachment}
                    className="w-full flex items-center justify-center gap-2 border border-dashed border-border rounded-lg hover:bg-secondary/50 transition-colors text-foreground/40 hover:text-foreground/60"
                    style={{ ...captionNormal, padding: "10px 12px" }}
                  >
                    <Upload style={{ width: 14, height: 14 }} />
                    <span>Attach supporting file</span>
                  </button>
                </div>

                {/* Divider */}
                <div className="border-t border-border" style={{ marginBottom: 16 }} />

                {/* Impact Summary */}
                <div style={{ marginBottom: 16 }}>
                  <div className="text-foreground" style={{ ...microStyle, opacity: 0.5, marginBottom: 8, letterSpacing: "0.05em" }}>IMPACT SUMMARY</div>

                  {selectedCount === 0 ? (
                    <div className="text-foreground/35 text-center" style={{ ...captionNormal, padding: "24px 0" }}>
                      {mode === "partial" ? "Select line items to see impact" : "No cancellable lines"}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Lines count */}
                      <div className="flex items-center gap-2" style={captionNormal}>
                        <Ban className="text-foreground/35 shrink-0" style={{ width: 14, height: 14 }} />
                        <span className="text-foreground/70">
                          <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>{selectedCount}</span> line(s) to cancel
                        </span>
                      </div>

                      {/* Inventory release */}
                      {totalAllocToRelease > 0 && (
                        <div className="flex items-center gap-2" style={captionNormal}>
                          <Package className="text-primary shrink-0" style={{ width: 14, height: 14 }} />
                          <span className="text-foreground/70">
                            <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>{totalAllocToRelease}</span> allocated units released
                          </span>
                        </div>
                      )}

                      {/* Put-back */}
                      {totalPickedPutBack > 0 && (
                        <div className="flex items-center gap-2" style={captionNormal}>
                          <RotateCcw className="text-chart-3 shrink-0" style={{ width: 14, height: 14 }} />
                          <span className="text-foreground/70">
                            <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>{totalPickedPutBack}</span> picked — put-back needed
                          </span>
                        </div>
                      )}

                      {/* Intercept */}
                      {totalShippedIntercept > 0 && (
                        <div className="flex items-center gap-2" style={captionNormal}>
                          <Truck className="text-destructive shrink-0" style={{ width: 14, height: 14 }} />
                          <span className="text-foreground/70">
                            <span className="text-foreground" style={{ fontWeight: "var(--font-weight-semibold)" }}>{totalShippedIntercept}</span> shipped — intercept requested
                          </span>
                        </div>
                      )}

                      {totalAllocToRelease === 0 && totalPickedPutBack === 0 && totalShippedIntercept === 0 && (
                        <div className="flex items-center gap-2 text-foreground/35" style={captionNormal}>
                          <Info className="shrink-0" style={{ width: 14, height: 14 }} />
                          <span>No inventory impact</span>
                        </div>
                      )}

                      {/* Divider */}
                      <div className="border-t border-border" />

                      {/* Financial */}
                      <div className="flex items-center justify-between" style={captionNormal}>
                        <span className="text-foreground/50">Cancellation value</span>
                        <span className="text-destructive" style={{ fontWeight: "var(--font-weight-semibold)" }}>
                          -${totalCancelValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Warnings — modern subtle cards with left border accent */}
                {hasInterceptLines && (
                  <div className="flex items-start gap-3 rounded-lg border border-border overflow-hidden" style={{ marginBottom: 12 }}>
                    <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: "var(--destructive)" }} />
                    <div style={{ padding: "10px 12px 10px 0" }}>
                      <div className="flex items-center gap-1.5" style={{ marginBottom: 2 }}>
                        <Truck style={{ width: 12, height: 12, color: "var(--destructive)" }} />
                        <span className="text-foreground" style={{ ...captionStyle, fontWeight: "var(--font-weight-semibold)" }}>Carrier Intercept</span>
                      </div>
                      <div className="text-foreground/50" style={smallStyle}>
                        Shipped items will have intercept requested — delivery is not guaranteed to be stopped.
                      </div>
                    </div>
                  </div>
                )}

                {hasPutBackLines && (
                  <div className="flex items-start gap-3 rounded-lg border border-border overflow-hidden" style={{ marginBottom: 12 }}>
                    <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: "var(--chart-3)" }} />
                    <div style={{ padding: "10px 12px 10px 0" }}>
                      <div className="flex items-center gap-1.5" style={{ marginBottom: 2 }}>
                        <RotateCcw style={{ width: 12, height: 12, color: "var(--chart-3)" }} />
                        <span className="text-foreground" style={{ ...captionStyle, fontWeight: "var(--font-weight-semibold)" }}>Warehouse Put-Back</span>
                      </div>
                      <div className="text-foreground/50" style={smallStyle}>
                        Picked items require warehouse confirmation before inventory is released.
                      </div>
                    </div>
                  </div>
                )}

                {hasHaltPickLines && (
                  <div className="flex items-start gap-3 rounded-lg border border-border overflow-hidden" style={{ marginBottom: 12 }}>
                    <div className="w-1 self-stretch shrink-0" style={{ backgroundColor: "var(--chart-3)" }} />
                    <div style={{ padding: "10px 12px 10px 0" }}>
                      <div className="flex items-center gap-1.5" style={{ marginBottom: 2 }}>
                        <Warehouse style={{ width: 12, height: 12, color: "var(--chart-3)" }} />
                        <span className="text-foreground" style={{ ...captionStyle, fontWeight: "var(--font-weight-semibold)" }}>Halt Picking</span>
                      </div>
                      <div className="text-foreground/50" style={smallStyle}>
                        Cancellation request sent to warehouse to halt picking operations for affected items.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══ Footer ══ */}
          <div className="flex items-center justify-between shrink-0 border-t border-border bg-secondary" style={{ padding: "12px 20px" }}>
            <div className="text-foreground/50" style={captionNormal}>
              {selectedCount} of {cancellableLines.length} lines · ${totalCancelValue.toLocaleString()}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={guardedClose} icon={<X className="w-3.5 h-3.5" />}>
                Keep Order <KbdHint keys="Esc" />
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowConfirmDialog(true)}
                disabled={!canReview}
                icon={<Ban className="w-3.5 h-3.5" />}
              >
                {mode === "full"
                  ? "Cancel entire sales order"
                  : `Cancel ${selectedCount} line item${selectedCount !== 1 ? "s" : ""}`}
                <KbdHint keys="⌘↵" variant="light" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Confirmation Dialog ═══ */}
      <CancellationConfirmDialog
        open={showConfirmDialog}
        selectedCount={selectedCount}
        onConfirm={handleConfirm}
        onClose={() => setShowConfirmDialog(false)}
      />

      {/* ═══ Discard Dialog ═══ */}
      {discardDialog}
    </>
  );
}