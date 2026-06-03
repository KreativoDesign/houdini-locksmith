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
import { useState } from "react";

export function ClientDashboard() {
  const [payingQuoteId, setPayingQuoteId] = useState<number | null>(null);
  const [paidQuotes, setPaidQuotes] = useState<number[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mock data - in real app, this would come from the API
  const quotes = [
    {
      id: 1,
      quoteNumber: "QT-2026-001",
      title: "Lock Replacement",
      status: "accepted",
      amount: "$250.00",
      amountNumeric: 250,
      createdDate: "2026-05-28",
      expiryDate: "2026-06-27",
    },
    {
      id: 2,
      quoteNumber: "QT-2026-002",
      title: "Security System Installation",
      status: "pending",
      amount: "$1,500.00",
      amountNumeric: 1500,
      createdDate: "2026-06-01",
      expiryDate: "2026-07-01",
    },
  ];

  const jobs = [
    {
      id: 1,
      jobNumber: "JC-2026-0013",
      title: "Lock Replacement",
      status: "completed",
      scheduledDate: "2026-05-30",
      completedDate: "2026-05-30",
      technician: "John Smith",
      timeline: [
        { step: "Quote Accepted", date: "2026-05-28", completed: true },
        { step: "Scheduled", date: "2026-05-30", completed: true },
        { step: "In Progress", date: "2026-05-30", completed: true },
        { step: "Completed", date: "2026-05-30", completed: true },
      ],
    },
    {
      id: 2,
      jobNumber: "JC-2026-0012",
      title: "Car Key Replacement",
      status: "in_progress",
      scheduledDate: "2026-06-05",
      technician: "Jane Doe",
      timeline: [
        { step: "Quote Accepted", date: "2026-06-01", completed: true },
        { step: "Scheduled", date: "2026-06-05", completed: true },
        { step: "In Progress", date: "2026-06-03", completed: true },
        { step: "Completed", date: null, completed: false },
      ],
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePayInvoice = (quoteId: number, quoteNumber: string, amount: string) => {
    setPayingQuoteId(quoteId);
    setTimeout(() => {
      setPaidQuotes([...paidQuotes, quoteId]);
      setPayingQuoteId(null);
      setSuccessMessage(`Payment of ${amount} for ${quoteNumber} processed successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }, 1500);
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
          <div className="grid gap-4">
            {quotes.map((quote) => (
              <Card key={quote.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <p className="font-mono text-sm text-muted-foreground">
                          {quote.quoteNumber}
                        </p>
                        <Badge
                          className={
                            paidQuotes.includes(quote.id)
                              ? "bg-green-100 text-green-800"
                              : quote.status === "accepted"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                          }
                        >
                          {paidQuotes.includes(quote.id)
                            ? "Paid"
                            : quote.status === "accepted"
                              ? "Invoice Ready"
                              : "Pending"}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold">{quote.title}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {quote.amount}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-sm">
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{quote.createdDate}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Expires</p>
                      <p className="font-medium">{quote.expiryDate}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {quote.status === "accepted" && !paidQuotes.includes(quote.id) ? (
                      <>
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            handlePayInvoice(quote.id, quote.quoteNumber, quote.amount)
                          }
                          disabled={payingQuoteId === quote.id}
                        >
                          {payingQuoteId === quote.id ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin">⟳</span>
                              Processing...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              Pay Invoice
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
                        {paidQuotes.includes(quote.id)
                          ? "View Receipt"
                          : "View Quote Details"}
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Jobs Tab */}
        <TabsContent value="jobs" className="space-y-4">
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
                              : "bg-blue-100 text-blue-800"
                          }
                        >
                          {job.status === "completed"
                            ? "Completed"
                            : "In Progress"}
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
                      <p className="text-muted-foreground">Technician</p>
                      <p className="font-medium">{job.technician}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-muted-foreground">Scheduled Date</p>
                      <p className="font-medium">{job.scheduledDate}</p>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="space-y-3">
                    <p className="font-semibold text-sm">Job Timeline</p>
                    <div className="space-y-2">
                      {job.timeline.map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div className="flex flex-col items-center">
                            {step.completed ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            ) : (
                              <Clock className="h-5 w-5 text-muted-foreground" />
                            )}
                            {index < job.timeline.length - 1 && (
                              <div className="w-0.5 h-6 bg-muted mt-1" />
                            )}
                          </div>
                          <div className="flex-1 pt-0.5">
                            <p
                              className={
                                step.completed
                                  ? "font-medium"
                                  : "text-muted-foreground"
                              }
                            >
                              {step.step}
                            </p>
                            {step.date && (
                              <p className="text-xs text-muted-foreground">
                                {step.date}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
