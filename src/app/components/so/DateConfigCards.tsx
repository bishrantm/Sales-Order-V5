import { Calendar, Clock, Pencil } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { SODateType } from './ui/DateEditModal';

const font: CSSProperties = {};

interface DateConfigCardsProps {
  requestDateValue: string;
  estShipType: 'absolute' | 'relative';
  estShipValue: string;
  estShipUnit: string;
  dueDeliveryType: 'absolute' | 'relative';
  dueDeliveryValue: string;
  dueDeliveryUnit: string;
  onEdit: (card: SODateType) => void;
}

export function DateConfigCards({
  requestDateValue,
  estShipType,
  estShipValue,
  estShipUnit,
  dueDeliveryType,
  dueDeliveryValue,
  dueDeliveryUnit,
  onEdit,
}: DateConfigCardsProps) {
  const fmtNow = () => {
    const d = new Date();
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const getRequestDisplay = () => requestDateValue || fmtNow();

  const getEstShipDisplay = () => {
    if (estShipType === 'absolute') return estShipValue || fmtNow();
    return `${estShipValue} ${estShipUnit}`;
  };

  const getDueDeliveryDisplay = () => {
    if (dueDeliveryType === 'absolute') return dueDeliveryValue || fmtNow();
    return `${dueDeliveryValue} ${dueDeliveryUnit}`;
  };

  const cards: { key: SODateType; icon: typeof Calendar; label: string; display: string }[] = [
    { key: 'request', icon: Calendar, label: 'REQUEST DATE', display: getRequestDisplay() },
    { key: 'estShip', icon: Clock, label: 'EST. SHIP DATE', display: getEstShipDisplay() },
    { key: 'dueDelivery', icon: Clock, label: 'DUE DELIVERY DATE', display: getDueDeliveryDisplay() },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map(({ key, icon: Icon, label, display }) => (
        <div
          key={key}
          className="group cursor-pointer transition-all"
          onClick={() => onEdit(key)}
          style={{
            background: 'var(--card)',
            borderRadius: 'calc(var(--radius) - 2px)',
            padding: 12,
            boxShadow: 'var(--elevation-1)',
            border: '1px solid var(--border)',
            transition: 'all 150ms',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.backgroundColor = 'var(--primary-hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.backgroundColor = 'var(--card)';
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <div className="flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5" style={{ color: 'var(--foreground)', opacity: 0.3 }} />
              <label style={{
                ...font, fontSize: 'var(--text-small)', fontWeight: 'var(--font-weight-medium)',
                color: 'var(--foreground)', opacity: 0.35, textTransform: 'uppercase', letterSpacing: '0.5px',
              }}>{label}</label>
            </div>
            <Pencil className="w-3 h-3 transition-colors group-hover:text-primary" style={{ color: 'var(--foreground)', opacity: 0.3 }} />
          </div>
          <div style={{
            ...font, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-medium)',
            color: 'var(--foreground)', lineHeight: 1.3,
          }}>
            {display}
          </div>
        </div>
      ))}
    </div>
  );
}