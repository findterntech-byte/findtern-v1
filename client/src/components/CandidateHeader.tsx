import { useEffect, useMemo, useState } from "react";

import { useLocation } from "wouter";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";

import { apiRequest } from "@/lib/queryClient";

import { useToast } from "@/hooks/use-toast";

import { Checkbox } from "@/components/ui/checkbox";

import { Label } from "@/components/ui/label";



import {

  Dialog,

  DialogContent,

  DialogDescription,

  DialogFooter,

  DialogHeader,

  DialogTitle,

} from "@/components/ui/dialog";

import {

  Tooltip,

  TooltipContent,

  TooltipProvider,

  TooltipTrigger,

} from "@/components/ui/tooltip";



import {

  DropdownMenu,

  DropdownMenuContent,

  DropdownMenuItem,

  DropdownMenuLabel,

  DropdownMenuSeparator,

  DropdownMenuTrigger,

} from "@/components/ui/dropdown-menu";

import { Switch } from "@/components/ui/switch";

import { Bell, Briefcase, Calendar as CalendarIcon, Circle, CircleOff, ClipboardList, FileText, Flag, HelpCircle, Home, Landmark, Lock, LogOut, MessageSquare, Pencil, Settings, UserMinus, Wallet } from "lucide-react";

import findternLogo from "@assets/logo.png";



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



interface CandidateHeaderProps {

  showAiInterviewButton?: boolean;

  showViewDocuments?: boolean;

  userInitials?: string;

  openToWork?: boolean;

  onOpenToWorkChange?: (value: boolean) => void;

}



export function CandidateHeader({

  showAiInterviewButton = true,

  showViewDocuments = false,

  userInitials,

  openToWork,

  onOpenToWorkChange,

}: CandidateHeaderProps) {

  const [location, setLocation] = useLocation();

  const queryClient = useQueryClient();

  const { toast } = useToast();



  const storedUserId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;



  const [aiPendingRead, setAiPendingRead] = useState(() => {

    if (typeof window === "undefined") return false;

    if (!storedUserId) return false;

    return window.localStorage.getItem(`aiInterviewPendingRead:${storedUserId}`) === "true";

  });



  useEffect(() => {

    if (typeof window === "undefined") return;

    if (!storedUserId) {

      setAiPendingRead(false);

      return;

    }

    setAiPendingRead(window.localStorage.getItem(`aiInterviewPendingRead:${storedUserId}`) === "true");

  }, [storedUserId]);



  const [aiGateOpen, setAiGateOpen] = useState(false);

  const [aiGateAgreed, setAiGateAgreed] = useState(false);

  const [aiGateSecondsLeft, setAiGateSecondsLeft] = useState(10);

  const [aiGateLink, setAiGateLink] = useState<string>("");



  useEffect(() => {

    if (!aiGateOpen) return;

    setAiGateAgreed(false);

    setAiGateSecondsLeft(10);



    const interval = window.setInterval(() => {

      setAiGateSecondsLeft((prev) => {

        if (prev <= 1) {

          window.clearInterval(interval);

          return 0;

        }

        return prev - 1;

      });

    }, 1000);



    return () => window.clearInterval(interval);

  }, [aiGateOpen]);



  const requestAiInterviewStart = (link: string) => {

    const normalized = String(link ?? "").trim();

    if (!normalized) return;

    setAiGateLink(normalized);

    setAiGateOpen(true);

  };



  const [internalOpenToWork, setInternalOpenToWork] = useState(() => {

    if (typeof window === "undefined") return true;

    const raw = window.localStorage.getItem("openToWork");

    if (raw === "false") return false;

    if (raw === "true") return true;

    return true;

  });



  const effectiveOpenToWork = openToWork ?? internalOpenToWork;

  const setEffectiveOpenToWork = async (value: boolean) => {

    if (onOpenToWorkChange) onOpenToWorkChange(value);

    else setInternalOpenToWork(value);



    if (typeof window !== "undefined") {

      window.localStorage.setItem("openToWork", value ? "true" : "false");

    }



    try {

      const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

      if (!userId) return;

      await apiRequest(

        "PUT",

        `/api/onboarding/${encodeURIComponent(userId)}/open-to-work`,

        { openToWork: value },

      );

    } catch (e) {

      console.error("Open to work update error:", e);

    }

  };



  const handleLogout = () => {

    if (typeof window !== "undefined") {

      window.localStorage.removeItem("userId");

      window.localStorage.removeItem("userEmail");

      window.localStorage.removeItem("openToWork");

      window.localStorage.removeItem("onboardingDraft");

      window.localStorage.removeItem("onboardingActiveStep");

      window.localStorage.removeItem("signupFirstName");

      window.localStorage.removeItem("signupLastName");

      window.localStorage.removeItem("signupCountryCode");

      window.localStorage.removeItem("signupPhoneNumber");



      try {

        if (typeof indexedDB !== "undefined") {

          indexedDB.deleteDatabase("findternOnboarding");

        }

      } catch {

        // ignore

      }

    }

    setLocation("/login");

  };



  const notificationsQueryKey: [string, string | null] = ["/api/intern/notifications", storedUserId];



  const { data: notificationsData } = useQuery<{ notifications: NotificationItem[] }>({

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



  const paymentStatusQueryKey: [string, string | null] = ["/api/intern/payment-status", storedUserId];

  const { data: paymentData } = useQuery<{ isPaid: boolean }>({

    queryKey: paymentStatusQueryKey,

    enabled: !!storedUserId,

    queryFn: async () => {

      if (!storedUserId) return { isPaid: false };

      const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/payment-status`, {

        credentials: "include",

      });

      if (!res.ok) return { isPaid: false };

      return res.json();

    },

  });



  const isPaid = Boolean(paymentData?.isPaid);



  const aiInterviewQueryKey: [string, string | null] = ["/api/intern/interviews", storedUserId];

  const { data: interviewsData } = useQuery<{ interviews: any[] }>({

    queryKey: aiInterviewQueryKey,

    enabled: !!storedUserId,

    queryFn: async () => {

      if (!storedUserId) return { interviews: [] };

      const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/interviews`, {

        credentials: "include",

      });

      if (!res.ok) return { interviews: [] };

      return res.json();

    },

  });



  const onboardingQueryKey: [string, string | null] = ["/api/onboarding", storedUserId];

  const { data: onboardingData } = useQuery<any>({

    queryKey: onboardingQueryKey,

    enabled: !!storedUserId,

    queryFn: async () => {

      if (!storedUserId) return null;

      try {

        const res = await fetch(`/api/onboarding/${encodeURIComponent(storedUserId)}`, {

          credentials: "include",

        });

        if (!res.ok) return null;

        return res.json();

      } catch {

        return null;

      }

    },

  });



  const serverInitials = useMemo(() => {

    const user = onboardingData?.user ?? null;

    const firstName = String(user?.firstName ?? "").trim();

    const lastName = String(user?.lastName ?? "").trim();

    const full = `${firstName} ${lastName}`.trim();

    if (!full) return "";

    return full

      .split(" ")

      .filter(Boolean)

      .map((n) => (n[0] ?? "").toUpperCase())

      .join("");

  }, [onboardingData?.user]);



  const storedUserEmail = typeof window !== "undefined" ? window.localStorage.getItem("userEmail") : "";

  const fallbackInitials = useMemo(() => {

    const email = String(storedUserEmail ?? "");

    const ch = (email.trim().charAt(0) || "U").toUpperCase();

    return ch;

  }, [storedUserEmail]);



  const initials = (serverInitials && serverInitials.trim())

    ? serverInitials

    : (userInitials && userInitials.trim())

      ? userInitials

      : fallbackInitials;



  const serverOpenToWork = useMemo(() => {

    const raw = onboardingData?.onboarding?.extraData?.openToWork;

    return typeof raw === "boolean" ? raw : null;

  }, [onboardingData?.onboarding?.extraData?.openToWork]);



  useEffect(() => {

    if (openToWork !== undefined) return;

    if (typeof serverOpenToWork !== "boolean") return;

    setInternalOpenToWork(serverOpenToWork);

    try {

      if (typeof window !== "undefined") {

        window.localStorage.setItem("openToWork", serverOpenToWork ? "true" : "false");

      }

    } catch {

      // ignore

    }

  }, [openToWork, serverOpenToWork]);



  const profileCompletion = useMemo(() => {

    const user = onboardingData?.user ?? null;

    const onboarding = onboardingData?.onboarding ?? null;

    const documents = onboardingData?.intern_document ?? null;



    const locationTypes = Array.isArray(onboarding?.locationTypes) ? onboarding.locationTypes : [];

    const requiresPreferredLocations = locationTypes.includes("hybrid") || locationTypes.includes("onsite");



    const checks: boolean[] = [];

    checks.push(Boolean((user?.firstName ?? "").trim()));

    checks.push(Boolean((user?.lastName ?? "").trim()));

    checks.push(Boolean((user?.email ?? "").trim()));

    checks.push(Boolean((user?.phoneNumber ?? "").trim()));

    checks.push(Boolean(locationTypes.length > 0));

    if (requiresPreferredLocations) {

      checks.push(Boolean((onboarding?.city ?? "").trim()));

      checks.push(Boolean((onboarding?.state ?? "").trim()));

    }

    checks.push(Boolean((onboarding?.linkedinUrl ?? "").trim()));

    checks.push(Boolean((onboarding?.skills ?? []).length > 0));

    checks.push(Boolean((onboarding?.experienceJson ?? []).length > 0));

    checks.push(Boolean((onboarding?.extraData?.academics?.degree ?? "").trim()));

    checks.push(Boolean((documents?.profilePhotoName ?? "").trim()));

    if (requiresPreferredLocations) {

      checks.push(Boolean((onboarding?.preferredLocations ?? []).length > 0));

      checks.push(typeof onboarding?.hasLaptop === "boolean");

    }



    const total = checks.length;

    const done = checks.reduce((acc, v) => acc + (v ? 1 : 0), 0);

    if (!total) return 0;

    return Math.round((done / total) * 100);

  }, [onboardingData?.intern_document, onboardingData?.onboarding, onboardingData?.user]);



  const isProfileComplete = profileCompletion >= 100;



  const hasAdminRatings = useMemo(() => {

    const ratings = onboardingData?.onboarding?.extraData?.ratings;

    if (!ratings || typeof ratings !== "object") return false;

    return Object.values(ratings).some((v: any) => typeof v === "number" && Number.isFinite(v));

  }, [onboardingData?.onboarding?.extraData?.ratings]);



  const aiInterview = useMemo(() => {

    const list = Array.isArray(interviewsData?.interviews) ? interviewsData?.interviews : [];

    const aiList = list

      .filter((i) => String(i?.employerId ?? "").toLowerCase() === "admin")

      .sort((a, b) => {

        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;

        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;

        return tb - ta;

      });

    return aiList[0] ?? null;

  }, [interviewsData?.interviews]);



  const aiMeetingLink = useMemo(() => {

    const link = String(aiInterview?.meet_link ?? aiInterview?.meetingLink ?? "").trim();

    if (!link) return null;

    if (!/^https?:\/\//i.test(link)) return null;

    return link;

  }, [aiInterview]);



  const isAiAppliedWaiting = !hasAdminRatings && Boolean(aiInterview) && !aiMeetingLink;



  useEffect(() => {

    if (typeof window === "undefined") return;

    if (!storedUserId) return;

    if (!isAiAppliedWaiting) return;



    const createdKey = `aiInterviewPendingCreatedAt:${storedUserId}`;

    if (!window.localStorage.getItem(createdKey)) {

      window.localStorage.setItem(createdKey, new Date().toISOString());

    }

  }, [isAiAppliedWaiting, storedUserId]);



  const applyAiMutation = useMutation({

    mutationFn: async () => {

      if (!storedUserId) throw new Error("User not logged in");



      const paymentRes = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/payment-status`, {

        credentials: "include",

      });

      if (paymentRes.ok) {

        const paymentJson = await paymentRes.json().catch(() => null);

        const paid = Boolean(paymentJson?.isPaid);

        if (!paid) {

          throw new Error("Payment required before applying for AI interview");

        }

      }



      const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/ai-interview/apply`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        credentials: "include",

      });



      const json = await res.json().catch(() => null);

      if (!res.ok) {

        const message = json?.message || "Failed to apply";

        throw new Error(message);

      }

      return json;

    },

    onSuccess: async () => {

      toast({

        title: "Applied for AI Interview",

        description: "You will receive the interview link within 48 working hours.",

      });

      await queryClient.invalidateQueries({ queryKey: aiInterviewQueryKey });

    },

    onError: (e: any) => {

      toast({

        title: "Could not apply",

        description: e?.message || "Something went wrong while applying for AI interview.",

        variant: "destructive",

      });

    },

  });



  const baseNotifications = (notificationsData?.notifications ?? []) as NotificationItem[];

  const aiPendingNotification = useMemo(() => {

    if (!storedUserId) return null;

    if (!isAiAppliedWaiting) return null;



    const createdAt = (() => {

      if (typeof window === "undefined") return new Date().toISOString();

      const raw = window.localStorage.getItem(`aiInterviewPendingCreatedAt:${storedUserId}`);

      return raw || new Date().toISOString();

    })();



    return {

      id: `virtual:ai_interview_pending:${storedUserId}`,

      recipientType: "intern",

      recipientId: storedUserId,

      type: "ai_interview_pending",

      title: "AI Interview",

      message: "You will receive an AI interview link within 48 working hours.",

      isRead: aiPendingRead,

      createdAt,

    } satisfies NotificationItem;

  }, [aiPendingRead, isAiAppliedWaiting, storedUserId]);



  const notifications = useMemo(() => {

    if (!aiPendingNotification) return baseNotifications;

    return [aiPendingNotification, ...baseNotifications];

  }, [aiPendingNotification, baseNotifications]);



  const unreadCount = useMemo(

    () => notifications.reduce((acc, n) => acc + (n.isRead ? 0 : 1), 0),

    [notifications],

  );

  const topNotifications = useMemo(() => notifications.slice(0, 4), [notifications]);

  const hasMoreNotifications = notifications.length > 4;



  const getNotificationHref = (n: NotificationItem) => {

    if (n.type === "proposal_received" && n.data?.proposalId) {

      return `/proposals/${encodeURIComponent(String(n.data.proposalId))}`;

    }

    if (n.type === "ai_interview_pending") {

      return "/interviews";

    }

    if (n.type === "interview_pending" || n.type === "meeting_scheduled") {

      return "/interviews";

    }

    return "/notifications";

  };



  const handleNotificationClick = async (n: NotificationItem) => {

    const href = getNotificationHref(n);



    try {

      if (!n.isRead && n.id.startsWith("virtual:ai_interview_pending:")) {

        if (typeof window !== "undefined" && storedUserId) {

          window.localStorage.setItem(`aiInterviewPendingRead:${storedUserId}`, "true");

        }

        setAiPendingRead(true);

      } else if (!n.isRead) {

        await apiRequest("POST", `/api/notifications/${encodeURIComponent(n.id)}/read`, {});

        await queryClient.invalidateQueries({ queryKey: notificationsQueryKey });

      }

    } catch (e) {

      console.error("Mark notification read error:", e);

    }

    setLocation(href);

  };



  const isActivePath = (href: string) => {

    const curr = String(location ?? "");

    if (!curr) return false;

    if (href === "/dashboard") return curr === "/dashboard";

    return curr === href || curr.startsWith(`${href}/`);

  };



  return (

    <>

      <Dialog

        open={aiGateOpen}

        onOpenChange={(next) => {

          setAiGateOpen(next);

          if (!next) {

            setAiGateLink("");

            setAiGateAgreed(false);

            setAiGateSecondsLeft(10);

          }

        }}

      >

        <DialogContent>

          <DialogHeader>

            <DialogTitle>AI Interview: Terms & Instructions</DialogTitle>

            <DialogDescription>

              Please read and agree before starting. You can proceed in {aiGateSecondsLeft}s.

            </DialogDescription>

          </DialogHeader>



          <div className="space-y-3">

            <div className="rounded-md border bg-muted/30 p-3 text-xs text-slate-700">

              <div className="space-y-2">

                <div className="font-semibold text-slate-900">Instructions</div>

                <ol className="list-decimal pl-4 space-y-1">

                  <li>Ensure stable internet and a quiet environment.</li>

                  <li>Allow microphone/camera permissions if prompted.</li>

                  <li>Do not refresh/close the interview window once started.</li>

                  <li>Your performance will be evaluated and shared as part of your profile.</li>

                </ol>

              </div>

            </div>



            <div className="flex items-start gap-2">

              <Checkbox

                id="ai-interview-agree"

                checked={aiGateAgreed}

                onCheckedChange={(v) => setAiGateAgreed(Boolean(v))}

              />

              <Label htmlFor="ai-interview-agree" className="text-xs leading-snug">

                I have read the instructions and I agree to proceed.

              </Label>

            </div>

          </div>



          <DialogFooter>

            <Button variant="outline" onClick={() => setAiGateOpen(false)}>

              Cancel

            </Button>

            <Button

              disabled={!aiGateAgreed || aiGateSecondsLeft > 0 || !aiGateLink}

              onClick={() => {

                const link = String(aiGateLink ?? "").trim();

                if (!link) return;

                window.open(link, "_blank", "noopener,noreferrer");

                setAiGateOpen(false);

              }}

            >

              Proceed to interview

            </Button>

          </DialogFooter>

        </DialogContent>

      </Dialog>



      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">

        <div className="container flex h-16 items-center justify-between px-3 sm:px-4 md:px-6">

          <button

            type="button"

            className="flex items-center gap-2"

            onClick={() => setLocation("/dashboard")}

            aria-label="Go to Dashboard"

          >

            <img src={findternLogo} alt="Findtern" className="inner_logo__img w-auto -ml-2 sm:ml-0" />

          </button>



          <div className="flex items-center gap-1.5 sm:gap-3">

            {showAiInterviewButton && (

              <TooltipProvider>

                <Tooltip>

                  <TooltipTrigger asChild>

                    <span

                      className="hidden sm:inline-flex"

                      onClick={() => {

                        if (!isAiAppliedWaiting) return;

                        toast({

                          title: "Applied for AI Interview",

                          description: "You will receive the interview link within 48 working hours.",

                        });

                      }}

                    >

                      <Button

                        variant="outline"

                        onClick={() => {

                          if (hasAdminRatings) {

                            setLocation("/interviews");

                            return;

                          }



                          if (!aiInterview) {

                            applyAiMutation.mutate();

                            return;

                          }



                          if (!aiMeetingLink) return;

                          requestAiInterviewStart(aiMeetingLink);

                        }}

                        className="h-9 w-9 px-2 sm:w-auto sm:px-4 text-xs shrink-0 text-black"

                        disabled={applyAiMutation.isPending || isAiAppliedWaiting}

                      >

                        <CalendarIcon className="h-4 w-4 sm:mr-2" />

                        <span className="hidden sm:inline">

                          {hasAdminRatings

                            ? "My Interview"

                            : isAiAppliedWaiting

                              ? "Applied for AI Interview"

                              : aiInterview

                                ? "AI Interview"

                                : applyAiMutation.isPending

                                  ? "Applying..."

                                  : "Apply for AI Interview"}

                        </span>

                      </Button>

                    </span>

                  </TooltipTrigger>

                  {isAiAppliedWaiting && (

                    <TooltipContent>

                      You will receive the interview link within 48 working hours.

                    </TooltipContent>

                  )}

                </Tooltip>

              </TooltipProvider>

            )}

            <DropdownMenu>

              <DropdownMenuTrigger asChild>

                <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" aria-label="Support">

                  <HelpCircle className="h-5 w-5" />

                </Button>

              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-48">

                <DropdownMenuItem

                  className="flex items-center gap-2 cursor-pointer"

                  onSelect={() => setLocation("/dashboard?support=feedback")}

                >

                  <MessageSquare className="h-4 w-4 text-emerald-600" />

                  <span>Feedback</span>

                </DropdownMenuItem>

                <DropdownMenuItem

                  className="flex items-center gap-2 cursor-pointer"

                  onSelect={() => setLocation("/dashboard?support=report")}

                >

                  <Flag className="h-4 w-4 text-rose-600" />

                  <span>Report</span>

                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem

                  className="flex items-center gap-2 cursor-pointer"

                  onSelect={() => {

                    try {

                      window.open("/faq", "_blank", "noopener,noreferrer");

                    } catch {

                      setLocation("/faq");

                    }

                  }}

                >

                  <HelpCircle className="h-4 w-4 text-emerald-600" />

                  <span>Help</span>

                </DropdownMenuItem>

              </DropdownMenuContent>

            </DropdownMenu>

            <Button

              className="hidden sm:inline-flex h-9 px-2 sm:px-3 text-xs bg-[#0E6049] hover:bg-[#0b4b3a] shrink-0"

              onClick={() => setLocation("/proposals")}

            >

              <FileText className="h-4 w-4" />

              <span className="hidden sm:inline">My Proposal</span>

              <span className="hidden min-[420px]:inline sm:hidden">Proposal</span>

              <span className="sr-only min-[420px]:hidden sm:hidden">My Proposal</span>

            </Button>



            <DropdownMenu>

              <DropdownMenuTrigger asChild>

                <Button variant="ghost" size="icon" className="h-9 w-9 relative" aria-label="Notifications">

                  <Bell className={`h-4 w-4 ${unreadCount > 0 ? "animate-pulse" : ""}`} />

                  {unreadCount > 0 && (

                    <>

                      <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-600/60 animate-ping" />

                      <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">

                        {unreadCount > 99 ? "99+" : unreadCount}

                      </span>

                    </>

                  )}

                </Button>

              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-80">

                <DropdownMenuLabel>Notifications</DropdownMenuLabel>

                <DropdownMenuSeparator />



                {topNotifications.length === 0 && (

                  <div className="px-2 py-3 text-xs text-muted-foreground">No notifications</div>

                )}



                {topNotifications.map((n) => {

                  const created = n.createdAt ? new Date(n.createdAt).toLocaleString() : "";

                  return (

                    <DropdownMenuItem

                      key={n.id}

                      className="cursor-pointer items-start gap-2"

                      onSelect={() => void handleNotificationClick(n)}

                    >

                      <div className="min-w-0 flex-1">

                        <div className="flex items-center gap-2">

                          <span

                            className={`text-xs font-semibold truncate ${n.isRead ? "text-slate-700" : "text-slate-900"}`}

                          >

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

                    <DropdownMenuItem className="cursor-pointer" onSelect={() => setLocation("/notifications")}>

                      View all notifications

                    </DropdownMenuItem>

                  </>

                )}

              </DropdownMenuContent>

            </DropdownMenu>



            <DropdownMenu>

              <DropdownMenuTrigger asChild>

                <Button variant="ghost" className="h-9 w-9 rounded-full p-0">

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center text-white text-xs font-semibold">

                    {initials}

                  </div>

                </Button>

              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">

                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/onboarding?edit=1")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <Pencil className="h-4 w-4 text-white" />

                  </div>

                  <span>Edit Profile</span>

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/interviews")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <CalendarIcon className="h-4 w-4 text-white" />

                  </div>

                  <span>My Interviews</span>

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/timesheets")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <ClipboardList className="h-4 w-4 text-white" />

                  </div>

                  <span>Timesheet Manager</span>

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/earnings")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <Wallet className="h-4 w-4 text-white" />

                  </div>

                  <span>My Earnings</span>

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/settings?view=bank-details")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <Landmark className="h-4 w-4 text-white" />

                  </div>

                  <span>Bank Details</span>

                </DropdownMenuItem>



                {showViewDocuments && (

                  <DropdownMenuItem

                    className="flex items-center gap-3 cursor-pointer"

                    onClick={() => setLocation("/dashboard/documents")}

                  >

                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                      <FileText className="h-4 w-4 text-white" />

                    </div>

                    <span>View Documents</span>

                  </DropdownMenuItem>

                )}



                <DropdownMenuItem

                  className="flex items-center justify-between cursor-pointer"

                  onSelect={(e) => {

                    e.preventDefault();

                  }}

                >

                  <div className="flex items-center gap-3">

                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                      <Briefcase className="h-4 w-4 text-white" />

                    </div>

                    <div className="leading-tight">

                      <div>Open to Work</div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">

                        {effectiveOpenToWork ? (

                          <Circle className="h-3 w-3 text-emerald-600" />

                        ) : (

                          <CircleOff className="h-3 w-3 text-slate-500" />

                        )}

                        <span>{effectiveOpenToWork ? "Active" : "Offline"}</span>

                      </div>

                    </div>

                  </div>

                  <Switch checked={effectiveOpenToWork} onCheckedChange={setEffectiveOpenToWork} />

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/settings/change-password")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <Lock className="h-4 w-4 text-white" />

                  </div>

                  <span>Change Password</span>

                </DropdownMenuItem>



                <DropdownMenuSeparator />



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => handleLogout()}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">

                    <LogOut className="h-4 w-4 text-white" />

                  </div>

                  <span>Logout</span>

                </DropdownMenuItem>

              </DropdownMenuContent>

            </DropdownMenu>

          </div>

        </div>

      </header>



      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">

        <div className="mx-auto max-w-6xl px-3">

          <div className="grid grid-cols-5 py-2">

            <button

              type="button"

              onClick={() => setLocation("/dashboard")}

              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${

                isActivePath("/dashboard") ? "text-[#0E6049]" : "text-slate-700"

              }`}

              aria-label="Home"

            >

              <Home className="h-5 w-5" />

              <span>Home</span>

            </button>



            <button

              type="button"

              onClick={() => setLocation("/proposals")}

              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${

                isActivePath("/proposals") ? "text-[#0E6049]" : "text-slate-700"

              }`}

              aria-label="Proposals"

            >

              <FileText className="h-5 w-5" />

              <span>Proposal</span>

            </button>



            <button

              type="button"

              onClick={() => setLocation("/interviews")}

              className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${

                isActivePath("/interviews") ? "text-[#0E6049]" : "text-slate-700"

              }`}

              aria-label="Interviews"

            >

              <CalendarIcon className="h-5 w-5" />

              <span>Interview</span>

            </button>



            <button

              type="button"

              onClick={() => setLocation("/notifications")}

              className={`relative flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${

                isActivePath("/notifications") ? "text-[#0E6049]" : "text-slate-700"

              }`}

              aria-label="Notifications"

            >

              <Bell className="h-5 w-5" />

              {unreadCount > 0 && (

                <span className="absolute top-1 right-4 h-4 min-w-4 px-1 rounded-full bg-red-600 text-white text-[10px] leading-4 text-center">

                  {unreadCount > 99 ? "99+" : unreadCount}

                </span>

              )}

              <span>Alerts</span>

            </button>



            <DropdownMenu>

              <DropdownMenuTrigger asChild>

                <button

                  type="button"

                  className={`flex flex-col items-center justify-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${

                    isActivePath("/settings") ? "text-[#0E6049]" : "text-slate-700"

                  }`}

                  aria-label="Account"

                >

                  <Settings className="h-5 w-5" />

                  <span>Account</span>

                </button>

              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56">

                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/onboarding?edit=1")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <Pencil className="h-4 w-4 text-white" />

                  </div>

                  <span>Edit Profile</span>

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/interviews")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <CalendarIcon className="h-4 w-4 text-white" />

                  </div>

                  <span>My Interviews</span>

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/timesheets")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <ClipboardList className="h-4 w-4 text-white" />

                  </div>

                  <span>Timesheet Manager</span>

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/earnings")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <Wallet className="h-4 w-4 text-white" />

                  </div>

                  <span>My Earnings</span>

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/settings?view=bank-details")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <Landmark className="h-4 w-4 text-white" />

                  </div>

                  <span>Bank Details</span>

                </DropdownMenuItem>



                {showViewDocuments && (

                  <DropdownMenuItem

                    className="flex items-center gap-3 cursor-pointer"

                    onClick={() => setLocation("/dashboard/documents")}

                  >

                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                      <FileText className="h-4 w-4 text-white" />

                    </div>

                    <span>View Documents</span>

                  </DropdownMenuItem>

                )}



                <DropdownMenuItem

                  className="flex items-center justify-between cursor-pointer"

                  onSelect={(e) => {

                    e.preventDefault();

                  }}

                >

                  <div className="flex items-center gap-3">

                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                      <Briefcase className="h-4 w-4 text-white" />

                    </div>

                    <div className="leading-tight">

                      <div>Open to Work</div>

                      <div className="text-[11px] text-muted-foreground flex items-center gap-1">

                        {effectiveOpenToWork ? (

                          <Circle className="h-3 w-3 text-emerald-600" />

                        ) : (

                          <CircleOff className="h-3 w-3 text-slate-500" />

                        )}

                        <span>{effectiveOpenToWork ? "Active" : "Offline"}</span>

                      </div>

                    </div>

                  </div>

                  <Switch checked={effectiveOpenToWork} onCheckedChange={setEffectiveOpenToWork} />

                </DropdownMenuItem>



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => setLocation("/settings/change-password")}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] flex items-center justify-center">

                    <Lock className="h-4 w-4 text-white" />

                  </div>

                  <span>Change Password</span>

                </DropdownMenuItem>



                <DropdownMenuSeparator />



                <DropdownMenuItem

                  className="flex items-center gap-3 cursor-pointer"

                  onClick={() => handleLogout()}

                >

                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center">

                    <LogOut className="h-4 w-4 text-white" />

                  </div>

                  <span>Logout</span>

                </DropdownMenuItem>

              </DropdownMenuContent>

            </DropdownMenu>

          </div>

        </div>

      </nav>

    </>

  );

}