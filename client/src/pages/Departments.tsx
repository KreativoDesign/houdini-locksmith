/**
 * Departments — Admin page showing all four departments,
 * their members, and controls to assign/remove technicians.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Building2,
  Loader2,
  Shield,
  Stethoscope,
  UserPlus,
  Users,
  Wrench,
  X,
} from "lucide-react";

// ─── Department icon map ─────────────────────────────────────────────────────
const DEPT_ICON: Record<string, React.ReactNode> = {
  Locksmithing: <Wrench className="w-5 h-5" />,
  Security:     <Shield className="w-5 h-5" />,
  Diagnostics:  <Stethoscope className="w-5 h-5" />,
  Workshop:     <Building2 className="w-5 h-5" />,
};

const DEPT_COLOR: Record<string, string> = {
  Locksmithing: "bg-amber-100 text-amber-700 border-amber-200",
  Security:     "bg-blue-100 text-blue-700 border-blue-200",
  Diagnostics:  "bg-purple-100 text-purple-700 border-purple-200",
  Workshop:     "bg-green-100 text-green-700 border-green-200",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function initials(name: string | null | undefined) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function Departments() {
  const [assignDeptId, setAssignDeptId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const deptsQuery  = trpc.departments.list.useQuery();
  const allUsers    = trpc.users.list.useQuery();
  const utils       = trpc.useUtils();

  const assignMutation = trpc.users.assignDepartment.useMutation({
    onSuccess: () => {
      toast.success("Technician assigned to department");
      utils.users.list.invalidate();
      setAssignDeptId(null);
      setSelectedUserId("");
    },
    onError: (err) => toast.error(err.message),
  });

  // Remove = assign to null via users.update
  const removeMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("Technician removed from department");
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const depts = deptsQuery.data ?? [];
  const users = allUsers.data ?? [];

  // Users not yet in any department (available to assign)
  const unassigned = users.filter((u: any) => !u.departmentId);

  // Users already in a specific department
  const membersOf = (deptId: number) =>
    users.filter((u: any) => u.departmentId === deptId);

  // Users available to assign to a specific dept (unassigned OR in another dept)
  const availableFor = (deptId: number) =>
    users.filter((u: any) => u.departmentId !== deptId);

  const handleAssign = () => {
    if (!assignDeptId || !selectedUserId) return;
    assignMutation.mutate({
      userId: Number(selectedUserId),
      departmentId: assignDeptId,
    });
  };

  if (deptsQuery.isLoading || allUsers.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Departments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage department members and assign technicians to teams.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            {users.length} total users
          </span>
          <span className="flex items-center gap-1.5 text-orange-600">
            <Users className="w-4 h-4" />
            {unassigned.length} unassigned
          </span>
        </div>
      </div>

      {/* Department cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {depts.map((dept: any) => {
          const members = membersOf(dept.id);
          const colorClass = DEPT_COLOR[dept.name] ?? "bg-gray-100 text-gray-700 border-gray-200";
          const icon = DEPT_ICON[dept.name] ?? <Building2 className="w-5 h-5" />;

          return (
            <Card key={dept.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClass}`}>
                      {icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{dept.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                        {dept.description}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {members.length} {members.length === 1 ? "member" : "members"}
                  </Badge>
                </div>
              </CardHeader>

              <Separator />

              <CardContent className="flex-1 pt-4 pb-4 space-y-3">
                {/* Member list */}
                {members.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <Users className="w-8 h-8 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No members yet</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      Assign a technician to get started
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {members.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
                      >
                        {/* Avatar */}
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {initials(u.name)}
                          </span>
                        </div>

                        {/* Name + email */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {u.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {u.email ?? "—"}
                          </p>
                        </div>

                        {/* Role badge */}
                        <Badge
                          variant="outline"
                          className="text-xs shrink-0 capitalize"
                        >
                          {u.role}
                        </Badge>

                        {/* Remove button */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          title="Remove from department"
                          onClick={() =>
                            removeMutation.mutate({
                              id: u.id,
                              departmentId: null,
                            })
                          }
                          disabled={removeMutation.isPending}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Assign button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 mt-1"
                  onClick={() => {
                    setAssignDeptId(dept.id);
                    setSelectedUserId("");
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Assign Technician
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Unassigned users panel */}
      {unassigned.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-500" />
              Unassigned Users
              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200">
                {unassigned.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {unassigned.map((u: any) => (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-muted-foreground">
                      {initials(u.name)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{u.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize shrink-0">
                    {u.role}
                  </Badge>
                  <Select
                    value=""
                    onValueChange={(deptId) => {
                      assignMutation.mutate({
                        userId: u.id,
                        departmentId: Number(deptId),
                      });
                    }}
                    disabled={assignMutation.isPending}
                  >
                    <SelectTrigger className="h-8 w-44 text-xs">
                      <SelectValue placeholder="Assign to dept…" />
                    </SelectTrigger>
                    <SelectContent>
                      {depts.map((d: any) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assign dialog */}
      <Dialog
        open={assignDeptId !== null}
        onOpenChange={(open) => {
          if (!open) { setAssignDeptId(null); setSelectedUserId(""); }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Assign Technician
            </DialogTitle>
            <DialogDescription>
              Select a user to assign to{" "}
              <strong>
                {depts.find((d: any) => d.id === assignDeptId)?.name}
              </strong>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a user…" />
              </SelectTrigger>
              <SelectContent>
                {availableFor(assignDeptId ?? 0).length === 0 ? (
                  <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                    No users available
                  </div>
                ) : (
                  availableFor(assignDeptId ?? 0).map((u: any) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      <div className="flex items-center gap-2">
                        <span>{u.name ?? u.email ?? `User #${u.id}`}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({u.role})
                        </span>
                        {u.departmentId && (
                          <span className="text-xs text-orange-600">
                            — moving from{" "}
                            {depts.find((d: any) => d.id === u.departmentId)?.name}
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setAssignDeptId(null); setSelectedUserId(""); }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedUserId || assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="w-4 h-4 mr-2" />
              )}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
