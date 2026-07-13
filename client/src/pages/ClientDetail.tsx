import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  ClipboardList,
  Plus,
  Calendar,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  new: { label: "New", variant: "default" },
  in_review: { label: "In Review", variant: "outline" },
  converted: { label: "Converted", variant: "secondary" },
  closed: { label: "Closed", variant: "destructive" },
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

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const clientId = parseInt(id ?? "0");

  const { data: client, isLoading } = trpc.clients.get.useQuery(
    { id: clientId, withEnquiries: true },
    { enabled: !!clientId }
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse w-48" />
        <div className="h-40 bg-muted rounded animate-pulse" />
        <div className="h-60 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Client not found</p>
        <Button variant="outline" onClick={() => navigate("/clients")}>
          Back to Clients
        </Button>
      </div>
    );
  }

  const c = client as any;
  const enquiries = c.enquiries ?? [];
  const openCount = enquiries.filter((e: any) => e.status === "new" || e.status === "in_review").length;
  const convertedCount = enquiries.filter((e: any) => e.status === "converted").length;

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <button
          onClick={() => navigate("/clients")}
          className="hover:text-foreground transition-colors"
        >
          Clients
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{c.firstName} {c.lastName}</span>
      </nav>

      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {c.firstName} {c.lastName}
          </h1>
          <p className="text-sm text-muted-foreground">Client #{c.id}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            onClick={() => navigate(`/enquiries/new?clientId=${c.id}`)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            New Enquiry
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                {c.firstName[0]}{c.lastName[0]}
              </div>
              <div>
                <p className="font-semibold">{c.firstName} {c.lastName}</p>
                <Badge variant={c.isActive ? "default" : "secondary"} className="text-xs mt-0.5">
                  {c.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span>{c.phone}</span>
              </div>
              {c.alternatePhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>{c.alternatePhone}</span>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {(c.address || c.city) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <span>
                    {[c.address, c.city, c.postalCode].filter(Boolean).join(", ")}
                  </span>
                </div>
              )}
            </div>

            {c.notes && (
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Notes</p>
                <p className="text-sm">{c.notes}</p>
              </div>
            )}

            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground uppercase font-medium mb-2">Summary</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{enquiries.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-2 text-center">
                  <p className="text-lg font-bold text-blue-600">{openCount}</p>
                  <p className="text-xs text-muted-foreground">Open</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 text-center col-span-2">
                  <p className="text-lg font-bold text-green-600">{convertedCount}</p>
                  <p className="text-xs text-muted-foreground">Converted to Jobs</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-1">
              Client since {new Date(c.createdAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        {/* Enquiries History */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Enquiry History
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/enquiries?clientId=${c.id}`)}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {enquiries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <ClipboardList className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No enquiries yet</p>
                <p className="text-sm mt-1">Create the first enquiry for this client</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enquiries.map((e: any) => {
                    const s = STATUS_LABELS[e.status] ?? { label: e.status, variant: "secondary" as const };
                    return (
                      <TableRow
                        key={e.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => navigate(`/enquiries/${e.id}`)}
                      >
                        <TableCell>
                          <p className="font-medium text-sm line-clamp-1">{e.subject}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {SERVICE_LABELS[e.serviceType ?? "other"] ?? "Other"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm font-medium capitalize ${PRIORITY_COLORS[e.priority]}`}>
                            {e.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={s.variant}>{s.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {new Date(e.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
