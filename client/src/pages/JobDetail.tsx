import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Plus, Clock, User, Phone, Mail, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function JobDetail({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState("");

  const jobId = parseInt(id);
  const { data: job, isLoading, refetch } = trpc.jobCards.get.useQuery({
    id: jobId,
  });

  const { data: jobItemsData } = trpc.jobItems.list.useQuery({ jobCardId: jobId });
  const jobItems = Array.isArray(jobItemsData) ? jobItemsData : (jobItemsData as any)?.rows ?? [];
  const { data: jobDocuments = [] } = trpc.documents.list.useQuery({ jobCardId: jobId });
  const updateStatusMutation = trpc.jobCards.updateStatus.useMutation();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Filter photos from documents
  const photos = Array.isArray(jobDocuments)
    ? (jobDocuments as any[]).filter((doc) =>
        ["photo", "before_image", "after_image"].includes(doc.category)
      )
    : [];

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

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast.error("Please select a status");
      return;
    }

    try {
      await updateStatusMutation.mutateAsync({
        id: jobId,
        status: newStatus as any,
      });
      toast.success("Job status updated");
      setNewStatus("");
      refetch();
    } catch (error) {
      toast.error("Failed to update status");
      console.error(error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }
    toast.info("Note feature coming soon");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Loading job details...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Job not found</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <button
          onClick={() => setLocation("/jobs")}
          className="hover:text-foreground transition-colors"
        >
          Jobs
        </button>
        <ChevronRight className="w-4 h-4" />
        <span className="text-foreground font-medium">{job?.jobNumber || `Job #${jobId}`}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/jobs")}
            className="hidden sm:flex"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Jobs
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{(job as any).title}</h1>
            <p className="text-sm text-gray-600 mt-1">Job #{(job as any).jobNumber}</p>
          </div>
        </div>
        <Button
          onClick={() => setLocation(`/jobs/${jobId}/edit`)}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Edit Job
        </Button>
      </div>

      {/* Status and Priority */}
      <div className="flex gap-4">
        <Badge className={getStatusColor((job as any).status)}>
          {(job as any).status}
        </Badge>
        <Badge className={getPriorityColor((job as any).priority)}>
          {(job as any).priority}
        </Badge>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Job Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">{(job as any).description || "No description provided"}</p>
            </CardContent>
          </Card>

          {/* Site Photos Gallery */}
          {photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Site Photos ({photos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo: any) => (
                    <div
                      key={photo.id}
                      className="relative group cursor-pointer overflow-hidden rounded-lg border border-gray-200 hover:border-blue-400 transition-colors"
                      onClick={() => setSelectedPhoto(photo.fileUrl)}
                    >
                      <img
                        src={photo.fileUrl}
                        alt={photo.fileName}
                        className="w-full h-32 object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium transition-opacity">
                          View
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Job Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Job Items</CardTitle>
              <Button size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent>
              {jobItems.length === 0 ? (
                <p className="text-gray-500">No items added yet</p>
              ) : (
                <div className="space-y-2">
                  {jobItems.map((item: any) => (
                    <div key={item.id} className="flex justify-between p-2 border rounded">
                      <span>{item.description}</span>
                      <span className="font-semibold">R {item.amount}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add a note..."
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <Button onClick={handleAddNote} className="w-full">
                Add Note
              </Button>
              {(job as any).technicianNotes && (
                <div className="mt-4 p-3 bg-gray-50 rounded border">
                  <p className="text-sm font-semibold text-gray-700">Technician Notes:</p>
                  <p className="text-sm text-gray-600 mt-1">{(job as any).technicianNotes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="on_hold">On Hold</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusUpdate}
                disabled={updateStatusMutation.isPending}
                className="w-full"
              >
                {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
              </Button>
            </CardContent>
          </Card>

          {/* Assigned Technician */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Assigned Technician</CardTitle>
            </CardHeader>
            <CardContent>
              {(job as any).technicianName ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-600" />
                    <span className="font-semibold">{(job as any).technicianName}</span>
                  </div>
                  {(job as any).technicianEmail && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-gray-600" />
                      <span>{(job as any).technicianEmail}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-gray-500">No technician assigned</p>
              )}
            </CardContent>
          </Card>

          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Client</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-semibold">{(job as any).clientName}</p>
              {(job as any).clientEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-600" />
                  <span>{(job as any).clientEmail}</span>
                </div>
              )}
              {(job as any).clientPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-600" />
                  <span>{(job as any).clientPhone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(job as any).createdAt && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span>Created: {new Date((job as any).createdAt).toLocaleDateString()}</span>
                </div>
              )}
              {(job as any).startedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span>Started: {new Date((job as any).startedAt).toLocaleDateString()}</span>
                </div>
              )}
              {(job as any).completedAt && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-600" />
                  <span>Completed: {new Date((job as any).completedAt).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Photo Lightbox Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={selectedPhoto}
              alt="Full size photo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}
