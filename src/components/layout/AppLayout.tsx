import { ReactNode, useEffect } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { TabBar } from "./TabBar";
import { TenantBadge } from "./TenantBadge";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Wheat } from "lucide-react";
import { loadPdfBrand } from "@/lib/pdfBrand";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  useEffect(() => {
    loadPdfBrand().catch(() => {});
  }, []);
  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
            <MobileNav />
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-primary/20 shrink-0">
                <Wheat className="h-5 w-5 text-primary" />
              </div>
              <TenantBadge compact />
            </div>
            <div className="w-10" />
          </header>

          {/* Desktop Top Bar: Tenant + Tabs */}
          <div className="hidden md:flex sticky top-0 z-30 bg-background border-b border-border">
            <div className="flex items-center px-4 py-2 border-r border-border shrink-0">
              <TenantBadge />
            </div>
            <div className="flex-1 min-w-0">
              <TabBar />
            </div>
          </div>

          <main className="flex-1 overflow-auto">
            <div className="container py-4 md:py-6 px-3 md:px-8 max-w-7xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
