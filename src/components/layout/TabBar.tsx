import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTabs } from "@/contexts/TabsContext";
import { useRef, useEffect } from "react";

export function TabBar() {
  const { tabs, activeTab, setActiveTab, closeTab } = useTabs();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [activeTab]);

  if (tabs.length <= 1) return null;

  return (
    <div
      ref={containerRef}
      className="flex items-end gap-0.5 overflow-x-auto border-b border-border bg-muted/30 px-1 pt-1 scrollbar-none"
    >
      {tabs.map((tab) => {
        const isActive = tab.path === activeTab;
        const Icon = tab.icon;
        const canClose = tab.path !== "/";

        return (
          <button
            key={tab.path}
            ref={isActive ? activeRef : undefined}
            onClick={() => setActiveTab(tab.path)}
            onMouseDown={(e) => {
              // Middle click to close
              if (e.button === 1 && canClose) {
                e.preventDefault();
                closeTab(tab.path);
              }
            }}
            className={cn(
              "group flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg transition-all duration-150 whitespace-nowrap min-w-0 max-w-[180px] shrink-0",
              isActive
                ? "bg-background text-foreground border border-b-0 border-border shadow-sm -mb-px"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <Icon className={cn("h-3.5 w-3.5 shrink-0", isActive ? tab.color : "")} />
            <span className="truncate">{tab.title}</span>
            {canClose && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.path);
                }}
                className={cn(
                  "ml-1 rounded-sm p-0.5 shrink-0 transition-colors",
                  "hover:bg-destructive/20 hover:text-destructive",
                  isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
