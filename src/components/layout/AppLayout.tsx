import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { MobileNav } from "./MobileNav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Wheat } from "lucide-react";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full bg-background">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <AppSidebar />
        </div>

        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0 z-40">
            <MobileNav />
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/20">
                <Wheat className="h-5 w-5 text-primary" />
              </div>
              <span className="font-bold text-lg">AgroGestão</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </header>

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