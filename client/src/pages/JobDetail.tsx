import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function JobDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const jobId = parseInt(id);

  const { data: job, isLoading, error } = trpc.jobCards.get.useQuery({
    id: jobId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-gray-500">Loading job details...</div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">
          Error loading job details. Please try again.
        </div>
        <div className="text-center mt-4">
          <Button onClick={() => setLocation("/jobs")} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
        </div>
      </div>
    );
  }

  const jobData = job as any;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4">
        <button
          onClick={() => setLocation("/jobs")}
          className="hover:text-gray-900"
        >
          Jobs
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">
          {jobData.jobNumber || `Job #${jobId}`}
        </span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{jobData.title}</h1>
          <p className="text-sm text-gray-600 mt-1">Job #{jobData.jobNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setLocation("/jobs")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button
            onClick={() => setLocation(`/jobs/${jobId}/edit`)}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Edit Job
          </Button>
        </div>
      </div>

      {/* Status & Priority */}
      <div className="flex gap-2">
        <Badge className="bg-blue-100 text-blue-800">
          {jobData.status || "pending"}
        </Badge>
        <Badge className="bg-orange-100 text-orange-800">
          {jobData.priority || "normal"}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                {jobData.description || "No description provided"}
              </p>
            </CardContent>
          </Card>

          {/* Job Details */}
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Department</p>
                  <p className="font-medium">{jobData.departmentName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Assigned Technician</p>
                  <p className="font-medium">
                    {jobData.technicianName || "Unassigned"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Client</p>
                  <p className="font-medium">{jobData.clientName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Client Phone</p>
                  <p className="font-medium">{jobData.clientPhone || "N/A"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium">
                  {jobData.createdAt
                    ? new Date(jobData.createdAt).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Scheduled:</span>
                <span className="font-medium">
                  {jobData.scheduledDate
                    ? new Date(jobData.scheduledDate).toLocaleDateString()
                    : "Not scheduled"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Started:</span>
                <span className="font-medium">
                  {jobData.startedAt
                    ? new Date(jobData.startedAt).toLocaleDateString()
                    : "Not started"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">
                  {jobData.completedAt
                    ? new Date(jobData.completedAt).toLocaleDateString()
                    : "Not completed"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{jobData.clientName || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="font-medium text-blue-600">
                  {jobData.clientEmail || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium">{jobData.clientPhone || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Signature Status */}
          <Card>
            <CardHeader>
              <CardTitle>Signature Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    jobData.isSigned ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <span className="font-medium">
                  {jobData.isSigned ? "Signed" : "Not Signed"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
