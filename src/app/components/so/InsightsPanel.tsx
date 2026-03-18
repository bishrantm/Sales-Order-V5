import { useState } from "react";
import {
  X, Plus, DollarSign, Globe, Zap, BarChart3, Users, Clock,
  AlertCircle, Package, Truck,
} from "lucide-react";

interface InsightMetric {
  label: string;
  value: string;
  active: boolean;
  trending?: "up" | "down" | "neutral";
}

interface InsightCategory {
  id: string;
  title: string;
  icon: typeof DollarSign;
  metrics: InsightMetric[];
}

const INSIGHT_CATEGORIES: InsightCategory[] = [
  {
    id: "revenue",
    title: "Revenue & Financial",
    icon: DollarSign,
    metrics: [
      { label: "Total Revenue", value: "$4,422,135", active: true, trending: "up" },
      { label: "Average Order Value", value: "$73,702", active: true, trending: "up" },
      { label: "Open Order Value", value: "$2,664,965", active: false },
      { label: "Revenue at Risk", value: "$1,115,015", active: true, trending: "up" },
      { label: "Month to Date", value: "$13,115", active: false },
      { label: "Year to Date Sales", value: "$19.90M", active: false },
    ],
  },
  {
    id: "orders",
    title: "Order Metrics",
    icon: Globe,
    metrics: [
      { label: "Total Orders", value: "60", active: true, trending: "up" },
      { label: "Draft Orders", value: "16", active: false },
      { label: "Pending Approval", value: "10", active: true, trending: "up" },
      { label: "In Progress", value: "12", active: false },
      { label: "Shipped Orders", value: "11", active: false },
      { label: "Cancelled Orders", value: "11", active: false },
      { label: "Overdue Orders", value: "7", active: true, trending: "up" },
      { label: "Cleared by Ops", value: "3", active: false },
    ],
  },
  {
    id: "operational",
    title: "Operational Metrics",
    icon: Zap,
    metrics: [
      { label: "Ready to Ship", value: "3", active: false },
      { label: "Production Delays", value: "3", active: false },
      { label: "Backorder Impact", value: "8", active: false },
      { label: "Items in Production", value: "723", active: false },
    ],
  },
  {
    id: "performance",
    title: "Performance Metrics",
    icon: BarChart3,
    metrics: [
      { label: "On-Time Delivery", value: "94.5%", active: false },
      { label: "Avg. Days to Fulfill", value: "3.2 days", active: false },
      { label: "Order Accuracy", value: "98.8%", active: false },
    ],
  },
  {
    id: "sales",
    title: "Sales & Customer",
    icon: Users,
    metrics: [
      { label: "Quote Conversion", value: "42.5%", active: false },
      { label: "Top Sales Rep", value: "Marcus", active: false },
      { label: "Avg. Items / Order", value: "69.6", active: false },
    ],
  },
  {
    id: "time",
    title: "Time-Based",
    icon: Clock,
    metrics: [
      { label: "Orders vs Last Month", value: "1", active: false },
      { label: "Rev. vs Last Week", value: "$125k", active: false },
    ],
  },
  {
    id: "exceptions",
    title: "Exceptions & Alerts",
    icon: AlertCircle,
    metrics: [
      { label: "High Priority Orders", value: "10", active: false },
      { label: "Payment Overdue", value: "3", active: false },
    ],
  },
  {
    id: "inventory",
    title: "Inventory",
    icon: Package,
    metrics: [
      { label: "Low Stock Alerts", value: "8", active: false },
    ],
  },
  {
    id: "shipping",
    title: "Shipping & Delivery",
    icon: Truck,
    metrics: [
      { label: "Carrier On-Time", value: "96.2%", active: false },
    ],
  },
];

export function InsightsPanel({ onClose }: { onClose: () => void }) {
  const [categories, setCategories] = useState(INSIGHT_CATEGORIES);

  const toggleMetric = (catId: string, metricIdx: number) => {
    setCategories(prev =>
      prev.map(c =>
        c.id === catId
          ? {
              ...c,
              metrics: c.metrics.map((m, i) =>
                i === metricIdx ? { ...m, active: !m.active } : m
              ),
            }
          : c
      )
    );
  };

  return (
    <div className="w-[320px] shrink-0 border-l border-border bg-card overflow-y-auto" style={{ maxHeight: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-base text-foreground font-bold">Add Insights</h3>
              <p className="text-xs text-foreground/50">Customize your dashboard with relevant metrics.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5 text-foreground/50" />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 space-y-5">
        {categories.map(cat => (
          <div key={cat.id}>
            {/* Category header */}
            <div className="flex items-center gap-2 mb-2.5">
              <cat.icon className="w-3.5 h-3.5 text-foreground/50" strokeWidth={1.8} />
              <span className="text-xs font-semibold text-foreground">
                {cat.title}
              </span>
            </div>

            {/* Metric cards — 2 per row */}
            <div className="grid grid-cols-2 gap-2">
              {cat.metrics.map((metric, mi) => (
                <button
                  key={metric.label}
                  onClick={() => toggleMetric(cat.id, mi)}
                  className={`relative text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    metric.active
                      ? "border-primary/30 bg-primary/5"
                      : "border-border bg-card hover:bg-secondary"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-foreground/60 truncate pr-1">
                      {metric.label}
                    </span>
                    {metric.trending === "up" && (
                      <svg width="12" height="8" viewBox="0 0 12 8" className="shrink-0 text-accent">
                        <path d="M1 7L4 3L7 5L11 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {!metric.trending && (
                      <Plus className="w-3 h-3 text-foreground/25 shrink-0" />
                    )}
                  </div>
                  <div className="text-xs font-semibold text-foreground">
                    {metric.value}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}