import { useState, useEffect } from "react";
import { useLocation, useParams, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

export default function EnquiryForm() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const presetClientId = urlParams.get("clientId") ? parseInt(urlParams.get("clientId")!) : undefined;

  const isEdit = !!id;
  const enquiryId = id ? parseInt(id) : undefined;

  const utils = trpc.useUtils();

  // Load existing enquiry for edit
  const { data: existing } = trpc.enquiries.get.useQuery(
    { id: enquiryId!, withDetails: true },
    { enabled: isEdit }
  );

  // Load clients for picker
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 200 });
  const clientsList = clientsData?.rows ?? [];

  // Load departments
  const { data: depts } = trpc.departments.list.useQuery();
  const deptsList = depts ?? [];

  const [form, setForm] = useState({
    clientId: presetClientId ? String(presetClientId) : "",
    departmentId: "",
    subject: "",
    description: "",
    serviceType: "other",
    priority: "normal",
    source: "phone",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

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
      });
    }
  }, [existing, isEdit]);

  const createMutation = trpc.enquiries.create.useMutation({
    onSuccess: (data) => {
      utils.enquiries.list.invalidate();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.subject || !form.description) {
      toast.error("Please fill in all required fields");
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
        });
      } else {
        await createMutation.mutateAsync({
          clientId: parseInt(form.clientId),
          departmentId: form.departmentId ? parseInt(form.departmentId) : undefined,
          subject: form.subject,
          description: form.description,
          serviceType: form.serviceType as any,
          priority: form.priority as any,
          source: form.source as any,
          notes: form.notes || undefined,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

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
        {/* Client & Department */}
        <Card>
          <CardHeader><CardTitle className="text-base">Client & Department</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Client *</Label>
              <Select
                value={form.clientId}
                onValueChange={(v) => setForm((p) => ({ ...p, clientId: v }))}
                disabled={isEdit}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clientsList.map((c: any) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.firstName} {c.lastName} — {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select
                value={form.departmentId || "none"}
                onValueChange={(v) => setForm((p) => ({ ...p, departmentId: v === "none" ? "" : v }))}
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
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="locksmithing">Locksmithing</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                  <SelectItem value="diagnostics">Diagnostics</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Enquiry Details */}
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
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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

        {/* Actions */}
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
            disabled={saving || !form.clientId || !form.subject || !form.description}
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
