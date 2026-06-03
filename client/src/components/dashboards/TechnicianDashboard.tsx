import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Check,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";

export function TechnicianDashboard() {
  const [acceptedJobs, setAcceptedJobs] = useState<number[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch assigned jobs for current technician
  const { data: jobsData, isLoading } = trpc.jobCards.list.useQuery({
    status: "assigned",
  });

  // Accept job mutation
  const acceptJobMutation = trpc.jobCards.acceptJob.useMutation({
    onSuccess: (data, variables) => {
      setAcceptedJobs([...acceptedJobs, variables.id]);
      setSuccessMessage(`Job ${data.jobNumber} accepted successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (error) => {
      setSuccessMessage(`Error: ${error.message}`);
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const assignedJobs = Array.isArray(jobsData) ? jobsData : [];

  const stats = [
    { label: "Assigned Jobs", value: assignedJobs.length.toString(), color: "bg-blue-500" },
    { label: "Completed Today", value: "1", color: "bg-green-500" },
    { label: "Pending", value: (assignedJobs.length - acceptedJobs.length).toString(), color: "bg-yellow-500" },
  ];

  const handleAcceptJob = (jobId: number) => {
    acceptJobMutation.mutate({ id: jobId });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">My Dashboard</h1>
          <p className="text-muted-foreground mt-1">Loading your assigned jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className={`border rounded-lg p-4 flex items-center gap-2 ${
          successMessage.startsWith("Error") 
            ? "bg-red-50 border-red-200" 
            : "bg-green-50 border-green-200"
        }`}>
          <CheckCircle2 className={`h-5 w-5 ${
            successMessage.startsWith("Error") 
              ? "text-red-600" 
              : "text-green-600"
          }`} />
          <p className={successMessage.startsWith("Error") ? "text-red-800" : "text-green-800"}>
            {successMessage}
          </p>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">My Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          View your assigned jobs and schedule
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-lg ${stat.color} opacity-10`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Assigned Jobs */}
      <div>
        <h2 className="text-xl font-bold mb-4">Assigned Jobs</h2>
        {assignedJobs.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">No assigned jobs at this time</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignedJobs.map((job: any) => (
              <Card key={job.id} className="hover:border-primary/50 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm text-muted-foreground">
                          {job.jobNumber}
                        </p>
                        <Badge
                          variant={
                            acceptedJobs.includes(job.id) ? "default" : "secondary"
                          }
                        >
                          {acceptedJobs.includes(job.id) ? "Accepted" : "Assigned"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={
                            job.priority === "high"
                              ? "border-red-500 text-red-700"
                              : "border-yellow-500 text-yellow-700"
                          }
                        >
                          {job.priority}
                        </Badge>
                      </div>
                      <h3 className="text-lg font-semibold mt-2">{job.title}</h3>
                    </div>
                    {acceptedJobs.includes(job.id) && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                    {!acceptedJobs.includes(job.id) && (
                      <AlertCircle className="h-5 w-5 text-blue-500" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Client Info */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="font-semibold text-sm">{job.clientName}</p>
                    {job.clientPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        <a href={`tel:${job.clientPhone}`} className="hover:underline">
                          {job.clientPhone}
                        </a>
                      </div>
                    )}
                    {job.clientEmail && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        <a href={`mailto:${job.clientEmail}`} className="hover:underline">
                          {job.clientEmail}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Job Details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Location</p>
                        <p className="font-medium">{job.location || "TBD"}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="text-muted-foreground">Scheduled</p>
                        <p className="font-medium">
                          {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString() : "TBD"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!acceptedJobs.includes(job.id) ? (
                      <>
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleAcceptJob(job.id)}
                          disabled={acceptJobMutation.isPending}
                        >
                          {acceptJobMutation.isPending ? (
                            <span className="flex items-center gap-2">
                              <span className="animate-spin">⟳</span>
                              Accepting...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              Accept Job
                            </span>
                          )}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          View Details
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" className="flex-1">
                          View Details
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1">
                          Start Job
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
