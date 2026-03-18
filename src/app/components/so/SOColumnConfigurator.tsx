import { useState, useCallback, useRef, useEffect } from "react";
import { Search, GripVertical, X, RotateCcw, Eye, EyeOff } from "lucide-react";
import { createPortal } from "react-dom";
import { useDiscardGuard } from "./ui/DiscardChangesDialog";

export interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  locked?: boolean;
}

interface Props {
  columns: ColumnDef[];
  onChange: (cols: ColumnDef[]) => void;
  onClose: () => void;
}

/* ═══ Typography helpers — CSS variable tokens only ═══ */
const caption: React.CSSProperties = { fontSize: "var(--text-caption)", fontWeight: "var(--font-weight-medium)" };
const captionNormal: React.CSSProperties = { ...caption, fontWeight: "var(--font-weight-normal)" };
const captionSemi: React.CSSProperties = { ...caption, fontWeight: "var(--font-weight-semibold)" };
const micro: React.CSSProperties = { fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" };

/* Tile height constant */
const TILE_H = 32;

export function SOColumnConfigurator({ columns, onChange, onClose }: Props) {
  const [search, setSearch] = useState("");
  const [initialColumns] = useState(() => columns.map(c => ({ ...c })));

  // Dirty = any column visibility or order differs from initial
  const isDirty = columns.some((c, i) => c.key !== initialColumns[i]?.key || c.visible !== initialColumns[i]?.visible);
  const handleDiscard = useCallback(() => {
    onChange(initialColumns);
    onClose();
  }, [initialColumns, onChange, onClose]);
  const { guardedClose, discardDialog } = useDiscardGuard(isDirty, handleDiscard);

  /* ── Drag state ── */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropIdx, setDropIdx] = useState<number | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);
  const dragIdxRef = useRef<number | null>(null);
  const dropIdxRef = useRef<number | null>(null);
  const rowEls = useRef<Map<number, HTMLDivElement>>(new Map());

  const configurable = columns.filter(c => !c.locked);
  const visibleCount = configurable.filter(c => c.visible).length;
  const totalCount = configurable.length;

  const filtered = search
    ? configurable.filter(c => c.label.toLowerCase().includes(search.toLowerCase()))
    : configurable;

  const toggleColumn = (key: string) => {
    onChange(columns.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  };

  const showAll = () => onChange(columns.map(c => c.locked ? c : { ...c, visible: true }));
  const hideAll = () => onChange(columns.map(c => c.locked ? c : { ...c, visible: false }));
  const reset = () => onChange(columns.map(c => c.locked ? c : { ...c, visible: true }));

  /* ── Resolve closest drop target from cursor Y ── */
  const resolveDropIdx = useCallback((clientY: number) => {
    let closest: number | null = null;
    let minDist = Infinity;
    rowEls.current.forEach((el, idx) => {
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      const d = Math.abs(clientY - mid);
      if (d < minDist) { minDist = d; closest = idx; }
    });
    return closest;
  }, []);

  /* ── Pointer handlers ── */
  const onGripDown = useCallback((e: React.PointerEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = true;
    dragIdxRef.current = idx;
    dropIdxRef.current = null;
    setDragIdx(idx);
    setDropIdx(null);
    setCursor({ x: e.clientX, y: e.clientY });
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      setCursor({ x: e.clientX, y: e.clientY });
      const target = resolveDropIdx(e.clientY);
      if (target !== null && target !== dragIdxRef.current) {
        dropIdxRef.current = target;
        setDropIdx(target);
      } else {
        dropIdxRef.current = null;
        setDropIdx(null);
      }
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      const dIdx = dragIdxRef.current;
      const tIdx = dropIdxRef.current;

      if (dIdx !== null && tIdx !== null && dIdx !== tIdx) {
        const dragKey = filtered[dIdx]?.key;
        const dropKey = filtered[tIdx]?.key;
        if (dragKey && dropKey) {
          const fDrag = columns.findIndex(c => c.key === dragKey);
          const fDrop = columns.findIndex(c => c.key === dropKey);
          if (fDrag >= 0 && fDrop >= 0) {
            const next = [...columns];
            const [moved] = next.splice(fDrag, 1);
            next.splice(fDrop, 0, moved);
            // defer onChange to avoid setState-during-render
            requestAnimationFrame(() => onChange(next));
          }
        }
      }

      dragIdxRef.current = null;
      dropIdxRef.current = null;
      setDragIdx(null);
      setDropIdx(null);
      setCursor(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
  }, [filtered, columns, onChange, resolveDropIdx]);

  const dragLabel = dragIdx !== null ? (filtered[dragIdx]?.label ?? null) : null;

  return (
    <>
    {discardDialog}
    <div
      className="bg-card flex flex-col shrink-0 h-full"
      style={{
        width: 260,
        border: "1px solid var(--border)",
        borderTopRightRadius: "var(--radius)",
        borderBottomRightRadius: "var(--radius)",
        borderTopLeftRadius: "var(--radius)",
        boxShadow: "var(--elevation-2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: "16px 16px 12px" }}>
        <div className="flex items-center" style={{ gap: 8 }}>
          <span className="text-foreground" style={captionSemi}>Columns</span>
          <span className="bg-primary/10 text-primary rounded-full" style={{ ...micro, padding: "2px 8px" }}>
            {visibleCount}/{totalCount}
          </span>
        </div>
        <button
          onClick={guardedClose}
          className="w-6 h-6 rounded flex items-center justify-center hover:bg-secondary transition-colors text-foreground/50 hover:text-foreground/80"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: "0 16px 12px" }}>
        <div className="flex items-center border border-border rounded-md" style={{ gap: 8, padding: "4px 8px" }}>
          <Search className="w-3.5 h-3.5 text-foreground/35 shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none text-foreground placeholder-foreground/35"
            style={captionNormal}
            placeholder="Search columns..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Show All / Hide All / Reset */}
      <div className="flex items-center border-b border-border" style={{ gap: 4, padding: "0 16px 12px" }}>
        <button onClick={showAll} className="text-primary hover:text-primary/80 transition-colors" style={{ ...caption, padding: "4px 8px" }}>Show All</button>
        <span className="text-foreground/20">|</span>
        <button onClick={hideAll} className="text-primary hover:text-primary/80 transition-colors" style={{ ...caption, padding: "4px 8px" }}>Hide All</button>
        <span className="text-foreground/20">|</span>
        <button onClick={reset} className="text-foreground/50 hover:text-foreground/80 transition-colors flex items-center" style={{ ...caption, gap: 4, padding: "4px 8px" }}>
          <RotateCcw className="w-3 h-3" /> Reset
        </button>
      </div>

      {/* Column list */}
      <div className="flex-1 overflow-y-auto" style={{ padding: "6px 0" }}>
        {filtered.map((col, idx) => {
          const isDragging = dragIdx === idx;
          const isDropTarget = dropIdx === idx && dragIdx !== null && dragIdx !== idx;
          const showAbove = isDropTarget && dragIdx !== null && dragIdx > idx;
          const showBelow = isDropTarget && dragIdx !== null && dragIdx < idx;

          return (
            <div key={col.key}>
              {/* ── Ghost tile: drop preview ABOVE ── */}
              {showAbove && (
                <div
                  style={{
                    margin: "2px 10px",
                    height: TILE_H,
                    borderRadius: 6,
                    border: "1.5px dashed var(--primary)",
                    background: "var(--secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 16px",
                  }}
                >
                  <GripVertical className="w-3.5 h-3.5 text-primary/30" />
                  <span style={{ ...captionNormal, color: "var(--primary)", opacity: 0.4 }}>{dragLabel}</span>
                </div>
              )}

              {/* ── Actual row tile ── */}
              <div
                ref={el => { if (el) rowEls.current.set(idx, el); else rowEls.current.delete(idx); }}
                className={`flex items-center select-none ${isDragging ? "opacity-25" : ""}`}
                style={{
                  gap: 8,
                  padding: "6px 16px",
                  height: TILE_H + 12,
                  transition: "background 120ms ease",
                  background: isDragging ? "var(--secondary)" : "transparent",
                }}
              >
                {/* Grip handle */}
                <div
                  onPointerDown={e => onGripDown(e, idx)}
                  style={{ cursor: "grab", display: "flex", alignItems: "center", touchAction: "none" }}
                >
                  <GripVertical className="w-3.5 h-3.5 text-foreground/25 shrink-0 hover:text-foreground/50 transition-colors" />
                </div>
                {/* Label */}
                <span
                  className={`truncate flex-1 ${col.visible ? "text-foreground" : "text-foreground/40"}`}
                  style={captionNormal}
                >
                  {col.label}
                </span>
                {/* Eye toggle */}
                <button
                  onClick={() => toggleColumn(col.key)}
                  className={`w-6 h-6 rounded flex items-center justify-center shrink-0 transition-colors ${col.visible ? "text-primary hover:bg-primary/10" : "text-foreground/25 hover:bg-secondary hover:text-foreground/50"}`}
                >
                  {col.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* ── Ghost tile: drop preview BELOW ── */}
              {showBelow && (
                <div
                  style={{
                    margin: "2px 10px",
                    height: TILE_H,
                    borderRadius: 6,
                    border: "1.5px dashed var(--primary)",
                    background: "var(--secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "0 16px",
                  }}
                >
                  <GripVertical className="w-3.5 h-3.5 text-primary/30" />
                  <span style={{ ...captionNormal, color: "var(--primary)", opacity: 0.4 }}>{dragLabel}</span>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center text-foreground/40" style={{ padding: "24px 16px", ...captionNormal }}>
            No columns match search.
          </div>
        )}
      </div>

      {/* ── Floating cursor-attached clone ── */}
      {dragIdx !== null && dragLabel && cursor && createPortal(
        <div
          style={{
            position: "fixed",
            left: cursor.x + 14,
            top: cursor.y - 16,
            zIndex: 9999,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "5px 12px",
            background: "var(--card)",
            border: "1.5px solid var(--primary)",
            borderRadius: 6,
            boxShadow: "var(--elevation-2)",
            opacity: 0.92,
            ...captionNormal,
            color: "var(--primary)",
            fontWeight: "var(--font-weight-medium)",
            whiteSpace: "nowrap" as const,
          }}
        >
          <GripVertical className="w-3 h-3" style={{ opacity: 0.5 }} />
          {dragLabel}
        </div>,
        document.body
      )}

      {/* Hint */}
      <div className="border-t border-border" style={{ padding: "10px 16px" }}>
        <span className="text-foreground/40" style={micro}>
          Drag to reorder &middot; Toggle eye to show/hide
        </span>
      </div>
    </div>
    </>
  );
}