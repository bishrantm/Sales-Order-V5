import { Outlet, useNavigate, useLocation } from "react-router";
import {
  LayoutGrid, Users, FileText, BarChart3, ShoppingCart, DollarSign,
  UserCircle, Package, Settings, Search,
} from "lucide-react";
import { SOStoreProvider } from "./store";
import { ToastProvider } from "./ui/Toast";

const navItems = [
  { icon: LayoutGrid, label: "Dashboard", path: "#" },
  { icon: Users, label: "Contacts", path: "#" },
  { icon: FileText, label: "Quotes", path: "#" },
  { icon: BarChart3, label: "Analytics", path: "#" },
  { icon: ShoppingCart, label: "Sales", path: "/" },
  { icon: DollarSign, label: "Invoices", path: "#" },
  { icon: UserCircle, label: "Customers", path: "#" },
  { icon: Package, label: "Inventory", path: "#" },
];

/* Build breadcrumb segments from current path */
function useBreadcrumbs() {
  const { pathname } = useLocation();
  const crumbs: { label: string; path?: string }[] = [{ label: "Sales", path: "/" }];

  if (pathname === "/") {
    // Home — no additional crumb, just "Sales" as current
    return [{ label: "Sales" }];
  }
  if (pathname.startsWith("/sales-orders")) {
    const parts = pathname.split("/").filter(Boolean);
    if (parts.length === 1) {
      crumbs.push({ label: "Sales Orders" });
    } else {
      crumbs.push({ label: "Sales Orders", path: "/sales-orders" });
      crumbs.push({ label: parts[1] });
    }
  } else if (pathname.startsWith("/quotes")) {
    crumbs.push({ label: "Quotes" });
  }
  return crumbs;
}

export function AppLayout() {
  const navigate = useNavigate();
  const breadcrumbs = useBreadcrumbs();

  return (
    <div className="flex h-screen w-full bg-background compact-module overflow-hidden">
      {/* Left Sidebar — icon-only, fixed to viewport */}
      <aside className="w-[48px] flex flex-col items-center py-3 bg-card border-r border-border shrink-0 sticky top-0 h-screen" style={{ zIndex: "var(--z-sticky)" as unknown as number }}>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center mb-6">
          <span className="text-primary-foreground" style={{ fontSize: "var(--text-label)", fontWeight: "var(--font-weight-semibold)" }}>O</span>
        </div>

        <div className="flex flex-col items-center w-full gap-[2px]">
          {navItems.map((item, i) => {
            const isActive = item.label === "Sales";
            return (
              <button
                key={i}
                onClick={() => item.path !== "#" && navigate(item.path)}
                className={`relative w-full flex items-center justify-center h-9 transition-colors ${
                  isActive ? "text-foreground" : "text-foreground/35 hover:text-foreground/50"
                }`}
                title={item.label}
              >
                {isActive && (
                  <div className="absolute left-0 top-[5px] bottom-[5px] w-[3px] rounded-r-sm bg-primary" />
                )}
                <item.icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </button>
            );
          })}
        </div>

        <div className="flex-1" />

        <button className="w-full flex items-center justify-center h-9 text-foreground/35 hover:text-foreground/50 transition-colors mb-2" title="Settings">
          <Settings className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground mb-1" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" }}>
          AA
        </div>
      </aside>

      {/* Right side: header + content — scrolls naturally via browser scrollbar */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-[52px] flex items-center justify-between px-5 border-b border-border bg-card shrink-0" style={{ zIndex: "var(--z-sticky)" as unknown as number }}>
          <div className="flex items-center gap-2" style={{ fontSize: "var(--text-caption)" }}>
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return [
                idx > 0 && (
                  <span key={`sep-${idx}`} className="text-foreground/20">/</span>
                ),
                isLast ? (
                  <span key={crumb.label} className="text-foreground" style={{ fontWeight: "var(--font-weight-medium)" }}>
                    {crumb.label}
                  </span>
                ) : (
                  <span
                    key={crumb.label}
                    className="text-foreground/50 cursor-pointer hover:text-foreground/70 transition-colors"
                    onClick={() => crumb.path && navigate(crumb.path)}
                  >
                    {crumb.label}
                  </span>
                ),
              ];
            }).flat().filter(Boolean)}
          </div>
          <div className="flex items-center gap-3.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary border border-border rounded-md text-foreground/35 cursor-pointer hover:border-foreground/20 transition-colors" style={{ fontSize: "var(--text-caption)" }}>
              <Search className="w-3 h-3" />
              <span>Search</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-semibold)" }}>AA</div>
              <div>
                <div className="text-foreground" style={{ fontSize: "var(--text-micro)", fontWeight: "var(--font-weight-medium)" }}>Ahtisham Ahmad</div>
                <div className="text-foreground/35" style={{ fontSize: "var(--text-micro)" }}>Product Designer</div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-w-0 min-h-0 overflow-x-hidden overflow-y-auto">
          <SOStoreProvider>
            <ToastProvider>
              <Outlet />
            </ToastProvider>
          </SOStoreProvider>
        </main>
      </div>
    </div>
  );
}