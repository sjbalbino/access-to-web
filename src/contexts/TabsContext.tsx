import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getRouteInfo } from "@/lib/routeMap";
import { LucideIcon } from "lucide-react";

export interface TabItem {
  path: string;
  title: string;
  icon: LucideIcon;
  color: string;
}

interface TabsContextType {
  tabs: TabItem[];
  activeTab: string;
  openTab: (path: string) => void;
  closeTab: (path: string) => void;
  setActiveTab: (path: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

const STORAGE_KEY = "agrogestao-tabs";

function loadTabs(): TabItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const paths: string[] = JSON.parse(stored);
      return paths.map((p) => {
        const info = getRouteInfo(p);
        return { path: p, title: info.title, icon: info.icon, color: info.color };
      });
    }
  } catch {}
  const info = getRouteInfo("/");
  return [{ path: "/", title: info.title, icon: info.icon, color: info.color }];
}

function saveTabs(tabs: TabItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs.map((t) => t.path)));
}

export function TabsProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<TabItem[]>(loadTabs);
  const [activeTab, setActiveTabState] = useState<string>(() => {
    const stored = loadTabs();
    return stored[0]?.path || "/";
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Sync active tab with current route on mount and browser navigation
  useEffect(() => {
    const currentPath = location.pathname;
    setActiveTabState(currentPath);
    
    // If navigated to a path not in tabs (e.g. direct URL), add it
    setTabs((prev) => {
      const exists = prev.some((t) => t.path === currentPath);
      if (!exists) {
        const info = getRouteInfo(currentPath);
        const newTabs = [...prev, { path: currentPath, title: info.title, icon: info.icon, color: info.color }];
        saveTabs(newTabs);
        return newTabs;
      }
      return prev;
    });
  }, [location.pathname]);

  const openTab = useCallback(
    (path: string) => {
      setTabs((prev) => {
        const exists = prev.some((t) => t.path === path);
        if (exists) {
          saveTabs(prev);
          return prev;
        }
        const info = getRouteInfo(path);
        const newTabs = [...prev, { path, title: info.title, icon: info.icon, color: info.color }];
        saveTabs(newTabs);
        return newTabs;
      });
      setActiveTabState(path);
      navigate(path);
    },
    [navigate]
  );

  const closeTab = useCallback(
    (path: string) => {
      // Cannot close dashboard
      if (path === "/") return;

      setTabs((prev) => {
        const newTabs = prev.filter((t) => t.path !== path);
        if (newTabs.length === 0) {
          const info = getRouteInfo("/");
          newTabs.push({ path: "/", title: info.title, icon: info.icon, color: info.color });
        }
        saveTabs(newTabs);

        // If closing the active tab, activate the previous one
        if (path === activeTab) {
          const closedIndex = prev.findIndex((t) => t.path === path);
          const newActive = newTabs[Math.min(closedIndex, newTabs.length - 1)]?.path || "/";
          setActiveTabState(newActive);
          navigate(newActive);
        }

        return newTabs;
      });
    },
    [activeTab, navigate]
  );

  const setActiveTab = useCallback(
    (path: string) => {
      setActiveTabState(path);
      navigate(path);
    },
    [navigate]
  );

  return (
    <TabsContext.Provider value={{ tabs, activeTab, openTab, closeTab, setActiveTab }}>
      {children}
    </TabsContext.Provider>
  );
}

export function useTabs() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("useTabs must be used within TabsProvider");
  return ctx;
}
