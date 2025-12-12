import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <TooltipProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <div className="container py-6 px-4 md:px-8 max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}