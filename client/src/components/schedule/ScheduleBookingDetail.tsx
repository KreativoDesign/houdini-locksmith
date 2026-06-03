import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Clock,
  MapPin,
  User,
  Briefcase,
  X,
  ExternalLink,
} from "lucide-react";

interface ScheduleBookingDetailProps {
  booking: any;
  technician: any;
  isOpen: boolean;
  onClose: () => void;
  colourClass: string;
}

export function ScheduleBookingDetail({
  booking,
  technician,
  isOpen,
  onClose,
  colourClass,
}: ScheduleBookingDetailProps) {
  const [, navigate] = useLocation();

  const handleNavigateToJob = () => {
    if (booking.jobCardId) {
      navigate(`/jobs/${booking.jobCardId}`);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto animate-in fade-in-50 zoom-in-95 duration-200">
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <DialogHeader className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-lg font-bold">
                Booking Details
              </DialogTitle>
            </div>
            <DialogClose className="mt-0" />
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Technician Info */}
            <div
              className={`rounded-lg border-2 p-4 ${colourClass} animate-in fade-in slide-in-from-left-4 duration-300 delay-100`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center text-sm font-bold">
                  {(technician?.name ?? technician?.email ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {technician?.name ?? technician?.email}
                  </p>
                  {technician?.name && (
                    <p className="text-xs opacity-75">{technician?.email}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Time Information */}
            <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300 delay-150">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Time</p>
                  <p className="font-semibold text-sm">
                    {booking.startTime} – {booking.endTime}
                  </p>
                </div>
              </div>

              {booking.date && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="font-semibold text-sm">{booking.date}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Job Information */}
            {booking.jobCardId && (
              <div className="space-y-3 border-t pt-4 animate-in fade-in slide-in-from-left-4 duration-300 delay-200">
                <h3 className="font-semibold text-sm">Job Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      Job #{booking.jobCardId}
                    </Badge>
                  </div>

                  {booking.jobTitle && (
                    <div>
                      <p className="text-xs text-muted-foreground">Title</p>
                      <p className="text-sm font-medium">{booking.jobTitle}</p>
                    </div>
                  )}

                  {booking.clientName && (
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Client</p>
                        <p className="text-sm font-medium">{booking.clientName}</p>
                      </div>
                    </div>
                  )}

                  {booking.location && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs text-muted-foreground">Location</p>
                        <p className="text-sm font-medium">{booking.location}</p>
                      </div>
                    </div>
                  )}

                  {booking.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="text-sm bg-muted/50 rounded p-2 mt-1">
                        {booking.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Button
                  onClick={handleNavigateToJob}
                  className="w-full mt-4 transition-all hover:scale-105 active:scale-95"
                  variant="default"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Full Job Details
                </Button>
              </div>
            )}

            {/* No Job Card Info */}
            {!booking.jobCardId && (
              <div className="border-t pt-4 animate-in fade-in duration-300 delay-200">
                <p className="text-xs text-muted-foreground text-center">
                  No job card associated with this booking
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
