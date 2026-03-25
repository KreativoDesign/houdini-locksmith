/**
 * TeamManagement — Admin-only page for managing users, roles, and invites.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  Mail,
  PlusCircle,
  ShieldCheck,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";

const ROLE_BADGE: Record<string, { label: string; className: string }> = {
  admin:      { label: "Admin",      className: "bg-red-100 text-red-700 border-red-200" },
  manager:    { label: "Manager",    className: "bg-blue-100 text-blue-700 border-blue-200" },
  technician: { label: "Technician", className: "bg-green-100 text-green-700 border-green-200" },
};

export default function TeamManagement() {
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "technician">("technician");
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const usersQuery = trpc.auth.listUsersWithCredentials.useQuery();
  const deptsQuery = trpc.departments.list.useQuery();
  const utils = trpc.useUtils();

  const inviteMutation = trpc.auth.createInvite.useMutation({
    onSuccess: (data) => {
      setInviteLink(data.inviteUrl);
      setInviteError(null);
      utils.auth.listUsersWithCredentials.invalidate();
    },
    onError: (err) => setInviteError(err.message),
  });

  const roleChangeMutation = trpc.auth.updateUserRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      utils.auth.listUsersWithCredentials.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const unlockMutation = trpc.auth.unlockAccount.useMutation({
    onSuccess: () => {
      toast.success("Account unlocked");
      utils.auth.listUsersWithCredentials.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const allUsers = usersQuery.data ?? [];
  const depts = deptsQuery.data ?? [];

  const handleInvite = () => {
    setInviteError(null);
    if (!inviteEmail.includes("@")) { setInviteError("Enter a valid email address"); return; }
    inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast.success("Invite link copied to clipboard");
    }
  };

  const resetInviteDialog = () => {
    setInviteOpen(false);
    setInviteLink(null);
    setInviteEmail("");
    setInviteRole("technician");
    setInviteError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Team Management</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage users, roles, and access control.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Users", value: allUsers.length, color: "text-foreground" },
          { label: "Active", value: allUsers.filter((u: any) => u.isActive).length, color: "text-green-600" },
          { label: "Locked", value: allUsers.filter((u: any) => u.credential?.lockedUntil && new Date(u.credential.lockedUntil) > new Date()).length, color: "text-destructive" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            All Users
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : allUsers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No users yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {allUsers.map((u: any) => {
                const badge = ROLE_BADGE[u.role] ?? ROLE_BADGE.technician;
                const dept = depts.find((d: any) => d.id === u.departmentId);
                const isLocked = u.credential?.lockedUntil && new Date(u.credential.lockedUntil) > new Date();
                const mustChange = u.credential?.mustChangePassword;
                const initials = u.name
                  ? u.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
                  : "?";
                const isSelf = u.id === user?.id;

                return (
                  <div key={u.id} className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{initials}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground truncate">{u.name ?? "—"}</p>
                        {isSelf && <span className="text-xs text-muted-foreground">(you)</span>}
                        {isLocked && (
                          <span className="flex items-center gap-1 text-xs text-destructive">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                        {mustChange && (
                          <span className="text-xs text-orange-600 font-medium">Must change password</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{u.email ?? "—"}</p>
                      {dept && (
                        <p className="text-xs text-muted-foreground/70 mt-0.5">{dept.name}</p>
                      )}
                    </div>

                    {/* Role badge */}
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>

                    {/* Actions (admin only, not self) */}
                    {!isSelf && (
                      <div className="flex items-center gap-2 shrink-0">
                        {isLocked && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => unlockMutation.mutate({ targetUserId: u.id })}
                            disabled={unlockMutation.isPending}
                          >
                            <Unlock className="w-3 h-3 mr-1" />
                            Unlock
                          </Button>
                        )}
                        <Select
                          value={u.role}
                          onValueChange={(role) =>
                            roleChangeMutation.mutate({
                              userId: u.id,
                              role: role as "admin" | "manager" | "technician",
                            })
                          }
                          disabled={roleChangeMutation.isPending}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="technician">Technician</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite dialog */}
      <Dialog open={inviteOpen} onOpenChange={(open) => { if (!open) resetInviteDialog(); else setInviteOpen(true); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Invite Team Member
            </DialogTitle>
            <DialogDescription>
              Generate a secure invite link. The link expires in 48 hours and can only be used once.
            </DialogDescription>
          </DialogHeader>

          {inviteLink ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                <p className="text-sm text-green-800 font-medium">Invite link generated!</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Invite link (expires in 48 hours)</Label>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="text-xs h-9 font-mono" />
                  <Button size="sm" variant="outline" onClick={copyInviteLink} className="shrink-0 h-9">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this link with the invitee. They must register using the email address you specified.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {inviteError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{inviteError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="invite-email">Email address</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="colleague@houdini.co.za"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviteMutation.isPending}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invite-role">Role</Label>
                <Select
                  value={inviteRole}
                  onValueChange={(v) => setInviteRole(v as typeof inviteRole)}
                  disabled={inviteMutation.isPending}
                >
                  <SelectTrigger id="invite-role" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-red-600" />
                        Admin — Full system access
                      </span>
                    </SelectItem>
                    <SelectItem value="manager">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-blue-600" />
                        Manager — Review & pricing
                      </span>
                    </SelectItem>
                    <SelectItem value="technician">
                      <span className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-green-600" />
                        Technician — Assigned jobs
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={resetInviteDialog}>
              {inviteLink ? "Close" : "Cancel"}
            </Button>
            {!inviteLink && (
              <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
                ) : (
                  <><Mail className="w-4 h-4 mr-2" />Generate Invite</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
