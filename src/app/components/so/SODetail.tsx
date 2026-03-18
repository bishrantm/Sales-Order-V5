/* SODetail — Sales Order detail view */
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useSOStore } from "./store";
import { SOStatusBadge, SO_STATUS_CSS_VAR } from "./StatusBadge";
import { SOLineGrid } from "./SOLineGrid";
import { SOSidebar } from "./SOSidebar";
import { AllocateInventoryModal } from "./AllocateInventoryModal";
import { AddLineItemDialog } from "./AddLineItemDialog";
import { ShipmentsTab } from "./ShipmentsTab";
import { InvoicingTab } from "./InvoicingTab";

import { LinkedTransactionsTab } from "./LinkedTransactionsTab";
import { AttachmentsTab } from "./AttachmentsTab";
import { DealInformationTab } from "./DealInformationTab";
import { VersionHistoryTab } from "./VersionHistoryTab";
import { SourcingProductionTab } from "./SourcingProductionTab";
import { CancellationModal } from "./CancellationModal";
import { AdvancedConfiguratorModal } from "./AdvancedConfiguratorModal";
import { ConfirmSOModal } from "./ConfirmSOModal";
import { StageTransitionOverlay } from "./StageTransitionOverlay";
import { FulfillmentModal } from "./FulfillmentModal";
import { ExportSOModal } from "./ExportSOModal";
import { ArchiveModal } from "./ArchiveModal";
import { useToast } from "./ui/Toast";
import { StagePopover } from "./StagePopover";
import {
  Pencil, Clock, Archive, ArchiveRestore, ChevronLeft, FileText,
  GitBranch, ChevronDown, Flag, Check, Ban, Scissors,
  MessageSquare, AlertTriangle, Truck, Download, Copy, History
} from "lucide-react";
import { DateEditModal, type SODateType, type DateConfig } from "./ui/DateEditModal";
import type { SOLine, CancellationReason, SOPriority } from "./types";
import { ARCHIVABLE_STATES } from "./types";

const TABS = [
  { id: "lines", label: "Line Items", dotColor: "var(--primary)" },
  { id: "deal", label: "Deal Information", dotColor: "var(--chart-3)" },
  { id: "sourcing", label: "Sourcing & Production", dotColor: "var(--chart-3)" },
  { id: "shipping", label: "Shipping", dotColor: "var(--accent)" },
  { id: "invoicing", label: "Invoicing", dotColor: "var(--accent)" },
  { id: "attachments", label: "Attachments", dotColor: "var(--accent)" },
  { id: "linked", label: "Linked Transactions", dotColor: "var(--chart-4)" },
  { id: "comms", label: "Communications", dotColor: "var(--foreground)" },
  { id: "activity", label: "Activity", dotColor: "var(--destructive)" },
  { id: "versions", label: "Versions", dotColor: "var(--foreground)" },
];

export function SODetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const store = useSOStore();
  const { showToast } = useToast();
  const so = store.salesOrders.find(s => s.id === id);

  const [activeTab, setActiveTab] = useState("lines");
  const [allocationLine, setAllocationLine] = useState<SOLine | null>(null);
  const [showAddLine, setShowAddLine] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [cancelModalMode, setCancelModalMode] = useState<"full" | "partial" | null>(null);
  const [cancelPreselectedLineIds, setCancelPreselectedLineIds] = useState<string[]>([]);
  const [configureLine, setConfigureLine] = useState<SOLine | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showCTADropdown, setShowCTADropdown] = useState(false);
  const [showFulfillmentModal, setShowFulfillmentModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const ctaDropdownRef = useRef<HTMLDivElement>(null);

  /* Scroll state for header compression */
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const el = contentScrollRef.current;
    if (!el) return;
    const handler = () => setIsScrolled(el.scrollTop > 10);
    el.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => el.removeEventListener("scroll", handler);
  }, []);

  /* Date state for editable date cards in detail header */
  const [editingDateType, setEditingDateType] = useState<SODateType | null>(null);
  const [detailDateConfigs, setDetailDateConfigs] = useState({
    request: { dateType: "absolute" as const, absoluteValue: so?.createdDate || "03/16/2026", relativeValue: "", relativeUnit: "days" },
    estShip: { dateType: "relative" as const, absoluteValue: "", relativeValue: "20", relativeUnit: "days after order" },
    dueDelivery: { dateType: "relative" as const, absoluteValue: "", relativeValue: "30", relativeUnit: "days after order" },
  });

  useEffect(() => {
    if (!showCTADropdown) return;
    const handler = (e: MouseEvent) => {
      if (ctaDropdownRef.current && !ctaDropdownRef.current.contains(e.target as Node)) setShowCTADropdown(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCTADropdown]);

  if (!so) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-foreground" style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)" }}>Sales Order not found</h2>
          <button onClick={() => navigate("/sales-orders")} className="mt-3 text-primary" style={{ fontSize: "var(--text-caption)" }}>&larr; Back to list</button>
        </div>
      </div>
    );
  }

  const soShipments = store.shipments.filter(s => so.shipmentIds.includes(s.id));

  // ===== Action permissions =====
  const isDraft = so.status === "Draft";
  const isUnconfirmed = so.status === "Pending Review";
  const isShipped = so.status === "Shipped";
  const canAllocate = !["Cancelled", "Closed", "Shipped", "Archived", "Cancellation Requested"].includes(so.status);
  const canCancel = !["Cancelled", "Archived", "Cancellation Requested", "Shipped"].includes(so.status);
  const canClose = so.status === "Shipped" || so.status === "Partially Shipped";
  const canArchive = ARCHIVABLE_STATES.includes(so.status);
  const canUnarchive = so.status === "Archived";
  const isCancellationPending = so.status === "Cancellation Requested" || so.status === "Partially Cancelled";
  const isPostConfirmed = ["Cleared", "Partially Shipped", "Shipped"].includes(so.status);

  /* Cancellation mode availability for CTA dropdown */
  const hasAnyShippedLine = so.lines.some(l => !l.cancelled && l.shippedQty > 0);
  const cancellableLinesForCTA = so.lines.filter(l => !l.cancelled && l.shippedQty < l.orderedQty);
  const isPartialCancelMeaningless = cancellableLinesForCTA.length === 0 || (
    cancellableLinesForCTA.length === 1 &&
    (cancellableLinesForCTA[0].orderedQty - cancellableLinesForCTA[0].shippedQty - (cancellableLinesForCTA[0].cancelledQty || 0)) <= 1
  );
  const isFullCancelBlocked = hasAnyShippedLine;

  const handleMarkUnconfirmed = () => {
    store.markUnconfirmed(so.id);
  };

  const handleConfirm = () => {
    const result = store.confirmSO(so.id);
    if (result.valid) { setShowConfirmModal(false); }
    else result.errors.forEach(e => showToast({ type: "error", title: e }));
  };

  const handleCancelFull = (reason: CancellationReason, reasonText: string) => {
    store.cancelSO(so.id, reason, reasonText);
  };

  const handleCancelPartial = (lineIds: string[], cancelQtys: Record<string, number>, reason: CancellationReason, reasonText: string) => {
    store.cancelSOLines(so.id, lineIds, reason === "Other" && reasonText ? `${reason}: ${reasonText}` : reason, cancelQtys);
  };

  const handleClose = () => { store.closeSO(so.id); showToast({ type: "success", title: "Sales Order closed" }); };
  const handleArchive = () => { store.archiveSO(so.id); showToast({ type: "success", title: "Sales Order archived" }); };
  const handleUnarchive = () => { store.unarchiveSO(so.id); showToast({ type: "success", title: "Sales Order unarchived" }); };
  const handleCancelLines = (lineIds: string[]) => {
    setCancelPreselectedLineIds(lineIds);
    setCancelModalMode("partial");
  };

  // ===== Stepper =====
  const statusSteps = ["Draft", "Pending Review", "Cleared", "Partially Shipped", "Shipped"];
  const stepDisplayLabels = ["Draft", "Pending Review", "Cleared by Ops", "Partially Shipped", "Shipped"];
  const stepCssVars = ["var(--foreground)", "var(--chart-3)", "var(--primary)", "var(--chart-4)", "var(--accent)"];
  const currentStepIndex = (() => {
    const m: Record<string, number> = { Draft: 0, "Pending Review": 1, Cleared: 2, "Partially Shipped": 3, Shipped: 4, Closed: 5, Cancelled: -1, "Cancellation Requested": -1, "Partially Cancelled": -1, Archived: -2 };
    return m[so.status] ?? 0;
  })();

  const rightSideStatuses: { label: string; color: string; icon: "cancel" | "archive" | "close" }[] = [];
  if (so.status === "Cancellation Requested") rightSideStatuses.push({ label: "Cancellation Requested", color: "var(--destructive)", icon: "cancel" });
  if (so.status === "Partially Cancelled") rightSideStatuses.push({ label: "Partially Cancelled", color: "var(--chart-3)", icon: "cancel" });
  if (so.status === "Cancelled") rightSideStatuses.push({ label: "Cancelled", color: "var(--destructive)", icon: "cancel" });
  if (so.status === "Closed") rightSideStatuses.push({ label: "Closed", color: "var(--chart-4)", icon: "close" });
  if (so.status === "Archived") rightSideStatuses.push({ label: "Archived", color: "var(--destructive)", icon: "archive" });

  const isCancelledOrTerminal = currentStepIndex < 0 || currentStepIndex > 5;
  const effectiveStepIndex = currentStepIndex < 0 ? (() => {
    if (so.previousStatus) {
      const m: Record<string, number> = { Draft: 0, "Pending Review": 1, Cleared: 2, "Partially Shipped": 3, Shipped: 4, Closed: 5 };
      return m[so.previousStatus] ?? 0;
    }
    return 0;
  })() : currentStepIndex;

  const gradientStepIdx = Math.max(0, Math.min(5, Math.floor(effectiveStepIndex)));
  const gradientXPct = statusSteps.length > 1 ? Math.round((gradientStepIdx / (statusSteps.length - 1)) * 100) : 50;
  const statusCssVar = SO_STATUS_CSS_VAR[so.status] || "var(--foreground)";

  const soVersion = so.version ?? { number: 1, label: "Latest" as const, date: so.createdDate };
  const soVersions = so.versions ?? [soVersion];
  const soPriority = so.priority ?? "Standard";

  const confirmedStatuses = ["Cleared", "Partially Shipped", "Shipped", "Closed"];
  const isConfirmedOrBeyond = confirmedStatuses.includes(so.status);
  const displayVersionLabel = isConfirmedOrBeyond ? (soVersion.label === "Latest" ? "Last Approved" : soVersion.label) : "Latest";
  const displayVersionLabelColor = displayVersionLabel === "Latest" ? "bg-accent/10 text-accent" : displayVersionLabel === "Last Approved" ? "bg-primary/10 text-primary" : "bg-secondary text-foreground/50";

  const [showVersionDropdown, setShowVersionDropdown] = useState(false);
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<SOPriority>(soPriority);

  const priorityConfig: Record<SOPriority, { cssVar: string; textColor: string; bgStyle: string; borderClass: string }> = {
    Low: { cssVar: "var(--foreground)", textColor: "text-foreground/60", bgStyle: "bg-secondary", borderClass: "border-foreground/20" },
    Standard: { cssVar: "var(--primary)", textColor: "text-primary", bgStyle: "bg-primary/10", borderClass: "border-primary/20" },
    High: { cssVar: "var(--destructive)", textColor: "text-destructive", bgStyle: "bg-destructive/10", borderClass: "border-destructive/20" },
  };

  const sourcingCount = so.procurementOrders.length + so.backorders.length;
  const tabCounts: Record<string, number> = {
    lines: so.lines.length, linked: so.linkedTransactions.filter(t => !["Invoice", "Credit Memo", "Payment Receipt"].includes(t.type)).length,
    activity: so.activityLog.length, shipping: soShipments.length, attachments: so.attachments.length,
    sourcing: sourcingCount,
  };

  const statusMessage = getStatusMessage(so);

  /* ── Timeline date display helpers ── */
  const fmtNow = () => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
  };
  const getRequestDisplay = () => detailDateConfigs.request.absoluteValue || fmtNow();
  const getEstShipDisplay = () =>
    detailDateConfigs.estShip.dateType === "absolute"
      ? detailDateConfigs.estShip.absoluteValue || fmtNow()
      : `${detailDateConfigs.estShip.relativeValue} ${detailDateConfigs.estShip.relativeUnit}`;
  const getDueDeliveryDisplay = () =>
    detailDateConfigs.dueDelivery.dateType === "absolute"
      ? detailDateConfigs.dueDelivery.absoluteValue || fmtNow()
      : `${detailDateConfigs.dueDelivery.relativeValue} ${detailDateConfigs.dueDelivery.relativeUnit}`;

  /* Date configs are managed via the sidebar timeline card — see SOSidebar */

  /* ── Stepper step state for rendering ── */
  const resolvedStepIdx = isCancelledOrTerminal ? effectiveStepIndex : currentStepIndex;

  return (
    <>
      <div className="bg-background flex flex-col" style={{ maxWidth: "var(--container-detail)", margin: "0 auto", height: "100%" }}>

        {/* Cancellation Pending */}
        {isCancellationPending && (
          <div
            className="flex items-center justify-between rounded-md bg-destructive/5"
            style={{
              margin: "8px var(--space-page-x) 0",
              padding: "var(--space-inline-gap) var(--space-card-padding)",
            }}
          >
            <div className="flex items-center" style={{ gap: "var(--space-inline-gap)" }}>
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse shrink-0" />
              <span className="text-destructive" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>
                {so.status === "Cancellation Requested" ? "Cancellation Submitted for Review" : "Cancellation In Progress"}
              </span>
              <span className="text-destructive/50" style={{ fontSize: "var(--text-caption)" }}>
                — {so.cancellationReason ? `Reason: ${so.cancellationReason}${so.cancellationReasonText ? ` — ${so.cancellationReasonText}` : ""}` : "Pending warehouse/carrier confirmation"}
              </span>
            </div>
            {so.cancellationRequestedAt && (
              <span className="flex items-center text-destructive/40" style={{ gap: "4px", fontSize: "var(--text-caption)" }}>
                <Clock className="w-3 h-3" />{new Date(so.cancellationRequestedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        )}

        {/* Archived Banner */}
        {so.status === "Archived" && (
          <div
            className="flex items-center justify-between rounded-md bg-secondary border border-border"
            style={{
              margin: "8px var(--space-page-x) 0",
              padding: "var(--space-inline-gap) var(--space-card-padding)",
            }}
          >
            <div className="flex items-center" style={{ gap: "var(--space-inline-gap)" }}>
              <Archive className="w-3.5 h-3.5 text-foreground/40 shrink-0" />
              <span className="text-foreground/40" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                Archived (previously {so.previousStatus || "Closed"}).
              </span>
            </div>
            <button
              onClick={handleUnarchive}
              className="flex items-center text-primary border border-primary/15 rounded-md bg-card hover:bg-primary/5 transition-colors"
              style={{
                gap: "4px",
                padding: "4px var(--space-inline-gap)",
                fontSize: "var(--text-caption)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              <ArchiveRestore className="w-3 h-3" />Unarchive
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════���═══════════
            UNIFIED HEADER CARD — tabs inside, lifecycle stepper with bg color
           ═══════════════════════════════════════════════ */}
        {(() => {
          const isShippedHeader = so.status === "Shipped";
          const hdrBtnClass = `rounded-lg flex items-center justify-center shrink-0 transition-all duration-150 cursor-pointer ${
            isShippedHeader
              ? "border border-transparent bg-white hover:bg-white/90"
              : "border border-border bg-card hover:bg-secondary"
          }`;
          const hdrBtnSize = isScrolled ? "w-7 h-7" : "w-8 h-8";
          const hdrBtnIconClass = `transition-all duration-150 ${isShippedHeader ? "text-accent" : "text-muted-foreground"} ${isScrolled ? "w-3.5 h-3.5" : "w-4 h-4"}`;

          return (
            <div
              className="shrink-0 relative"
              style={{
                padding: `${isScrolled ? "4px" : "8px"} var(--space-page-x) 0`,
                transition: "padding 200ms ease",
                zIndex: 20,
              }}
            >
              <div
                className="relative transition-all duration-200"
                style={{
                  borderRadius: "var(--radius-xl)",
                  boxShadow: "var(--elevation-sm)",
                  ...(isShippedHeader
                    ? { backgroundColor: "var(--accent)" }
                    : { backgroundColor: "var(--card)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)" }
                  ),
                }}
              >
                {/* Soft radial gradient — warm glow at top-right, spares the tab bar area */}
                {!isShippedHeader && !isScrolled && (() => {
                  const glowColor = stepCssVars[Math.min(resolvedStepIdx, stepCssVars.length - 1)];
                  return (
                    <div
                      className="absolute pointer-events-none overflow-hidden"
                      style={{
                        inset: 0,
                        bottom: 36,
                        borderRadius: "inherit",
                      }}
                    >
                      <div
                        className="absolute"
                        style={{
                          inset: 0,
                          background: `radial-gradient(ellipse 90% 140% at ${gradientXPct}% 0%, ${glowColor} 0%, transparent 65%)`,
                          opacity: 0.09,
                        }}
                      />
                    </div>
                  );
                })()}
                <div className="relative" style={{ zIndex: 1 }}>
                  {/* ── Main header row ── */}
                  <div
                    className="flex items-center justify-between transition-all duration-200"
                    style={{ padding: `${isScrolled ? "6px" : "14px"} 16px ${isScrolled ? "6px" : "10px"}`, gap: 12 }}
                  >
                    {/* Left: back + SO info + badges */}
                    <div className={`flex items-center min-w-0 transition-all duration-200 ${isScrolled ? "gap-2" : "gap-2.5"}`}>
                      {/* Back button */}
                      <button onClick={() => navigate("/sales-orders")} className={`${hdrBtnClass} ${hdrBtnSize}`}>
                        <ChevronLeft className={hdrBtnIconClass} />
                      </button>

                      {/* SO icon + number + badges */}
                      <div className="min-w-0">
                        <div className={`flex items-center flex-wrap transition-all duration-200 ${isScrolled ? "gap-1.5" : "gap-2"}`}>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={isShippedHeader ? "text-white" : "text-foreground"}
                              style={{
                                fontSize: isScrolled ? "var(--text-caption)" : "var(--text-label)",
                                fontWeight: "var(--font-weight-semibold)",
                                lineHeight: isScrolled ? "16px" : "20px",
                                transition: "font-size 150ms, line-height 150ms",
                              }}
                            >
                              {so.soNumber}
                            </span>
                          </div>

                          {/* Version dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => { setShowVersionDropdown(!showVersionDropdown); setShowPriorityDropdown(false); }}
                              className={`flex items-center gap-1.5 rounded-md transition-colors whitespace-nowrap ${
                                isShippedHeader
                                  ? "border border-transparent bg-white hover:bg-white/90"
                                  : "border border-border bg-card hover:bg-secondary"
                              } ${isScrolled ? "px-1.5 py-px" : "px-2 py-[3px]"}`}
                            >
                              <GitBranch className={`w-3 h-3 shrink-0 ${isShippedHeader ? "text-accent" : "text-foreground/35"}`} />
                              <span className={isShippedHeader ? "text-accent" : "text-foreground"} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>V{soVersion.number}</span>
                              {!isScrolled && (
                                <>
                                  <span className={`px-1.5 py-[1px] rounded-full shrink-0 ${isShippedHeader ? "bg-accent/15 text-accent" : displayVersionLabelColor}`} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)", whiteSpace: "nowrap" }}>{displayVersionLabel}</span>
                                  <span className={isShippedHeader ? "text-accent/50" : "text-foreground/35"} style={{ fontSize: "var(--text-caption)" }}>{soVersion.date}</span>
                                </>
                              )}
                              <ChevronDown className={`w-3 h-3 shrink-0 ${isShippedHeader ? "text-accent/50" : "text-foreground/35"}`} />
                            </button>
                            {showVersionDropdown && (
                              <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg py-1" style={{ zIndex: "var(--z-dropdown)", boxShadow: "var(--elevation-2)", minWidth: 260 }}>
                                {soVersions.map(v => {
                                  const labelColor = v.label === "Latest" ? "bg-accent/10 text-accent" : v.label === "Last Approved" ? "bg-primary/10 text-primary" : "bg-secondary text-foreground/35";
                                  return (
                                    <button key={v.number} onClick={() => setShowVersionDropdown(false)} className={`w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary transition-colors ${v.number === soVersion.number ? "bg-secondary" : ""}`} style={{ fontSize: "var(--text-caption)" }}>
                                      <span className="text-foreground shrink-0" style={{ fontWeight: "var(--font-weight-semibold)", minWidth: 24 }}>V{v.number}</span>
                                      <span className="text-foreground/35 shrink-0" style={{ fontSize: "var(--text-caption)" }}>{v.date}</span>
                                      <span className={`px-1.5 py-[1px] rounded-full shrink-0 ml-auto ${labelColor}`} style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", whiteSpace: "nowrap" }}>{v.label}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Priority dropdown */}
                          <div className="relative">
                            <button
                              onClick={() => { setShowPriorityDropdown(!showPriorityDropdown); setShowVersionDropdown(false); }}
                              className={`flex items-center gap-1.5 rounded-md border transition-colors whitespace-nowrap ${
                                isShippedHeader
                                  ? "border-transparent bg-white hover:bg-white/90"
                                  : `${priorityConfig[selectedPriority].bgStyle} ${priorityConfig[selectedPriority].borderClass}`
                              } ${isScrolled ? "px-2 py-px" : "px-2.5 py-[3px]"}`}
                            >
                              <Flag className={`w-3 h-3 ${isShippedHeader ? "text-accent" : priorityConfig[selectedPriority].textColor}`} />
                              <span className={isShippedHeader ? "text-accent" : priorityConfig[selectedPriority].textColor} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>{selectedPriority}</span>
                              <ChevronDown className={`w-3 h-3 ${isShippedHeader ? "text-accent/50" : `opacity-60 ${priorityConfig[selectedPriority].textColor}`}`} />
                            </button>
                            {showPriorityDropdown && (
                              <div className="absolute top-full left-0 mt-1 w-[140px] bg-card border border-border rounded-lg shadow-elevation-sm py-1" style={{ zIndex: "var(--z-dropdown)" }}>
                                {(["Low", "Standard", "High"] as SOPriority[]).map(p => (
                                  <button key={p} onClick={() => { setSelectedPriority(p); setShowPriorityDropdown(false); store.updateSO(so.id, { priority: p }); }} className={`w-full flex items-center gap-2 px-3 py-1.5 hover:bg-secondary transition-colors ${p === selectedPriority ? "bg-secondary" : ""}`} style={{ fontSize: "var(--text-caption)" }}>
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: priorityConfig[p].cssVar }} />
                                    <span className="text-foreground" style={{ fontWeight: "var(--font-weight-medium)" }}>{p}</span>
                                    {p === selectedPriority && <Check className="w-3 h-3 text-primary ml-auto" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Status badge — hoverable with stage history popover */}
                          <StagePopover so={so} shippedHeader={isShippedHeader}>
                            {({ isHovered: popHovered, isOpen: popOpen }) => isShippedHeader ? (
                              <span
                                className="inline-flex items-center rounded-full bg-white/25 text-white hover:bg-white/35 transition-colors"
                                style={{ gap: "6px", padding: isScrolled ? "2px 8px" : "4px 12px", fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)", whiteSpace: "nowrap" }}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                                Shipped
                                <History
                                  className="transition-opacity duration-150"
                                  style={{ width: 11, height: 11, opacity: popHovered || popOpen ? 0.9 : 0.4 }}
                                />
                              </span>
                            ) : (
                              <span className="inline-flex items-center hover:ring-1 hover:ring-primary/20 rounded-full transition-all">
                                <SOStatusBadge status={so.status} trailingIcon={
                                  <History
                                    className="transition-opacity duration-150"
                                    style={{ width: 11, height: 11, opacity: popHovered || popOpen ? 0.7 : 0.25 }}
                                  />
                                } />
                              </span>
                            )}
                          </StagePopover>
                        </div>

                        {/* Description — hidden when scrolled */}
                        {!isScrolled && (
                          <div className="flex items-center" style={{ gap: "5px", marginTop: 6 }}>
                            <span className={isShippedHeader ? "text-white/60" : ""} style={{ fontSize: "var(--text-caption)", lineHeight: "16px", color: isShippedHeader ? undefined : "var(--muted-foreground)" }}>
                              {so.description}
                            </span>
                            <Pencil className={`shrink-0 cursor-pointer transition-colors ${isShippedHeader ? "w-2.5 h-2.5 text-white/30 hover:text-white/60" : "w-2.5 h-2.5 text-muted-foreground/40 hover:text-muted-foreground"}`} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: actions + CTA */}
                    <div className={`flex items-center shrink-0 transition-all duration-200 ${isScrolled ? "gap-1" : "gap-1.5"}`}>
                      {[Download, Copy].map((Icon, idx) => (
                        <button
                          key={idx}
                          onClick={idx === 0 ? () => setShowExportModal(true) : undefined}
                          className={`${hdrBtnClass} ${hdrBtnSize}`}
                        >
                          <Icon className={hdrBtnIconClass} />
                        </button>
                      ))}

                      {/* Archive icon */}
                      {!isShipped && so.status !== "Archived" && (
                        <button
                          onClick={() => setShowArchiveModal(true)}
                          className={`rounded-lg flex items-center justify-center transition-all duration-150 border border-destructive/25 text-destructive hover:bg-destructive/5 ${hdrBtnSize}`}
                          title="Archive Order"
                        >
                          <Archive className={`transition-all duration-200 ${isScrolled ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                        </button>
                      )}

                      {/* CTA: Draft → Submit for Review */}
                      {isDraft && (
                        <div ref={!isUnconfirmed && !isPostConfirmed ? ctaDropdownRef : undefined} className="relative flex items-center ml-1">
                          <button onClick={handleMarkUnconfirmed} className={`flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${canCancel ? "rounded-l-lg" : "rounded-lg"} ${isScrolled ? "h-7 pl-2.5 pr-2" : "h-8 pl-3 pr-2.5"}`} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>
                            <Check className={`${isScrolled ? "w-3 h-3" : "w-3.5 h-3.5"}`} />Submit for Review
                          </button>
                          {canCancel && (
                            <>
                              <div className={`w-px bg-primary-foreground/20 ${isScrolled ? "h-7" : "h-8"}`} />
                              <button onClick={() => setShowCTADropdown(!showCTADropdown)} className={`flex items-center px-1.5 bg-primary text-primary-foreground rounded-r-lg hover:bg-primary/90 transition-colors ${isScrolled ? "h-7" : "h-8"}`}><ChevronDown className="w-3 h-3" /></button>
                            </>
                          )}
                          {showCTADropdown && isDraft && (
                            <div className="absolute top-full right-0 mt-1 w-[220px] bg-card border border-border rounded-lg py-1" style={{ zIndex: "var(--z-modal)", boxShadow: "var(--elevation-2)" }}>
                              <button onClick={() => { setCancelModalMode("full"); setShowCTADropdown(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/5 transition-colors" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                                <Ban className="w-3 h-3" />Cancel Order
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTA: Pending Review → Clear by Ops */}
                      {isUnconfirmed && (
                        <div ref={isUnconfirmed ? ctaDropdownRef : undefined} className="relative flex items-center ml-1">
                          <button onClick={() => setShowConfirmModal(true)} className={`flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ${canCancel ? "rounded-l-lg" : "rounded-lg"} ${isScrolled ? "h-7 pl-2.5 pr-2" : "h-8 pl-3 pr-2.5"}`} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>
                            <Check className={`${isScrolled ? "w-3 h-3" : "w-3.5 h-3.5"}`} />Clear by Ops
                          </button>
                          {canCancel && (
                            <>
                              <div className={`w-px bg-primary-foreground/20 ${isScrolled ? "h-7" : "h-8"}`} />
                              <button onClick={() => setShowCTADropdown(!showCTADropdown)} className={`flex items-center px-1.5 bg-primary text-primary-foreground rounded-r-lg hover:bg-primary/90 transition-colors ${isScrolled ? "h-7" : "h-8"}`}><ChevronDown className="w-3 h-3" /></button>
                            </>
                          )}
                          {showCTADropdown && isUnconfirmed && (
                            <div className="absolute top-full right-0 mt-1 w-[220px] bg-card border border-border rounded-lg py-1" style={{ zIndex: "var(--z-modal)", boxShadow: "var(--elevation-2)" }}>
                              <button onClick={() => { setCancelModalMode("full"); setShowCTADropdown(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/5 transition-colors" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                                <Ban className="w-3 h-3" />Cancel Order
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTA: Post-Confirmed → Cancel */}
                      {isPostConfirmed && canCancel && !isShipped && (
                        <div ref={ctaDropdownRef} className="relative flex items-center ml-1">
                          <button onClick={() => setCancelModalMode(isFullCancelBlocked ? "partial" : "full")} className={`flex items-center gap-1.5 bg-card text-destructive border border-destructive/30 rounded-l-lg hover:bg-destructive/5 transition-colors ${isScrolled ? "h-7 pl-2.5 pr-2" : "h-8 pl-3 pr-2.5"}`} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                            <Ban className="w-3 h-3" />{isFullCancelBlocked ? "Cancel Lines" : "Cancel Sales Order"}
                          </button>
                          <div className={`w-px bg-destructive/20 ${isScrolled ? "h-7" : "h-8"}`} />
                          <button onClick={() => setShowCTADropdown(!showCTADropdown)} className={`flex items-center px-1.5 bg-card text-destructive border border-destructive/30 border-l-0 rounded-r-lg hover:bg-destructive/5 transition-colors ${isScrolled ? "h-7" : "h-8"}`}>
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          {showCTADropdown && (
                            <div className="absolute top-full right-0 mt-1 w-[240px] bg-card border border-border rounded-lg py-1" style={{ zIndex: "var(--z-modal)", boxShadow: "var(--elevation-2)" }}>
                              {!isFullCancelBlocked ? (
                                <button onClick={() => { setCancelModalMode("full"); setShowCTADropdown(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-destructive hover:bg-destructive/5 transition-colors" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                                  <Ban className="w-3 h-3" />Full Cancellation
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 text-foreground/25 cursor-not-allowed" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                                  <Ban className="w-3 h-3" />Full Cancellation
                                  <span className="ml-auto text-foreground/20" style={{ fontSize: "var(--text-micro)" }}>shipped</span>
                                </div>
                              )}
                              {!isPartialCancelMeaningless ? (
                                <button onClick={() => { setCancelModalMode("partial"); setShowCTADropdown(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-chart-3 hover:bg-chart-3/5 transition-colors" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                                  <Scissors className="w-3 h-3" />Partial Cancellation
                                </button>
                              ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 text-foreground/25 cursor-not-allowed" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                                  <Scissors className="w-3 h-3" />Partial Cancellation
                                  <span className="ml-auto text-foreground/20" style={{ fontSize: "var(--text-micro)" }}>n/a</span>
                                </div>
                              )}
                              {canClose && (
                                <button onClick={() => { handleClose(); setShowCTADropdown(false); }} className="w-full flex items-center gap-2 px-3 py-1.5 text-chart-4 hover:bg-chart-4/5 transition-colors" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                                  <Check className="w-3 h-3" />Close Order
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* CTA: Shipped → Archive */}
                      {isShipped && canArchive && (
                        <div className="flex items-center ml-1.5">
                          <button onClick={() => setShowArchiveModal(true)} className={`flex items-center gap-1.5 bg-white text-accent border border-transparent rounded-lg hover:bg-white/90 transition-colors ${isScrolled ? "h-7 px-2.5" : "h-8 px-3"}`} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>
                            <Archive className="w-3 h-3" />Archive
                          </button>
                        </div>
                      )}

                      {isPostConfirmed && !canCancel && !isShipped && canClose && (
                        <div className="flex items-center ml-1.5">
                          <button onClick={handleClose} className={`flex items-center gap-1.5 bg-chart-4 text-accent-foreground rounded-lg hover:bg-chart-4/90 transition-colors ${isScrolled ? "h-7 px-2.5" : "h-8 px-3"}`} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>
                            <Check className="w-3 h-3" />Close Order
                          </button>
                        </div>
                      )}

                      {canCancel && !isPostConfirmed && !isDraft && !isUnconfirmed && (
                        <button onClick={() => setCancelModalMode("full")} className={`flex items-center gap-1 ml-1 border border-destructive/30 text-destructive rounded-lg hover:bg-destructive/5 transition-colors ${isScrolled ? "h-7 px-2" : "h-8 px-2.5"}`} style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" }}>
                          <Ban className="w-3 h-3" />Cancel Order
                        </button>
                      )}
                    </div>
                  </div>

                  {/* ── Compact lifecycle stepper — hidden when scrolled ── */}
                  {!isScrolled && (
                    <div
                      className="relative overflow-hidden"
                      style={{
                        padding: "14px 16px 12px",
                      }}
                    >
                      {/* (gradient now covers the entire card — see parent div) */}
                      <div className="flex items-center relative">
                        {statusSteps.map((step, i) => {
                          const isCompleted = resolvedStepIdx > i;
                          const isCurrent = !isCancelledOrTerminal && Math.floor(resolvedStepIdx) === i && !isCompleted;
                          const isFrozenLast = isCancelledOrTerminal && Math.floor(effectiveStepIndex) === i && !isCompleted;
                          const stepColor = stepCssVars[i];
                          return (
                            <div key={step} className="flex items-center flex-1 last:flex-none">
                              <div className="flex items-center shrink-0" style={{ gap: 5 }}>
                                <div
                                  className="rounded-full flex items-center justify-center shrink-0 transition-colors duration-300"
                                  style={{
                                    width: 18, height: 18,
                                    fontSize: "var(--text-micro)",
                                    ...(isShippedHeader
                                      ? (isCompleted || isCurrent
                                        ? { backgroundColor: "var(--overlay-white-35)", color: "var(--accent-foreground)" }
                                        : { borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--overlay-white-25)", color: "var(--overlay-white-50)", backgroundColor: "transparent" })
                                      : isCompleted ? { backgroundColor: "var(--accent)", color: "var(--accent-foreground)" }
                                      : isCurrent ? { backgroundColor: stepColor, color: "var(--primary-foreground)" }
                                      : isFrozenLast ? { backgroundColor: stepColor, color: "var(--primary-foreground)", opacity: 0.5 }
                                      : { borderWidth: 1.5, borderStyle: "solid", borderColor: "var(--border)", color: "var(--muted-foreground)", backgroundColor: "var(--card)" }
                                    ),
                                  }}
                                >
                                  {isCompleted ? <Check className="w-2.5 h-2.5" strokeWidth={2.5} />
                                  : isCurrent ? <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "currentColor", opacity: 0.9 }} />
                                  : <span style={{ fontWeight: "var(--font-weight-semibold)" }}>{i + 1}</span>}
                                </div>
                                <span
                                  className="whitespace-nowrap"
                                  style={{
                                    fontSize: "var(--text-small)",
                                    fontWeight: (isCurrent || isFrozenLast) ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                                    color: isShippedHeader
                                      ? (isCompleted || isCurrent ? "var(--accent-foreground)" : "var(--overlay-white-50)")
                                      : isCompleted ? "var(--accent)" : isCurrent ? stepColor : isFrozenLast ? stepColor : "var(--muted-foreground)",
                                    opacity: isShippedHeader ? 1 : (isCompleted ? 0.85 : isCurrent ? 1 : isFrozenLast ? 0.5 : 0.6),
                                  }}
                                >
                                  {stepDisplayLabels[i]}
                                </span>
                              </div>
                              {i < statusSteps.length - 1 && (
                                <div className="flex-1 mx-2" style={{ height: 1.5 }}>
                                  <div className="h-full rounded-full" style={{ backgroundColor: resolvedStepIdx > i ? (isShippedHeader ? "var(--overlay-white-35)" : "var(--accent)") : (isShippedHeader ? "var(--overlay-white-15)" : "var(--border)") }} />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {rightSideStatuses.length > 0 && (
                          <>
                            <div className="flex-1 mx-2" style={{ height: 1.5 }}>
                              <div className="h-full rounded-full" style={{ backgroundColor: "var(--border)" }} />
                            </div>
                            {rightSideStatuses.map(rs => {
                              const RsIcon = rs.icon === "cancel" ? Ban : rs.icon === "archive" ? Archive : Check;
                              return (
                                <div key={rs.label} className="flex items-center gap-1 shrink-0">
                                  <div className="w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: rs.color, color: "var(--accent-foreground)" }}>
                                    <RsIcon className="w-2.5 h-2.5" strokeWidth={2.5} />
                                  </div>
                                  <span className="whitespace-nowrap" style={{ fontSize: "var(--text-small)", fontWeight: "var(--font-weight-semibold)", color: rs.color }}>{rs.label}</span>
                                </div>
                              );
                            })}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Tab bar — inside header card, separated from stepper ── */}
                  <div
                    className="flex items-center gap-0 overflow-x-auto hide-scrollbar"
                    style={{
                      padding: "0 16px",
                      borderTopWidth: 1,
                      borderTopStyle: "solid",
                      borderTopColor: isShippedHeader ? "var(--overlay-white-12)" : "var(--border)",
                      ...(isShippedHeader
                        ? {
                            backgroundColor: "var(--card)",
                            borderBottomLeftRadius: "var(--radius-xl)",
                            borderBottomRightRadius: "var(--radius-xl)",
                          }
                        : {}
                      ),
                    }}
                  >
                    {TABS.map(tab => {
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex items-center whitespace-nowrap border-b-[2px] transition-all duration-200 shrink-0 ${
                            isActive
                              ? "border-accent text-accent"
                              : "border-transparent text-foreground/40 hover:text-foreground/60 hover:border-border"
                          }`}
                          style={{
                            padding: isScrolled ? "6px 8px" : "8px 10px",
                            gap: "5px",
                            fontSize: "var(--text-caption)",
                            fontWeight: isActive ? "var(--font-weight-semibold)" : "var(--font-weight-normal)",
                            transition: "padding 200ms ease",
                          }}
                        >
                          {tab.label}
                          {tabCounts[tab.id] !== undefined && (
                            <span
                              className={`inline-flex items-center justify-center rounded-md ${
                                isActive
                                  ? (isShippedHeader ? "bg-accent/12 text-accent" : "bg-primary/15 text-primary")
                                  : "bg-foreground/[0.06] text-foreground/50"
                              }`}
                              style={{
                                fontSize: "var(--text-micro)",
                                fontWeight: "var(--font-weight-semibold)",
                                padding: "1px 5px",
                                minWidth: "18px",
                              }}
                            >
                              {tabCounts[tab.id]}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Status Context Card moved inside scrollable body */}

        {/* Date Edit Modal */}
        {editingDateType && (
          <DateEditModal
            type={editingDateType}
            isOpen={true}
            onClose={() => setEditingDateType(null)}
            onSave={(config) => {
              setDetailDateConfigs(prev => ({ ...prev, [editingDateType]: config }));
              setEditingDateType(null);
            }}
            initialConfig={detailDateConfigs[editingDateType]}
          />
        )}

        {/* Content + Right Sidebar — fixed sidebar, fluid main content, single scroll */}
        <div
          className="flex flex-1 min-h-0 overflow-y-auto hide-scrollbar"
          style={{ alignItems: "flex-start", padding: "0 var(--space-page-x)", gap: "var(--space-card-padding)", marginTop: 14 }}
          ref={contentScrollRef}
        >
          <div className="flex-1 min-w-0" style={{ paddingTop: 0, paddingBottom: "var(--space-page-x)" }}>
            {/* Status Context Card — scrolls with body content */}
            {statusMessage && (
              <div style={{ marginBottom: "var(--space-inline-gap)" }}>
                <div
                  className="bg-card overflow-hidden flex"
                  style={{ borderRadius: "var(--radius-xl)", borderWidth: 1, borderStyle: "solid", borderColor: "var(--border)", boxShadow: "var(--elevation-1)" }}
                >
                  <div className="w-1 shrink-0" style={{ backgroundColor: statusMessage.accentColor }} />
                  <div
                    className="flex items-center flex-1"
                    style={{ padding: "var(--space-inline-gap) var(--space-card-padding)", gap: "var(--space-inline-gap)" }}
                  >
                    <statusMessage.icon className="w-4 h-4 shrink-0" style={{ color: statusMessage.accentColor }} />
                    <div>
                      <div
                        className="text-foreground"
                        style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}
                      >
                        {statusMessage.title}
                      </div>
                      <div
                        className="text-foreground/40"
                        style={{ fontSize: "var(--text-caption)" }}
                      >
                        {statusMessage.subtitle}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "lines" && (
              <SOLineGrid so={so} onAddLine={() => setShowAddLine(true)} onAllocateLine={canAllocate ? setAllocationLine : undefined} onAllocateAll={canAllocate ? () => setShowAllocateModal(true) : undefined}
                onDeleteLine={(lineId) => { const ok = store.deleteSOLine(so.id, lineId); if (!ok) showToast({ type: "error", title: "Cannot delete line with shipped quantities" }); else showToast({ type: "success", title: "Line removed" }); }}
                onCancelLines={canCancel ? handleCancelLines : undefined} onConfigureLine={setConfigureLine}
                onUpdateLine={(lineId, updates) => { store.updateSOLine(so.id, lineId, updates); }} />
            )}
            {activeTab === "deal" && <DealInformationTab so={so} />}
            {activeTab === "linked" && <LinkedTransactionsTab transactions={so.linkedTransactions} />}
            {activeTab === "comms" && (
              <div className="bg-card rounded-xl border border-border" style={{ padding: "48px var(--space-card-padding)", boxShadow: "var(--elevation-1)" }}>
                <div className="flex flex-col items-center justify-center" style={{ gap: "var(--space-inline-gap)" }}>
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-foreground" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>Communications</div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-chart-3/10 text-chart-3" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>Coming Soon</span>
                  <div className="text-muted-foreground text-center max-w-[340px]" style={{ fontSize: "var(--text-caption)", lineHeight: 1.5 }}>
                    Track internal notes, customer emails, and external communications related to this sales order.
                  </div>
                </div>
              </div>
            )}
            {activeTab === "activity" && (
              <div className="bg-card rounded-xl border border-border" style={{ padding: "48px var(--space-card-padding)", boxShadow: "var(--elevation-1)" }}>
                <div className="flex flex-col items-center justify-center" style={{ gap: "var(--space-inline-gap)" }}>
                  <div className="w-11 h-11 rounded-lg bg-chart-4/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-chart-4" />
                  </div>
                  <div className="text-foreground" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>Activity</div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-chart-3/10 text-chart-3" style={{ fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" }}>Coming Soon</span>
                  <div className="text-muted-foreground text-center max-w-[340px]" style={{ fontSize: "var(--text-caption)", lineHeight: 1.5 }}>
                    View a detailed log of all changes, updates, and actions taken on this sales order.
                  </div>
                </div>
              </div>
            )}
            {activeTab === "shipping" && <ShipmentsTab shipments={soShipments} soId={so.id} so={so} />}
            {activeTab === "invoicing" && <InvoicingTab so={so} />}
            {activeTab === "attachments" && <AttachmentsTab attachments={so.attachments} lines={so.lines} />}
            {activeTab === "versions" && <VersionHistoryTab so={so} />}
            {activeTab === "sourcing" && <SourcingProductionTab so={so} />}
          </div>
          <div className="shrink-0 sticky top-0" style={{ width: 300, paddingBottom: "var(--space-page-x)" }}>
            <SOSidebar so={so} onOpenInvoicing={() => setActiveTab("invoicing")} />
          </div>
        </div>
      </div>

      {/* Modals */}
      {allocationLine && <AllocateInventoryModal so={so} onClose={() => setAllocationLine(null)} initialLineId={allocationLine.id} singleLineMode />}
      {showAddLine && <AddLineItemDialog soId={so.id} onClose={() => setShowAddLine(false)} />}
      {showAllocateModal && <AllocateInventoryModal so={so} onClose={() => setShowAllocateModal(false)} />}
      {cancelModalMode && <CancellationModal so={so} mode={cancelModalMode} preselectedLineIds={cancelPreselectedLineIds} onConfirmFull={handleCancelFull} onConfirmPartial={handleCancelPartial} onClose={() => { setCancelModalMode(null); setCancelPreselectedLineIds([]); }} />}
      {configureLine && (
        <AdvancedConfiguratorModal line={configureLine} inventory={store.inventory} onClose={() => setConfigureLine(null)}
          readOnly={configureLine.cancelled}
          onSave={({ orderedQty, unitPrice }) => { store.updateSOLine(so.id, configureLine.id, { orderedQty, unitPrice }); showToast({ type: "success", title: `${configureLine.itemCode} updated` }); setConfigureLine(null); }}
          onDelete={() => { const ok = store.deleteSOLine(so.id, configureLine.id); if (ok) { showToast({ type: "success", title: `${configureLine.itemCode} removed` }); setConfigureLine(null); } else showToast({ type: "error", title: "Cannot delete line with shipped quantities" }); }} />
      )}
      {showConfirmModal && <ConfirmSOModal so={so} onConfirm={() => handleConfirm()} onClose={() => setShowConfirmModal(false)} />}
      {showFulfillmentModal && <FulfillmentModal
        open={showFulfillmentModal}
        so={so}
        onClose={() => setShowFulfillmentModal(false)}
        onConfirm={(deliveryQtys, proofFiles, invoiceNote) => {
          store.deliverSO(so.id, deliveryQtys);
          setShowFulfillmentModal(false);
          if (deliveryQtys) {
            const count = Object.values(deliveryQtys).reduce((s, v) => s + v, 0);
            showToast({ type: "success", title: `${count} unit(s) confirmed delivered — partial fulfillment` });
          } else {
            showToast({ type: "success", title: "All shipments confirmed delivered — order complete" });
          }
          if (proofFiles && proofFiles.length > 0) {
            showToast({ type: "info", title: `${proofFiles.length} proof of delivery file(s) attached` });
          }
          if (invoiceNote) {
            showToast({ type: "info", title: "Payment invoice generated" });
          }
        }}
      />}
      {showExportModal && <ExportSOModal
        open={showExportModal}
        so={so}
        onClose={() => setShowExportModal(false)}
      />}
      {showArchiveModal && <ArchiveModal
        so={so}
        onClose={() => setShowArchiveModal(false)}
        onConfirm={() => { handleArchive(); setShowArchiveModal(false); }}
      />}

      {/* Stage transition animation overlay */}
      <StageTransitionOverlay status={so.status} />
    </>
  );
}

/* ── Status message config ── */
function getStatusMessage(so: { status: string; cancellationReason?: string; cancellationReasonText?: string; previousStatus?: string; version?: { number: number } }) {
  type IconComponent = typeof Pencil;
  const map: Record<string, { icon: IconComponent; title: string; subtitle: string; accentColor: string } | null> = {
    Draft: { icon: Pencil, title: `Editing Version ${so.version?.number ?? 1} draft`, subtitle: `Send when ready to finalize as V${so.version?.number ?? 1}`, accentColor: "var(--primary)" },
    "Pending Review": { icon: AlertTriangle, title: "Pending review", subtitle: "Sales Order submitted — awaiting clearance.", accentColor: "var(--chart-3)" },
    Cleared: { icon: Check, title: "Order cleared by Ops", subtitle: "Ready for picking & shipping.", accentColor: "var(--primary)" },
    Shipped: { icon: Truck, title: "Order shipped", subtitle: "All units shipped — order complete.", accentColor: "var(--accent)" },
    "Partially Shipped": { icon: Truck, title: "Partially shipped", subtitle: "Some items shipped — remaining pending.", accentColor: "var(--chart-4)" },
    Closed: { icon: Check, title: "Order closed", subtitle: "Books settled. Archive when no longer needed.", accentColor: "var(--accent)" },
    Cancelled: { icon: Ban, title: "Order marked as cancelled", subtitle: so.cancellationReason ? `Reason: ${so.cancellationReason}${so.cancellationReasonText ? ` — ${so.cancellationReasonText}` : ""}` : "Already-shipped units remain shipped. Archive to finalize.", accentColor: "var(--destructive)" },
    "Cancellation Requested": { icon: Clock, title: "Cancellation submitted for review", subtitle: "Pending warehouse/carrier confirmation before finalizing.", accentColor: "var(--destructive)" },
    "Partially Cancelled": { icon: Ban, title: "Line items marked as cancelled", subtitle: "Cancelled lines are frozen. Remaining active lines continue processing.", accentColor: "var(--chart-3)" },
    Archived: { icon: Archive, title: `Archived (previously ${so.previousStatus || "Closed"})`, subtitle: "Hidden from default listing.", accentColor: "var(--foreground)" },
  };
  return map[so.status] || null;
}

export default SODetail;