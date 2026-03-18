import { useState, useMemo } from "react";
import type { SOLine, WarehouseInventory } from "./types";
import { ItemTypeBadge } from "./StatusBadge";
import { useModalShortcuts, KbdHint } from "./ModalKeyboard";
import { Button } from "./ui/Button";
import { useDiscardGuard } from "./ui/DiscardChangesDialog";
import {
  X, Plus, Check, ChevronDown, Package, Truck, Calendar, FileText,
  Pencil, Trash2, Settings, RefreshCw, CircleDot, CheckCircle2, XCircle,
  Paperclip, Image, Activity,
} from "lucide-react";

/* ─── Font shorthand — used ONLY in SVG text elements which don't inherit CSS ─── */
const SVG_FONT = "'Inter', sans-serif";

/* ─── Pricing Rule Types ─── */
interface PricingRule {
  id: string;
  name: string;
  type: "discount" | "premium";
  pctSign: "-" | "+";
  pct: number;
  amount: number;
  applied: boolean;
  note?: string;
}

interface Props {
  line: SOLine;
  inventory: WarehouseInventory[];
  onClose: () => void;
  onSave: (updates: { orderedQty: number; unitPrice: number }) => void;
  onDelete: () => void;
  readOnly?: boolean;
}

/* ─── Donut Chart (pure SVG) ─── */
function DonutChart({ segments, total, label }: { segments: { value: number; color: string }[]; total: number; label: string }) {
  const size = 170, r = 60, stroke = 22;
  const circumference = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      {/* background ring */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const pct = total > 0 ? seg.value / total : 0;
        const dash = pct * circumference;
        const el = (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += dash;
        return el;
      })}
      {/* center label */}
      <text x={size / 2} y={size / 2 - 6} textAnchor="middle" fill="var(--foreground)" fontSize="18" fontWeight="700" fontFamily={SVG_FONT}>
        {total} EA
      </text>
      <text x={size / 2} y={size / 2 + 12} textAnchor="middle" fill="var(--foreground)" fontSize="10" fontWeight="400" fontFamily={SVG_FONT} opacity={0.4}>
        {label}
      </text>
    </svg>
  );
}

/* ─── Stock Health Bar ─── */
function StockHealthBar({ onHand, min, max }: { onHand: number; min: number; max: number }) {
  const range = max - min || 1;
  const pct = Math.min(100, Math.max(0, ((onHand - min) / range) * 100));
  // color zones: 0-30% red, 30-60% orange, 60-100% green
  const barColor = pct < 30 ? "var(--destructive)" : pct < 60 ? "var(--chart-3)" : "var(--accent)";
  return (
    <div className="relative">
      <div className="w-full h-2 rounded-full overflow-hidden bg-border/60">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      {/* markers */}
      <div className="absolute top-0 h-2 w-0.5 rounded-full bg-destructive" style={{ left: "25%" }} />
      <div className="absolute top-0 h-2 w-0.5 rounded-full bg-chart-3" style={{ left: "75%" }} />
    </div>
  );
}

/* ─── UOM Breakdown Row ─── */
function UOMRow({ label, sub, qty, multiplier, totalEA, pct, color }: { label: string; sub: string; qty: number; multiplier: string; totalEA: string; pct: number; color: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-baseline gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
          <span className="text-xs text-foreground font-semibold">{qty} {label}</span>
          <span className="text-[length:var(--text-small)] text-foreground/40">{sub}</span>
        </div>
        <span className="text-[length:var(--text-small)] text-foreground/40">{multiplier} = {totalEA}</span>
      </div>
      <div className="w-full h-[6px] rounded-full overflow-hidden bg-border/40">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="text-[length:var(--text-micro)] mt-0.5 font-semibold" style={{ color }}>{pct}%</div>
    </div>
  );
}

export function AdvancedConfiguratorModal({ line, inventory, onClose, onSave, onDelete, readOnly }: Props) {
  const [activeTab, setActiveTab] = useState<"inventory" | "attachments" | "gallery" | "activity">("inventory");
  const [qty, setQty] = useState(line.orderedQty);
  const [unitPrice, setUnitPrice] = useState(line.unitPrice);
  const [uomUnit] = useState("EA");
  const [shipMethod] = useState("Courier Pick Up");
  const [carrier] = useState("Hansen & Adkins Auto Transport");
  const doSave = () => { if (!readOnly) onSave({ orderedQty: qty, unitPrice }); };
  const isDirty = !readOnly && (qty !== line.orderedQty || unitPrice !== line.unitPrice);
  const { guardedClose, discardDialog } = useDiscardGuard(isDirty, onClose);
  useModalShortcuts({ onConfirm: readOnly ? undefined : doSave, onClose: readOnly ? onClose : guardedClose });

  // Aggregate inventory across all warehouses for this item
  const itemInventory = useMemo(() => {
    const rows = inventory.filter(inv => inv.itemCode === line.itemCode);
    return {
      onHand: rows.reduce((s, r) => s + r.onHand, 0),
      reserved: rows.reduce((s, r) => s + r.reserved, 0),
      available: rows.reduce((s, r) => s + (r.onHand - r.reserved), 0),
    };
  }, [inventory, line.itemCode]);

  // Mock extended data
  const inProduction = Math.round(itemInventory.onHand * 0.39);
  const onOrder = Math.round(itemInventory.onHand * 0.8);
  const projectedAvailable = itemInventory.available + inProduction + onOrder;

  // Pricing rules (mock, connected to line data)
  const baseSubtotal = qty * unitPrice;
  const [rules] = useState<PricingRule[]>([
    { id: "r1", name: "Early Payment Incentive", type: "discount", pctSign: "-", pct: 2, amount: -(baseSubtotal * 0.02), applied: true },
    { id: "r2", name: "Fleet Volume Discount", type: "discount", pctSign: "-", pct: 4, amount: -(baseSubtotal * 0.04), applied: false, note: "Requires min. 3 units" },
    { id: "r3", name: "Multi-Unit Build Discount", type: "discount", pctSign: "-", pct: 7, amount: -(baseSubtotal * 0.07), applied: false, note: "Requires min. 3 units" },
    { id: "r4", name: "Custom Configuration Premium", type: "premium", pctSign: "+", pct: 8, amount: baseSubtotal * 0.08, applied: true },
  ]);

  const appliedRules = rules.filter(r => r.applied);
  const notAppliedRules = rules.filter(r => !r.applied);
  const rulesTotal = appliedRules.reduce((s, r) => s + r.amount, 0);
  const shippingCost = 1200;
  const subtotal = baseSubtotal;
  const grandTotal = subtotal + rulesTotal + shippingCost;

  // UOM breakdown mock
  const eaQty = Math.round(itemInventory.onHand * 0.55);
  const boxQty = Math.round(itemInventory.onHand * 0.22 / 12);
  const cartonQty = Math.round(itemInventory.onHand * 0.15 / 24);
  const palletQty = 0;

  // Donut segments
  const donutSegments = [
    { value: eaQty, color: "var(--primary)" },
    { value: boxQty * 12, color: "var(--chart-4)" },
    { value: cartonQty * 24, color: "var(--chart-3)" },
    { value: palletQty * 480, color: "var(--destructive)" },
  ];

  const fmt = (n: number) => "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Tabs for left pane
  const tabs = [
    { id: "inventory" as const, label: "Inventory Details", icon: null },
    { id: "attachments" as const, label: "Attachments", count: 5, icon: null },
    { id: "gallery" as const, label: "Gallery", count: 8, icon: null },
    { id: "activity" as const, label: "Activity Log", icon: Activity },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={guardedClose}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-foreground/40" />
      {discardDialog}

      {/* Modal */}
      <div
        className="relative bg-card rounded-xl border border-border shadow-elevation-sm flex flex-col"
        style={{ width: "min(1100px, 94vw)", maxHeight: "92vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-foreground/[0.06]">
              <Settings className="w-4 h-4 text-foreground/60" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[var(--text-base)] text-foreground leading-tight font-bold">Advanced Configurator</h2>
                {readOnly && (
                  <span className="inline-flex items-center rounded bg-foreground/8 text-foreground/50" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", padding: "2px 8px", borderRadius: 4 }}>
                    READ ONLY
                  </span>
                )}
              </div>
              <p className="text-[length:var(--text-small)] text-foreground/40">{line.itemCode}{readOnly && line.cancelled ? " · Cancelled" : ""}</p>
            </div>
          </div>
          <button onClick={readOnly ? onClose : guardedClose} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-foreground/50" />
          </button>
        </div>

        {/* ── Body: 2-column ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* ─── Left Panel ─── */}
          <div className="w-[480px] shrink-0 border-r border-border overflow-y-auto">
            {/* Left Tabs */}
            <div className="flex items-center gap-4 px-6 pt-4 border-b border-border">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 pb-2.5 border-b-2 text-[length:var(--text-caption)] font-medium transition-colors ${
                    activeTab === t.id
                      ? "border-primary text-primary"
                      : "border-transparent text-foreground/50 hover:text-foreground/80"
                  }`}
                >
                  {t.icon && <t.icon className="w-3 h-3" />}
                  {t.label}
                  {t.count !== undefined && (
                    <span className={`text-[length:var(--text-micro)] px-1.5 py-[1px] rounded-full font-semibold ${activeTab === t.id ? "bg-primary/10 text-primary" : "bg-secondary text-foreground/40"}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeTab === "inventory" && (
              <div className="px-6 py-4 space-y-6">
                {/* Timestamp + Refresh */}
                <div className="flex items-center justify-between">
                  <span className="text-[length:var(--text-small)] text-foreground/40">Data view as of 02/17/2026 2:32 PM</span>
                  <button className="flex items-center gap-1.5 text-[length:var(--text-small)] text-foreground/50 hover:text-foreground/80 font-medium transition-colors">
                    <RefreshCw className="w-3 h-3" /> Refresh Page
                  </button>
                </div>

                {/* ── Cumulative Stock Health ── */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CircleDot className="w-3.5 h-3.5 text-foreground/40" />
                      <span className="text-xs text-foreground font-semibold">Cumulative Stock Health</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 border border-border rounded-md text-[length:var(--text-small)] text-foreground/60 font-medium">
                      EA (default) <ChevronDown className="w-3 h-3" />
                    </div>
                  </div>

                  {/* Badge */}
                  <div className="flex justify-center mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs text-accent-foreground font-bold bg-accent">
                      {itemInventory.onHand} EA
                    </span>
                  </div>

                  {/* Health bar */}
                  <StockHealthBar onHand={itemInventory.onHand} min={0} max={itemInventory.onHand * 1.5} />
                  <div className="flex items-center justify-between mt-1 mb-4">
                    <span className="text-[length:var(--text-micro)] text-foreground/35">Min. Quantity</span>
                    <span className="text-[length:var(--text-micro)] text-foreground/35">Max. Quantity</span>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                    {[
                      { label: "On Hand", value: itemInventory.onHand },
                      { label: "In Production", value: inProduction },
                      { label: "Reserved", value: itemInventory.reserved },
                      { label: "On Order", value: onOrder },
                      { label: "Quarantined", value: 0 },
                      { label: "Projected Available", value: projectedAvailable },
                      { label: "Available", value: itemInventory.available },
                      { label: "Undergoing Movement", value: 0 },
                    ].map(stat => (
                      <div key={stat.label} className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-foreground/60">{stat.label}</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-xs text-foreground font-semibold">{stat.value.toLocaleString()}</span>
                          <span className="text-micro text-foreground/35">EA</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── On-Hand by UOM ── */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <div className="text-xs text-foreground font-semibold">On-Hand by Unit of Measure</div>
                      <div className="text-[length:var(--text-small)] text-foreground/40">Converted to Default Stocking Unit Each (EA)</div>
                    </div>
                    <span className="text-[length:var(--text-small)] text-foreground/40 italic">Snapshot as of Today, 2:32 PM</span>
                  </div>

                  {/* Donut */}
                  <DonutChart segments={donutSegments} total={itemInventory.onHand} label="Total On Hand" />

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-2 mb-4">
                    {[
                      { label: "EA", color: "var(--primary)" },
                      { label: "Box", color: "var(--chart-4)" },
                      { label: "Carton", color: "var(--chart-3)" },
                      { label: "Pallet", color: "var(--destructive)" },
                    ].map(leg => (
                      <div key={leg.label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: leg.color }} />
                        <span className="text-[length:var(--text-small)] text-foreground/60">{leg.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* UOM Breakdown bars */}
                  <UOMRow label="EA" sub="EA (EA)" qty={eaQty} multiplier={`${eaQty}×1`} totalEA={`= ${eaQty} EA`} pct={55} color="var(--primary)" />
                  <UOMRow label="Box" sub="Box (12 EA)" qty={boxQty} multiplier={`${boxQty}×12`} totalEA={`= ${boxQty * 12} EA`} pct={22} color="var(--chart-4)" />
                  <UOMRow label="Carton" sub="Carton (24 EA)" qty={cartonQty} multiplier={`${cartonQty}×24`} totalEA={`= ${cartonQty * 24} EA`} pct={15} color="var(--chart-3)" />
                  <UOMRow label="Pallet" sub="Pallet (480 EA)" qty={palletQty} multiplier={`${palletQty}×480`} totalEA={`= ${palletQty * 480} EA`} pct={8} color="var(--destructive)" />
                </div>
              </div>
            )}

            {activeTab === "attachments" && (
              <div className="px-6 py-8 flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
                <Paperclip className="w-8 h-8 text-foreground/15" />
                <p className="text-xs text-foreground/40">5 attachments linked to this item.</p>
                <button className="text-xs text-primary hover:underline font-medium">View Attachments</button>
              </div>
            )}
            {activeTab === "gallery" && (
              <div className="px-6 py-8 flex flex-col items-center justify-center text-center gap-3 min-h-[300px]">
                <Image className="w-8 h-8 text-foreground/15" />
                <p className="text-xs text-foreground/40">8 images in the product gallery.</p>
                <button className="text-xs text-primary hover:underline font-medium">View Gallery</button>
              </div>
            )}
            {activeTab === "activity" && (
              <div className="px-6 py-4 space-y-3">
                {[
                  { time: "Today, 2:30 PM", action: "Price updated from $45,000.00 to $48,200.00", user: "Sarah Chen" },
                  { time: "Yesterday, 11:15 AM", action: "Quantity changed from 1 to 2 units", user: "Marcus Taylor" },
                  { time: "02/14/2026, 9:00 AM", action: "Item added to sales order", user: "Emily Rios" },
                  { time: "02/13/2026, 4:45 PM", action: "Pricing rule 'Early Payment Incentive' applied", user: "System" },
                  { time: "02/12/2026, 10:30 AM", action: "Custom Configuration Premium added (+8%)", user: "Sarah Chen" },
                ].map((entry, i) => (
                  <div key={i} className="flex gap-3 py-2 border-b border-border/50 last:border-b-0">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs text-foreground">{entry.action}</div>
                      <div className="text-[length:var(--text-small)] text-foreground/40 mt-0.5">{entry.time} · {entry.user}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ─── Right Panel ─── */}
          <div className="flex-1 min-w-0 overflow-y-auto">
            <div className="px-6 py-4 space-y-4">
              {/* Item Card */}
              <div className="flex items-start gap-3 p-4 bg-secondary/40 rounded-lg border border-border">
                {/* Tag + icon */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <span className="inline-flex items-center px-2 py-[2px] rounded text-[length:var(--text-micro)] text-primary-foreground font-bold bg-primary">
                    Parts
                  </span>
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-foreground/[0.06]">
                    <Package className="w-5 h-5 text-foreground/30" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-[length:var(--text-caption)] text-foreground font-bold">{line.itemCode}</span>
                    <span className="inline-flex items-center px-1.5 py-[1px] rounded text-[length:var(--text-micro)] font-semibold bg-accent/[0.12] text-accent">
                      Purchased
                    </span>
                    <ItemTypeBadge type={line.itemType} />
                  </div>
                  <p className="text-xs text-foreground/60 leading-relaxed">
                    {line.itemName.length > 140 ? line.itemName.slice(0, 140) + "..." : line.itemName}
                    {line.itemName.length > 140 && (
                      <button className="text-primary hover:underline ml-1 font-medium">see more</button>
                    )}
                  </p>
                </div>
              </div>

              {/* Quantity / Unit */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <CircleDot className="w-3.5 h-3.5 text-foreground/40" />
                  <span className="text-xs text-foreground font-medium">Quantity / Unit</span>
                </div>
                <div className="flex items-stretch border border-border rounded-md overflow-hidden">
                  <input
                    type="number"
                    value={qty}
                    onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-14 px-3 py-1.5 text-xs text-foreground bg-card text-center outline-none font-medium"
                    min={1}
                    readOnly={readOnly}
                  />
                  <div className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary border-l border-border text-[length:var(--text-small)] text-foreground/50 font-medium">
                    {uomUnit} <ChevronDown className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Price Per Unit */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <CircleDot className="w-3.5 h-3.5 text-foreground/40" />
                  <span className="text-xs text-foreground font-medium">Price Per Unit</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[var(--text-base)] text-foreground font-bold">
                    {fmt(unitPrice)}
                  </span>
                  <span className="text-[length:var(--text-small)] text-foreground/40">per EA</span>
                </div>
              </div>

              {/* ── Pricing Rules ── */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-secondary/60 border-b border-border">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-foreground/40" />
                    <span className="text-xs text-foreground font-semibold">Pricing Rules</span>
                    <span className="inline-flex items-center px-1.5 py-[1px] rounded text-micro font-semibold bg-primary/[0.12] text-primary">
                      {appliedRules.length} active
                    </span>
                    {notAppliedRules.length > 0 && (
                      <span className="inline-flex items-center px-1.5 py-[1px] rounded text-micro font-semibold bg-chart-3/[0.12] text-chart-3">
                        {notAppliedRules.length} not applied
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold ${rulesTotal < 0 ? "text-accent" : rulesTotal > 0 ? "text-chart-4" : "text-foreground/50"}`}>
                      {rulesTotal >= 0 ? "+" : ""}{fmt(rulesTotal)}
                    </span>
                    <button className="w-5 h-5 rounded flex items-center justify-center hover:bg-secondary transition-colors">
                      <X className="w-3 h-3 text-foreground/35" />
                    </button>
                  </div>
                </div>

                <div className="px-4 py-2 space-y-0">
                  {rules.map(rule => (
                    <div key={rule.id} className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-b-0">
                      <div className="flex items-start gap-2.5">
                        {rule.applied ? (
                          <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${rule.type === "discount" ? "text-accent" : "text-chart-4"}`} />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive/60 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[length:var(--text-caption)] text-foreground font-medium">{rule.name}</span>
                            {rule.applied && (
                              <span className={`inline-flex items-center px-1.5 py-[1px] rounded text-[length:var(--text-micro)] font-semibold ${
                                rule.type === "discount" ? "bg-accent/10 text-accent" : "bg-chart-4/10 text-chart-4"
                              }`}>
                                {rule.type === "discount" ? "Discount" : "Premium"}
                              </span>
                            )}
                            {!rule.applied && (
                              <span className="inline-flex items-center px-1.5 py-[1px] rounded text-[length:var(--text-micro)] font-semibold bg-destructive/10 text-destructive">
                                Not Applied
                              </span>
                            )}
                          </div>
                          {rule.note && (
                            <span className="text-[length:var(--text-small)] text-foreground/40 block mt-0.5">{rule.note}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium ${rule.applied ? (rule.type === "discount" ? "text-accent/60" : "text-chart-4/60") : "text-foreground/30"}`}>
                          {rule.pctSign}{rule.pct}%
                        </span>
                        <span className={`text-xs font-medium ${rule.applied ? (rule.type === "discount" ? "text-accent" : "text-chart-4") : "text-foreground/30"}`}>
                          {rule.amount >= 0 ? "+" : "-"}{fmt(rule.amount)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-2 border-t border-border">
                  <button className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                    <Plus className="w-3 h-3" /> Add/Modify Rules
                  </button>
                </div>
              </div>

              {/* One-Time Discounts */}
              <div className="flex items-center justify-between py-3 border border-border rounded-lg px-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-3.5 h-3.5 text-foreground/40" />
                  <span className="text-xs text-foreground font-medium">One-Time Discounts/Premiums</span>
                </div>
                <button className="flex items-center gap-1 px-2.5 py-1 border border-border rounded-md text-[length:var(--text-small)] text-foreground/60 hover:bg-secondary font-medium transition-colors">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              {/* Subtotal */}
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <CircleDot className="w-3.5 h-3.5 text-foreground/40" />
                  <span className="text-xs text-foreground font-semibold">Subtotal</span>
                </div>
                <span className="text-[var(--text-base)] text-foreground font-bold">
                  {fmt(subtotal)}
                </span>
              </div>

              {/* ── Shipping Details ── */}
              <div className="space-y-0">
                {/* Shipment Method */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-foreground/40" />
                    <span className="text-xs text-foreground/60">Shipment Method</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground font-medium">{shipMethod}</span>
                    <span className="inline-flex items-center px-1.5 py-[1px] rounded text-micro font-semibold bg-foreground/[0.06] text-foreground">
                      Default
                    </span>
                    <button className="w-5 h-5 rounded flex items-center justify-center hover:bg-secondary transition-colors">
                      <Pencil className="w-3 h-3 text-foreground/35" />
                    </button>
                  </div>
                </div>
                {/* Shipping Carrier */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Truck className="w-3.5 h-3.5 text-foreground/40" />
                    <span className="text-xs text-foreground/60">Shipping Carrier</span>
                  </div>
                  <span className="text-xs text-foreground font-medium">{carrier}</span>
                </div>
                {/* Expected Ship By */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-foreground/40" />
                    <span className="text-xs text-foreground/60">Expected Ship By</span>
                  </div>
                  <span className="text-xs text-foreground font-medium">03/06/2026</span>
                </div>
                {/* Expected Delivery */}
                <div className="flex items-center justify-between py-2.5 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-foreground/40" />
                    <span className="text-xs text-foreground/60">Expected Delivery</span>
                  </div>
                  <span className="text-xs text-foreground font-medium">03/07/2026 – 03/11/2026</span>
                </div>
              </div>

              {/* Item Notes */}
              <div className="flex items-center justify-between py-3 border border-border rounded-lg px-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-foreground/40" />
                  <span className="text-xs text-foreground font-medium">Item Notes & Instructions</span>
                </div>
                <button className="flex items-center gap-1 px-2.5 py-1 border border-border rounded-md text-[length:var(--text-small)] text-foreground/60 hover:bg-secondary font-medium transition-colors">
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>

              {/* ── Total ── */}
              <div className="flex items-end justify-between pt-3">
                <span className="text-xs text-foreground font-bold">Total</span>
                <div className="text-right">
                  <span className="text-[var(--text-h4)] text-foreground block leading-tight font-bold">
                    {fmt(grandTotal)}
                  </span>
                  <span className="text-small text-foreground/40">
                    Rules <span className={rulesTotal < 0 ? "text-accent" : rulesTotal > 0 ? "text-chart-4" : ""}>{rulesTotal >= 0 ? "+" : ""}{fmt(rulesTotal)}</span> &nbsp; Shipping +{fmt(shippingCost)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-border">
          {readOnly ? (
            <>
              <div className="flex items-center gap-2 text-foreground/35" style={{ fontSize: "var(--text-caption)" }}>
                <Settings className="w-3.5 h-3.5" />
                <span>Viewing previously configured item</span>
              </div>
              <button
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-lg text-xs text-foreground/70 hover:bg-secondary border border-border font-medium transition-colors"
              >
                Close <KbdHint keys="Esc" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-4 py-[7px] rounded-lg text-xs text-destructive hover:bg-destructive/5 border border-destructive/20 font-medium transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete from Quote
              </button>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={guardedClose}
                  className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-lg text-xs text-foreground/70 hover:bg-secondary border border-border font-medium transition-colors"
                >
                  Discard Changes <KbdHint keys="Esc" />
                </button>
                <button
                  onClick={doSave}
                  className="inline-flex items-center gap-1.5 px-4 py-[7px] rounded-lg text-xs text-accent-foreground hover:opacity-90 bg-accent font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Save Changes <KbdHint keys="⌘↵" variant="light" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}