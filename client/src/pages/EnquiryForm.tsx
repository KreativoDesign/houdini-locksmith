import { useLocation, useParams, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, UserPlus, Users, User } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { getServiceTypesForDepartment, SERVICE_TYPE_LABELS } from "@/lib/departmentServiceTypesStorage";
import { useState, useEffect } from "react";

type ClientMode = "existing" | "new";

export default function EnquiryForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const presetClientId = urlParams.get("clientId") ? parseInt(urlParams.get("clientId")!) : undefined;
  const { user } = useAuth();

  const isEdit = !!id;
  const enquiryId = id ? parseInt(id) : undefined;

  const utils = trpc.useUtils();

  // ── Client mode ──────────────────────────────────────────────────────────
  const [clientMode, setClientMode] = useState<ClientMode>(presetClientId ? "existing" : "existing");

  // ── Load existing enquiry for edit ───────────────────────────────────────
  const { data: existing } = trpc.enquiries.get.useQuery(
    { id: enquiryId!, withDetails: true },
    { enabled: isEdit }
  );

  // ── Load clients for picker ───────────────────────────────────────────────
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 200 });
  const clientsList = clientsData?.rows ?? [];

  // ── Load departments ──────────────────────────────────────────────────────
  const { data: depts } = trpc.departments.list.useQuery();
  const deptsList = depts ?? [];

  // ── Load technicians/employees ──────────────────────────────────────────────
  const { data: technicians = [] } = trpc.users.technicians.useQuery();

  // ── Enquiry form state ────────────────────────────────────────────────────
  const [form, setForm] = useState({
    clientId: presetClientId ? String(presetClientId) : "",
    departmentId: "",
    subject: "",
    description: "",
    serviceType: "other",
    priority: "normal",
    source: "phone",
    notes: "",
    assignedToId: user?.id ? String(user.id) : "",
  });

  // ── New client form state ─────────────────────────────────────────────────
  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
  });

  const [saving, setSaving] = useState(false);

  // Get current user's name for display
  const currentUserName = user?.name || "";

  // Initialize assignedToId when user loads
  useEffect(() => {
    if (!isEdit && user?.id && !form.assignedToId) {
      setForm((p) => ({ ...p, assignedToId: String(user.id) }));
    }
  }, [user?.id, isEdit]);

  // Populate form when editing
  useEffect(() => {
    if (existing && isEdit) {
      const e = existing as any;
      setForm({
        clientId: String(e.clientId),
        departmentId: e.departmentId ? String(e.departmentId) : "",
        subject: e.subject,
        description: e.description,
        serviceType: e.serviceType ?? "other",
        priority: e.priority,
        source: e.source,
        notes: e.notes ?? "",
        assignedToId: e.assignedToId ? String(e.assignedToId) : (user?.id ? String(user.id) : ""),
      });
    }
  }, [existing, isEdit]);

  // Get available service types for selected department
  const availableServiceTypes = getServiceTypesForDepartment(form.departmentId) as any[];

  // Reset service type when department changes if current type is not available
  const handleDepartmentChange = (v: string) => {
    const newDeptId = v === "none" ? "" : v;
    const availableTypes = getServiceTypesForDepartment(newDeptId) as any[];
    const newServiceType = availableTypes.includes(form.serviceType) ? form.serviceType : availableTypes[0];
    setForm((p) => ({ ...p, departmentId: newDeptId, serviceType: newServiceType }));
  };

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createClientMutation = trpc.clients.create.useMutation({
    onError: (e) => toast.error(`Client creation failed: ${e.message}`),
  });

  const createMutation = trpc.enquiries.create.useMutation({
    onSuccess: (data) => {
      utils.enquiries.list.invalidate();
      utils.clients.list.invalidate();
      toast.success("Enquiry created successfully");
      navigate(`/enquiries/${data.id}`);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.enquiries.update.useMutation({
    onSuccess: () => {
      utils.enquiries.list.invalidate();
      toast.success("Enquiry updated");
      navigate(`/enquiries/${enquiryId}`);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate new client fields if in new mode
    if (!isEdit && clientMode === "new") {
      if (!newClient.firstName.trim()) {
        toast.error("Client first name is required");
        return;
      }
      if (!newClient.lastName.trim()) {
        toast.error("Client last name is required");
        return;
      }
      if (!newClient.email.trim()) {
        toast.error("Client email address is required");
        return;
      }
      if (!newClient.phone.trim()) {
        toast.error("Client cellphone number is required");
        return;
      }
      if (!newClient.address.trim()) {
        toast.error("Client physical address is required");
        return;
      }
    }

    if (!isEdit && clientMode === "existing" && !form.clientId) {
      toast.error("Please select a client");
      return;
    }

    if (!form.subject || !form.description) {
      toast.error("Subject and description are required");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && enquiryId) {
        await updateMutation.mutateAsync({
          id: enquiryId,
          subject: form.subject,
          description: form.description,
          serviceType: form.serviceType as any,
          priority: form.priority as any,
          source: form.source as any,
          departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
          notes: form.notes || undefined,
          assignedToId: form.assignedToId ? parseInt(form.assignedToId) : undefined,
        });
      } else {
        // Create new client first if needed
        let clientId = form.clientId ? parseInt(form.clientId) : 0;
        if (clientMode === "new") {
          const created = await createClientMutation.mutateAsync({
            firstName: newClient.firstName.trim(),
            lastName: newClient.lastName.trim(),
            email: newClient.email.trim() || undefined,
            phone: newClient.phone.trim(),
            address: newClient.address.trim() || undefined,
          });
          clientId = created.id;
        }
        await createMutation.mutateAsync({
          clientId,
          departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
          subject: form.subject,
          description: form.description,
          serviceType: form.serviceType as any,
          priority: form.priority as any,
          source: form.source as any,
          notes: form.notes || undefined,
          assignedToId: form.assignedToId ? parseInt(form.assignedToId) : undefined,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const nc = (k: keyof typeof newClient) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setNewClient((prev) => ({ ...prev, [k]: e.target.value }));

  const isFormValid = () => {
    if (!form.subject || !form.description) return false;
    if (isEdit) return true;
    if (clientMode === "existing") return !!form.clientId;
    // For new client mode, validate all required fields
    if (clientMode === "new") {
      return (
        !!newClient.firstName.trim() &&
        !!newClient.lastName.trim() &&
        !!newClient.email.trim() &&
        !!newClient.phone.trim() &&
        !!newClient.address.trim()
      );
    }
    return !!(newClient.firstName.trim() && newClient.lastName.trim() && newClient.phone.trim());
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit ? `/enquiries/${enquiryId}` : "/enquiries")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? "Edit Enquiry" : "New Enquiry"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isEdit ? `Editing enquiry #${enquiryId}` : "Log a new client enquiry"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Client Section ── */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Client</CardTitle>
              {!isEdit && (
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={clientMode === "existing" ? "default" : "outline"}
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => setClientMode("existing")}
                  >
                    <Users className="h-3 w-3" />
                    Existing Client
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={clientMode === "new" ? "default" : "outline"}
                    className="gap-1.5 h-7 text-xs"
                    onClick={() => setClientMode("new")}
                  >
                    <UserPlus className="h-3 w-3" />
                    New Client
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing client picker */}
            {(isEdit || clientMode === "existing") && (
              <div className="space-y-1.5">
                <Label>Select Client *</Label>
                <Select
                  value={form.clientId}
                  onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
                  disabled={isEdit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Search and select a client…" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsList.map((c: any) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.firstName} {c.lastName}
                        {c.phone ? ` — ${c.phone}` : ""}
                        {c.email ? ` (${c.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clientsList.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No clients found.{" "}
                    <button
                      type="button"
                      className="text-primary underline"
                      onClick={() => setClientMode("new")}
                    >
                      Create a new client instead.
                    </button>
                  </p>
                )}
              </div>
            )}

            {/* New client inline form */}
            {!isEdit && clientMode === "new" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">New Client</Badge>
                  <span className="text-xs text-muted-foreground">This client will be created and linked to the enquiry</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>First Name *</Label>
                    <Input
                      value={newClient.firstName}
                      onChange={nc("firstName")}
                      placeholder="John"
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Last Name *</Label>
                    <Input
                      value={newClient.lastName}
                      onChange={nc("lastName")}
                      placeholder="Smith"
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Phone *</Label>
                    <Input
                      value={newClient.phone}
                      onChange={nc("phone")}
                      placeholder="+27 11 000 0000"
                      maxLength={30}
                      type="tel"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Email</Label>
                    <Input
                      value={newClient.email}
                      onChange={nc("email")}
                      placeholder="john@example.com"
                      maxLength={320}
                      type="email"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Address</Label>
                  <Input
                    value={newClient.address}
                    onChange={nc("address")}
                    placeholder="123 Main Street, Johannesburg"
                    maxLength={500}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Employee Assignment ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">Assignment</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Assigned To
              </Label>
              <Select
                value={form.assignedToId}
                onValueChange={(v) => setForm((p) => ({ ...p, assignedToId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee…" />
                </SelectTrigger>
                <SelectContent>
                  {(technicians as any[]).map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                      {user?.id === t.id && " (You)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {form.assignedToId === String(user?.id) ? `Currently assigned to you (${currentUserName})` : "Select who is handling this enquiry"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── Department & Service ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">Department & Service</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={form.departmentId || "none"}
                onValueChange={handleDepartmentChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not specified</SelectItem>
                  {(deptsList as any[]).map((d: any) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service Type *</Label>
              <Select
                value={form.serviceType}
                onValueChange={(v) => setForm((p) => ({ ...p, serviceType: v }))}
                disabled={!form.departmentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!form.departmentId ? "Select department first" : "Select service type…"} />
                </SelectTrigger>
                <SelectContent>
                  {availableServiceTypes.map((type: any) => (
                    <SelectItem key={type} value={type}>
                      {SERVICE_TYPE_LABELS[type as keyof typeof SERVICE_TYPE_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Enquiry Details ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">Enquiry Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject *</Label>
              <Input
                value={form.subject}
                onChange={f("subject")}
                placeholder="Brief description of the issue or request"
                maxLength={255}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={f("description")}
                placeholder="Detailed description of the enquiry, problem, or requirements…"
                rows={5}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="flex items-center gap-2">
                <span>Priority</span>
              </Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="walk_in">Walk-in</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Internal Notes</Label>
              <Textarea
                value={form.notes}
                onChange={f("notes")}
                placeholder="Any internal notes or follow-up reminders…"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Actions ── */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(isEdit ? `/enquiries/${enquiryId}` : "/enquiries")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving || !isFormValid()}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Enquiry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
