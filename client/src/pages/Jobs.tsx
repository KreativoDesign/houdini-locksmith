import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Filter, Search, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { JobsList } from "@/components/jobs/JobsList";
import { CreateJobModal } from "@/components/jobs/CreateJobModal";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Jobs() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: jobs, isLoading, refetch } = trpc.jobCards.list.useQuery({
    status: statusFilter && statusFilter !== "all" ? (statusFilter as any) : undefined,
    priority: priorityFilter && priorityFilter !== "all" ? (priorityFilter as any) : undefined,
  });

  const filteredJobs = jobs?.filter(
    (job) =>
      !searchQuery ||
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate statistics
  const stats = {
    total: jobs?.length || 0,
    pending: jobs?.filter((j) => j.status === "pending").length || 0,
    inProgress: jobs?.filter((j) => j.status === "in_progress").length || 0,
    completed: jobs?.filter((j) => j.status === "completed").length || 0,
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Job Management</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">Manage and track all service jobs</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-lime-500 hover:bg-lime-600 text-slate-950 font-bold h-10 sm:h-auto group transition-all duration-300 hover:shadow-md"
        >
          <Plus className="w-4 sm:w-5 h-4 sm:h-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
          New Job
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-slate-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Total Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.total}
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-yellow-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-500">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-blue-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-500">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.inProgress}
            </div>
          </CardContent>
        </Card>
        <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-green-400">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-500">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-500">
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <Filter className="w-4 sm:w-5 h-4 sm:h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4">
            <div className="flex items-center gap-2 col-span-1 sm:col-span-2 md:col-span-1">
              <Search className="w-4 sm:w-5 h-4 sm:h-5 text-gray-400 shrink-0" />
              <Input
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-9 sm:h-10 text-sm"
              />
            </div>
            <Select value={statusFilter || "all"} onValueChange={(v) => setStatusFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter || "all"} onValueChange={(v) => setPriorityFilter(v === "all" ? undefined : v)}>
              <SelectTrigger className="h-9 sm:h-10 text-sm">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Jobs List */}
      <JobsList jobs={filteredJobs} isLoading={isLoading} onJobUpdated={() => refetch()} />

      {/* Create Job Modal */}
      <CreateJobModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onJobCreated={() => {
          setShowCreateModal(false);
          refetch();
        }}
      />
    </div>
  );
}
