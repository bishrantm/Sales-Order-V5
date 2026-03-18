import { useState } from "react";
import { X, Download, Mail, Settings2, EyeOff } from "lucide-react";
import { useModalShortcuts, KbdHint } from "./ModalKeyboard";
import { useToast } from "./ui/Toast";
import { useDiscardGuard } from "./ui/DiscardChangesDialog";
import type { SalesOrder } from "./types";
import { Button } from "./ui/Button";

const font: React.CSSProperties = {};
const caption: React.CSSProperties = { ...font, fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" };
const captionSemi: React.CSSProperties = { ...font, fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-semibold)" };
const micro: React.CSSProperties = { ...font, fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.04em", textTransform: "uppercase" as const };

interface VisibilityOption {
  key: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
}

const DEFAULT_OPTIONS: VisibilityOption[] = [
  { key: "header", label: "Company Logo & Header", description: "Show your company branding at the top.", icon: "🏢", enabled: true },
  { key: "pricing", label: "Pricing Rules", description: "Calculation details and adjustments.", icon: "💰", enabled: false },
  { key: "adjustments", label: "Adjustments", description: "Item-level and order-level adjustments.", icon: "⚙️", enabled: false },
  { key: "attachments", label: "Attachments", description: "Include uploaded files or link references.", icon: "📎", enabled: true },
  { key: "charges", label: "Payment Charges", description: "Fees based on payment method.", icon: "💳", enabled: false },
  { key: "notes", label: "Notes", description: "Internal notes visible to customer.", icon: "📝", enabled: true },
  { key: "terms", label: "Terms & Conditions", description: "Standard terms and payment policies.", icon: "📃", enabled: true },
];

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{
        width: 40, height: 22,
        backgroundColor: enabled ? "var(--primary)" : "var(--border)",
      }}
    >
      <div
        className="absolute top-[2px] rounded-full bg-card transition-transform"
        style={{
          width: 18, height: 18,
          transform: enabled ? "translateX(20px)" : "translateX(2px)",
          boxShadow: "var(--elevation-1)",
        }}
      />
    </button>
  );
}

export function ExportSOModal({ open, so, onClose }: { open: boolean; so: SalesOrder; onClose: () => void }) {
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState(DEFAULT_OPTIONS);
  const { showToast } = useToast();

  const toggleOption = (key: string) => {
    setOptions(prev => prev.map(o => o.key === key ? { ...o, enabled: !o.enabled } : o));
  };

  const subtotal = so.lines.filter(l => !l.cancelled).reduce((s, l) => s + l.orderedQty * l.unitPrice, 0);

  const handleExport = () => {
    showToast({ type: "success", title: `Exporting Sales Order ${so.soNumber} as PDF…` });
    onClose();
  };

  const handleEmail = () => {
    showToast({ type: "success", title: `Emailing Sales Order ${so.soNumber} to customer…` });
    onClose();
  };

  const isDirty = options.some((o, i) => o.enabled !== DEFAULT_OPTIONS[i].enabled);
  const { guardedClose, discardDialog } = useDiscardGuard(isDirty, onClose);
  useModalShortcuts({ onConfirm: handleExport, onClose: guardedClose, confirmDisabled: !open });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-foreground/40"
      style={{ zIndex: "var(--z-modal)" }}
      onClick={guardedClose}
    >
      <div
        className="bg-card rounded-xl border border-border"
        style={{
          boxShadow: "var(--elevation-4)",
          width: showOptions ? 900 : 680,
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          transition: "width 300ms ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-border" style={{ padding: "var(--space-card-padding) 20px" }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Download className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-foreground" style={{ ...captionSemi, fontSize: "var(--text-label)" }}>Export Sales Order</div>
              <div className="text-foreground/50" style={caption}>Preview before exporting — customize what's visible</div>
            </div>
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <button
              onClick={() => setShowOptions(!showOptions)}
              className={`flex items-center rounded-lg border transition-colors ${showOptions ? "bg-primary text-primary-foreground border-primary" : "border-border text-foreground/60 hover:bg-secondary"}`}
              style={{ ...caption, gap: 8, padding: "8px 12px" }}
            >
              {showOptions ? <><EyeOff className="w-3.5 h-3.5" /> Hide Options</> : <><Settings2 className="w-3.5 h-3.5" /> Visibility Options</>}
            </button>
            <button onClick={guardedClose} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-foreground/50" />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Visibility Settings panel */}
          {showOptions && (
            <div className="border-r border-border overflow-y-auto" style={{ width: 280, flexShrink: 0, padding: "var(--space-card-padding)" }}>
              <div className="flex items-center" style={{ gap: 6, marginBottom: 12 }}>
                <Settings2 className="w-3.5 h-3.5 text-foreground/40" />
                <span className="text-foreground" style={{ ...micro }}>VISIBILITY SETTINGS</span>
              </div>
              <div className="text-foreground/50" style={{ ...caption, fontWeight: "var(--font-weight-normal)", marginBottom: 16 }}>
                Choose what your customer will see on this sales order.
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {options.map(opt => (
                  <div key={opt.key} className="flex items-start justify-between" style={{ gap: 12 }}>
                    <div className="flex items-start" style={{ gap: 10 }}>
                      <span style={{ fontSize: "var(--text-base)", lineHeight: 1, marginTop: 2 }}>{opt.icon}</span>
                      <div>
                        <div className="text-foreground" style={captionSemi}>{opt.label}</div>
                        <div className="text-foreground/40" style={{ ...caption, fontWeight: "var(--font-weight-normal)" }}>{opt.description}</div>
                      </div>
                    </div>
                    <Toggle enabled={opt.enabled} onChange={() => toggleOption(opt.key)} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview area */}
          <div className="flex-1 overflow-y-auto" style={{ padding: "var(--space-card-padding)", background: "var(--secondary)" }}>
            <div className="text-foreground/40" style={{ ...micro, marginBottom: 8 }}>PREVIEW</div>
            <div className="bg-card rounded-lg border border-border" style={{ boxShadow: "var(--elevation-1)", padding: "32px 40px", minHeight: 500 }}>
              {/* Omne branding header */}
              {options.find(o => o.key === "header")?.enabled && (
                <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
                  <div>
                    <div className="flex items-center" style={{ gap: 8, marginBottom: 4 }}>
                      <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center" style={{ color: "var(--primary-foreground)", fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>O</div>
                      <span className="text-foreground" style={{ fontSize: "var(--text-h4)", fontWeight: "var(--font-weight-semibold)" }}>Omne</span>
                    </div>
                    <div className="text-foreground/50" style={{ ...caption, fontWeight: "var(--font-weight-normal)", lineHeight: 1.5 }}>
                      200 Park Avenue, 18th Floor<br />
                      New York, NY 10166 · (212) 555-0482
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-foreground" style={{ fontSize: "var(--text-h3)", fontWeight: "var(--font-weight-semibold)", letterSpacing: "0.02em" }}>SALES ORDER</div>
                    <div className="text-foreground/60" style={{ ...caption, fontWeight: "var(--font-weight-normal)" }}>
                      {so.soNumber}<br />
                      Date: {so.createdDate.split("/").slice(1).join("/") + "/" + so.createdDate.split("/")[0]}<br />
                      Valid Until: {(() => {
                        const parts = so.createdDate.split("/").map(Number);
                        const d = new Date(parts[0], parts[1] - 1, parts[2]);
                        d.setDate(d.getDate() + 30);
                        return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 3, background: "var(--primary)", borderRadius: 2, marginBottom: 24 }} />

              {/* Bill To + SO Details */}
              <div className="flex" style={{ gap: 40, marginBottom: 24 }}>
                <div style={{ flex: 1 }}>
                  <div className="text-foreground/40" style={{ ...micro, marginBottom: 4 }}>BILL TO</div>
                  <div className="text-foreground" style={{ ...captionSemi, marginBottom: 2 }}>{so.customer}</div>
                  <div className="text-foreground/60" style={{ ...caption, fontWeight: "var(--font-weight-normal)", lineHeight: 1.5 }}>
                    Attn: Karen Rodriguez<br />
                    456 Enterprise Blvd, Floor 12<br />
                    New York, NY 10001
                  </div>
                </div>
                <div>
                  <div className="text-foreground/40" style={{ ...micro, marginBottom: 4 }}>SO DETAILS</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {[
                      { l: "Sales Rep:", v: so.salesRep },
                      { l: "Currency:", v: so.currency },
                      { l: "Payment:", v: so.paymentTerms },
                    ].map(r => (
                      <div key={r.l} className="flex" style={{ gap: 12 }}>
                        <span className="text-foreground/50" style={{ ...caption, fontWeight: "var(--font-weight-normal)", minWidth: 70 }}>{r.l}</span>
                        <span className="text-foreground" style={captionSemi}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Line items table */}
              <table className="w-full" style={{ marginBottom: 24 }}>
                <thead>
                  <tr className="border-b border-border">
                    {["DESCRIPTION", "QTY", "UOM", "UNIT PRICE", "AMOUNT"].map(h => (
                      <th
                        key={h}
                        className={`text-foreground/40 ${h === "DESCRIPTION" ? "text-left" : "text-right"}`}
                        style={{ ...micro, padding: "8px 0", fontWeight: "var(--font-weight-semibold)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {so.lines.filter(l => !l.cancelled).map(line => (
                    <tr key={line.id} className="border-b border-border/40">
                      <td className="text-foreground" style={{ ...caption, fontWeight: "var(--font-weight-normal)", padding: "12px 8px 12px 0", maxWidth: 280 }}>
                        <span style={captionSemi}>{line.itemCode}</span>
                        {line.itemName && <span className="text-foreground/50" style={{ display: "block", marginTop: 2, ...caption, fontWeight: "var(--font-weight-normal)" }}>{line.itemName.length > 80 ? line.itemName.slice(0, 80) + "…" : line.itemName}</span>}
                      </td>
                      <td className="text-right text-foreground" style={{ ...caption, padding: "12px 0" }}>{line.orderedQty}</td>
                      <td className="text-right text-foreground/60" style={{ ...caption, fontWeight: "var(--font-weight-normal)", padding: "12px 0" }}>Each</td>
                      <td className="text-right text-foreground" style={{ ...caption, padding: "12px 0" }}>${line.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                      <td className="text-right text-foreground" style={{ ...captionSemi, padding: "12px 0" }}>${(line.orderedQty * line.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="flex flex-col items-end" style={{ gap: 4 }}>
                <div className="flex items-center border-b border-border" style={{ gap: 40, paddingBottom: 4, minWidth: 200 }}>
                  <span className="text-foreground/50" style={caption}>Subtotal</span>
                  <span className="text-foreground ml-auto" style={captionSemi}>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                </div>
                <div className="flex items-center" style={{ gap: 40, minWidth: 200, paddingTop: 4 }}>
                  <span className="text-foreground" style={{ ...captionSemi, fontSize: "var(--text-label)" }}>Total</span>
                  <span className="text-foreground ml-auto" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>${subtotal.toLocaleString(undefined, { minimumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Notes */}
              {options.find(o => o.key === "notes")?.enabled && so.internalNotes && (
                <div style={{ marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <div className="text-foreground/40" style={{ ...micro, marginBottom: 4 }}>NOTES</div>
                  <div className="text-foreground/60" style={{ ...caption, fontWeight: "var(--font-weight-normal)" }}>{so.internalNotes}</div>
                </div>
              )}

              {/* Terms */}
              {options.find(o => o.key === "terms")?.enabled && (
                <div style={{ marginTop: 16, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
                  <div className="text-foreground/40" style={{ ...micro, marginBottom: 4 }}>TERMS & CONDITIONS</div>
                  <div className="text-foreground/40" style={{ ...caption, fontWeight: "var(--font-weight-normal)", lineHeight: 1.5 }}>
                    Payment is due within the terms stated above. All prices are in {so.currency}. This Sales Order is subject to our standard terms of service. Returns must be initiated within 30 days of delivery.
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between border-t border-border" style={{ padding: "12px 20px" }}>
          <div className="text-foreground/40" style={{ ...caption, fontWeight: "var(--font-weight-normal)" }}>
            Changes only affect this export — they won't modify the sales order.
          </div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={guardedClose} icon={<X className="w-3.5 h-3.5" />}>
              Cancel <KbdHint keys="Esc" />
            </Button>
            <Button variant="secondary" size="sm" onClick={handleEmail} icon={<Mail className="w-3.5 h-3.5" />}>
              Email to Customer
            </Button>
            <Button variant="primary" size="sm" onClick={handleExport} icon={<Download className="w-3.5 h-3.5" />}>
              Export Sales Order <KbdHint keys="⌘↵" variant="light" />
            </Button>
          </div>
        </div>
        {discardDialog}
      </div>
    </div>
  );
}