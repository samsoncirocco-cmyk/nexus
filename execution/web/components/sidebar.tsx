"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  LayoutDashboard,
  PenSquare,
  Link2,
  Mic2,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar,
  Sparkles
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Composer", href: "/composer", icon: PenSquare },
  { name: "Platforms", href: "/platforms", icon: Link2 },
  { name: "Voice Profile", href: "/voice", icon: Mic2 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

const shortcuts = [
  { name: "Publishing Queue", href: "/queue", icon: Calendar },
  { name: "AI Assistant", href: "/assistant", icon: Sparkles },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <div
      className={cn(
        "relative border-r bg-card transition-all duration-300",
        collapsed ? "w-[60px]" : "w-[280px]"
      )}
    >
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <span className="text-lg font-bold text-primary-foreground">N</span>
        </div>
        {!collapsed && (
          <span className="text-xl font-bold gradient-text">Nexus</span>
        )}
      </div>

      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="p-3 space-y-6">
          {/* New Post Button */}
          <Button
            className={cn(
              "w-full transition-all",
              collapsed ? "px-2" : ""
            )}
            asChild
          >
            <Link href="/composer">
              <Plus className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Create Post</span>}
            </Link>
          </Button>

          {/* Main Navigation */}
          <nav className="space-y-1">
            {!collapsed && (
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Menu
              </p>
            )}
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Shortcuts */}
          {!collapsed && (
            <nav className="space-y-1">
              <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Shortcuts
              </p>
              {shortcuts.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </ScrollArea>

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}
