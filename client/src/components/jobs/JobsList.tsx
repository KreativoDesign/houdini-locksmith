import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, Edit, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useIsMobile } from "@/hooks/useMobile";
import { Skeleton } from "@/components/ui/skeleton";

interface Job {
  id: number;
  jobNumber: string;
  title: string;
  status: string;
  priority: string;
  scheduledDate: Date | null;
  clientId: number;
  assignedTechnicianId: number | null;
  [key: string]: any;
}

export function JobsList({
  jobs,
  isLoading,
  onJobUpdated,
}: {
  jobs: Job[];
  isLoading: boolean;
  onJobUpdated: () => void;
}) {
  const [, setLocation] = useLocation();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const isMobile = useIsMobile();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "assigned":
        return "bg-blue-100 text-blue-800";
      case "in_progress":
        return "bg-cyan-100 text-cyan-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "on_hold":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800";
      case "high":
        return "bg-orange-100 text-orange-800";
      case "normal":
        return "bg-blue-100 text-blue-800";
      case "low":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Jobs (Loading...)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Job Number</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Title</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Priority</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Scheduled Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-40" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-6 w-24" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-6 w-20" /></td>
                    <td className="py-3 px-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="py-3 px-4"><div className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (jobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">No jobs found</div>
        </CardContent>
      </Card>
    );
  }

  if (isMobile) {
    return (
      <div className="space-y-3">
        {jobs.map((job) => (
          <Card key={job.id} className="overflow-hidden hover:shadow-md transition-shadow duration-200">
            <div
              className="p-4 cursor-pointer hover:bg-muted/60 transition-colors duration-200 group"
              onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-lime-600 bg-lime-50 px-2 py-1 rounded group-hover:bg-lime-100 transition-colors duration-200">
                      {job.jobNumber}
                    </span>
                    <Badge className={`${getStatusColor(job.status)} text-xs transition-all duration-200 group-hover:shadow-md`}>
                      {job.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <h3 className="font-semibold text-sm line-clamp-2 group-hover:font-bold transition-all duration-200">{job.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge className={`${getPriorityColor(job.priority)} text-xs transition-all duration-200 group-hover:shadow-md`}>
                      {job.priority}
                    </Badge>
                    {job.scheduledDate && (
                      <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                        {new Date(job.scheduledDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <button className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded transition-all duration-200 group-hover:scale-110 shrink-0">
                  {expandedId === job.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            {expandedId === job.id && (
              <div className="border-t px-4 py-3 bg-muted/30 space-y-3 animate-in fade-in duration-200">
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/jobs/${job.id}`)}
                    className="flex-1 hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-105"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocation(`/jobs/${job.id}/edit`)}
                    className="flex-1 hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:scale-105"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Jobs ({jobs.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold text-sm">Job Number</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Title</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Priority</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Scheduled Date</th>
                <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={job.id} className="border-b hover:bg-muted/40 transition-colors duration-200 cursor-pointer group">
                  <td className="py-3 px-4 font-mono text-sm font-bold text-lime-600 group-hover:text-lime-700 transition-colors duration-200">
                    {job.jobNumber}
                  </td>
                  <td className="py-3 px-4 text-sm group-hover:font-medium transition-all duration-200">{job.title}</td>
                  <td className="py-3 px-4">
                    <Badge className={`${getStatusColor(job.status)} transition-all duration-200 group-hover:shadow-md`}>
                      {job.status.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={`${getPriorityColor(job.priority)} transition-all duration-200 group-hover:shadow-md`}>
                      {job.priority}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-200">
                    {job.scheduledDate
                      ? new Date(job.scheduledDate).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 opacity-70 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/jobs/${job.id}`)}
                        className="hover:bg-primary/10 hover:text-primary transition-all duration-200 hover:scale-105"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/jobs/${job.id}/edit`)}
                        className="hover:bg-blue-50 hover:text-blue-600 transition-all duration-200 hover:scale-105"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
