import { createContext, useContext, useState, ReactNode } from "react";

export type ViewType = "admin" | "technician" | "client" | "user";

interface ViewContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
}

const ViewContext = createContext<ViewContextType | undefined>(undefined);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [currentView, setCurrentView] = useState<ViewType>("admin");

  return (
    <ViewContext.Provider value={{ currentView, setCurrentView }}>
      {children}
    </ViewContext.Provider>
  );
}

export function useViewContext() {
  const context = useContext(ViewContext);
  if (!context) {
    throw new Error("useViewContext must be used within ViewProvider");
  }
  return context;
}
