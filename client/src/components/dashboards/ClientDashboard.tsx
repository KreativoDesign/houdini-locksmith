import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
  MapPin,
  ChevronRight,
  CreditCard,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

// Default test client ID for admin viewing client dashboard
const DEFAULT_TEST_CLIENT_ID = 1;

export function ClientDashboard() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [clientId] = useState(DEFAULT_TEST_CLIENT_ID);

  // Fetch quotes for the specific client
  const { data: quotesData, isLoading: quotesLoading } = trpc.quotes.getClientQuotes.useQuery(
    { clientId },
    { enabled: !!clientId }
  );
  
  // Fetch jobs for the specific client
  const { data: jobsData, isLoading: jobsLoading } = trpc.jobCards.getClientJobs.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  // Accept quote mutation (markAsPaid actually marks as accepted)
  const acceptQuoteMutation = trpc.quotes.markAsPaid.useMutation({
    onSuccess: (data) => {
      setSuccessMessage(`Quote ${data.quoteNumber} accepted successfully!`);
      // Refetch quotes after successful mutation
      trpc.useUtils().quotes.getClientQuotes.invalidate({ clientId });
    },
    onError: (error) => {
      setSuccessMessage(`Error: ${error.message}`);
    },
  });

  // Auto-dismiss success message after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const quotes = Array.isArray(quotesData) ? quotesData : [];
  const jobs = Array.isArray(jobsData) ? jobsData : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return { label: "Invoice Ready", color: "bg-blue-100 text-blue-800" };
      case "accepted":
        return { label: "Accepted", color: "bg-green-100 text-green-800" };
      case "rejected":
        return { label: "Rejected", color: "bg-red-100 text-red-800" };
      case "expired":
        return { label: "Expired", color: "bg-gray-100 text-gray-800" };
      case "draft":
        return { label: "Draft", color: "bg-yellow-100 text-yellow-800" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-800" };
    }
  };

  const handleAcceptQuote = (quoteId: number) => {
    acceptQuoteMutation.mutate({ id: quoteId });
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-green-800 font-medium">{successMessage}</p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Account</h1>
        <p className="text-muted-foreground mt-1">
          View your quotes and job status
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="quotes" className="w-full">
        <TabsList>
          <TabsTrigger value="quotes">Quotes & Invoices</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        {/* Quotes Tab */}
        <TabsContent value="quotes" className="space-y-4">
          {quotesLoading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Loading quotes...</p>
              </CardContent>
            </Card>
          ) : quotes.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No quotes at this time</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {quotes.map((quote) => {
                const statusBadge = getStatusBadge(quote.status);
                const grandTotalNum = parseFloat(quote.grandTotal || "0");
                return (
                  <Card key={quote.id} className="hover:border-primary/50 transition-colors">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <p className="font-mono text-sm text-muted-foreground">
                              {quote.quoteNumber}
                            </p>
                            <Badge className={statusBadge.color}>
                              {statusBadge.label}
                            </Badge>
                          </div>
                          <h3 className="text-lg font-semibold">{quote.description || "Quote"}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ${grandTotalNum.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-sm">
                          <p className="text-muted-foreground">Created</p>
                          <p className="font-medium">{new Date(quote.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div className="text-sm">
                          <p className="text-muted-foreground">Expires</p>
                          <p className="font-medium">{quote.expiresAt ? new Date(quote.expiresAt).toLocaleDateString() : "N/A"}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {quote.status === "sent" ? (
                          <>
                            <Button
                              className="flex-1 bg-green-600 hover:bg-green-700"
                              onClick={() => handleAcceptQuote(quote.id)}
                              disabled={acceptQuoteMutation.isPending}
                            >
                              {acceptQuoteMutation.isPending ? (
                                <span className="flex items-center gap-2">
                                  <span className="animate-spin">⟳</span>
                                  Processing...
                                </span>
                              ) : (
                                <span className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4" />
                                  Accept Quote
                                </span>
                              )}
                            </Button>
                            <Button variant="outline" className="flex-1">
                              View Details
                              <ChevronRight className="h-4 w-4 ml-2" />
                            </Button>
                          </>
                        ) : (
                          <Button className="w-full" variant="outline">
                            {quote.status === "accepted"
                              ? "View Accepted Quote"
                              : "View Quote Details"}
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
          {jobsLoading ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">Loading jobs...</p>
              </CardContent>
            </Card>
          ) : jobs.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No jobs at this time</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {jobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-mono text-sm text-muted-foreground">
                            {job.jobNumber}
                          </p>
                          <Badge
                            className={
                              job.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : job.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {job.status === "completed"
                              ? "Completed"
                              : job.status === "in_progress"
                                ? "In Progress"
                                : "Pending"}
                          </Badge>
                        </div>
                        <h3 className="text-lg font-semibold">{job.title}</h3>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Job Details */}
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                      <div className="text-sm">
                        <p className="text-muted-foreground">Status</p>
                        <p className="font-medium capitalize">{job.status}</p>
                      </div>
                      <div className="text-sm">
                        <p className="text-muted-foreground">Scheduled Date</p>
                        <p className="font-medium">{job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "TBD"}</p>
                      </div>
                    </div>

                    <Button className="w-full" variant="outline">
                      View Full Details
                      <ChevronRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
