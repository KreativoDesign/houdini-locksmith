import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Clock,
  Edit2,
  Loader2,
  MoreHorizontal,
  Plus,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const STATUS_CONFIG = {
  draft: { label: "Draft", icon: Clock, color: "bg-slate-100 text-slate-700" },
  sent: { label: "Sent", icon: Clock, color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Accepted", icon: CheckCircle2, color: "bg-green-100 text-green-700" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-red-100 text-red-700" },
  expired: { label: "Expired", icon: Clock, color: "bg-orange-100 text-orange-700" },
};

export default function Quotes() {
  const [, navigate] = useLocation();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [resendConfirm, setResendConfirm] = useState<number | null>(null);

  const quotesQuery = trpc.quotes.list.useQuery({
    status: statusFilter !== "all" ? (statusFilter as any) : undefined,
    search: searchTerm || undefined,
  });

  const resendMutation = trpc.quotes.send.useMutation();
  const deleteMutation = trpc.quotes.delete.useMutation();

  const quotes = quotesQuery.data || [];

  const handleResend = async (quoteId: number) => {
    try {
      await resendMutation.mutateAsync({ id: quoteId });
      toast.success("Quote resent to client");
      quotesQuery.refetch();
      setResendConfirm(null);
    } catch (err) {
      console.error("Failed to resend quote:", err);
      toast.error("Failed to resend quote");
    }
  };

  const handleDelete = async (quoteId: number) => {
    try {
      await deleteMutation.mutateAsync({ id: quoteId });
      toast.success("Quote deleted");
      quotesQuery.refetch();
      setDeleteConfirm(null);
    } catch (err) {
      console.error("Failed to delete quote:", err);
      toast.error("Failed to delete quote");
    }
  };

  const stats = useMemo(() => {
    return {
      total: quotes.length,
      sent: quotes.filter((q: any) => q.status === "sent").length,
      accepted: quotes.filter((q: any) => q.status === "accepted").length,
      rejected: quotes.filter((q: any) => q.status === "rejected").length,
      expired: quotes.filter((q: any) => q.status === "expired").length,
    };
  }, [quotes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Quotes</h1>
          <p className="text-muted-foreground mt-1">Manage all customer quotes</p>
        </div>
        <Button onClick={() => navigate("/admin/quotes/new")} className="gap-2 bg-lime-600 hover:bg-lime-700">
          <Plus className="w-4 h-4" />
          New Quote
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total, color: "bg-slate-100 text-slate-700" },
          { label: "Sent", value: stats.sent, color: "bg-blue-100 text-blue-700" },
          { label: "Accepted", value: stats.accepted, color: "bg-green-100 text-green-700" },
          { label: "Rejected", value: stats.rejected, color: "bg-red-100 text-red-700" },
          { label: "Expired", value: stats.expired, color: "bg-orange-100 text-orange-700" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className={`text-xs font-medium mt-1 ${stat.color} px-2 py-1 rounded w-fit`}>
                {stat.label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold mb-2 block">Search</label>
              <Input
                placeholder="Search by quote number or client name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          {quotesQuery.isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quotes found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Amount (R)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote: any) => {
                    const statusConfig = STATUS_CONFIG[quote.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.draft;
                    const StatusIcon = statusConfig.icon;
                    const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date();

                    return (
                      <TableRow key={quote.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold">{quote.quoteNumber}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {quote.client ? `${quote.client.firstName} ${quote.client.lastName}` : "Unknown"}
                            </p>
                            <p className="text-xs text-muted-foreground">{quote.client?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">R {parseFloat(quote.grandTotal).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className={statusConfig.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {isExpired ? "Expired" : statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(quote.createdAt).toLocaleDateString("en-ZA")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString("en-ZA") : "Never"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => navigate(`/admin/quotes/${quote.id}`)}
                              >
                                <Edit2 className="w-4 h-4 mr-2" />
                                View & Edit
                              </DropdownMenuItem>
                              {quote.status === "sent" && (
                                <DropdownMenuItem
                                  onClick={() => setResendConfirm(quote.id)}
                                >
                                  <Send className="w-4 h-4 mr-2" />
                                  Resend Quote
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirm(quote.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm !== null} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this quote? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Resend Confirmation Dialog */}
      <AlertDialog open={resendConfirm !== null} onOpenChange={(open) => !open && setResendConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Quote</AlertDialogTitle>
            <AlertDialogDescription>
              Send this quote to the client again via email?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => resendConfirm && handleResend(resendConfirm)}
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending ? "Sending..." : "Resend"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
