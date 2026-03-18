import { useParams, useNavigate } from "react-router";
import { useVendors } from "../context/VendorContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Separator } from "../components/ui/separator";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "../components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/ui/popover";
import { PARTNER_GROUPS, CONTACT_DICTIONARY } from "../components/vendors/partnerConstants";
import type { ContactPerson as PartnerContact } from "../components/vendors/partnerConstants";
import { CreatePartnerLocationModal } from "../components/vendors/CreatePartnerLocationModal";
import { PartnerItemsTab } from "../components/vendors/PartnerItemsTab";
import { PricingRulesTabNew } from "../components/vendors/PricingRulesTab";
import { PaymentTermDetailModal } from "../components/vendors/PaymentTermDetailModal";
import { PAYMENT_TERM_PRESETS, type PaymentTermPreset } from "../components/vendors/partnerConstants";
import { PocSectionContent, SelectPocDictionaryModal, CreatePocModal } from "../components/vendors/PocModals";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import type { Vendor, VendorConfigData } from "../data/vendors";
import {
  CATEGORY_LABELS,
  PAYMENT_TERMS_LABELS,
} from "../data/vendors";
import {
  ArrowLeft,
  Pencil,
  Archive,
  RotateCcw,
  Printer,
  MoreHorizontal,
  Trash2,
  Copy,
  ExternalLink,
  Mail,
  Phone,
  Globe,
  MapPin,
  DollarSign,
  FileText,
  Star,
  Calendar,
  CreditCard,
  ShoppingCart,
  TrendingUp,
  Users,
  Truck,
  Shield,
  Tag,
  Banknote,
  CheckCircle2,
  Package,
  Wallet,
  Receipt,
  Building2,
  ChevronDown,
  Clock,
  Info,
  Upload,
  Paperclip,
  MessageSquare,
  Activity,
  Search,
  Maximize2,
  BarChart3,
  PieChart,
  ClipboardList,
  StickyNote,
  FilePlus2,
  Send,
  Link2,
  RefreshCw,
  Plus,
  Sliders,
  Check,
  ChartColumn,
  Percent,
  X,
  GripVertical,
  Minimize2,
  Filter,
  LayoutGrid,
  List as ListIcon,
  Eye,
  ChevronRight,
  Grid3X3,
  Wrench,
  AlignJustify,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  SlidersHorizontal,
  Sparkles,
  User,
  PhoneCall,
  UserPlus,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { toAAAColor } from "../utils/colors";
import { getPocAvatarTint } from "../components/vendors/PocPillComponents";
import { DndProvider, useDrag, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
} from "recharts";

// ── Tab definitions ──
const TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "partner_locations", label: "Partner Locations" },
  { id: "items", label: "Items" },
  { id: "pricing_rules", label: "Pricing Rules" },
  { id: "partner_communication", label: "Partner Communication" },
  { id: "global_contacts", label: "Global Point of Contact" },
  { id: "carrier_profile", label: "Carrier Profile" },
  { id: "payment_methods", label: "Payment Methods" },
  { id: "purchase_orders", label: "Purchase Orders" },
  { id: "quotes", label: "Quotes" },
  { id: "sales_orders", label: "Sales Orders" },
  { id: "notes", label: "Notes" },
  { id: "attachments", label: "Attachments" },
  { id: "recent_activity", label: "Recent Activity" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function VendorDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getVendor, archiveVendor, restoreVendor, deleteVendor } = useVendors();
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [isScrolled, setIsScrolled] = useState(false);

  // Dashboard KPI state (lifted for full-width rendering)
  const [dashActiveKpis, setDashActiveKpis] = useState<string[]>(DEFAULT_DASH_KPIS);
  const [customizePanelOpen, setCustomizePanelOpen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());

  const handleToggleKpi = useCallback((key: string) => {
    setDashActiveKpis((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }, []);

  const moveKpi = useCallback((fromIndex: number, toIndex: number) => {
    setDashActiveKpis((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const handleRefresh = useCallback(() => {
    setLastRefreshed(new Date());
    toast.success("Dashboard refreshed");
  }, []);

  const activeKpiDefs = useMemo(
    () => dashActiveKpis.map((k) => DASH_KPI_DEFS.find((d) => d.key === k)).filter(Boolean) as DashKpiDef[],
    [dashActiveKpis]
  );

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const vendor = getVendor(id!);

  // Generate location data for KPI computations (must be after vendor is available)
  const locationsData = useMemo(() => vendor ? generateLocationsFromVendor(vendor) : [], [vendor]);

  if (!vendor) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="w-16 h-16 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
          <Building2 className="w-8 h-8 text-[#94A3B8]" />
        </div>
        <p className="text-[#64748B] text-sm">Partner not found.</p>
        <Button variant="outline" onClick={() => navigate("/vendors")} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Back to Partners
        </Button>
      </div>
    );
  }

  const handleArchive = () => {
    archiveVendor(vendor.id);
    toast.success("Partner archived successfully");
    setArchiveDialogOpen(false);
  };

  const handleRestore = () => {
    restoreVendor(vendor.id);
    toast.success("Partner restored to active");
  };

  const handleDelete = () => {
    deleteVendor(vendor.id);
    toast.success("Partner deleted successfully");
    setDeleteDialogOpen(false);
    navigate("/vendors");
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(val);

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM dd, yyyy");
    } catch {
      return dateStr;
    }
  };

  const creditUtilization =
    vendor.creditLimit > 0
      ? Math.round((vendor.creditUtilization / vendor.creditLimit) * 100)
      : 0;

  const cfg = vendor.configData;
  const hasPOCs = cfg?.pointsOfContact && cfg.pointsOfContact.length > 0;
  const hasPaymentMethods = cfg?.paymentMethods && cfg.paymentMethods.length > 0;
  const hasPaymentTerm = !!cfg?.paymentTermConfig;
  const hasPricingRules = cfg?.pricingRules && cfg.pricingRules.length > 0;
  const hasShipping = cfg?.shippingConfig && (cfg.shippingConfig.carrierServices.length > 0 || cfg.shippingConfig.vendorPreferences.length > 0);

  const PAYMENT_TYPE_ICONS: Record<string, typeof Banknote> = {
    ach: Banknote,
    check: FileText,
    wire: Globe,
    card: CreditCard,
    digital_wallet: Wallet,
    cash: DollarSign,
  };

  // Build initials for avatar
  const initials = vendor.displayName
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  // Status config
  const statusConfig: Record<string, { color: string; bg: string; border: string; label: string }> = {
    active: { color: "#059669", bg: "#ECFDF5", border: "#A7F3D0", label: "Active" },
    inactive: { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", label: "Inactive" },
    archived: { color: "#64748B", bg: "#F1F5F9", border: "#CBD5E1", label: "Archived" },
  };
  const currentStatus = statusConfig[vendor.status] || statusConfig.active;

  // Contact count
  const contactCount = (vendor.globalPointOfContacts?.length || 0) + (cfg?.pointsOfContact?.length || 0);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-[#F8FAFC]">
      {/* ═══════════════���══════════════════════════════
          TOP NAV BAR
         ══���══════════════════════════════════���════════ */}
      <div className="bg-white border-b border-[#E2E8F0] shrink-0 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 lg:px-6 h-11">
          <div className="flex items-center gap-2 text-[13px] text-[#64748B]">
            <button
              onClick={() => navigate("/partners")}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
              style={{ fontWeight: 500 }}
            >
              Partners Management
            </button>
            <span className="text-[#CBD5E1]">/</span>
            <button
              onClick={() => navigate("/vendors")}
              className="hover:text-[#0F172A] transition-colors cursor-pointer"
              style={{ fontWeight: 500 }}
            >
              Partners
            </button>
            <span className="text-[#CBD5E1]">/</span>
            <span className="text-[#0F172A]" style={{ fontWeight: 500 }}>{vendor.displayName}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
              <Input
                placeholder="Search partner..."
                className="pl-9 w-[220px] h-8 bg-[#F8FAFC] border-[#E2E8F0] text-[13px] placeholder:text-[#94A3B8] rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden border-2 border-[#E2E8F0]" style={{ backgroundColor: '#0A77FF' }}>
                <span className="text-[11px] text-white" style={{ fontWeight: 600 }}>AA</span>
              </div>
              <div className="hidden sm:block">
                <p className="text-[13px] text-[#0F172A]" style={{ fontWeight: 500 }}>Ahtisham Ahmad</p>
                <p className="text-[11px] text-[#94A3B8] leading-tight">Product Designer</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════���═══════
          HEADER CARD — sticky below nav
         ══════════════════════════════════════════════ */}
      <div className="shrink-0 sticky top-[44px] z-20 relative" style={{ paddingTop: isScrolled ? '8px' : '12px', transition: 'padding-top 200ms ease' }}>
            {/* Absolute gradient background layer — morphs on scroll */}
            <div
              style={{
                position: "absolute",
                inset: "-48px 0 -6px 0",
                background: "linear-gradient(180deg, #F8FAFC 0%, #F8FAFC calc(100% - 6px), transparent 100%)",
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
        <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 lg:px-6 xl:px-8">
        <div className={`bg-white border border-[#E2E8F0] transition-all duration-200 ${isScrolled ? "rounded-lg shadow-[0_1px_2px_0_rgba(0,0,0,0.03),0_4px_12px_-2px_rgba(0,0,0,0.06)]" : "rounded-xl shadow-sm"}`}>
          {/* Main header row */}
          <div className={`flex items-center justify-between gap-4 px-4 lg:px-5 transition-all duration-200 ${isScrolled ? "py-1.5" : "py-3"}`}>
            {/* Left: Back + Avatar + Info */}
            <div className={`flex items-center min-w-0 transition-all duration-200 ${isScrolled ? "gap-2.5" : "gap-3"}`}>
              {/* Back button — rounded rectangle */}
              <button
                onClick={() => navigate("/vendors")}
                className={`rounded-xl border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] flex items-center justify-center shrink-0 transition-all duration-200 cursor-pointer shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.03)] ${isScrolled ? "w-8 h-8" : "w-11 h-11"}`}
              >
                <ChevronLeft className={`text-[#94A3B8] transition-all duration-200 ${isScrolled ? "w-4 h-4" : "w-5 h-5"}`} />
              </button>

              {/* Avatar — rounded rectangle thumbnail */}
              {vendor.profileImage ? (
                <img
                  src={vendor.profileImage}
                  alt={vendor.displayName}
                  className={`rounded-xl object-cover shrink-0 border border-[#E2E8F0] shadow-[0_1px_3px_0_rgba(0,0,0,0.04),0_1px_2px_-1px_rgba(0,0,0,0.03)] transition-all duration-200 ${isScrolled ? "w-8 h-8" : "w-11 h-11"}`}
                />
              ) : (
                <div
                  className={`rounded-xl flex items-center justify-center shrink-0 text-white border border-white shadow-[0_1px_3px_0_rgba(0,0,0,0.06),0_0_0_2px_rgba(10,119,255,0.10)] transition-all duration-200 ${isScrolled ? "w-8 h-8 text-[10px]" : "w-11 h-11 text-[14px]"}`}
                  style={{ backgroundColor: toAAAColor(vendor.createdByContact?.bgColor || "#0A77FF"), fontWeight: 700 }}
                >
                  {initials}
                </div>
              )}

              {/* Name + Badges + Description */}
              <div className="min-w-0">
                {/* Line 1: Name + inline badges */}
                <div className={`flex items-center flex-wrap transition-all duration-200 ${isScrolled ? "gap-1.5" : "gap-2"}`}>
                  <h1
                    className="text-[#0F172A] truncate"
                    style={{ fontSize: isScrolled ? "13px" : "16px", fontWeight: isScrolled ? 600 : 700, lineHeight: isScrolled ? "18px" : "22px", transition: "font-size 200ms, line-height 200ms, font-weight 200ms" }}
                  >
                    {vendor.displayName}
                  </h1>

                  {/* Status badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-md border transition-all duration-200 ${isScrolled ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]"}`}
                    style={{
                      fontWeight: 600,
                      backgroundColor: currentStatus.bg,
                      color: currentStatus.color,
                      borderColor: currentStatus.border,
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentStatus.color }} />
                    {currentStatus.label}
                  </span>

                  {/* Partner Type badges (Vendor / Customer) */}
                  {(vendor.partnerTypes || []).map((type) => (
                    <span
                      key={type}
                      className={`inline-flex items-center gap-1 rounded-md border transition-all duration-200 ${isScrolled ? "px-1.5 py-px text-[10px]" : "px-2 py-0.5 text-[11px]"} ${
                        type === "vendor"
                          ? "border-[#BFDBFE] bg-[#DBEAFE] text-[#2563EB]"
                          : "border-[#C4B5FD] bg-[#EDE9FE] text-[#7C3AED]"
                      }`}
                      style={{ fontWeight: 600 }}
                    >
                      {type === "vendor" ? (
                        <Truck className={`transition-all duration-200 ${isScrolled ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                      ) : (
                        <ShoppingCart className={`transition-all duration-200 ${isScrolled ? "w-2.5 h-2.5" : "w-3 h-3"}`} />
                      )}
                      {type === "vendor" ? "Vendor" : "Customer"}
                    </span>
                  ))}

                  {/* Primary Partner Group — hoverable with quick view popover */}
                  {!isScrolled && vendor.partnerGroup && (() => {
                    const group = PARTNER_GROUPS.find((g) => g.id === vendor.partnerGroup);
                    if (!group) return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-[#E2E8F0] bg-[#F1F5F9] text-[#475569]" style={{ fontWeight: 500 }}>
                        <Building2 className="w-3 h-3 text-[#94A3B8]" />
                        {vendor.partnerGroup}
                      </span>
                    );
                    return (
                      <PartnerGroupHoverPill group={group} />
                    );
                  })()}
                </div>

                {/* Line 2: Code + Description — hidden when scrolled */}
                {!isScrolled && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-[#94A3B8] shrink-0" style={{ fontWeight: 500 }}>
                      {vendor.code}
                    </span>
                    <span className="text-[#CBD5E1]">·</span>
                    <p className="text-[12px] text-[#64748B] line-clamp-1 max-w-3xl" style={{ lineHeight: "16px" }}>
                      {vendor.description || cfg?.description || `${CATEGORY_LABELS[vendor.category]} partner — ${vendor.services || vendor.vendorType || vendor.country}`}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Action + Edit CTA */}
            <div className={`flex items-center shrink-0 transition-all duration-200 ${isScrolled ? "gap-1.5" : "gap-2"}`}>
              {/* Action dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#334155] inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm ${isScrolled ? "h-8 px-3 text-[12px]" : "h-9 px-3.5 text-[13px]"}`} style={{ fontWeight: 500 }}>
                    Action
                    <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-[200] w-56">
                  {/* Communication */}
                  <DropdownMenuItem onClick={() => toast.info("Email feature coming soon")}>
                    <Mail className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Phone feature coming soon")}>
                    <Phone className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Call Partner
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Transactions */}
                  <DropdownMenuItem onClick={() => toast.info("Purchase Order creation coming soon")}>
                    <ClipboardList className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Create Purchase Order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Sales Order creation coming soon")}>
                    <ShoppingCart className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Create Sales Order
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Invoice creation coming soon")}>
                    <Receipt className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Create Invoice
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Documents & Notes */}
                  <DropdownMenuItem onClick={() => toast.info("Note creation coming soon")}>
                    <StickyNote className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Add Note
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Upload feature coming soon")}>
                    <Upload className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Upload Document
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => toast.info("Attachment feature coming soon")}>
                    <Paperclip className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Attach File
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Utilities */}
                  <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(vendor.code); toast.success("Partner code copied"); }}>
                    <Copy className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Copy Partner Code
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied to clipboard"); }}>
                    <Link2 className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Copy Link
                  </DropdownMenuItem>
                  {vendor.website && (
                    <DropdownMenuItem onClick={() => window.open(vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`, "_blank")}>
                      <ExternalLink className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                      Visit Website
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => toast.info("Print feature coming soon")}>
                    <Printer className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                    Print Partner Details
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {/* Lifecycle */}
                  {vendor.status !== "archived" && (
                    <DropdownMenuItem onClick={() => setArchiveDialogOpen(true)}>
                      <Archive className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                      Archive Partner
                    </DropdownMenuItem>
                  )}
                  {vendor.status === "archived" && (
                    <DropdownMenuItem onClick={handleRestore}>
                      <RotateCcw className="w-3.5 h-3.5 mr-2 text-[#64748B]" />
                      Restore Partner
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-[#DC2626] focus:text-[#DC2626]">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Delete Partner
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Expand icon */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className={`rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] flex items-center justify-center transition-all duration-200 cursor-pointer shadow-sm ${isScrolled ? "w-8 h-8" : "w-9 h-9"}`}>
                    <Maximize2 className={`text-[#64748B] transition-all duration-200 ${isScrolled ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="z-[300]">Full Screen</TooltipContent>
              </Tooltip>

              {/* Primary CTA */}
              {vendor.status === "archived" ? (
                <button
                  onClick={handleRestore}
                  className={`rounded-lg bg-[#0A77FF] hover:bg-[#0862D0] text-white inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm ${isScrolled ? "h-8 px-3.5 text-[12px]" : "h-9 px-4 text-[13px]"}`}
                  style={{ fontWeight: 600 }}
                >
                  <RotateCcw className={`transition-all duration-200 ${isScrolled ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                  Restore Partner
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/vendors/${vendor.id}/edit`)}
                  className={`rounded-lg bg-[#0A77FF] hover:bg-[#0862D0] text-white inline-flex items-center gap-1.5 transition-all duration-200 cursor-pointer shadow-sm ${isScrolled ? "h-8 px-3.5 text-[12px]" : "h-9 px-4 text-[13px]"}`}
                  style={{ fontWeight: 600 }}
                >
                  <Pencil className={`transition-all duration-200 ${isScrolled ? "w-3 h-3" : "w-3.5 h-3.5"}`} />
                  Edit Partner
                </button>
              )}
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-0 overflow-x-auto scrollbar-hide border-t border-[#F1F5F9] px-4 lg:px-5">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3.5 border-b-2 transition-all duration-200 whitespace-nowrap cursor-pointer ${isScrolled ? "py-1.5 text-[12px]" : "py-2.5 text-[13px]"} ${
                    isActive
                      ? "border-[#0A77FF] text-[#0A77FF]"
                      : "border-transparent text-[#64748B] hover:text-[#334155] hover:border-[#CBD5E1]"
                  }`}
                  style={{ fontWeight: isActive ? 600 : 400 }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════
          BODY: centered container on large screens
         ══════════════════════════════════════════════ */}
      <div className="flex-1">
        <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 lg:px-6 xl:px-8 py-5 space-y-5">
          {/* Full-width KPI strip — only on Dashboard tab */}
          {activeTab === "dashboard" && (
            <div className="space-y-3">
              {/* Info bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] text-[#64748B]">
                  <span>Data view as of</span>
                  <span style={{ fontWeight: 500 }} className="text-[#334155]">{format(lastRefreshed, "MM/dd/yyyy h:mm a")}</span>
                  <span className="text-[#CBD5E1]">|</span>
                  <button onClick={handleRefresh} className="inline-flex items-center gap-1 text-[#0A77FF] hover:text-[#0862D4] transition-colors cursor-pointer" style={{ fontWeight: 500 }}>
                    <RefreshCw className="w-3 h-3" />
                    Refresh Page
                  </button>
                </div>
                <button
                  onClick={() => setCustomizePanelOpen(true)}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#0A77FF] hover:bg-[#0A77FF]/5 px-3 py-1.5 rounded-lg border border-[#0A77FF]/20 transition-colors cursor-pointer"
                  style={{ fontWeight: 500 }}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Customize Widget
                </button>
              </div>

              {/* KPI Cards — draggable responsive grid */}
              {activeKpiDefs.length > 0 && (
                <DndProvider backend={HTML5Backend}>
                  <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
                    {activeKpiDefs.map((kpi, idx) => {
                      const computed = computeDashKpiValue(kpi.key, vendor, formatCurrency, formatDate);
                      return (
                        <DraggableKpiCard
                          key={kpi.key}
                          index={idx}
                          kpiKey={kpi.key}
                          label={kpi.label}
                          value={computed.value}
                          subtitle={kpi.subtitle}
                          iconName={kpi.iconName}
                          change={computed.change}
                          changeColor={computed.changeColor}
                          moveCard={moveKpi}
                          onRemove={() => handleToggleKpi(kpi.key)}
                        />
                      );
                    })}
                  </div>
                </DndProvider>
              )}
            </div>
          )}

          {/* Fixed 4 KPI stat cards — Partner Locations tab */}
          {activeTab === "partner_locations" && (() => {
            const locActive = locationsData.filter((l) => l.status === "active").length;
            const locActivePct = locationsData.length > 0 ? Math.round((locActive / locationsData.length) * 100) : 0;
            const locTotalContacts = locationsData.reduce((s, l) => s + l.contacts, 0);
            const locTotalCenters = locationsData.reduce((s, l) => s + l.serviceCenters, 0);
            const LOC_FIXED_KPIS = [
              { label: "Total Locations", value: String(locationsData.length), iconName: "MapPin", change: undefined as string | undefined, changeColor: undefined as string | undefined },
              { label: "Active Locations", value: String(locActive), iconName: "CheckCircle2", change: `${locActivePct}%`, changeColor: "#059669" },
              { label: "Total Contacts", value: String(locTotalContacts), iconName: "Users", change: undefined, changeColor: undefined },
              { label: "Service Centers", value: String(locTotalCenters), iconName: "Wrench", change: undefined, changeColor: undefined },
            ];
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {LOC_FIXED_KPIS.map((kpi) => (
                  <div key={kpi.label} className="border border-[#E2E8F0] rounded-lg bg-white group relative min-w-0 transition-all duration-200 overflow-hidden hover:-translate-y-[1px] hover:border-[#93B8F7] hover:shadow-[0_2px_8px_-3px_rgba(10,119,255,0.06)]">
                    <div className="px-3 py-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="text-[10.5px] text-[#64748B] whitespace-nowrap" style={{ fontWeight: 500 }}>{kpi.label}</p>
                        <DashKpiIcon name={kpi.iconName} className="w-3.5 h-3.5 shrink-0" style={{ color: "#94A3B8" }} />
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        {kpi.change && (
                          <span className="text-[10px] shrink-0" style={{ fontWeight: 500, color: kpi.changeColor || "#059669" }}>{kpi.change}</span>
                        )}
                        <p className="text-[15px] text-[#0F172A] tracking-tight whitespace-nowrap" style={{ fontWeight: 600, lineHeight: 1.2 }}>{kpi.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}

          <div className="flex gap-5 items-start">
            {/* ── LEFT PANEL ── */}
            <div className="flex-1 min-w-0">
              {activeTab === "dashboard" && (
                <DashboardTab vendor={vendor} cfg={cfg} formatCurrency={formatCurrency} formatDate={formatDate} />
              )}
              {activeTab === "partner_locations" && (
                <PartnerLocationsTab vendor={vendor} cfg={cfg} formatDate={formatDate} />
              )}
              {activeTab === "items" && (
                <PartnerItemsTab vendor={vendor} />
              )}
              {activeTab === "pricing_rules" && (
                <PricingRulesTabNew vendor={vendor} cfg={cfg} />
              )}
              {activeTab === "partner_communication" && (
                <PlaceholderTab label="Partner Communication" description="Manage communication channels and message history with this partner." icon={MessageSquare} />
              )}
              {activeTab === "global_contacts" && (
                <ContactsTab vendor={vendor} cfg={cfg} />
              )}
              {activeTab === "carrier_profile" && (
                <PlaceholderTab label="Carrier Profile" description="View and configure carrier profile details and shipping preferences." icon={Truck} />
              )}
              {activeTab === "payment_methods" && (
                <PaymentMethodsTab cfg={cfg} PAYMENT_TYPE_ICONS={PAYMENT_TYPE_ICONS} />
              )}
              {activeTab === "purchase_orders" && (
                <PlaceholderTab label="Purchase Orders" description="View and manage purchase orders placed with this partner." icon={Package} />
              )}
              {activeTab === "quotes" && (
                <PlaceholderTab label="Quotes" description="View and manage quotes received from or sent to this partner." icon={ClipboardList} />
              )}
              {activeTab === "sales_orders" && (
                <PlaceholderTab label="Sales Orders" description="View and manage sales orders associated with this partner." icon={Receipt} />
              )}
              {activeTab === "notes" && (
                <NotesTab vendor={vendor} cfg={cfg} />
              )}
              {activeTab === "attachments" && (
                <DocumentsTab />
              )}
              {activeTab === "recent_activity" && (
                <ActivityTab vendor={vendor} formatDate={formatDate} />
              )}
            </div>

            {/* ── RIGHT SIDEBAR (hidden on dashboard & partner_locations — info cards are inline) ── */}
            <div className={`w-[280px] xl:w-[300px] shrink-0 hidden lg:block space-y-4 ${activeTab !== "recent_activity" ? "!hidden" : ""}`}>
              {/* Partner Information Card */}
              <SidebarCard title="PARTNER INFORMATION">
                <div className="space-y-3">
                  {vendor.partnerGroup && (
                    <SidebarRow icon={Building2} label="Partner Group" value={vendor.partnerGroup} />
                  )}
                  {vendor.primaryContact.phone && (
                    <SidebarRow icon={Phone} label="Phone" value={vendor.primaryContact.phone} />
                  )}
                  {vendor.emailAddress && (
                    <SidebarRow icon={Mail} label="Email" value={vendor.emailAddress} />
                  )}
                  {vendor.website && (
                    <SidebarRow icon={Globe} label="Website" value={vendor.website} isLink />
                  )}
                  {vendor.billingAddress.street && (
                    <SidebarRow
                      icon={MapPin}
                      label="Address"
                      value={`${vendor.billingAddress.street}, ${vendor.billingAddress.city}${vendor.billingAddress.state ? `, ${vendor.billingAddress.state}` : ""} ${vendor.billingAddress.zipCode}, ${vendor.billingAddress.country}`}
                    />
                  )}
                </div>
              </SidebarCard>

              {/* Quick Stats */}
              <SidebarCard title="QUICK STATS">
                <div className="grid grid-cols-2 gap-2.5">
                  <StatBox label="Total Orders" value={String(vendor.totalOrders)} icon={ShoppingCart} />
                  <StatBox label="Total Spent" value={formatCurrency(vendor.totalSpent)} icon={TrendingUp} />
                  <StatBox label="Rating" value={vendor.rating > 0 ? `${vendor.rating}/5` : "N/A"} icon={Star} color="#F59E0B" />
                  <StatBox label="Credit Used" value={`${creditUtilization}%`} icon={DollarSign} color={creditUtilization > 80 ? "#DC2626" : creditUtilization > 50 ? "#D97706" : "#059669"} />
                </div>
              </SidebarCard>

              {/* Point of Contacts */}
              {vendor.globalPointOfContacts.length > 0 && (
                <SidebarCard title="POINT OF CONTACTS">
                  <div className="space-y-2">
                    {vendor.globalPointOfContacts.slice(0, 4).map((contact, idx) => {
                      const _at = getPocAvatarTint(contact.bgColor);
                      return (
                      <div key={idx} className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] shrink-0"
                          style={{ backgroundColor: _at.bg, color: _at.text, fontWeight: 700 }}
                        >
                          {contact.initials}
                        </div>
                        <span className="text-[12px] text-[#334155] truncate" style={{ fontWeight: 500 }}>{contact.name}</span>
                        {idx === 0 && (
                          <span className="text-[10px] text-[#0A77FF] px-1.5 py-0.5 rounded-md bg-[#EDF4FF] ml-auto shrink-0" style={{ fontWeight: 600 }}>PRIMARY</span>
                        )}
                      </div>
                      );
                    })}
                    {vendor.globalPointOfContacts.length > 4 && (
                      <button
                        onClick={() => setActiveTab("global_contacts")}
                        className="text-xs text-[#0A77FF] hover:text-[#0862D0] transition-colors cursor-pointer mt-1"
                        style={{ fontWeight: 500 }}
                      >
                        +{vendor.globalPointOfContacts.length - 4} more
                      </button>
                    )}
                  </div>
                </SidebarCard>
              )}

              {/* Partner Types */}
              <SidebarCard title="PARTNER TYPES">
                <div className="space-y-2">
                  {(vendor.partnerTypes || []).map((type) => (
                    <div key={type} className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded flex items-center justify-center ${type === "vendor" ? "bg-[#F0FDF4]" : "bg-[#EFF6FF]"}`}>
                        {type === "vendor" ? (
                          <Truck className="w-3 h-3 text-[#166534]" />
                        ) : (
                          <ShoppingCart className="w-3 h-3 text-[#1E40AF]" />
                        )}
                      </div>
                      <span className="text-[12px] text-[#334155]" style={{ fontWeight: 500 }}>
                        {type === "vendor" ? "Vendor" : "Customer"}
                      </span>
                    </div>
                  ))}
                  {cfg && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {(cfg.vendorSubTypes || []).map((st) => (
                        <span key={st} className="text-[10px] px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]" style={{ fontWeight: 500 }}>
                          {st.replace(/_/g, " ")}
                        </span>
                      ))}
                      {(cfg.customerSubTypes || []).map((st) => (
                        <span key={st} className="text-[10px] px-2 py-0.5 rounded-md bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]" style={{ fontWeight: 500 }}>
                          {st.replace(/_/g, " ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </SidebarCard>

              {/* Created Info */}
              <SidebarCard title="CREATED">
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Created By</p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] shrink-0"
                        style={{ backgroundColor: toAAAColor(vendor.createdByContact?.bgColor || "#6366f1"), fontWeight: 600 }}
                      >
                        {vendor.createdByContact?.initials || "?"}
                      </div>
                      <span className="text-[12px] text-[#334155]" style={{ fontWeight: 500 }}>{vendor.createdByContact?.name || "—"}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Created On</p>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span className="text-[12px] text-[#334155]" style={{ fontWeight: 500 }}>{formatDate(vendor.createdAt)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Last Updated</p>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                      <span className="text-[12px] text-[#334155]" style={{ fontWeight: 500 }}>{formatDate(vendor.updatedAt)}</span>
                    </div>
                  </div>
                </div>
              </SidebarCard>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Customize Widget Panel */}
      {activeTab === "dashboard" && (
        <DashboardCustomizePanel
          open={customizePanelOpen}
          onOpenChange={setCustomizePanelOpen}
          activeKpis={dashActiveKpis}
          onToggleKpi={handleToggleKpi}
          vendor={vendor}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
        />
      )}

      {/* ── Dialogs ── */}
      <AlertDialog open={archiveDialogOpen} onOpenChange={setArchiveDialogOpen}>
        <AlertDialogContent
          className="sm:max-w-[400px] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)]"
          onInteractOutside={() => setArchiveDialogOpen(false)}
        >
          <div className="relative flex flex-col items-center pt-10 pb-6" style={{ background: "linear-gradient(180deg, #FEF2F2 0%, rgba(254,242,242,0.3) 70%, transparent 100%)" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-[80px] rounded-full blur-[50px] opacity-25" style={{ backgroundColor: "#EF4444" }} />
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#FEE2E2" }}>
              <Archive className="w-8 h-8" style={{ color: "#DC2626" }} />
            </div>
            <span
              className="mt-4 px-3 py-1 rounded-full text-[11px]"
              style={{ fontWeight: 600, backgroundColor: "#FEF2F2", color: "#991B1B", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}
            >
              Caution
            </span>
          </div>
          <div className="flex flex-col items-center text-center px-8 pb-8">
            <AlertDialogHeader className="p-0 gap-0 text-center">
              <AlertDialogTitle className="text-[18px] tracking-[-0.02em]" style={{ fontWeight: 600, color: "#0F172A" }}>
                Archive this partner?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription className="text-[13px] mt-2 max-w-[300px] mx-auto" style={{ color: "#475569", lineHeight: "1.65" }}>
              <span style={{ fontWeight: 600, color: "#1E293B" }}>{vendor.displayName}</span>{" "}
              will be removed from active workflows. Historical records are preserved and you can unarchive later.
            </AlertDialogDescription>
            <div className="w-full mt-7 flex flex-col gap-2.5">
              <AlertDialogAction
                onClick={handleArchive}
                className="w-full h-11 text-[14px] rounded-xl border-0 cursor-pointer transition-colors hover:opacity-90"
                style={{ fontWeight: 600, backgroundColor: "#DC2626", color: "#fff" }}
              >
                Archive Partner
              </AlertDialogAction>
              <AlertDialogCancel
                className="w-full h-11 text-[14px] rounded-xl border-0 cursor-pointer transition-colors"
                style={{ fontWeight: 500, backgroundColor: "#F1F5F9", color: "#334155" }}
              >
                Cancel
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent
          className="sm:max-w-[400px] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)]"
          onInteractOutside={() => setDeleteDialogOpen(false)}
        >
          <div className="relative flex flex-col items-center pt-10 pb-6" style={{ background: "linear-gradient(180deg, #FEF2F2 0%, rgba(254,242,242,0.3) 70%, transparent 100%)" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[180px] h-[80px] rounded-full blur-[50px] opacity-25" style={{ backgroundColor: "#DC2626" }} />
            <div className="relative w-16 h-16 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "#FEE2E2" }}>
              <Trash2 className="w-8 h-8" style={{ color: "#DC2626" }} />
            </div>
            <span
              className="mt-4 px-3 py-1 rounded-full text-[11px]"
              style={{ fontWeight: 600, backgroundColor: "#FEF2F2", color: "#991B1B", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}
            >
              Danger
            </span>
          </div>
          <div className="flex flex-col items-center text-center px-8 pb-8">
            <AlertDialogHeader className="p-0 gap-0 text-center">
              <AlertDialogTitle className="text-[18px] tracking-[-0.02em]" style={{ fontWeight: 600, color: "#0F172A" }}>
                Delete permanently?
              </AlertDialogTitle>
            </AlertDialogHeader>
            <AlertDialogDescription className="text-[13px] mt-2 max-w-[300px] mx-auto" style={{ color: "#475569", lineHeight: "1.65" }}>
              <span style={{ fontWeight: 600, color: "#1E293B" }}>{vendor.displayName}</span>{" "}
              and all associated data will be permanently erased. This action cannot be undone.
            </AlertDialogDescription>
            <div className="w-full mt-7 flex flex-col gap-2.5">
              <AlertDialogAction
                onClick={handleDelete}
                className="w-full h-11 text-[14px] rounded-xl border-0 cursor-pointer transition-colors hover:opacity-90"
                style={{ fontWeight: 600, backgroundColor: "#DC2626", color: "#fff" }}
              >
                Delete Forever
              </AlertDialogAction>
              <AlertDialogCancel
                className="w-full h-11 text-[14px] rounded-xl border-0 cursor-pointer transition-colors"
                style={{ fontWeight: 500, backgroundColor: "#F1F5F9", color: "#334155" }}
              >
                Cancel
              </AlertDialogCancel>
            </div>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ══════════════════════════════════════════════
// PARTNER GROUP HOVER PILL WITH QUICK VIEW
// ═══════════════════════════���══════════════════

function PartnerGroupHoverPill({ group }: { group: { id: string; name: string; description: string; country: string; countryFlag: string; memberCount: number } }) {
  const [open, setOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback(() => {
    if (leaveTimer.current) {
      clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
    setOpen(true);
  }, []);

  const handleLeave = useCallback(() => {
    leaveTimer.current = setTimeout(() => setOpen(false), 150);
  }, []);

  return (
    <Popover open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
      <PopoverTrigger
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border border-[#E2E8F0] bg-[#F1F5F9] text-[#475569] cursor-default transition-colors hover:bg-[#E2E8F0]"
        style={{ fontWeight: 600 }}
      >
        <Star className="w-2.5 h-2.5 fill-[#94A3B8] text-[#94A3B8]" />
        {group.countryFlag} {group.name}
        <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 400 }}>· {group.memberCount}</span>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        sideOffset={6}
        className="p-0 w-auto border-0 shadow-none bg-transparent z-[200]"
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="w-[280px] rounded-xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-[#E2E8F0]/60">
          {/* Dark gradient header */}
          <div className="bg-gradient-to-br from-[#1E293B] to-[#334155] px-3.5 py-3 relative overflow-hidden">
            <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/[0.04]" />
            <div className="flex items-center justify-between relative">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0">{group.countryFlag}</span>
                <span className="text-white text-[13px] truncate" style={{ fontWeight: 600 }}>
                  {group.name}
                </span>
              </div>
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#0A77FF]/25 text-[#60A5FA] shrink-0"
                style={{ fontWeight: 600 }}
              >
                <Star className="w-2.5 h-2.5 fill-[#60A5FA]" /> Primary
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1.5 relative">
              {group.country} Region
            </p>
          </div>
          {/* Body */}
          <div className="bg-white px-3.5 py-3 space-y-3">
            <p className="text-[12px] text-[#475569] leading-relaxed line-clamp-3">
              {group.description}
            </p>
            <div className="flex items-center gap-4 pt-2 border-t border-[#F1F5F9]">
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                <Users className="w-3 h-3 text-[#94A3B8]" />
                <span style={{ fontWeight: 500 }}>{group.memberCount} partners</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                <Globe className="w-3 h-3 text-[#94A3B8]" />
                <span style={{ fontWeight: 500 }}>{group.country}</span>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ══════════════════════════════════════════════
// SIDEBAR HELPER COMPONENTS
// ══════════════════════════════════════════════

function SidebarCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    null
  );
}

function SidebarRow({ icon: Icon, label, value, isLink }: { icon: React.ElementType; label: string; value: string; isLink?: boolean }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="w-3.5 h-3.5 text-[#94A3B8] mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>{label}</p>
        {isLink ? (
          <a
            href={value.startsWith("http") ? value : `https://${value}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-[#0A77FF] hover:underline break-all"
            style={{ fontWeight: 500 }}
          >
            {value}
          </a>
        ) : (
          <p className="text-[12px] text-[#334155] break-words" style={{ fontWeight: 500 }}>{value}</p>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color?: string }) {
  return (
    <div className="rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3" style={{ color: color || "#94A3B8" }} />
        <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>{label}</span>
      </div>
      <p className="text-[14px] text-[#0F172A]" style={{ fontWeight: 700 }}>{value}</p>
    </div>
  );
}

// ══════════════════════════════════════════════
// CONTENT CARD WRAPPER
// ══════════════════════════════════════════════

function ContentCard({ title, icon: Icon, count, children, action }: {
  title: string;
  icon?: React.ElementType;
  count?: number;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-7 h-7 rounded-lg bg-[#EDF4FF] flex items-center justify-center shrink-0">
              <Icon className="w-3.5 h-3.5 text-[#0A77FF]" />
            </div>
          )}
          <span className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>{title}</span>
          {count != null && (
            <span className="text-[10px] text-[#0A77FF] px-1.5 py-0.5 rounded-md bg-[#EDF4FF]" style={{ fontWeight: 600 }}>{count}</span>
          )}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center" style={{ animation: "csFade 0.4s ease-out both" }}>
      <div className="relative mb-3">
        <div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center shadow-sm"
          style={{ animation: "csFloat 4s ease-in-out infinite" }}
        >
          <Icon className="w-5 h-5 text-[#94A3B8]" />
        </div>
      </div>
      <p className="text-[13px] text-[#334155] mb-0.5" style={{ fontWeight: 600 }}>{title}</p>
      <p className="text-[12px] text-[#94A3B8] max-w-xs leading-relaxed">{description}</p>
    </div>
  );
}

// ════════════════════════════════════════════��═
// CHART DATA
// ══════════════════════════════════════════════

const SPEND_TREND_DATA = [
  { month: "Jan", amount: 42000 },
  { month: "Feb", amount: 58000 },
  { month: "Mar", amount: 65000 },
  { month: "Apr", amount: 72000 },
  { month: "May", amount: 68000 },
  { month: "Jun", amount: 89000 },
  { month: "Jul", amount: 95000 },
  { month: "Aug", amount: 102000 },
  { month: "Sep", amount: 88000 },
  { month: "Oct", amount: 110000 },
  { month: "Nov", amount: 118000 },
  { month: "Dec", amount: 125000 },
];

const ORDER_ACTIVITY_DATA = [
  { day: "Mon", orders: 4, returns: 1 },
  { day: "Tue", orders: 7, returns: 2 },
  { day: "Wed", orders: 5, returns: 0 },
  { day: "Thu", orders: 8, returns: 1 },
  { day: "Fri", orders: 6, returns: 3 },
  { day: "Sat", orders: 3, returns: 0 },
  { day: "Sun", orders: 2, returns: 1 },
];

const PIE_COLORS = ["#0A77FF", "#7C3AED", "#059669", "#94A3B8"];

// ═════════════════════���════════════════════════
// TAB CONTENT COMPONENTS
// ═══════════════════════���══════════════════════

// ----- PLACEHOLDER TAB -----
function PlaceholderTab({ label, description, icon: Icon }: { label: string; description: string; icon?: React.ElementType }) {
  const DisplayIcon = Icon || FileText;
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden" style={{ minHeight: 400 }}>
      <div className="flex flex-col items-center justify-center w-full h-full py-24 px-6 text-center">
        {/* Animated icon */}
        <div className="relative mb-6">
          <div className="absolute inset-0 w-16 h-16 rounded-2xl bg-[#0A77FF]/5 animate-ping" style={{ animationDuration: "3s" }} />
          <div
            className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F8FAFC] to-[#EDF4FF] border border-[#E2E8F0] flex items-center justify-center shadow-sm"
            style={{ animation: "csFloat 4s ease-in-out infinite" }}
          >
            <DisplayIcon className="w-7 h-7 text-[#94A3B8]" />
          </div>
        </div>
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F1F5F9] border border-[#E2E8F0] mb-3"
          style={{ animation: "csFade 0.5s ease-out both", animationDelay: "0.1s" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#0A77FF] animate-pulse" />
          <span className="text-[11px] text-[#475569]" style={{ fontWeight: 600 }}>Coming Soon</span>
        </div>
        <h3
          className="text-[#0F172A] text-[16px] mb-1.5"
          style={{ fontWeight: 600, animation: "csFade 0.5s ease-out both", animationDelay: "0.2s" }}
        >
          {label}
        </h3>
        <p
          className="text-[#94A3B8] text-[13px] max-w-sm leading-relaxed"
          style={{ animation: "csFade 0.5s ease-out both", animationDelay: "0.3s" }}
        >
          {description}
        </p>
      </div>
      <style>{`
        @keyframes csFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        @keyframes csFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ----- Dashboard KPI DnD type -----
const DND_DASH_KPI = "DASH_KPI_CARD";

// ----- Dashboard KPI definitions (vendor-level) -----
interface DashKpiDef {
  key: string;
  label: string;
  category: string;
  iconName: string;
  subtitle: string;
}

const DASH_KPI_DEFS: DashKpiDef[] = [
  // Financial
  { key: "total_orders", label: "Total Orders", category: "Financial", iconName: "ShoppingCart", subtitle: "All purchase orders" },
  { key: "total_spent", label: "Total Spent", category: "Financial", iconName: "TrendingUp", subtitle: "Cumulative spend" },
  { key: "outstanding", label: "Outstanding", category: "Financial", iconName: "Package", subtitle: "Balance due" },
  { key: "avg_order_value", label: "Avg. Order Value", category: "Financial", iconName: "DollarSign", subtitle: "Per order average" },
  { key: "days_payable", label: "Days Payable", category: "Financial", iconName: "Calendar", subtitle: "Payment cycle length" },
  { key: "net_margin", label: "Net Margin", category: "Financial", iconName: "Percent", subtitle: "Profit margin %" },
  { key: "credit_limit", label: "Credit Limit", category: "Financial", iconName: "CreditCard", subtitle: "Total credit line" },
  // Operational
  { key: "last_order_date", label: "Last Order Date", category: "Operational", iconName: "Calendar", subtitle: "Most recent order" },
  { key: "payment_status", label: "Payment Status", category: "Operational", iconName: "CheckCircle2", subtitle: "Current payment state" },
  { key: "credit_utilization", label: "Credit Utilization", category: "Operational", iconName: "Shield", subtitle: "Used vs limit" },
  { key: "on_time_rate", label: "On-Time Delivery", category: "Operational", iconName: "Truck", subtitle: "Delivery performance" },
  { key: "rating", label: "Vendor Rating", category: "Operational", iconName: "Star", subtitle: "Performance score" },
  { key: "total_locations", label: "Total Locations", category: "Operational", iconName: "MapPin", subtitle: "Partner locations" },
  { key: "return_rate", label: "Return Rate", category: "Operational", iconName: "RotateCcw", subtitle: "Returns percentage" },
];

const DEFAULT_DASH_KPIS = [
  "total_orders", "total_spent", "outstanding", "avg_order_value", "days_payable",
  "last_order_date", "payment_status", "credit_utilization",
];

function computeDashKpiValue(
  key: string,
  vendor: Vendor,
  formatCurrency: (v: number) => string,
  formatDate: (d: string) => string,
): { value: string; change?: string; changeColor?: string } {
  const creditPct = vendor.creditLimit > 0
    ? Math.round((vendor.creditUtilization / vendor.creditLimit) * 100)
    : 0;
  switch (key) {
    case "total_orders": return { value: String(vendor.totalOrders) };
    case "total_spent": return { value: formatCurrency(vendor.totalSpent) };
    case "outstanding": return { value: formatCurrency(vendor.outstandingBalance) };
    case "avg_order_value": return {
      value: formatCurrency(vendor.totalOrders > 0 ? vendor.totalSpent / vendor.totalOrders : 0),
      change: "↘ $240", changeColor: "#EF4444",
    };
    case "days_payable": return { value: "23 Days" };
    case "net_margin": return { value: `${(vendor.netProfitMargin ?? 0).toFixed(2)}%` };
    case "credit_limit": return { value: formatCurrency(vendor.creditLimit) };
    case "last_order_date": return { value: formatDate(vendor.updatedAt) };
    case "payment_status": return { value: "—" };
    case "credit_utilization": return { value: `${creditPct}%`, change: "↗ 3.7%", changeColor: "#059669" };
    case "on_time_rate": return { value: "94.2%" };
    case "rating": return { value: `${vendor.rating.toFixed(1)} / 5` };
    case "total_locations": return { value: String(vendor.partnerLocations?.length ?? 0) };
    case "return_rate": return { value: "2.1%" };
    default: return { value: "–" };
  }
}

function DashKpiIcon({ name, className, style }: { name: string; className?: string; style?: React.CSSProperties }) {
  const p = { className, style };
  switch (name) {
    case "ShoppingCart": return <ShoppingCart {...p} />;
    case "TrendingUp": return <TrendingUp {...p} />;
    case "Package": return <Package {...p} />;
    case "DollarSign": return <DollarSign {...p} />;
    case "Calendar": return <Calendar {...p} />;
    case "Percent": return <Percent {...p} />;
    case "CreditCard": return <CreditCard {...p} />;
    case "CheckCircle2": return <CheckCircle2 {...p} />;
    case "Shield": return <Shield {...p} />;
    case "Truck": return <Truck {...p} />;
    case "Star": return <Star {...p} />;
    case "MapPin": return <MapPin {...p} />;
    case "RotateCcw": return <RotateCcw {...p} />;
    case "Users": return <Users {...p} />;
    case "Globe": return <Globe {...p} />;
    case "Wrench": return <Wrench {...p} />;
    default: return <ChartColumn {...p} />;
  }
}

// ----- Dashboard Customize Widget Panel -----
function DashboardCustomizePanel({ open, onOpenChange, activeKpis, onToggleKpi, vendor, formatCurrency, formatDate }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeKpis: string[];
  onToggleKpi: (key: string) => void;
  vendor: Vendor;
  formatCurrency: (v: number) => string;
  formatDate: (d: string) => string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
      timeoutRef.current = setTimeout(() => setMounted(false), 280);
    }
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [open]);

  const categories = useMemo(() => {
    const catMap = new Map<string, DashKpiDef[]>();
    for (const kpi of DASH_KPI_DEFS) {
      if (!searchQuery || kpi.label.toLowerCase().includes(searchQuery.toLowerCase()) || kpi.category.toLowerCase().includes(searchQuery.toLowerCase())) {
        if (!catMap.has(kpi.category)) catMap.set(kpi.category, []);
        catMap.get(kpi.category)!.push(kpi);
      }
    }
    return Array.from(catMap, ([name, kpis]) => ({ name, kpis }));
  }, [searchQuery]);

  if (!mounted) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] transition-opacity duration-[250ms] ease-in-out"
        style={{
          backgroundColor: visible ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0)",
          pointerEvents: visible ? "auto" : "none",
        }}
        onClick={() => onOpenChange(false)}
      />
      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-[200] w-full max-w-[400px] bg-white flex flex-col shadow-2xl transition-transform duration-[280ms] ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: visible ? "translateX(0)" : "translateX(100%)" }}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-0 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#EDF4FF" }}
              >
                <Sliders className="w-5 h-5" style={{ color: "#0A77FF" }} />
              </div>
              <div>
                <h2 className="text-base text-foreground" style={{ fontWeight: 600 }}>
                  Customize Widgets
                </h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  Manage your dashboard KPI widgets.
                </p>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="p-1.5 rounded-md hover:bg-muted/50 transition-colors cursor-pointer -mt-0.5 -mr-1"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          {/* Toggle all widgets */}
          <div className="flex items-center justify-between mt-4 px-1">
            <span className="text-[12px] text-muted-foreground" style={{ fontWeight: 500 }}>
              {activeKpis.length} of {DASH_KPI_DEFS.length} widgets active
            </span>
            <button
              onClick={() => {
                const allKeys = DASH_KPI_DEFS.map(k => k.key);
                const allActive = allKeys.every(k => activeKpis.includes(k));
                if (allActive) {
                  activeKpis.forEach(k => onToggleKpi(k));
                } else {
                  allKeys.filter(k => !activeKpis.includes(k)).forEach(k => onToggleKpi(k));
                }
              }}
              className={`flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-full border transition-all duration-200 cursor-pointer ${
                DASH_KPI_DEFS.every(k => activeKpis.includes(k.key))
                  ? "bg-[#EBF3FF] border-[#0A77FF]/25 text-[#0A77FF] hover:bg-[#DCEAFF] hover:border-[#0A77FF]/40 shadow-sm shadow-[#0A77FF]/10"
                  : activeKpis.length === 0
                  ? "bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] hover:bg-[#F1F5F9] hover:border-[#CBD5E1] hover:text-[#64748B]"
                  : "bg-[#F8FAFC] border-[#E2E8F0] text-[#64748B] hover:bg-[#EBF3FF] hover:border-[#0A77FF]/25 hover:text-[#0A77FF]"
              }`}
              style={{ fontWeight: 600 }}
            >
              {DASH_KPI_DEFS.every(k => activeKpis.includes(k.key)) ? (
                <>
                  <ToggleRight className="w-4 h-4 text-[#0A77FF]" />
                  <span>All On</span>
                </>
              ) : activeKpis.length === 0 ? (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  <span>All Off</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4" />
                  <span>Enable All</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 pt-3.5 pb-1 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none" />
            <input
              placeholder="Search metrics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-3 rounded-lg border border-border bg-white text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-colors"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-hide">
          {categories.length === 0 && (
            <div className="flex flex-col items-center py-12 text-muted-foreground">
              <Search className="w-5 h-5 mb-2 opacity-40" />
              <p className="text-xs text-muted-foreground/60">No metrics found</p>
            </div>
          )}
          {categories.map((cat) => (
            <div key={cat.name} className="mt-5 first:mt-4">
              {/* Category Header */}
              <div className="flex items-center gap-1.5 mb-2">
                {cat.name === "Financial" ? <DollarSign className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                <span
                  className="text-[12px] text-muted-foreground/70 uppercase tracking-wide"
                  style={{ fontWeight: 600 }}
                >
                  {cat.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cat.kpis.map((kpi) => {
                  const isActive = activeKpis.includes(kpi.key);
                  const computed = computeDashKpiValue(kpi.key, vendor, formatCurrency, formatDate);
                  return (
                    <button
                      key={kpi.key}
                      onClick={() => onToggleKpi(kpi.key)}
                      className={`relative text-left rounded-lg border px-3 py-2.5 transition-all duration-150 cursor-pointer group ${
                        isActive
                          ? "border-[#0A77FF]/25 bg-[#0A77FF]/[0.04] shadow-[0_0_0_1px_rgba(10,119,255,0.08)]"
                          : "border-border/60 bg-white hover:border-border hover:bg-muted/20 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[11.5px] truncate transition-colors ${
                            isActive ? "text-[#0A77FF]" : "text-muted-foreground/70"
                          }`}
                          style={{ fontWeight: 500 }}
                          title={kpi.label}
                        >
                          {kpi.label}
                        </span>
                        <div className="shrink-0">
                          {isActive ? (
                            <Check className="w-3.5 h-3.5" style={{ color: "#0A77FF" }} />
                          ) : (
                            <Plus className="w-3.5 h-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/50 transition-colors" />
                          )}
                        </div>
                      </div>
                      <p
                        className={`text-[15px] mt-1 transition-colors ${
                          isActive ? "text-foreground" : "text-foreground/80"
                        }`}
                        style={{ fontWeight: 550 }}
                      >
                        {computed.value}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ----- DASHBOARD TAB (was Overview) -----
function DashboardTab({ vendor, cfg, formatCurrency, formatDate }: {
  vendor: Vendor;
  cfg?: VendorConfigData;
  formatCurrency: (val: number) => string;
  formatDate: (dateStr: string) => string;
}) {
  const creditPct = getCreditUtilizationPct(vendor);
  const available = vendor.creditLimit - vendor.creditUtilization;
  const spendCategories = [
    { name: "Services", value: Math.round(vendor.totalSpent * 0.4), pct: 40 },
    { name: "Materials", value: Math.round(vendor.totalSpent * 0.3), pct: 30 },
    { name: "Equipment", value: Math.round(vendor.totalSpent * 0.2), pct: 20 },
    { name: "Other", value: Math.round(vendor.totalSpent * 0.1), pct: 10 },
  ];

  const totalCashIn = Math.round(vendor.totalSpent * 0.45);
  const totalCashOut = Math.round(vendor.totalSpent * 0.52);
  const partnerGroupData = PARTNER_GROUPS.find((g) => g.id === vendor.partnerGroup);
  const paymentTermCfg = cfg?.paymentTermConfig;
  const [ptDetailOpen, setPtDetailOpen] = useState(false);
  const [ptDetailTerm, setPtDetailTerm] = useState<PaymentTermPreset | null>(null);
  const creditStatusLabel = creditPct > 80 ? "Critical" : creditPct > 50 ? "Warning" : "Healthy";
  const creditStatusColor = creditPct > 80 ? "#DC2626" : creditPct > 50 ? "#D97706" : "#059669";
  const creditBarColor = creditPct > 80 ? "#FEE2E2" : creditPct > 50 ? "#FEF3C7" : "#D1FAE5";

  return (
    <>
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4 items-start">

      {/* ═══ LEFT COLUMN — Charts & Widgets ═══ */}
      <div className="space-y-4 min-w-0">

        {/* Spend Trend */}
        <ContentCard title="Spend Trend" icon={TrendingUp} action={
          <span className="text-[11px] text-[#94A3B8]" style={{ fontWeight: 500 }}>This Year</span>
        }>
          <div className="h-[220px] -ml-2">
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={SPEND_TREND_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs key="area-defs">
                  <linearGradient id="spendGradientUniq" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0A77FF" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#0A77FF" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid key="area-grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis key="area-x" dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis key="area-y" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <ReTooltip
                  key="area-tooltip"
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                  formatter={(val: number) => [`$${val.toLocaleString()}`, "Spend"]}
                />
                <Area key="area-amount" type="monotone" dataKey="amount" stroke="#0A77FF" strokeWidth={2} fill="url(#spendGradientUniq)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>

        {/* Order Activity */}
        <ContentCard title="Order Activity" icon={BarChart3} action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0A77FF]" />
              <span className="text-[11px] text-[#64748B]" style={{ fontWeight: 500 }}>Orders</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span className="text-[11px] text-[#64748B]" style={{ fontWeight: 500 }}>Returns</span>
            </div>
          </div>
        }>
          <div className="h-[220px] -ml-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ORDER_ACTIVITY_DATA} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid key="bar-grid" strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                <XAxis key="bar-x" dataKey="day" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis key="bar-y" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <ReTooltip
                  key="bar-tooltip"
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.08)", fontSize: 12 }}
                />
                <Bar key="bar-orders" dataKey="orders" fill="#0A77FF" radius={[4, 4, 0, 0]} barSize={24} name="Orders" />
                <Bar key="bar-returns" dataKey="returns" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={24} name="Returns" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ContentCard>

        {/* Spend by Category + Credit Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ContentCard title="Spend by Category" icon={PieChart}>
            <div className="flex flex-col items-center gap-4">
              <div className="w-[150px] h-[150px] shrink-0 relative">
                <RePieChart width={150} height={150}>
                  <Pie key="pie-spend" data={spendCategories} cx="50%" cy="50%" innerRadius={46} outerRadius={70} paddingAngle={2} dataKey="value" stroke="none">
                    {spendCategories.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </RePieChart>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[13px] text-[#0F172A]" style={{ fontWeight: 700 }}>{formatCurrency(vendor.totalSpent)}</span>
                </div>
              </div>
              <div className="w-full space-y-2">
                {spendCategories.map((cat, idx) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx] }} />
                      <span className="text-[12px] text-[#475569]" style={{ fontWeight: 500 }}>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{formatCurrency(cat.value)}</span>
                      <span className="text-[11px] text-[#94A3B8] w-8 text-right" style={{ fontWeight: 500 }}>{cat.pct}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ContentCard>

          <ContentCard title="Credit Health" icon={Shield}>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-[#475569]" style={{ fontWeight: 500 }}>Credit Utilization</span>
                  <span className="text-[13px] text-[#0F172A]" style={{ fontWeight: 700 }}>{creditPct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(creditPct, 100)}%`, backgroundColor: creditPct > 80 ? "#DC2626" : creditPct > 50 ? "#D97706" : "#059669" }} />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>$0</span>
                  <span className="text-[10px]" style={{ fontWeight: 500, color: creditStatusColor }}>{creditStatusLabel}</span>
                  <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>{formatCurrency(vendor.creditLimit)}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-[#F1F5F9]">
                <div>
                  <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Available</p>
                  <p className="text-[14px] text-[#0F172A]" style={{ fontWeight: 700 }}>{formatCurrency(Math.max(available, 0))}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Used</p>
                  <p className="text-[14px] text-[#0F172A]" style={{ fontWeight: 700 }}>{formatCurrency(vendor.creditUtilization)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Limit</p>
                  <p className="text-[14px] text-[#0F172A]" style={{ fontWeight: 700 }}>{formatCurrency(vendor.creditLimit)}</p>
                </div>
              </div>
            </div>
          </ContentCard>
        </div>

        {/* About this Partner */}
        <ContentCard title="About this Partner" icon={Info}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <DetailRow label="Company Name" value={vendor.companyName} />
            <DetailRow label="Partner Code" value={vendor.code} mono />
            <DetailRow label="Category" value={CATEGORY_LABELS[vendor.category]} />
            <DetailRow label="Vendor Type" value={vendor.vendorType || "—"} />
            <DetailRow label="Services" value={vendor.services || "—"} />
            <DetailRow label="Tax ID" value={vendor.taxId || "—"} mono />
            <DetailRow label="Country" value={`${vendor.countryFlag} ${vendor.country}`} />
            <DetailRow label="Payment Terms" value={PAYMENT_TERMS_LABELS[vendor.paymentTerms]} />
            {(vendor.description || cfg?.description) && (
              <div className="sm:col-span-2">
                <p className="text-[10px] text-[#94A3B8] mb-0.5" style={{ fontWeight: 500 }}>Description</p>
                <p className="text-[12px] text-[#334155] leading-relaxed">{vendor.description || cfg?.description || "—"}</p>
              </div>
            )}
          </div>
        </ContentCard>

        {/* Primary Contact */}
        <ContentCard title="Primary Contact" icon={Users}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F1F5F9] flex items-center justify-center shrink-0">
              <span className="text-xs text-[#475569]" style={{ fontWeight: 600 }}>
                {vendor.primaryContact.name.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>{vendor.primaryContact.name}</p>
              <p className="text-[11px] text-[#64748B] mt-0.5">{vendor.primaryContact.designation}</p>
              <Separator className="my-2" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <div className="flex items-center gap-1.5 text-[12px] text-[#334155]">
                  <Mail className="w-3 h-3 text-[#94A3B8]" />
                  {vendor.primaryContact.email || "—"}
                </div>
                <div className="flex items-center gap-1.5 text-[12px] text-[#334155]">
                  <Phone className="w-3 h-3 text-[#94A3B8]" />
                  {vendor.primaryContact.phone || "—"}
                </div>
              </div>
            </div>
          </div>
        </ContentCard>

        {/* Notes */}
        {vendor.notes && (
          <ContentCard title="Notes" icon={MessageSquare}>
            <p className="text-[12px] text-[#475569] leading-relaxed">{vendor.notes}</p>
          </ContentCard>
        )}
      </div>

      {/* ═══ RIGHT COLUMN — Information Cards ═══ */}
      <div className="space-y-3.5 min-w-0 overflow-hidden">

        {/* Partner Information */}
        <DashInfoCard title="Partner Information" icon={Building2}>
          {partnerGroupData && (
            <div className="mb-3">
              <DashInfoLabel>Partner Group</DashInfoLabel>
              <p className="text-[12.5px] text-[#0F172A] truncate" style={{ fontWeight: 600 }}>
                {partnerGroupData.id} <span className="text-[#64748B]" style={{ fontWeight: 400 }}>•</span> {partnerGroupData.name}
              </p>
              <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed line-clamp-2">{partnerGroupData.description}</p>
            </div>
          )}
          {!partnerGroupData && vendor.partnerGroup && (
            <div className="mb-3">
              <DashInfoLabel>Partner Group</DashInfoLabel>
              <p className="text-[12.5px] text-[#0F172A]" style={{ fontWeight: 600 }}>{vendor.partnerGroup}</p>
            </div>
          )}
          <div className="mb-3">
            <DashInfoLabel>Partner Type</DashInfoLabel>
            <div className="flex items-center gap-1.5 mt-1">
              {vendor.partnerTypes.map((t) => (
                <span key={t} className={`text-[11px] px-2.5 py-1 rounded-md border ${t === "vendor" ? "bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]" : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]"}`} style={{ fontWeight: 500 }}>
                  {t === "vendor" ? "Vendor" : "Customer"}
                </span>
              ))}
            </div>
            {cfg && (cfg.vendorSubTypes?.length || cfg.customerSubTypes?.length) ? (
              <div className="flex flex-wrap gap-1 mt-2">
                {(cfg.vendorSubTypes || []).map((st) => (
                  <span key={st} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]" style={{ fontWeight: 500 }}>{st.replace(/_/g, " ")}</span>
                ))}
                {(cfg.customerSubTypes || []).map((st) => (
                  <span key={st} className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] border border-[#E2E8F0]" style={{ fontWeight: 500 }}>{st.replace(/_/g, " ")}</span>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-2.5">
            <div className="min-w-0">
              <DashInfoLabel>Email</DashInfoLabel>
              <p className="text-[12px] text-[#334155] truncate" style={{ fontWeight: 500 }}>{vendor.emailAddress || "—"}</p>
            </div>
            <div className="min-w-0">
              <DashInfoLabel>Website</DashInfoLabel>
              <p className="text-[12px] text-[#334155] truncate" style={{ fontWeight: 500 }}>{vendor.website || "—"}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 mb-2.5">
            <div className="min-w-0">
              <DashInfoLabel>Phone Number</DashInfoLabel>
              <p className="text-[12px] text-[#334155] truncate" style={{ fontWeight: 500 }}>{vendor.primaryContact.phone || "—"}</p>
            </div>
            <div className="min-w-0">
              <DashInfoLabel>Category</DashInfoLabel>
              <p className="text-[12px] text-[#334155] truncate" style={{ fontWeight: 500 }}>{CATEGORY_LABELS[vendor.category]}</p>
            </div>
          </div>
          {vendor.billingAddress.street && (
            <div className="mb-2.5">
              <DashInfoLabel>Address</DashInfoLabel>
              <p className="text-[12px] text-[#334155]" style={{ fontWeight: 500 }}>
                {vendor.billingAddress.street}, {vendor.billingAddress.city}
                {vendor.billingAddress.state ? `, ${vendor.billingAddress.state}` : ""}{" "}
                {vendor.billingAddress.zipCode}, {vendor.billingAddress.country}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-x-4 pt-2.5 border-t border-[#F1F5F9]">
            <div className="min-w-0">
              <DashInfoLabel>Created By</DashInfoLabel>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] shrink-0" style={{ backgroundColor: toAAAColor(vendor.createdByContact?.bgColor || "#6366f1"), fontWeight: 600 }}>
                  {vendor.createdByContact?.initials || "?"}
                </div>
                <span className="text-[12px] text-[#334155] truncate" style={{ fontWeight: 500 }}>{vendor.createdByContact?.name || "—"}</span>
              </div>
            </div>
            <div className="min-w-0">
              <DashInfoLabel>Last Updated</DashInfoLabel>
              <p className="text-[12px] text-[#334155] mt-0.5 truncate" style={{ fontWeight: 500 }}>{formatDate(vendor.updatedAt)}</p>
            </div>
          </div>
        </DashInfoCard>

        {/* Financial Overview */}
        <DashInfoCard title="Financial Overview" icon={Wallet}>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            <div className="min-w-0">
              <DashInfoLabel>Currency</DashInfoLabel>
              <p className="text-[12.5px] text-[#0F172A]" style={{ fontWeight: 600 }}>USD ($)</p>
            </div>
            <div className="min-w-0">
              <DashInfoLabel>Rating</DashInfoLabel>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-[#F59E0B] fill-[#F59E0B] shrink-0" />
                <span className="text-[12.5px] text-[#0F172A]" style={{ fontWeight: 600 }}>{vendor.rating.toFixed(1)} / 5</span>
              </div>
            </div>
            <div className="min-w-0">
              <DashInfoLabel>Pay To</DashInfoLabel>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-5 h-5 rounded-full bg-[#F1F5F9] flex items-center justify-center shrink-0">
                  <Globe className="w-3 h-3 text-[#64748B]" />
                </div>
                <span className="text-[12px] text-[#334155] truncate" style={{ fontWeight: 500 }}>{vendor.companyName}</span>
              </div>
            </div>
            <div className="min-w-0">
              <DashInfoLabel>Ship To</DashInfoLabel>
              <p className="text-[12px] text-[#334155] truncate" style={{ fontWeight: 500 }}>
                {vendor.billingAddress.street || "—"}
              </p>
            </div>
          </div>
        </DashInfoCard>

        {/* Cash Flow */}
        <DashInfoCard title="Cash Flow" icon={Banknote}>
          <div className="space-y-3">
            <div>
              <DashInfoLabel>Total Cash In Flow</DashInfoLabel>
              <p className="text-[16px] text-[#059669]" style={{ fontWeight: 700 }}>{formatCurrency(totalCashIn)}</p>
            </div>
            <div>
              <DashInfoLabel>Total Cash Out Flow</DashInfoLabel>
              <p className="text-[16px] text-[#DC2626]" style={{ fontWeight: 700 }}>{formatCurrency(totalCashOut)}</p>
            </div>
            <div className="pt-2.5 border-t border-[#F1F5F9]">
              <DashInfoLabel>Outstanding Payables</DashInfoLabel>
              <div className="flex items-baseline gap-2">
                <p className="text-[16px] text-[#0F172A]" style={{ fontWeight: 700 }}>{formatCurrency(vendor.outstandingBalance)}</p>
                <button className="text-[11px] text-[#0A77FF] hover:underline cursor-pointer" style={{ fontWeight: 500 }}>Invoice Details</button>
              </div>
            </div>
          </div>
        </DashInfoCard>

        {/* Credit Limits & Utilization */}
        <DashInfoCard title="Credit Limits" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-x-4 mb-3">
            <div className="min-w-0">
              <DashInfoLabel>Credit Limit</DashInfoLabel>
              <p className="text-[16px] text-[#0F172A] truncate" style={{ fontWeight: 700 }}>{formatCurrency(vendor.creditLimit)}</p>
            </div>
            <div className="min-w-0">
              <DashInfoLabel>Utilization</DashInfoLabel>
              <p className="text-[16px] text-[#0F172A] truncate" style={{ fontWeight: 700 }}>{formatCurrency(vendor.creditUtilization)}</p>
            </div>
          </div>
          <div className="w-full h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: "#F1F5F9" }}>
            <div className="h-full rounded-full transition-all flex items-center justify-start pl-2" style={{ width: `${Math.max(Math.min(creditPct, 100), 8)}%`, backgroundColor: creditBarColor }}>
              <span className="text-[9px] text-[#334155] whitespace-nowrap" style={{ fontWeight: 600 }}>{creditPct}%</span>
            </div>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>0%</span>
            <span className="text-[10px]" style={{ fontWeight: 500, color: creditStatusColor }}>{creditStatusLabel}</span>
            <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>100%</span>
          </div>
        </DashInfoCard>

        {/* Payment Terms */}
        <DashInfoCard title="Payment Terms" icon={Receipt}>
          {paymentTermCfg ? (
            <div className="rounded-lg border border-[#E2E8F0] p-3">
              <div className="flex items-start gap-2.5">
                <span className="text-[10px] px-2 py-1 rounded-md bg-[#EDF4FF] text-[#0A77FF] shrink-0 uppercase" style={{ fontWeight: 700 }}>
                  {paymentTermCfg.type === "prepayment" ? "Pre" : "NET"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{paymentTermCfg.name}</p>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B]" style={{ fontWeight: 500 }}>
                      {paymentTermCfg.trigger.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] mt-0.5 leading-relaxed">{paymentTermCfg.description}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const matchedPreset = PAYMENT_TERM_PRESETS.find((p) => p.name === paymentTermCfg.name) || {
                    id: "pt-cfg",
                    name: paymentTermCfg.name,
                    category: (paymentTermCfg.type === "prepayment" ? "prepayment" : "net") as "net" | "prepayment" | "split",
                    typeBadge: paymentTermCfg.type === "prepayment" ? "Pre" : "NET",
                    badgeColor: paymentTermCfg.type === "prepayment" ? "#7C3AED" : "#0A77FF",
                    trigger: paymentTermCfg.trigger.replace(/_/g, " "),
                    description: paymentTermCfg.description,
                    vendorsApplied: 4,
                  };
                  setPtDetailTerm(matchedPreset);
                  setPtDetailOpen(true);
                }}
                className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 h-7 rounded-md border border-[#E2E8F0] bg-white text-[11px] text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                <Eye className="w-3 h-3" />
                View details
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-[#E2E8F0] p-3">
              <div className="flex items-start gap-2.5">
                <span className="text-[10px] px-2 py-1 rounded-md bg-[#EDF4FF] text-[#0A77FF] shrink-0 uppercase" style={{ fontWeight: 700 }}>NET</span>
                <div className="min-w-0">
                  <p className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{PAYMENT_TERMS_LABELS[vendor.paymentTerms]}</p>
                  <p className="text-[11px] text-[#64748B] mt-0.5">Standard payment terms for this partner.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  const termLabel = PAYMENT_TERMS_LABELS[vendor.paymentTerms];
                  const matchedPreset = PAYMENT_TERM_PRESETS.find((p) => p.name === termLabel) || {
                    id: "pt-default",
                    name: termLabel,
                    category: "net" as const,
                    typeBadge: "NET",
                    badgeColor: "#0A77FF",
                    trigger: "Invoice Date",
                    description: "Standard payment terms for this partner.",
                    vendorsApplied: 3,
                  };
                  setPtDetailTerm(matchedPreset);
                  setPtDetailOpen(true);
                }}
                className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 h-7 rounded-md border border-[#E2E8F0] bg-white text-[11px] text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all cursor-pointer"
                style={{ fontWeight: 500 }}
              >
                <Eye className="w-3 h-3" />
                View details
              </button>
            </div>
          )}
        </DashInfoCard>

        {/* Carrier & Shipping */}
        <DashInfoCard title="Carrier & Shipping" icon={Truck} defaultOpen={false}>
          <div className="space-y-2.5">
            <div className="rounded-lg border border-[#E2E8F0] p-3">
              <p className="text-[10px] text-[#94A3B8] mb-1.5" style={{ fontWeight: 500 }}>Default Carrier (Vendor)</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-[#0A77FF]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{vendor.defaultCarrierVendor || "—"}</p>
                  <p className="text-[10.5px] text-[#64748B]">For fastest delivery</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF] shrink-0" style={{ fontWeight: 600 }}>Default</span>
              </div>
            </div>
            <div className="rounded-lg border border-[#E2E8F0] p-3">
              <p className="text-[10px] text-[#94A3B8] mb-1.5" style={{ fontWeight: 500 }}>Default Carrier (Customer)</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0">
                  <Truck className="w-4 h-4 text-[#7C3AED]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{vendor.defaultCarrierCustomer || "—"}</p>
                  <p className="text-[10.5px] text-[#64748B]">For customer shipments</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF] shrink-0" style={{ fontWeight: 600 }}>Default</span>
              </div>
            </div>
          </div>
        </DashInfoCard>

        {/* Partner Locations (compact) */}
        {vendor.partnerLocations.length > 0 && (
          <DashInfoCard title="Partner Locations" icon={MapPin} count={vendor.partnerLocations.length} defaultOpen={false}>
            <div className="space-y-1.5">
              {vendor.partnerLocations.slice(0, 6).map((loc, idx) => (
                <div key={idx} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#F8FAFC] border border-[#F1F5F9]">
                  <div className="w-4 h-4 rounded bg-[#EDF4FF] flex items-center justify-center shrink-0">
                    <Building2 className="w-2.5 h-2.5 text-[#0A77FF]" />
                  </div>
                  <span className="text-[11px] text-[#334155]" style={{ fontWeight: 500 }}>{loc}</span>
                </div>
              ))}
              {vendor.partnerLocations.length > 6 && (
                <p className="text-[11px] text-[#0A77FF] text-center pt-1 cursor-pointer hover:underline" style={{ fontWeight: 500 }}>
                  +{vendor.partnerLocations.length - 6} more locations
                </p>
              )}
            </div>
          </DashInfoCard>
        )}

        {/* Point of Contacts (compact) */}
        {vendor.globalPointOfContacts.length > 0 && (
          <DashInfoCard title="Point of Contacts" icon={Users} count={vendor.globalPointOfContacts.length} defaultOpen={false}>
            <div className="space-y-2">
              {vendor.globalPointOfContacts.slice(0, 5).map((contact, idx) => {
                const _at = getPocAvatarTint(contact.bgColor);
                return (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] shrink-0" style={{ backgroundColor: _at.bg, color: _at.text, fontWeight: 700 }}>
                    {contact.initials}
                  </div>
                  <span className="text-[11.5px] text-[#334155]" style={{ fontWeight: 500 }}>{contact.name}</span>
                  {idx === 0 && (
                    <span className="text-[9px] text-[#0A77FF] px-1.5 py-0.5 rounded-md bg-[#EDF4FF] ml-auto shrink-0" style={{ fontWeight: 600 }}>PRIMARY</span>
                  )}
                </div>
                );
              })}
              {vendor.globalPointOfContacts.length > 5 && (
                <p className="text-[11px] text-[#0A77FF] text-center pt-0.5 cursor-pointer hover:underline" style={{ fontWeight: 500 }}>
                  +{vendor.globalPointOfContacts.length - 5} more contacts
                </p>
              )}
            </div>
          </DashInfoCard>
        )}
      </div>
    </div>

    {/* Payment Term Detail Modal */}
    <PaymentTermDetailModal
      term={ptDetailTerm}
      open={ptDetailOpen}
      onClose={() => { setPtDetailOpen(false); setPtDetailTerm(null); }}
    />
    </>
  );
}

/* ── Collapsible info card for dashboard right column ── */
function DashInfoCard({ title, icon: Icon, count, children, defaultOpen = true }: {
  title: string; icon?: React.ElementType; count?: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.scrollHeight);
    }
  }, [children]);

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      <button
        type="button"
        className="w-full px-3.5 py-2.5 flex items-center gap-2 cursor-pointer hover:bg-[#FAFBFC] transition-colors"
        style={{ borderBottom: isOpen ? "1px solid #F1F5F9" : "none" }}
        onClick={() => setIsOpen((v) => !v)}
      >
        {Icon && (
          <div className="w-6 h-6 rounded-md bg-[#EDF4FF] flex items-center justify-center shrink-0">
            <Icon className="w-3 h-3 text-[#0A77FF]" />
          </div>
        )}
        <span className="text-[12px] text-[#0F172A] text-left" style={{ fontWeight: 600 }}>{title}</span>
        {count != null && (
          <span className="text-[10px] text-[#0A77FF] px-1.5 py-0.5 rounded-md bg-[#EDF4FF]" style={{ fontWeight: 600 }}>{count}</span>
        )}
        <ChevronDown
          className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 ml-auto transition-transform duration-200"
          style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{
          maxHeight: isOpen ? (contentHeight != null ? contentHeight + 24 + "px" : "1000px") : "0px",
          opacity: isOpen ? 1 : 0,
        }}
      >
        <div ref={contentRef} className="px-3.5 py-3">{children}</div>
      </div>
    </div>
  );
}

/* ── Small label for dashboard info fields ── */
function DashInfoLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-[#94A3B8] mb-px" style={{ fontWeight: 500 }}>{children}</p>;
}

function DraggableKpiCard({ index, kpiKey, label, value, subtitle, iconName, change, changeColor, moveCard, onRemove }: {
  index: number; kpiKey: string; label: string; value: string; subtitle?: string; iconName?: string;
  change?: string; changeColor?: string; moveCard: (from: number, to: number) => void; onRemove?: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag, preview] = useDrag({
    type: DND_DASH_KPI,
    item: () => ({ index }),
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: DND_DASH_KPI,
    hover(item: { index: number }, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      const hoverRect = ref.current.getBoundingClientRect();
      const hoverMiddleX = (hoverRect.right - hoverRect.left) / 2;
      const hoverMiddleY = (hoverRect.bottom - hoverRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;
      const hoverClientX = clientOffset.x - hoverRect.left;
      const hoverClientY = clientOffset.y - hoverRect.top;
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY && hoverClientX < hoverMiddleX) return;
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY && hoverClientX > hoverMiddleX) return;
      moveCard(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  preview(drop(ref));
  drag(ref);

  /* Dragging ghost — dashed placeholder like overview page */
  if (isDragging) {
    return (
      <div
        ref={ref}
        className="rounded-lg border border-dashed border-[#0A77FF]/20 bg-[#0A77FF]/[0.02] min-h-[52px] pointer-events-none"
      />
    );
  }

  return (
    <div
      ref={ref}
      className={`border rounded-lg bg-white group relative min-w-0 transition-all duration-200 select-none overflow-hidden cursor-grab active:cursor-grabbing ${
        isOver
          ? "border-[#0A77FF]/30 bg-[#0A77FF]/[0.03] shadow-[0_0_0_2px_rgba(10,119,255,0.08)] scale-[1.02]"
          : "border-[#E2E8F0] hover:-translate-y-[1px] hover:border-[#93B8F7] hover:shadow-[0_2px_8px_-3px_rgba(10,119,255,0.06)]"
      }`}
    >
      {/* Drop zone overlay */}
      {isOver && (
        <div className="absolute inset-0 rounded-lg bg-[#0A77FF]/[0.02] pointer-events-none" />
      )}
      <div className="px-3 py-2">
        {/* Drag handle — top-right pill (visual cue only, whole card is draggable) */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center bg-[#F1F5F9] rounded-md p-1 z-10 pointer-events-none">
          <GripVertical className="w-3.5 h-3.5 text-[#64748B]" />
        </div>
        {/* Label row: label + icon */}
        <div className="flex items-center justify-between gap-1 mb-1">
          <p className="text-[10.5px] text-[#64748B] whitespace-nowrap" style={{ fontWeight: 500 }}>{label}</p>
          {iconName && <DashKpiIcon name={iconName} className="w-3.5 h-3.5 shrink-0" style={{ color: "#94A3B8" }} />}
        </div>
        {/* Value row with optional change indicator */}
        <div className="flex items-baseline gap-1.5">
          {change && (
            <span className="text-[10px] shrink-0" style={{ fontWeight: 500, color: changeColor || "#059669" }}>{change}</span>
          )}
          <p className="text-[15px] text-[#0F172A] tracking-tight whitespace-nowrap" style={{ fontWeight: 600, lineHeight: 1.2 }}>{value}</p>
        </div>
      </div>
      {/* Remove button — bottom-right on hover */}
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-all duration-150 p-1 rounded cursor-pointer hover:bg-red-50 z-10"
          title={`Remove ${label}`}
        >
          <Trash2 className="w-3 h-3 text-[#94A3B8] hover:text-[#EF4444]" />
        </button>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#94A3B8] mb-px" style={{ fontWeight: 500 }}>{label}</p>
      <p className={`text-[12px] text-[#334155] ${mono ? "font-mono" : ""}`} style={{ fontWeight: 500 }}>{value}</p>
    </div>
  );
}

// ══════════════════════════════════════════════
// PARTNER LOCATIONS TAB
// ═══════════════════════════���══════════════════

interface PartnerLocationData {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  contacts: number;
  items: number;
  serviceCenters: number;
  status: "active" | "inactive";
  createdBy: { name: string; initials: string; bgColor: string };
  lastUpdated: string;
  phone: string;
  email: string;
  image: string;
}

const MOCK_STREETS = [
  "2972 Westheimer Rd.", "1456 Elm Street", "890 Oak Avenue", "3201 Pine Boulevard",
  "742 Maple Drive", "5100 Cedar Lane", "1823 Birch Court", "4567 Walnut Way",
  "678 Spruce Circle", "2345 Willow Place", "1901 Ash Terrace", "3450 Cherry Lane",
  "5678 Poplar Street", "1234 Juniper Road", "8901 Magnolia Ave.",
  "345 Redwood Drive", "6789 Sequoia Blvd.", "2109 Cypress Way", "4321 Sycamore St.",
  "7654 Hemlock Road", "1098 Dogwood Lane", "5432 Holly Circle", "8765 Ivy Court",
  "2198 Laurel Place", "6543 Olive Terrace", "3876 Palm Avenue", "9012 Rose Street",
  "1357 Sage Boulevard", "4680 Thyme Drive", "7913 Violet Way",
];

const MOCK_CITIES = [
  { city: "Santa Ana", state: "Illinois", zip: "85486", country: "United States" },
  { city: "Austin", state: "Texas", zip: "78701", country: "United States" },
  { city: "San Francisco", state: "California", zip: "94102", country: "United States" },
  { city: "Seattle", state: "Washington", zip: "98101", country: "United States" },
  { city: "Chicago", state: "Illinois", zip: "60601", country: "United States" },
  { city: "Miami", state: "Florida", zip: "33101", country: "United States" },
  { city: "Denver", state: "Colorado", zip: "80201", country: "United States" },
  { city: "Boston", state: "Massachusetts", zip: "02101", country: "United States" },
  { city: "Portland", state: "Oregon", zip: "97201", country: "United States" },
  { city: "Atlanta", state: "Georgia", zip: "30301", country: "United States" },
  { city: "London", state: "England", zip: "SW1A 1AA", country: "United Kingdom" },
  { city: "Berlin", state: "Brandenburg", zip: "10115", country: "Germany" },
  { city: "Tokyo", state: "Kanto", zip: "100-0001", country: "Japan" },
  { city: "Shanghai", state: "Shanghai", zip: "200000", country: "China" },
  { city: "Toronto", state: "Ontario", zip: "M5H 2N2", country: "Canada" },
  { city: "Mumbai", state: "Maharashtra", zip: "400001", country: "India" },
  { city: "São Paulo", state: "São Paulo", zip: "01000-000", country: "Brazil" },
  { city: "Sydney", state: "New South Wales", zip: "2000", country: "Australia" },
  { city: "Dubai", state: "Dubai", zip: "00000", country: "UAE" },
  { city: "Seoul", state: "Seoul", zip: "04524", country: "South Korea" },
  { city: "Mexico City", state: "CDMX", zip: "06600", country: "Mexico" },
  { city: "Paris", state: "Île-de-France", zip: "75001", country: "France" },
  { city: "Stockholm", state: "Stockholm", zip: "111 57", country: "Sweden" },
  { city: "Amsterdam", state: "North Holland", zip: "1012", country: "Netherlands" },
  { city: "Milan", state: "Lombardy", zip: "20121", country: "Italy" },
  { city: "Singapore", state: "Singapore", zip: "048583", country: "Singapore" },
  { city: "Zurich", state: "Zurich", zip: "8001", country: "Switzerland" },
  { city: "Bangkok", state: "Bangkok", zip: "10110", country: "Thailand" },
  { city: "Cairo", state: "Cairo", zip: "11511", country: "Egypt" },
  { city: "Lagos", state: "Lagos", zip: "100001", country: "Nigeria" },
  { city: "Johannesburg", state: "Gauteng", zip: "2000", country: "South Africa" },
  { city: "Vancouver", state: "British Columbia", zip: "V6C 1E1", country: "Canada" },
  { city: "Nairobi", state: "Nairobi", zip: "00100", country: "Kenya" },
  { city: "Oslo", state: "Oslo", zip: "0150", country: "Norway" },
  { city: "Helsinki", state: "Uusimaa", zip: "00100", country: "Finland" },
  { city: "Copenhagen", state: "Capital", zip: "1050", country: "Denmark" },
  { city: "Vienna", state: "Vienna", zip: "1010", country: "Austria" },
  { city: "Brussels", state: "Brussels", zip: "1000", country: "Belgium" },
  { city: "Lisbon", state: "Lisbon", zip: "1100-001", country: "Portugal" },
  { city: "Madrid", state: "Madrid", zip: "28001", country: "Spain" },
  { city: "Warsaw", state: "Masovia", zip: "00-001", country: "Poland" },
  { city: "Prague", state: "Prague", zip: "110 00", country: "Czech Republic" },
  { city: "Budapest", state: "Budapest", zip: "1011", country: "Hungary" },
  { city: "Bucharest", state: "Bucharest", zip: "010011", country: "Romania" },
];

const CREATOR_NAMES = [
  { name: "Ahtisham Ahmad", initials: "AA", bgColor: "#6366f1" },
  { name: "Sarah Mitchell", initials: "SM", bgColor: "#0ea5e9" },
  { name: "James Wilson", initials: "JW", bgColor: "#10b981" },
  { name: "Maria Garcia", initials: "MG", bgColor: "#f59e0b" },
  { name: "David Chen", initials: "DC", bgColor: "#8b5cf6" },
  { name: "Emily Johnson", initials: "EJ", bgColor: "#ec4899" },
  { name: "Robert Taylor", initials: "RT", bgColor: "#14b8a6" },
  { name: "Lisa Anderson", initials: "LA", bgColor: "#f97316" },
];

const LOCATION_IMAGES = [
  "https://images.unsplash.com/photo-1769778674824-e69f58d7c55d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjB3YXJlaG91c2UlMjBleHRlcmlvcnxlbnwxfHx8fDE3NzMyMzk4MjR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1692133211836-52846376d66f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb3Jwb3JhdGUlMjBvZmZpY2UlMjBidWlsZGluZ3xlbnwxfHx8fDE3NzMxNDYxODN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1761396716215-9ccb2a7eda9d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwZGlzdHJpYnV0aW9uJTIwY2VudGVyfGVufDF8fHx8MTc3MzIzOTgyNHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1770824879981-212a14b628c9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb21tZXJjaWFsJTIwYnVzaW5lc3MlMjBwYXJrfGVufDF8fHx8MTc3MzIzOTgyNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1758789667762-56175fe4601c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsb2dpc3RpY3MlMjBmYWNpbGl0eSUyMGV4dGVyaW9yfGVufDF8fHx8MTc3MzIzOTgyNXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1764757105617-e765423a3791?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBmYWN0b3J5JTIwYnVpbGRpbmd8ZW58MXx8fHwxNzczMjM5ODI2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1762285334577-b451d4b8e245?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZXRhaWwlMjBzdG9yZWZyb250JTIwZXh0ZXJpb3J8ZW58MXx8fHwxNzczMjM5ODI2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1600313401255-ab9a4dcaafc6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBjb21wbGV4JTIwYWVyaWFsfGVufDF8fHx8MTc3MzIzOTgyN3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1731847999830-6f71b78d720e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzdG9yYWdlJTIwZmFjaWxpdHklMjBidWlsZGluZ3xlbnwxfHx8fDE3NzMyMzk4Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  "https://images.unsplash.com/photo-1670107767801-e40f61540f5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtYW51ZmFjdHVyaW5nJTIwcGxhbnQlMjBleHRlcmlvcnxlbnwxfHx8fDE3NzMyMzk4Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
];

function generateLocationsFromVendor(vendor: Vendor): PartnerLocationData[] {
  return vendor.partnerLocations.map((locName, idx) => {
    const seed = locName.length + idx;
    const cityData = MOCK_CITIES[seed % MOCK_CITIES.length];
    const street = MOCK_STREETS[seed % MOCK_STREETS.length];
    const creator = CREATOR_NAMES[seed % CREATOR_NAMES.length];
    const daysAgo = ((seed * 17 + idx * 7) % 365) + 1;
    const updDate = new Date();
    updDate.setDate(updDate.getDate() - daysAgo);

    return {
      id: `loc-${vendor.id}-${idx}`,
      name: `${vendor.companyName} Location ${100 + idx + 1}`,
      address: street,
      city: cityData.city,
      state: cityData.state,
      zipCode: cityData.zip,
      country: cityData.country,
      contacts: ((seed * 3 + idx * 5) % 25) + 2,
      items: ((seed * 7 + idx * 11) % 800) + 50,
      serviceCenters: ((seed * 2 + idx) % 12) + 1,
      status: idx % 7 === 0 ? "inactive" as const : "active" as const,
      createdBy: creator,
      lastUpdated: updDate.toISOString(),
      phone: `+1 (${300 + (seed % 700)}) ${100 + (idx * 37 % 900)}-${1000 + (seed * 13 % 9000)}`,
      email: `${locName.toLowerCase().replace(/[^a-z0-9]+/g, ".")}@${vendor.companyName.toLowerCase().replace(/[^a-z0-9]+/g, "")}.com`,
      image: LOCATION_IMAGES[(seed + idx) % LOCATION_IMAGES.length],
    };
  });
}

function PartnerLocationsTab({ vendor, cfg, formatDate }: {
  vendor: Vendor;
  cfg?: VendorConfigData;
  formatDate: (dateStr: string) => string;
}) {
  const generatedLocations = useMemo(() => generateLocationsFromVendor(vendor), [vendor]);
  const [createdLocations, setCreatedLocations] = useState<PartnerLocationData[]>([]);
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);

  const locations = useMemo(() => [...createdLocations, ...generatedLocations], [createdLocations, generatedLocations]);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [selectedLocation, setSelectedLocation] = useState<PartnerLocationData | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [locDetailTab, setLocDetailTab] = useState("overview");
  const [locAboutOpen, setLocAboutOpen] = useState(true);
  const [locPocOpen, setLocPocOpen] = useState(true);
  const [locBillingOpen, setLocBillingOpen] = useState(true);
  const [locCreditOpen, setLocCreditOpen] = useState(false);
  const [locCarrierOpen, setLocCarrierOpen] = useState(false);
  const [locPtOpen, setLocPtOpen] = useState(false);
  const [createLocationModalOpen, setCreateLocationModalOpen] = useState(false);

  type LocDensity = "condensed" | "comfort" | "card";
  const LOC_DENSITY_CONFIG: { key: LocDensity; label: string; description: string; icon: "align-justify" | "list" | "layout-grid" }[] = [
    { key: "condensed", label: "Condensed", description: "Compact view", icon: "align-justify" },
    { key: "comfort", label: "Comfort", description: "Spacious view", icon: "list" },
    { key: "card", label: "Card View", description: "Grid layout", icon: "layout-grid" },
  ];
  const [density, setDensity] = useState<LocDensity>("card");
  const [locPocDensity, setLocPocDensity] = useState<LocDensity>("card");
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = locations;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.address.toLowerCase().includes(q) ||
          l.city.toLowerCase().includes(q) ||
          l.state.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((l) => l.status === statusFilter);
    }
    return list;
  }, [locations, searchQuery, statusFilter]);

  const activeCount = locations.filter((l) => l.status === "active").length;
  const inactiveCount = locations.filter((l) => l.status === "inactive").length;

  const totalPages = Math.max(1, Math.ceil(filtered.length / recordsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * recordsPerPage;
    return filtered.slice(start, start + recordsPerPage);
  }, [filtered, currentPage, recordsPerPage]);

  const allPageSelected = paginated.length > 0 && paginated.every((l) => selectedRows.has(l.id));
  const somePageSelected = paginated.some((l) => selectedRows.has(l.id));
  const handleSelectAll = useCallback(() => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginated.forEach((l) => next.delete(l.id));
      } else {
        paginated.forEach((l) => next.add(l.id));
      }
      return next;
    });
  }, [allPageSelected, paginated]);
  const handleSelectRow = useCallback((id: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("...");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  const QUICK_FILTERS: { key: "all" | "active" | "inactive"; label: string; count: number }[] = [
    { key: "all", label: "Show All", count: locations.length },
    { key: "active", label: "Active", count: activeCount },
    { key: "inactive", label: "Inactive", count: inactiveCount },
  ];

  const handleOpenLocation = useCallback((loc: PartnerLocationData) => {
    setSelectedLocation(loc);
    setDetailModalOpen(true);
  }, []);

  const handleCloseDetailModal = useCallback(() => {
    setDetailModalOpen(false);
    setIsFullScreen(false);
    setLocDetailTab("overview");
    setLocAboutOpen(true);
    setLocPocOpen(true);
    setLocBillingOpen(true);
    setLocCreditOpen(false);
    setLocCarrierOpen(false);
    setLocPtOpen(false);
    setTimeout(() => setSelectedLocation(null), 200);
  }, []);

  const modalBaseClass = "!fixed !inset-0 !translate-x-0 !translate-y-0 !m-auto !w-full !h-full transition-[max-width,max-height,border-radius] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]";

  const modalSizeClass = isFullScreen
    ? `${modalBaseClass} !max-w-[calc(100%-1rem)] sm:!max-w-[calc(100%-1.5rem)] lg:!max-w-[calc(100%-2rem)] !max-h-[calc(100%-1rem)] sm:!max-h-[calc(100%-1.5rem)] lg:!max-h-[calc(100%-2rem)] !rounded-2xl`
    : `${modalBaseClass} !max-w-[100%] sm:!max-w-[1200px] !max-h-[100dvh] sm:!max-h-[88vh] rounded-none sm:!rounded-2xl`;

  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-[#FEF08A] rounded-sm px-px">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      {/* Unified Table Container — matches VendorsListPage */}
      <div className="border border-border rounded-xl bg-card overflow-clip flex flex-col" style={{ minHeight: 400 }}>
        {/* Row 1: Search + Filters ... Count + Density */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
              <Input
                placeholder="Search by name, type, or email..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-9 pr-8 h-9 text-sm bg-white border-border/80 shadow-sm placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-primary/20"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Filters button (placeholder) */}
            <button
              type="button"
              onClick={() => toast.info("Advanced filters coming soon!")}
              className="inline-flex items-center justify-center h-9 gap-1.5 px-3 rounded-lg border border-border/80 bg-white shadow-sm hover:bg-muted/50 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 shrink-0 text-foreground"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm" style={{ fontWeight: 500 }}>Filters</span>
            </button>
          </div>

          {/* Count + Density Dropdown + Create */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm tabular-nums mr-1 hidden sm:inline" style={{ fontWeight: 500 }}>
              {filtered.length !== locations.length ? (
                <>
                  <span className="text-foreground">{filtered.length}</span>
                  <span className="text-muted-foreground/60"> of </span>
                  <span className="text-muted-foreground">{locations.length}</span>
                  <span className="text-muted-foreground/70"> locations</span>
                </>
              ) : (
                <>
                  <span className="text-foreground">{locations.length}</span>
                  <span className="text-muted-foreground/70"> locations</span>
                </>
              )}
            </span>

            <div className="w-px h-5 bg-border/60 mx-0.5 hidden sm:block" />

            {/* Density dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-9 gap-2 px-3 rounded-lg border border-border bg-white text-foreground shadow-sm hover:bg-muted/40 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {density === "condensed" && <AlignJustify className="w-[18px] h-[18px] text-muted-foreground/80" />}
                  {density === "comfort" && <ListIcon className="w-[18px] h-[18px] text-muted-foreground/80" />}
                  {density === "card" && <LayoutGrid className="w-[18px] h-[18px] text-muted-foreground/80" />}
                  <span className="text-sm hidden md:inline" style={{ fontWeight: 500 }}>
                    {LOC_DENSITY_CONFIG.find((d) => d.key === density)?.label}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[230px] p-1.5">
                {LOC_DENSITY_CONFIG.map((opt) => (
                  <DropdownMenuItem
                    key={opt.key}
                    className="flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-md"
                    onSelect={() => setDensity(opt.key)}
                  >
                    {opt.icon === "align-justify" && <AlignJustify className="w-5 h-5 text-muted-foreground shrink-0" />}
                    {opt.icon === "list" && <ListIcon className="w-5 h-5 text-muted-foreground shrink-0" />}
                    {opt.icon === "layout-grid" && <LayoutGrid className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ fontWeight: 500 }}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {density === opt.key && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-5 bg-border/60 mx-0.5 hidden sm:block" />

            {/* Create Location Button */}
            <button
              type="button"
              onClick={() => setCreateLocationModalOpen(true)}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#0A77FF] hover:bg-[#0862D0] text-white text-sm shadow-sm transition-colors cursor-pointer"
              style={{ fontWeight: 600 }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create</span>
            </button>
          </div>
        </div>

        {/* Row 2: Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-3 shrink-0">
          {QUICK_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setStatusFilter(f.key); setCurrentPage(1); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? "border-primary bg-[#EDF4FF] hover:bg-[#D6E8FF] active:bg-[#ADD1FF]"
                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-muted-foreground/30 active:bg-muted"
                }`}
                style={{ fontWeight: isActive ? 500 : 400, color: isActive ? "#0A77FF" : undefined }}
              >
                {f.label}
                <span
                  className={`text-[10px] rounded-full px-1.5 py-px min-w-[18px] text-center ${isActive ? "bg-primary/10" : "bg-muted"}`}
                  style={{ fontWeight: 600, color: isActive ? "#0A77FF" : "#475569" }}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-border shrink-0" />

        {/* Content area */}
        {density === "card" ? (
          /* Card View */
          <div className="p-4 min-h-0 overflow-y-auto flex-1">
            {paginated.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                <MapPin className="w-8 h-8" />
                <p className="text-sm">No locations found</p>
                {searchQuery && (
                  <Button variant="link" size="sm" onClick={() => { setSearchQuery(""); setCurrentPage(1); }}>
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {paginated.map((loc) => {
                  const isHighlighted = highlightedLocationId === loc.id;
                  return (
                  <div
                    key={loc.id}
                    className={`bg-white border rounded-xl cursor-pointer hover:shadow-[0_4px_16px_-4px_rgba(10,119,255,0.10),0_1px_3px_-1px_rgba(0,0,0,0.04)] hover:border-[#93B8F7]/50 transition-all duration-200 group/card flex flex-col overflow-hidden ${
                      isHighlighted
                        ? "border-[#0A77FF] shadow-[0_0_0_2px_rgba(10,119,255,0.15),0_8px_24px_-8px_rgba(10,119,255,0.20)] animate-[highlight-pulse_1.5s_ease-in-out_2]"
                        : "border-[#E2E8F0]"
                    }`}
                    style={isHighlighted ? { animation: "highlight-pulse 1.5s ease-in-out 2" } : undefined}
                    onClick={() => handleOpenLocation(loc)}
                  >
                    {/* Location Image — top banner */}
                    <div className="relative w-full h-[160px] overflow-hidden bg-[#F1F5F9]">
                      <img
                        src={loc.image}
                        alt={loc.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                      />
                      {/* "NEW" badge for freshly created */}
                      {isHighlighted && (
                        <div className="absolute top-2.5 left-2.5 z-10">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#0A77FF] text-white text-[10px] tracking-wider uppercase shadow-sm"
                            style={{ fontWeight: 700 }}
                          >
                            <Sparkles className="w-3 h-3" />
                            NEW
                          </span>
                        </div>
                      )}
                      {/* 3-dot menu on image */}
                      <div className="absolute top-2.5 right-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-white/80 backdrop-blur-sm text-[#475569] opacity-0 group-hover/card:opacity-100 hover:bg-white hover:text-[#0F172A] transition-all cursor-pointer shadow-sm"
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => handleOpenLocation(loc)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Edit location coming soon!")}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="flex flex-col flex-1">
                      {/* Status + Country row */}
                      <div className="px-3.5 pt-3 pb-0 flex items-center gap-1.5">
                        <span
                          className="inline-flex items-center gap-1 text-[10.5px]"
                          style={{
                            fontWeight: 600,
                            color: loc.status === "active" ? "#15803D" : "#DC2626",
                          }}
                        >
                          <span className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: loc.status === "active" ? "#22C55E" : "#EF4444" }} />
                          {loc.status === "active" ? "ACTIVE" : "INACTIVE"}
                        </span>
                        <span className="text-[#CBD5E1] text-[10px]">·</span>
                        <span className="text-[10.5px] text-[#64748B]" style={{ fontWeight: 500 }}>{loc.country}</span>
                      </div>

                      {/* Title + Address */}
                      <div className="px-3.5 pt-1.5 pb-0">
                        <p className="text-[14px] text-[#0F172A] truncate" style={{ fontWeight: 600, lineHeight: '20px' }}>{highlightText(loc.name)}</p>
                        <p className="text-[12px] text-[#64748B] truncate mt-0.5" style={{ lineHeight: '18px' }}>
                          {loc.address}, {loc.city}, {loc.state}
                        </p>
                      </div>

                      {/* Stats — inline compact row */}
                      <div className="px-3.5 pt-3 pb-3 flex-1 flex items-end">
                        <div className="flex items-center gap-3 text-[11.5px]">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-[#94A3B8]" />
                            <span className="text-[#334155] tabular-nums" style={{ fontWeight: 600 }}>{loc.contacts}</span>
                          </div>
                          <div className="w-px h-3 bg-[#E2E8F0]" />
                          <div className="flex items-center gap-1">
                            <Package className="w-3 h-3 text-[#94A3B8]" />
                            <span className="text-[#334155] tabular-nums" style={{ fontWeight: 600 }}>{loc.items}</span>
                          </div>
                          <div className="w-px h-3 bg-[#E2E8F0]" />
                          <div className="flex items-center gap-1">
                            <Wrench className="w-3 h-3 text-[#94A3B8]" />
                            <span className="text-[#334155] tabular-nums" style={{ fontWeight: 600 }}>{loc.serviceCenters}</span>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-3.5 py-2.5 border-t border-[#F1F5F9] flex items-center justify-between text-[10.5px] text-[#94A3B8]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] shrink-0"
                            style={{ backgroundColor: toAAAColor(loc.createdBy.bgColor), fontWeight: 600 }}
                          >
                            {loc.createdBy.initials}
                          </div>
                          <span className="text-[#475569] truncate" style={{ fontWeight: 500 }}>{loc.createdBy.name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 ml-2">
                          <Clock className="w-3 h-3 text-[#CBD5E1]" />
                          <span className="text-[#64748B]" style={{ fontWeight: 500 }}>{formatDate(loc.lastUpdated)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Table View (condensed/comfort) */
          <div className="min-h-0 overflow-auto flex-1">
            <Table>
              <TableHeader className="sticky top-0 z-20 bg-card">
                <TableRow className={`bg-muted/30 hover:bg-muted/30 ${
                  density === "condensed" ? "[&>th]:h-8" : "[&>th]:h-11"
                }`}>
                  <TableHead className="w-[40px] min-w-[40px] max-w-[40px] !pl-3 !pr-0">
                    <Checkbox
                      checked={allPageSelected ? true : somePageSelected ? "indeterminate" : false}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all rows"
                    />
                  </TableHead>
                  <TableHead className="text-xs !pl-3" style={{ fontWeight: 600 }}>Location Name</TableHead>
                  <TableHead className="text-xs !pl-3" style={{ fontWeight: 600 }}>Address</TableHead>
                  <TableHead className="text-xs !pl-3" style={{ fontWeight: 600 }}>City / State</TableHead>
                  <TableHead className="text-xs !pl-3 text-center" style={{ fontWeight: 600 }}>Contacts</TableHead>
                  <TableHead className="text-xs !pl-3 text-center" style={{ fontWeight: 600 }}>Service Centers</TableHead>
                  <TableHead className="text-xs !pl-3" style={{ fontWeight: 600 }}>Status</TableHead>
                  <TableHead className="text-xs !pl-3" style={{ fontWeight: 600 }}>Created By</TableHead>
                  <TableHead className="text-xs !pl-3" style={{ fontWeight: 600 }}>Last Updated</TableHead>
                  <TableHead className="text-xs !pl-3 w-[60px]" style={{ fontWeight: 600 }}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <MapPin className="w-8 h-8" />
                        <p className="text-sm">No locations found</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((loc) => (
                    <TableRow
                      key={loc.id}
                      className={`cursor-pointer group hover:bg-[#F0F7FF] ${
                        density === "condensed"
                          ? "[&>td]:py-1 [&>td]:pl-3 [&>td]:pr-2"
                          : "[&>td]:py-3 [&>td]:pl-3 [&>td]:pr-3"
                      } ${highlightedLocationId === loc.id ? "animate-row-flash bg-[#EDF4FF]/60" : ""}`}
                      onClick={() => handleOpenLocation(loc)}
                    >
                      <TableCell className="!pl-3 !pr-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedRows.has(loc.id)}
                          onCheckedChange={() => handleSelectRow(loc.id)}
                          aria-label={`Select ${loc.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5 min-w-[140px]">
                          <div className="w-7 h-7 rounded-md bg-[#EDF4FF] flex items-center justify-center shrink-0">
                            <Grid3X3 className="w-3.5 h-3.5 text-[#0A77FF]" />
                          </div>
                          <span className="text-sm text-foreground truncate" style={{ fontWeight: 500 }}>
                            {highlightText(loc.name)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
                        {loc.address}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {loc.city}, {loc.state}
                      </TableCell>
                      <TableCell className="text-sm text-center tabular-nums" style={{ fontWeight: 500 }}>
                        {loc.contacts}
                      </TableCell>
                      <TableCell className="text-sm text-center tabular-nums" style={{ fontWeight: 500 }}>
                        {loc.serviceCenters}
                      </TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-[10px] border"
                          style={{
                            fontWeight: 600,
                            backgroundColor: loc.status === "active" ? "#F0FDF4" : "#FEF2F2",
                            color: loc.status === "active" ? "#166534" : "#DC2626",
                            borderColor: loc.status === "active" ? "#BBF7D0" : "#FECACA",
                          }}
                        >
                          {loc.status === "active" ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 min-w-[110px]">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] shrink-0"
                            style={{ backgroundColor: toAAAColor(loc.createdBy.bgColor), fontWeight: 600 }}
                          >
                            {loc.createdBy.initials}
                          </div>
                          <span className="text-sm text-foreground truncate" style={{ fontWeight: 500 }}>
                            {loc.createdBy.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(loc.lastUpdated)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
                            >
                              <MoreHorizontal className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenLocation(loc)}>
                              <Eye className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toast.info("Edit location coming soon!")}>
                              <Pencil className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => toast.info("Delete location coming soon!")}
                            >
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-center px-4 py-3 border-t border-border gap-3 shrink-0">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Records per page</span>
              <Select
                value={String(recordsPerPage)}
                onValueChange={(val) => { setRecordsPerPage(Number(val)); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[70px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-sm text-muted-foreground" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="w-3.5 h-3.5" />
                Prev
              </Button>
              {getPageNumbers().map((page, idx) =>
                page === "..." ? (
                  <span key={`dots-${idx}`} className="px-1 text-sm text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 w-8 p-0 text-sm ${currentPage === page ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                    onClick={() => setCurrentPage(page as number)}
                  >
                    {page}
                  </Button>
                )
              )}
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-sm text-muted-foreground" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ══════ Create Location Modal ══════ */}
      <CreatePartnerLocationModal
        open={createLocationModalOpen}
        onOpenChange={setCreateLocationModalOpen}
        vendorName={vendor.companyName}
        onLocationCreated={(data) => {
          const d = data as Record<string, any>;
          // Parse address parts from the full address string
          const addrParts = (d.address || "").split(",").map((s: string) => s.trim());
          const street = addrParts[0] || "—";
          const city = addrParts[1] || "—";
          const stateZip = addrParts[2] || "";
          const stateMatch = stateZip.match(/^([A-Za-z\s]+)\s*([\d-]+)?$/);
          const state = stateMatch ? stateMatch[1].trim() : stateZip;
          const zipCode = stateMatch ? (stateMatch[2] || "—") : "—";
          const country = addrParts[3] || "USA";

          const newId = `loc-new-${Date.now()}`;
          const newLoc: PartnerLocationData = {
            id: newId,
            name: d.locationName || "New Location",
            address: street,
            city,
            state,
            zipCode,
            country,
            contacts: (d.contacts as string[])?.length || 0,
            items: 0,
            serviceCenters: 0,
            status: (d.status || "Active").toLowerCase() === "active" ? "active" : "inactive",
            createdBy: { name: "You", initials: "YO", bgColor: "#0A77FF" },
            lastUpdated: new Date().toISOString(),
            phone: d.phone || "",
            email: d.email || "",
            image: d.profileImage || LOCATION_IMAGES[Math.floor(Math.random() * LOCATION_IMAGES.length)],
          };

          setCreatedLocations((prev) => [newLoc, ...prev]);
          setHighlightedLocationId(newId);
          // Reset filters/search to ensure the new card is visible
          setStatusFilter("all");
          setSearchQuery("");
          setCurrentPage(1);
          // Clear highlight after 3.5s
          setTimeout(() => setHighlightedLocationId(null), 3500);
        }}
      />

      {/* ══════ Location Detail Modal ══════ */}
      <Dialog open={detailModalOpen} onOpenChange={(open) => { if (!open) handleCloseDetailModal(); }}>
        <DialogContent
          className={`flex flex-col p-0 gap-0 border-0 sm:border z-[200] ${modalSizeClass}`}
          hideCloseButton
          style={{ boxShadow: "0 24px 48px -12px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.05)" }}
        >
          <DialogTitle className="sr-only">Location Details</DialogTitle>
          <DialogDescription className="sr-only">View details of this partner location.</DialogDescription>
          {selectedLocation && (() => {
            const loc = selectedLocation;
            const locAddress = `${loc.address}, ${loc.city}, ${loc.state} ${loc.zipCode}`;
            const locWebsite = `www.${vendor.companyName.toLowerCase().replace(/[^a-z0-9]/g, "")}.com`;
            const locLandline = `(${loc.phone.replace(/[^\d]/g, "").slice(1, 4)}) ${loc.phone.replace(/[^\d]/g, "").slice(4, 7)}-${loc.phone.replace(/[^\d]/g, "").slice(7, 11)}`;

            const LOC_TABS = [
              { id: "overview", label: "Overview", icon: Eye },
              { id: "poc", label: "Point of Contacts", icon: Users },
              { id: "items", label: "Items", icon: Package },
              { id: "service_centers", label: "Service Centers", icon: Wrench },
              { id: "carrier_shipping", label: "Carrier & Shipping", icon: Truck },
              { id: "pricing_rules", label: "Pricing Rules", icon: Tag },
              { id: "partner_compliance", label: "Partner Co...", icon: Shield },
              { id: "notes", label: "Notes", icon: FileText },
              { id: "attachments", label: "Files", icon: Paperclip },
              { id: "audit", label: "Audit", icon: Clock },
              { id: "activity", label: "Activity", icon: ChartColumn },
            ];

            const LOC_POC_DATA = [
              { id: "LP-1", name: "Issac Archer", dept: "Sales", phone: "(419) 548-1532", landline: "(736) 267-8659", ext: "123", email: "jimmie@example.com", bgColor: "#0A77FF" },
              { id: "LP-2", name: "Daniel Whitaker", dept: "Procurement", phone: "(372) 588-9852", landline: "(322) 683-5910", ext: "123", email: "malvar@example.com", bgColor: "#7C3AED" },
              { id: "LP-3", name: "Kimora Avila", dept: "Finance", phone: "(476) 828-2670", landline: "(822) 622-2842", ext: "123", email: "pthom@example.com", bgColor: "#059669" },
              { id: "LP-4", name: "Laney Zavala", dept: "Production", phone: "(996) 247-1680", landline: "(309) 645-6861", ext: "123", email: "specpr@example.com", bgColor: "#D97706" },
              { id: "LP-5", name: "Wyatt Bates", dept: "Sampling", phone: "(437) 402-2459", landline: "(778) 804-3466", ext: "123", email: "pthon@example.com", bgColor: "#0A77FF" },
              { id: "LP-6", name: "Kaleb Figueroa", dept: "Assembly", phone: "(456) 844-9096", landline: "(360) 476-4400", ext: "123", email: "kewley@example.com", bgColor: "#DC2626" },
              { id: "LP-7", name: "Kylie Norton", dept: "Pre-Production", phone: "(736) 267-8659", landline: "(989) 930-7596", ext: "123", email: "phyrux@example.com", bgColor: "#7C3AED" },
              { id: "LP-8", name: "Anya Blevins", dept: "Electrical", phone: "(219) 418-4910", landline: "(437) 402-2459", ext: "123", email: "scottz@example.com", bgColor: "#059669" },
              { id: "LP-9", name: "Jimena Morrow", dept: "Hardware", phone: "(590) 887-7526", landline: "(989) 930-7596", ext: "123", email: "sjava@example.com", bgColor: "#D97706" },
              { id: "LP-10", name: "Vivian Davila", dept: "Sub-Store", phone: "(632) 372-3424", landline: "(536) 554-1064", ext: "123", email: "hikoza@example.com", bgColor: "#0A77FF" },
            ];

            const LOC_ITEMS_DATA = [
              { partNo: "100219-42", desc: "Front bulkhead cabinet lower cov...", category: "Ram Pro Master 2500...", type: "Parts", typeBg: "#DBEAFE", typeColor: "#0A77FF", control: "Non-Serialized" },
              { partNo: "100219-51", desc: "Box walls inlay cabinet", category: "Hardware", type: "Parts", typeBg: "#DBEAFE", typeColor: "#0A77FF", control: "Non-Serialized" },
              { partNo: "100219-51-01", desc: "Box walls inlay cabinet with defib...", category: "Cabinet", type: "Equipment - Capital", typeBg: "#DBEAFE", typeColor: "#0A77FF", control: "Serialized" },
              { partNo: "100219-51-01RC", desc: "Box walls inlay cabinet with defib...", category: "Electronics", type: "Equipment - Non-Capital", typeBg: "#FEF3C7", typeColor: "#D97706", control: "Non-Serialized" },
              { partNo: "100219-51-02", desc: "Box walls inlay cabinet with refrig...", category: "Hardware", type: "Parts", typeBg: "#DBEAFE", typeColor: "#0A77FF", control: "Serialized" },
              { partNo: "100219-52", desc: "Box closeout top cap inlay cabinet", category: "Electronics", type: "Equipment - Non-Capital", typeBg: "#FEF3C7", typeColor: "#D97706", control: "Non-Serialized" },
              { partNo: "100120-70", desc: "Toyota long cut, emergency brak...", category: "Hardware", type: "Miscellaneous", typeBg: "#FEE2E2", typeColor: "#DC2626", control: "Non-Serialized" },
              { partNo: "100120-71", desc: "Toyota long cut, brake line bracket", category: "Electronics", type: "Equipment - Capital", typeBg: "#DBEAFE", typeColor: "#0A77FF", control: "Serialized" },
            ];

            const LOC_CARRIER_DATA = [
              { id: "C-1", name: "FedEx Express", desc: "For fastest delivery in USA", method: "FedEx Express (Air)", methodDesc: "A cost-effective shipping method that uses road transportation to deliver packages.", minDays: 1, maxDays: 2, isDefault: true },
              { id: "C-2", name: "TCS (Tranzum Courier)", desc: "Get your packages delivered in record time", method: "Ocean Freight (Sea)", methodDesc: "A budget-friendly delivery option that relies on road transportation.", minDays: 5, maxDays: 6, isDefault: true },
              { id: "C-3", name: "DHL Express", desc: "Experience lightning-fast shipping throughout the U.S.", method: "Ground Shipping (Land)", methodDesc: "An affordable shipping solution utilizing road transport for package delivery.", minDays: 3, maxDays: 4, isDefault: true },
              { id: "C-4", name: "UPS (United Parcel Service)", desc: "Enjoy rapid shipping services all over the U.S.", method: "Express Delivery (Air)", methodDesc: "A cost-efficient method for shipping that employs road transport to deliver parcels.", minDays: 7, maxDays: 8, isDefault: true },
            ];

            const LOC_PRICING_DATA = [
              { id: "PR-1", name: "Volume-Based Discounts", desc: "Discounts applied when purchasing in bulk", discount: "50%", expiry: "30 Days", minQty: "35 EA", maxQty: "500 EA" },
              { id: "PR-2", name: "Volume-Based Discounts", desc: "Discounts applied when purchasing in bulk", discount: "50%", expiry: "30 Days", minQty: "35 EA", maxQty: "500 EA" },
              { id: "PR-3", name: "Late Payment Penalties", desc: "Additional fees for overdue payments", discount: "50%", expiry: "30 Days", minQty: "35 EA", maxQty: "500 EA" },
            ];

            const creditLimit = 10000;
            const creditUsed = 5400;
            const creditPctLoc = Math.round((creditUsed / creditLimit) * 100);

            return (
            <>
              {/* ─── Header Bar ─── */}
              <div className="shrink-0 bg-white rounded-t-none sm:rounded-t-2xl border-b border-[#EEF2F6]">
                <div className="px-3 sm:px-5 py-3 sm:py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <button onClick={handleCloseDetailModal} className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all shrink-0 cursor-pointer">
                      <ArrowLeft className="w-4 h-4 text-[#64748B]" />
                    </button>
                    <div className="w-9 h-9 rounded-lg bg-[#EDF4FF] flex items-center justify-center shrink-0">
                      <Grid3X3 className="w-4 h-4 text-[#0A77FF]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h2 className="text-[15px] text-[#0F172A] truncate" style={{ fontWeight: 600 }}>{loc.name}</h2>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md shrink-0 ${
                          loc.status === "active"
                            ? "bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0]"
                            : "bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]"
                        }`} style={{ fontWeight: 600 }}>
                          {loc.status === "active" ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] truncate max-w-[340px]" style={{ fontWeight: 400 }}>{loc.address}, {loc.city}, {loc.state}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Edit Button */}
                    <button onClick={() => toast.info("Edit coming soon")} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all cursor-pointer" style={{ fontWeight: 500 }}>
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    {/* Archive Button */}
                    <button onClick={() => toast.info("Archive coming soon")} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all cursor-pointer" style={{ fontWeight: 500 }}>
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </button>
                    {/* More Dropdown */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="hidden sm:flex w-8 h-8 rounded-lg border border-[#E2E8F0] bg-white items-center justify-center cursor-pointer transition-all duration-150 hover:bg-[#EDF4FF] hover:border-[#BFDBFE] hover:text-[#0A77FF] active:scale-[0.96]">
                          <MoreHorizontal className="w-3.5 h-3.5 text-[#94A3B8]" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" sideOffset={6} className="z-[200] min-w-[190px] rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-lg">
                        <DropdownMenuItem onClick={() => toast.info("Send Email coming soon")} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#475569] cursor-pointer hover:bg-[#EDF4FF] hover:text-[#0A77FF]" style={{ fontWeight: 500 }}>
                          <Mail className="w-3.5 h-3.5 text-[#94A3B8]" /> Send Email
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Purchase Order coming soon")} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#475569] cursor-pointer hover:bg-[#EDF4FF] hover:text-[#0A77FF]" style={{ fontWeight: 500 }}>
                          <ShoppingCart className="w-3.5 h-3.5 text-[#94A3B8]" /> Purchase Order
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Sales Order coming soon")} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#475569] cursor-pointer hover:bg-[#EDF4FF] hover:text-[#0A77FF]" style={{ fontWeight: 500 }}>
                          <FileText className="w-3.5 h-3.5 text-[#94A3B8]" /> Sales Order
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toast.info("Create Quote coming soon")} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#475569] cursor-pointer hover:bg-[#EDF4FF] hover:text-[#0A77FF]" style={{ fontWeight: 500 }}>
                          <StickyNote className="w-3.5 h-3.5 text-[#94A3B8]" /> Create Quote
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-[#E2E8F0]" />
                        <DropdownMenuItem onClick={() => toast.info("Upload Attachment coming soon")} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-[#475569] cursor-pointer hover:bg-[#EDF4FF] hover:text-[#0A77FF]" style={{ fontWeight: 500 }}>
                          <Upload className="w-3.5 h-3.5 text-[#94A3B8]" /> Upload Attachment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div className="w-px h-5 bg-[#E2E8F0] mx-0.5 hidden sm:block" />
                    <button onClick={() => setIsFullScreen(!isFullScreen)} className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E2E8F0] bg-white text-xs text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] transition-all cursor-pointer" style={{ fontWeight: 500 }}>
                      {isFullScreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                      {isFullScreen ? "Exit full" : "Full view"}
                    </button>
                    <button onClick={handleCloseDetailModal} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition-all cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ─── Body: Split Layout ─── */}
              <div className="flex flex-row-reverse flex-1 overflow-hidden min-h-0">

                {/* ─── RIGHT PANEL (Sidebar) ─── */}
                <div className="w-[280px] border-l border-[#E8ECF1] flex flex-col bg-gradient-to-b from-[#F8FAFC] to-[#F1F5F9] shrink-0 overflow-y-auto">
                  {/* ── Metric Cards ── */}
                  <div className="px-3 pt-3.5 pb-1">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Contacts", value: String(loc.contacts), icon: Users, color: "#0A77FF", bg: "linear-gradient(135deg, #EBF3FF 0%, #DBEAFE 100%)" },
                        { label: "Items", value: String(loc.items), icon: Package, color: "#7C3AED", bg: "linear-gradient(135deg, #F0EBFF 0%, #E9DFFF 100%)" },
                        { label: "Centers", value: String(loc.serviceCenters), icon: Wrench, color: "#D97706", bg: "linear-gradient(135deg, #FEF5E7 0%, #FDE8C8 100%)" },
                      ].map((s) => (
                        <div key={s.label} className="relative rounded-xl border border-white/80 bg-white p-2.5 flex flex-col items-center gap-1.5 transition-all duration-200 hover:shadow-[0_4px_12px_-2px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 cursor-pointer group/metric" style={{ boxShadow: "0 1px 3px -1px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)" }}>
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover/metric:scale-110" style={{ background: s.bg }}>
                            <s.icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                          </div>
                          <p className="text-[15px] text-[#0F172A] tabular-nums" style={{ fontWeight: 700 }}>{s.value}</p>
                          <p className="text-[9px] text-[#94A3B8] uppercase tracking-wider" style={{ fontWeight: 600 }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── Contact Details Card ── */}
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="rounded-xl bg-white border border-[#E8ECF1]/60 overflow-hidden" style={{ boxShadow: "0 1px 3px -1px rgba(0,0,0,0.04)" }}>
                      <div className="px-3 py-2 flex items-center gap-2 border-b border-[#F1F5F9]">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#EBF3FF] to-[#DBEAFE] flex items-center justify-center">
                          <Phone className="w-2.5 h-2.5 text-[#0A77FF]" />
                        </div>
                        <p className="text-[10px] text-[#64748B] uppercase tracking-wider" style={{ fontWeight: 600 }}>Contact Details</p>
                      </div>
                      <div className="p-1.5">
                        {[
                          { icon: Mail, label: "Email", value: loc.email || "support@toyota.com" },
                          { icon: Phone, label: "Phone", value: loc.phone || "+1 327 899 3892" },
                          { icon: PhoneCall, label: "Landline", value: `${locLandline} ext.123` },
                          { icon: Globe, label: "Website", value: locWebsite },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg hover:bg-[#F8FAFC] transition-all duration-150 group/row cursor-pointer">
                            <div className="w-6 h-6 rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] flex items-center justify-center shrink-0 group-hover/row:bg-[#EDF4FF] group-hover/row:border-[#DBEAFE] transition-all duration-150">
                              <item.icon className="w-3 h-3 text-[#B0BEC5] group-hover/row:text-[#0A77FF] transition-colors" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[9px] text-[#B0BEC5] uppercase tracking-wide" style={{ fontWeight: 500 }}>{item.label}</p>
                              <p className="text-[11px] text-[#1E293B] truncate" style={{ fontWeight: 500 }}>{item.value}</p>
                            </div>
                            <ChevronRight className="w-3 h-3 text-[#E2E8F0] opacity-0 group-hover/row:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Address Card ── */}
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="rounded-xl bg-white border border-[#E8ECF1]/60 overflow-hidden" style={{ boxShadow: "0 1px 3px -1px rgba(0,0,0,0.04)" }}>
                      <div className="px-3 py-2 flex items-center gap-2 border-b border-[#F1F5F9]">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#FEF5E7] to-[#FDE8C8] flex items-center justify-center">
                          <MapPin className="w-2.5 h-2.5 text-[#D97706]" />
                        </div>
                        <p className="text-[10px] text-[#64748B] uppercase tracking-wider" style={{ fontWeight: 600 }}>Address</p>
                      </div>
                      <div className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F8FAFC] to-[#F1F5F9] border border-[#E8ECF1] flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-[#94A3B8]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] text-[#1E293B]" style={{ fontWeight: 600 }}>{loc.address}</p>
                            <p className="text-[11px] text-[#64748B] mt-0.5">{loc.city}, {loc.state} {loc.zipCode}</p>
                            <p className="text-[10px] text-[#94A3B8] mt-0.5">{loc.country}</p>
                          </div>
                        </div>
                        <button className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-[#E2E8F0] text-[10px] text-[#94A3B8] hover:text-[#0A77FF] hover:border-[#BFDBFE] hover:bg-[#FAFCFF] transition-all duration-150 cursor-pointer" style={{ fontWeight: 500 }}>
                          <ExternalLink className="w-2.5 h-2.5" />
                          View on map
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ── Primary Contact Card ── */}
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="rounded-xl bg-white border border-[#E8ECF1]/60 overflow-hidden transition-all duration-200 hover:border-[#BFDBFE]/60 hover:shadow-[0_4px_16px_-4px_rgba(10,119,255,0.06)]" style={{ boxShadow: "0 1px 3px -1px rgba(0,0,0,0.04)" }}>
                      <div className="px-3 py-2 flex items-center gap-2 border-b border-[#F1F5F9]">
                        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[#F0EBFF] to-[#E9DFFF] flex items-center justify-center">
                          <Users className="w-2.5 h-2.5 text-[#7C3AED]" />
                        </div>
                        <p className="text-[10px] text-[#64748B] uppercase tracking-wider" style={{ fontWeight: 600 }}>Primary Contact</p>
                      </div>
                      <div className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[12px] shrink-0" style={{ background: "linear-gradient(135deg, #EBF3FF 0%, #DBEAFE 100%)", color: "#0A77FF", fontWeight: 700 }}>IA</div>
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#10B981] border-2 border-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] text-[#0F172A] truncate" style={{ fontWeight: 600 }}>Issac Archer</p>
                            <p className="text-[10px] text-[#64748B] mt-0.5">Sales Department</p>
                          </div>
                        </div>
                        <div className="mt-3 space-y-1.5">
                          {[
                            { icon: Phone, value: "+1 327 899 3892" },
                            { icon: Mail, value: "irtaza.abid@toyota.com" },
                          ].map((c) => (
                            <div key={c.value} className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-lg bg-[#F8FAFC] border border-[#F1F5F9] group/cinfo hover:bg-[#EDF4FF] hover:border-[#DBEAFE] transition-all duration-150 cursor-pointer">
                              <c.icon className="w-3 h-3 text-[#B0BEC5] group-hover/cinfo:text-[#0A77FF] transition-colors shrink-0" />
                              <span className="text-[10px] text-[#475569] truncate" style={{ fontWeight: 500 }}>{c.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Credit Utilization Card ── */}
                  <div className="px-3 pt-2.5 pb-1">
                    <div className="rounded-xl bg-white border border-[#E8ECF1]/60 overflow-hidden" style={{ boxShadow: "0 1px 3px -1px rgba(0,0,0,0.04)" }}>
                      <div className="px-3 py-2 flex items-center justify-between border-b border-[#F1F5F9]">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: creditPctLoc > 80 ? "linear-gradient(135deg, #FEE2E2, #FECACA)" : creditPctLoc > 50 ? "linear-gradient(135deg, #FEF3C7, #FDE68A)" : "linear-gradient(135deg, #D1FAE5, #A7F3D0)" }}>
                            <DollarSign className="w-2.5 h-2.5" style={{ color: creditPctLoc > 80 ? "#EF4444" : creditPctLoc > 50 ? "#D97706" : "#10B981" }} />
                          </div>
                          <p className="text-[10px] text-[#64748B] uppercase tracking-wider" style={{ fontWeight: 600 }}>Credit</p>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md" style={{ fontWeight: 600, color: creditPctLoc > 80 ? "#DC2626" : creditPctLoc > 50 ? "#D97706" : "#059669", backgroundColor: creditPctLoc > 80 ? "#FEE2E2" : creditPctLoc > 50 ? "#FEF3C7" : "#D1FAE5" }}>{creditPctLoc > 80 ? "Critical" : creditPctLoc > 50 ? "Warning" : "Healthy"}</span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-baseline justify-between mb-3">
                          <div>
                            <p className="text-[17px] text-[#0F172A] tabular-nums" style={{ fontWeight: 700 }}>${creditUsed.toLocaleString()}</p>
                            <p className="text-[10px] text-[#94A3B8] mt-0.5" style={{ fontWeight: 400 }}>of ${creditLimit.toLocaleString()} limit</p>
                          </div>
                          <p className="text-[20px] tabular-nums" style={{ fontWeight: 800, color: creditPctLoc > 80 ? "#EF4444" : creditPctLoc > 50 ? "#F59E0B" : "#10B981" }}>{creditPctLoc}%</p>
                        </div>
                        <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: creditPctLoc > 80 ? "#FEE2E2" : creditPctLoc > 50 ? "#FEF3C7" : "#D1FAE5" }}>
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${creditPctLoc}%`, background: creditPctLoc > 80 ? "linear-gradient(90deg, #F87171, #EF4444)" : creditPctLoc > 50 ? "linear-gradient(90deg, #FBBF24, #F59E0B)" : "linear-gradient(90deg, #34D399, #10B981)" }} />
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>Available</span>
                          <span className="text-[11px] text-[#1E293B] tabular-nums" style={{ fontWeight: 600 }}>${(creditLimit - creditUsed).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Meta Footer ── */}
                  <div className="px-3 pt-2.5 pb-3.5 mt-auto">
                    <div className="rounded-xl bg-white/60 border border-[#E8ECF1]/40 p-3" style={{ boxShadow: "0 0 0 1px rgba(0,0,0,0.02)" }}>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white text-[8px] shrink-0" style={{ backgroundColor: toAAAColor(loc.createdBy.bgColor), fontWeight: 700 }}>{loc.createdBy.initials}</div>
                          <div className="min-w-0">
                            <p className="text-[9px] text-[#B0BEC5]" style={{ fontWeight: 500 }}>Created by</p>
                            <p className="text-[10px] text-[#475569] truncate" style={{ fontWeight: 500 }}>{loc.createdBy.name}</p>
                          </div>
                        </div>
                        <div className="w-px h-6 bg-[#F1F5F9]" />
                        <div className="text-right shrink-0">
                          <p className="text-[9px] text-[#B0BEC5]" style={{ fontWeight: 500 }}>Updated</p>
                          <p className="text-[10px] text-[#475569]" style={{ fontWeight: 500 }}>{formatDate(loc.lastUpdated)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ─── LEFT PANEL (Tabs) ─── */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  {/* Tabs row */}
                  <div className="flex items-center border-b border-[#E8ECF1] shrink-0">
                    <div className="flex items-center flex-1 overflow-x-auto px-2">
                      {LOC_TABS.map((t) => {
                        const active = locDetailTab === t.id;
                        const count = t.id === "poc" ? LOC_POC_DATA.length : t.id === "items" ? LOC_ITEMS_DATA.length : t.id === "carrier_shipping" ? LOC_CARRIER_DATA.length : t.id === "pricing_rules" ? LOC_PRICING_DATA.length : 0;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setLocDetailTab(t.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-[12px] border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                              active ? "border-[#0A77FF] text-[#0A77FF] bg-white" : "border-transparent text-[#94A3B8] hover:text-[#64748B]"
                            }`}
                            style={{ fontWeight: active ? 600 : 500 }}
                          >
                            <t.icon className="w-3.5 h-3.5" />
                            {t.label}
                            {count > 0 && (
                              <span className={`text-[9px] rounded-full px-1.5 py-px min-w-[16px] text-center ${active ? "bg-[#0A77FF]/10 text-[#0A77FF]" : "bg-[#F1F5F9] text-[#94A3B8]"}`} style={{ fontWeight: 700 }}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ── Overview tab ── */}
                  {locDetailTab === "overview" && (
                    <div className="flex-1 overflow-auto bg-[#F8FAFC]">
                      <div className="p-5 space-y-4">

                        {/* ── Billing & Shipping ── */}
                        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                          <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#EDF4FF] flex items-center justify-center shrink-0">
                                <CreditCard className="w-3.5 h-3.5 text-[#0A77FF]" />
                              </div>
                              <h3 className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>Billing & Shipping</h3>
                            </div>
                            <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>4 fields</span>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                              {[
                                { label: "Currency", value: "USD ($)", icon: DollarSign, color: "#0A77FF", bg: "linear-gradient(135deg, #EBF3FF 0%, #DBEAFE 100%)" },
                                { label: "Funded By", value: "FR Conversions", icon: Building2, color: "#7C3AED", bg: "linear-gradient(135deg, #F0EBFF 0%, #E9DFFF 100%)" },
                                { label: "Pay To", value: vendor.companyName, icon: CreditCard, color: "#059669", bg: "linear-gradient(135deg, #D1FAE5 0%, #A7F3D0 100%)" },
                                { label: "Ship To", value: loc.address, icon: Truck, color: "#D97706", bg: "linear-gradient(135deg, #FEF5E7 0%, #FDE8C8 100%)" },
                              ].map((item) => (
                                <div key={item.label} className="rounded-xl border border-[#F1F5F9] bg-[#FAFBFC] p-3.5 transition-all duration-200 hover:bg-white hover:border-[#BFDBFE] hover:shadow-[0_4px_12px_-4px_rgba(10,119,255,0.08)] group/bcard cursor-pointer">
                                  <div className="flex items-center gap-2 mb-2.5">
                                    <div className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover/bcard:scale-110" style={{ background: item.bg }}>
                                      <item.icon className="w-3 h-3" style={{ color: item.color }} />
                                    </div>
                                    <span className="text-[9px] text-[#B0BEC5] uppercase tracking-wider" style={{ fontWeight: 600 }}>{item.label}</span>
                                  </div>
                                  <p className="text-[12px] text-[#1E293B] truncate" style={{ fontWeight: 600 }}>{item.value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── Credit Limits ── */}
                        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                          <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: creditPctLoc > 80 ? "linear-gradient(135deg, #FEE2E2, #FECACA)" : creditPctLoc > 50 ? "linear-gradient(135deg, #FEF3C7, #FDE68A)" : "linear-gradient(135deg, #D1FAE5, #A7F3D0)" }}>
                                <TrendingUp className="w-3.5 h-3.5" style={{ color: creditPctLoc > 80 ? "#EF4444" : creditPctLoc > 50 ? "#D97706" : "#059669" }} />
                              </div>
                              <h3 className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>Credit Limits</h3>
                            </div>
                            <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ fontWeight: 600, color: creditPctLoc > 80 ? "#DC2626" : creditPctLoc > 50 ? "#D97706" : "#059669", backgroundColor: creditPctLoc > 80 ? "#FEE2E2" : creditPctLoc > 50 ? "#FEF3C7" : "#D1FAE5" }}>{creditPctLoc > 80 ? "Critical" : creditPctLoc > 50 ? "Warning" : "Healthy"}</span>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              {[
                                { label: "Credit Limit", value: `$${creditLimit.toLocaleString()}.00`, color: "#0F172A" },
                                { label: "Utilized", value: `$${creditUsed.toLocaleString()}.00`, color: "#0F172A" },
                                { label: "Available", value: `$${(creditLimit - creditUsed).toLocaleString()}.00`, color: "#10B981" },
                              ].map((stat) => (
                                <div key={stat.label} className="rounded-xl bg-[#FAFBFC] border border-[#F1F5F9] p-3 text-center">
                                  <p className="text-[9px] text-[#B0BEC5] uppercase tracking-wider mb-1" style={{ fontWeight: 600 }}>{stat.label}</p>
                                  <p className="text-[17px] tabular-nums" style={{ fontWeight: 700, color: stat.color }}>{stat.value}</p>
                                </div>
                              ))}
                            </div>
                            <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: creditPctLoc > 80 ? "#FEE2E2" : creditPctLoc > 50 ? "#FEF3C7" : "#D1FAE5" }}>
                              <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${creditPctLoc}%`, background: creditPctLoc > 80 ? "linear-gradient(90deg, #F87171, #EF4444)" : creditPctLoc > 50 ? "linear-gradient(90deg, #FBBF24, #F59E0B)" : "linear-gradient(90deg, #34D399, #10B981)" }} />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-[11px] tabular-nums" style={{ fontWeight: 600, color: creditPctLoc > 80 ? "#EF4444" : creditPctLoc > 50 ? "#F59E0B" : "#10B981" }}>{creditPctLoc}% utilized</span>
                              <span className="text-[10px] text-[#94A3B8]">${(creditLimit - creditUsed).toLocaleString()} remaining</span>
                            </div>
                          </div>
                        </div>

                        {/* ── Default Carrier & Shipping ── */}
                        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                          <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FEF5E7] to-[#FDE8C8] flex items-center justify-center shrink-0">
                                <Truck className="w-3.5 h-3.5 text-[#D97706]" />
                              </div>
                              <h3 className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>Default Carrier & Shipping</h3>
                            </div>
                            <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>2 carriers</span>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                              {[
                                { type: "Vendor", carrier: "FedEx Express", desc: "For fastest delivery in USA", method: "FedEx Express (Air)", days: "1-2 days" },
                                { type: "Customer", carrier: "FedEx Express", desc: "For fastest delivery in USA", method: "FedEx Express (Air)", days: "1-2 days" },
                              ].map((c) => (
                                <div key={c.type} className="rounded-xl border border-[#F1F5F9] bg-[#FAFBFC] overflow-hidden transition-all duration-200 hover:bg-white hover:border-[#BFDBFE] hover:shadow-[0_4px_12px_-4px_rgba(10,119,255,0.08)] group/carrier cursor-pointer">
                                  <div className="px-3.5 py-2 border-b border-[#F1F5F9] flex items-center justify-between bg-white/50">
                                    <span className="text-[10px] text-[#64748B] uppercase tracking-wider" style={{ fontWeight: 600 }}>{c.type}</span>
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]" style={{ fontWeight: 600 }}>Default</span>
                                  </div>
                                  <div className="p-3.5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-[#1B1464] flex items-center justify-center text-white text-[8px] shrink-0 transition-transform duration-200 group-hover/carrier:scale-105" style={{ fontWeight: 800 }}>FedEx</div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{c.carrier}</p>
                                      <p className="text-[11px] text-[#64748B] mt-0.5">{c.method}</p>
                                      <div className="flex items-center gap-2 mt-1.5">
                                        <span className="text-[10px] text-[#94A3B8]">{c.desc}</span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569]" style={{ fontWeight: 600 }}>{c.days}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* ── Payment Terms ── */}
                        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                          <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F0EBFF] to-[#E9DFFF] flex items-center justify-center shrink-0">
                                <Clock className="w-3.5 h-3.5 text-[#7C3AED]" />
                              </div>
                              <h3 className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>Payment Terms</h3>
                            </div>
                            <span className="text-[10px] text-[#94A3B8]" style={{ fontWeight: 500 }}>2 terms</span>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                              {[
                                { type: "Vendor", icon: "NET", iconBg: "linear-gradient(135deg, #EBF3FF 0%, #DBEAFE 100%)", iconColor: "#0A77FF", name: "Net 60 Post Production End", trigger: "Production End", desc: "Payment is due 60 days after production is completed." },
                                { type: "Customer", icon: "Pre", iconBg: "linear-gradient(135deg, #F0EBFF 0%, #E9DFFF 100%)", iconColor: "#7C3AED", name: "Full Advance Payment: Product...", trigger: "Production Start", desc: "A (X)% prepayment is required when production ends..." },
                              ].map((pt) => (
                                <div key={pt.type} className="rounded-xl border border-[#F1F5F9] bg-[#FAFBFC] overflow-hidden transition-all duration-200 hover:bg-white hover:border-[#BFDBFE] hover:shadow-[0_4px_12px_-4px_rgba(10,119,255,0.08)] group/pterm cursor-pointer">
                                  <div className="px-3.5 py-2 border-b border-[#F1F5F9] bg-white/50">
                                    <span className="text-[10px] text-[#64748B] uppercase tracking-wider" style={{ fontWeight: 600 }}>{pt.type}</span>
                                  </div>
                                  <div className="p-3.5 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] shrink-0 transition-transform duration-200 group-hover/pterm:scale-105" style={{ background: pt.iconBg, color: pt.iconColor, fontWeight: 800 }}>{pt.icon}</div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-1.5">
                                        <p className="text-[12px] text-[#0F172A] truncate" style={{ fontWeight: 600 }}>{pt.name}</p>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[#64748B] shrink-0" style={{ fontWeight: 500 }}>{pt.trigger}</span>
                                      </div>
                                      <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{pt.desc}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}

                  {/* ── Point of Contacts tab ── */}
                  {locDetailTab === "poc" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 shrink-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative flex-1 max-w-[220px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                            <input type="text" placeholder="Search point of contact..." className="w-full pl-8 h-8 text-[12px] bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0A77FF] transition-colors" />
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[12px] tabular-nums mr-0.5 hidden sm:inline" style={{ fontWeight: 500 }}>
                            <span className="text-[#0F172A]">{LOC_POC_DATA.length}</span>
                            <span className="text-[#94A3B8]"> contacts</span>
                          </span>
                          <div className="w-px h-5 bg-[#E8ECF1] mx-0.5 hidden sm:block" />
                          {/* Density dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center h-8 gap-1.5 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC] transition-colors cursor-pointer outline-none"
                              >
                                {locPocDensity === "condensed" && <AlignJustify className="w-3.5 h-3.5 text-[#94A3B8]" />}
                                {locPocDensity === "comfort" && <ListIcon className="w-3.5 h-3.5 text-[#94A3B8]" />}
                                {locPocDensity === "card" && <LayoutGrid className="w-3.5 h-3.5 text-[#94A3B8]" />}
                                <span className="text-[12px] hidden md:inline" style={{ fontWeight: 500 }}>
                                  {LOC_DENSITY_CONFIG.find((d) => d.key === locPocDensity)?.label}
                                </span>
                                <ChevronDown className="w-3 h-3 text-[#94A3B8]" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-[200px] p-1.5 z-[200]">
                              {LOC_DENSITY_CONFIG.map((opt) => (
                                <DropdownMenuItem
                                  key={opt.key}
                                  className="flex items-center gap-2.5 py-2 px-2.5 cursor-pointer rounded-md"
                                  onSelect={() => setLocPocDensity(opt.key)}
                                >
                                  {opt.icon === "align-justify" && <AlignJustify className="w-4 h-4 text-[#94A3B8] shrink-0" />}
                                  {opt.icon === "list" && <ListIcon className="w-4 h-4 text-[#94A3B8] shrink-0" />}
                                  {opt.icon === "layout-grid" && <LayoutGrid className="w-4 h-4 text-[#94A3B8] shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[12px]" style={{ fontWeight: 500 }}>{opt.label}</p>
                                    <p className="text-[10px] text-[#94A3B8]">{opt.description}</p>
                                  </div>
                                  {locPocDensity === opt.key && <Check className="w-3.5 h-3.5 text-[#0A77FF] shrink-0" />}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <div className="w-px h-5 bg-[#E8ECF1] mx-0.5 hidden sm:block" />
                          <button onClick={() => toast.info("Contact directory coming soon")} className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer transition-colors inline-flex items-center gap-1.5" style={{ fontWeight: 500 }}>
                            <Users className="w-3.5 h-3.5 text-[#94A3B8]" /> Contact Directory
                          </button>
                          <button onClick={() => toast.info("Create contact coming soon")} className="h-8 px-3 rounded-lg bg-[#0A77FF] hover:bg-[#0862D0] text-white text-[12px] shadow-sm cursor-pointer transition-colors inline-flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                            <Plus className="w-3.5 h-3.5" /> Create New Contact
                          </button>
                        </div>
                      </div>
                      {/* Department filter chips */}
                      <div className="flex items-center gap-1.5 px-4 pb-2">
                        {[
                          { label: "All", count: LOC_POC_DATA.length, active: true },
                          { label: "Sales", count: LOC_POC_DATA.filter(p => p.dept === "Sales").length, active: false },
                          { label: "Procurement", count: LOC_POC_DATA.filter(p => p.dept === "Procurement").length, active: false },
                          { label: "Finance", count: LOC_POC_DATA.filter(p => p.dept === "Finance").length, active: false },
                        ].filter(f => f.count > 0).map((chip) => (
                          <span key={chip.label} className={`text-[11px] px-2.5 py-1 rounded-full cursor-pointer transition-colors inline-flex items-center gap-1 ${chip.active ? "bg-[#EDF4FF] text-[#0A77FF] border border-[#0A77FF]/25" : "bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]"}`} style={{ fontWeight: 500 }}>
                            {chip.label}
                            <span className={`text-[10px] rounded-full px-1.5 py-px min-w-[16px] text-center ${chip.active ? "bg-[#0A77FF]/10" : "bg-[#F1F5F9]"}`} style={{ fontWeight: 600 }}>{chip.count}</span>
                          </span>
                        ))}
                      </div>
                      <div className="h-px bg-[#E8ECF1] mx-4 shrink-0" />
                      {locPocDensity === "card" ? (
                        <div className="flex-1 overflow-auto p-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {LOC_POC_DATA.map((poc) => {
                              const initials = poc.name.split(" ").map(w => w[0]).join("");
                              const tint = getPocAvatarTint(poc.bgColor);
                              const DEPT_DOT_COLORS: Record<string, string> = { Sales: "#0A77FF", Procurement: "#7C3AED", Finance: "#D97706", Production: "#059669", Sampling: "#0891B2", Assembly: "#DC2626", "Pre-Production": "#7C3AED", Electrical: "#059669", Hardware: "#D97706", "Sub-Store": "#0A77FF" };
                              const dotColor = DEPT_DOT_COLORS[poc.dept] || "#94A3B8";
                              return (
                                <div
                                  key={poc.id}
                                  className="rounded-xl border border-[#E2E8F0] bg-white p-4 hover:border-[#93B8F7]/50 hover:shadow-[0_4px_16px_-4px_rgba(10,119,255,0.10),0_1px_3px_-1px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer group/poc"
                                >
                                  {/* Top: Avatar + Name */}
                                  <div className="flex items-start gap-3 mb-3.5">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12px] shrink-0" style={{ fontWeight: 600, backgroundColor: tint.bg, color: tint.fg }}>
                                      {initials}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[13px] text-[#0F172A] truncate" style={{ fontWeight: 600 }}>{poc.name}</p>
                                      <p className="text-[11px] text-[#64748B] truncate mt-0.5">{poc.dept} Department</p>
                                    </div>
                                  </div>

                                  {/* Dept badge */}
                                  <div className="mb-3.5">
                                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-[#E8ECF1] bg-[#F8FAFC] text-[11px] text-[#334155]" style={{ fontWeight: 500 }}>
                                      <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                                      {poc.dept}
                                    </span>
                                  </div>

                                  {/* Contact details */}
                                  <div className="space-y-2 pt-3 border-t border-[#F1F5F9]">
                                    <div className="flex items-center gap-2.5">
                                      <Phone className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0" />
                                      <span className="text-[12px] text-[#475569] tabular-nums">{poc.phone}</span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                      <PhoneCall className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0" />
                                      <span className="text-[12px] text-[#475569] tabular-nums">{poc.landline} <span className="text-[10px] text-[#94A3B8]">ext.{poc.ext}</span></span>
                                    </div>
                                    <div className="flex items-center gap-2.5">
                                      <Mail className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0" />
                                      <span className="text-[12px] text-[#475569] truncate">{poc.email}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-auto">
                          <table className="w-full text-[12px]">
                            <thead className="sticky top-0 bg-[#F8FAFC] z-10">
                              <tr>
                                <th className={`text-left px-4 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1] ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`} style={{ fontWeight: 600 }}>Point of Contact Name</th>
                                <th className={`text-left px-4 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1] ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`} style={{ fontWeight: 600 }}>Department</th>
                                <th className={`text-left px-4 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1] ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`} style={{ fontWeight: 600 }}>Phone Number</th>
                                <th className={`text-left px-4 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1] ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`} style={{ fontWeight: 600 }}>Landline - Extension</th>
                                <th className={`text-left px-4 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1] ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`} style={{ fontWeight: 600 }}>Email</th>
                                <th className={`text-right px-4 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1] ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`} style={{ fontWeight: 600 }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {LOC_POC_DATA.map((poc) => {
                                const initials = poc.name.split(" ").map(w => w[0]).join("");
                                const tint = getPocAvatarTint(poc.bgColor);
                                return (
                                  <tr key={poc.id} className="hover:bg-[#F8FBFF] transition-colors">
                                    <td className={`px-4 ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                                      <div className="flex items-center gap-2.5">
                                        <div className={`${locPocDensity === "condensed" ? "w-6 h-6 text-[9px]" : "w-7 h-7 text-[10px]"} rounded-full flex items-center justify-center shrink-0`} style={{ fontWeight: 600, backgroundColor: tint.bg, color: tint.fg }}>
                                          {initials}
                                        </div>
                                        <span className="text-[12px] text-[#0F172A]" style={{ fontWeight: 500 }}>{poc.name}</span>
                                      </div>
                                    </td>
                                    <td className={`px-4 ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                                      <span className="text-[12px] text-[#475569]">{poc.dept}</span>
                                    </td>
                                    <td className={`px-4 ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                                      <span className="text-[12px] text-[#475569] tabular-nums">{poc.phone}</span>
                                    </td>
                                    <td className={`px-4 ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                                      <span className="text-[12px] text-[#475569] tabular-nums">{poc.landline} - {poc.ext}</span>
                                    </td>
                                    <td className={`px-4 ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                                      <span className="text-[12px] text-[#475569] truncate block max-w-[120px]">{poc.email}</span>
                                    </td>
                                    <td className={`px-4 text-right ${locPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                                      <button className="w-6 h-6 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#475569] hover:bg-[#F1F5F9] cursor-pointer transition-colors">
                                        <MoreHorizontal className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                      <div className="flex items-center justify-between px-4 py-2 border-t border-[#E8ECF1] shrink-0 bg-[#FAFBFC]">
                        <span className="text-[11px] text-[#94A3B8]">Records per page <select className="h-6 px-1.5 rounded border border-[#E2E8F0] text-[11px] cursor-pointer outline-none ml-1"><option>20</option><option>50</option></select></span>
                        <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                          <span className="px-2 py-0.5 rounded hover:bg-[#F1F5F9] cursor-pointer">&laquo;</span>
                          <span className="px-2 py-0.5 rounded hover:bg-[#F1F5F9] cursor-pointer">&larr; Prev</span>
                          <span className="px-2 py-0.5 rounded bg-[#0A77FF] text-white" style={{ fontWeight: 600 }}>1</span>
                          <span className="px-2 py-0.5 rounded hover:bg-[#F1F5F9] cursor-pointer">Next &rarr;</span>
                          <span className="px-2 py-0.5 rounded hover:bg-[#F1F5F9] cursor-pointer">&raquo;</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Items tab ── */}
                  {locDetailTab === "items" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 shrink-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative flex-1 max-w-[220px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                            <input type="text" placeholder="Search items..." className="w-full pl-8 h-8 text-[12px] bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0A77FF] transition-colors" />
                          </div>
                          <button className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer transition-colors inline-flex items-center gap-1.5" style={{ fontWeight: 500 }}>
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                          </button>
                        </div>
                        <button onClick={() => toast.info("Add new item coming soon")} className="h-8 px-3 rounded-lg bg-[#0A77FF] hover:bg-[#0862D0] text-white text-[12px] shadow-sm cursor-pointer transition-colors inline-flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                          <Plus className="w-3.5 h-3.5" /> Add new item
                        </button>
                      </div>
                      {/* Item type filter chips */}
                      <div className="flex items-center gap-1.5 px-4 pb-2 flex-wrap">
                        {["Me mode", "Parts", "Equipment - Capital", "Equipment - Non-Capital", "Miscellaneous", "Active", "Inactive"].map((chip) => (
                          <span key={chip} className="text-[11px] px-2.5 py-1 rounded-full cursor-pointer transition-colors bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]" style={{ fontWeight: 500 }}>
                            {chip}
                          </span>
                        ))}
                      </div>
                      <div className="h-px bg-[#E8ECF1] mx-4 shrink-0" />
                      <div className="flex-1 overflow-auto">
                        <table className="w-full text-[12px]">
                          <thead className="sticky top-0 bg-[#F8FAFC] z-10">
                            <tr>
                              <th className="text-left px-4 py-2.5 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1]" style={{ fontWeight: 600 }}>Part No.</th>
                              <th className="text-left px-4 py-2.5 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1]" style={{ fontWeight: 600 }}>Item Description</th>
                              <th className="text-left px-4 py-2.5 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1]" style={{ fontWeight: 600 }}>Category</th>
                              <th className="text-left px-4 py-2.5 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1]" style={{ fontWeight: 600 }}>Item Type</th>
                              <th className="text-left px-4 py-2.5 text-[#94A3B8] text-[11px] border-b border-[#E8ECF1]" style={{ fontWeight: 600 }}>Item Control</th>
                            </tr>
                          </thead>
                          <tbody>
                            {LOC_ITEMS_DATA.map((item) => (
                              <tr key={item.partNo} className="hover:bg-[#F8FBFF] transition-colors">
                                <td className="px-4 py-2.5">
                                  <code className="text-[11px] text-[#334155]">{item.partNo}</code>
                                </td>
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded bg-[#F1F5F9] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                                      <Package className="w-3 h-3 text-[#94A3B8]" />
                                    </div>
                                    <span className="text-[12px] text-[#0F172A] truncate max-w-[200px]" style={{ fontWeight: 500 }}>{item.desc}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="text-[12px] text-[#475569]">{item.category}</span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="inline-flex px-2 py-0.5 rounded text-[10px] border" style={{ fontWeight: 500, backgroundColor: item.typeBg, color: item.typeColor, borderColor: item.typeColor + "30" }}>
                                    {item.type}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span className="text-[12px] text-[#475569]">{item.control}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 border-t border-[#E8ECF1] shrink-0 bg-[#FAFBFC]">
                        <span className="text-[11px] text-[#94A3B8]">Records per page <select className="h-6 px-1.5 rounded border border-[#E2E8F0] text-[11px] cursor-pointer outline-none ml-1"><option>20</option><option>50</option></select></span>
                        <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                          <span className="px-2 py-0.5 rounded bg-[#0A77FF] text-white" style={{ fontWeight: 600 }}>1</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Carrier & Shipping Methods tab ── */}
                  {locDetailTab === "carrier_shipping" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 shrink-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative flex-1 max-w-[220px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                            <input type="text" placeholder="Search carrier, shipping method..." className="w-full pl-8 h-8 text-[12px] bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0A77FF] transition-colors" />
                          </div>
                          <button className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer transition-colors inline-flex items-center gap-1.5" style={{ fontWeight: 500 }}>
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                          </button>
                        </div>
                        <button onClick={() => toast.info("Add carrier coming soon")} className="h-8 px-3 rounded-lg bg-[#0A77FF] hover:bg-[#0862D0] text-white text-[12px] shadow-sm cursor-pointer transition-colors inline-flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                          <Plus className="w-3.5 h-3.5" /> Add Carrier
                        </button>
                      </div>
                      {/* Vendor / Customer toggle */}
                      <div className="flex items-center mx-4 mb-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
                        <button className="flex-1 py-2 text-[12px] text-white bg-[#0A77FF] text-center" style={{ fontWeight: 600 }}>Carrier & Shipping Method for Vendor</button>
                        <button className="flex-1 py-2 text-[12px] text-[#64748B] bg-white text-center hover:bg-[#F8FAFC] cursor-pointer transition-colors" style={{ fontWeight: 500 }}>Carrier & Shipping Method for Customer</button>
                      </div>
                      <div className="h-px bg-[#E8ECF1] mx-4 shrink-0" />
                      <div className="flex-1 overflow-auto p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          {LOC_CARRIER_DATA.map((carrier) => (
                            <div key={carrier.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 hover:border-[#CBD5E1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-9 h-9 rounded-lg bg-[#1B1464] flex items-center justify-center text-white text-[8px] shrink-0" style={{ fontWeight: 800 }}>
                                    {carrier.name.split(" ")[0].substring(0, 4)}
                                  </div>
                                  <div>
                                    <p className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{carrier.name}</p>
                                    <p className="text-[10px] text-[#94A3B8]">{carrier.desc}</p>
                                  </div>
                                </div>
                                {carrier.isDefault && <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF] shrink-0" style={{ fontWeight: 600 }}>Default</span>}
                              </div>
                              <div className="rounded-lg border border-[#E8ECF1] p-3 bg-[#FAFBFC]">
                                <div className="flex items-center gap-1.5 mb-1">
                                  <p className="text-[11px] text-[#0F172A]" style={{ fontWeight: 600 }}>{carrier.method}</p>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]" style={{ fontWeight: 600 }}>Default</span>
                                </div>
                                <p className="text-[10px] text-[#64748B] mb-2 line-clamp-2">{carrier.methodDesc}</p>
                                <div className="space-y-1 mt-2 pt-2 border-t border-[#E8ECF1]">
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[#94A3B8]">Minimum Days</span>
                                    <span className="text-[#0F172A]" style={{ fontWeight: 600 }}>{carrier.minDays} day{carrier.minDays > 1 ? "s" : ""}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px]">
                                    <span className="text-[#94A3B8]">Maximum Days</span>
                                    <span className="text-[#0F172A]" style={{ fontWeight: 600 }}>{carrier.maxDays} days</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 border-t border-[#E8ECF1] shrink-0 bg-[#FAFBFC]">
                        <span className="text-[11px] text-[#94A3B8]">Records per page <select className="h-6 px-1.5 rounded border border-[#E2E8F0] text-[11px] cursor-pointer outline-none ml-1"><option>20</option><option>50</option></select></span>
                        <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                          <span className="px-2 py-0.5 rounded bg-[#0A77FF] text-white" style={{ fontWeight: 600 }}>1</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Pricing Rules tab ── */}
                  {locDetailTab === "pricing_rules" && (
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2 shrink-0">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative flex-1 max-w-[220px]">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
                            <input type="text" placeholder="Search pricing rules..." className="w-full pl-8 h-8 text-[12px] bg-white border border-[#E2E8F0] rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#0A77FF] transition-colors" />
                          </div>
                          <button className="h-8 px-2.5 rounded-lg border border-[#E2E8F0] bg-white text-[12px] text-[#475569] hover:bg-[#F8FAFC] cursor-pointer transition-colors inline-flex items-center gap-1.5" style={{ fontWeight: 500 }}>
                            <SlidersHorizontal className="w-3.5 h-3.5" /> Filters
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => toast.info("Add pricing rule coming soon")} className="h-8 px-3 rounded-lg border border-[#DC2626] bg-white text-[#DC2626] text-[12px] cursor-pointer transition-colors inline-flex items-center gap-1.5 hover:bg-[#FEF2F2]" style={{ fontWeight: 600 }}>
                            <Plus className="w-3.5 h-3.5" /> Add New Pricing Rule
                          </button>
                          <button onClick={() => toast.info("Explore presets coming soon")} className="h-8 px-3 rounded-lg bg-[#0A77FF] hover:bg-[#0862D0] text-white text-[12px] shadow-sm cursor-pointer transition-colors inline-flex items-center gap-1.5" style={{ fontWeight: 600 }}>
                            <Sparkles className="w-3.5 h-3.5" /> Explore presets
                          </button>
                        </div>
                      </div>
                      {/* Vendor / Customer toggle */}
                      <div className="flex items-center mx-4 mb-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] overflow-hidden">
                        <button className="flex-1 py-2 text-[12px] text-white bg-[#0A77FF] text-center" style={{ fontWeight: 600 }}>Vendor</button>
                        <button className="flex-1 py-2 text-[12px] text-[#64748B] bg-white text-center hover:bg-[#F8FAFC] cursor-pointer transition-colors" style={{ fontWeight: 500 }}>Customer</button>
                      </div>
                      {/* Filter chips */}
                      <div className="flex items-center gap-1.5 px-4 pb-2">
                        {["Me mode", "Discount", "Premium Plus Rules", "Active", "Inactive"].map((chip) => (
                          <span key={chip} className="text-[11px] px-2.5 py-1 rounded-full cursor-pointer transition-colors bg-[#F8FAFC] text-[#64748B] border border-[#E2E8F0] hover:bg-[#F1F5F9]" style={{ fontWeight: 500 }}>
                            {chip}
                          </span>
                        ))}
                      </div>
                      <div className="h-px bg-[#E8ECF1] mx-4 shrink-0" />
                      <div className="flex-1 overflow-auto p-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                          {LOC_PRICING_DATA.map((rule) => (
                            <div key={rule.id} className="rounded-xl border border-[#E2E8F0] bg-white p-4 hover:border-[#CBD5E1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition-all">
                              <p className="text-[12px] text-[#0F172A] mb-0.5" style={{ fontWeight: 600 }}>{rule.name}</p>
                              <p className="text-[10px] text-[#94A3B8] mb-3">{rule.desc}</p>
                              <div className="flex items-center gap-1.5 mb-3">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[#DC2626] text-white" style={{ fontWeight: 600 }}>
                                  <Tag className="w-2.5 h-2.5" /> Discount {rule.discount} off
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#E2E8F0] bg-white text-[#475569]" style={{ fontWeight: 500 }}>Expire In ({rule.expiry})</span>
                              </div>
                              <div className="space-y-1.5 text-[11px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-[#94A3B8]">Minimum Order Quantity</span>
                                  <span className="text-[#0F172A]" style={{ fontWeight: 600 }}>{rule.minQty}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[#94A3B8]">Maximum Order Quantity</span>
                                  <span className="text-[#0F172A]" style={{ fontWeight: 600 }}>{rule.maxQty}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between px-4 py-2 border-t border-[#E8ECF1] shrink-0 bg-[#FAFBFC]">
                        <span className="text-[11px] text-[#94A3B8]">Records per page <select className="h-6 px-1.5 rounded border border-[#E2E8F0] text-[11px] cursor-pointer outline-none ml-1"><option>20</option><option>50</option></select></span>
                        <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
                          <span className="px-2 py-0.5 rounded bg-[#0A77FF] text-white" style={{ fontWeight: 600 }}>1</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── Placeholder tabs ── */}
                  {!["overview", "poc", "items", "carrier_shipping", "pricing_rules"].includes(locDetailTab) && (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 bg-[#EDF4FF] border border-[#0A77FF]/15">
                          {(() => { const T = LOC_TABS.find((x) => x.id === locDetailTab); return T ? <T.icon className="w-5 h-5 text-[#0A77FF]" /> : null; })()}
                        </div>
                        <p className="text-[13px] text-[#334155]" style={{ fontWeight: 500 }}>{LOC_TABS.find((x) => x.id === locDetailTab)?.label || locDetailTab}</p>
                        <p className="text-[11px] text-[#CBD5E1] mt-1" style={{ fontWeight: 400 }}>Coming soon</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ----- BILLING & SHIPPING TAB -----
function BillingShippingTab({ vendor, cfg }: { vendor: Vendor; cfg?: VendorConfigData }) {
  const hasShipping = cfg?.shippingConfig && (cfg.shippingConfig.carrierServices.length > 0 || cfg.shippingConfig.vendorPreferences.length > 0);

  return (
    <div className="space-y-4">
      {/* Billing Address */}
      <ContentCard title="Billing Address" icon={MapPin}>
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-md bg-[#F1F5F9] flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
          </div>
          <div className="text-[12px] text-[#334155] space-y-0.5">
            <p style={{ fontWeight: 500 }}>{vendor.billingAddress.street}</p>
            {vendor.billingAddress.city && (
              <p>{vendor.billingAddress.city}{vendor.billingAddress.state ? `, ${vendor.billingAddress.state}` : ""} {vendor.billingAddress.zipCode}</p>
            )}
            <p>{vendor.billingAddress.country}</p>
          </div>
        </div>
        {vendor.shippingAddress && (
          <>
            <Separator className="my-2.5" />
            <p className="text-[11px] text-[#64748B] mb-1.5" style={{ fontWeight: 600 }}>Shipping Address</p>
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-md bg-[#F1F5F9] flex items-center justify-center shrink-0">
                <Truck className="w-3.5 h-3.5 text-[#64748B]" />
              </div>
              <div className="text-[12px] text-[#334155] space-y-0.5">
                <p style={{ fontWeight: 500 }}>{vendor.shippingAddress.street}</p>
                {vendor.shippingAddress.city && (
                  <p>{vendor.shippingAddress.city}{vendor.shippingAddress.state ? `, ${vendor.shippingAddress.state}` : ""} {vendor.shippingAddress.zipCode}</p>
                )}
                <p>{vendor.shippingAddress.country}</p>
              </div>
            </div>
          </>
        )}
      </ContentCard>

      {/* Default Carriers */}
      <ContentCard title="Default Carriers" icon={Truck}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-md border border-[#E2E8F0] p-3">
            <p className="text-[10px] text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>Default Carrier (Vendor)</p>
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-[#0A77FF]" />
              <p className="text-[12px] text-[#334155]" style={{ fontWeight: 600 }}>{vendor.defaultCarrierVendor || "—"}</p>
            </div>
          </div>
          <div className="rounded-md border border-[#E2E8F0] p-3">
            <p className="text-[10px] text-[#94A3B8] mb-1" style={{ fontWeight: 500 }}>Default Carrier (Customer)</p>
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 text-[#0A77FF]" />
              <p className="text-[12px] text-[#334155]" style={{ fontWeight: 600 }}>{vendor.defaultCarrierCustomer || "—"}</p>
            </div>
          </div>
        </div>
      </ContentCard>

      {/* Shipping Configuration from Step 3 */}
      {hasShipping && (
        <ContentCard title="Shipping Configuration" icon={Package}>
          <div className="space-y-3">
            {cfg!.shippingConfig!.carrierServices.length > 0 && (
              <div>
                <p className="text-[11px] text-[#64748B] mb-1.5" style={{ fontWeight: 600 }}>Carrier Services</p>
                <div className="space-y-1.5">
                  {cfg!.shippingConfig!.carrierServices.map((cs, idx) => (
                    <div key={idx} className="rounded-md border border-[#E2E8F0] p-2.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{cs.name}</span>
                          {cs.isDefault && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EDF4FF] text-[#0A77FF]" style={{ fontWeight: 600 }}>Default</span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#64748B] mt-0.5">{cs.description}</p>
                      </div>
                      <span className="text-[12px] text-[#94A3B8] shrink-0 ml-3" style={{ fontWeight: 500 }}>
                        {cs.minDays}–{cs.maxDays} days
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {cfg!.shippingConfig!.vendorPreferences.length > 0 && cfg!.shippingConfig!.vendorPreferences.some((vp) => vp.carrier) && (
              <div>
                <p className="text-[11px] text-[#64748B] mb-1.5" style={{ fontWeight: 600 }}>Vendor Preferences</p>
                <div className="space-y-1.5">
                  {cfg!.shippingConfig!.vendorPreferences.filter((vp) => vp.carrier).map((vp, idx) => (
                    <div key={idx} className="rounded-md border border-[#E2E8F0] p-2.5 flex items-center justify-between">
                      <div>
                        <span className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{vp.carrier}</span>
                        {vp.methods.length > 0 && (
                          <p className="text-[12px] text-[#64748B] mt-0.5">{vp.methods.join(", ")}</p>
                        )}
                      </div>
                      {vp.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#EDF4FF] text-[#0A77FF]" style={{ fontWeight: 600 }}>Default</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ContentCard>
      )}

      {!hasShipping && !vendor.shippingAddress && (
        <ContentCard title="Shipping Configuration" icon={Package}>
          <EmptyState icon={Package} title="No shipping configuration" description="Shipping details will appear here once configured during partner creation." />
        </ContentCard>
      )}
    </div>
  );
}

// ----- PAYMENT METHODS TAB -----
function PaymentMethodsTab({ cfg, PAYMENT_TYPE_ICONS }: { cfg?: VendorConfigData; PAYMENT_TYPE_ICONS: Record<string, React.ElementType> }) {
  const hasPaymentMethods = cfg?.paymentMethods && cfg.paymentMethods.length > 0;

  return (
    <div className="space-y-4">
      <ContentCard
        title="Payment Methods"
        icon={CreditCard}
        count={hasPaymentMethods ? cfg!.paymentMethods!.length : undefined}
      >
        {hasPaymentMethods ? (
          <div className="space-y-2">
            {cfg!.paymentMethods!.map((pm) => {
              const Icon = PAYMENT_TYPE_ICONS[pm.type] || DollarSign;
              return (
                <div key={pm.id} className="rounded-md border border-[#E2E8F0] p-3 flex items-start gap-3 hover:border-[#CBD5E1] transition-colors">
                  <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 bg-[#EDF4FF]">
                    <Icon className="w-4 h-4 text-[#0A77FF]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>{pm.typeLabel}</p>
                      {pm.isSaved && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] text-[#64748B] mt-1.5">
                      {pm.bankName && <DetailRow label="Bank" value={pm.bankName} />}
                      {pm.accountNumber && <DetailRow label="Account" value={`****${pm.accountNumber.slice(-4)}`} />}
                      {pm.routingNumber && <DetailRow label="Routing" value={`****${pm.routingNumber.slice(-4)}`} />}
                      {pm.cardNumber && <DetailRow label="Card" value={`****${pm.cardNumber.slice(-4)}`} />}
                      {pm.expiryDate && <DetailRow label="Expiry" value={pm.expiryDate} />}
                      {pm.walletProvider && <DetailRow label="Provider" value={pm.walletProvider} />}
                      {pm.wireRoutingNumber && <DetailRow label="Wire Routing" value={`****${pm.wireRoutingNumber.slice(-4)}`} />}
                      {pm.checkPayableTo && <DetailRow label="Payable To" value={pm.checkPayableTo} />}
                    </div>
                    {((pm.discountPercent != null && pm.discountPercent > 0) || (pm.additionalChargesPercent != null && pm.additionalChargesPercent > 0)) && (
                      <div className="flex items-center gap-3 mt-2.5">
                        {pm.discountPercent != null && pm.discountPercent > 0 && (
                          <span className="text-[11px] text-[#059669] px-2 py-0.5 rounded-md bg-[#F0FDF4] border border-[#DCFCE7]" style={{ fontWeight: 600 }}>
                            {pm.discountPercent}% discount
                          </span>
                        )}
                        {pm.additionalChargesPercent != null && pm.additionalChargesPercent > 0 && (
                          <span className="text-[11px] text-[#D97706] px-2 py-0.5 rounded-md bg-[#FFFBEB] border border-[#FDE68A]" style={{ fontWeight: 600 }}>
                            {pm.additionalChargesPercent}% surcharge
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={CreditCard} title="No payment methods configured" description="Payment methods will appear here once added during partner creation or editing." />
        )}
      </ContentCard>
    </div>
  );
}

// ----- PAYMENT TERMS TAB -----
function PaymentTermsTab({ vendor, cfg }: { vendor: Vendor; cfg?: VendorConfigData }) {
  const hasPaymentTerm = !!cfg?.paymentTermConfig;

  return (
    <div className="space-y-4">
      {/* Base payment terms from vendor data */}
      <ContentCard title="Payment Configuration" icon={Receipt}>
        <div className="space-y-0">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-[12px]">
              <CreditCard className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="text-[#64748B]">Payment Terms</span>
            </div>
            <span className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>{PAYMENT_TERMS_LABELS[vendor.paymentTerms]}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-[12px]">
              <DollarSign className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="text-[#64748B]">Credit Limit</span>
            </div>
            <span className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>
              {vendor.creditLimit > 0 ? `$${vendor.creditLimit.toLocaleString()}` : "Not set"}
            </span>
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-[12px]">
              <Shield className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="text-[#64748B]">Credit Utilization</span>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="w-20 bg-[#F1F5F9] rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: `${Math.min(getCreditUtilizationPct(vendor), 100)}%`,
                    backgroundColor: getCreditUtilizationPct(vendor) > 80 ? "#DC2626" : getCreditUtilizationPct(vendor) > 50 ? "#D97706" : "#059669",
                  }}
                />
              </div>
              <span className="text-[12px] text-[#0F172A]" style={{ fontWeight: 600 }}>
                {getCreditUtilizationPct(vendor)}%
              </span>
            </div>
          </div>
        </div>
      </ContentCard>

      {/* Applied Payment Term from Step 3 config */}
      {hasPaymentTerm && (
        <ContentCard title="Applied Payment Term" icon={Receipt}>
          <div className="rounded-md border border-[#E2E8F0] p-3 space-y-2 bg-[#FAFBFC]">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] text-white"
                style={{
                  fontWeight: 700,
                  backgroundColor: cfg!.paymentTermConfig!.type === "NET" ? "#0A77FF" : cfg!.paymentTermConfig!.type === "Pre" ? "#7C3AED" : "#D97706",
                }}
              >
                {cfg!.paymentTermConfig!.type}
              </span>
              <span className="text-[13px] text-[#0F172A]" style={{ fontWeight: 700 }}>{cfg!.paymentTermConfig!.name}</span>
            </div>
            <p className="text-[12px] text-[#64748B] leading-relaxed">{cfg!.paymentTermConfig!.description}</p>
            <div className="flex gap-4 text-[11px]">
              {cfg!.paymentTermConfig!.trigger && (
                <div>
                  <span className="text-[#94A3B8]">Trigger: </span>
                  <span className="text-[#334155]" style={{ fontWeight: 500 }}>{cfg!.paymentTermConfig!.trigger}</span>
                </div>
              )}
              {cfg!.paymentTermConfig!.duration && (
                <div>
                  <span className="text-[#94A3B8]">Duration: </span>
                  <span className="text-[#334155]" style={{ fontWeight: 500 }}>{cfg!.paymentTermConfig!.duration} days</span>
                </div>
              )}
            </div>
            {cfg!.paymentTermConfig!.discountPercent && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-[#F0FDF4] border border-[#DCFCE7]">
                <CheckCircle2 className="w-3 h-3 text-[#059669]" />
                <span className="text-[11px] text-[#059669]" style={{ fontWeight: 600 }}>
                  {cfg!.paymentTermConfig!.discountPercent}% discount if paid within {cfg!.paymentTermConfig!.discountPeriod || "—"} days
                </span>
              </div>
            )}
          </div>
        </ContentCard>
      )}

      {!hasPaymentTerm && (
        <ContentCard title="Applied Payment Term" icon={Receipt}>
          <EmptyState icon={Receipt} title="No custom payment term" description="A custom payment term can be configured during partner creation." />
        </ContentCard>
      )}
    </div>
  );
}

function getCreditUtilizationPct(vendor: Vendor): number {
  return vendor.creditLimit > 0 ? Math.round((vendor.creditUtilization / vendor.creditLimit) * 100) : 0;
}

// ----- PRICING RULES TAB -----
function PricingRulesTab({ cfg }: { cfg?: VendorConfigData }) {
  const hasPricingRules = cfg?.pricingRules && cfg.pricingRules.length > 0;

  return (
    <div className="space-y-4">
      <ContentCard title="Applied Pricing Rules" icon={Tag} count={hasPricingRules ? cfg!.pricingRules!.length : undefined}>
        {hasPricingRules ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {cfg!.pricingRules!.map((rule) => (
              <div key={rule.id} className="rounded-md border border-[#E2E8F0] p-3 space-y-1.5 hover:border-[#CBD5E1] transition-colors">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] text-white"
                    style={{ fontWeight: 700, backgroundColor: rule.type === "discount" ? "#059669" : "#D97706" }}
                  >
                    {rule.type === "discount" ? "Discount" : "Premium"}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]" style={{ fontWeight: 500 }}>
                    {rule.basis}
                  </span>
                </div>
                <p className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>{rule.name}</p>
                <p className="text-[11px] text-[#64748B] leading-relaxed">{rule.description}</p>
                {rule.tiers && rule.tiers.length > 0 && (
                  <div className="mt-2 pt-2.5 border-t border-[#F1F5F9]">
                    <p className="text-[11px] text-[#94A3B8] mb-1.5" style={{ fontWeight: 600 }}>TIERS</p>
                    <div className="space-y-1">
                      {rule.tiers.map((tier, idx) => (
                        <div key={idx} className="flex items-center justify-between text-[11px]">
                          <span className="text-[#64748B]">{tier.from}���{tier.to === Infinity ? "∞" : tier.to}</span>
                          <span className="text-[#0F172A]" style={{ fontWeight: 600 }}>{tier.discount}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState icon={Tag} title="No pricing rules applied" description="Pricing rules can be configured during partner creation or editing." />
        )}
      </ContentCard>
    </div>
  );
}

// ----- CONTACTS TAB -----
function ContactsTab({ vendor, cfg }: { vendor: Vendor; cfg?: VendorConfigData }) {
  // ── Contact Dictionary (local copy for adding new contacts) ──
  const [contactDictionary, setContactDictionary] = useState<PartnerContact[]>([...CONTACT_DICTIONARY]);

  // ── Selected POC IDs (the contacts assigned to this partner) ──
  const [selectedPocIds, setSelectedPocIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    // Pull enriched POCs from cfg (added during partner creation Step 3)
    if (cfg?.pointsOfContact) {
      cfg.pointsOfContact.forEach((epc) => {
        const match = CONTACT_DICTIONARY.find(
          (c) => c.name === epc.name || c.email === epc.email
        );
        if (match) ids.add(match.id);
      });
    }
    // Pull global POCs from vendor data
    vendor.globalPointOfContacts.forEach((gpc) => {
      const match = CONTACT_DICTIONARY.find(
        (c) => c.name === gpc.name || c.name.split(" ")[0] === gpc.name.split(" ")[0]
      );
      if (match) ids.add(match.id);
    });
    // If nothing matched but vendor has global POCs, assign first N from dictionary
    if (ids.size === 0 && vendor.globalPointOfContacts.length > 0) {
      CONTACT_DICTIONARY.slice(0, Math.min(vendor.globalPointOfContacts.length, 6)).forEach(
        (c) => ids.add(c.id)
      );
    }
    return ids;
  });

  // ── Select Modal state ──
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [pocSearch, setPocSearch] = useState("");
  const [pocCategoryFilter, setPocCategoryFilter] = useState<"all" | "Sales" | "Supply Chain Management" | "Finance">("all");
  const [pocPage, setPocPage] = useState(1);
  const [pocTempSelected, setPocTempSelected] = useState<Set<string>>(new Set());

  // ── Create Modal state ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPocName, setNewPocName] = useState("");
  const [newPocDepartment, setNewPocDepartment] = useState<"Sales" | "Supply Chain Management" | "Finance">("Sales");
  const [newPocRole, setNewPocRole] = useState("");
  const [newPocLandline, setNewPocLandline] = useState("");
  const [newPocLandlineCode, setNewPocLandlineCode] = useState("+1");
  const [newPocExt, setNewPocExt] = useState("");
  const [newPocMobile, setNewPocMobile] = useState("");
  const [newPocMobileCode, setNewPocMobileCode] = useState("+1");
  const [newPocEmail, setNewPocEmail] = useState("");
  const [saveAndCreate, setSaveAndCreate] = useState(false);

  // ── Tab-level search / filter / pagination ──
  const [tabSearch, setTabSearch] = useState("");
  const [tabDeptFilter, setTabDeptFilter] = useState<"all" | "Sales" | "Supply Chain Management" | "Finance">("all");
  const [tabPage, setTabPage] = useState(1);
  const [globalPocDensity, setGlobalPocDensity] = useState<"condensed" | "comfort" | "card">("card");
  const GLOBAL_POC_DENSITY_CONFIG: { key: "condensed" | "comfort" | "card"; label: string; description: string; icon: "align-justify" | "list" | "layout-grid" }[] = [
    { key: "condensed", label: "Condensed", description: "Compact view", icon: "align-justify" },
    { key: "comfort", label: "Comfort", description: "Spacious view", icon: "list" },
    { key: "card", label: "Card View", description: "Grid layout", icon: "layout-grid" },
  ];

  // ── Derived data ──
  const selectedContacts = useMemo(
    () => contactDictionary.filter((c) => selectedPocIds.has(c.id)),
    [contactDictionary, selectedPocIds]
  );

  const selectedDeptCounts = useMemo(() => {
    const counts: Record<string, number> = { Sales: 0, "Supply Chain Management": 0, Finance: 0 };
    selectedContacts.forEach((c) => { counts[c.department] = (counts[c.department] || 0) + 1; });
    return counts;
  }, [selectedContacts]);

  const filteredSelected = useMemo(() => {
    let list = selectedContacts;
    if (tabDeptFilter !== "all") list = list.filter((c) => c.department === tabDeptFilter);
    if (tabSearch.trim()) {
      const q = tabSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }
    return list;
  }, [selectedContacts, tabDeptFilter, tabSearch]);

  const TAB_PER_PAGE = 12;
  const tabTotalPages = Math.max(1, Math.ceil(filteredSelected.length / TAB_PER_PAGE));
  const tabPaginated = filteredSelected.slice((tabPage - 1) * TAB_PER_PAGE, tabPage * TAB_PER_PAGE);

  useEffect(() => {
    if (tabPage > tabTotalPages) setTabPage(tabTotalPages);
  }, [tabPage, tabTotalPages]);

  const pocHighlightText = useCallback((text: string) => {
    if (!tabSearch.trim()) return text;
    const regex = new RegExp(`(${tabSearch.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-[#FEF08A] rounded-sm px-px">{part}</span>
      ) : (
        part
      )
    );
  }, [tabSearch]);

  const TAB_DEPT_COLORS: Record<string, { bg: string; text: string; accent: string; border: string }> = {
    "Sales": { bg: "#F0F4FF", text: "#3B6FC2", accent: "#4B83DB", border: "#D6E2F5" },
    "Supply Chain Management": { bg: "#ECFDF5", text: "#1B7A52", accent: "#34B77A", border: "#C6F0DA" },
    "Finance": { bg: "#FFF8ED", text: "#B05E10", accent: "#E58E2A", border: "#FADCB0" },
  };
  const TAB_AVATAR_TINTS: Record<string, { bg: string; text: string }> = {
    "#0A77FF": { bg: "#EBF3FF", text: "#0A77FF" },
    "#7C3AED": { bg: "#F0EBFF", text: "#7C3AED" },
    "#059669": { bg: "#E8FAF3", text: "#059669" },
    "#D97706": { bg: "#FEF5E7", text: "#B45D04" },
  };
  const getTabAvatarTint = (c: string) => TAB_AVATAR_TINTS[c] || { bg: "#F0F4FF", text: c };
  const getTabInitials = (name: string) => name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  const getTabPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (tabTotalPages <= 7) {
      for (let i = 1; i <= tabTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (tabPage > 3) pages.push("...");
      const start = Math.max(2, tabPage - 1);
      const end = Math.min(tabTotalPages - 1, tabPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (tabPage < tabTotalPages - 2) pages.push("...");
      pages.push(tabTotalPages);
    }
    return pages;
  };

  const QUICK_DEPT_FILTERS: { key: "all" | "Sales" | "Supply Chain Management" | "Finance"; label: string; count: number }[] = [
    { key: "all", label: "All", count: selectedContacts.length },
    { key: "Sales", label: "Sales", count: selectedDeptCounts["Sales"] || 0 },
    { key: "Supply Chain Management", label: "Supply Chain", count: selectedDeptCounts["Supply Chain Management"] || 0 },
    { key: "Finance", label: "Finance", count: selectedDeptCounts["Finance"] || 0 },
  ];

  const pocDeptCounts = useMemo(() => {
    const counts: Record<string, number> = { Sales: 0, "Supply Chain Management": 0, Finance: 0 };
    contactDictionary.forEach((c) => { counts[c.department] = (counts[c.department] || 0) + 1; });
    return counts;
  }, [contactDictionary]);

  const filteredContacts = useMemo(() => {
    let list = contactDictionary;
    if (pocCategoryFilter !== "all") list = list.filter((c) => c.department === pocCategoryFilter);
    if (pocSearch.trim()) {
      const q = pocSearch.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q)
      );
    }
    return list;
  }, [contactDictionary, pocCategoryFilter, pocSearch]);

  const POC_PER_PAGE = 20;
  const pocTotalPages = Math.max(1, Math.ceil(filteredContacts.length / POC_PER_PAGE));
  const pocPagedContacts = filteredContacts.slice((pocPage - 1) * POC_PER_PAGE, pocPage * POC_PER_PAGE);

  // ── Handlers ──
  const handleRemovePoc = useCallback((id: string) => {
    setSelectedPocIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
    toast.success("Contact removed from this partner.");
  }, []);

  const handleOpenSelect = useCallback(() => {
    setPocTempSelected(new Set(selectedPocIds));
    setPocSearch("");
    setPocCategoryFilter("all");
    setPocPage(1);
    setShowSelectModal(true);
  }, [selectedPocIds]);

  const handleTogglePocTemp = useCallback((id: string) => {
    setPocTempSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleConfirmSelect = useCallback(() => {
    const added = [...pocTempSelected].filter((id) => !selectedPocIds.has(id)).length;
    const removed = [...selectedPocIds].filter((id) => !pocTempSelected.has(id)).length;
    setSelectedPocIds(new Set(pocTempSelected));
    setShowSelectModal(false);
    if (added > 0 || removed > 0) {
      toast.success(
        `${added > 0 ? `${added} contact${added > 1 ? "s" : ""} added` : ""}${added > 0 && removed > 0 ? ", " : ""}${removed > 0 ? `${removed} removed` : ""}`
      );
    }
  }, [pocTempSelected, selectedPocIds]);

  const resetCreateForm = useCallback(() => {
    setNewPocName(""); setNewPocDepartment("Sales"); setNewPocRole("");
    setNewPocLandline(""); setNewPocLandlineCode("+1"); setNewPocExt("");
    setNewPocMobile(""); setNewPocMobileCode("+1"); setNewPocEmail("");
  }, []);

  const handleSavePoc = useCallback(() => {
    if (!newPocName.trim()) { toast.error("Name is required."); return; }
    const AVATAR_COLORS = ["#0A77FF", "#7C3AED", "#059669", "#D97706"];
    const newContact: PartnerContact = {
      id: `C-NEW-${Date.now()}`,
      name: newPocName.trim(),
      company: vendor.displayName || vendor.name,
      department: newPocDepartment,
      phone: newPocLandline ? `${newPocLandlineCode} ${newPocLandline}` : "",
      phoneExt: newPocExt,
      secondaryPhone: newPocMobile ? `${newPocMobileCode} ${newPocMobile}` : "",
      secondaryPhoneExt: "",
      email: newPocEmail.trim(),
      avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    };
    setContactDictionary((prev) => [newContact, ...prev]);
    setSelectedPocIds((prev) => new Set([...prev, newContact.id]));
    toast.success(`"${newContact.name}" created and assigned to this partner.`);
    if (saveAndCreate) {
      resetCreateForm();
    } else {
      resetCreateForm();
      setShowCreateModal(false);
    }
  }, [newPocName, newPocDepartment, newPocLandline, newPocLandlineCode, newPocExt, newPocMobile, newPocMobileCode, newPocEmail, saveAndCreate, vendor, resetCreateForm]);

  const handleOpenCreate = useCallback(() => {
    resetCreateForm();
    setShowCreateModal(true);
  }, [resetCreateForm]);

  const handleOpenCreateFromSelect = useCallback(() => {
    setShowSelectModal(false);
    resetCreateForm();
    setShowCreateModal(true);
  }, [resetCreateForm]);

  return (
    <div className="space-y-4">
      {/* Full-width POC container — matches Partner Locations layout */}
      <div className="border border-border rounded-xl bg-card overflow-clip flex flex-col" style={{ minHeight: 400 }}>
        {/* Row 1: Search + Count + Select Directory + Create */}
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2 shrink-0">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70 pointer-events-none" />
              <Input
                placeholder="Search point of contact"
                value={tabSearch}
                onChange={(e) => { setTabSearch(e.target.value); setTabPage(1); }}
                className="pl-9 pr-8 h-9 text-sm bg-white border-border/80 shadow-sm placeholder:text-muted-foreground/50 focus-visible:border-primary focus-visible:ring-primary/20"
              />
              {tabSearch && (
                <button
                  onClick={() => { setTabSearch(""); setTabPage(1); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm tabular-nums mr-1 hidden sm:inline" style={{ fontWeight: 500 }}>
              {filteredSelected.length !== selectedContacts.length ? (
                <>
                  <span className="text-foreground">{filteredSelected.length}</span>
                  <span className="text-muted-foreground/60"> of </span>
                  <span className="text-muted-foreground">{selectedContacts.length}</span>
                  <span className="text-muted-foreground/70"> contacts</span>
                </>
              ) : (
                <>
                  <span className="text-foreground">{selectedContacts.length}</span>
                  <span className="text-muted-foreground/70"> contacts</span>
                </>
              )}
            </span>
            <div className="w-px h-5 bg-border/60 mx-0.5 hidden sm:block" />
            {/* Density dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center justify-center h-9 gap-2 px-3 rounded-lg border border-border bg-white text-foreground shadow-sm hover:bg-muted/40 transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  {globalPocDensity === "condensed" && <AlignJustify className="w-[18px] h-[18px] text-muted-foreground/80" />}
                  {globalPocDensity === "comfort" && <ListIcon className="w-[18px] h-[18px] text-muted-foreground/80" />}
                  {globalPocDensity === "card" && <LayoutGrid className="w-[18px] h-[18px] text-muted-foreground/80" />}
                  <span className="text-sm hidden md:inline" style={{ fontWeight: 500 }}>
                    {GLOBAL_POC_DENSITY_CONFIG.find((d) => d.key === globalPocDensity)?.label}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[230px] p-1.5 z-[200]">
                {GLOBAL_POC_DENSITY_CONFIG.map((opt) => (
                  <DropdownMenuItem
                    key={opt.key}
                    className="flex items-center gap-3 py-2.5 px-3 cursor-pointer rounded-md"
                    onSelect={() => setGlobalPocDensity(opt.key)}
                  >
                    {opt.icon === "align-justify" && <AlignJustify className="w-5 h-5 text-muted-foreground shrink-0" />}
                    {opt.icon === "list" && <ListIcon className="w-5 h-5 text-muted-foreground shrink-0" />}
                    {opt.icon === "layout-grid" && <LayoutGrid className="w-5 h-5 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm" style={{ fontWeight: 500 }}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.description}</p>
                    </div>
                    {globalPocDensity === opt.key && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="w-px h-5 bg-border/60 mx-0.5 hidden sm:block" />
            <button
              onClick={handleOpenSelect}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border/80 bg-white shadow-sm hover:bg-muted/50 transition-colors cursor-pointer text-foreground"
              style={{ fontWeight: 500 }}
            >
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-sm hidden md:inline">Contact Directory</span>
            </button>
            <div className="w-px h-5 bg-border/60 mx-0.5 hidden sm:block" />
            <button
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-[#0A77FF] hover:bg-[#0862D0] text-white text-sm shadow-sm transition-colors cursor-pointer"
              style={{ fontWeight: 600 }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Create New Contact</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Row 2: Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto px-4 pb-3 shrink-0">
          {QUICK_DEPT_FILTERS.map((f) => {
            const isActive = tabDeptFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => { setTabDeptFilter(f.key); setTabPage(1); }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? "border-primary bg-[#EDF4FF] hover:bg-[#D6E8FF] active:bg-[#ADD1FF]"
                    : "border-border text-muted-foreground hover:bg-muted/60 hover:text-foreground hover:border-muted-foreground/30 active:bg-muted"
                }`}
                style={{ fontWeight: isActive ? 500 : 400, color: isActive ? "#0A77FF" : undefined }}
              >
                {f.label}
                <span
                  className={`text-[10px] rounded-full px-1.5 py-px min-w-[18px] text-center ${isActive ? "bg-primary/10" : "bg-muted"}`}
                  style={{ fontWeight: 600, color: isActive ? "#0A77FF" : "#475569" }}
                >
                  {f.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-border shrink-0" />

        {/* Content area — density-aware */}
        {selectedContacts.length === 0 ? (
          <div className="p-4 min-h-0 overflow-y-auto flex-1">
            {/* Empty state with two CTA cards */}
            <div className="flex flex-col items-center gap-4 py-12">
              <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                <Users className="w-7 h-7 text-[#94A3B8]" />
              </div>
              <div className="text-center">
                <p className="text-sm text-[#334155]" style={{ fontWeight: 600 }}>No contacts assigned</p>
                <p className="text-xs text-[#94A3B8] mt-1 max-w-[320px]">Select from the contact directory or create a new contact to assign to this partner.</p>
              </div>
              <div className="grid grid-cols-1 min-[480px]:grid-cols-2 gap-3 w-full max-w-lg mt-2">
                <button
                  onClick={handleOpenSelect}
                  className="group relative rounded-xl border border-[#E2E8F0] bg-white p-4 text-left transition-all duration-200 hover:border-[#BFDBFE] hover:shadow-[0_4px_16px_-4px_rgba(10,119,255,0.15)] cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#EDF4FF]/0 to-[#EDF4FF]/0 group-hover:from-[#EDF4FF]/60 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#EDF4FF] to-[#DBEAFE] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                      <Users className="w-5 h-5 text-[#0A77FF]" />
                    </div>
                    <p className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>Select from Contact Directory</p>
                    <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">Browse and pick from your saved contacts with search and filters.</p>
                  </div>
                </button>
                <button
                  onClick={handleOpenCreate}
                  className="group relative rounded-xl border border-[#E2E8F0] bg-white p-4 text-left transition-all duration-200 hover:border-[#D5D3EC] hover:shadow-[0_4px_16px_-4px_rgba(124,58,237,0.12)] cursor-pointer overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#F5F3FF]/0 to-[#F5F3FF]/0 group-hover:from-[#F5F3FF]/60 group-hover:to-transparent transition-all duration-300 pointer-events-none" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5F3FF] to-[#EDE9FE] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform duration-200">
                      <UserPlus className="w-5 h-5 text-[#7C3AED]" />
                    </div>
                    <p className="text-[13px] text-[#0F172A]" style={{ fontWeight: 600 }}>Create new contact</p>
                    <p className="text-[11px] text-[#94A3B8] mt-1 leading-relaxed">Add a brand-new point of contact directly from here.</p>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : tabPaginated.length === 0 ? (
          <div className="p-4 min-h-0 overflow-y-auto flex-1">
            <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
              <Search className="w-8 h-8" />
              <p className="text-sm" style={{ fontWeight: 500 }}>No contacts found</p>
              <button
                onClick={() => { setTabSearch(""); setTabDeptFilter("all"); setTabPage(1); }}
                className="text-xs text-[#0A77FF] hover:underline cursor-pointer mt-1"
                style={{ fontWeight: 500 }}
              >
                Clear filters
              </button>
            </div>
          </div>
        ) : globalPocDensity === "card" ? (
          <div className="p-4 min-h-0 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {tabPaginated.map((contact) => {
                const dc = TAB_DEPT_COLORS[contact.department] || TAB_DEPT_COLORS["Sales"];
                const at = getTabAvatarTint(contact.avatarColor);
                return (
                  <div
                    key={contact.id}
                    className="group relative rounded-xl border border-[#E8ECF1] bg-white transition-all duration-200 hover:border-[#BFDBFE] hover:shadow-[0_4px_16px_-4px_rgba(10,119,255,0.10)] overflow-hidden"
                  >
                    {/* Remove button */}
                    <button
                      onClick={() => handleRemovePoc(contact.id)}
                      className="absolute top-3 right-3 w-6 h-6 rounded-full bg-white border border-[#F1F5F9] text-[#94A3B8] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-[#FEF2F2] hover:text-[#EF4444] hover:border-[#FECACA] shadow-sm cursor-pointer z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="p-4">
                      {/* Avatar + Name + Company */}
                      <div className="flex items-start gap-3 pr-6">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] shrink-0"
                          style={{ backgroundColor: at.bg, color: at.text, fontWeight: 700 }}
                        >
                          {getTabInitials(contact.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] text-[#0F172A] truncate" style={{ fontWeight: 600 }}>{pocHighlightText(contact.name)}</p>
                          <p className="text-[11px] text-[#64748B] truncate mt-0.5">{pocHighlightText(contact.company)}</p>
                        </div>
                      </div>

                      {/* Department badge */}
                      <div className="mt-2.5 mb-3">
                        <span
                          className="inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px]"
                          style={{ fontWeight: 600, backgroundColor: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dc.accent }} />
                          {contact.department === "Supply Chain Management" ? "Supply Chain" : contact.department}
                        </span>
                      </div>

                      {/* Contact details */}
                      <div className="space-y-1.5 pt-2.5 border-t border-[#F1F5F9]">
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-[11px] text-[#475569]">
                            <div className="w-5 h-5 rounded bg-[#F8FAFC] flex items-center justify-center shrink-0">
                              <Phone className="w-2.5 h-2.5 text-[#94A3B8]" />
                            </div>
                            <span className="truncate">{pocHighlightText(contact.phone)}</span>
                            {contact.phoneExt && (
                              <span className="text-[10px] text-[#94A3B8] shrink-0">ext.{contact.phoneExt}</span>
                            )}
                          </div>
                        )}
                        {contact.secondaryPhone && (
                          <div className="flex items-center gap-2 text-[11px] text-[#475569]">
                            <div className="w-5 h-5 rounded bg-[#F8FAFC] flex items-center justify-center shrink-0">
                              <PhoneCall className="w-2.5 h-2.5 text-[#94A3B8]" />
                            </div>
                            <span className="truncate">{contact.secondaryPhone}</span>
                            {contact.secondaryPhoneExt && (
                              <span className="text-[10px] text-[#94A3B8] shrink-0">ext.{contact.secondaryPhoneExt}</span>
                            )}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 text-[11px] text-[#475569]">
                            <div className="w-5 h-5 rounded bg-[#F8FAFC] flex items-center justify-center shrink-0">
                              <Mail className="w-2.5 h-2.5 text-[#94A3B8]" />
                            </div>
                            <span className="truncate">{pocHighlightText(contact.email)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Table view for condensed/comfort */
          <div className="min-h-0 overflow-auto flex-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className={`bg-muted/30 ${globalPocDensity === "condensed" ? "[&>th]:py-1.5" : "[&>th]:py-2.5"}`}>
                  <th className="text-left px-4 text-muted-foreground text-xs border-b border-border" style={{ fontWeight: 600 }}>Contact Name</th>
                  <th className="text-left px-4 text-muted-foreground text-xs border-b border-border" style={{ fontWeight: 600 }}>Company</th>
                  <th className="text-left px-4 text-muted-foreground text-xs border-b border-border" style={{ fontWeight: 600 }}>Department</th>
                  <th className="text-left px-4 text-muted-foreground text-xs border-b border-border" style={{ fontWeight: 600 }}>Phone</th>
                  <th className="text-left px-4 text-muted-foreground text-xs border-b border-border" style={{ fontWeight: 600 }}>Email</th>
                  <th className="text-right px-4 text-muted-foreground text-xs border-b border-border" style={{ fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tabPaginated.map((contact) => {
                  const dc = TAB_DEPT_COLORS[contact.department] || TAB_DEPT_COLORS["Sales"];
                  const at = getTabAvatarTint(contact.avatarColor);
                  return (
                    <tr key={contact.id} className="hover:bg-[#F8FBFF] transition-colors group">
                      <td className={`px-4 ${globalPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`${globalPocDensity === "condensed" ? "w-6 h-6 text-[9px]" : "w-7 h-7 text-[10px]"} rounded-full flex items-center justify-center shrink-0`}
                            style={{ backgroundColor: at.bg, color: at.text, fontWeight: 700 }}
                          >
                            {getTabInitials(contact.name)}
                          </div>
                          <span className="text-sm text-[#0F172A]" style={{ fontWeight: 500 }}>{pocHighlightText(contact.name)}</span>
                        </div>
                      </td>
                      <td className={`px-4 ${globalPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                        <span className="text-sm text-[#475569]">{pocHighlightText(contact.company)}</span>
                      </td>
                      <td className={`px-4 ${globalPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                        <span
                          className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[10px]"
                          style={{ fontWeight: 600, backgroundColor: dc.bg, color: dc.text, border: `1px solid ${dc.border}` }}
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dc.accent }} />
                          {contact.department === "Supply Chain Management" ? "Supply Chain" : contact.department}
                        </span>
                      </td>
                      <td className={`px-4 ${globalPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                        <span className="text-sm text-[#475569] tabular-nums">{contact.phone}</span>
                        {contact.phoneExt && <span className="text-[10px] text-[#94A3B8] ml-1">ext.{contact.phoneExt}</span>}
                      </td>
                      <td className={`px-4 ${globalPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                        <span className="text-sm text-[#475569] truncate block max-w-[180px]">{pocHighlightText(contact.email)}</span>
                      </td>
                      <td className={`px-4 text-right ${globalPocDensity === "condensed" ? "py-1.5" : "py-2.5"}`}>
                        <button
                          onClick={() => handleRemovePoc(contact.id)}
                          className="w-6 h-6 rounded flex items-center justify-center text-[#94A3B8] hover:text-[#EF4444] hover:bg-[#FEF2F2] cursor-pointer transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {selectedContacts.length > 0 && (
          <>
            <div className="border-t border-border shrink-0" />
            <div className="px-4 py-2.5 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2 text-xs text-[#64748B]">
                <span>Records per page</span>
                <span className="px-2 py-1 rounded border border-[#E2E8F0] text-xs text-[#0F172A]" style={{ fontWeight: 500 }}>{TAB_PER_PAGE}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={() => setTabPage(1)} disabled={tabPage === 1} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  <ChevronsLeft className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
                <button onClick={() => setTabPage(Math.max(1, tabPage - 1))} disabled={tabPage === 1} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  <ChevronLeft className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
                {getTabPageNumbers().map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="w-7 h-7 flex items-center justify-center text-xs text-[#94A3B8]">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setTabPage(p)}
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors cursor-pointer ${
                        tabPage === p ? "bg-[#0A77FF] text-white" : "text-[#64748B] hover:bg-[#F1F5F9]"
                      }`}
                      style={{ fontWeight: tabPage === p ? 600 : 400 }}
                    >
                      {p}
                    </button>
                  )
                )}
                <button onClick={() => setTabPage(Math.min(tabTotalPages, tabPage + 1))} disabled={tabPage === tabTotalPages} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  <ChevronRight className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
                <button onClick={() => setTabPage(tabTotalPages)} disabled={tabPage === tabTotalPages} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
                  <ChevronsRight className="w-3.5 h-3.5 text-[#64748B]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Select from Directory Modal */}
      <SelectPocDictionaryModal
        open={showSelectModal}
        onOpenChange={setShowSelectModal}
        contactDictionary={contactDictionary}
        pocSearch={pocSearch}
        onPocSearchChange={(v) => { setPocSearch(v); setPocPage(1); }}
        pocCategoryFilter={pocCategoryFilter}
        onPocCategoryFilterChange={(v) => { setPocCategoryFilter(v); setPocPage(1); }}
        pocDepartmentCounts={pocDeptCounts}
        pocPagedContacts={pocPagedContacts}
        pocPage={pocPage}
        pocTotalPages={pocTotalPages}
        onPocPageChange={setPocPage}
        pocTempSelected={pocTempSelected}
        onTogglePocTemp={handleTogglePocTemp}
        onConfirm={handleConfirmSelect}
        onOpenCreatePoc={handleOpenCreateFromSelect}
        contextLabel="this partner"
      />

      {/* Create New POC Modal */}
      <CreatePocModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        contextName={vendor.displayName || vendor.name}
        newPocName={newPocName}
        onNewPocNameChange={setNewPocName}
        newPocDepartment={newPocDepartment}
        onNewPocDepartmentChange={setNewPocDepartment}
        newPocRole={newPocRole}
        onNewPocRoleChange={setNewPocRole}
        newPocLandline={newPocLandline}
        onNewPocLandlineChange={setNewPocLandline}
        newPocLandlineCode={newPocLandlineCode}
        onNewPocLandlineCodeChange={setNewPocLandlineCode}
        newPocExt={newPocExt}
        onNewPocExtChange={setNewPocExt}
        newPocMobile={newPocMobile}
        onNewPocMobileChange={setNewPocMobile}
        newPocMobileCode={newPocMobileCode}
        onNewPocMobileCodeChange={setNewPocMobileCode}
        newPocEmail={newPocEmail}
        onNewPocEmailChange={setNewPocEmail}
        saveAndCreateAnother={saveAndCreate}
        onSaveAndCreateAnotherChange={setSaveAndCreate}
        onSave={handleSavePoc}
      />

    </div>
  );
}

// ----- DOCUMENTS TAB -----
function DocumentsTab() {
  return (
    <PlaceholderTab
      label="Attachments"
      description="Upload and manage documents, contracts, and files associated with this partner."
      icon={Paperclip}
    />
  );
}

// ----- ACTIVITY TAB -----
function ActivityTab({ vendor, formatDate }: { vendor: Vendor; formatDate: (d: string) => string }) {
  const activities = [
    { action: "Partner profile last updated", date: vendor.updatedAt, icon: Pencil, color: "#0A77FF" },
    { action: "Payment configuration saved", date: vendor.updatedAt, icon: CreditCard, color: "#7C3AED" },
    { action: "Shipping preferences configured", date: vendor.createdAt, icon: Truck, color: "#059669" },
    { action: "Partner created", date: vendor.createdAt, icon: Calendar, color: "#D97706" },
  ];

  return (
    <div className="space-y-4">
      <ContentCard title="Activity Timeline" icon={Activity}>
        <div className="space-y-0">
          {activities.map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={index} className="flex items-start gap-2.5 relative pb-4 last:pb-0">
                {/* Timeline line */}
                {index < activities.length - 1 && (
                  <div className="absolute left-[13px] top-[30px] w-px h-[calc(100%-20px)] bg-[#E2E8F0]" />
                )}
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${item.color}10` }}
                >
                  <Icon className="w-3 h-3" style={{ color: item.color }} />
                </div>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[12px] text-[#334155]" style={{ fontWeight: 500 }}>{item.action}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-0.5">{formatDate(item.date)}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="pt-2.5 mt-2.5 border-t border-[#F1F5F9] text-center">
          <p className="text-[11px] text-[#94A3B8]">Full activity log will be available with backend integration</p>
        </div>
      </ContentCard>
    </div>
  );
}

// ----- NOTES & ATTACHMENTS TAB -----
function NotesTab({ vendor, cfg }: { vendor: Vendor; cfg?: VendorConfigData }) {
  return (
    <div className="space-y-4">
      {/* Notes */}
      <ContentCard title="Notes" icon={MessageSquare}>
        {vendor.notes ? (
          <div className="rounded-md bg-[#FAFBFC] border border-[#F1F5F9] p-3">
            <p className="text-[12px] text-[#475569] leading-relaxed whitespace-pre-wrap">{vendor.notes}</p>
          </div>
        ) : (
          <EmptyState icon={MessageSquare} title="No notes" description="Notes about this partner will appear here." />
        )}
      </ContentCard>

      {/* Description from config */}
      {(vendor.description || cfg?.description) && (
        <ContentCard title="Description" icon={Info}>
          <div className="rounded-md bg-[#FAFBFC] border border-[#F1F5F9] p-3">
            <p className="text-[12px] text-[#475569] leading-relaxed whitespace-pre-wrap">{vendor.description || cfg?.description}</p>
          </div>
        </ContentCard>
      )}

      {/* Attachments placeholder */}
      <ContentCard title="Attachments" icon={Paperclip}>
        <EmptyState icon={Paperclip} title="No attachments" description="File attachments will be displayed here once uploaded. This feature will be available with backend integration." />
      </ContentCard>
    </div>
  );
}
