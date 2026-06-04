import React from "react";
import { format } from "date-fns";
import { MapPin, User, DollarSign, Calendar, FileText, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface JobOverviewProps {
  job: {
    id: number;
    jobNumber: string;
    title: string;
    description?: string;
    status: string;
    priority: "low" | "medium" | "high" | "urgent";
    createdAt: Date;
    scheduledDate?: Date;
    completedDate?: Date;
    estimatedCost?: number;
    actualCost?: number;
    assignedTechnicianId?: number;
    assignedTechnicianName?: string;
    clientId?: number;
    clientName?: string;
    location?: string;
    notes?: string;
    photos?: Array<{ url: string; caption?: string }>;
  };
  isLoading?: boolean;
}

const priorityColors: Record<string, string> = {
  low: "bg-blue-100 text-blue-800",
  medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-100 text-gray-800",
  assigned: "bg-blue-100 text-blue-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export const JobOverview: React.FC<JobOverviewProps> = ({ job, isLoading }) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex justify-between items-start gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-gray-600 mt-1">Job #{job.jobNumber}</p>
          </div>
          <div className="flex gap-2">
            <Badge className={statusColors[job.status]}>
              {job.status.replace("_", " ").toUpperCase()}
            </Badge>
            <Badge className={priorityColors[job.priority]}>
              {job.priority.toUpperCase()}
            </Badge>
          </div>
        </div>

        {job.description && (
          <p className="text-gray-700 leading-relaxed">{job.description}</p>
        )}
      </div>

      {/* Key Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Created Date */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {format(new Date(job.createdAt), "MMM dd, yyyy")}
            </p>
            <p className="text-sm text-gray-600">
              {format(new Date(job.createdAt), "hh:mm a")}
            </p>
          </CardContent>
        </Card>

        {/* Scheduled Date */}
        {job.scheduledDate && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scheduled
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                {format(new Date(job.scheduledDate), "MMM dd, yyyy")}
              </p>
              <p className="text-sm text-gray-600">
                {format(new Date(job.scheduledDate), "hh:mm a")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Assigned Technician */}
        {job.assignedTechnicianName && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Assigned Technician
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{job.assignedTechnicianName}</p>
            </CardContent>
          </Card>
        )}

        {/* Estimated Cost */}
        {job.estimatedCost && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Estimated Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                ${job.estimatedCost.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Actual Cost */}
        {job.actualCost && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Actual Cost
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">
                ${job.actualCost.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Location */}
        {job.location && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{job.location}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Notes Section */}
      {job.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 whitespace-pre-wrap">{job.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Photos Section */}
      {job.photos && job.photos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Photos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {job.photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  {photo.caption && (
                    <p className="text-sm text-gray-600 mt-2">{photo.caption}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completed Date */}
      {job.completedDate && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-green-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold text-green-900">
              {format(new Date(job.completedDate), "MMM dd, yyyy")}
            </p>
            <p className="text-sm text-green-700">
              {format(new Date(job.completedDate), "hh:mm a")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobOverview;
