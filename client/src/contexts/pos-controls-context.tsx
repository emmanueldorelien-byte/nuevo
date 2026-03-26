import { createContext, useContext, useState, useEffect } from "react";

interface POSControlsContextType {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  historyOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
  closureOpen: boolean;
  setClosureOpen: (v: boolean) => void;
  showSidebar: boolean;
  toggleSidebar: () => void;
  isPOSRoute: boolean;
  setIsPOSRoute: (v: boolean) => void;
}

const POSControlsContext = createContext<POSControlsContextType | null>(null);

export function POSControlsProvider({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(() =>
    document.documentElement.classList.contains("dark")
  );
  const [historyOpen, setHistoryOpen] = useState(false);
  const [closureOpen, setClosureOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isPOSRoute, setIsPOSRoute] = useState(false);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  const toggleSidebar = () => {
    const sidebar = document.querySelector('[data-sidebar="sidebar"]') as HTMLElement;
    if (sidebar) {
      const next = !showSidebar;
      sidebar.style.display = next ? "flex" : "none";
      setShowSidebar(next);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") {
      setIsDarkMode(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  return (
    <POSControlsContext.Provider value={{
      isDarkMode, toggleDarkMode,
      historyOpen, setHistoryOpen,
      closureOpen, setClosureOpen,
      showSidebar, toggleSidebar,
      isPOSRoute, setIsPOSRoute,
    }}>
      {children}
    </POSControlsContext.Provider>
  );
}

export function usePOSControls() {
  const ctx = useContext(POSControlsContext);
  if (!ctx) throw new Error("usePOSControls must be used within POSControlsProvider");
  return ctx;
}
