import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Settings as SettingsIcon,
  Lock,
  Users,
  FileText,
  Sliders,
  DollarSign,
  ChevronRight,
} from "lucide-react";

interface SettingsMenuItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  roles?: Array<"admin" | "manager" | "technician">;
}

const SETTINGS_MENU: SettingsMenuItem[] = [
  {
    id: "password",
    label: "Change Password",
    description: "Update your account password",
    icon: <Lock className="h-5 w-5" />,
    href: "/settings/password",
  },
  {
    id: "departments",
    label: "Department Service Types",
    description: "Configure service types for each department",
    icon: <Sliders className="h-5 w-5" />,
    href: "/admin/settings/departments",
    roles: ["admin"],
  },
  {
    id: "team",
    label: "Team Management",
    description: "Manage team members and roles",
    icon: <Users className="h-5 w-5" />,
    href: "/admin/team",
    roles: ["admin"],
  },
  {
    id: "audit",
    label: "Audit Log",
    description: "View system activity and changes",
    icon: <FileText className="h-5 w-5" />,
    href: "/admin/audit",
    roles: ["admin"],
  },
  {
    id: "catalogue",
    label: "Pricing Catalogue",
    description: "Manage pricing items and service rates",
    icon: <DollarSign className="h-5 w-5" />,
    href: "/settings/catalogue",
    roles: ["admin"],
  },
];

export default function Settings() {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Filter menu items based on user role
  const visibleMenuItems = SETTINGS_MENU.filter((item) => {
    if (!item.roles) return true;
    return item.roles.includes(user?.role as any);
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your account and system preferences
          </p>
        </div>
      </div>

      <Separator />

      {/* Settings Grid */}
      <div className="grid gap-4">
        {visibleMenuItems.map((item) => (
          <Card
            key={item.id}
            className="hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => navigate(item.href)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{item.label}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t">
        <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/settings/password")}
          >
            Change Password
          </Button>
          {user?.role === "admin" && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/settings/departments")}
              >
                Department Service Types
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/settings/catalogue")}
              >
                Pricing Catalogue
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/team")}
              >
                Team Management
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
