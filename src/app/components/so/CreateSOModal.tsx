import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search, X, Package, ArrowLeftRight, Phone, Mail, Edit3,
  Calendar, Clock, Users, Plus, Check, ArrowLeft, ArrowRight,
  Building2, MapPin, Copy, CreditCard, ChevronDown,
} from "lucide-react";
import { CreateSOStep2, EXTENDED_CATALOG, type SOLineItem } from "./CreateSOStep2";
import { useModalShortcuts, KbdHint } from "./ModalKeyboard";
import { Button } from "./ui/Button";
import { useDiscardGuard } from "./ui/DiscardChangesDialog";
import { DateEditModal, type SODateType, type DateConfig } from "./ui/DateEditModal";
import { DateConfigCards } from "./DateConfigCards";

/* ═══ Typography — CSS variable tokens only ═══ */
const font: React.CSSProperties = {};
const labelStyle: React.CSSProperties = { fontSize: "var(--text-label)", fontWeight: "var(--font-weight-medium)" };
const labelNormal: React.CSSProperties = { fontSize: "var(--text-label)", fontWeight: "var(--font-weight-normal)" };
const labelSemi: React.CSSProperties = { fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" };
const captionStyle: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" };
const captionNormal: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" };
const captionSemi: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" };
const microStyle: React.CSSProperties = { fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.05em", textTransform: "uppercase" as const };

/* ═══ Constants ═══ */
const MODAL_WIDTH = 1160;
const MODAL_HEIGHT = 'min(calc(100vh - 40px), 960px)';

/* ═══ Mock Data ═══ */
interface Customer {
  id: string;
  name: string;
  initials: string;
  contactCount: number;
  address: string;
  phone: string;
  fax: string;
  email: string;
  status: string[];
  pocs: POC[];
}

interface POC {
  id: string;
  name: string;
  initials: string;
  isPrimary: boolean;
  role: string;
  phone: string;
  extension: string;
  email: string;
}

const MOCK_CUSTOMERS: Customer[] = [
  {
    id: "C-001", name: "Metro City Fire & Rescue", initials: "MC", contactCount: 131,
    address: "1000 Business Park Dr, Huntsville, Alabama 35806",
    phone: "(302) 611-6611", fax: "(618) 830-8073 Ext. 718", email: "business@dcptechnical.com",
    status: ["Customer", "Temecula, CA", "Active"],
    pocs: [
      { id: "P-001", name: "Jane Ellison", initials: "JE", isPrimary: true, role: "Finance Director | Fire Chief", phone: "(718) 264-8918", extension: "Ext. 8391", email: "jane.ellison@metrocityfire.gov" },
      { id: "P-002", name: "Patricia Williams", initials: "PW", isPrimary: false, role: "Operations Chief | Maintenance Supe...", phone: "(590) 243-5486", extension: "Ext. 3004", email: "patricia.williams@metrocityfire.gov" },
      { id: "P-003", name: "Jennifer Hooper", initials: "JH", isPrimary: false, role: "Captain | Procurement Officer", phone: "(093) 136-8536", extension: "Ext. 7004", email: "jennifer.hooper@metrocityfire.gov" },
      { id: "P-004", name: "Leila Wilkins", initials: "LW", isPrimary: false, role: "Fleet Manager | Shift Director", phone: "(192) 601-4188", extension: "Ext. 1347", email: "leila.wilkins@metrocityfire.gov" },
      { id: "P-M01", name: "Sherry Miller", initials: "SM", isPrimary: false, role: "Logistics Coordinator", phone: "(941) 988-5035", extension: "Ext. 146", email: "sherry.miller@metrocityfire.gov" },
      { id: "P-M02", name: "Peyton Miller", initials: "PM", isPrimary: false, role: "Administrative Assistant | Captain", phone: "(765) 672-9597", extension: "Ext. 8147", email: "peyton.miller@metrocityfire.gov" },
      { id: "P-M03", name: "Michael Miller", initials: "MM", isPrimary: false, role: "Deputy Chief | Operations Chief", phone: "(830) 818-7655", extension: "Ext. 6388", email: "michael.miller@metrocityfire.gov" },
      { id: "P-M04", name: "Sherry Miller", initials: "SM", isPrimary: false, role: "Fire Chief | Operations Chief", phone: "(746) 598-9521", extension: "Ext. 1805", email: "sherry.miller2@metrocityfire.gov" },
      { id: "P-M05", name: "Michael Miller", initials: "MM", isPrimary: false, role: "Admin | Finance Director", phone: "(544) 797-1529", extension: "Ext. 9632", email: "michael.miller2@metrocityfire.gov" },
      { id: "P-M06", name: "Jennifer Miller", initials: "JM", isPrimary: false, role: "Deputy Chief | Captain", phone: "(659) 460-8910", extension: "Ext. 3318", email: "jennifer.miller@metrocityfire.gov" },
      { id: "P-M07", name: "John Miller", initials: "JM", isPrimary: true, role: "Fire Chief | Maintenance Supervisor", phone: "(519) 975-2730", extension: "Ext. 161", email: "john.miller@metrocityfire.gov" },
      { id: "P-M08", name: "Robert Miller", initials: "RM", isPrimary: false, role: "Admin | Fleet Manager", phone: "(411) 228-1814", extension: "Ext. 9596", email: "robert.miller@metrocityfire.gov" },
    ],
  },
  {
    id: "C-002", name: "Tri-County EMS Authority", initials: "TE", contactCount: 77,
    address: "1000 Business Park Dr, Daxton, Georgia 30319",
    phone: "(404) 555-0200", fax: "(404) 555-0201", email: "orders@tricountyems.org",
    status: ["Active"],
    pocs: [
      { id: "P-005", name: "Braelyn Miller", initials: "BM", isPrimary: true, role: "EMS Director | Captain", phone: "(568) 530-1789", extension: "Ext. 1368", email: "braelyn.miller@tricountyems.org" },
      { id: "P-006", name: "Janna Rodriguez", initials: "JR", isPrimary: false, role: "Captain | Engineer", phone: "(270) 393-8736", extension: "Ext. 1362", email: "janna.rodriguez@tricountyems.org" },
      { id: "P-007", name: "Sherry Garcia", initials: "SG", isPrimary: false, role: "Deputy Officer | Procurement Officer", phone: "(288) 781-4952", extension: "Ext. 564", email: "sherry.garcia@tricountyems.org" },
      { id: "P-008", name: "Janna Davis", initials: "JD", isPrimary: false, role: "Fire Chief | Administrative Assistant", phone: "(559) 537-4426", extension: "Ext. 2307", email: "janna.davis@tricountyems.org" },
    ],
  },
  {
    id: "C-003", name: "Lakewood Community Hospital", initials: "LC", contactCount: 63,
    address: "1000 Business Park Dr, Georgetown, Kentucky 40324",
    phone: "(207) 555-0300", fax: "(207) 555-0301", email: "supply@lakewoodhosp.org",
    status: ["Active", "Net 45"],
    pocs: [
      { id: "P-009", name: "Mary Miller", initials: "MM", isPrimary: false, role: "Procurement Officer | Medical Director", phone: "(485) 489-1887", extension: "Ext. 3343", email: "mary.miller@lakewoodcommunity.org" },
      { id: "P-010", name: "Elizabeth Miller", initials: "EM", isPrimary: false, role: "EMS Director | Deputy Chief", phone: "(577) 391-4153", extension: "Ext. 4180", email: "elizabeth.miller@lakewoodcommunity.org" },
      { id: "P-011", name: "Patricia Miller", initials: "PM", isPrimary: true, role: "Finance Director | Procurement", phone: "(351) 490-6003", extension: "Ext. 1894", email: "patricia.miller@lakewoodcommunity.org" },
    ],
  },
  {
    id: "C-004", name: "Pinecrest Volunteer Fire Dept", initials: "PV", contactCount: 49,
    address: "1000 Business Park Dr, Charlotte, North Carolina 28202",
    phone: "(704) 555-0400", fax: "(704) 555-0401", email: "chief@pinecrestvfd.org",
    status: ["Active"],
    pocs: [
      { id: "P-012", name: "Robert Johnson", initials: "RJ", isPrimary: true, role: "Fire Chief | Station Commander", phone: "(704) 555-0401", extension: "Ext. 100", email: "rjohnson@pinecrestvfd.org" },
    ],
  },
  {
    id: "C-005", name: "Summit Regional Medical Center", initials: "SR", contactCount: 85,
    address: "1000 Business Park Dr, Huntsville, Alabama 35806",
    phone: "(256) 555-0500", fax: "(256) 555-0501", email: "purchasing@summitmed.org",
    status: ["Active", "Priority"],
    pocs: [
      { id: "P-013", name: "Angela Torres", initials: "AT", isPrimary: true, role: "Director of Emergency Services", phone: "(256) 555-0501", extension: "Ext. 3200", email: "atorres@summitmed.org" },
      { id: "P-014", name: "Daniel Kim", initials: "DK", isPrimary: false, role: "Procurement Manager", phone: "(256) 555-0502", extension: "Ext. 3201", email: "dkim@summitmed.org" },
    ],
  },
  {
    id: "C-006", name: "Eagle County Sheriff's Office", initials: "EC", contactCount: 66,
    address: "1000 Business Park Dr, San Antonio, Texas 78045",
    phone: "(601) 555-0600", fax: "(601) 555-0601", email: "fleet@eaglecounty.gov",
    status: ["Active"],
    pocs: [
      { id: "P-015", name: "Marcus Webb", initials: "MW", isPrimary: true, role: "Fleet Manager | Undersheriff", phone: "(601) 555-0601", extension: "Ext. 400", email: "mwebb@eaglecounty.gov" },
    ],
  },
  {
    id: "C-007", name: "Pacific Northwest Ambulance Co.", initials: "PN", contactCount: 68,
    address: "1000 Business Park Dr, Corporación, Colorado 81722",
    phone: "(815) 555-0700", fax: "(815) 555-0701", email: "ops@pacnwamb.com",
    status: ["Active"],
    pocs: [
      { id: "P-016", name: "Lisa Chen", initials: "LC", isPrimary: true, role: "Operations Director", phone: "(815) 555-0701", extension: "Ext. 210", email: "lchen@pacnwamb.com" },
    ],
  },
  {
    id: "C-008", name: "Riverside Utility District", initials: "RU", contactCount: 102,
    address: "1000 Business Park Dr, Santa Ana, Indiana 46204",
    phone: "(317) 555-0800", fax: "(317) 555-0801", email: "admin@riversideud.gov",
    status: ["Active", "Government"],
    pocs: [
      { id: "P-017", name: "Sandra Lee", initials: "SL", isPrimary: true, role: "District Manager | Safety Officer", phone: "(317) 555-0801", extension: "Ext. 500", email: "slee@riversideud.gov" },
      { id: "P-018", name: "James Park", initials: "JP", isPrimary: false, role: "Purchasing Agent", phone: "(317) 555-0802", extension: "Ext. 501", email: "jpark@riversideud.gov" },
    ],
  },
];

/* ═══ Avatar — pastel squircle with CSS variable palette ═══ */
const PASTEL_PALETTE = [
  { bg: "bg-chart-4/15", color: "var(--chart-4)" },  // soft purple
  { bg: "bg-chart-3/15", color: "var(--chart-3)" },  // soft amber
  { bg: "bg-primary/15", color: "var(--primary)" },   // soft blue
  { bg: "bg-accent/15", color: "var(--accent)" },     // soft green
  { bg: "bg-chart-5/15", color: "var(--chart-5)" },   // soft coral
];

function getPastelIndex(initials: string): number {
  const hash = initials.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return hash % PASTEL_PALETTE.length;
}

function Avatar({ initials, size = 36 }: { initials: string; size?: number }) {
  const palette = PASTEL_PALETTE[getPastelIndex(initials)];
  return (
    <div
      className={palette.bg}
      style={{
        width: size, height: size, minWidth: size,
        borderRadius: "50%",
        color: palette.color,
        display: "flex", alignItems: "center", justifyContent: "center",
        ...font,
        fontSize: size < 28 ? "var(--text-micro)" : "var(--text-caption)",
        fontWeight: "var(--font-weight-semibold)",
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}

/* ── light-blue hover helper (consistent across entire modal) ── */
const hoverBlue = {
  onMouseEnter: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; },
  onMouseLeave: (e: React.MouseEvent<HTMLElement>) => { e.currentTarget.style.backgroundColor = ""; },
};

/* ═══ Props ═══ */
export interface SOCreationPayload {
  customer: string;
  customerInitials: string;
  customerAddress: string;
  pocName: string;
  pocEmail: string;
  priority: "Low" | "Standard" | "High";
  tags: string[];
  lineItems: { catalogCode: string; itemCode: string; itemName: string; itemType: "Serialized" | "Non-Serialized" | "Lot Controlled"; unitPrice: number; qty: number }[];
}

interface CreateSOModalProps {
  open: boolean;
  onClose: () => void;
  onContinue?: (payload: SOCreationPayload) => void;
}

export function CreateSOModal({ open, onClose, onContinue }: CreateSOModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedPOC, setSelectedPOC] = useState<POC | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState("");
  const [searchTab, setSearchTab] = useState<"All" | "Customers" | "Point of Contact">("All");
  const [showInactive, setShowInactive] = useState(false);
  const [priority, setPriority] = useState<"Low" | "Standard" | "High">("Standard");
  const [tags, setTags] = useState<string[]>(["Engine Companies", "Hydraulics"]);
  const [tagInput, setTagInput] = useState("");
  const [selectedItems, setSelectedItems] = useState<SOLineItem[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* Reset on open/close */
  useEffect(() => {
    if (!open) {
      setStep(1);
      setSelectedCustomer(null);
      setSelectedPOC(null);
      setShowSearch(false);
      setSearch("");
      setSearchTab("All");
      setShowInactive(false);
      setSelectedItems([]);
    }
  }, [open]);

  /* Focus search when overlay opens */
  useEffect(() => {
    if (showSearch) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [showSearch]);

  /* Build the creation payload from modal state */
  const buildPayload = useCallback((): SOCreationPayload | null => {
    if (!selectedCustomer || !selectedPOC || selectedItems.length === 0) return null;
    return {
      customer: selectedCustomer.name,
      customerInitials: selectedCustomer.initials,
      customerAddress: selectedCustomer.address,
      pocName: selectedPOC.name,
      pocEmail: selectedPOC.email,
      priority,
      tags,
      lineItems: selectedItems.map(si => {
        const cat = EXTENDED_CATALOG.find(c => c.code === si.productId);
        return {
          catalogCode: si.productId,
          itemCode: cat?.code || si.productId,
          itemName: cat?.name || si.name,
          itemType: (cat?.type || "Non-Serialized") as "Serialized" | "Non-Serialized" | "Lot Controlled",
          unitPrice: si.unitPrice,
          qty: si.quantity,
        };
      }),
    };
  }, [selectedCustomer, selectedPOC, selectedItems, priority, tags]);

  /* Dirty state — any user selections/entries means unsaved changes */
  const isDirty = !!selectedCustomer || !!selectedPOC || selectedItems.length > 0
    || priority !== "Standard" || tags.length !== 2 || tagInput.length > 0;

  const { guardedClose, discardDialog } = useDiscardGuard(isDirty, onClose);

  /* Keyboard shortcuts */
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setShowSearch(true);
      }
      if (e.key === "Escape") {
        if (showSearch) { setShowSearch(false); setSearch(""); }
        else guardedClose();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (step === 1 && selectedCustomer && selectedPOC) setStep(2);
        else if (step === 2) { const p = buildPayload(); if (p) onContinue?.(p); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, showSearch, selectedCustomer, selectedPOC, selectedItems, step, guardedClose, onContinue, buildPayload]);

  /* Filter customers by search */
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return MOCK_CUSTOMERS;
    const q = search.toLowerCase();
    return MOCK_CUSTOMERS.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.pocs.some(p => p.name.toLowerCase().includes(q))
    );
  }, [search]);

  /* Filter POCs by search */
  const filteredPOCGroups = useMemo(() => {
    if (!search.trim()) return MOCK_CUSTOMERS.slice(0, 3);
    const q = search.toLowerCase();
    return MOCK_CUSTOMERS.filter(c =>
      c.pocs.some(p => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
    ).map(c => ({
      ...c,
      pocs: c.pocs.filter(p => p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || p.email.toLowerCase().includes(q)),
    }));
  }, [search]);

  const handleSelectCustomer = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    const primary = customer.pocs.find(p => p.isPrimary) || customer.pocs[0];
    setSelectedPOC(primary || null);
    setShowSearch(false);
    setSearch("");
  }, []);

  const handleSelectPOC = useCallback((customer: Customer, poc: POC) => {
    setSelectedCustomer(customer);
    setSelectedPOC(poc);
    setShowSearch(false);
    setSearch("");
  }, []);

  const clearSelection = () => {
    setSelectedCustomer(null);
    setSelectedPOC(null);
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  if (!open) return null;

  const hasSelection = !!selectedCustomer && !!selectedPOC;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: "var(--z-modal)" as any, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {/* Backdrop */}
      <div
        style={{ position: "absolute", inset: 0, background: "var(--foreground)", opacity: 0.35 }}
        onClick={guardedClose}
      />
      {discardDialog}

      {/* Modal — fixed width + height, consistent across all states */}
      <div style={{
        position: "relative",
        width: MODAL_WIDTH,
        maxWidth: "95vw",
        height: MODAL_HEIGHT,
        display: "flex",
        flexDirection: "column",
        background: "var(--card)",
        borderRadius: 16,
        boxShadow: "var(--elevation-5)",
        overflow: "hidden",
      }}>

        {/* ── Header ── */}
        <div style={{ padding: "20px 24px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <div style={{ ...labelSemi, color: "var(--foreground)", fontSize: "var(--text-label)" }}>Create New Sales Order</div>
              <div style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.4, marginTop: 1 }}>New Draft</div>
            </div>
            <button
              onClick={guardedClose}
              className="flex items-center justify-center transition-colors"
              style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid var(--border)", background: "var(--card)", cursor: "pointer", color: "var(--foreground)", opacity: 0.4 }}
              {...hoverBlue}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* Step Tabs */}
          <div style={{ display: "flex", gap: 0, marginTop: 16, borderBottom: "1px solid var(--border)" }}>
            <StepTab stepNum={1} label="Select Recipient" active={step === 1} done={step === 2} onClick={step === 2 ? () => setStep(1) : undefined} />
            <StepTab stepNum={2} label="Add Line Items" active={step === 2} />
          </div>
        </div>

        {/* ── Body ── */}
        {step === 1 ? (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 0", background: hasSelection ? "var(--secondary)" : undefined }}>
            {!hasSelection && (
              <>
                <div style={{ ...labelSemi, color: "var(--foreground)", marginBottom: 2 }}>Select Customer and Recipient</div>
                <div style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.5, marginBottom: 14 }}>
                  Choose a contact or create a new one to create this sales order.{" "}
                  <span style={{ color: "var(--primary)", cursor: "pointer" }}>Learn more ↗</span>
                </div>
              </>
            )}

            {/* Search Bar */}
            {!hasSelection && (
              <div
                onClick={() => setShowSearch(true)}
                className="transition-all"
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 16px", borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--input-background)",
                  cursor: "text",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--elevation-1)"; e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.backgroundColor = "var(--primary-tint-card)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.backgroundColor = "var(--input-background)"; }}
              >
                <Search style={{ width: 16, height: 16, color: "var(--foreground)", opacity: 0.35, flexShrink: 0 }} />
                <span style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.4, flex: 1 }}>
                  Search for the customer or contact to create a sales order for...
                </span>
                <kbd style={{
                  ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" as any, padding: "2px 6px",
                  borderRadius: 4, border: "1px solid var(--border)", background: "var(--secondary)",
                  color: "var(--foreground)", opacity: 0.5,
                }}>⌘K</kbd>
              </div>
            )}

            {/* Empty State */}
            {!hasSelection && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "64px 0 48px" }}>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--secondary)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                  <Search style={{ width: 20, height: 20, color: "var(--foreground)", opacity: 0.2 }} />
                </div>
                <div style={{ ...labelSemi, color: "var(--foreground)", marginBottom: 4 }}>No Recipient Selected.</div>
                <div style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.45 }}>Select the contact you need to create sales order for</div>
              </div>
            )}

            {/* Selected State */}
            {hasSelection && selectedCustomer && selectedPOC && (
              <SelectedState
                customer={selectedCustomer}
                poc={selectedPOC}
                onClear={clearSelection}
                onChangeCustomer={() => setShowSearch(true)}
                priority={priority}
                onPriorityChange={setPriority}
                tags={tags}
                tagInput={tagInput}
                onTagInputChange={setTagInput}
                onAddTag={addTag}
                onRemoveTag={(t) => setTags(tags.filter(x => x !== t))}
              />
            )}
          </div>
        ) : (
          <CreateSOStep2
            lineItems={selectedItems}
            onLineItemsChange={setSelectedItems}
            hasCustomer={!!selectedCustomer}
          />
        )}

        {/* ── Footer ── */}
        {step === 1 ? (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
            <Button
              variant="primary"
              size="md"
              disabled={!hasSelection}
              onClick={() => { if (hasSelection) setStep(2); }}
              icon={<ArrowRight style={{ width: 14, height: 14 }} />}
            >
              Continue
              <KbdHint keys="⌘↵" variant="light" />
            </Button>
          </div>
        ) : (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <Button
              variant="ghost"
              size="md"
              onClick={() => setStep(1)}
              icon={<ArrowLeft style={{ width: 14, height: 14 }} />}
            >
              Back
            </Button>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => { const p = buildPayload(); if (p) onContinue?.(p); }}
                disabled={selectedItems.length === 0}
                icon={<Plus style={{ width: 14, height: 14 }} />}
              >
                Create SO
                <KbdHint keys="⌘↵" variant="light" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ═══ Search Overlay ═══ */}
      {showSearch && (
        <SearchOverlay
          search={search}
          onSearchChange={setSearch}
          searchTab={searchTab}
          onSearchTabChange={setSearchTab}
          filteredCustomers={filteredCustomers}
          filteredPOCGroups={filteredPOCGroups}
          onSelectCustomer={handleSelectCustomer}
          onSelectPOC={handleSelectPOC}
          onClose={() => { setShowSearch(false); setSearch(""); }}
          inputRef={searchInputRef}
          showInactive={showInactive}
          onShowInactiveChange={setShowInactive}
        />
      )}
    </div>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════
   Step Tab
   ═══════════════════════════════════════════════════════ */
function StepTab({ stepNum, label, active, done, onClick }: { stepNum: number; label: string; active: boolean; done?: boolean; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className="transition-all"
      onMouseEnter={done ? (e) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; } : undefined}
      onMouseLeave={done ? (e) => { e.currentTarget.style.backgroundColor = ""; } : undefined}
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
        borderBottom: active ? "2px solid var(--primary)" : done ? "2px solid var(--accent)" : "2px solid transparent",
        marginBottom: -1, cursor: done ? "pointer" : active ? "default" : "not-allowed",
        opacity: active || done ? 1 : 0.4,
        borderRadius: "6px 6px 0 0",
        transition: "all 150ms",
      }}
    >
      {done ? (
        <div style={{
          width: 18, height: 18, borderRadius: "50%",
          background: "var(--accent)", color: "var(--accent-foreground)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Check style={{ width: 11, height: 11, strokeWidth: 3 }} />
        </div>
      ) : (
        <div style={{
          width: 18, height: 18, borderRadius: "50%",
          background: active ? "var(--primary)" : "var(--secondary)",
          color: active ? "var(--primary-foreground)" : "var(--foreground)",
          display: "flex", alignItems: "center", justifyContent: "center",
          ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)",
        }}>
          {stepNum}
        </div>
      )}
      <span style={{ ...captionStyle, color: done ? "var(--accent)" : active ? "var(--primary)" : "var(--foreground)" }}>{label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════���══════════
   Search Overlay — matches modal width
   ═══════════════════════════════════════════════════════ */
interface SearchOverlayProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchTab: "All" | "Customers" | "Point of Contact";
  onSearchTabChange: (v: "All" | "Customers" | "Point of Contact") => void;
  filteredCustomers: Customer[];
  filteredPOCGroups: (Customer & { pocs: POC[] })[];
  onSelectCustomer: (c: Customer) => void;
  onSelectPOC: (c: Customer, p: POC) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  showInactive: boolean;
  onShowInactiveChange: (v: boolean) => void;
}

function SearchOverlay({
  search, onSearchChange, searchTab, onSearchTabChange,
  filteredCustomers, filteredPOCGroups,
  onSelectCustomer, onSelectPOC, onClose, inputRef,
  showInactive, onShowInactiveChange,
}: SearchOverlayProps) {
  const TABS: ("All" | "Customers" | "Point of Contact")[] = ["All", "Customers", "Point of Contact"];
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: "var(--z-tooltip)" as any,
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: MODAL_WIDTH,
        maxWidth: "95vw",
        height: MODAL_HEIGHT,
        background: "var(--card)",
        borderRadius: 16,
        boxShadow: "var(--elevation-5)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Search input bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <Search style={{ width: 16, height: 16, color: "var(--foreground)", opacity: 0.4, flexShrink: 0 }} />
          <input
            ref={inputRef}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search for a customer or a point of contact..."
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              ...captionNormal, color: "var(--foreground)",
            }}
          />
          <kbd style={{
            ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" as any, padding: "2px 6px",
            borderRadius: 4, border: "1px solid var(--border)", background: "var(--secondary)",
            color: "var(--foreground)", opacity: 0.5,
          }}>esc</kbd>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{
              width: 26, height: 26, borderRadius: 6, border: "1px solid var(--border)",
              background: "var(--card)", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--foreground)", opacity: 0.4,
            }}
            {...hoverBlue}
          >
            <X style={{ width: 12, height: 12 }} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, padding: "0 20px", borderBottom: "1px solid var(--border)" }}>
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => onSearchTabChange(tab)}
              className="transition-all"
              onMouseEnter={searchTab !== tab ? (e) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; } : undefined}
              onMouseLeave={searchTab !== tab ? (e) => { e.currentTarget.style.backgroundColor = ""; } : undefined}
              style={{
                ...captionStyle, padding: "12px 12px", border: "none", background: "transparent",
                cursor: "pointer",
                color: searchTab === tab ? "var(--primary)" : "var(--foreground)",
                opacity: searchTab === tab ? 1 : 0.5,
                borderBottom: searchTab === tab ? "2px solid var(--primary)" : "2px solid transparent",
                marginBottom: -1, borderRadius: "6px 6px 0 0",
                transition: "all 150ms",
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Results — scrollable */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 16px" }}>
          {/* Customers section */}
          {(searchTab === "All" || searchTab === "Customers") && (
            <>
              <div style={{ ...microStyle, color: "var(--foreground)", opacity: 0.4, marginBottom: 10 }}>
                RECENTLY SEARCHED CUSTOMERS
              </div>
              {filteredCustomers.map(c => (
                <div
                  key={c.id}
                  onClick={() => onSelectCustomer(c)}
                  className="transition-all cursor-pointer"
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "8px 12px",
                    borderRadius: 8, border: "1px solid transparent",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.backgroundColor = ""; }}
                >
                  <Avatar initials={c.initials} size={34} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <HighlightName name={c.name} search={search} style={{ ...captionSemi, color: "var(--foreground)" }} />
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, ...captionNormal, color: "var(--foreground)", opacity: 0.35 }}>
                        <Users style={{ width: 11, height: 11 }} /> {c.contactCount}
                      </span>
                    </div>
                    <div style={{ ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.4, marginTop: 1 }}>{c.address}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* POC section */}
          {(searchTab === "All" || searchTab === "Point of Contact") && (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: searchTab === "All" ? 20 : 0, marginBottom: 10 }}>
                <span style={{ ...microStyle, color: "var(--foreground)", opacity: 0.4 }}>
                  RECENT POINT OF CONTACTS
                </span>
                <button
                  onClick={() => onShowInactiveChange(!showInactive)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    ...captionNormal, color: "var(--foreground)", opacity: 0.5,
                    border: "none", background: "transparent", cursor: "pointer", padding: 0,
                  }}
                >
                  Show Inactive
                  <div style={{
                    width: 30, height: 16, borderRadius: 999, padding: 2,
                    background: showInactive ? "var(--primary)" : "var(--border)",
                    transition: "background 200ms", display: "flex", alignItems: "center",
                  }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%", background: "var(--card)",
                      boxShadow: "var(--elevation-1)",
                      transition: "transform 200ms",
                      transform: showInactive ? "translateX(14px)" : "translateX(0)",
                    }} />
                  </div>
                </button>
              </div>
              {filteredPOCGroups.map(group => {
                const visiblePocs = expandedGroups[group.id] ? group.pocs : group.pocs.slice(0, 4);
                const hasMore = group.pocs.length > 4;
                const remaining = group.pocs.length - 4;

                return (
                  <div key={group.id} style={{ marginBottom: 16 }}>
                    {/* Customer header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", marginBottom: 6 }}>
                      <Avatar initials={group.initials} size={30} />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ ...captionSemi, color: "var(--foreground)" }}>{group.name}</span>
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 3, ...captionNormal, color: "var(--foreground)", opacity: 0.35 }}>
                            <Users style={{ width: 11, height: 11 }} /> {group.contactCount}
                          </span>
                        </div>
                        <div style={{ ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.4 }}>{group.address}</div>
                      </div>
                    </div>

                    {/* POC cards grid — 4 per row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                      {visiblePocs.map(poc => (
                        <POCCard
                          key={poc.id}
                          poc={poc}
                          search={search}
                          onClick={() => onSelectPOC(group, poc)}
                        />
                      ))}
                    </div>

                    {hasMore && (
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                        <button
                          onClick={() => toggleExpand(group.id)}
                          style={{
                            ...captionStyle, color: "var(--primary)", border: "none",
                            background: "transparent", cursor: "pointer", padding: "4px 8px",
                            borderRadius: 4,
                          }}
                          {...hoverBlue}
                        >
                          {expandedGroups[group.id] ? "Show less" : `Show ${remaining} more`}
                        </button>
                        <span style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.3 }}>
                          {group.pocs.length} total
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {/* Create new customer link */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 6 }}>
            <button
              className="transition-colors"
              style={{
                display: "flex", alignItems: "center", gap: 6,
                ...captionStyle, color: "var(--primary)", border: "none",
                background: "transparent", cursor: "pointer", padding: "6px 10px",
                borderRadius: 6,
              }}
              {...hoverBlue}
            >
              <Plus style={{ width: 13, height: 13 }} />
              {search ? `Create a new point of contact '${search}'` : "Create a new customer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   POC Card
   ═══════════════════════════════════════════════════════ */
function POCCard({ poc, search, onClick }: { poc: POC; search: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="transition-all cursor-pointer"
      style={{
        padding: "8px 10px",
        borderRadius: 8,
        border: "1px solid var(--border)",
        background: "var(--card)",
        display: "flex", flexDirection: "column", gap: 6,
        minWidth: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.boxShadow = "var(--elevation-1)"; e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.backgroundColor = "var(--card)"; }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 6, minWidth: 0 }}>
        <Avatar initials={poc.initials} size={24} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <HighlightName name={poc.name} search={search} style={{ ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" as any, color: "var(--foreground)" }} />
            {poc.isPrimary && (
              <span className="bg-primary/12" style={{
                ...font, fontSize: 8, fontWeight: "var(--font-weight-semibold)" as any,
                padding: "1px 5px", borderRadius: 3,
                color: "var(--primary)",
                letterSpacing: "0.03em", whiteSpace: "nowrap", textTransform: "uppercase",
              }}>PRIMARY</span>
            )}
          </div>
          <div style={{ ...font, fontSize: 9, fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.45, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 1 }}>
            {poc.role}
          </div>
        </div>
      </div>

      {/* Contact details */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4, ...font, fontSize: 9, fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.45 }}>
          <Phone style={{ width: 9, height: 9, flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap" }}>{poc.phone}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, ...font, fontSize: 9, fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.45 }}>
          <Copy style={{ width: 9, height: 9, flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap" }}>{poc.extension}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4, ...font, fontSize: 9, fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.45, minWidth: 0 }}>
          <Mail style={{ width: 9, height: 9, flexShrink: 0 }} />
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{poc.email}</span>
        </div>
      </div>
    </div>
  );
}

/* Highlight matching text in name */
function HighlightName({ name, search, style: s }: { name: string; search: string; style: React.CSSProperties }) {
  if (!search.trim()) return <span style={s}>{name}</span>;
  const idx = name.toLowerCase().indexOf(search.toLowerCase());
  if (idx === -1) return <span style={s}>{name}</span>;
  return (
    <span style={s}>
      {name.slice(0, idx)}
      <span className="bg-primary/15" style={{ borderRadius: 2, padding: "0 1px" }}>{name.slice(idx, idx + search.length)}</span>
      {name.slice(idx + search.length)}
    </span>
  );
}

/* ═══ Date Config Cards with inline modal ═══ */
function DateConfigCardsWithModal() {
  const [editingDate, setEditingDate] = useState<SODateType | null>(null);
  const [requestDate, setRequestDate] = useState("03/16/2026");
  const [estShipConfig, setEstShipConfig] = useState<DateConfig>({ dateType: "relative", absoluteValue: "", relativeValue: "20", relativeUnit: "days after order" });
  const [dueDeliveryConfig, setDueDeliveryConfig] = useState<DateConfig>({ dateType: "relative", absoluteValue: "", relativeValue: "30", relativeUnit: "days after order" });

  const handleSave = (config: DateConfig) => {
    if (editingDate === "request") setRequestDate(config.absoluteValue || requestDate);
    else if (editingDate === "estShip") setEstShipConfig(config);
    else if (editingDate === "dueDelivery") setDueDeliveryConfig(config);
    setEditingDate(null);
  };

  const getInitialConfig = (): DateConfig => {
    if (editingDate === "request") return { dateType: "absolute", absoluteValue: requestDate, relativeValue: "", relativeUnit: "days" };
    if (editingDate === "estShip") return estShipConfig;
    if (editingDate === "dueDelivery") return dueDeliveryConfig;
    return { dateType: "absolute", absoluteValue: "", relativeValue: "7", relativeUnit: "days" };
  };

  return (
    <>
      <DateConfigCards
        requestDateValue={requestDate}
        estShipType={estShipConfig.dateType}
        estShipValue={estShipConfig.relativeValue}
        estShipUnit={estShipConfig.relativeUnit}
        dueDeliveryType={dueDeliveryConfig.dateType}
        dueDeliveryValue={dueDeliveryConfig.relativeValue}
        dueDeliveryUnit={dueDeliveryConfig.relativeUnit}
        onEdit={setEditingDate}
      />
      {editingDate && (
        <DateEditModal
          type={editingDate}
          isOpen={true}
          onClose={() => setEditingDate(null)}
          onSave={handleSave}
          initialConfig={getInitialConfig()}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   Selected State — matches Quote module Step 2 layout
   ════════════════════════════���══════════════════════════ */
interface SelectedStateProps {
  customer: Customer;
  poc: POC;
  onClear: () => void;
  onChangeCustomer: () => void;
  priority: "Low" | "Standard" | "High";
  onPriorityChange: (p: "Low" | "Standard" | "High") => void;
  tags: string[];
  tagInput: string;
  onTagInputChange: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (t: string) => void;
}

function SelectedState({
  customer, poc, onClear, onChangeCustomer,
  priority, onPriorityChange,
  tags, tagInput, onTagInputChange, onAddTag, onRemoveTag,
}: SelectedStateProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>

      {/* ── Main White Card Container ── */}
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: "calc(var(--radius) - 2px)",
        padding: "16px 20px",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ ...labelSemi, color: "var(--foreground)" }}>Selected Customer and Recipient</span>
          <button
            onClick={onClear}
            className="transition-colors"
            style={{
              display: "flex", alignItems: "center", gap: 4,
              ...captionStyle, color: "var(--destructive)", border: "none",
              background: "transparent", cursor: "pointer", padding: "4px 10px",
              borderRadius: "calc(var(--radius) - 4px)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--destructive-hover-bg)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
          >
            <X style={{ width: 12, height: 12 }} /> Clear All
          </button>
        </div>

        {/* Gray container with two white sub-boxes */}
        <div style={{
          background: "var(--secondary)",
          border: "1px solid var(--border)",
          borderRadius: "calc(var(--radius) - 4px)",
          padding: 12,
        }}>
          {/* ── White Sub-box 1: Customer Details + Recipients ── */}
          <div style={{
            background: "var(--card)",
            borderRadius: "calc(var(--radius) - 4px)",
            padding: 12,
            marginBottom: 12,
            boxShadow: "var(--elevation-1)",
          }}>
            {/* Customer Details Row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 12 }}>
              {/* Left: Icon + Company */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flex: 1, minWidth: 0 }}>
                {/* Building icon */}
                <div style={{
                  width: 40, height: 40, borderRadius: "calc(var(--radius) - 4px)",
                  background: "var(--secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <Building2 style={{ width: 20, height: 20, color: "var(--foreground)", opacity: 0.35 }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Customer name */}
                  <div style={{ ...labelSemi, color: "var(--foreground)", marginBottom: 4 }}>
                    {customer.name}
                  </div>
                  {/* Address + Change link */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.5 }}>
                      {customer.address}
                    </span>
                    <button
                      onClick={onChangeCustomer}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 3,
                        ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any,
                        color: "var(--primary)", border: "none",
                        background: "transparent", cursor: "pointer", padding: 0,
                        borderBottom: "1px dotted var(--primary)",
                      }}
                    >
                      <ArrowLeftRight style={{ width: 11, height: 11 }} /> Change
                    </button>
                  </div>
                  {/* Status tags — pastel */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {customer.status.map(s => (
                      <span
                        key={s}
                        className={s === "Active" ? "bg-accent/12" : "bg-primary/12"}
                        style={{
                          display: "inline-flex", alignItems: "center", height: 20,
                          ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" as any,
                          padding: "0 8px", borderRadius: 4,
                          color: s === "Active" ? "var(--accent)" : "var(--primary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: Contact Info */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...captionNormal, color: "var(--foreground)", opacity: 0.5 }}>
                  <Phone style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.6 }} />
                  <span>{customer.phone}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...captionNormal, color: "var(--foreground)", opacity: 0.5 }}>
                  <Phone style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.6 }} />
                  <span>{customer.fax}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, ...captionNormal, color: "var(--foreground)", opacity: 0.5 }}>
                  <Mail style={{ width: 12, height: 12, flexShrink: 0, opacity: 0.6 }} />
                  <span>{customer.email}</span>
                </div>
              </div>
            </div>

            {/* Recipients Row — entire row hovers blue */}
            <div
              className="group cursor-pointer transition-all"
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 12px",
                borderRadius: "calc(var(--radius) - 4px)",
                border: "1px solid var(--border)",
                marginTop: 4,
                transition: "all 150ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <span style={{ ...font, fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.45 }}>Recipients</span>

              {/* Primary recipient pill — fully rounded */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "4px 12px 4px 4px",
                borderRadius: 999,
                background: "var(--secondary)",
              }}>
                <Avatar initials={poc.initials} size={28} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ ...captionStyle, color: "var(--foreground)" }}>{poc.name}</span>
                    {poc.isPrimary && (
                      <span className="bg-primary/12" style={{
                        ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" as any,
                        padding: "1px 6px", borderRadius: 999,
                        color: "var(--primary)",
                        letterSpacing: "0.03em",
                      }}>Primary</span>
                    )}
                  </div>
                  <span style={{ ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.4 }}>
                    {poc.role.split("|")[0].trim()}
                  </span>
                </div>
              </div>

              {/* Secondary recipient overlapping circles — pastel, with +X blue circle on top */}
              {(() => {
                const others = customer.pocs.filter(p => p.id !== poc.id);
                if (others.length === 0) return null;
                const MAX_SHOWN = 2;
                const shown = others.slice(0, MAX_SHOWN);
                const overflowCount = others.length - MAX_SHOWN;
                return (
                  <div style={{ display: "flex", alignItems: "center" }}>
                    {shown.map((p, i) => {
                      const pal = PASTEL_PALETTE[getPastelIndex(p.initials)];
                      return (
                        <div key={p.id} className={pal.bg} style={{
                          width: 28, height: 28, borderRadius: "50%",
                          color: pal.color,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" as any,
                          border: "2px solid var(--card)",
                          marginLeft: i > 0 ? -8 : 0,
                          position: "relative",
                          zIndex: MAX_SHOWN - i,
                        }}>
                          {p.initials}
                        </div>
                      );
                    })}
                    {overflowCount > 0 && (
                      <div className="bg-primary/15" style={{
                        width: 28, height: 28, borderRadius: "50%",
                        color: "var(--primary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" as any,
                        border: "2px solid var(--card)",
                        marginLeft: -8,
                        position: "relative",
                        zIndex: MAX_SHOWN + 1,
                      }}>
                        +{overflowCount}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ flex: 1 }} />
              <Edit3 className="group-hover:text-primary transition-colors" style={{ width: 12, height: 12, color: "var(--foreground)", opacity: 0.3 }} />
            </div>
          </div>

          {/* ── White Sub-box 2: Billing, Shipping & Payment ── */}
          <div style={{
            background: "var(--card)",
            borderRadius: "calc(var(--radius) - 4px)",
            padding: 12,
            boxShadow: "var(--elevation-1)",
          }}>
            <div style={{ ...captionStyle, color: "var(--foreground)", opacity: 0.6, marginBottom: 12 }}>
              Billing, Shipping & Payment Configurations
            </div>

            {/* Bill To / Ship To grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <AddressCard label="BILL TO" name={customer.name} address={customer.address} />
              <AddressCard label="SHIP TO" name={customer.name} address={customer.address} />
            </div>

            {/* Config rows */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <ConfigRow label="Payment terms" value="Net 30" />
              <ConfigRow label="Payment method" value="ACH/Direct Deposit" hasIcon />
              <ConfigRow label="Sales Representative" value="Yahya Naveed (You)" isAvatar avatarInitials="YN" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Date Cards (3 columns) — interactive ── */}
      <DateConfigCardsWithModal />

      {/* ── Priority + Tags ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
        <PriorityCard priority={priority} onPriorityChange={onPriorityChange} />
        <TagsCard tags={tags} tagInput={tagInput} onTagInputChange={onTagInputChange} onAddTag={onAddTag} onRemoveTag={onRemoveTag} />
      </div>
    </div>
  );
}

/* ── Address Card — hoverable with pencil icon ── */
function AddressCard({ label, name, address }: {
  label: string; name: string; address: string;
}) {
  return (
    <div
      className="group cursor-pointer transition-all"
      style={{
        borderRadius: "calc(var(--radius) - 4px)",
        background: "var(--card)",
        padding: "10px 12px",
        border: "1px solid var(--border)",
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--card)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <MapPin style={{ width: 12, height: 12, color: "var(--foreground)", opacity: 0.4, flexShrink: 0 }} />
          <span style={{ ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any, color: "var(--foreground)", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        </div>
        <Edit3 className="group-hover:text-primary transition-colors" style={{ width: 12, height: 12, color: "var(--foreground)", opacity: 0.3 }} />
      </div>
      <div>
        <div style={{ ...captionSemi, color: "var(--foreground)", marginBottom: 2 }}>{name}</div>
        <div style={{ ...font, fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.5, lineHeight: 1.5 }}>{address}</div>
        <div style={{ marginTop: 4 }}>
          <span className="bg-primary/12" style={{
            display: "inline-flex", alignItems: "center", height: 18,
            ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" as any,
            padding: "0 6px", borderRadius: 3,
            color: "var(--primary)",
          }}>Default</span>
        </div>
      </div>
    </div>
  );
}

/* ── Config Row — hoverable with pencil, no border between rows ── */
function ConfigRow({ label, value, isAvatar, avatarInitials, hasIcon }: {
  label: string; value: string; isAvatar?: boolean; avatarInitials?: string; hasIcon?: boolean;
}) {
  return (
    <div
      className="group cursor-pointer transition-all"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 10px",
        borderRadius: "calc(var(--radius) - 6px)",
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; }}
    >
      <span style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.5 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {isAvatar && avatarInitials && <Avatar initials={avatarInitials} size={22} />}
        {hasIcon && <CreditCard style={{ width: 12, height: 12, color: "var(--primary)" }} />}
        <span style={{ ...captionSemi, color: "var(--foreground)" }}>{value}</span>
        {isAvatar ? (
          <ChevronDown style={{ width: 12, height: 12, color: "var(--foreground)", opacity: 0.3 }} />
        ) : (
          <Edit3 className="group-hover:text-primary transition-colors" style={{ width: 12, height: 12, color: "var(--foreground)", opacity: 0.3 }} />
        )}
      </div>
    </div>
  );
}

/* ── Date Card — editable style with pencil icon ── */
function DateCard({ label, date, icon }: {
  label: string; date: string; icon?: "calendar" | "clock";
}) {
  const IconComp = icon === "clock" ? Clock : Calendar;
  return (
    <div
      className="group cursor-pointer transition-all"
      style={{
        borderRadius: "calc(var(--radius) - 2px)",
        background: "var(--card)",
        border: "1px solid var(--border)",
        padding: "12px 14px",
        display: "flex", flexDirection: "column", gap: 6,
        boxShadow: "var(--elevation-1)",
        transition: "all 150ms ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; e.currentTarget.style.borderColor = "var(--primary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--card)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <IconComp style={{ width: 12, height: 12, color: "var(--foreground)", opacity: 0.35 }} />
          <span style={{ ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any, color: "var(--foreground)", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
        </div>
        <Edit3 className="group-hover:text-primary transition-colors" style={{ width: 12, height: 12, color: "var(--foreground)", opacity: 0.3 }} />
      </div>
      <span style={{ ...labelSemi, color: "var(--foreground)" }}>{date}</span>
    </div>
  );
}

/* ── Priority Card — Quotes-style dropdown ── */
function PriorityCard({ priority, onPriorityChange }: {
  priority: "Low" | "Standard" | "High";
  onPriorityChange: (p: "Low" | "Standard" | "High") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const priorityColor = (p: string) =>
    p === "High" ? "var(--destructive)" : p === "Standard" ? "var(--primary)" : "var(--foreground)";

  const priorityBgClass = (p: string) =>
    p === "High" ? "bg-destructive/12" : p === "Standard" ? "bg-primary/12" : "bg-secondary";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <div
        className="group cursor-pointer transition-all"
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--card)"; }}
        style={{
          borderRadius: "calc(var(--radius) - 2px)",
          background: "var(--card)",
          border: open ? "1px solid var(--primary)" : "1px solid var(--border)",
          padding: "12px 14px",
          boxShadow: "var(--elevation-1)",
          transition: "all 150ms ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any, color: "var(--foreground)", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em" }}>PRIORITY</span>
          <Edit3 className="group-hover:text-primary transition-colors" style={{ width: 12, height: 12, color: "var(--foreground)", opacity: 0.3 }} />
        </div>
        <span
          className={priorityBgClass(priority)}
          style={{
            display: "inline-block",
            ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any,
            padding: "3px 10px", borderRadius: 4,
            color: priorityColor(priority),
            opacity: priority === "Low" ? 0.7 : 1,
          }}
        >
          {priority}
        </span>
      </div>

      {/* Drop-up */}
      {open && (
        <div style={{
          position: "absolute", bottom: "100%", left: 0, marginBottom: 4,
          minWidth: 140, background: "var(--card)",
          border: "1px solid var(--border)", borderRadius: "calc(var(--radius) - 2px)",
          boxShadow: "var(--elevation-3)", zIndex: 10,
          overflow: "hidden",
        }}>
          {(["High", "Standard", "Low"] as const).map(p => (
            <button
              key={p}
              onClick={() => { onPriorityChange(p); setOpen(false); }}
              className="transition-colors"
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "10px 12px",
                border: "none", background: priority === p ? "var(--secondary)" : "transparent", cursor: "pointer",
                ...captionStyle, color: priorityColor(p),
                borderBottom: "1px solid var(--border)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = priority === p ? "var(--secondary)" : "transparent"; }}
            >
              <span
                className={priorityBgClass(p)}
                style={{
                  ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any,
                  padding: "3px 10px", borderRadius: 4,
                  color: priorityColor(p),
                  opacity: p === "Low" ? 0.7 : 1,
                }}
              >
                {p}
              </span>
              {priority === p && <Check style={{ width: 14, height: 14, color: "var(--primary)" }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tags Card — Quotes-style view/edit toggle ── */
function TagsCard({ tags, tagInput, onTagInputChange, onAddTag, onRemoveTag }: {
  tags: string[];
  tagInput: string;
  onTagInputChange: (v: string) => void;
  onAddTag: () => void;
  onRemoveTag: (t: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) requestAnimationFrame(() => inputRef.current?.focus());
  }, [editing]);

  return (
    <div
      className="group cursor-pointer transition-all"
      onClick={() => { if (!editing) setEditing(true); }}
      onMouseEnter={(e) => { if (!editing) e.currentTarget.style.backgroundColor = "var(--primary-hover-bg)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--card)"; }}
      style={{
        borderRadius: "calc(var(--radius) - 2px)",
        background: "var(--card)",
        border: editing ? "1px solid var(--primary)" : "1px solid var(--border)",
        padding: "12px 14px",
        boxShadow: "var(--elevation-1)",
        transition: "all 150ms ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any, color: "var(--foreground)", opacity: 0.4, textTransform: "uppercase", letterSpacing: "0.05em" }}>TAGS</span>
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(!editing); }}
          style={{
            border: "none", background: "transparent", cursor: "pointer", padding: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: editing ? "var(--primary)" : "var(--foreground)", opacity: editing ? 0.8 : 0.3,
          }}
        >
          <Edit3 style={{ width: 12, height: 12 }} />
        </button>
      </div>

      {editing ? (
        /* Edit mode — drop-up: edit area positioned above the card */
        <div onClick={(e) => e.stopPropagation()} style={{ position: "relative" }}>
          {/* Drop-up panel */}
          <div style={{
            position: "absolute", bottom: "100%", left: -14, right: -14, marginBottom: 8,
            background: "var(--card)", border: "1px solid var(--primary)",
            borderRadius: "calc(var(--radius) - 2px)",
            boxShadow: "var(--elevation-3)", zIndex: 10,
            padding: 12,
          }}>
            <div style={{
              display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
              padding: "6px 8px",
              border: "1px solid var(--border)",
              borderRadius: "calc(var(--radius) - 4px)",
              background: "var(--input-background)",
              minHeight: 36,
            }}>
              {tags.map(t => (
                <span key={t} style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any,
                  padding: "3px 6px 3px 8px", borderRadius: 4,
                  background: "var(--secondary)", color: "var(--foreground)",
                }}>
                  {t}
                  <button
                    onClick={() => onRemoveTag(t)}
                    className="hover:text-destructive transition-colors"
                    style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--foreground)", opacity: 0.4, display: "flex", padding: 0 }}
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </span>
              ))}
              <input
                ref={inputRef}
                value={tagInput}
                onChange={e => onTagInputChange(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onAddTag(); } }}
                placeholder={tags.length === 0 ? "Add tags..." : ""}
                style={{
                  ...font, fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" as any,
                  color: "var(--foreground)", border: "none", outline: "none",
                  background: "transparent", flex: 1, minWidth: 80, padding: "3px 4px",
                }}
              />
            </div>
            <div style={{ ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-normal)" as any, color: "var(--foreground)", opacity: 0.35, marginTop: 4, padding: "0 4px" }}>
              ↵ Enter to add{tags.length >= 5 && <span style={{ color: "var(--destructive)", marginLeft: 12 }}>Max 5 tags</span>}
            </div>
          </div>
          {/* Static tag display below (still visible) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {tags.map(t => (
              <span key={t} style={{
                ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any,
                padding: "4px 10px", borderRadius: 4,
                background: "var(--secondary)", color: "var(--foreground)",
                border: "1px solid var(--border)",
                whiteSpace: "nowrap",
              }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      ) : (
        /* View mode — static tag pills */
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {tags.length > 0 ? (
            <>
              {tags.slice(0, 4).map(t => (
                <span key={t} style={{
                  ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any,
                  padding: "4px 10px", borderRadius: 4,
                  background: "var(--secondary)", color: "var(--foreground)",
                  border: "1px solid var(--border)",
                  whiteSpace: "nowrap",
                }}>
                  {t}
                </span>
              ))}
              {tags.length > 4 && (
                <span style={{
                  ...font, fontSize: "var(--text-small)", fontWeight: "var(--font-weight-medium)" as any,
                  padding: "4px 10px", borderRadius: 4,
                  background: "var(--secondary)", color: "var(--foreground)", opacity: 0.6,
                  whiteSpace: "nowrap",
                }}>
                  +{tags.length - 4} more
                </span>
              )}
            </>
          ) : (
            <span style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.35 }}>No tags</span>
          )}
        </div>
      )}
    </div>
  );
}

export default CreateSOModal;
