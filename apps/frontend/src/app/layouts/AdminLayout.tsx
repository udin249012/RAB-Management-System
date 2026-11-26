import { useState } from "react";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { LiquidGlass } from "@/components/ui/glass-sidebar-utils/liquid-glass";

export function AdminLayout() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen bg-background text-foreground dot-bg">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10 dark:from-primary/20 dark:to-accent/10"
      />

      <Sidebar
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
      />

      <div
        className={cn(
          "relative flex min-h-screen flex-col transition-[padding-left] duration-400 ease-glass-panel",
          isSidebarCollapsed ? "lg:pl-[84px]" : "lg:pl-[264px]",
        )}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-3 p-3 lg:pl-0">
          <Topbar onOpenMobileMenu={() => setIsMobileOpen(true)} />
          <LiquidGlass
            asChild
            variant="frosted"
            className="flex-1 rounded-[26px] p-4 sm:p-6 lg:p-8"
          >
            <main>
              <Outlet />
            </main>
          </LiquidGlass>
        </div>
      </div>
    </div>
  );
}
