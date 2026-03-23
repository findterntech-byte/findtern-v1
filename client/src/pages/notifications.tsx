import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { CandidateHeader } from "@/components/CandidateHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type NotificationItem = {
  id: string;
  recipientType: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  readAt?: string | null;
  createdAt?: string | null;
};

export default function NotificationsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [openToWork, setOpenToWork] = useState(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem("openToWork");
    if (raw === "false") return false;
    if (raw === "true") return true;
    return true;
  });
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [markAllLoading, setMarkAllLoading] = useState(false);

  const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

  const notificationsQueryKey: [string, string | null] = ["/api/intern/notifications", storedUserId];

  const { data, isLoading, error } = useQuery<{ notifications: NotificationItem[] }>({
    queryKey: notificationsQueryKey,
    enabled: !!storedUserId,
    queryFn: async () => {
      if (!storedUserId) throw new Error("User not logged in");
      const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/notifications`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const message = errJson?.message || "Failed to fetch notifications";
        throw new Error(message);
      }
      return res.json();
    },
  });

  const baseNotifications = (data?.notifications ?? []) as NotificationItem[];

  const notifications = baseNotifications;

  const filtered = useMemo(() => {
    if (filter === "unread") return notifications.filter((n) => !n.isRead);
    return notifications;
  }, [filter, notifications]);

  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0),
    [notifications],
  );

  const formatRelative = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    if (!Number.isFinite(diffMs)) return "";

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 10) return "Just now";
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return `${diffD}d ago`;
    return date.toLocaleString();
  };

  const handleMarkRead = async (id: string) => {
    try {
      setMarkingId(id);
      await apiRequest("POST", `/api/notifications/${encodeURIComponent(id)}/read`, {});
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      toast({ title: "Marked as read" });
    } catch (e) {
      console.error("Mark notification read error:", e);
      toast({ variant: "destructive", title: "Could not mark as read" });
    } finally {
      setMarkingId((curr) => (curr === id ? null : curr));
    }
  };

  const handleMarkAllRead = async () => {
    if (!storedUserId) return;
    try {
      setMarkAllLoading(true);
      const res = await apiRequest(
        "POST",
        `/api/intern/${encodeURIComponent(storedUserId)}/notifications/read-all`,
        {},
      );
      const json = (await res.json().catch(() => null)) as { updatedCount?: number } | null;
      await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      const updatedCount = typeof json?.updatedCount === "number" ? json.updatedCount : undefined;

      toast({
        title: "All caught up",
        description:
          typeof updatedCount === "number"
            ? `Marked ${updatedCount} notification${updatedCount === 1 ? "" : "s"} as read.`
            : "Marked all notifications as read.",
      });
    } catch (e) {
      console.error("Mark all notifications read error:", e);
      toast({ variant: "destructive", title: "Could not mark all as read" });
    } finally {
      setMarkAllLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 pb-20 md:pb-0">
      <CandidateHeader openToWork={openToWork} onOpenToWorkChange={setOpenToWork} />

      <div className="container max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-4">
 

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-[#0E6049]">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {notifications.length === 0
                ? "You are all caught up."
                : unreadCount > 0
                  ? `${unreadCount} unread`
                  : "No unread notifications"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                className="h-9 text-xs"
                onClick={handleMarkAllRead}
                disabled={markAllLoading}
              >
                {markAllLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Marking...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <CheckCheck className="h-4 w-4" />
                    Mark all as read
                  </span>
                )}
              </Button>
            )}

            <Button variant="outline" className="h-9 text-xs" onClick={() => setLocation("/dashboard")}>
              Back
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={filter === "all" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter("all")}
          >
            All
            <span className="ml-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[11px] text-slate-700">
              {notifications.length}
            </span>
          </Button>
          <Button
            type="button"
            variant={filter === "unread" ? "secondary" : "ghost"}
            size="sm"
            className="rounded-full"
            onClick={() => setFilter("unread")}
          >
            Unread
            <span
              className={`ml-1 rounded-full px-2 py-0.5 text-[11px] ${
                unreadCount > 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200/70 text-slate-700"
              }`}
            >
              {unreadCount}
            </span>
          </Button>
        </div>

        {isLoading && (
          <Card className="p-6 rounded-2xl">
            <p className="text-sm text-muted-foreground">Loading notifications...</p>
          </Card>
        )}

        {!isLoading && error instanceof Error && (
          <Card className="p-6 rounded-2xl border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error.message}</p>
          </Card>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <Card className="p-8 rounded-2xl border border-slate-200 bg-white/80 text-center">
            <Bell className="h-7 w-7 mx-auto text-slate-400 mb-3" />
            <p className="text-sm font-semibold text-slate-800">
              {filter === "unread" ? "No unread notifications" : "No notifications"}
            </p>
            <p className="text-xs text-slate-500 mt-1">We’ll show updates here as soon as they happen.</p>
          </Card>
        )}

        {!isLoading && !error && filtered.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm overflow-hidden">
            {filtered.map((n, idx) => {
              const created = formatRelative(n.createdAt);
              const showDivider = idx !== filtered.length - 1;
              return (
                <div
                  key={n.id}
                  className={`relative px-4 py-4 ${showDivider ? "border-b border-slate-200/70" : ""}`}
                >
                  <div
                    className={`absolute left-0 top-0 h-full w-1 ${
                      n.isRead ? "bg-transparent" : "bg-emerald-500"
                    }`}
                  />

                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                        </div>
                        <div className="shrink-0 text-[11px] text-slate-400">{created}</div>
                      </div>

                      {!n.isRead && (
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-white border-emerald-200 text-emerald-700">
                            Unread
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-3"
                            onClick={() => handleMarkRead(n.id)}
                            disabled={markingId === n.id}
                          >
                            {markingId === n.id ? (
                              <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Marking...
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                Mark read
                              </span>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
