import { useState } from "react";
import { useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function PublicQuoteView() {
  const [match, params] = useRoute("/quotes/:token");
  const token = (params as any)?.token;

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  const quoteQuery = trpc.clientPortal.getQuoteByToken.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  const acceptMutation = trpc.clientPortal.acceptQuote.useMutation();
  const rejectMutation = trpc.clientPortal.rejectQuote.useMutation();

  if (!match) return null;

  if (quoteQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quoteQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 text-destructive/40 mx-auto mb-4" />
            <h1 className="text-lg font-bold mb-2">Quote Not Found</h1>
            <p className="text-sm text-muted-foreground">
              This quote link is invalid, expired, or has already been used.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { quote, items } = quoteQuery.data;

  const handleAccept = async () => {
    try {
      await acceptMutation.mutateAsync({ token: token || "" });
      toast.success("Quote accepted! An invoice will be sent shortly.");
      // Refresh the page to show updated status
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Failed to accept quote:", err);
      toast.error("Failed to accept quote");
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    try {
      await rejectMutation.mutateAsync({
        token: token || "",
        reason: rejectionReason,
      });
      toast.success("Quote rejected");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      console.error("Failed to reject quote:", err);
      toast.error("Failed to reject quote");
    }
  };

  const isExpired = quote.expiresAt && new Date(quote.expiresAt) < new Date();
  const isAccepted = quote.status === "accepted";
  const isRejected = quote.status === "rejected";

  const statusConfig = {
    draft: { icon: Clock, label: "Draft", color: "bg-slate-100 text-slate-700" },
    sent: { icon: CheckCircle2, label: "Sent", color: "bg-blue-100 text-blue-700" },
    accepted: { icon: CheckCircle2, label: "Accepted", color: "bg-green-100 text-green-700" },
    rejected: { icon: XCircle, label: "Rejected", color: "bg-red-100 text-red-700" },
    expired: { icon: AlertCircle, label: "Expired", color: "bg-orange-100 text-orange-700" },
  };

  const currentStatus = isExpired ? "expired" : quote.status;
  const status = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.draft;
  const StatusIcon = status.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Quote {quote.quoteNumber}</h1>
              <p className="text-muted-foreground mt-1">
                Created on {new Date(quote.createdAt).toLocaleDateString("en-ZA")}
              </p>
            </div>
            <Badge className={status.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>
        </div>

        {/* Expiry warning */}
        {isExpired && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-orange-900">Quote Expired</p>
                <p className="text-sm text-orange-800 mt-1">
                  This quote expired on {new Date(quote.expiresAt!).toLocaleDateString("en-ZA")}. Please contact the business for a new quote.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main quote card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quote Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Description */}
            {quote.description && (
              <div>
                <h3 className="font-semibold text-sm mb-2">Description</h3>
                <p className="text-sm text-muted-foreground">{quote.description}</p>
              </div>
            )}

            <Separator />

            {/* Items table */}
            <div>
              <h3 className="font-semibold text-sm mb-3">Line Items</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 px-3 font-semibold">Item</th>
                      <th className="text-center py-2 px-3 font-semibold">Qty</th>
                      <th className="text-right py-2 px-3 font-semibold">Unit Price</th>
                      <th className="text-right py-2 px-3 font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any) => (
                      <tr key={item.id} className="border-b border-border/50 hover:bg-muted/30">
                        <td className="py-3 px-3">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.type}</p>
                        </td>
                        <td className="py-3 px-3 text-center">{item.quantity}</td>
                        <td className="py-3 px-3 text-right">R {parseFloat(item.unitPrice).toFixed(2)}</td>
                        <td className="py-3 px-3 text-right font-semibold">R {parseFloat(item.lineTotal).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <Separator />

            {/* Totals */}
            <div className="space-y-2 ml-auto max-w-xs">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>R {parseFloat(quote.total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (15%):</span>
                <span>R {parseFloat(quote.vat).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Grand Total:</span>
                <span className="text-lime-700">R {parseFloat(quote.grandTotal).toFixed(2)}</span>
              </div>
            </div>

            {/* Expiry info */}
            {quote.expiresAt && !isExpired && (
              <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-900 border border-blue-200">
                <p className="font-semibold">Valid until {new Date(quote.expiresAt).toLocaleDateString("en-ZA")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        {!isAccepted && !isRejected && !isExpired && (
          <div className="space-y-4">
            {!showRejectForm ? (
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                >
                  {acceptMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Accept Quote
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setShowRejectForm(true)}
                  variant="outline"
                  size="lg"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Quote
                </Button>
              </div>
            ) : (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-semibold">Why are you rejecting this quote?</label>
                    <Textarea
                      placeholder="Please provide a reason..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleReject}
                      disabled={rejectMutation.isPending || !rejectionReason.trim()}
                      className="bg-red-600 hover:bg-red-700 text-white flex-1"
                    >
                      {rejectMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Rejecting...
                        </>
                      ) : (
                        "Confirm Rejection"
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectionReason("");
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Status messages */}
        {isAccepted && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-bold text-green-900 mb-1">Quote Accepted</h3>
              <p className="text-sm text-green-800">
                Thank you for accepting this quote. An invoice has been sent to your email.
              </p>
            </CardContent>
          </Card>
        )}

        {isRejected && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center">
              <XCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-bold text-red-900 mb-1">Quote Rejected</h3>
              <p className="text-sm text-red-800">
                {quote.rejectionReason ? `Reason: ${quote.rejectionReason}` : "This quote has been rejected."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Houdini Locksmith & Security</p>
          <p>This is a secure quote link. Do not share it with others.</p>
        </div>
      </div>
    </div>
  );
}
