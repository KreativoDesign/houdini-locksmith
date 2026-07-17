import React from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

export default function JobDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const jobId = parseInt(id, 10);

  const { data: job, isLoading, error } = trpc.jobCards.get.useQuery({
    id: jobId,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-500 mb-4">Error loading job</p>
        <Button onClick={() => setLocation("/jobs")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    );
  }

  const j = job as any;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{j.title}</h1>
          <p className="text-gray-600">Job #{j.jobNumber}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setLocation("/jobs")} variant="outline">
            Back
          </Button>
          <Button onClick={() => setLocation(`/jobs/${jobId}/edit`)}>
            Edit
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge>{j.status || "pending"}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Priority</p>
                <Badge variant="outline">{j.priority || "normal"}</Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600">Description</p>
                <p className="mt-1">{j.description || "No description"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Department</p>
                <p className="mt-1">{j.departmentName || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Assigned Technician</p>
                <p className="mt-1">{j.technicianName || "Unassigned"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium">{j.clientName || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm">{j.clientEmail || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="text-sm">{j.clientPhone || "N/A"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div
                  className={`w-3 h-3 rounded-full ${
                    j.isSigned ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
                <span>{j.isSigned ? "Signed" : "Not Signed"}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
