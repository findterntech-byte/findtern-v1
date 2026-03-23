import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Home,
  Building2,
  ShoppingCart,
  Bell,
  Menu,
  ChevronDown,
  Calendar,
  CalendarClock,
  FileText,
  Flag,
  HelpCircle,
  MessageSquare,
  Shield,
  Trash2,
  LogOut,
  User,
  Receipt,
} from "lucide-react";
import findternLogo from "@assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest } from "@/lib/queryClient";
import { clearEmployerAuth, getEmployerAuth } from "@/lib/employerAuth";

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

type EmployerHeaderActive =
  | "dashboard"
  | "proposals"
  | "schedule"
  | "cart"
  | "checkout"
  | "notifications"
  | "alerts"
  | "none";

interface EmployerHeaderProps {
  active: EmployerHeaderActive;
}

export function EmployerHeader({ active }: EmployerHeaderProps) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const auth = getEmployerAuth();
  const companyName = auth?.companyName ?? "";
  const companyInitial = (companyName || auth?.companyEmail || "N").charAt(0).toUpperCase();
  const employerId = auth?.id ?? null;

  const selectedProjectIdStorageKey = "employerSelectedProjectId";

  const notificationsQueryKey: [string, string | null] = ["/api/employer/notifications", employerId];
  const { data: notificationsData } = useQuery<{ notifications: NotificationItem[] }>({
    queryKey: notificationsQueryKey,
    enabled: !!employerId,
    queryFn: async () => {
      if (!employerId) throw new Error("Employer not logged in");
      const res = await fetch(`/api/employer/${encodeURIComponent(employerId)}/notifications`, {
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

  const notifications = (notificationsData?.notifications ?? []) as NotificationItem[];
  const unreadCount = useMemo(
    () => notifications.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0),
    [notifications],
  );

  const [cartCount, setCartCount] = useState(0);
  useEffect(() => {
    const load = () => {
      void (async () => {
        try {
          if (!employerId) {
            setCartCount(0);
            return;
          }
          const projectId = window.localStorage.getItem(selectedProjectIdStorageKey) ?? "";
          if (!String(projectId ?? "").trim()) {
            setCartCount(0);
            return;
          }
          const res = await apiRequest(
            "GET",
            `/api/employer/${encodeURIComponent(String(employerId))}/cart?projectId=${encodeURIComponent(String(projectId))}`,
          );
          const json = await res.json().catch(() => null);
          const ids = Array.isArray(json?.cartIds) ? json.cartIds : [];
          setCartCount(ids.length);
        } catch {
          setCartCount(0);
        }
      })();
    };

    load();
    const onUpdate = () => load();
    window.addEventListener("employerCartUpdated", onUpdate);
    window.addEventListener("employerProjectChanged", onUpdate);
    window.addEventListener("storage", onUpdate);
    window.addEventListener("focus", onUpdate);
    return () => {
      window.removeEventListener("employerCartUpdated", onUpdate);
      window.removeEventListener("employerProjectChanged", onUpdate);
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("focus", onUpdate);
    };
  }, [employerId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!document?.body) return;

    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => {
      try {
        document.body.style.paddingBottom = mq.matches
          ? ""
          : "calc(96px + env(safe-area-inset-bottom))";
      } catch {
        // ignore
      }
    };

    apply();
    mq.addEventListener?.("change", apply);
    window.addEventListener("focus", apply);

    return () => {
      try {
        mq.removeEventListener?.("change", apply);
        window.removeEventListener("focus", apply);
        document.body.style.paddingBottom = "";
      } catch {
        // ignore
      }
    };
  }, []);
  const topNotifications = useMemo(() => notifications.slice(0, 4), [notifications]);
  const hasMoreNotifications = notifications.length > 4;

  const getNotificationHref = (n: NotificationItem) => {
    if ((n.type === "proposal_status" || n.type === "proposal_received") && n.data?.proposalId) {
      return `/employer/proposals/${encodeURIComponent(String(n.data.proposalId))}`;
    }
    if (n.type === "meeting_scheduled" || n.type === "interview_pending") {
      return "/employer/schedule";
    }
    return "/employer/notifications";
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    const href = getNotificationHref(n);
    try {
      if (!n.isRead) {
        await apiRequest("POST", `/api/notifications/${encodeURIComponent(n.id)}/read`, {});
        await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
      }
    } catch (e) {
      console.error("Mark notification read error:", e);
    }
    setLocation(href);
  };

  const isActive = (key: EmployerHeaderActive) => {
    if (key === "notifications") return active === "notifications" || active === "alerts";
    if (key === "alerts") return active === "alerts" || active === "notifications";
    return active === key;
  };

  const primaryClasses =
    "h-11 rounded-none flex flex-col items-center justify-center gap-0.5 relative border-0 no-default-hover-elevate no-default-active-elevate focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none after:content-[''] after:absolute after:bottom-0 after:translate-y-1 after:left-1.5 after:right-1.5 after:h-[2px] after:rounded-full";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-white/90 backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between px-2 md:px-6">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => setLocation("/employer/dashboard")}
            aria-label="Go to Employer Dashboard"
          >
            <img src={findternLogo} alt="Findtern" className="inner_logo__img" />
            {/* <div className="hidden sm:block">
              <span className="text-lg font-bold text-emerald-700">FINDTERN</span>
              <span className="text-xs text-slate-400 ml-1.5">INTERNSHIP SIMPLIFIED</span>
            </div> */}
          </button>

          <div className="flex flex-1 items-center justify-end gap-2 md:gap-3 min-w-0">
          <div
            className="hidden md:block flex-1 min-w-0 overflow-x-auto overflow-y-hidden"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="flex items-center justify-start md:justify-end gap-1.5 md:gap-2 flex-nowrap pr-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${primaryClasses} w-12 min-[420px]:w-14 sm:w-16 ${
                  isActive("dashboard")
                    ? "after:bg-emerald-600 text-emerald-700"
                    : "after:bg-transparent text-slate-600 hover:after:bg-emerald-200 hover:text-emerald-700"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setLocation("/employer/dashboard")}
              >
                <Home className="w-4 h-4" />
                <span className="hidden min-[420px]:block text-[10px] font-medium leading-none">Dashboard</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Dashboard</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${primaryClasses} w-12 min-[420px]:w-14 sm:w-16 ${
                  isActive("proposals")
                    ? "after:bg-emerald-600 text-emerald-700"
                    : "after:bg-transparent text-slate-600 hover:after:bg-emerald-200 hover:text-emerald-700"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setLocation("/employer/proposals")}
              >
                <FileText className="w-4 h-4" />
                <span className="hidden min-[420px]:block text-[10px] font-medium leading-none">Proposals</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Hiring Proposals</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${primaryClasses} w-12 min-[420px]:w-14 sm:w-16 ${
                  isActive("schedule")
                    ? "after:bg-emerald-600 text-emerald-700"
                    : "after:bg-transparent text-slate-600 hover:after:bg-emerald-200 hover:text-emerald-700"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setLocation("/employer/schedule")}
              >
                <CalendarClock className="w-4 h-4" />
                <span className="hidden min-[420px]:block text-[10px] font-medium leading-none">Schedule</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Interview Schedule</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${primaryClasses} w-12 min-[420px]:w-14 sm:w-16 ${
                  isActive("cart")
                    ? "after:bg-emerald-600 text-emerald-700"
                    : "after:bg-transparent text-slate-600 hover:after:bg-emerald-200 hover:text-emerald-700"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setLocation("/employer/cart")}
              >
                <span className="relative">
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 && (
                    <span className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] leading-4 text-center">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
                <span className="hidden min-[420px]:block text-[10px] font-medium leading-none">Cart</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Cart</TooltipContent>
          </Tooltip>

          {/* <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${primaryClasses} w-12 min-[420px]:w-14 sm:w-16 ${
                  isActive("checkout")
                    ? "after:bg-emerald-600 text-emerald-700"
                    : "after:bg-transparent text-slate-600 hover:after:bg-emerald-200 hover:text-emerald-700"
                }`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setLocation("/employer/checkout")}
              >
                <Receipt className="w-4 h-4" />
                <span className="hidden min-[420px]:block text-[10px] font-medium leading-none">Checkout</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Checkout</TooltipContent>
          </Tooltip> */}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={`${primaryClasses} w-12 min-[420px]:w-14 sm:w-16 relative ${
                  isActive("notifications")
                    ? "after:bg-emerald-600 text-emerald-700"
                    : "after:bg-transparent text-slate-600 hover:after:bg-emerald-200 hover:text-emerald-700"
                }`}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="relative">
                      <Bell className={`w-4 h-4 ${unreadCount > 0 ? "animate-pulse" : ""}`} />
                      {unreadCount > 0 && (
                        <>
                          <span className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-red-600/60 animate-ping" />
                          <span className="absolute -top-2 -right-2 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        </>
                      )}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Notifications</TooltipContent>
                </Tooltip>
                <span className="hidden min-[420px]:block text-[10px] font-medium leading-none">Notifications</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {topNotifications.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">No notifications</div>
              )}

              {topNotifications.map((n: NotificationItem) => {
                const created = n.createdAt ? new Date(n.createdAt).toLocaleString() : "";
                return (
                  <DropdownMenuItem
                    key={n.id}
                    className="cursor-pointer items-start gap-2"
                    onSelect={() => void handleNotificationClick(n)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold truncate ${n.isRead ? "text-slate-700" : "text-slate-900"}`}>
                          {n.title}
                        </span>
                        {!n.isRead && <span className="h-2 w-2 rounded-full bg-emerald-600 shrink-0" />}
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-2">{n.message}</div>
                      {created && <div className="text-[10px] text-slate-400 mt-1">{created}</div>}
                    </div>
                  </DropdownMenuItem>
                );
              })}

              {hasMoreNotifications && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="cursor-pointer" onSelect={() => setLocation("/employer/notifications")}>
                    View all notifications
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg md:hidden shrink-0 relative"
            aria-label="Alerts"
            onClick={() => setLocation("/employer/notifications")}
          >
            <Bell className={`w-5 h-5 text-slate-600 ${unreadCount > 0 ? "animate-pulse" : ""}`} />
            {unreadCount > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Button>

          {/* Company account dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 px-2 py-0 rounded-lg gap-2 shrink-0">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-semibold">
                  {companyInitial}
                </div>
                <span className="hidden sm:inline max-w-[140px] truncate text-sm font-medium text-slate-700">
                  {companyName || "Company"}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2 text-xs font-medium text-slate-500">Company Account</div>
               <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setLocation("/employer/account")}
              >
                <User className="w-4 h-4 text-emerald-600" />
                <span>Account</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setLocation("/employer/profile")}
              >
                <Building2 className="w-4 h-4 text-emerald-600" />
                <span>Company Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setLocation("/employer/orders")}
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Orders</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => setLocation("/employer/account/change-password")}
              >
                <Shield className="w-4 h-4 text-emerald-600" />
                <span>Change Password</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
               onClick={() => window.open("/contact", "_blank", "noopener,noreferrer")}
              >
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>Help &amp; Support</span>
              </DropdownMenuItem>
            
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  clearEmployerAuth();
                  setLocation("/employer/login");
                }}
              >
                <LogOut className="w-4 h-4 text-emerald-600" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:hidden">
        <div className="mx-auto max-w-6xl px-3 py-2">
          <div className="grid grid-cols-4 gap-2 rounded-2xl bg-slate-50 p-2 shadow-sm border border-slate-100">
            <Button
              type="button"
              variant="ghost"
              className={`h-11 rounded-2xl flex flex-col items-center justify-center gap-1 border ${
                isActive("dashboard")
                  ? "bg-white border-emerald-200 text-emerald-700"
                  : "bg-transparent border-transparent text-slate-600"
              }`}
              onClick={() => setLocation("/employer/dashboard")}
            >
              <Home className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-none">Home</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className={`h-11 rounded-2xl flex flex-col items-center justify-center gap-1 border ${
                isActive("proposals")
                  ? "bg-white border-emerald-200 text-emerald-700"
                  : "bg-transparent border-transparent text-slate-600"
              }`}
              onClick={() => setLocation("/employer/proposals")}
            >
              <FileText className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-none">Proposal</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className={`h-11 rounded-2xl flex flex-col items-center justify-center gap-1 border ${
                isActive("schedule")
                  ? "bg-white border-emerald-200 text-emerald-700"
                  : "bg-transparent border-transparent text-slate-600"
              }`}
              onClick={() => setLocation("/employer/schedule")}
            >
              <CalendarClock className="h-5 w-5" />
              <span className="text-[11px] font-medium leading-none">Interview</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              className={`h-11 rounded-2xl flex flex-col items-center justify-center gap-1 border relative overflow-visible ${
                isActive("cart")
                  ? "bg-white border-emerald-200 text-emerald-700"
                  : "bg-transparent border-transparent text-slate-600"
              }`}
              onClick={() => setLocation("/employer/cart")}
            >
              <span className="relative overflow-visible">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full bg-emerald-600 text-white text-[10px] leading-4 text-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                ) : null}
              </span>
              <span className="text-[11px] font-medium leading-none">Cart</span>
            </Button>
          </div>
        </div>
      </nav>
    </>
  );
}
