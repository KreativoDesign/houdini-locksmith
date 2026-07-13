import { useState, useEffect } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Edit,
  ArrowRightCircle,
  XCircle,
  User,
  Phone,
  Mail,
  Calendar,
  Building2,
  Tag,
  AlertTriangle,
  CheckCircle2,
  Briefcase,
  FileText,
  UserCheck,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; color: string }> = {
  new: { label: "New", variant: "default", icon: FileText, color: "text-blue-600" },
  in_review: { label: "In Review", variant: "outline", icon: AlertTriangle, color: "text-amber-600" },
  converted: { label: "Converted to Job", variant: "secondary", icon: CheckCircle2, color: "text-green-600" },
  closed: { label: "Closed", variant: "destructive", icon: XCircle, color: "text-slate-500" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500",
  normal: "text-blue-600",
  high: "text-orange-500",
  urgent: "text-red-600",
};

const SERVICE_LABELS: Record<string, string> = {
  locksmithing: "Locksmithing",
  security: "Security",
  diagnostics: "Diagnostics",
  workshop: "Workshop",
  other: "Other",
};

const SOURCE_LABELS: Record<string, string> = {
  phone: "Phone",
  email: "Email",
  walk_in: "Walk-in",
  online: "Online",
  referral: "Referral",
};

export default function EnquiryDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const urlParams = new URLSearchParams(searchStr);
  const autoConvert = urlParams.get("convert") === "1";

  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";
  const enquiryId = parseInt(id ?? "0");

  const utils = trpc.useUtils();

  const { data: enquiry, isLoading } = trpc.enquiries.get.useQuery(
    { id: enquiryId, withDetails: true },
    { enabled: !!enquiryId }
  );

  const { data: depts } = trpc.departments.list.useQuery();
  const { data: techsData } = trpc.users.technicians.useQuery();
  const techs = techsData ?? [];

  const [showConvert, setShowConvert] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [closeReason, setCloseReason] = useState("");

  // Convert form state
  const [convertForm, setConvertForm] = useState({
    departmentId: "",
    title: "",
    description: "",
    priority: "normal",
    assignedTechnicianId: "",
    requiresSignature: true,
  });

  const e = enquiry as any;

  // Auto-open convert dialog if ?convert=1
  useEffect(() => {
    if (autoConvert && e && e.status !== "converted" && e.status !== "closed") {
      setShowConvert(true);
      setConvertForm((prev) => ({
        ...prev,
        title: e.subject,
        description: e.description,
        priority: e.priority,
        departmentId: e.departmentId ? String(e.departmentId) : "",
      }));
    }
  }, [autoConvert, e?.id]);

  const convertMutation = trpc.enquiries.convertToJobCard.useMutation({
    onSuccess: (data) => {
      utils.enquiries.list.invalidate();
      utils.enquiries.get.invalidate({ id: enquiryId });
      setShowConvert(false);
      toast.success(`Job card ${data.jobNumber} created successfully`);
      navigate(`/jobs/${data.jobCardId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const closeMutation = trpc.enquiries.close.useMutation({
    onSuccess: () => {
      utils.enquiries.list.invalidate();
      utils.enquiries.get.invalidate({ id: enquiryId });
      setShowClose(false);
      toast.success("Enquiry closed");
    },
    onError: (err) => toast.error(err.message),
  });

  const openConvert = () => {
    if (!e) return;
    setConvertForm({
      departmentId: e.departmentId ? String(e.departmentId) : "",
      title: e.subject,
      description: e.description,
      priority: e.priority,
      assignedTechnicianId: "",
      requiresSignature: true,
    });
    setShowConvert(true);
  };

  const handleConvert = async () => {
    if (!convertForm.departmentId || !convertForm.title) {
      toast.error("Department and title are required");
      return;
    }
    await convertMutation.mutateAsync({
      enquiryId,
      departmentId: parseInt(convertForm.departmentId),
      title: convertForm.title,
      description: convertForm.description || undefined,
      priority: convertForm.priority as any,
      assignedTechnicianId: convertForm.assignedTechnicianId
        ? parseInt(convertForm.assignedTechnicianId)
        : undefined,
      requiresSignature: convertForm.requiresSignature,
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="h-40 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!e) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-muted-foreground">Enquiry not found</p>
        <Button variant="outline" onClick={() => navigate("/enquiries")}>Back</Button>
      </div>
    );
  }

  const status = STATUS_CONFIG[e.status] ?? { label: e.status, variant: "secondary" as const, icon: FileText, color: "text-muted-foreground" };
  const StatusIcon = status.icon;
  const canConvert = isManager && e.status !== "converted" && e.status !== "closed";
  const canClose = isManager && e.status !== "converted" && e.status !== "closed";

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <button
          onClick={() => navigate("/enquiries")}
          className="hover:text-foreground transition-colors"
        >
          Enquiries
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">Enquiry #{e.id}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/enquiries")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{e.subject}</h1>
              <Badge variant={status.variant} className="gap-1">
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">Enquiry #{e.id} · Created {new Date(e.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {e.status !== "converted" && e.status !== "closed" && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/enquiries/${e.id}/edit`)} className="gap-1.5">
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
          )}
          {canConvert && (
            <Button size="sm" onClick={openConvert} className="gap-1.5 bg-green-600 hover:bg-green-700 text-white">
              <ArrowRightCircle className="h-3.5 w-3.5" /> Convert to Job Card
            </Button>
          )}
          {canClose && (
            <Button variant="outline" size="sm" onClick={() => setShowClose(true)} className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10">
              <XCircle className="h-3.5 w-3.5" /> Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader><CardTitle className="text-base">Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{e.description}</p>
            </CardContent>
          </Card>

          {/* Notes */}
          {e.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Internal Notes</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">{e.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Converted Job Card Link */}
          {e.status === "converted" && e.convertedToJobCardId && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-4 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">Converted to Job Card</p>
                    <p className="text-sm text-green-700">This enquiry has been converted</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/jobs/${e.convertedToJobCardId}`)}
                  className="border-green-300 text-green-700 hover:bg-green-100"
                >
                  <Briefcase className="h-4 w-4 mr-1.5" /> View Job Card
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client Info */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> Client</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <button
                className="font-medium text-primary hover:underline text-left"
                onClick={() => navigate(`/clients/${e.clientId}`)}
              >
                {e.clientFirstName} {e.clientLastName}
              </button>
              {e.clientPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" /> {e.clientPhone}
                </div>
              )}
              {e.clientEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" /> {e.clientEmail}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Service</span>
                <span className="font-medium">{SERVICE_LABELS[e.serviceType ?? "other"]}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Priority</span>
                <span className={`font-medium capitalize ${PRIORITY_COLORS[e.priority]}`}>{e.priority}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Source</span>
                <span className="font-medium">{SOURCE_LABELS[e.source] ?? e.source}</span>
              </div>
              {e.departmentName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Dept</span>
                  <span className="font-medium">{e.departmentName}</span>
                </div>
              )}
              {e.assignedToName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assigned To</span>
                  <span className="font-medium">{e.assignedToName}</span>
                </div>
              )}
              {(e as any).createdByName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Created By</span>
                  <span className="font-medium">{(e as any).createdByName}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm pt-2 border-t">
                <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" /> Created</span>
                <span>{new Date(e.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Updated</span>
                <span>{new Date(e.updatedAt).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Convert to Job Card Dialog ─── */}
      <Dialog open={showConvert} onOpenChange={setShowConvert}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-green-600" />
              Convert to Job Card
            </DialogTitle>
            <DialogDescription>
              All enquiry data will be preserved and linked to the new job card.
            </DialogDescription>
          </DialogHeader>

          {/* Data Preview */}
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1.5 border">
            <p className="font-medium text-xs text-muted-foreground uppercase mb-2">Preserved from Enquiry</p>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Client</span>
              <span className="font-medium">{e.clientFirstName} {e.clientLastName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">{SERVICE_LABELS[e.serviceType ?? "other"]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Enquiry #</span>
              <span className="font-medium">#{e.id}</span>
            </div>
          </div>

          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label>Job Title *</Label>
              <Input
                value={convertForm.title}
                onChange={(ev) => setConvertForm((p) => ({ ...p, title: ev.target.value }))}
                placeholder="Job card title"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={convertForm.description}
                onChange={(ev) => setConvertForm((p) => ({ ...p, description: ev.target.value }))}
                rows={3}
                placeholder="Job description (defaults to enquiry description)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Department *</Label>
                <Select
                  value={convertForm.departmentId || "none"}
                  onValueChange={(v) => setConvertForm((p) => ({ ...p, departmentId: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select department</SelectItem>
                    {(depts as any[] ?? []).map((d: any) => (
                      <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={convertForm.priority}
                  onValueChange={(v) => setConvertForm((p) => ({ ...p, priority: v }))}
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
            </div>
            <div className="space-y-1.5">
              <Label>Assign Technician (optional)</Label>
              <Select
                value={convertForm.assignedTechnicianId || "none"}
                onValueChange={(v) => setConvertForm((p) => ({ ...p, assignedTechnicianId: v === "none" ? "" : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {(techs as any[]).map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} {t.departmentName ? `(${t.departmentName})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConvert(false)}>Cancel</Button>
            <Button
              onClick={handleConvert}
              disabled={convertMutation.isPending || !convertForm.departmentId || !convertForm.title}
              className="bg-green-600 hover:bg-green-700 text-white gap-2"
            >
              <ArrowRightCircle className="h-4 w-4" />
              {convertMutation.isPending ? "Creating…" : "Create Job Card"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Close Enquiry Dialog ─── */}
      <Dialog open={showClose} onOpenChange={setShowClose}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Close Enquiry</DialogTitle>
            <DialogDescription>
              This will mark the enquiry as closed. You can optionally provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason (optional)</Label>
            <Textarea
              value={closeReason}
              onChange={(ev) => setCloseReason(ev.target.value)}
              placeholder="Why is this enquiry being closed?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClose(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => closeMutation.mutate({ id: enquiryId, reason: closeReason || undefined })}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? "Closing…" : "Close Enquiry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
