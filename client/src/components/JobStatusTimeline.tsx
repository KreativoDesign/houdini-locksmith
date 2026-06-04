import React from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, AlertCircle, Zap } from "lucide-react";

interface TimelineEvent {
  status: string;
  timestamp: Date;
  description?: string;
  icon?: React.ReactNode;
}

interface JobStatusTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
  isLoading?: boolean;
}

const statusColors: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  assigned: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  in_progress: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  completed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case "in_progress":
      return <Zap className="w-5 h-5 text-orange-600" />;
    case "pending":
      return <Clock className="w-5 h-5 text-yellow-600" />;
    case "cancelled":
      return <AlertCircle className="w-5 h-5 text-red-600" />;
    default:
      return <Clock className="w-5 h-5 text-gray-600" />;
  }
};

const getStatusLabel = (status: string) => {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const JobStatusTimeline: React.FC<JobStatusTimelineProps> = ({
  events,
  currentStatus,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
      </div>
    );
  }

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No status updates yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Status Badge */}
      <div className={`p-4 rounded-lg border-2 ${statusColors[currentStatus]?.bg} ${statusColors[currentStatus]?.border}`}>
        <div className="flex items-center gap-3">
          {getStatusIcon(currentStatus)}
          <div>
            <p className={`font-semibold ${statusColors[currentStatus]?.text}`}>
              Current Status: {getStatusLabel(currentStatus)}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-green-400"></div>

        {/* Events */}
        <div className="space-y-6 ml-16">
          {events.map((event, index) => {
            const colors = statusColors[event.status] || statusColors.pending;
            const isLast = index === events.length - 1;

            return (
              <div key={index} className="relative">
                {/* Timeline Dot */}
                <div className="absolute -left-12 top-2 w-10 h-10 bg-white border-4 border-blue-400 rounded-full flex items-center justify-center">
                  {event.icon || getStatusIcon(event.status)}
                </div>

                {/* Event Card */}
                <div className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border}`}>
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className={`font-semibold ${colors.text}`}>
                        {getStatusLabel(event.status)}
                      </h4>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                    </div>
                    <time className="text-sm text-gray-500 whitespace-nowrap">
                      {format(new Date(event.timestamp), "MMM dd, yyyy")}
                      <br />
                      <span className="text-xs">{format(new Date(event.timestamp), "hh:mm a")}</span>
                    </time>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default JobStatusTimeline;
