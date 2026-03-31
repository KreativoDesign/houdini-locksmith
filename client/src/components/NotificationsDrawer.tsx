/**
 * NotificationsDrawer — slide-out panel from the bell icon.
 *
 * Shows all notifications for the current user with:
 *  - Unread count badge on the bell icon
 *  - Mark individual / all as read
 *  - Clickable entity links (job cards, enquiries)
 *  - Auto-refresh every 30 seconds
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Bell,
  BellRing,
  CheckCheck,
  AlertTriangle,
  Briefcase,
  ClipboardList,
  DollarSign,
  PenLine,
  Info,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";

// ─── Notification type icon mapping ──────────────────────────────────────────
const TYPE_ICONS: Record<string, React.ElementType> = {
  new_enquiry: ClipboardList,
  enquiry_assigned: ClipboardList,
  job_created: Briefcase,
  job_assigned: Briefcase,
  job_urgent: AlertTriangle,
  job_started: Briefcase,
  job_completed: Briefcase,
  job_awaiting_pricing: DollarSign,
  pricing_approved: DollarSign,
  signature_captured: PenLine,
  general: Info,
};

const TYPE_COLOURS: Record<string, string> = {
  job_urgent: "text-red-600 bg-red-100",
  new_enquiry: "text-blue-600 bg-blue-100",
  enquiry_assigned: "text-blue-600 bg-blue-100",
  job_created: "text-slate-600 bg-slate-100",
  job_assigned: "text-slate-600 bg-slate-100",
  job_started: "text-amber-600 bg-amber-100",
  job_completed: "text-green-600 bg-green-100",
  job_awaiting_pricing: "text-purple-600 bg-purple-100",
  pricing_approved: "text-emerald-600 bg-emerald-100",
  signature_captured: "text-teal-600 bg-teal-100",
  general: "text-slate-600 bg-slate-100",
};

function getEntityLink(entityType: string | null, entityId: number | null): string | null {
  if (!entityType || !entityId) return null;
  if (entityType === "job_card") return `/jobs/${entityId}`;
  if (entityType === "enquiry") return `/enquiries/${entityId}`;
  if (entityType === "pricing") return `/pricing?id=${entityId}`;
  return null;
}

// ─── Single notification row ──────────────────────────────────────────────────
function NotificationRow({ notif, onMarkRead }: { notif: any; onMarkRead: (id: number) => void }) {
  const [, navigate] = useLocation();
  const Icon = TYPE_ICONS[notif.type] ?? Info;
  const colourClass = TYPE_COLOURS[notif.type] ?? TYPE_COLOURS.general;
  const link = getEntityLink(notif.entityType, notif.entityId);

  const handleClick = () => {
    if (!notif.isRead) onMarkRead(notif.id);
    if (link) navigate(link);
  };

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg transition-colors cursor-pointer hover:bg-accent/50 ${
        !notif.isRead ? "bg-primary/5 border border-primary/10" : ""
      }`}
      onClick={handleClick}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colourClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium leading-snug ${!notif.isRead ? "text-foreground" : "text-muted-foreground"}`}>
            {notif.title}
          </p>
          {!notif.isRead && (
            <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {notif.createdAt
            ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })
            : ""}
        </p>
      </div>
    </div>
  );
}

// ─── Drawer content ───────────────────────────────────────────────────────────
function DrawerContent({ onClose }: { onClose: () => void }) {
  const utils = trpc.useUtils();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data: notifications = [], isLoading, refetch } = trpc.notifications.list.useQuery(
    { unreadOnly: showUnreadOnly },
    { refetchInterval: 30_000 }
  );

  const markReadMutation = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const markAllReadMutation = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const notifs = notifications as any[];
  const unreadCount = notifs.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Notifications</h2>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs bg-primary text-primary-foreground">
              {unreadCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className={`text-xs px-2 py-1 rounded-md transition-colors ${
              showUnreadOnly ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent"
            }`}
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          >
            Unread only
          </button>
          {unreadCount > 0 && (
            <button
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded-md hover:bg-accent transition-colors"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {isLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">All caught up</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showUnreadOnly ? "No unread notifications" : "No notifications yet"}
              </p>
            </div>
          </div>
        ) : (
          notifs.map((notif) => (
            <NotificationRow
              key={notif.id}
              notif={notif}
              onMarkRead={(id) => markReadMutation.mutate({ id })}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Bell button with badge ───────────────────────────────────────────────────
export function NotificationsBell({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);

  const { data: notifications = [] } = trpc.notifications.list.useQuery(
    { unreadOnly: true },
    { refetchInterval: 30_000 }
  );

  const unreadCount = (notifications as any[]).length;

  return (
    <>
      <button
        className={`relative h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent transition-colors ${className}`}
        onClick={() => setOpen(true)}
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-4 h-4 text-foreground" />
        ) : (
          <Bell className="w-4 h-4 text-muted-foreground" />
        )}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[380px] sm:w-[420px] p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Notifications</SheetTitle>
          </SheetHeader>
          <DrawerContent onClose={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default NotificationsBell;
