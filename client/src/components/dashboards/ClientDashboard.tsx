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
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { JobStatusTimeline } from "@/components/JobStatusTimeline";
import { JobOverview } from "@/components/JobOverview";
import { PayNowButton } from "@/components/PayNowButton";

// Default test client ID for admin viewing client dashboard
const DEFAULT_TEST_CLIENT_ID = 1;

export function ClientDashboard() {
  const [, setLocation] = useLocation();
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

  const quotes = quotesData || [];
  const jobs = jobsData || [];
  const [jobTimelines, setJobTimelines] = useState<Record<number, any[]>>({});
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Fetch timelines for each job
  useEffect(() => {
    if (jobs.length > 0) {
      setTimelineLoading(true);
      // Create synthetic timelines based on job status
      const timelines: Record<number, any[]> = {};
      jobs.forEach((job) => {
        timelines[job.id] = [
          {
            status: "pending",
            timestamp: job.createdAt,
            description: "Job created"
          },
          ...(job.status !== "pending" ? [{
            status: job.status,
            timestamp: new Date(),
            description: `Job ${job.status}`
          }] : [])
        ];
      });
      setJobTimelines(timelines);
      setTimelineLoading(false);
    }
  }, [jobs]);

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

  const getJobStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return { label: "Pending", color: "bg-gray-100 text-gray-800" };
      case "assigned":
        return { label: "Assigned", color: "bg-blue-100 text-blue-800" };
      case "in_progress":
        return { label: "In Progress", color: "bg-yellow-100 text-yellow-800" };
      case "completed":
        return { label: "Completed", color: "bg-green-100 text-green-800" };
      case "cancelled":
        return { label: "Cancelled", color: "bg-red-100 text-red-800" };
      default:
        return { label: status, color: "bg-gray-100 text-gray-800" };
    }
  };

  if (quotesLoading || jobsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          {successMessage}
        </div>
      )}

      <Tabs defaultValue="quotes" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="quotes">Quotes & Invoices</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="space-y-4">
          <div className="grid gap-4">
            {quotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No quotes available</p>
              </div>
            ) : (
              quotes.map((quote: any) => {
                const statusBadge = getStatusBadge(quote.status);
                return (
                  <div
                    key={quote.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{quote.quoteNumber}</h3>
                        <p className="text-sm text-gray-600">
                          Created: {new Date(quote.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="font-semibold">R{parseFloat(quote.totalAmount).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold capitalize">{quote.status}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/quotes/${quote.id}`)}
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                      {quote.status === "sent" && (
                        <Button
                          size="sm"
                          onClick={() => acceptQuoteMutation.mutate({ id: quote.id })}
                          disabled={acceptQuoteMutation.isPending}
                        >
                          {acceptQuoteMutation.isPending ? "Processing..." : "Accept Quote"}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <div className="grid gap-4">
            {jobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No jobs available</p>
              </div>
            ) : (
              jobs.map((job: any) => {
                const statusBadge = getJobStatusBadge(job.status);
                const timeline = jobTimelines[job.id] || [];
                return (
                  <div
                    key={job.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{job.jobCardNumber}</h3>
                        <p className="text-sm text-gray-600">{job.description}</p>
                      </div>
                      <Badge className={statusBadge.color}>{statusBadge.label}</Badge>
                    </div>

                    {timeline.length > 0 && (
                      <div className="mb-4 p-3 bg-gray-50 rounded">
                        <p className="text-sm font-semibold mb-2">Status Timeline</p>
                        <div className="space-y-2">
                          {timeline.map((event: any, idx: number) => (
                            <div key={idx} className="text-sm flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <span className="capitalize">{event.description}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(event.timestamp).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/jobs/${job.id}`)}
                      >
                        View Details
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                      {job.status === "completed" && (
                        <PayNowButton 
                          invoiceId={job.id} 
                          amount={0}
                          jobNumber={job.jobCardNumber}
                          clientName="Client"
                          clientEmail="client@example.com"
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
