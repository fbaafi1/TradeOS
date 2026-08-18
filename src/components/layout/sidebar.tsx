"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, BookOpen, BarChart3,
  Settings2, TrendingUp, LogOut, Menu, X, ChevronDown,
  ShieldAlert, Target,
  Clock, ChevronRight, Calendar
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

interface NavItem { href: string; label: string; icon: React.ElementType; badge?: string; }
interface NavGroup { label: string; items: NavItem[]; }

function getTodayDate() { return new Date().toISOString().split("T")[0]; }

const navGroups: NavGroup[] = [
  {
    label: "",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Daily Trading OS",
    items: [
      { href: `/day/${getTodayDate()}`, label: "Today's Session", icon: Clock },
      { href: "/journal/calendar", label: "Calendar", icon: CalendarDays },
      { href: "/journal", label: "Trade Journal", icon: BookOpen },
    ],
  },
  {
    label: "Analytics",
    items: [
      { href: "/analytics/performance", label: "Performance", icon: BarChart3 },
    ],
  },
  {
    label: "Settings",
    items: [
      { href: "/settings/trade-os", label: "Trade OS Rules", icon: Target },
      { href: "/settings/no-trade", label: "No-Trade Filter", icon: ShieldAlert },
      { href: "/settings/preferences", label: "Preferences", icon: Settings2 },
    ],
  },
];

function NavContent({ onNavigate, onSignOut }: { onNavigate?: () => void; onSignOut: () => void; }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const today = getTodayDate();

  function toggleGroup(label: string) {
    setCollapsed(prev => { const next = new Set(prev); next.has(label) ? next.delete(label) : next.add(label); return next; });
  }
  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/journal") return pathname === "/journal" || /^\/journal\/[^/]+$/.test(pathname);
    if (href.startsWith("/day/")) return pathname.startsWith("/day/");
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4 flex-shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/30">
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div>
          <span className="text-sm font-black tracking-tight text-foreground">Trade OS</span>
          <span className="block text-[10px] text-muted-foreground leading-none">Mechanical Forex System</span>
        </div>
      </div>

      {/* Today quick-access */}
      <div className="px-2 py-2 border-b border-border flex-shrink-0">
        <Link
          href={`/day/${today}`}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2.5 transition-all w-full",
            pathname.startsWith("/day/") && pathname.includes(today)
              ? "bg-primary text-primary-foreground"
              : "bg-primary/10 text-primary hover:bg-primary/20"
          )}
        >
          <Clock className="h-4 w-4 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-bold leading-none">Today's Session</p>
            <p className="text-[10px] leading-none mt-0.5 opacity-80">{today}</p>
          </div>
          <ChevronRight className="h-3.5 w-3.5 ml-auto flex-shrink-0 opacity-70" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {navGroups.map((group) => (
          <div key={group.label || "home"} className={group.label ? "mt-4 first:mt-0" : ""}>
            {group.label && (
              <button onClick={() => toggleGroup(group.label)} className="flex w-full items-center justify-between px-2 py-1 mb-1 group">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">{group.label}</span>
                <ChevronDown className={cn("h-3 w-3 text-muted-foreground/50 transition-transform", collapsed.has(group.label) && "-rotate-90")} />
              </button>
            )}
            {!collapsed.has(group.label) && (
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  // Skip the "Today's Session" link in the group since it's in the quick-access
                  if (item.href.startsWith("/day/")) return null;
                  return (
                    <Link key={item.href} href={item.href} onClick={onNavigate}
                      className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-all",
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}>
                      <Icon className={cn("h-4 w-4 flex-shrink-0 transition-colors", active ? "text-primary" : "text-muted-foreground/70")} />
                      <span className="truncate">{item.label}</span>
                      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-2 py-2 flex-shrink-0">
        <Button variant="ghost" className="w-full justify-start gap-2.5 text-muted-foreground text-sm h-9" onClick={onSignOut}>
          <LogOut className="h-4 w-4 flex-shrink-0" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed top-0 left-0 right-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card/95 backdrop-blur-sm px-4 md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/15"><TrendingUp className="h-3.5 w-3.5 text-primary" /></div>
          <span className="font-black text-sm">Trade OS</span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle menu">
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={cn("fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-border bg-card transition-transform duration-300 ease-in-out md:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}>
        <NavContent onNavigate={() => setMobileOpen(false)} onSignOut={handleSignOut} />
      </aside>

      <aside className="hidden md:fixed md:inset-y-0 md:flex md:w-56 md:flex-col border-r border-border bg-card">
        <NavContent onSignOut={handleSignOut} />
      </aside>
    </>
  );
}
