"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Upload, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/lib/offline/hooks";
import { Badge } from "@/components/ui/badge";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/import", label: "Import", icon: Upload },
] as const;

// Hidden during practice sessions: the PRD calls for a distraction-free,
// full-attention drill screen with nothing else competing for focus.
export function AppNav() {
  const pathname = usePathname();
  const isOnline = useOnlineStatus();
  if (pathname.startsWith("/practice/")) return null;

  return (
    <nav className="bg-background/95 supports-backdrop-filter:bg-background/80 sticky top-0 z-40 border-b backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-1 px-2 py-1.5 sm:px-4">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary-foreground bg-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
        {!isOnline && (
          <Badge variant="secondary" className="ml-auto">
            <WifiOff className="size-3" />
            Offline
          </Badge>
        )}
      </div>
    </nav>
  );
}
