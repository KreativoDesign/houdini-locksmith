import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Plus,
  Search,
  MoreHorizontal,
  User,
  Phone,
  Mail,
  MapPin,
  Eye,
  Edit,
  UserX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

const PAGE_SIZE = 20;

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  alternatePhone: "",
  address: "",
  city: "",
  postalCode: "",
  notes: "",
};

export default function Clients() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const isManager = user?.role === "manager" || isAdmin;
  const isMobile = useIsMobile();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editClient, setEditClient] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Debounce search
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as any)._clientSearchTimer);
    (window as any)._clientSearchTimer = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(0);
    }, 350);
  };

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.clients.list.useQuery({
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const createMutation = trpc.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setShowCreate(false);
      setForm(emptyForm);
      toast.success("Client created successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      setEditClient(null);
      toast.success("Client updated successfully");
    },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = trpc.clients.deactivate.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
      toast.success("Client deactivated");
    },
    onError: (e) => toast.error(e.message),
  });

  const openCreate = () => {
    setForm(emptyForm);
    setShowCreate(true);
  };

  const openEdit = (c: any) => {
    setForm({
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? "",
      phone: c.phone,
      alternatePhone: c.alternatePhone ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      postalCode: c.postalCode ?? "",
      notes: c.notes ?? "",
    });
    setEditClient(c);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editClient) {
        await updateMutation.mutateAsync({ id: editClient.id, ...form });
      } else {
        await createMutation.mutateAsync(form);
      }
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Clients</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {total} client{total !== 1 ? "s" : ""} in the system
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 w-full sm:w-auto h-9 sm:h-10 text-sm">
          <Plus className="h-4 w-4" />
          New Client
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients…"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9 h-9 sm:h-10 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                    <User className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No clients found</p>
                    <p className="text-sm mt-1">
                      {debouncedSearch ? "Try a different search term" : "Create your first client to get started"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((c: any) => (
                  <TableRow key={c.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => navigate(`/clients/${c.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {c.firstName[0]}{c.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{c.firstName} {c.lastName}</p>
                          <p className="text-xs text-muted-foreground">ID #{c.id}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {c.phone}
                        </div>
                        {c.email && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {c.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {(c.city || c.address) ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {[c.city, c.postalCode].filter(Boolean).join(", ")}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.isActive ? "default" : "secondary"}>
                        {c.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/clients/${c.id}`)}>
                            <Eye className="h-4 w-4 mr-2" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(c)}>
                            <Edit className="h-4 w-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          {isManager && c.isActive && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => deactivateMutation.mutate({ id: c.id })}
                            >
                              <UserX className="h-4 w-4 mr-2" /> Deactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={showCreate || !!editClient} onOpenChange={(o) => { if (!o) { setShowCreate(false); setEditClient(null); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editClient ? "Edit Client" : "New Client"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input value={form.firstName} onChange={f("firstName")} placeholder="John" />
            </div>
            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input value={form.lastName} onChange={f("lastName")} placeholder="Smith" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone *</Label>
              <Input value={form.phone} onChange={f("phone")} placeholder="+27 82 000 0000" />
            </div>
            <div className="space-y-1.5">
              <Label>Alternate Phone</Label>
              <Input value={form.alternatePhone} onChange={f("alternatePhone")} placeholder="Optional" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={f("email")} placeholder="john@example.com" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Address</Label>
              <Input value={form.address} onChange={f("address")} placeholder="123 Main Street" />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={f("city")} placeholder="Cape Town" />
            </div>
            <div className="space-y-1.5">
              <Label>Postal Code</Label>
              <Input value={form.postalCode} onChange={f("postalCode")} placeholder="8001" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={f("notes")} placeholder="Any additional notes…" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowCreate(false); setEditClient(null); }}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.firstName || !form.lastName || !form.phone}
            >
              {saving ? "Saving…" : editClient ? "Save Changes" : "Create Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
