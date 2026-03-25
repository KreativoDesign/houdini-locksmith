import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Plus,
  Search,
  MoreHorizontal,
  ClipboardList,
  Eye,
  Edit,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRightCircle,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const PAGE_SIZE = 25;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; dot: string }> = {
  new: { label: "New", variant: "default", dot: "bg-blue-500" },
  in_review: { label: "In Review", variant: "outline", dot: "bg-amber-500" },
  converted: { label: "Converted", variant: "secondary", dot: "bg-green-500" },
  closed: { label: "Closed", variant: "destructive", dot: "bg-slate-400" },
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "text-slate-500",
  normal: "text-blue-600",
  high: "text-orange-500",
  urgent: "text-red-600 font-semibold",
};

const SERVICE_LABELS: Record<string, string> = {
  locksmithing: "Locksmithing",
  security: "Security",
  diagnostics: "Diagnostics",
  workshop: "Workshop",
  other: "Other",
};

export default function Enquiries() {
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const { user } = useAuth();
  const isManager = user?.role === "manager" || user?.role === "admin";

  // Parse URL params
  const urlParams = new URLSearchParams(searchStr);
  const presetClientId = urlParams.get("clientId") ? parseInt(urlParams.get("clientId")!) : undefined;

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const utils = trpc.useUtils();

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as any)._enqSearchTimer);
    (window as any)._enqSearchTimer = setTimeout(() => {
      setDebouncedSearch(v);
      setPage(0);
    }, 350);
  };

  const { data, isLoading } = trpc.enquiries.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    serviceType: serviceFilter !== "all" ? (serviceFilter as any) : undefined,
    clientId: presetClientId,
    search: debouncedSearch || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const closeMutation = trpc.enquiries.close.useMutation({
    onSuccess: () => {
      utils.enquiries.list.invalidate();
      toast.success("Enquiry closed");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Enquiries</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {total} enquir{total !== 1 ? "ies" : "y"}
            {presetClientId ? " for this client" : ""}
          </p>
        </div>
        <Button onClick={() => navigate("/enquiries/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Enquiry
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subject or client…"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Services" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <div className="h-4 bg-muted rounded animate-pulse w-20" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No enquiries found</p>
                    <p className="text-sm mt-1">
                      {debouncedSearch || statusFilter !== "all"
                        ? "Try adjusting your filters"
                        : "Create your first enquiry to get started"}
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((e: any) => {
                  const s = STATUS_CONFIG[e.status] ?? { label: e.status, variant: "secondary" as const, dot: "bg-slate-400" };
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer hover:bg-muted/30"
                      onClick={() => navigate(`/enquiries/${e.id}`)}
                    >
                      <TableCell>
                        <p className="font-medium text-sm line-clamp-1 max-w-[220px]">{e.subject}</p>
                        <p className="text-xs text-muted-foreground">#{e.id}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">
                          {e.clientFirstName} {e.clientLastName}
                        </p>
                        {e.clientPhone && (
                          <p className="text-xs text-muted-foreground">{e.clientPhone}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {SERVICE_LABELS[e.serviceType ?? "other"] ?? "Other"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm capitalize ${PRIORITY_COLORS[e.priority]}`}>
                          {e.priority}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                          <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {new Date(e.createdAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(ev) => ev.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => navigate(`/enquiries/${e.id}`)}>
                              <Eye className="h-4 w-4 mr-2" /> View
                            </DropdownMenuItem>
                            {e.status !== "converted" && e.status !== "closed" && (
                              <DropdownMenuItem onClick={() => navigate(`/enquiries/${e.id}/edit`)}>
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                            )}
                            {isManager && e.status !== "converted" && e.status !== "closed" && (
                              <>
                                <DropdownMenuItem
                                  className="text-green-600"
                                  onClick={() => navigate(`/enquiries/${e.id}?convert=1`)}
                                >
                                  <ArrowRightCircle className="h-4 w-4 mr-2" /> Convert to Job Card
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => closeMutation.mutate({ id: e.id })}
                                >
                                  <XCircle className="h-4 w-4 mr-2" /> Close
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>

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
    </div>
  );
}
