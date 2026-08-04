import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  User,
  AlertTriangle,
} from "lucide-react";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, eachDayOfInterval, isToday, isSameDay } from "date-fns";
import { ScheduleBookingDetail } from "@/components/schedule/ScheduleBookingDetail";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekRange(anchor: Date) {
  const from = startOfWeek(anchor, { weekStartsOn: 1 }); // Monday
  const to = endOfWeek(anchor, { weekStartsOn: 1 });     // Sunday
  return { from, to };
}

function formatDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SLOT_COLOURS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-emerald-100 border-emerald-300 text-emerald-800",
  "bg-violet-100 border-violet-300 text-violet-800",
  "bg-amber-100 border-amber-300 text-amber-800",
  "bg-rose-100 border-rose-300 text-rose-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
  "bg-fuchsia-100 border-fuchsia-300 text-fuchsia-800",
  "bg-lime-100 border-lime-300 text-lime-800",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [expandedBookingId, setExpandedBookingId] = useState<number | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);

  const { from, to } = getWeekRange(weekAnchor);
  const weekDays = eachDayOfInterval({ start: from, end: to });

  // Fetch departments
  const { data: departments = [] } = trpc.departments.list.useQuery();

  // Auto-select first department once loaded
  useEffect(() => {
    const firstDeptId = (departments as any[])[0]?.id ?? null;
    if (selectedDeptId === null && firstDeptId !== null) {
      setSelectedDeptId(firstDeptId);
    }
  }, [departments, selectedDeptId]);

  // Fetch technicians in selected department
  const { data: technicians = [], isLoading: techLoading } = trpc.users.technicians.useQuery(
    selectedDeptId ? { departmentId: selectedDeptId } : undefined,
    { enabled: selectedDeptId !== null }
  );

  const techIds = useMemo(() => (technicians as any[]).map((t: any) => t.id), [technicians]);

  // Fetch weekly bookings for all technicians in the dept
  const { data: bookings = [], isLoading: bookingsLoading } = trpc.scheduling.getWeeklyBookings.useQuery(
    {
      technicianIds: techIds,
      fromDate: formatDate(from),
      toDate: formatDate(to),
    },
    { enabled: techIds.length > 0 }
  );

  const isLoading = techLoading || bookingsLoading;

  // Build a lookup: technicianId → date → slots[]
  const bookingMap = useMemo(() => {
    const map = new Map<number, Map<string, any[]>>();
    for (const b of bookings as any[]) {
      if (!map.has(b.technicianId)) map.set(b.technicianId, new Map());
      const dateMap = map.get(b.technicianId)!;
      if (!dateMap.has(b.date)) dateMap.set(b.date, []);
      dateMap.get(b.date)!.push(b);
    }
    return map;
  }, [bookings]);

  // Detect days with multiple technicians booked at overlapping times (cross-tech conflicts)
  const conflictDays = useMemo(() => {
    const conflicts = new Set<string>();
    for (const day of weekDays) {
      const dateStr = formatDate(day);
      const allSlotsOnDay: any[] = [];
      for (const techId of techIds) {
        const slots = bookingMap.get(techId)?.get(dateStr) ?? [];
        allSlotsOnDay.push(...slots);
      }
      // Simple overlap check: if any two slots share the same start time across different technicians
      const times = allSlotsOnDay.map((s) => s.startTime);
      if (new Set(times).size < times.length) conflicts.add(dateStr);
    }
    return conflicts;
  }, [bookingMap, weekDays, techIds]);

  const selectedDept = (departments as any[]).find((d: any) => d.id === selectedDeptId);

  // Handle booking card click to expand details
  const handleBookingClick = (booking: any) => {
    const tech = (technicians as any[]).find((t: any) => t.id === booking.technicianId);
    setSelectedBooking(booking);
    setSelectedTechnician(tech);
    setExpandedBookingId(booking.id);
  };

  const handleCloseDetail = () => {
    setExpandedBookingId(null);
    setSelectedBooking(null);
    setSelectedTechnician(null);
  };

  return (
    <div className="p-6 space-y-6 max-w-full">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Schedule
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Weekly view of technician bookings by department
          </p>
        </div>

        {/* Department selector */}
        <div className="flex items-center gap-3">
          <Select
            value={selectedDeptId ? String(selectedDeptId) : undefined}
            onValueChange={(v) => setSelectedDeptId(Number(v))}
          >
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {(departments as any[]).map((d: any) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── Week Navigation ── */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekAnchor((w) => subWeeks(w, 1))}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekAnchor(new Date())}
          className="min-w-[5rem]"
        >
          Today
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekAnchor((w) => addWeeks(w, 1))}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-foreground ml-1">
          {format(from, "d MMM")} – {format(to, "d MMM yyyy")}
        </span>
      </div>

      {/* ── Calendar Grid / Timeline View ── */}
      {!selectedDeptId ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <CalendarDays className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">Select a department to view the schedule.</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-5 h-5 animate-spin" />
            <span>Loading schedule…</span>
          </div>
        </div>
      ) : (technicians as any[]).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <User className="w-12 h-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">
            No active technicians in{" "}
            <span className="font-medium">{selectedDept?.name ?? "this department"}</span>.
          </p>
        </div>
      ) : isMobile ? (
        // ── Mobile Timeline View ──
        <div className="space-y-4">
          {weekDays.map((day) => {
            const dateStr = formatDate(day);
            const dayBookings: any[] = [];
            for (const tech of technicians as any[]) {
              const slots = bookingMap.get(tech.id)?.get(dateStr) ?? [];
              for (const slot of slots) {
                dayBookings.push({
                  ...slot,
                  technicianId: tech.id,
                  technicianName: tech.name ?? tech.email,
                  technicianEmail: tech.email,
                  technicianAvatar: (tech.name ?? tech.email ?? "?").charAt(0).toUpperCase(),
                });
              }
            }

            return (
              <div key={dateStr} className="space-y-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                  isToday(day) ? "bg-primary/10" : "bg-muted/30"
                }`}>
                  <CalendarDays className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">
                      {DAY_LABELS[weekDays.indexOf(day)]} – {format(day, "d MMM")}
                    </p>
                  </div>
                  {conflictDays.has(dateStr) && (
                    <div title="Multiple bookings">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                    </div>
                  )}
                </div>

                {dayBookings.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    No bookings
                  </div>
                ) : (
                  <div className="space-y-2 pl-3">
                    {dayBookings.map((booking: any) => {
                      const techIdx = (technicians as any[]).findIndex(t => t.id === booking.technicianId);
                      const colourClass = SLOT_COLOURS[techIdx % SLOT_COLOURS.length];
                      return (
                        <button
                          key={booking.id}
                          onClick={() => handleBookingClick(booking)}
                          className={`w-full text-left rounded-lg border-2 p-3 transition-all cursor-pointer hover:shadow-md active:scale-95 ${
                            colourClass
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center shrink-0 text-xs font-bold">
                              {booking.technicianAvatar}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">{booking.technicianName}</p>
                              <div className="flex items-center gap-1 mt-1 text-xs">
                                <Clock className="w-3 h-3" />
                                <span>{booking.startTime} – {booking.endTime}</span>
                              </div>
                              {booking.jobCardId && (
                                <p className="text-xs mt-1 opacity-75 truncate">Job #{booking.jobCardId}</p>
                              )}
                              <p className="text-xs mt-2 text-primary font-medium">Tap for details →</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // ── Desktop Table View ──
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full min-w-[700px] border-collapse">
            {/* Column headers: Technician | Mon | Tue | … | Sun */}
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-40 sticky left-0 bg-muted/40 z-10">
                  Technician
                </th>
                {weekDays.map((day, i) => {
                  const dateStr = formatDate(day);
                  const hasConflict = conflictDays.has(dateStr);
                  return (
                    <th
                      key={dateStr}
                      className={`text-center px-2 py-3 text-xs font-semibold uppercase tracking-wide min-w-[110px] ${
                        isToday(day)
                          ? "text-primary bg-primary/5"
                          : "text-muted-foreground"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-0.5">
                        <span>{DAY_LABELS[i]}</span>
                        <span
                          className={`text-base font-bold ${
                            isToday(day)
                              ? "w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto"
                              : "text-foreground"
                          }`}
                        >
                          {format(day, "d")}
                        </span>
                        {hasConflict && (
                          <span title="Multiple bookings on this day">
                            <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5" />
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {(technicians as any[]).map((tech: any, techIdx: number) => {
                const colourClass = SLOT_COLOURS[techIdx % SLOT_COLOURS.length];
                return (
                  <tr
                    key={tech.id}
                    className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                  >
                    {/* Technician name cell */}
                    <td className="px-4 py-3 sticky left-0 bg-card z-10 border-r border-border">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">
                            {(tech.name ?? tech.email ?? "?").charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate max-w-[7rem]">
                            {tech.name ?? tech.email}
                          </p>
                          {tech.name && (
                            <p className="text-xs text-muted-foreground truncate max-w-[7rem]">
                              {tech.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Day cells */}
                    {weekDays.map((day) => {
                      const dateStr = formatDate(day);
                      const slots = bookingMap.get(tech.id)?.get(dateStr) ?? [];
                      return (
                        <td
                          key={dateStr}
                          className={`px-2 py-2 align-top min-w-[110px] ${
                            isToday(day) ? "bg-primary/5" : ""
                          }`}
                        >
                          {slots.length === 0 ? (
                            <span className="text-muted-foreground/40 text-xs block text-center pt-1">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {slots.map((slot: any) => (
                                <button
                                  key={slot.id}
                                  onClick={() =>
                                    slot.jobCardId
                                      ? navigate(`/jobs/${slot.jobCardId}`)
                                      : undefined
                                  }
                                  className={`w-full text-left rounded-md border px-2 py-1.5 text-xs font-medium transition-all hover:opacity-80 hover:shadow-sm ${colourClass} ${
                                    slot.jobCardId ? "cursor-pointer" : "cursor-default"
                                  }`}
                                  title={
                                    slot.jobCardId
                                      ? `Job Card #${slot.jobCardId} — click to open`
                                      : `${slot.startTime}–${slot.endTime}`
                                  }
                                >
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-semibold">
                                      {slot.startTime}–{slot.endTime}
                                    </span>
                                    {slot.jobCardId && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] px-1 py-0 h-4 border-current opacity-70"
                                      >
                                        JC #{slot.jobCardId}
                                      </Badge>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend ── */}
      {(technicians as any[]).length > 0 && !isLoading && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-1">
          <span className="font-medium">Legend:</span>
          {(technicians as any[]).map((tech: any, i: number) => (
            <div key={tech.id} className="flex items-center gap-1.5">
              <span
                className={`inline-block w-3 h-3 rounded-sm border ${SLOT_COLOURS[i % SLOT_COLOURS.length]}`}
              />
              <span>{tech.name ?? tech.email}</span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 ml-2">
            <AlertTriangle className="w-3 h-3 text-amber-500" />
            <span>Multiple bookings on same day</span>
          </div>
        </div>
      )}

      {/* ── Booking Detail Modal (Mobile Tap-to-Expand) ── */}
      {selectedBooking && selectedTechnician && (
        <ScheduleBookingDetail
          booking={selectedBooking}
          technician={selectedTechnician}
          isOpen={expandedBookingId !== null}
          onClose={handleCloseDetail}
          colourClass={SLOT_COLOURS[(technicians as any[]).findIndex(t => t.id === selectedBooking.technicianId) % SLOT_COLOURS.length]}
        />
      )}
    </div>
  );
}
