import { Building2, X } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  GlassSidebar,
  GlassSidebarFooter,
  GlassSidebarGroup,
  GlassSidebarHeader,
  GlassSidebarItem,
  GlassSidebarToggle,
} from "@/components/ui/glass-sidebar";
import { MAIN_NAV_ITEMS } from "./navigation";

interface SidebarProps {
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({
  isMobileOpen,
  onCloseMobile,
  collapsed = false,
  onCollapsedChange,
}: SidebarProps) {
  const { pathname } = useLocation();

  const renderMenuItems = (isCollapsed: boolean) =>
    MAIN_NAV_ITEMS.map((item) => {
      const Icon = item.icon;
      const isActive = pathname === item.path || pathname.startsWith(`${item.path}/`);

      return (
        <GlassSidebarItem
          key={item.path}
          asChild
          active={isActive}
          title={isCollapsed ? item.label : undefined}
          icon={<Icon className={cn(isActive ? "text-primary" : "opacity-75")} />}
        >
          <NavLink to={item.path} onClick={onCloseMobile}>
            <span className={isCollapsed ? "sr-only" : "flex-1 truncate"}>{item.label}</span>
          </NavLink>
        </GlassSidebarItem>
      );
    });

  return (
    <>
      {/* Desktop Floating Glass Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:p-3">
        <GlassSidebar
          collapsed={collapsed}
          onCollapsedChange={onCollapsedChange}
          aria-label="Menu Utama"
        >
          <GlassSidebarHeader>
            <GlassSidebarToggle />
            {!collapsed && (
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-bold tracking-tight">RAB System</p>
                  <p className="truncate text-[11px] opacity-65">Enterprise Cost Control</p>
                </div>
              </div>
            )}
          </GlassSidebarHeader>

          <GlassSidebarGroup label="Menu Utama">{renderMenuItems(collapsed)}</GlassSidebarGroup>

          {!collapsed && (
            <GlassSidebarFooter>
              <div className="rounded-2xl border border-border/50 bg-[var(--glass-highlight-hover)] px-3 py-2.5 text-xs">
                <p className="font-semibold">Mode Administrator</p>
                <p className="mt-0.5 text-[11px] opacity-70">REST API v1 Terintegrasi</p>
              </div>
            </GlassSidebarFooter>
          )}
        </GlassSidebar>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Mobile Floating Glass Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 p-3 transform transition-transform duration-200 ease-in-out lg:hidden",
          isMobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <GlassSidebar collapsed={false} className="w-full" aria-label="Menu Utama Mobile">
          <GlassSidebarHeader className="justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-bold tracking-tight">RAB System</p>
                <p className="truncate text-[11px] opacity-65">Enterprise Cost Control</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Tutup menu navigasi"
              className="grid size-9 shrink-0 place-items-center rounded-xl opacity-75 transition-colors hover:bg-[var(--glass-highlight-hover)] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-5 w-5" />
            </button>
          </GlassSidebarHeader>

          <GlassSidebarGroup label="Menu Utama">{renderMenuItems(false)}</GlassSidebarGroup>

          <GlassSidebarFooter>
            <div className="rounded-2xl border border-border/50 bg-[var(--glass-highlight-hover)] px-3 py-2.5 text-xs">
              <p className="font-semibold">Mode Administrator</p>
              <p className="mt-0.5 text-[11px] opacity-70">REST API v1 Terintegrasi</p>
            </div>
          </GlassSidebarFooter>
        </GlassSidebar>
      </div>
    </>
  );
}
