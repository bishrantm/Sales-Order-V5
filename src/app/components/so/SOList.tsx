import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { useSOStore } from "./store";
import { SOStatusBadge } from "./StatusBadge";
import { HighlightText } from "./SearchHighlight";
import { InsightsPanel } from "./InsightsPanel";
import { SOColumnConfigurator, type ColumnDef } from "./SOColumnConfigurator";
import { SOKanbanBoard } from "./SOKanbanBoard";
import type { SOStatus } from "./types";
import { ARCHIVABLE_STATES } from "./types";
import {
  FileText, Plus, Search, Clock, ChevronDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, SlidersHorizontal, Columns3, Settings2,
  Minimize2, Archive, ArchiveRestore,
  BarChart3, MoreHorizontal, Copy, FileDown, Eye, Ban, Printer,
  User, LayoutGrid, Maximize2, ChevronUp, ArrowUpRight, CheckCircle, X,
  Send, Lock,
} from "lucide-react";
import { CreateSOModal, type SOCreationPayload } from "./CreateSOModal";
import { ConfirmSOModal } from "./ConfirmSOModal";
import { BulkConfirmSOModal } from "./BulkConfirmSOModal";
import { CancellationModal } from "./CancellationModal";
import { BulkSubmitForReviewModal, BulkCloseOrdersModal, BulkCancellationModal } from "./BulkActionModals";
import { useToast } from "./ui/Toast";
import { Button } from "./ui/Button";
import type { SalesOrder } from "./types";

/* ═══════════════════════════════════════════════════════
   Status filter pills — Archived is separated
   ═══════════════════════════════════════════════════════ */
const MAIN_STATUS_FILTERS: ("All" | SOStatus)[] = [
  "All",
  "Draft",
  "Pending Review",
  "Cleared",
  "Partially Shipped",
  "Shipped",
  "Cancelled",
];

const STATUS_FILTER_LABELS: Record<string, string> = {
  "All": "Show All",
  "Draft": "Draft",
  "Pending Review": "Pending Review",
  "Cleared": "Cleared by Ops",
  "Partially Shipped": "Partially Shipped",
  "Shipped": "Shipped",
  "Cancelled": "Cancelled",
  "Archived": "Archived",
};

const STATUS_FILTER_MAP: Record<string, SOStatus[]> = {
  "Cancelled": ["Cancelled", "Cancellation Requested", "Partially Cancelled"],
};

/* ═══ Avatar colours ═══ */
const AVATAR_COLORS = [
  { bgClass: "bg-primary/15", textClass: "text-primary" },
  { bgClass: "bg-destructive/15", textClass: "text-destructive" },
  { bgClass: "bg-accent/15", textClass: "text-accent" },
  { bgClass: "bg-chart-3/15", textClass: "text-chart-3" },
  { bgClass: "bg-chart-4/15", textClass: "text-chart-4" },
  { bgClass: "bg-chart-3/15", textClass: "text-chart-3" },
  { bgClass: "bg-chart-4/15", textClass: "text-chart-4" },
  { bgClass: "bg-destructive/15", textClass: "text-destructive" },
];

const POC_NAMES = [
  "Meredith", "Toby", "Robert", "Ryan", "Kevin", "Pam",
  "Holly", "Creed", "Meredith", "Ryan", "Kevin", "Robert",
  "Holly", "Toby", "Pam", "Meredith",
];
const POC_EXTRA = [0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];

const CREATED_BY = [
  "Emily Chen", "Adrian User", "System Import", "Marcus Taylor",
  "Adrian User", "David Park", "Emily Chen", "Emily Chen",
  "System Import", "Marcus Taylor", "James Rodriguez", "Emily Chen",
];

/* Version badge: gray → progressively denser blue based on version number (Tailwind classes only) */
function getVersionClasses(vNum: number): string {
  if (vNum <= 1) return "bg-secondary text-foreground border-border";
  if (vNum === 2) return "bg-primary/[0.06] text-primary border-primary/15";
  if (vNum === 3) return "bg-primary/10 text-primary border-primary/[0.22]";
  if (vNum === 4) return "bg-primary/[0.16] text-primary border-primary/30";
  // v5+: densest blue
  return "bg-primary/[0.22] text-primary border-primary/[0.38]";
}

function getAvatarColor(index: number) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

type ViewMode = "Comfort" | "Condensed" | "Kanban";

/* ═══ Default column definitions ═══ */
const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "checkbox", label: "Checkbox", visible: true, locked: true },
  { key: "so", label: "Sales Order #", visible: true, locked: true },
  { key: "quote", label: "Quote #", visible: true },
  { key: "customer", label: "Customer Name", visible: true },
  { key: "status", label: "Order Status", visible: true },
  { key: "poc", label: "POC", visible: true },
  { key: "salesrep", label: "Sales Rep", visible: true },
  { key: "value", label: "Order Value", visible: true },
  { key: "orderdate", label: "Order Date", visible: true },
  { key: "shipby", label: "Ship By", visible: true },
  { key: "delivery", label: "Delivery Date", visible: true },
  { key: "createdon", label: "Created On", visible: true },
  { key: "createdby", label: "Created By", visible: true },
  { key: "lastupdated", label: "Last Updated", visible: true },
  { key: "confirmation", label: "Confirmation Date", visible: true },
  { key: "priority", label: "Priority", visible: true },
  { key: "warehouse", label: "Warehouse", visible: true },
  { key: "currency", label: "Currency", visible: false },
  { key: "linecount", label: "No. of Items", visible: true },
  { key: "actions", label: "Actions", visible: true, locked: true },
];

/* ═══════════════════════════════════════════════════════
   SOList Component
   ═══════════════════════════════════════════════════════ */
export function SOList() {
  const { salesOrders, createSO, unarchiveSO, archiveSO, cancelSO, confirmSO, markUnconfirmed, closeSO, cancelSOLines } = useSOStore();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [statusFilter, setStatusFilter] = useState<"All" | SOStatus | "Archived">("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>("Comfort");
  const [viewModeOpen, setViewModeOpen] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [meMode, setMeMode] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [columns, setColumns] = useState<ColumnDef[]>(DEFAULT_COLUMNS);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  /* Confirm / Approve modals */
  const [confirmSingleSO, setConfirmSingleSO] = useState<SalesOrder | null>(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  /* Cancel modal */
  const [cancelTargetSO, setCancelTargetSO] = useState<SalesOrder | null>(null);
  const [cancelModalMode, setCancelModalMode] = useState<"full" | "partial">("full");
  /* Bulk action modals */
  const [showBulkSubmitReview, setShowBulkSubmitReview] = useState(false);
  const [showBulkClose, setShowBulkClose] = useState(false);
  const [showBulkCancel, setShowBulkCancel] = useState(false);
  const contentCardRef = useRef<HTMLDivElement>(null);
  const viewModeRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement>(null);
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  /** Index (within paginated array) of the bottom-most selected row — drives overlay Y position */
  const [lastSelectedIdx, setLastSelectedIdx] = useState<number>(-1);
  const [bulkBarTop, setBulkBarTop] = useState<number>(4);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (viewModeRef.current && !viewModeRef.current.contains(e.target as Node)) setViewModeOpen(false);
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) setOpenActionId(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Compute bulk action bar Y position from last selected row ── */
  useEffect(() => {
    const computePos = () => {
      const sc = scrollContainerRef.current;
      const wrapper = tableWrapperRef.current;
      if (!sc || !wrapper || lastSelectedIdx < 0) return;
      const rows = sc.querySelectorAll("tbody tr");
      const row = rows[lastSelectedIdx] as HTMLElement | undefined;
      if (!row) return;
      const wrapperRect = wrapper.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      // center the bar vertically on the row, clamped within the wrapper
      const barHeight = 40; // approximate bar height
      let top = rowRect.top - wrapperRect.top + (rowRect.height - barHeight) / 2;
      top = Math.max(4, Math.min(top, wrapper.clientHeight - barHeight - 4));
      setBulkBarTop(top);
    };
    computePos();
    const sc = scrollContainerRef.current;
    if (sc) sc.addEventListener("scroll", computePos, { passive: true });
    return () => { if (sc) sc.removeEventListener("scroll", computePos); };
  }, [lastSelectedIdx, selectedIds]);

  /* Sync fullscreen state on exit (Esc key) */
  useEffect(() => {
    const handler = () => { setIsFullscreen(!!document.fullscreenElement); };
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  /* ── Visible columns (in order, excluding locked bookends) ── */
  const visibleDataColumns = useMemo(
    () => columns.filter(c => !c.locked && c.visible),
    [columns]
  );

  /* ── Row actions ── */
  const handleDuplicate = (soId: string) => {
    const original = salesOrders.find(s => s.id === soId);
    if (!original) return;
    const dup = createSO({ customer: original.customer, description: `Copy of ${original.soNumber}` });
    showToast({ type: "success", title: `Duplicated ${original.soNumber} → ${dup.soNumber}` });
    setOpenActionId(null);
  };
  const handleArchiveRow = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return;
    archiveSO(soId);
    showToast({ type: "success", title: `${so.soNumber} archived` });
    setOpenActionId(null);
  };
  const handleViewPDF = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    showToast({ type: "success", title: `Generating PDF for ${so?.soNumber ?? soId}…` });
    setOpenActionId(null);
  };
  const handleExportCSV = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    showToast({ type: "success", title: `Exporting CSV for ${so?.soNumber ?? soId}…` });
    setOpenActionId(null);
  };
  const handleCancelRow = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return;
    setCancelTargetSO(so);
    setCancelModalMode("full");
    setOpenActionId(null);
  };
  const handleSubmitForReview = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return;
    markUnconfirmed(soId);
    showToast({ type: "success", title: `${so.soNumber} submitted for review` });
    setOpenActionId(null);
  };
  const handleCloseRow = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return;
    closeSO(soId);
    showToast({ type: "success", title: `${so.soNumber} closed` });
    setOpenActionId(null);
  };
  const handleUnarchiveRow = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return;
    unarchiveSO(soId);
    showToast({ type: "success", title: `${so.soNumber} unarchived` });
    setOpenActionId(null);
  };
  const handleCancelFull = (reason: import("./types").CancellationReason, reasonText: string) => {
    if (!cancelTargetSO) return;
    cancelSO(cancelTargetSO.id, reason, reasonText);
    showToast({ type: "info", title: "Order marked as cancelled", message: `${reason === "Other" && reasonText ? reasonText : reason} — use Unarchive to reverse this action.` });
    setCancelTargetSO(null);
  };
  const handleCancelPartial = (lineIds: string[], cancelQtys: Record<string, number>, reason: import("./types").CancellationReason, reasonText: string) => {
    if (!cancelTargetSO) return;
    cancelSOLines(cancelTargetSO.id, lineIds, reason === "Other" && reasonText ? `${reason}: ${reasonText}` : reason, cancelQtys);
    showToast({ type: "info", title: `${lineIds.length} line item${lineIds.length !== 1 ? "s" : ""} marked as cancelled`, message: "Remaining active lines continue processing." });
    setCancelTargetSO(null);
  };

  /* ── Bulk action helpers ── */
  const selectedSOs = useMemo(
    () => salesOrders.filter(so => selectedIds.has(so.id)),
    [salesOrders, selectedIds],
  );

  const bulkApprovableCount = useMemo(
    () => selectedSOs.filter(so => so.status === "Pending Review" || so.status === "Draft").length,
    [selectedSOs],
  );

  const bulkArchivableCount = useMemo(
    () => selectedSOs.filter(so => ARCHIVABLE_STATES.includes(so.status)).length,
    [selectedSOs],
  );

  const bulkCancellableCount = useMemo(
    () => selectedSOs.filter(so => !["Cancelled", "Archived", "Cancellation Requested"].includes(so.status)).length,
    [selectedSOs],
  );

  const bulkSubmitCount = useMemo(
    () => selectedSOs.filter(so => so.status === "Draft").length,
    [selectedSOs],
  );

  const bulkCloseCount = useMemo(
    () => selectedSOs.filter(so => so.status === "Shipped" || so.status === "Partially Shipped").length,
    [selectedSOs],
  );

  const handleBulkDuplicate = () => {
    let duped = 0;
    selectedSOs.forEach(so => {
      createSO({ customer: so.customer, description: `Copy of ${so.soNumber}` });
      duped++;
    });
    showToast({ type: "success", title: `Duplicated ${duped} order${duped > 1 ? "s" : ""}` });
    setSelectedIds(new Set());
  };

  const handleBulkApprove = () => {
    if (bulkApprovableCount === 1) {
      const target = selectedSOs.find(so => so.status === "Pending Review" || so.status === "Draft");
      if (target) setConfirmSingleSO(target);
    } else {
      setShowBulkConfirm(true);
    }
  };

  const handleBulkConfirmDone = (soIds: string[]) => {
    let approved = 0;
    let errors = 0;
    soIds.forEach(id => {
      const result = confirmSO(id);
      if (result.valid) approved++;
      else errors++;
    });
    if (approved > 0) showToast({ type: "success", title: `Cleared ${approved} order${approved > 1 ? "s" : ""} — ready for shipping` });
    if (errors > 0) showToast({ type: "info", title: `${errors} order${errors > 1 ? "s" : ""} could not be cleared (validation failed)` });
    setSelectedIds(new Set());
    setShowBulkConfirm(false);
    setConfirmSingleSO(null);
  };

  const handleSingleConfirmDone = () => {
    if (!confirmSingleSO) return;
    const result = confirmSO(confirmSingleSO.id);
    if (result.valid) showToast({ type: "success", title: "Sales Order cleared — ready for shipping" });
    else result.errors.forEach(e => showToast({ type: "error", title: e }));
    setConfirmSingleSO(null);
    setSelectedIds(new Set());
  };

  /* Row-level approve from 3-dot menu */
  const handleApproveRow = (soId: string) => {
    const so = salesOrders.find(s => s.id === soId);
    if (!so) return;
    setConfirmSingleSO(so);
    setOpenActionId(null);
  };

  const handleBulkArchive = () => {
    let archived = 0;
    selectedSOs
      .filter(so => ARCHIVABLE_STATES.includes(so.status))
      .forEach(so => {
        archiveSO(so.id);
        archived++;
      });
    showToast({ type: "success", title: `Archived ${archived} order${archived > 1 ? "s" : ""}` });
    setSelectedIds(new Set());
  };

  const handleBulkCancel = () => { setShowBulkCancel(true); };
  const handleBulkSubmitForReview = () => { setShowBulkSubmitReview(true); };
  const handleBulkClose = () => { setShowBulkClose(true); };

  /* ── Bulk modal confirm callbacks ── */
  const handleBulkSubmitConfirmed = (soIds: string[]) => {
    let submitted = 0;
    soIds.forEach(id => { markUnconfirmed(id); submitted++; });
    showToast({ type: "success", title: `Submitted ${submitted} order${submitted > 1 ? "s" : ""} for review` });
    setSelectedIds(new Set());
    setShowBulkSubmitReview(false);
  };

  const handleBulkCloseConfirmed = (soIds: string[]) => {
    let closed = 0;
    soIds.forEach(id => { closeSO(id); closed++; });
    showToast({ type: "success", title: `Closed ${closed} order${closed > 1 ? "s" : ""}` });
    setSelectedIds(new Set());
    setShowBulkClose(false);
  };

  const handleBulkCancelConfirmed = (soIds: string[], reason: import("./types").CancellationReason, reasonText: string) => {
    let cancelled = 0;
    soIds.forEach(id => {
      cancelSO(id, reason, reasonText);
      cancelled++;
    });
    showToast({ type: "info", title: `Cancellation requested for ${cancelled} order${cancelled > 1 ? "s" : ""}` });
    setSelectedIds(new Set());
    setShowBulkCancel(false);
  };

  const handleBulkExportCSV = () => {
    showToast({ type: "success", title: `Exporting CSV for ${selectedIds.size} order${selectedIds.size > 1 ? "s" : ""}…` });
  };

  const handleBulkPrint = () => {
    showToast({ type: "success", title: `Generating print view for ${selectedIds.size} order${selectedIds.size > 1 ? "s" : ""}…` });
  };

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let list = salesOrders;
    if (statusFilter === "All") list = list.filter(so => so.status !== "Archived");
    else if (statusFilter === "Archived") list = list.filter(so => so.status === "Archived");
    else {
      const mapped = STATUS_FILTER_MAP[statusFilter];
      if (mapped) list = list.filter(so => mapped.includes(so.status) || so.status === statusFilter);
      else list = list.filter(so => so.status === statusFilter);
    }
    if (meMode) list = list.filter(so => so.salesRep === "Adrian User");
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(so =>
        so.soNumber.toLowerCase().includes(q) ||
        so.customer.toLowerCase().includes(q) ||
        so.salesRep.toLowerCase().includes(q) ||
        so.sourceQuoteRef.toLowerCase().includes(q)
      );
    }
    return list;
  }, [salesOrders, statusFilter, search, meMode]);

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  /* ── Analytics ── */
  const activeSOs = useMemo(() => salesOrders.filter(s => s.status !== "Archived"), [salesOrders]);
  const stats = useMemo(() => {
    const totalRevenue = activeSOs.reduce((s, so) => s + so.total, 0);
    const totalOrders = activeSOs.length;
    const activeOrders = activeSOs.filter(s => !["Cancelled", "Closed", "Shipped"].includes(s.status)).length;
    return { totalRevenue, totalOrders, activeOrders };
  }, [activeSOs]);

  const statusCount = (s: "All" | SOStatus | "Archived") => {
    if (s === "All") return salesOrders.filter(so => so.status !== "Archived").length;
    if (s === "Archived") return salesOrders.filter(so => so.status === "Archived").length;
    const mapped = STATUS_FILTER_MAP[s];
    if (mapped) return salesOrders.filter(so => mapped.includes(so.status) || so.status === s).length;
    return salesOrders.filter(so => so.status === s).length;
  };

  const handleBulkUnarchive = () => { selectedIds.forEach(id => unarchiveSO(id)); setSelectedIds(new Set()); };
  const toggleSelectSO = (id: string, rowIdx?: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else { next.add(id); if (rowIdx !== undefined) setLastSelectedIdx(rowIdx); }
      // If deselecting and nothing left, reset index
      if (next.size === 0) setLastSelectedIdx(-1);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === paginated.length) { setSelectedIds(new Set()); setLastSelectedIdx(-1); }
    else { setSelectedIds(new Set(paginated.map(so => so.id))); setLastSelectedIdx(0); }
  };

  const deriveDates = (so: typeof salesOrders[0], idx: number) => {
    const base = so.orderDate.split("/").map(Number);
    const year = base[0], month = base[1], day = base[2];
    const fmt = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return {
      orderDate: fmt(year, month, day),
      shipBy: fmt(year, Math.min(12, month + 2), Math.min(28, day)),
      deliveryDate: fmt(year, Math.min(12, month + 3), Math.min(28, day)),
      createdOn: fmt(year, month, Math.max(1, day - 3)),
      lastUpdated: fmt(year, Math.min(12, month + 1), Math.min(28, day + (idx % 5))),
      confirmationDate: so.status !== "Draft" && so.status !== "Pending Review" ? fmt(year, month, Math.min(28, day + 2)) : "",
    };
  };

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 6) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else { pages.push(1); if (page > 3) pages.push("..."); const start = Math.max(2, page - 1); const end = Math.min(totalPages - 1, page + 1); for (let i = start; i <= end; i++) pages.push(i); if (page < totalPages - 2) pages.push("..."); pages.push(totalPages); }
    return pages;
  };

  const rowPy = viewMode === "Condensed" ? "8px 8px" : "12px 8px";

  /* ═══ inline style helpers — all typography via CSS tokens ═══ */
  const captionStyle: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" };
  const captionSemiStyle: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" };
  const microStyle: React.CSSProperties = { fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" };

  /* ═══ Cell renderers — keyed by column key ═══ */
  const renderCell = useCallback((colKey: string, so: typeof salesOrders[0], globalIdx: number) => {
    const avatarColor = getAvatarColor(globalIdx);
    const dates = deriveDates(so, globalIdx);
    const poc = POC_NAMES[globalIdx % POC_NAMES.length];
    const pocExtra = POC_EXTRA[globalIdx % POC_EXTRA.length];
    const createdBy = CREATED_BY[globalIdx % CREATED_BY.length];

    switch (colKey) {
      case "quote":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}><HighlightText text={so.sourceQuoteRef} search={search} /></span>;
      case "customer":
        return (
          <div className="flex items-center" style={{ gap: 8 }}>
            <div className={`rounded-full flex items-center justify-center shrink-0 ${avatarColor.bgClass} ${avatarColor.textClass}`} style={{ width: 24, height: 24, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" }}>{so.customerInitials}</div>
            <span className="truncate text-foreground" style={{ ...captionStyle, maxWidth: 160 }}><HighlightText text={so.customer} search={search} /></span>
          </div>
        );
      case "status":
        return <div style={{ whiteSpace: "nowrap" }}><SOStatusBadge status={so.status} /></div>;
      case "poc":
        return (
          <div className="flex items-center" style={{ gap: 6 }}>
            <div className={`rounded-full flex items-center justify-center shrink-0 ${avatarColor.bgClass} ${avatarColor.textClass}`} style={{ width: 20, height: 20, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" }}>{poc.charAt(0)}</div>
            <span className="text-foreground whitespace-nowrap" style={captionStyle}>{poc}</span>
            {pocExtra > 0 && <span className="text-foreground/40" style={captionStyle}>+{pocExtra}</span>}
          </div>
        );
      case "salesrep":
        return <span className="text-foreground whitespace-nowrap" style={captionStyle}><HighlightText text={so.salesRep} search={search} /></span>;
      case "value":
        return <span className="text-foreground whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-medium)" }}>${so.total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>;
      case "orderdate":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{dates.orderDate}</span>;
      case "shipby":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{dates.shipBy}</span>;
      case "delivery":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{dates.deliveryDate}</span>;
      case "createdon":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{dates.createdOn}</span>;
      case "createdby":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{createdBy}</span>;
      case "lastupdated":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{dates.lastUpdated}</span>;
      case "confirmation":
        return dates.confirmationDate
          ? <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{dates.confirmationDate}</span>
          : <span className="text-foreground/20" style={captionStyle}>—</span>;
      case "priority":
        return <span className="text-foreground whitespace-nowrap" style={captionStyle}>{so.priority}</span>;
      case "warehouse":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{so.warehouse}</span>;
      case "currency":
        return <span className="whitespace-nowrap" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.5 }}>{so.currency}</span>;
      case "linecount":
        return <span className="text-foreground whitespace-nowrap" style={captionStyle}>{so.lines.length}</span>;
      default:
        return null;
    }
  }, [search, captionStyle]);

  /* Column header labels */
  const HEADER_LABELS: Record<string, string> = {
    quote: "QUOTE #", customer: "CUSTOMER NAME", status: "ORDER STATUS",
    poc: "POC", salesrep: "SALES REP", value: "ORDER VALUE",
    orderdate: "ORDER DATE", shipby: "SHIP BY", delivery: "DELIVERY DATE",
    createdon: "CREATED ON", createdby: "CREATED BY", lastupdated: "LAST UPDATED",
    confirmation: "CONFIRMATION DATE", priority: "PRIORITY", warehouse: "WAREHOUSE",
    currency: "CURRENCY", linecount: "NO. OF ITEMS",
  };

  const isTableView = viewMode !== "Kanban";

  /* ═══ Render ═══ */
  return (
    <div className="flex h-full">
      <div className="flex-1 min-w-0 flex flex-col h-full px-6 lg:px-8 py-6" style={{ paddingBottom: 0, overflowX: "hidden", overflowY: "auto" }}>

        {/* ─── Page Header — vendor-consistent white bar ─── */}
        <div className="flex items-center justify-between shrink-0 -mx-6 lg:-mx-8 -mt-6 px-6 lg:px-8 pt-3.5 pb-3.5 bg-card border-b border-border" style={{ marginBottom: "var(--space-card-padding)" }}>
          <div className="flex items-center" style={{ gap: 10 }}>
            <div className="rounded-lg bg-primary/10 flex items-center justify-center" style={{ width: 32, height: 32 }}>
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="text-foreground leading-tight" style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)" }}>Sales Orders</h1>
              <p className="text-foreground/50" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-normal)", marginTop: 2 }}>Manage and track sales orders — from confirmation through allocation, picking, and shipping.</p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreateModal(true)} icon={<Plus className="w-3.5 h-3.5" strokeWidth={2.5} />} className="shrink-0">
            Create New SO
          </Button>
        </div>

        {/* ─── Sub-tabs — removed, integrated into table card ─── */}

        {/* ─── Performance Insights Bar — vendor-consistent ─── */}
        <div className="flex items-center justify-between shrink-0" style={{ marginBottom: insightsCollapsed ? 16 : 10 }}>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span className="text-foreground/60" style={{ ...captionStyle, fontWeight: "var(--font-weight-medium)" }}>Performance Insights</span>
            <button className="inline-flex items-center rounded-md text-foreground/50 hover:bg-secondary hover:text-foreground transition-colors" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)", gap: 4, padding: "2px 6px" }}>
              Last 30 days <ChevronDown className="w-2.5 h-2.5" />
            </button>
          </div>
          <div className="flex items-center" style={{ gap: 4 }}>
            <button
              onClick={() => setInsightsCollapsed(!insightsCollapsed)}
              className="flex items-center rounded-md hover:bg-secondary transition-colors text-foreground/40 hover:text-foreground/70"
              style={{ padding: "4px 6px" }}
              title={insightsCollapsed ? "Expand insights" : "Collapse insights"}
            >
              {insightsCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* ─── 3 Stat Cards — compact auto-width ─── */}
        {!insightsCollapsed && (
          <div className="grid shrink-0" style={{ gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", marginBottom: 16 }}>
            {[
              { label: "Total Revenue", value: `$${(stats.totalRevenue / 1000).toFixed(0)}K`, sub: "Total order exposure" },
              { label: "Total Orders", value: String(stats.totalOrders), sub: "All orders in system" },
              { label: "Active Orders", value: String(stats.activeOrders), sub: "Currently active" },
            ].map(card => (
              <div key={card.label} className="bg-card rounded-lg border border-border group hover:border-primary/30 transition-colors" style={{ padding: "12px 16px", boxShadow: "var(--elevation-0)" }}>
                <div className="text-foreground/50" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" }}>{card.label}</div>
                <div className="text-foreground" style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)", marginTop: 4, lineHeight: 1.2 }}>
                  {card.value}
                </div>
                <div className="text-foreground/35" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-normal)", marginTop: 4 }}>{card.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ─── White Card — search, pills, table / kanban, pagination ─── */}
        <div className="bg-card rounded-xl border border-border relative flex flex-col min-h-0 flex-1 overflow-clip" style={{ marginBottom: "var(--space-page-x)" }} ref={contentCardRef}>

          {/* ── Search & Filter Bar — vendor-consistent layout ── */}
          <div className="flex items-center justify-between" style={{ padding: "var(--space-card-padding) var(--space-card-padding) var(--space-inline-gap)" }}>
            <div className="flex items-center" style={{ gap: 10 }}>
              <div className="relative flex-1" style={{ maxWidth: 280 }}>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/30 pointer-events-none" />
                <input
                  className="w-full bg-card border border-border rounded-lg pl-9 pr-8 outline-none text-foreground placeholder-foreground/40 transition-colors focus:border-primary"
                  style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)", height: 36, boxShadow: "var(--elevation-0)" }}
                  placeholder="Search by name, type, or email..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setPage(1); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-secondary text-foreground/40 hover:text-foreground/70 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button className="inline-flex items-center justify-center rounded-lg border border-border bg-card hover:bg-secondary transition-colors shrink-0" style={{ ...captionStyle, gap: 6, padding: "0 var(--space-inline-gap)", height: 36, boxShadow: "var(--elevation-0)" }}>
                <SlidersHorizontal className="w-3.5 h-3.5 text-foreground/50" />
                <span style={{ fontWeight: "var(--font-weight-medium)" }}>Filters</span>
              </button>
            </div>

            <div className="flex items-center" style={{ gap: 6 }}>
              {/* Record count */}
              <span className="text-foreground/60 mr-1 hidden sm:inline" style={{ ...captionStyle }}>
                <span className="text-foreground" style={{ fontWeight: "var(--font-weight-medium)" }}>{filtered.length}</span>
                <span className="text-foreground/50"> orders</span>
              </span>
              <div className="w-px h-5 bg-border mx-1 hidden sm:block" />

              {/* Insights toggle */}
              <button
                onClick={() => { if (!showInsights) setShowInsights(true); }}
                className={`inline-flex items-center justify-center rounded-lg border transition-colors shrink-0 ${showInsights ? "border-primary/30 bg-primary/[0.04] text-foreground" : "border-border bg-card text-foreground hover:bg-secondary"}`}
                style={{ ...captionStyle, gap: 6, padding: "0 var(--space-inline-gap)", height: 36, boxShadow: "var(--elevation-0)" }}
              >
                <BarChart3 className="w-4 h-4 text-foreground/50" />
                <span className="hidden md:inline" style={{ fontWeight: "var(--font-weight-medium)" }}>Insights</span>
              </button>

              {/* View Mode (Condensed / Comfort / Kanban) */}
              <div className="relative" ref={viewModeRef}>
                <button
                  onClick={() => setViewModeOpen(!viewModeOpen)}
                  className="inline-flex items-center justify-center rounded-lg border border-border bg-card text-foreground hover:bg-secondary transition-colors"
                  style={{ ...captionStyle, gap: 6, padding: "0 var(--space-inline-gap)", height: 36, boxShadow: "var(--elevation-0)" }}
                >
                  {viewMode === "Kanban" ? <LayoutGrid className="w-4 h-4 text-foreground/50" /> : viewMode === "Condensed" ? <Minimize2 className="w-4 h-4 text-foreground/50" /> : <Settings2 className="w-4 h-4 text-foreground/50" />}
                  <span className="hidden md:inline" style={{ fontWeight: "var(--font-weight-medium)" }}>{viewMode === "Kanban" ? "Kanban" : viewMode}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-foreground/40" />
                </button>
                {viewModeOpen && (
                  <div className="absolute right-0 top-full bg-popover border border-border rounded-lg" style={{ marginTop: 4, zIndex: "var(--z-dropdown)", minWidth: 200, padding: 6, boxShadow: "var(--elevation-3)" }}>
                    {(["Condensed", "Comfort", "Kanban"] as ViewMode[]).map(level => (
                      <button
                        key={level}
                        onClick={() => { setViewMode(level); setViewModeOpen(false); }}
                        className={`w-full text-left flex items-center rounded-md hover:bg-secondary transition-colors ${viewMode === level ? "text-primary" : "text-foreground/80"}`}
                        style={{ ...captionStyle, gap: 10, padding: "8px 10px", fontWeight: viewMode === level ? "var(--font-weight-medium)" : "var(--font-weight-normal)" }}
                      >
                        {level === "Condensed" && <Minimize2 className="w-4 h-4 text-foreground/50 shrink-0" />}
                        {level === "Comfort" && <Settings2 className="w-4 h-4 text-foreground/50 shrink-0" />}
                        {level === "Kanban" && <LayoutGrid className="w-4 h-4 text-foreground/50 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div style={{ fontWeight: "var(--font-weight-medium)" }}>{level === "Kanban" ? "Kanban View" : level}</div>
                          <div className="text-foreground/40" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-normal)" }}>{level === "Condensed" ? "Compact view" : level === "Comfort" ? "Spacious view" : "Board layout"}</div>
                        </div>
                        {viewMode === level && <CheckCircle className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Columns toggle */}
              <button
                onClick={() => setShowColumns(!showColumns)}
                className={`inline-flex items-center justify-center rounded-lg border transition-colors shrink-0 ${showColumns ? "border-primary/30 bg-primary/[0.04] text-foreground" : "border-border bg-card text-foreground hover:bg-secondary"}`}
                style={{ ...captionStyle, gap: 6, padding: "0 var(--space-inline-gap)", height: 36, boxShadow: "var(--elevation-0)" }}
              >
                <Columns3 className="w-4 h-4 text-foreground/50" />
                <span className="hidden md:inline" style={{ fontWeight: "var(--font-weight-medium)" }}>Columns</span>
              </button>
            </div>
          </div>

          {/* ── Status Filter Pills — vendor-consistent rounded pills ── */}
          <div className="flex items-center overflow-x-auto" style={{ gap: 6, padding: "0 var(--space-card-padding)", paddingBottom: "var(--space-inline-gap)", flexWrap: "nowrap" }}>
            <button
              onClick={() => { setMeMode(!meMode); setPage(1); }}
              className={`inline-flex items-center rounded-full border transition-colors shrink-0 ${meMode ? "border-primary bg-primary/10" : "border-border text-foreground/60 hover:bg-secondary hover:text-foreground hover:border-foreground/20"}`}
              style={{ ...captionStyle, gap: 6, padding: "6px 12px", fontWeight: meMode ? "var(--font-weight-medium)" : "var(--font-weight-normal)", color: meMode ? "var(--primary)" : undefined }}
            >
              <User className="w-3.5 h-3.5" /> Me mode
            </button>
            <div className="w-px h-5 bg-border shrink-0" />
            {MAIN_STATUS_FILTERS.map(s => {
              const count = statusCount(s);
              const isActive = statusFilter === s;
              const label = STATUS_FILTER_LABELS[s] || s;
              return (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1); }}
                  className={`inline-flex items-center rounded-full border transition-colors shrink-0 ${isActive ? "border-primary bg-primary/10" : "border-border text-foreground/60 hover:bg-secondary hover:text-foreground hover:border-foreground/20"}`}
                  style={{ ...captionStyle, gap: 6, padding: "6px 12px", fontWeight: isActive ? "var(--font-weight-medium)" : "var(--font-weight-normal)", color: isActive ? "var(--primary)" : undefined }}
                >
                  {label}
                  <span
                    className={`rounded-full text-center ${isActive ? "bg-primary/10" : "bg-secondary"}`}
                    style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", padding: "1px 6px", minWidth: 18, color: isActive ? "var(--primary)" : "var(--foreground)", opacity: isActive ? 1 : 0.5 }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
            <div className="w-px h-5 bg-border shrink-0" />
            <button
              onClick={() => { setStatusFilter(statusFilter === "Archived" ? "All" : "Archived"); setPage(1); }}
              className={`inline-flex items-center rounded-full border transition-colors shrink-0 ${statusFilter === "Archived" ? "bg-destructive/10 text-destructive border-destructive/30" : "border-border text-foreground/60 hover:bg-secondary hover:text-foreground/80"}`}
              style={{ ...captionStyle, gap: 6, padding: "6px 12px", fontWeight: statusFilter === "Archived" ? "var(--font-weight-medium)" : "var(--font-weight-normal)" }}
            >
              <Archive className="w-3 h-3" /> Archived
              <span
                className={`rounded-full text-center ${statusFilter === "Archived" ? "bg-destructive/10" : "bg-secondary"}`}
                style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", padding: "1px 6px", minWidth: 18, color: statusFilter === "Archived" ? "var(--destructive)" : "var(--foreground)", opacity: statusFilter === "Archived" ? 1 : 0.5 }}
              >
                {statusCount("Archived")}
              </span>
            </button>
          </div>

          {/* Divider between filters and table content */}
          <div className="border-t border-border shrink-0" />

          {/* Archived banner */}
          {statusFilter === "Archived" && (
            <div className="flex items-center justify-between bg-secondary border-y border-border" style={{ padding: "12px var(--space-card-padding)" }}>
              <div className="flex items-center" style={{ gap: 10 }}>
                <Archive className="w-4 h-4 text-foreground/50" />
                <span className="text-foreground/50" style={captionStyle}>Showing archived orders — these are hidden from the default view</span>
              </div>
              {selectedIds.size > 0 && (
                <Button variant="primary" size="sm" onClick={handleBulkUnarchive} icon={<ArchiveRestore className="w-3.5 h-3.5" />}>
                  Unarchive {selectedIds.size} Order{selectedIds.size > 1 ? "s" : ""}
                </Button>
              )}
            </div>
          )}

          {/* ── Content: Table + Column Configurator OR Kanban ── */}
          {viewMode === "Kanban" ? (
            <SOKanbanBoard salesOrders={filtered} search={search} />
          ) : (
            <div className="flex-1 min-h-0 relative" ref={tableWrapperRef}>
              {/* ── Floating Bulk Action Overlay (Jira/Asana-style) ── */}
              {selectedIds.size > 0 && statusFilter !== "Archived" && (() => {
                return (
                  <div
                    className="flex items-center rounded-lg"
                    style={{
                      position: "absolute",
                      top: bulkBarTop,
                      left: 8,
                      zIndex: 50,
                      boxShadow: "var(--elevation-4)",
                      padding: "6px 10px",
                      gap: 2,
                      whiteSpace: "nowrap",
                      pointerEvents: "auto",
                      background: "var(--card)",
                      border: "1.5px solid var(--border)",
                      borderRadius: "var(--radius)",
                      transition: "top 150ms ease",
                    }}
                  >
                    {/* Selection count */}
                    <span className="text-foreground shrink-0" style={{ ...captionSemiStyle, paddingRight: 8 }}>
                      {selectedIds.size} order{selectedIds.size > 1 ? "s" : ""} selected
                    </span>

                    {/* Divider */}
                    <div className="shrink-0" style={{ width: 1, height: 20, marginLeft: 2, marginRight: 6, background: "var(--border)" }} />

                    {/* Quick Approve */}
                    {bulkApprovableCount > 0 && (
                      <button
                        onClick={handleBulkApprove}
                        className="inline-flex items-center rounded-md transition-colors hover:bg-secondary"
                        style={{
                          ...captionStyle,
                          gap: 6,
                          padding: "5px 10px",
                          fontWeight: "var(--font-weight-semibold)",
                          background: "transparent",
                          color: "var(--foreground)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius)",
                        }}
                        title={`Approve ${bulkApprovableCount} order${bulkApprovableCount > 1 ? "s" : ""}`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> Quick Approve{bulkApprovableCount < selectedIds.size ? ` (${bulkApprovableCount})` : ""}
                      </button>
                    )}

                    {/* Submit for Review */}
                    {bulkSubmitCount > 0 && (
                      <button onClick={handleBulkSubmitForReview} className="inline-flex items-center text-foreground/70 hover:text-foreground hover:bg-secondary rounded-md transition-colors" style={{ ...captionStyle, gap: 6, padding: "5px 10px", fontWeight: "var(--font-weight-normal)" }} title={`Submit ${bulkSubmitCount} draft${bulkSubmitCount > 1 ? "s" : ""} for review`}>
                        <Send className="w-3.5 h-3.5" /> Submit{bulkSubmitCount < selectedIds.size ? ` (${bulkSubmitCount})` : ""}
                      </button>
                    )}

                    {/* Archive */}
                    {bulkArchivableCount > 0 && (
                      <button onClick={handleBulkArchive} className="inline-flex items-center text-destructive hover:bg-destructive/5 rounded-md transition-colors" style={{ ...captionStyle, gap: 6, padding: "5px 10px", fontWeight: "var(--font-weight-medium)" }} title={`Archive ${bulkArchivableCount} order${bulkArchivableCount > 1 ? "s" : ""}`}>
                        <Archive className="w-3.5 h-3.5" /> Archive{bulkArchivableCount < selectedIds.size ? ` (${bulkArchivableCount})` : ""}
                      </button>
                    )}

                    {/* Export CSV */}
                    <button onClick={handleBulkExportCSV} className="inline-flex items-center text-foreground/70 hover:text-foreground hover:bg-secondary rounded-md transition-colors" style={{ ...captionStyle, gap: 6, padding: "5px 10px", fontWeight: "var(--font-weight-normal)" }}>
                      <FileDown className="w-3.5 h-3.5" /> Export CSV
                    </button>

                    {/* Print */}
                    <button onClick={handleBulkPrint} className="inline-flex items-center text-foreground/70 hover:text-foreground hover:bg-secondary rounded-md transition-colors" style={{ ...captionStyle, gap: 6, padding: "5px 10px", fontWeight: "var(--font-weight-normal)" }}>
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>

                    {/* Close */}
                    <div className="shrink-0" style={{ width: 1, height: 20, marginLeft: 2, marginRight: 2, background: "var(--border)" }} />
                    <button onClick={() => { setSelectedIds(new Set()); setLastSelectedIdx(-1); }} className="w-6 h-6 rounded-md flex items-center justify-center text-foreground/40 hover:text-foreground/70 hover:bg-secondary transition-colors shrink-0" title="Clear selection">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })()}

              {/* Table area — single scroll container for both axes */}
              <div ref={scrollContainerRef} className="min-h-0 overflow-auto absolute inset-0" style={{ right: showColumns ? 260 : 0, transition: "right 200ms ease" }}>
                <table className="w-full" style={{ ...captionStyle, fontWeight: "var(--font-weight-normal)" }}>
                  <thead className="sticky top-0" style={{ zIndex: 4 }}>
                    <tr className="border-b border-border border-t border-t-border/50 bg-card">
                      {/* Sticky: Checkbox */}
                      <th className="sticky left-0 bg-card text-left whitespace-nowrap" style={{ zIndex: 5, padding: "8px", width: 48, minWidth: 48, maxWidth: 48, ...microStyle, fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", opacity: 0.5, letterSpacing: "0.05em" }}>
                        <div className="flex items-center" style={{ paddingLeft: 4 }}>
                          <input type="checkbox" className="w-3.5 h-3.5 rounded accent-primary" style={{ accentColor: "var(--primary)", backgroundColor: "var(--card)" }} checked={selectedIds.size > 0 && selectedIds.size === paginated.length} onChange={toggleSelectAll} />
                        </div>
                      </th>
                      {/* Sticky: Sales Order # */}
                      <th className="sticky bg-card text-left whitespace-nowrap" style={{ left: 48, zIndex: 5, padding: "8px", minWidth: 150, boxShadow: "2px 0 4px -2px var(--border)", ...microStyle, fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", opacity: 0.5, letterSpacing: "0.05em" }}>
                        SALES ORDER #
                      </th>
                      {/* Dynamic columns based on visibility/order */}
                      {visibleDataColumns.map(col => (
                        <th key={col.key} className="bg-card text-left whitespace-nowrap" style={{ padding: "8px", ...microStyle, fontWeight: "var(--font-weight-semibold)", color: "var(--foreground)", opacity: 0.5, letterSpacing: "0.05em", minWidth: col.key === "status" ? 160 : undefined }}>
                          {HEADER_LABELS[col.key] || col.label.toUpperCase()}
                        </th>
                      ))}
                      {/* Sticky: Actions */}
                      <th className="sticky right-0 bg-card text-center whitespace-nowrap" style={{ zIndex: 5, padding: "8px", width: 44, minWidth: 44, boxShadow: "-2px 0 4px -2px var(--border)" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {paginated.map((so, idx) => {
                      const globalIdx = (page - 1) * perPage + idx;
                      const versionNum = so.version?.number ?? (1 + (globalIdx % 4));
                      const versionKey = `v${versionNum}`;
                      const versionClasses = getVersionClasses(versionNum);
                      const canArchiveRow = ARCHIVABLE_STATES.includes(so.status);
                      const canUnarchiveRow = so.status === "Archived";
                      const canCancelRow = !["Cancelled", "Archived", "Cancellation Requested"].includes(so.status);
                      const canApproveRow = so.status === "Pending Review" || so.status === "Draft";
                      const canSubmitRow = so.status === "Draft";
                      const canCloseRow = so.status === "Shipped" || so.status === "Partially Shipped";

                      return (
                        <tr key={so.id} className={`border-b border-border/50 hover:bg-secondary cursor-pointer transition-colors group ${selectedIds.has(so.id) ? "bg-primary/[0.03]" : ""}`} onClick={() => navigate(`/sales-orders/${so.id}`)} style={selectedIds.has(so.id) ? { boxShadow: "inset 3px 0 0 0 var(--primary)" } : undefined}>
                          <td className={`sticky left-0 group-hover:bg-secondary transition-colors ${selectedIds.has(so.id) ? "bg-primary/[0.03]" : "bg-card"}`} style={{ padding: rowPy, zIndex: 2, width: 48, minWidth: 48, maxWidth: 48 }} onClick={e => e.stopPropagation()}>
                            <div className="flex items-center" style={{ paddingLeft: 4 }}>
                              <input type="checkbox" className="w-3.5 h-3.5 rounded accent-primary" style={{ accentColor: "var(--primary)", backgroundColor: "var(--card)" }} checked={selectedIds.has(so.id)} onChange={() => toggleSelectSO(so.id, idx)} />
                            </div>
                          </td>
                          <td className={`sticky group-hover:bg-secondary transition-colors ${selectedIds.has(so.id) ? "bg-primary/[0.03]" : "bg-card"}`} style={{ left: 48, padding: rowPy, zIndex: 2, minWidth: 150, boxShadow: "2px 0 4px -2px var(--border)" }}>
                            <div className="flex items-center" style={{ gap: 6 }}>
                              <span
                                className={`group/ver inline-flex items-center rounded shrink-0 border cursor-pointer ${versionClasses}`}
                                style={{
                                  padding: "1px 5px",
                                  fontSize: "var(--text-micro)",
                                  fontWeight: "var(--font-weight-semibold)",
                                  transition: "padding 150ms ease",
                                }}
                                onMouseEnter={e => { e.currentTarget.style.paddingRight = "3px"; const arrow = e.currentTarget.querySelector("[data-ver-arrow]") as HTMLElement; if (arrow) { arrow.style.width = "12px"; arrow.style.opacity = "1"; } }}
                                onMouseLeave={e => { e.currentTarget.style.paddingRight = "5px"; const arrow = e.currentTarget.querySelector("[data-ver-arrow]") as HTMLElement; if (arrow) { arrow.style.width = "0px"; arrow.style.opacity = "0"; } }}
                              >
                                {versionKey}
                                <span data-ver-arrow="" className="inline-flex items-center overflow-hidden" style={{ width: 0, opacity: 0, transition: "width 150ms ease, opacity 150ms ease" }}>
                                  <ArrowUpRight className="w-2.5 h-2.5 shrink-0" style={{ marginLeft: 1 }} />
                                </span>
                              </span>
                              <span className="text-foreground hover:text-primary hover:underline cursor-pointer whitespace-nowrap" style={{ ...captionStyle }}><HighlightText text={so.soNumber} search={search} /></span>
                            </div>
                          </td>
                          {/* Dynamic data columns */}
                          {visibleDataColumns.map(col => (
                            <td key={col.key} style={{ padding: rowPy, minWidth: col.key === "status" ? 160 : undefined }}>
                              {renderCell(col.key, so, globalIdx)}
                            </td>
                          ))}
                          {/* Sticky: Actions */}
                          <td className={`sticky right-0 group-hover:bg-secondary transition-colors ${selectedIds.has(so.id) ? "bg-primary/[0.03]" : "bg-card"}`} style={{ padding: rowPy, zIndex: 2, width: 44, minWidth: 44, boxShadow: "-2px 0 4px -2px var(--border)" }} onClick={e => e.stopPropagation()}>
                            <div className="relative" ref={openActionId === so.id ? actionRef : undefined}>
                              <button onClick={() => setOpenActionId(openActionId === so.id ? null : so.id)} className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-secondary border border-transparent hover:border-border transition-colors text-foreground/35 hover:text-foreground/60">
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                              {openActionId === so.id && (
                                <div className="absolute right-0 bottom-full bg-popover border border-border rounded-lg" style={{ marginBottom: 4, zIndex: 50, minWidth: 190, padding: "4px 0", boxShadow: "var(--elevation-2)" }}>
                                  {/* View */}
                                  <button onClick={() => { navigate(`/sales-orders/${so.id}`); setOpenActionId(null); }} className="w-full text-left flex items-center text-foreground/80 hover:bg-secondary transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-normal)" }}><Eye className="w-3 h-3" /> View Details</button>

                                  {/* Status actions — divider before */}
                                  {(canSubmitRow || canApproveRow || canCloseRow) && <div className="border-t border-border" style={{ margin: "4px 0" }} />}
                                  {canSubmitRow && (
                                    <button onClick={() => handleSubmitForReview(so.id)} className="w-full text-left flex items-center hover:bg-secondary transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-medium)", color: "var(--primary)" }}><Send className="w-3 h-3" /> Submit for Review</button>
                                  )}
                                  {canApproveRow && (
                                    <button onClick={() => handleApproveRow(so.id)} className="w-full text-left flex items-center hover:bg-secondary transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-medium)", color: "var(--accent)" }}><CheckCircle className="w-3 h-3" /> Clear by Ops</button>
                                  )}
                                  {canCloseRow && (
                                    <button onClick={() => handleCloseRow(so.id)} className="w-full text-left flex items-center hover:bg-secondary transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-medium)", color: "var(--chart-4)" }}><Lock className="w-3 h-3" /> Close Order</button>
                                  )}

                                  {/* Utility actions */}
                                  <div className="border-t border-border" style={{ margin: "4px 0" }} />
                                  <button onClick={() => handleDuplicate(so.id)} className="w-full text-left flex items-center text-foreground/80 hover:bg-secondary transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-normal)" }}><Copy className="w-3 h-3" /> Duplicate</button>
                                  <button onClick={() => handleViewPDF(so.id)} className="w-full text-left flex items-center text-foreground/80 hover:bg-secondary transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-normal)" }}><Printer className="w-3 h-3" /> View PDF</button>
                                  <button onClick={() => handleExportCSV(so.id)} className="w-full text-left flex items-center text-foreground/80 hover:bg-secondary transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-normal)" }}><FileDown className="w-3 h-3" /> Export CSV</button>

                                  {/* Destructive / lifecycle actions */}
                                  {(canArchiveRow || canUnarchiveRow || canCancelRow) && <div className="border-t border-border" style={{ margin: "4px 0" }} />}
                                  {canUnarchiveRow && (
                                    <button onClick={() => handleUnarchiveRow(so.id)} className="w-full text-left flex items-center text-foreground/80 hover:bg-secondary transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-normal)" }}><ArchiveRestore className="w-3 h-3" /> Unarchive</button>
                                  )}
                                  {canArchiveRow && (
                                    <button onClick={() => handleArchiveRow(so.id)} className="w-full text-left flex items-center hover:bg-destructive/5 transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-normal)", color: "var(--destructive)" }}><Archive className="w-3 h-3" /> Archive</button>
                                  )}
                                  {canCancelRow && (
                                    <button onClick={() => handleCancelRow(so.id)} className="w-full text-left flex items-center hover:bg-destructive/5 transition-colors" style={{ ...captionStyle, gap: 8, padding: "6px 12px", fontWeight: "var(--font-weight-medium)", color: "var(--destructive)" }}><Ban className="w-3 h-3" /> Cancel Order</button>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {paginated.length === 0 && (
                      <tr><td colSpan={visibleDataColumns.length + 3} className="text-center text-foreground/50" style={{ padding: "48px 0", ...captionStyle }}>No sales orders match your filters.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Column Configurator Panel — overlaps right edge of card */}
              {showColumns && (
                <div style={{ position: "absolute", top: 0, right: -1, bottom: 0, zIndex: 20 }}>
                  <SOColumnConfigurator
                    columns={columns}
                    onChange={setColumns}
                    onClose={() => setShowColumns(false)}
                  />
                </div>
              )}
            </div>
          )}

          {/* ── Pagination (only in table view) ── */}
          {isTableView && (
            <div className="flex items-center justify-center border-t border-border" style={{ padding: "var(--space-inline-gap) var(--space-card-padding)" }}>
              <div className="flex items-center" style={{ gap: 12, ...captionStyle, fontWeight: "var(--font-weight-normal)", color: "var(--foreground)", opacity: 0.6 }}>
                <div className="flex items-center" style={{ gap: 6 }}>
                  <span>Records per page</span>
                  <div className="relative">
                    <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} className="appearance-none bg-card border border-border rounded-md cursor-pointer outline-none hover:border-foreground/20 text-foreground/80" style={{ ...captionStyle, padding: "4px 24px 4px 8px" }}>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-foreground/35 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center" style={{ gap: 2 }}>
                  <button onClick={() => setPage(1)} disabled={page === 1} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary disabled:opacity-30 transition-colors"><ChevronsLeft className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="flex items-center rounded-md hover:bg-secondary disabled:opacity-30 transition-colors" style={{ ...captionStyle, gap: 2, padding: "4px 8px" }}><ChevronLeft className="w-3 h-3" /> Prev</button>
                  {getPageNumbers().map((p, i) =>
                    p === "..." ? (
                      <span key={`dots-${i}`} className="w-7 h-7 flex items-center justify-center text-foreground/35">…</span>
                    ) : (
                      <button key={p} onClick={() => setPage(p as number)} className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${p === page ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground/80"}`} style={{ ...captionStyle }}>{p}</button>
                    )
                  )}
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0} className="flex items-center rounded-md hover:bg-secondary disabled:opacity-30 transition-colors" style={{ ...captionStyle, gap: 2, padding: "4px 8px" }}>Next <ChevronRight className="w-3 h-3" /></button>
                  <button onClick={() => setPage(totalPages)} disabled={page === totalPages || totalPages === 0} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary disabled:opacity-30 transition-colors"><ChevronsRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Insights Side Panel */}
      {showInsights && <InsightsPanel onClose={() => setShowInsights(false)} />}
      {/* Create SO Modal */}
      <CreateSOModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onContinue={(payload: SOCreationPayload) => {
          setShowCreateModal(false);
          const so = createSO({
            customer: payload.customer,
            customerInitials: payload.customerInitials,
            shippingAddress: payload.customerAddress,
            description: `Sales order for ${payload.customer} — ${payload.lineItems.length} line items`,
            priority: payload.priority,
            tags: payload.tags,
            lines: payload.lineItems.map(li => ({
              id: "",
              itemCode: li.itemCode,
              itemName: li.itemName,
              itemType: li.itemType,
              warehouse: "Main Warehouse",
              orderedQty: li.qty,
              allocatedQty: 0,
              pickedQty: 0,
              shippedQty: 0,
              deliveredQty: 0,
              unitPrice: li.unitPrice,
              taxRate: 0.08,
              allocations: [],
              cancelled: false,
              cancelledQty: 0,
              readyToPick: false,
            })),
          });
          
          // Show success toast with action to return to listing
          showToast({
            type: "success",
            title: `Sales Order ${so.soNumber} Created`,
            message: `Order for ${payload.customer} with ${payload.lineItems.length} items`,
            duration: 5000,
            actions: [
              {
                label: "Back to Listing",
                onClick: () => navigate("/sales-orders"),
                variant: "secondary",
              },
            ],
          });
          
          // Navigate directly to details page
          navigate(`/sales-orders/${so.id}`);
        }}
      />
      {/* Single SO Confirm Modal (from row 3-dot or single-select Quick Approve) */}
      {confirmSingleSO && (
        <ConfirmSOModal
          so={confirmSingleSO}
          onConfirm={() => handleSingleConfirmDone()}
          onClose={() => setConfirmSingleSO(null)}
        />
      )}
      {/* Bulk Confirm Modal (multi-select Quick Approve) */}
      {showBulkConfirm && (
        <BulkConfirmSOModal
          orders={selectedSOs}
          onConfirm={(soIds) => handleBulkConfirmDone(soIds)}
          onClose={() => setShowBulkConfirm(false)}
        />
      )}
      {/* Cancellation Modal (from row 3-dot Cancel Order) */}
      {cancelTargetSO && (
        <CancellationModal
          so={cancelTargetSO}
          mode={cancelModalMode}
          onConfirmFull={handleCancelFull}
          onConfirmPartial={handleCancelPartial}
          onClose={() => setCancelTargetSO(null)}
        />
      )}
      {/* Bulk Submit for Review Modal */}
      {showBulkSubmitReview && (
        <BulkSubmitForReviewModal
          orders={selectedSOs}
          onConfirm={handleBulkSubmitConfirmed}
          onClose={() => setShowBulkSubmitReview(false)}
        />
      )}
      {/* Bulk Close Orders Modal */}
      {showBulkClose && (
        <BulkCloseOrdersModal
          orders={selectedSOs}
          onConfirm={handleBulkCloseConfirmed}
          onClose={() => setShowBulkClose(false)}
        />
      )}
      {/* Bulk Cancellation Modal */}
      {showBulkCancel && (
        <BulkCancellationModal
          orders={selectedSOs}
          onConfirm={handleBulkCancelConfirmed}
          onClose={() => setShowBulkCancel(false)}
        />
      )}
    </div>
  );
}