/* ATPTooltip — clean ATP explanation overlay.
   Shows only the ATP definition and formula.
   Uses createPortal to escape transformed parent containers. */
import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface ATPTooltipProps {
  product: { code: string; inStock: number };
  children: React.ReactNode;
}

const TOOLTIP_W = 296;
const TOOLTIP_H = 180;

export function ATPTooltip({ product, children }: ATPTooltipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let top = rect.bottom + 8;
        let left = rect.left + rect.width / 2 - TOOLTIP_W / 2;

        /* Keep within viewport */
        if (left < 8) left = 8;
        if (left + TOOLTIP_W > window.innerWidth - 8) left = window.innerWidth - TOOLTIP_W - 8;
        if (top + TOOLTIP_H > window.innerHeight - 8) {
          top = rect.top - TOOLTIP_H - 8;
        }

        setPos({ top, left });
      }
      setOpen(true);
    }, 300);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        className="inline-flex"
      >
        {children}
      </span>
      {open && createPortal(
        <div
          onMouseEnter={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
          onMouseLeave={hide}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: TOOLTIP_W,
            zIndex: 'var(--z-tooltip)' as any,
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            boxShadow: 'var(--elevation-3)',
            padding: 0,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center"
            style={{
              padding: '12px 16px',
              gap: 10,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              className="shrink-0 flex items-center justify-center rounded-full"
              style={{
                width: 24,
                height: 24,
                backgroundColor: 'var(--primary)',
                opacity: 0.9,
              }}
            >
              <Info className="w-3.5 h-3.5" style={{ color: 'var(--primary-foreground)' }} />
            </div>
            <span
              style={{
                fontSize: 'var(--text-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                color: 'var(--foreground)',
              }}
            >
              Available to Promise (ATP)
            </span>
          </div>

          {/* Body */}
          <div style={{ padding: '14px 16px 16px' }}>
            <div
              style={{
                fontSize: 'var(--text-caption)',
                color: 'var(--muted-foreground)',
                lineHeight: 1.55,
              }}
            >
              ATP is the net inventory promisable to new customers, calculated as:
            </div>
            {/* Formula pill */}
            <div
              className="tabular-nums"
              style={{
                marginTop: 10,
                padding: '8px 14px',
                borderRadius: 8,
                background: 'var(--secondary)',
                color: 'var(--foreground)',
                fontSize: 'var(--text-caption)',
                fontWeight: 'var(--font-weight-semibold)',
                textAlign: 'center',
                letterSpacing: '0.01em',
              }}
            >
              On-Hand &minus; Quarantined &minus; Demand
            </div>
            {/* Product + ATP count */}
            <div
              className="flex items-center justify-between"
              style={{ marginTop: 12 }}
            >
              <span
                style={{
                  fontSize: 'var(--text-micro)',
                  fontWeight: 'var(--font-weight-medium)',
                  color: 'var(--muted-foreground)',
                }}
              >
                {product.code}
              </span>
              <span
                className="tabular-nums"
                style={{
                  fontSize: 'var(--text-caption)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: product.inStock <= 5 ? 'var(--chart-3)' : 'var(--accent)',
                }}
              >
                {product.inStock} ATP
              </span>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}