import { Calendar } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

/* ═══ Typography tokens ═══ */
const font: CSSProperties = {};

export type SODateType = 'request' | 'estShip' | 'dueDelivery';

interface DateEditModalProps {
  type: SODateType;
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: DateConfig) => void;
  initialConfig: DateConfig;
}

export interface DateConfig {
  dateType: 'absolute' | 'relative';
  absoluteValue: string;
  relativeValue: string;
  relativeUnit: string;
}

const TITLES: Record<SODateType, string> = {
  request: 'Order Date Configuration',
  estShip: 'Estimated Ship Date Configuration',
  dueDelivery: 'Due Delivery Date Configuration',
};

const DESCRIPTIONS: Record<SODateType, string> = {
  request: 'The date this sales order was placed by the customer',
  estShip: 'The estimated date when items will be shipped from the warehouse',
  dueDelivery: 'The date by which the customer expects to receive the goods',
};

export function DateEditModal({ type, isOpen, onClose, onSave, initialConfig }: DateEditModalProps) {
  const [dateType, setDateType] = useState(initialConfig.dateType || 'absolute');
  const [absoluteValue, setAbsoluteValue] = useState(initialConfig.absoluteValue || '');
  const [relativeValue, setRelativeValue] = useState(initialConfig.relativeValue || '7');
  const [relativeUnit, setRelativeUnit] = useState(initialConfig.relativeUnit || 'days');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ dateType, absoluteValue, relativeValue, relativeUnit });
    onClose();
  };

  const showRelativeToggle = type === 'estShip' || type === 'dueDelivery';

  return createPortal(
    <>
      <div
        className="fixed inset-0 flex items-center justify-center bg-foreground/50"
        onClick={onClose}
        style={{ zIndex: 10001, backdropFilter: 'blur(1px)' }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="p-6 w-full"
          style={{ borderRadius: 12, maxWidth: 480, background: 'var(--card)', boxShadow: 'var(--elevation-5)' }}
        >
          {/* Title */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ ...font, fontSize: 'var(--text-label)', fontWeight: 'var(--font-weight-semibold)', color: 'var(--foreground)', marginBottom: 4 }}>{TITLES[type]}</h2>
            <p style={{ ...font, fontSize: 'var(--text-micro)', color: 'var(--foreground)', opacity: 0.5 }}>{DESCRIPTIONS[type]}</p>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {showRelativeToggle ? (
              <>
                {/* Date Type Toggle */}
                <div>
                  <label style={{ ...font, fontSize: 'var(--text-micro)', color: 'var(--foreground)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 8 }}>Date Type</label>
                  <div className="flex gap-0.5 p-0.5 rounded" style={{ background: 'var(--secondary)' }}>
                    {(['absolute', 'relative'] as const).map(dt => (
                      <button
                        key={dt}
                        onClick={() => setDateType(dt)}
                        className="flex-1 px-3 py-2 rounded transition-colors"
                        style={{
                          ...font, fontSize: 'var(--text-caption)', fontWeight: 'var(--font-weight-medium)',
                          background: dateType === dt ? 'var(--card)' : 'transparent',
                          color: dateType === dt ? 'var(--foreground)' : 'var(--foreground)',
                          opacity: dateType === dt ? 1 : 0.5,
                          boxShadow: dateType === dt ? 'var(--elevation-1)' : 'none',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        {dt === 'absolute' ? 'Absolute Date' : 'Relative Date'}
                      </button>
                    ))}
                  </div>
                </div>

                {dateType === 'absolute' ? (
                  <div>
                    <label style={{ ...font, fontSize: 'var(--text-micro)', color: 'var(--foreground)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 8 }}>Select Date</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="dd/mm/yyyy"
                        value={absoluteValue}
                        onChange={(e) => setAbsoluteValue(e.target.value)}
                        className="w-full pl-3 pr-10 py-2.5"
                        style={{ ...font, fontSize: 'var(--text-caption)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--input-background)', outline: 'none' }}
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded" style={{ color: 'var(--foreground)', opacity: 0.4 }}>
                        <Calendar className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ ...font, fontSize: 'var(--text-micro)', color: 'var(--foreground)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 8 }}>Relative Duration</label>
                    <div className="grid gap-2" style={{ gridTemplateColumns: '80px 1fr' }}>
                      <input
                        type="number"
                        value={relativeValue}
                        onChange={(e) => setRelativeValue(e.target.value)}
                        className="px-3 py-2.5 text-center"
                        style={{ ...font, fontSize: 'var(--text-caption)', fontWeight: 'var(--font-weight-medium)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--input-background)', outline: 'none' }}
                        min="0"
                      />
                      <select
                        value={relativeUnit}
                        onChange={(e) => setRelativeUnit(e.target.value)}
                        className="px-3 py-2.5"
                        style={{ ...font, fontSize: 'var(--text-caption)', color: 'var(--foreground)', opacity: 0.6, border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--input-background)', outline: 'none' }}
                      >
                        <option value="hours">Hours</option>
                        <option value="days">Days after order</option>
                        <option value="weeks">Weeks after order</option>
                        <option value="months">Months after order</option>
                      </select>
                    </div>
                    <p style={{ ...font, fontSize: 'var(--text-micro)', color: 'var(--foreground)', opacity: 0.4, marginTop: 8 }}>
                      {relativeValue} {relativeUnit} after order date
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Request/Order date — only absolute */
              <div>
                <label style={{ ...font, fontSize: 'var(--text-micro)', color: 'var(--foreground)', opacity: 0.4, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 'var(--font-weight-medium)', display: 'block', marginBottom: 8 }}>Select Date</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="dd/mm/yyyy"
                    value={absoluteValue}
                    onChange={(e) => setAbsoluteValue(e.target.value)}
                    className="w-full pl-3 pr-10 py-2.5"
                    style={{ ...font, fontSize: 'var(--text-caption)', color: 'var(--foreground)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', background: 'var(--input-background)', outline: 'none' }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded" style={{ color: 'var(--foreground)', opacity: 0.4 }}>
                    <Calendar className="w-4 h-4" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 h-8 transition-colors"
              style={{ ...font, fontSize: 'var(--text-caption)', fontWeight: 'var(--font-weight-medium)', border: '1px solid var(--border)', color: 'var(--foreground)', opacity: 0.6, borderRadius: 'var(--radius)', background: 'var(--card)', cursor: 'pointer' }}
            >
              Cancel <span style={{ opacity: 0.5, marginLeft: 4 }}>Esc</span>
            </button>
            <button
              onClick={handleSave}
              className="flex-1 h-8 transition-colors"
              style={{ ...font, fontSize: 'var(--text-caption)', fontWeight: 'var(--font-weight-medium)', border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', borderRadius: 'var(--radius)', cursor: 'pointer' }}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}