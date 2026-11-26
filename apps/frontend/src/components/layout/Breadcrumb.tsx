import { ChevronRight, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { MAIN_NAV_ITEMS } from "./navigation";

export function Breadcrumb() {
  const location = useLocation();
  const activeItem = MAIN_NAV_ITEMS.find(
    (item) => location.pathname === item.path || location.pathname.startsWith(`${item.path}/`),
  );

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
      >
        <Home className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Beranda</span>
      </Link>
      {activeItem && (
        <>
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
          <span className="font-medium text-foreground truncate">{activeItem.label}</span>
        </>
      )}
    </nav>
  );
}
