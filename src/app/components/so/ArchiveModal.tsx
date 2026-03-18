import { X, Archive, AlertTriangle } from "lucide-react";
import { useModalShortcuts, KbdHint } from "./ModalKeyboard";
import { Button } from "./ui/Button";
import type { SalesOrder } from "./types";

/* ═══ Typography — CSS variable tokens only ═══ */
const captionNormal: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-normal)" };
const captionMedium: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" };

interface Props {
  so: SalesOrder;
  onConfirm: () => void;
  onClose: () => void;
}

export function ArchiveModal({ so, onConfirm, onClose }: Props) {
  useModalShortcuts({
    onConfirm,
    onClose,
    confirmDisabled: false,
  });

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: "var(--z-modal)" }}>
      <div className="absolute inset-0 bg-foreground/40" onClick={onClose} />
      <div
        className="relative bg-card rounded-xl border border-border overflow-hidden"
        style={{ width: 440, boxShadow: "var(--elevation-3)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border" style={{ padding: "16px 20px" }}>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-destructive/10 flex items-center justify-center" style={{ width: 40, height: 40 }}>
              <Archive className="text-destructive" style={{ width: 20, height: 20 }} />
            </div>
            <div>
              <h3 className="text-foreground" style={{ fontSize: "var(--text-base)", fontWeight: "var(--font-weight-semibold)" }}>
                Archive Sales Order
              </h3>
              <p className="text-foreground/50 mt-0.5" style={captionNormal}>
                {so.soNumber} &middot; {so.customer}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5 text-foreground/50" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px" }}>
          <div className="flex items-start gap-2 rounded-lg border border-destructive/15 bg-destructive/[0.03]" style={{ padding: "10px 12px" }}>
            <AlertTriangle className="text-destructive shrink-0 mt-0.5" style={{ width: 14, height: 14 }} />
            <div style={{ ...captionNormal, color: "var(--foreground)", opacity: 0.7, lineHeight: 1.45 }}>
              Archived orders are hidden from the main listing by default. They can only be viewed when the{" "}
              <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--destructive)" }}>Archived</span>{" "}
              filter is active. You can unarchive at any time.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-border bg-secondary" style={{ padding: "12px 20px" }}>
          <Button variant="secondary" size="sm" onClick={onClose} icon={<X className="w-3.5 h-3.5" />}>
            Cancel <KbdHint keys="Esc" />
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} icon={<Archive className="w-3.5 h-3.5" />}>
            Archive Order <KbdHint keys="&#8984;&#9166;" variant="light" />
          </Button>
        </div>
      </div>
    </div>
  );
}