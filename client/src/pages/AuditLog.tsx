/**
 * AuditLog — Admin view of all authentication events.
 */
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, AlertCircle, LogIn, LogOut, UserPlus, KeyRound, Lock, Unlock } from "lucide-react";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  login_success:           { label: "Login",           icon: LogIn,      className: "bg-green-100 text-green-700" },
  login_failed:            { label: "Failed Login",    icon: AlertCircle,className: "bg-red-100 text-red-700" },
  logout:                  { label: "Logout",          icon: LogOut,     className: "bg-gray-100 text-gray-700" },
  register:                { label: "Registered",      icon: UserPlus,   className: "bg-blue-100 text-blue-700" },
  password_changed:        { label: "Password Changed",icon: KeyRound,   className: "bg-purple-100 text-purple-700" },
  password_reset_requested:{ label: "Password Reset",  icon: KeyRound,   className: "bg-orange-100 text-orange-700" },
  role_changed:            { label: "Role Changed",    icon: ShieldCheck,className: "bg-yellow-100 text-yellow-700" },
  account_locked:          { label: "Account Locked",  icon: Lock,       className: "bg-red-100 text-red-700" },
  account_unlocked:        { label: "Account Unlocked",icon: Unlock,     className: "bg-green-100 text-green-700" },
  invite_created:          { label: "Invite Created",  icon: UserPlus,   className: "bg-blue-100 text-blue-700" },
  invite_accepted:         { label: "Invite Accepted", icon: UserPlus,   className: "bg-green-100 text-green-700" },
};

export default function AuditLog() {
  const auditQuery = trpc.auth.auditLog.useQuery({ limit: 100 });
  const entries = auditQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Auth Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">
          All authentication events across the system.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-muted-foreground" />
            Recent Events ({entries.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {auditQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center">
              <ShieldCheck className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No audit events yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {entries.map((entry: any) => {
                const config = ACTION_CONFIG[entry.action] ?? {
                  label: entry.action,
                  icon: ShieldCheck,
                  className: "bg-gray-100 text-gray-700",
                };
                const Icon = config.icon;
                let meta: Record<string, unknown> = {};
                try { meta = JSON.parse(entry.metadata ?? "{}"); } catch {}

                return (
                  <div key={entry.id} className="flex items-start gap-4 px-5 py-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.className}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.className}`}>
                          {config.label}
                        </span>
                        {entry.email && (
                          <span className="text-xs text-muted-foreground">{entry.email}</span>
                        )}
                        {meta.role && (
                          <span className="text-xs text-muted-foreground">Role: {String(meta.role)}</span>
                        )}
                        {meta.previousRole && meta.newRole && (
                          <span className="text-xs text-muted-foreground">
                            {String(meta.previousRole)} → {String(meta.newRole)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-muted-foreground/70">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                        {entry.ipAddress && (
                          <span className="text-xs text-muted-foreground/50 font-mono">
                            {entry.ipAddress}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
