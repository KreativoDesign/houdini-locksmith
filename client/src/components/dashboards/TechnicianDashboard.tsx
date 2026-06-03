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

export function TechnicianDashboard() {
  const [acceptingJobId, setAcceptingJobId] = useState<number | null>(null);
  const [acceptedJobs, setAcceptedJobs] = useState<number[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Mock data - in real app, this would come from the API
  const assignedJobs = [
    {
      id: 1,
      jobNumber: "JC-2026-0013",
      title: "TROUBLESHOOT",
      status: "assigned",
      priority: "high",
      clientName: "John Doe",
      clientPhone: "+1 (555) 123-4567",
      clientEmail: "john@example.com",
      address: "123 Main Street, City",
      scheduledDate: "2026-06-05",
      scheduledTime: "10:00 AM",
      estimatedDuration: "1.5 hours",
    },
    {
      id: 2,
      jobNumber: "JC-2026-0011",
      title: "Testing",
      status: "in_progress",
      priority: "high",
      clientName: "Jane Smith",
      clientPhone: "+1 (555) 987-6543",
      clientEmail: "jane@example.com",
      address: "456 Oak Avenue, Town",
      scheduledDate: "2026-06-03",
      scheduledTime: "2:00 PM",
      estimatedDuration: "2 hours",
    },
  ];

  const stats = [
    { label: "Assigned Jobs", value: "2", color: "bg-blue-500" },
    { label: "Completed Today", value: "1", color: "bg-green-500" },
    { label: "Pending", value: "1", color: "bg-yellow-500" },
  ];

  const handleAcceptJob = (jobId: number, jobNumber: string) => {
    setAcceptingJobId(jobId);
    setTimeout(() => {
      setAcceptedJobs([...acceptedJobs, jobId]);
      setAcceptingJobId(null);
      setSuccessMessage(`Job ${jobNumber} accepted successfully!`);
      setTimeout(() => setSuccessMessage(null), 3000);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <p className="text-green-800">{successMessage}</p>
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
        <div className="space-y-4">
          {assignedJobs.map((job) => (
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
                          job.status === "assigned" ? "secondary" : "default"
                        }
                      >
                        {acceptedJobs.includes(job.id)
                          ? "Accepted"
                          : job.status === "assigned"
                            ? "Assigned"
                            : "In Progress"}
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
                  {job.status === "in_progress" && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {job.status === "assigned" && !acceptedJobs.includes(job.id) && (
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Client Info */}
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <p className="font-semibold text-sm">{job.clientName}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${job.clientPhone}`} className="hover:underline">
                      {job.clientPhone}
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <a href={`mailto:${job.clientEmail}`} className="hover:underline">
                      {job.clientEmail}
                    </a>
                  </div>
                </div>

                {/* Job Details */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-medium">{job.address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Scheduled</p>
                      <p className="font-medium">{job.scheduledDate}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Time</p>
                      <p className="font-medium">{job.scheduledTime}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div className="text-sm">
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{job.estimatedDuration}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {job.status === "assigned" && !acceptedJobs.includes(job.id) ? (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={() => handleAcceptJob(job.id, job.jobNumber)}
                        disabled={acceptingJobId === job.id}
                      >
                        {acceptingJobId === job.id ? (
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
      </div>
    </div>
  );
}
