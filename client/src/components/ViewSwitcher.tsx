import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Globe,
  Wrench,
  Eye,
  ChevronDown,
} from "lucide-react";

export type ViewType = "admin" | "user" | "technician" | "client";

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const VIEW_OPTIONS = [
  {
    id: "admin" as ViewType,
    label: "Admin Dashboard",
    description: "Full admin control panel",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    id: "user" as ViewType,
    label: "Frontend Website",
    description: "Public-facing website",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    id: "technician" as ViewType,
    label: "Technician Dashboard",
    description: "Technician job view",
    icon: <Wrench className="h-4 w-4" />,
  },
  {
    id: "client" as ViewType,
    label: "Client Dashboard",
    description: "Client quote & job view",
    icon: <Eye className="h-4 w-4" />,
  },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  const { user } = useAuth();
  const currentViewOption = VIEW_OPTIONS.find((v) => v.id === currentView);

  // Filter views based on user role
  const allowedViews = VIEW_OPTIONS.filter((view) => {
    if (user?.role === "admin" || user?.role === "manager") {
      // Admin and managers can see: admin, user (frontend), client
      return ["admin", "user", "client"].includes(view.id);
    }
    if (user?.role === "technician") {
      // Technicians can see: technician, user (frontend)
      return ["technician", "user"].includes(view.id);
    }
    return false;
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
        >
          {currentViewOption?.icon}
          <span className="hidden sm:inline">{currentViewOption?.label}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Switch View</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {allowedViews.map((view) => (
          <DropdownMenuItem
            key={view.id}
            onClick={() => onViewChange(view.id)}
            className={currentView === view.id ? "bg-accent" : ""}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="text-muted-foreground">{view.icon}</div>
              <div className="flex-1">
                <div className="font-medium">{view.label}</div>
                <div className="text-xs text-muted-foreground">
                  {view.description}
                </div>
              </div>
              {currentView === view.id && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
