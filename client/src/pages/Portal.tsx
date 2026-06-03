import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, CheckCircle, Clock, MapPin, User, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

export default function Portal() {
  const { token } = useParams<{ token: string }>();
  const [activeTab, setActiveTab] = useState<"job" | "invoice">("job");

  const handlePaymentClick = (quoteId: number) => {
    // TODO: Integrate with PayFast
    // For now, show a message that payment integration is coming
    toast.info("Payment integration coming soon. Please contact support to complete payment.");
  };

  // Fetch portal data
  const portalDataQuery = trpc.portal.getPortalData.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  // Fetch invoice data
  const invoiceDataQuery = trpc.portal.getInvoiceData.useQuery(
    { token: token || "" },
    { enabled: !!token }
  );

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Invalid Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This portal link is invalid or has expired. Please contact Houdini Locksmith & Security for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (portalDataQuery.isLoading || invoiceDataQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Loading your job and invoice details...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (portalDataQuery.isError || invoiceDataQuery.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {portalDataQuery.error?.message || invoiceDataQuery.error?.message || "Failed to load portal data"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const jobCard = portalDataQuery.data?.jobCard;
  const quote = invoiceDataQuery.data?.quote;

  if (!jobCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              The job associated with this link could not be found.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-purple-100 text-purple-800";
      case "in_progress":
        return "bg-orange-100 text-orange-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getQuoteStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "expired":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">HL</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Houdini Locksmith & Security</h1>
              <p className="text-sm text-slate-600">Your Job Portal</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("job")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "job"
                ? "bg-orange-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Job Status
          </button>
          <button
            onClick={() => setActiveTab("invoice")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "invoice"
                ? "bg-orange-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Invoice
          </button>
        </div>

        {/* Job Status Tab */}
        {activeTab === "job" && (
          <div className="space-y-6">
            {/* Job Card Header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{jobCard.jobNumber}</CardTitle>
                    <CardDescription>{jobCard.description}</CardDescription>
                  </div>
                  <Badge className={getStatusColor(jobCard.status)}>
                    {jobCard.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Job Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Job Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Created Date</p>
                    <p className="font-medium">
                      {jobCard.createdAt ? new Date(jobCard.createdAt).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Date</p>
                    <p className="font-medium">
                      {jobCard.scheduledDate ? new Date(jobCard.scheduledDate).toLocaleDateString() : "Not scheduled"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Priority</p>
                    <p className="font-medium capitalize">{jobCard.priority || "Normal"}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Assigned Technician */}
              {jobCard.assignedTechnicianId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Assigned Technician
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{jobCard.assignedTechnicianId || "Not assigned"}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>



            {/* Status Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Job Created</p>
                      <p className="text-sm text-muted-foreground">
                        {jobCard.createdAt ? new Date(jobCard.createdAt).toLocaleString() : "N/A"}
                      </p>
                    </div>
                  </div>
                  {jobCard.status !== "pending" && (
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        <Clock className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">Status: {jobCard.status.replace("_", " ").toUpperCase()}</p>
                        <p className="text-sm text-muted-foreground">
                          {jobCard.updatedAt ? new Date(jobCard.updatedAt).toLocaleString() : "N/A"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invoice Tab */}
        {activeTab === "invoice" && (
          <div className="space-y-6">
            {quote ? (
              <>
                {/* Invoice Header */}
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-2xl flex items-center gap-2">
                          <FileText className="h-6 w-6" />
                          {quote.quoteNumber}
                        </CardTitle>
                        <CardDescription>{quote.description}</CardDescription>
                      </div>
                      <Badge className={getQuoteStatusColor(quote.status)}>
                        {quote.status.toUpperCase()}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Quote Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quote Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Created Date</p>
                        <p className="font-medium">
                          {quote.createdAt ? new Date(quote.createdAt).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Valid Until</p>
                        <p className="font-medium">
                          {quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString() : "No expiry"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quote Description */}
                {quote.description && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{quote.description}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Invoice Totals */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal:</span>
                        <span className="font-medium">${(parseFloat(quote.total || "0") - parseFloat(quote.vat || "0")).toFixed(2)}</span>
                      </div>
                      {quote.vat && parseFloat(quote.vat) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">VAT:</span>
                          <span className="font-medium">${parseFloat(quote.vat).toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-bold border-t pt-2">
                        <span>Total:</span>
                        <span>${parseFloat(quote.total || "0").toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Button */}
                {quote.status === "sent" && (
                  <Alert className="bg-blue-50 border-blue-200">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      This quote is ready for acceptance. Please review the details above and click the button below to proceed.
                    </AlertDescription>
                  </Alert>
                )}

                {quote.status === "accepted" && (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Thank you! This quote has been accepted. Our team will be in touch shortly to schedule the service.
                    </AlertDescription>
                  </Alert>
                )}

                {quote.status === "sent" && (
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white py-6 text-lg">
                    Accept Quote & Proceed to Payment
                  </Button>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">
                    No invoice associated with this job yet. Please check back later.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>© 2026 Houdini Locksmith & Security. All rights reserved.</p>
          <p className="mt-2">Questions? Contact us at support@houdini.local</p>
        </div>
      </div>
    </div>
  );
}
