import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Award, CalendarDays, Circle, CircleOff, FileText, Flag, FolderOpen, GraduationCap, HelpCircle, Laptop, Mail, MapPin, MessageSquare, Pencil, Phone, Sparkles, Star, X } from "lucide-react";
import { FaLinkedinIn } from "react-icons/fa";
import { CandidateHeader } from "@/components/CandidateHeader";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

type MediaKey = "profilePhoto";

const openOnboardingMediaDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB is not available"));
      return;
    }

    const req = indexedDB.open("findternOnboarding", 1);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("media")) {
        db.createObjectStore("media", { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

const loadMediaFromDb = async (key: MediaKey): Promise<File | null> => {
  try {
    if (typeof indexedDB === "undefined") return null;

    const db = await openOnboardingMediaDb();
    const record = await new Promise<any | null>((resolve, reject) => {
      const tx = db.transaction("media", "readonly");
      const store = tx.objectStore("media");
      const req = store.get(key);

      req.onsuccess = () => {
        resolve(req.result ?? null);
      };
      req.onerror = () => reject(req.error);
    });

    db.close();

    const blob = record?.blob;
    if (!(blob instanceof Blob)) return null;

    return new File([blob], record?.name || key, {
      type: record?.type || blob.type || "application/octet-stream",
      lastModified: record?.lastModified || Date.now(),
    });
  } catch {
    return null;
  }
};

export default function DashboardPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [profileChecklistOpen, setProfileChecklistOpen] = useState(false);
  const [profilePhotoPreviewOpen, setProfilePhotoPreviewOpen] = useState(false);

  const [openToWork, setOpenToWork] = useState(() => {
    if (typeof window === "undefined") return true;

    const raw = window.localStorage.getItem("openToWork");
    if (raw === "false") return false;
    if (raw === "true") return true;
    return true;
  });

  // Static user data
  // Dynamic user + onboarding data
  const queryClient = useQueryClient();

  const storedUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const storedUserEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;

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

  const loadRazorpayScript = () => {
    if (typeof window === "undefined") return Promise.resolve(false);
    if ((window as any).Razorpay) return Promise.resolve(true);

    return new Promise<boolean>((resolve) => {
      const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(true));
        existing.addEventListener("error", () => resolve(false));
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const payNowMutation = useMutation({
    mutationFn: async () => {
      if (!storedUserId) throw new Error("User not logged in");

      const ok = await loadRazorpayScript();
      if (!ok) throw new Error("Failed to load payment gateway");

      const orderRes = await apiRequest(
        "POST",
        `/api/intern/${encodeURIComponent(storedUserId)}/payment/razorpay/order`,
        {},
      );
      const orderJson = await orderRes.json();
      const keyId = String(orderJson?.keyId ?? "");
      const orderId = String(orderJson?.orderId ?? "");
      const amount = Number(orderJson?.amountMinor ?? 0);
      const currency = String(orderJson?.currency ?? "INR");

      if (!keyId || !orderId || !Number.isFinite(amount) || amount <= 0) {
        throw new Error("Invalid payment order response");
      }

      await new Promise<void>((resolve, reject) => {
        const RazorpayCtor = (window as any).Razorpay;
        if (!RazorpayCtor) {
          reject(new Error("Payment gateway unavailable"));
          return;
        }

        const options: any = {
          key: keyId,
          amount,
          currency,
          name: "Findtern",
          description: "Account activation",
          order_id: orderId,
          handler: async (response: any) => {
            try {
              await apiRequest(
                "POST",
                `/api/intern/${encodeURIComponent(storedUserId)}/payment/razorpay/verify`,
                response,
              );
              resolve();
            } catch (e) {
              reject(e instanceof Error ? e : new Error("Payment verification failed"));
            }
          },
          modal: {
            ondismiss: () => {
              reject(new Error("Payment cancelled"));
            },
          },
          prefill: {
            email: storedUserEmail || undefined,
          },
        };

        const rzp = new RazorpayCtor(options);
        rzp.on("payment.failed", (resp: any) => {
          const msg = resp?.error?.description || "Payment failed";
          reject(new Error(msg));
        });
        rzp.open();
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: paymentStatusQueryKey });
      toast({
        title: "Payment successful",
        description: "Your account is now live.",
      });
    },
    onError: (e: any) => {
      const msg = e?.message || "Payment failed";
      toast({
        title: "Payment not completed",
        description: msg,
        variant: "destructive",
      });
    },
  });

  const isPaid = Boolean(paymentData?.isPaid);

  const [supportOpen, setSupportOpen] = useState(false);
  const [supportKind, setSupportKind] = useState<"feedback" | "report">("feedback");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportVideo, setSupportVideo] = useState<File | null>(null);
  const [supportFiles, setSupportFiles] = useState<File[]>([]);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const supportAttachmentsInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const search = String(location ?? "").includes("?") ? String(location ?? "").split("?").slice(1).join("?") : "";
    if (!search) return;

    const params = new URLSearchParams(search);
    const kind = params.get("support");
    if (kind !== "feedback" && kind !== "report") return;

    setSupportKind(kind);
    setSupportOpen(true);

    try {
      window.history.replaceState({}, "", window.location.pathname);
    } catch {
      // ignore
    }
  }, [location]);

  const SUPPORT_MAX_VIDEO_BYTES = 2 * 1024 * 1024;
  const SUPPORT_MAX_IMAGE_BYTES = 100 * 1024;

  const submitSupport = async () => {
    if (supportSubmitting) return;
    if (!supportMessage.trim() && !supportVideo && supportFiles.length === 0) {
      toast({
        title: "Please add details",
        description: "Write a message or attach a file/video.",
        variant: "destructive",
      });
      return;
    }

    if (supportVideo && supportVideo.size > SUPPORT_MAX_VIDEO_BYTES) {
      toast({
        title: "Video too large",
        description: "Max video size is 2MB.",
        variant: "destructive",
      });
      return;
    }

    const tooLargeImage = supportFiles.find((f) => f.size > SUPPORT_MAX_IMAGE_BYTES);
    if (tooLargeImage) {
      toast({
        title: "Image too large",
        description: "Each image attachment must be 100KB or less.",
        variant: "destructive",
      });
      return;
    }

    setSupportSubmitting(true);
    try {
      const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;

      const fd = new FormData();
      fd.append("kind", supportKind);
      fd.append("userType", "intern");
      if (userId) fd.append("userId", userId);
      fd.append("message", supportMessage);
      if (typeof window !== "undefined") {
        fd.append("pageUrl", window.location.href);
      }
      if (supportVideo) fd.append("video", supportVideo);
      for (const f of supportFiles) {
        fd.append("attachments", f);
      }

      const res = await fetch("/api/support/feedback", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || res.statusText || "Request failed");
      }

      toast({
        title: "Submitted",
        description: "Thanks! We received your message.",
      });
      setSupportOpen(false);
      setSupportMessage("");
      setSupportVideo(null);
      setSupportFiles([]);
      if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to submit",
        variant: "destructive",
      });
      setSupportFiles([]);
      if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
    } finally {
      setSupportSubmitting(false);
    }
  };

  const { data: onboardingResp } = useQuery<any>({
    queryKey: ["/api/onboarding", storedUserId],
    enabled: !!storedUserId,
    queryFn: async () => {
      if (!storedUserId) return null;
      const res = await fetch(`/api/onboarding/${storedUserId}`);
      if (!res.ok) throw new Error("Failed to fetch onboarding data");
      return res.json();
    },
  });

  const { data: interviewsResp } = useQuery<{ interviews: any[] }>({
    queryKey: ["/api/intern/interviews", storedUserId],
    enabled: !!storedUserId,
    refetchInterval: ((query: any) => {
      const data = (query as any)?.state?.data as any;
      const list = Array.isArray(data?.interviews) ? data?.interviews : [];
      const ai = list.find((i: any) => String(i?.employerId ?? "").toLowerCase() === "admin");
      if (!ai) return false;

      const meeting = String(ai?.meet_link ?? ai?.meetingLink ?? "").trim();
      const feedback = String(ai?.feedback_link ?? ai?.feedbackLink ?? "").trim();
      const recording = String(ai?.recording_link ?? "").trim();

      if (meeting && (feedback || recording)) return false;
      return 15000;
    }) as any,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      if (!storedUserId) return { interviews: [] };

      try {
        const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/interviews`, {
          credentials: "include",
        });
        if (!res.ok) return { interviews: [] };
        return res.json();
      } catch {
        return { interviews: [] };
      }
    },
  });

  const { data: proposalsResp } = useQuery<{ proposals: any[] }>({
    queryKey: ["/api/intern/proposals", storedUserId],
    enabled: !!storedUserId,
    queryFn: async () => {
      if (!storedUserId) return { proposals: [] };
      try {
        const res = await fetch(`/api/intern/${encodeURIComponent(storedUserId)}/proposals`, {
          credentials: "include",
        });
        if (!res.ok) return { proposals: [] };
        return res.json();
      } catch {
        return { proposals: [] };
      }
    },
  });

  const { data: userByEmailResp } = useQuery<any>({
    queryKey: ["/api/auth/user/by-email", storedUserEmail ? encodeURIComponent(storedUserEmail) : ""],
    enabled: !storedUserId && !!storedUserEmail,
    queryFn: async ({ queryKey }: any) => {
      const url = queryKey.join("/");
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch user by email");
      return res.json();
    },
  });

  useEffect(() => {
    const recoveredUserId = userByEmailResp?.user?.id;
    if (!storedUserId && recoveredUserId) {
      localStorage.setItem("userId", recoveredUserId);
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding"] });
    }
  }, [queryClient, storedUserId, userByEmailResp?.user?.id]);

  const user = onboardingResp?.user || userByEmailResp?.user || null;
  const onboarding = onboardingResp?.onboarding || null;
  const documents = onboardingResp?.intern_document || null;

  const experienceList = useMemo(() => {
    const list = onboarding?.experienceJson;
    return Array.isArray(list) ? list : [];
  }, [onboarding?.experienceJson]);

  const displayAadhaar = useMemo(() => {
    const raw = String(onboarding?.aadhaarNumber ?? "").trim();
    if (!raw) return "-";
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 4) return raw;
    const last4 = digits.slice(-4);
    return `**** **** ${last4}`;
  }, [onboarding?.aadhaarNumber]);

  const displayPan = useMemo(() => {
    const raw = String(onboarding?.panNumber ?? "").trim();
    return raw || "-";
  }, [onboarding?.panNumber]);

  const profileUploadUrl = useMemo(() => {
    const fn = String(documents?.profilePhotoName ?? "").trim();
    if (!fn) return null;
    return `/uploads/${encodeURIComponent(fn)}`;
  }, [documents?.profilePhotoName]);

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let lastUrl: string | null = null;

    (async () => {
      const profileFile = await loadMediaFromDb("profilePhoto");
      if (!active) return;

      if (profileFile) {
        const url = URL.createObjectURL(profileFile);
        lastUrl = url;
        setProfilePhotoUrl(url);
        return;
      }

      setProfilePhotoUrl(profileUploadUrl);
    })();

    return () => {
      active = false;
      if (lastUrl) URL.revokeObjectURL(lastUrl);
    };
  }, [profileUploadUrl]);

  useEffect(() => {
    setAvatarFailed(false);
  }, [profilePhotoUrl]);

  const profileChecklist = useMemo(() => {
    const items: { label: string; done: boolean }[] = [];
    const add = (label: string, done: boolean) => {
      items.push({ label, done: Boolean(done) });
    };

    const locationTypesLocal = Array.isArray(onboarding?.locationTypes) ? onboarding.locationTypes : [];
    const requiresPreferredLocationsLocal =
      locationTypesLocal.includes("hybrid") || locationTypesLocal.includes("onsite");

    const academics = (onboarding as any)?.extraData?.academics ?? null;
    const bankDetails = (onboarding as any)?.extraData?.bankDetails ?? null;
    const acadStatus = String(academics?.status ?? "").trim();
    const acadIsPursuing = acadStatus === "Pursuing";
    const acadIsCompleted = acadStatus === "Completed";
    const acadLevel = String(academics?.level ?? "").trim().toLowerCase();
    const acadIsPhd = acadLevel === "phd";

    const languages = (onboarding as any)?.extraData?.languages;
    const extracurricular = (onboarding as any)?.extraData?.extracurricular;

    add("First name", Boolean((user?.firstName ?? "").trim()));
    add("Last name", Boolean((user?.lastName ?? "").trim()));
    add("Email", Boolean((user?.email ?? "").trim()));
    add("Phone number", Boolean((user?.phoneNumber ?? "").trim()));
    add("LinkedIn URL", Boolean((onboarding?.linkedinUrl ?? "").trim()));

    add("State", Boolean((onboarding?.state ?? "").trim()));
    add("City", Boolean((onboarding?.city ?? "").trim()));
    add("Aadhaar number", Boolean((onboarding?.aadhaarNumber ?? "").trim()));
    add("PAN number", Boolean((onboarding?.panNumber ?? "").trim()));

    add("Profile photo", Boolean((documents?.profilePhotoName ?? "").trim()));
    add("PAN image", Boolean((documents as any)?.panImageName && String((documents as any)?.panImageName ?? "").trim()));
    add(
      "Aadhaar image",
      Boolean((documents as any)?.aadhaarImageName && String((documents as any)?.aadhaarImageName ?? "").trim()),
    );

    add("Location preference type (Remote/Hybrid/Onsite)", locationTypesLocal.length > 0);
    if (requiresPreferredLocationsLocal) {
      add(
        "Preferred locations",
        Array.isArray(onboarding?.preferredLocations) && onboarding.preferredLocations.length > 0,
      );
    }
    add("Laptop preference (Yes/No)", typeof onboarding?.hasLaptop === "boolean");

    add("Academics (level)", Boolean(String(academics?.level ?? "").trim()));
    add("Academics (degree)", Boolean(String(academics?.degree ?? "").trim()));
    add(
      "Bank details",
      Boolean(String(bankDetails?.bankName ?? "").trim()) &&
        Boolean(String(bankDetails?.accountHolderName ?? "").trim()) &&
        Boolean(String(bankDetails?.accountNumber ?? "").trim()) &&
        Boolean(String(bankDetails?.ifscCode ?? "").trim()),
    );
    add("Academics (status)", Boolean(String(academics?.status ?? "").trim()));
    add("Academics (institution)", Boolean(String(academics?.institution ?? "").trim()));
    add("Academics (start year)", /^\d{4}$/.test(String(academics?.startYear ?? "").trim()));
    if (!acadIsPursuing) {
      add("Academics (end year)", /^\d{4}$/.test(String(academics?.endYear ?? "").trim()));
    }
    if (acadIsCompleted && !acadIsPhd) {
      add("Academics (score type)", Boolean(String(academics?.scoreType ?? "").trim()));
      add("Academics (score)", Boolean(String(academics?.score ?? "").trim()));
    }

    add(
      "Academics (marksheet uploads)",
      Array.isArray((academics as any)?.marksheetUploads) && (academics as any).marksheetUploads.length > 0,
    );

    add("Skills", Array.isArray(onboarding?.skills) && onboarding.skills.length > 0);
    add("Languages", Array.isArray(languages) && languages.length > 0);

    return items;
  }, [documents, onboarding, user?.email, user?.firstName, user?.lastName, user?.phoneNumber]);

  const profileCompletion = useMemo(() => {
    const total = profileChecklist.length;
    if (total === 0) return 0;
    const done = profileChecklist.reduce((acc, it) => acc + (it.done ? 1 : 0), 0);
    return Math.round((done / total) * 100);
  }, [profileChecklist]);

  const profileMissingFields = useMemo(() => {
    return profileChecklist.filter((it) => !it.done).map((it) => it.label);
  }, [profileChecklist]);

  const locationTypes = useMemo(
    () => (Array.isArray(onboarding?.locationTypes) ? onboarding.locationTypes : []),
    [onboarding?.locationTypes],
  );
  const requiresPreferredLocations = useMemo(
    () => locationTypes.includes("hybrid") || locationTypes.includes("onsite"),
    [locationTypes],
  );
  const isRemoteOnly = useMemo(() => locationTypes.length === 1 && locationTypes[0] === "remote", [locationTypes]);

  const hasAdminRatings = useMemo(() => {
    const ratings = onboardingResp?.onboarding?.extraData?.ratings;
    if (!ratings || typeof ratings !== "object") return false;
    return Object.values(ratings).some((v: any) => typeof v === "number" && Number.isFinite(v));
  }, [onboardingResp?.onboarding?.extraData?.ratings]);

  const ratingItems = useMemo(() => {
    const ratings: any = onboardingResp?.onboarding?.extraData?.ratings;
    if (!ratings || typeof ratings !== "object") return [] as { key: string; label: string; value: number }[];

    const order = ["coding", "aptitude", "interview", "communication", "overall"];
    const labelMap: Record<string, string> = {
      coding: "Coding",
      aptitude: "Aptitude",
      interview: "Interview",
      communication: "Communication",
      overall: "Overall",
    };

    const items = Object.entries(ratings)
      .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
      .map(([key, v]) => ({
        key,
        label: labelMap[key] ?? key,
        value: Math.max(0, Math.min(10, Number(v))),
      }));

    items.sort((a, b) => {
      const ai = order.indexOf(a.key);
      const bi = order.indexOf(b.key);
      if (ai === -1 && bi === -1) return a.label.localeCompare(b.label);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });

    return items;
  }, [onboardingResp?.onboarding?.extraData?.ratings]);

  const findternScore = useMemo(() => {
    const raw = (onboarding as any)?.extraData?.findternScore;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.max(0, Math.min(10, n));
  }, [onboarding?.extraData?.findternScore]);

  const isAccountLive = isPaid && findternScore !== null;

  const aiInterview = useMemo(() => {
    const list = Array.isArray(interviewsResp?.interviews) ? interviewsResp?.interviews : [];
    const aiList = list
      .filter((i) => String(i?.employerId ?? "").toLowerCase() === "admin")
      .sort((a, b) => {
        const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });
    return aiList[0] ?? null;
  }, [interviewsResp?.interviews]);

  const latestEmployerInterview = useMemo(() => {
    const list = Array.isArray(interviewsResp?.interviews) ? interviewsResp?.interviews : [];
    const employerList = list
      .filter((i) => String(i?.employerId ?? "").toLowerCase() !== "admin")
      .sort((a, b) => {
        const ta = a?.updatedAt
          ? new Date(a.updatedAt).getTime()
          : a?.createdAt
            ? new Date(a.createdAt).getTime()
            : 0;
        const tb = b?.updatedAt
          ? new Date(b.updatedAt).getTime()
          : b?.createdAt
            ? new Date(b.createdAt).getTime()
            : 0;
        return tb - ta;
      });
    return employerList[0] ?? null;
  }, [interviewsResp?.interviews]);

  const aiMeetingLink = useMemo(() => {
    const link = String(aiInterview?.meet_link ?? aiInterview?.meetingLink ?? "").trim();
    if (!link) return null;
    if (!/^https?:\/\//i.test(link)) return null;
    return link;
  }, [aiInterview]);

  const aiFeedbackLink = useMemo(() => {
    const link = String(aiInterview?.feedbackLink ?? aiInterview?.feedbackLink ?? "").trim();
    if (!link) return null;
    if (!/^https?:\/\//i.test(link)) return null;
    return link;
  }, [aiInterview]);

  const aiRecordingLink = useMemo(() => {
    const link = String(aiInterview?.recordingLink ?? aiInterview?.recordingLink ?? "").trim();
    if (!link) return null;
    if (!/^https?:\/\//i.test(link)) return null;
    return link;
  }, [aiInterview]);

  const employerMeetingLink = useMemo(() => {
    const link = String(latestEmployerInterview?.meet_link ?? latestEmployerInterview?.meetingLink ?? "").trim();
    if (!link) return null;
    if (!/^https?:\/\//i.test(link)) return null;
    return link;
  }, [latestEmployerInterview]);

  const employerFeedbackLink = useMemo(() => {
    const link = String(latestEmployerInterview?.feedbackLink ?? latestEmployerInterview?.feedbackLink ?? "").trim();
    if (!link) return null;
    if (!/^https?:\/\//i.test(link)) return null;
    return link;
  }, [latestEmployerInterview]);

  const employerRecordingLink = useMemo(() => {
    const link = String(latestEmployerInterview?.recordingLink ?? latestEmployerInterview?.recordingLink ?? "").trim();
    if (!link) return null;
    if (!/^https?:\/\//i.test(link)) return null;
    return link;
  }, [latestEmployerInterview]);

  const aiLinksAvailable = useMemo(() => {
    return Boolean(aiFeedbackLink || aiRecordingLink);
  }, [aiFeedbackLink, aiRecordingLink]);

  const aiAnyLinksAvailable = useMemo(() => {
    return Boolean(aiMeetingLink || aiFeedbackLink || aiRecordingLink);
  }, [aiMeetingLink, aiFeedbackLink, aiRecordingLink]);

  const employerAnyLinksAvailable = useMemo(() => {
    return Boolean(employerMeetingLink || employerFeedbackLink || employerRecordingLink);
  }, [employerMeetingLink, employerFeedbackLink, employerRecordingLink]);

  const aiBannerMessage = useMemo(() => {
    if (!aiInterview) return null;
    if (aiLinksAvailable) return "Your AI interview feedback is available.";
    if (hasAdminRatings) return null;
    if (!aiMeetingLink) {
      return "We've received your request and will share the interview link with you shortly.";
    }
    return "Your AI interview is unlocked. Tap AI Interview above to join.";
  }, [aiInterview, aiLinksAvailable, aiMeetingLink, hasAdminRatings]);

  const interviews = (interviewsResp?.interviews ?? []) as any[];
  const proposals = (proposalsResp?.proposals ?? []) as any[];

  const interviewStats = useMemo(() => {
    const list = interviews.filter((i) => String(i?.employerId ?? "").toLowerCase() !== "admin");
    const scheduled = list.filter(
      (i) => String(i?.status ?? "").toLowerCase() === "scheduled" && Boolean(i?.selectedSlot),
    );

    const getSelectedSlotTime = (i: any): Date | null => {
      const selected = i?.selectedSlot;
      if (!selected) return null;
      const key = `slot${selected}`;
      const raw = i?.[key];
      if (!raw) return null;
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return null;
      return d;
    };

    const upcoming = scheduled
      .map((i) => ({ interview: i, when: getSelectedSlotTime(i) }))
      .filter((x) => x.when && x.when.getTime() >= Date.now())
      .sort((a, b) => (a.when?.getTime() ?? 0) - (b.when?.getTime() ?? 0))[0]?.when;

    return {
      total: list.length,
      scheduled: scheduled.length,
      upcomingLabel: upcoming ? upcoming.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : null,
    };
  }, [interviews]);

  const proposalStats = useMemo(() => {
    const total = proposals.length;
    const approved = proposals.filter((p) => {
      const s = String(p?.status ?? "sent").trim().toLowerCase();
      return s === "accepted" || s === "hired";
    }).length;
    const rejected = proposals.filter((p) => String(p?.status ?? "sent").trim().toLowerCase() === "rejected").length;
    const pending = proposals.filter((p) => {
      const s = String(p?.status ?? "sent").trim().toLowerCase();
      return s === "sent";
    }).length;
    return { total, approved, rejected, pending };
  }, [proposals]);

  const userName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim();
  const userInitials = (userName || "").split(" ").filter(Boolean).map((n) => n[0] ?? "").join("").toUpperCase();

  const canPreviewProfilePhoto = Boolean(profilePhotoUrl && !avatarFailed);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 pb-20 md:pb-0">
      <CandidateHeader
        showAiInterviewButton
        userInitials={userInitials || "U"}
        openToWork={openToWork}
        onOpenToWorkChange={setOpenToWork}
      />
      <Dialog
        open={profileChecklistOpen}
        onOpenChange={(open) => {
          setProfileChecklistOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Profile completion</DialogTitle>
            <DialogDescription>
              Your profile is {profileCompletion}% complete.
              {profileMissingFields.length > 0
                ? ` It’s not 100% yet because ${profileMissingFields.length} item${profileMissingFields.length === 1 ? " is" : "s are"} missing.`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">Complete these to reach 100%</div>
            {profileMissingFields.length === 0 ? (
              <div className="text-sm text-slate-700">All set.</div>
            ) : (
              <div className="max-h-64 overflow-auto rounded-md border bg-slate-50 px-3 py-2">
                {profileMissingFields.map((f) => (
                  <div key={f} className="text-sm">- {f}</div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProfileChecklistOpen(false);
              }}
            >
              Close
            </Button>
            {profileCompletion < 100 ? (
              <Button
                type="button"
                className="bg-[#0E6049] hover:bg-[#0b4b3a]"
                onClick={() => {
                  setProfileChecklistOpen(false);
                  const missing = profileChecklist.filter((it) => !it.done).map((it) => it.label);
                  const onlyBankPending = missing.length === 1 && missing[0] === "Bank details";
                  setLocation(onlyBankPending ? "/settings" : "/onboarding?edit=1");
                }}
              >
                Complete now
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={profilePhotoPreviewOpen}
        onOpenChange={(open) => {
          setProfilePhotoPreviewOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="relative bg-black">
            <button
              type="button"
              className="absolute right-3 top-3 z-50 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow hover:bg-white focus:outline-none focus:ring-2 focus:ring-white"
              onClick={() => setProfilePhotoPreviewOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
            {canPreviewProfilePhoto ? (
              <img
                src={profilePhotoUrl as string}
                alt={userName || "Profile"}
                className="w-full max-h-[80vh] object-contain"
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {!isAccountLive && (!isPaid || !aiInterview) && (
        <div className=" top-16 z-40">
          <div className="mx-auto max-w-12xl px-4 py-2 md:px-6">
            <div className="flex flex-col gap-2 rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-[11px] sm:flex-row sm:items-center sm:justify-between md:px-4 md:py-3 md:text-sm">
              <p className="font-medium text-destructive leading-snug">
                {!isPaid
                  ? "Your account is not live. Please complete your payment."
                  : "Your profile is not live yet. please apply for AI interview to complete your vetting process."}
              </p>
              {!isPaid && (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-full bg-destructive px-3 text-xs text-destructive-foreground hover:bg-destructive/90 md:h-8 md:px-4 md:text-sm"
                  disabled={payNowMutation.isPending}
                  onClick={async () => {
                    try {
                      await payNowMutation.mutateAsync();
                    } catch (e) {
                      console.error("Pay now error:", e);
                    }
                  }}
                >
                  Pay Now
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* AI Interview Notification Banner */}
      <div className="mx-auto max-w-12xl px-2 md:px-6 pt-3 pb-6 space-y-6">
        {/* Profile Completion */}
        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="relative overflow-hidden border-emerald-100 bg-white/70 backdrop-blur">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-teal-500/10" />
            <div className="relative p-5 md:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="text-lg font-semibold text-slate-900">Dashboard</div>
                  <div className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
                    {userName ? `Welcome, ${userName}` : "Welcome"}
                  </div>
                  <div className="text-sm text-slate-600">
                    Keep your profile updated so employers can discover you faster.
                  </div>
                </div>

                <div className="flex flex-col items-start gap-3 sm:items-end">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="bg-white/70 rounded-full px-3 py-1 text-xs">
                      {openToWork ? (isAccountLive ? "Profile live" : "Profile pending") : "Profile hidden"}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="border-emerald-200 text-emerald-800 cursor-pointer rounded-full px-3 py-1 text-xs"
                            onClick={() => setProfileChecklistOpen(true)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setProfileChecklistOpen(true);
                              }
                            }}
                          >
                            {profileCompletion}% complete
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="end" className="max-w-xs">
                          <div className="text-xs font-semibold">Why not 100%?</div>
                          {profileMissingFields.length === 0 ? (
                            <div className="mt-1 text-xs">All set.</div>
                          ) : (
                            <div className="mt-1 max-h-48 overflow-auto pr-1">
                              <div className="text-[11px] text-slate-300">
                                Missing {profileMissingFields.length} item{profileMissingFields.length === 1 ? "" : "s"}:
                              </div>
                              {profileMissingFields.map((f) => (
                                <div key={f} className="text-xs">- {f}</div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 text-[11px] text-slate-300">Click to view the full checklist</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:justify-end">
                    <Button
                      className="h-10 w-10 rounded-full bg-[#0E6049] hover:bg-[#0b4b3a] px-0"
                      onClick={() => setLocation("/onboarding?edit=1")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 rounded-full px-4"
                      onClick={() => setLocation("/proposals")}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Proposals
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 rounded-full px-4"
                      onClick={() => setLocation("/interviews")}
                    >
                      <CalendarDays className="h-4 w-4 mr-2" />
                      Interviews
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white/70 backdrop-blur">
            <div className="p-5 md:p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Profile completion</div>
                  <div className="text-xs text-slate-600">Complete profile = higher visibility</div>
                </div>
                <div className="text-sm font-semibold text-slate-900">{profileCompletion}%</div>
              </div>

              <Progress value={profileCompletion} className="h-2" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                <div className="rounded-lg border bg-white/70 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Status</div>
                  <div className="mt-1 font-semibold flex items-center gap-1.5">
                    {!openToWork ? (
                      <CircleOff className="h-3 w-3 text-red-600 animate-pulse" />
                    ) : isAccountLive ? (
                      <Circle className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 text-amber-600 animate-pulse" />
                    )}
                    <span
                      className={
                        !openToWork
                          ? "text-red-600 animate-pulse"
                          : isAccountLive
                            ? undefined
                            : "text-amber-700 animate-pulse"
                      }
                    >
                      {!openToWork ? "Offline" : isAccountLive ? "Active" : aiInterview ? "Vetting in progress" : "Pending"}
                    </span>
                  </div>
                  <div
                    className={
                      !openToWork
                        ? "mt-0.5 text-[11px] text-red-600/90 animate-pulse"
                        : isAccountLive
                          ? "mt-0.5 text-[11px] text-slate-600"
                          : "mt-0.5 text-[11px] text-amber-700/90 animate-pulse"
                    }
                  >
                    {!openToWork
                      ? "Hidden"
                      : isAccountLive
                        ? "Open to Work"
                        : !isPaid
                          ? "Complete payment"
                          : aiInterview
                            ? "Vetting in progress"
                            : "Pending: complete AI Interview process"}
                  </div>
                </div>
                <div className="rounded-lg border bg-white/70 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Next interview</div>
                  <div className="font-semibold">{interviewStats.upcomingLabel || "Not scheduled"}</div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
          <Card className="border-slate-200 bg-white/70 backdrop-blur">
            <div className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Interviews</div>
                  <div className="text-xs text-slate-600">Track schedules & join links</div>
                </div>
                <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                  {interviewStats.total}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <button 
                  onClick={() => setLocation("/interviews")}
                  className="rounded-lg border bg-white/70 px-3 py-2 text-left hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  <div className="text-[11px] text-slate-500">Scheduled</div>
                  <div className="text-sm font-semibold text-slate-900">{interviewStats.scheduled}</div>
                </button>
                <div className="rounded-lg border bg-white/70 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Upcoming</div>
                  <div className="text-sm font-semibold text-slate-900">
                    {interviewStats.upcomingLabel ? "Yes" : "-"}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <Button variant="outline" className="h-9 w-full rounded-full" onClick={() => setLocation("/interviews")}>
                  View all interviews
                </Button>
              </div>
            </div>
          </Card>

          <Card className="border-slate-200 bg-white/70 backdrop-blur">
            <div className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Proposals</div>
                  <div className="text-xs text-slate-600">Review offers from employers</div>
                </div>
                <Badge variant="outline" className="border-emerald-200 text-emerald-800">
                  {proposalStats.total}
                </Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border bg-white/70 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Approved</div>

                  <div className="text-sm font-semibold text-slate-900">{proposalStats.approved}</div>
                </div>
                {/* <div className="rounded-lg border bg-white/70 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Pending</div>

                  <div className="text-sm font-semibold text-slate-900">{proposalStats.pending}</div>
                </div> */}
                <div className="rounded-lg border bg-white/70 px-3 py-2">
                  <div className="text-[11px] text-slate-500">Rejected</div>

                  <div className="text-sm font-semibold text-slate-900">{proposalStats.rejected}</div>
                </div>
              </div>

              <div className="mt-4">
                <Button variant="outline" className="h-9 w-full rounded-full" onClick={() => setLocation("/proposals")}>
                  View proposals
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-slate-900">Your profile</div>
              <div className="text-sm text-slate-600">This is what employers see</div>
            </div>
          </div>

          <Card className="relative overflow-hidden border-slate-200/70 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/10 via-transparent to-teal-500/10" />
            {!onboardingResp && storedUserId ? (
              <div className="relative grid gap-4 md:grid-cols-2 p-4 md:p-6">
                <Skeleton className="h-64 w-full rounded-xl" />
                <Skeleton className="h-64 w-full rounded-xl" />
              </div>
            ) : (
              <div className="relative grid gap-0 md:grid-cols-[320px_1fr] min-w-0">
                <div className="bg-[#0E6049] text-slate-50 p-5 md:p-6">
                  <div className="text-xl font-extrabold tracking-wide uppercase">{userName || "YOUR NAME"}</div>

                  <div className="mt-4 flex justify-center">
                    <div className="h-28 w-28 rounded-full border-4 border-[#0E6049]/70 bg-[#0E6049]/10 flex items-center justify-center">
                      <div
                        className={`h-24 w-24 rounded-full bg-[#0b0f14] flex items-center justify-center overflow-hidden${canPreviewProfilePhoto ? " cursor-pointer" : ""}`}
                        role={canPreviewProfilePhoto ? "button" : undefined}
                        tabIndex={canPreviewProfilePhoto ? 0 : -1}
                        onClick={() => {
                          if (!canPreviewProfilePhoto) return;
                          setProfilePhotoPreviewOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (!canPreviewProfilePhoto) return;
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setProfilePhotoPreviewOpen(true);
                          }
                        }}
                      >
                        {profilePhotoUrl && !avatarFailed ? (
                          <img
                            key={profilePhotoUrl}
                            src={profilePhotoUrl}
                            alt={userName || "Profile"}
                            className="h-full w-full object-cover"
                            onError={() => setAvatarFailed(true)}
                          />
                        ) : (
                          <div className="text-xl font-bold text-white">{userInitials || "U"}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <Badge
                      variant="outline"
                      className={openToWork ? "border-emerald-500/40 text-emerald-200" : "border-amber-500/40 text-amber-200"}
                    >
                      {openToWork ? "Open to Work" : "Hidden"}
                    </Badge>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge
                            variant="outline"
                            className="border-slate-700 text-slate-200 cursor-pointer"
                            onClick={() => setProfileChecklistOpen(true)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setProfileChecklistOpen(true);
                              }
                            }}
                          >
                            {profileCompletion}% complete
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center" className="max-w-xs">
                          <div className="text-xs font-semibold">Why not 100%?</div>
                          {profileMissingFields.length === 0 ? (
                            <div className="mt-1 text-xs">All set.</div>
                          ) : (
                            <div className="mt-1 max-h-48 overflow-auto pr-1">
                              <div className="text-[11px] text-slate-300">
                                Missing {profileMissingFields.length} item{profileMissingFields.length === 1 ? "" : "s"}:
                              </div>
                              {profileMissingFields.map((f) => (
                                <div key={f} className="text-xs">- {f}</div>
                              ))}
                            </div>
                          )}
                          <div className="mt-2 text-[11px] text-slate-300">Click to view the full checklist</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    {typeof onboarding?.hasLaptop === "boolean" ? (
                      <Badge variant="outline" className="border-slate-700 text-slate-200">
                        <Laptop className="h-3.5 w-3.5 mr-1" />
                        {onboarding.hasLaptop ? "Laptop" : "No laptop"}
                      </Badge>
                    ) : null}
                  </div>

                  <Separator className="my-5 bg-slate-800" />

                  <div className="space-y-6">
                    <div>
                    
                      <div className="mt-3 space-y-2 text-sm text-slate-200">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 mt-0.5 text-slate-400" />
                          <div className="break-words">
                            {String(
                              `${String(user?.countryCode ?? "").trim()} ${String(user?.phoneNumber ?? "").trim()}`.trim() || "-",
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-slate-400 shrink-0" />
                          {String(user?.email ?? "").trim() ? (
                            <a className="break-words hover:underline" href={`mailto:${String(user?.email ?? "").trim()}`}>
                              {String(user?.email ?? "-")}
                            </a>
                          ) : (
                            <div className="break-words">-</div>
                          )}
                        </div> 
                        {String(onboarding?.linkedinUrl ?? "").trim() ? (
                          <div className="flex items-center gap-2">
                            <FaLinkedinIn className="h-4 w-4 text-slate-400 shrink-0" />
                            <a
                              className="break-words hover:underline"
                              href={String(onboarding?.linkedinUrl ?? "").trim()}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {String(onboarding?.linkedinUrl ?? "-")}
                            </a>
                          </div>
                        ) : null}
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className="break-words">
                            {[onboarding?.city, onboarding?.state, onboarding?.pinCode]
                              .map((v: any) => String(v ?? "").trim())
                              .filter(Boolean)
                              .join(", ") || "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0E6049]/15 text-white">
                          <Star className="h-4 w-4 " />
                        </span>
                        Skills
                      </div>

                      <div className="mt-3 space-y-3">
                        {(() => {
                          const rawList = Array.isArray(onboarding?.skills) ? (onboarding.skills as any[]) : [];
                          const normalizeSkillLevel = (raw: any): { rating: number; label: string } => {
                            if (typeof raw === "number") {
                              if (!Number.isFinite(raw)) return { rating: 1, label: "Beginner" };
                              const rating = Math.max(1, Math.min(3, Math.round(raw)));
                              return {
                                rating,
                                label: rating === 1 ? "Beginner" : rating === 2 ? "Intermediate" : "Advanced",
                              };
                            }

                            const str = String(raw ?? "").trim();
                            if (!str) return { rating: 1, label: "Beginner" };
                            const num = Number(str);
                            if (Number.isFinite(num)) {
                              const rating = Math.max(1, Math.min(3, Math.round(num)));
                              return {
                                rating,
                                label: rating === 1 ? "Beginner" : rating === 2 ? "Intermediate" : "Advanced",
                              };
                            }

                            const key = str.toLowerCase();
                            if (key === "beginner") return { rating: 1, label: "Beginner" };
                            if (key === "intermediate") return { rating: 2, label: "Intermediate" };
                            if (key === "advanced") return { rating: 3, label: "Advanced" };
                            if (key === "advance" || key === "advanve" || key === "adnavce") {
                              return { rating: 3, label: "Advanced" };
                            }
                            return { rating: 1, label: str };
                          };

                          const normalized = rawList
                            .map((s: any, idx: number) => {
                              if (typeof s === "string") {
                                const name = String(s ?? "").trim();
                                return { id: `skill-${idx}-${name}`, name, rating: 1, label: "Beginner" };
                              }
                              const name = String(s?.name ?? "").trim();
                              const level = normalizeSkillLevel(s?.rating);
                              return {
                                id: String(s?.id ?? `skill-${idx}-${name}`),
                                name,
                                rating: level.rating,
                                label: level.label,
                              };
                            })
                            .filter((s: any) => Boolean(String(s?.name ?? "").trim()));

                          if (normalized.length === 0) {
                            return <div className="text-sm text-slate-400">No skills added.</div>;
                          }

                          return normalized.map((s: any) => (
                            <div key={String(s?.id ?? s?.name)} className="flex items-center justify-between gap-3">
                              <div className="text-sm text-slate-200 truncate">{String(s?.name ?? "")}</div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 3 }).map((_, i) => {
                                    const filled = i < s.rating;
                                    return (
                                      <Star
                                        key={i}
                                        className={
                                          "h-3.5 w-3.5 " +
                                          (filled ? "text-[#EAF9F7]" : "text-slate-700")
                                        }
                                        fill={filled ? "currentColor" : "none"}
                                      />
                                    );
                                  })}
                                </div>
                                <div className="text-[11px] text-slate-400 min-w-[72px] text-right">
                                  {String(s?.label ?? "").trim()}
                                </div>
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0E6049]/15 text-white">
                          <Award className="h-4 w-4" />
                        </span>
                        Location preferences
                      </div>

                      <div className="mt-1 text-[11px] text-slate-400">
                        Used to match internships near you.
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {isRemoteOnly ? (
                          <Badge
                            variant="outline"
                            className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
                          >
                            Remote
                          </Badge>
                        ) : (Array.isArray(onboarding?.preferredLocations) ? onboarding.preferredLocations : []).slice(0, 8).length > 0 ? (
                          (onboarding.preferredLocations as any[]).slice(0, 8).map((h) => (
                            <Badge
                              key={String(h)}
                              variant="outline"
                              className="border-slate-700/70 bg-[#0b1220] text-slate-100 px-2.5 py-1.5 rounded-lg max-w-full whitespace-normal break-words"
                            >
                              {(() => {
                                const raw = String(h ?? "").trim();
                                const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
                                const city = parts[0] ?? raw;
                                const st = parts.length > 1 ? parts.slice(1).join(", ") : "";
                                return (
                                  <span className="inline-flex flex-col gap-0.5 max-w-full">
                                    <span className="inline-flex items-center gap-1.5 min-w-0">
                                      <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">City</span>
                                      <span className="text-[12px] font-semibold text-slate-50 truncate">{city}</span>
                                    </span>
                                    {st ? (
                                      <span className="inline-flex items-center gap-1.5 min-w-0">
                                        <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">State</span>
                                        <span className="text-[12px] text-slate-200 truncate">{st}</span>
                                      </span>
                                    ) : null}
                                  </span>
                                );
                              })()}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="outline" className="border-slate-700/70 bg-[#0b1220] text-slate-300">
                            Not set
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                <div className="bg-[#0E6049] pt-2 min-w-0">
                  <div className="rounded-xl border border-slate-700/70 bg-[#0f172a] p-4 w-full min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0E6049] text-white">
                        <Award className="h-4 w-4" />
                      </span>
                      Experience
                    </div>

                    <div className="mt-3 space-y-2 text-sm">
                      {experienceList.length > 0 ? (
                        experienceList.slice(0, 6).map((e: any) => (
                          <div
                            key={String(e?.id ?? `${e?.company ?? "company"}-${e?.from ?? "from"}`)}
                            className="rounded-lg border border-slate-700/60 bg-[#0b1220] px-3 py-2"
                          >
                            {String(e?.type ?? "").trim() ? (
                              <div className="text-[11px] text-slate-400 truncate">{String(e?.type)}</div>
                            ) : null}
                            <div className="font-semibold text-slate-50 truncate">{String(e?.role ?? "-")}</div>
                            <div className="mt-0.5 text-xs text-slate-300 truncate">{String(e?.company ?? "-")}</div>
                            <div className="mt-0.5 text-xs text-slate-400">
                              {[e?.from, e?.to]
                                .map((v: any) => String(v ?? "").trim())
                                .filter(Boolean)
                                .join(" - ") || "-"}
                            </div>
                            {String(e?.description ?? "").trim() ? (
                              <div className="mt-1 text-xs text-slate-300 whitespace-pre-wrap">{String(e?.description)}</div>
                            ) : null}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-slate-400">No experience added.</div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-700/70 bg-[#0f172a] p-4 w-full min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-50">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#0E6049] text-white">
                        <Star className="h-4 w-4" />
                      </span>
                      Practice
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {(findternScore !== null || ratingItems.length > 0) && (
                        <div className="sm:col-span-2 rounded-lg border border-slate-700/60 bg-[#0b1220] px-3 py-3 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] text-slate-400">Findtern score</div>
                            <Badge variant="outline" className="border-slate-700 text-slate-200">/10</Badge>
                          </div>

                          {findternScore !== null && (
                            <>
                              <div className="mt-2 flex items-baseline justify-between">
                                <div className="text-slate-50 font-semibold text-lg">{findternScore}</div>
                                <div className="text-xs text-slate-400">Overall</div>
                              </div>
                              <Progress value={findternScore * 10} className="mt-2 h-1.5" />
                            </>
                          )}

                          {ratingItems.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 min-[360px]:grid-cols-2 gap-2 md:grid-cols-4">
                              {ratingItems
                                .filter((i) => i.key !== "overall")
                                .slice(0, 4)
                                .map((item) => (
                                  <div key={item.key} className="rounded-md border border-slate-700/60 bg-[#08101d] px-2.5 py-2 min-w-0">
                                    <div className="text-[11px] text-slate-400">{item.label}</div>
                                    <div className="mt-0.5 flex items-baseline justify-between">
                                      <div className="text-slate-200 font-semibold">{item.value}</div>
                                      <div className="text-[11px] text-slate-500">/10</div>
                                    </div>
                                    <Progress value={item.value * 10} className="mt-2 h-1.5" />
                                  </div>
                                ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="rounded-lg border border-slate-700/60 bg-[#0b1220] px-3 py-3">
                        <div className="text-[11px] text-slate-400">Academics</div>
                        <div className="mt-2 text-sm text-slate-50 font-semibold truncate">
                          {String(onboarding?.extraData?.academics?.degree ?? "-")}
                        </div>
                        <div className="mt-1 text-xs text-slate-300">
                          {[(() => {
                            const raw = String(onboarding?.extraData?.academics?.level ?? "").trim();
                            if (!raw) return "";
                            return raw.toLowerCase() === "phd" ? "Ph.D" : raw;
                          })(), onboarding?.extraData?.academics?.institution, (() => {
                            const acad = onboarding?.extraData?.academics;
                            const startYear = String(acad?.startYear ?? "").trim();
                            const endYear = String(acad?.endYear ?? "").trim();
                            const status = String(acad?.status ?? "").trim().toLowerCase();

                            if (startYear && endYear) return `${startYear}-${endYear}`;
                            if (startYear && !endYear && status === "pursuing") return `${startYear} - Pursuing / Ongoing`;
                            return endYear || startYear;
                          })()]
                            .map((v: any) => String(v ?? "").trim())
                            .filter(Boolean)
                            .join(" • ") || "-"}
                        </div>

                        {String(onboarding?.extraData?.academics?.level ?? "").trim().toLowerCase() !== "phd" ? (
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <div className="rounded-md border border-slate-700/60 bg-[#08101d] px-2.5 py-2">
                              <div className="text-[11px] text-slate-400">Score</div>
                              <div className="text-slate-200 font-semibold">
                                {(() => {
                                  const acad = onboarding?.extraData?.academics as any;
                                  const score = String(acad?.score ?? "").trim();
                                  const scoreType = String(acad?.scoreType ?? "").trim();
                                  if (!score) return "-";
                                  return `${score}${scoreType ? ` ${scoreType}` : ""}`;
                                })()}
                              </div>
                            </div>
                            <div className="rounded-md border border-slate-700/60 bg-[#08101d] px-2.5 py-2">
                              <div className="text-[11px] text-slate-400">Specialization</div>
                              <div className="text-slate-200 font-semibold truncate">
                                {String(onboarding?.extraData?.academics?.specialization ?? "").trim() || "-"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-3">
                            <div className="rounded-md border border-slate-700/60 bg-[#08101d] px-2.5 py-2">
                              <div className="text-[11px] text-slate-400">Specialization</div>
                              <div className="text-slate-200 font-semibold truncate">
                                {String(onboarding?.extraData?.academics?.specialization ?? "").trim() || "-"}
                              </div>
                            </div>
                          </div>
                        )}

                        {Array.isArray(onboarding?.extraData?.academics?.professionalCourses) &&
                        onboarding.extraData.academics.professionalCourses.length > 0 ? (
                          <div className="mt-4">
                            <div className="text-[11px] text-slate-400">Professional courses</div>
                            <div className="mt-2 space-y-2">
                              {(onboarding.extraData.academics.professionalCourses as any[]).slice(0, 5).map((c) => (
                                <div
                                  key={String(c?.id ?? c?.courseNamePreset ?? c?.courseNameOther ?? "course")}
                                  className="rounded-md border border-slate-700/60 bg-[#08101d] px-2.5 py-2"
                                >
                                  <div className="text-slate-200 font-semibold truncate">
                                    {(() => {
                                      const preset = String(c?.courseNamePreset ?? "").trim();
                                      const other = String(c?.courseNameOther ?? "").trim();
                                      if (preset && preset !== "Other") return preset;
                                      return other || preset || "-";
                                    })()}
                                  </div>
                                  <div className="mt-0.5 text-xs text-slate-300">
                                    {[c?.level, c?.institution, c?.completionDate, c?.status]
                                      .map((v: any) => String(v ?? "").trim())
                                      .filter(Boolean)
                                      .join(" • ") || "-"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {Array.isArray(onboarding?.extraData?.academics?.certifications) &&
                        onboarding.extraData.academics.certifications.length > 0 ? (
                          <div className="mt-4">
                            <div className="text-[11px] text-slate-400">Certifications</div>
                            <div className="mt-2 space-y-2">
                              {(onboarding.extraData.academics.certifications as any[]).slice(0, 5).map((c) => (
                                <div
                                  key={String(c?.id ?? c?.certificateName ?? "cert")}
                                  className="rounded-md border border-slate-700/60 bg-[#08101d] px-2.5 py-2"
                                >
                                  <div className="text-slate-200 font-semibold truncate">
                                    {String(c?.certificateName ?? "-")}
                                  </div>
                                  <div className="mt-0.5 text-xs text-slate-300">
                                    {[c?.institution, c?.startDate, c?.endDate]
                                      .map((v: any) => String(v ?? "").trim())
                                      .filter(Boolean)
                                      .join(" • ") || "-"}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>

                      <div className="rounded-lg border border-slate-700/60 bg-[#0b1220] px-3 py-3">
                        <div className="text-[11px] text-slate-400">Languages</div>
                        <div className="mt-2 space-y-2">
                          {Array.isArray(onboarding?.extraData?.languages) && onboarding.extraData.languages.length > 0 ? (
                            (onboarding.extraData.languages as any[]).slice(0, 6).map((l) => (
                              <div key={String(l?.id ?? l?.language)} className="rounded-md border border-slate-700/60 bg-[#08101d] px-2.5 py-2">
                                <div className="text-slate-200 font-semibold capitalize">{String(l?.language ?? "-")}</div>
                                <div className="mt-0.5 text-xs text-slate-300">
                                  {[l?.level, `Read: ${l?.read}`, `Speak: ${l?.speak}`, `Write: ${l?.write}`]
                                    .map((v: any) => String(v ?? "").trim())
                                    .filter(Boolean)
                                    .join(" • ")}
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-slate-400">-</div>
                          )}
                        </div>
                      </div>

                      {/* <div className="rounded-lg border border-slate-700/60 bg-[#0b1220] px-3 py-3">
                        <div className="text-[11px] text-slate-400">Location preferences</div>
                        <div className="mt-2 space-y-2">
                          <div className="text-sm text-slate-200">
                            Types: {locationTypes.join(", ") || "-"}
                          </div>
                        
                          <div className="text-sm text-slate-200">
                            Laptop: {requiresPreferredLocations ? (typeof onboarding?.hasLaptop === "boolean" ? (onboarding.hasLaptop ? "Yes" : "No") : "-") : "-"}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {isRemoteOnly ? (
                              <Badge variant="outline" className="border-slate-700 text-slate-200">Remote</Badge>
                            ) : (Array.isArray(onboarding?.preferredLocations) ? onboarding.preferredLocations : []).slice(0, 10).length > 0 ? (
                              (onboarding.preferredLocations as any[]).slice(0, 10).map((loc) => (
                                <Badge key={String(loc)} variant="outline" className="border-slate-700 text-slate-200">
                                  {String(loc)}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </div>
                        </div>
                      </div> */}

                      <div className="rounded-lg border border-slate-700/60 bg-[#0b1220] px-3 py-3">
                        <div className="text-[11px] text-slate-400">Extracurricular</div>
                        <div className="mt-2 space-y-2">
                          {Array.isArray(onboarding?.extraData?.extracurricular) && onboarding.extraData.extracurricular.length > 0 ? (
                            (onboarding.extraData.extracurricular as any[]).slice(0, 6).map((a) => (
                              <div key={String(a?.id ?? a?.activity)} className="rounded-md border border-slate-700/60 bg-[#08101d] px-2.5 py-2">
                                <div className="text-slate-200 font-semibold truncate">{String(a?.activity ?? "-")}</div>
                                <div className="mt-0.5 text-xs text-slate-300">{String(a?.level ?? "-")}</div>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-slate-400">-</div>
                          )}
                        </div>
                      </div>
                    </div>
                      {aiAnyLinksAvailable && (
                        <div className="rounded-lg border border-slate-700/60 bg-[#0b1220] px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600/10 text-emerald-400">
                              <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-slate-100">AI Interview</div>
                              <div className="mt-0.5 text-xs text-slate-400"> Feedback / Recording links</div>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-slate-50"
                                  disabled={!aiFeedbackLink}
                                  onClick={() => {
                                    const link = String(aiFeedbackLink ?? "").trim();
                                    if (!link) return;
                                    window.open(link, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  View Feedback
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="border-slate-600 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-slate-50"
                                  disabled={!aiRecordingLink}
                                  onClick={() => {
                                    const link = String(aiRecordingLink ?? "").trim();
                                    if (!link) return;
                                    window.open(link, "_blank", "noopener,noreferrer");
                                  }}
                                >
                                  View Recording
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                  </div>
                </div>

              </div>
            )}
          </Card>

          
        </div>

        <div className="hidden md:flex fixed z-50 left-auto right-[max(1.25rem,env(safe-area-inset-right))] bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex-col gap-2">
          <Button
            type="button"
            size="icon"
            className="h-12 w-12 rounded-full bg-white text-emerald-700 border border-emerald-200 shadow-lg hover:bg-emerald-50"
            aria-label="Feedback"
            onClick={() => {
              setSupportKind("feedback");
              setSupportOpen(true);
            }}
          >
            <MessageSquare className="w-5 h-5" />
          </Button>

          <Button
            type="button"
            size="icon"
            className="h-12 w-12 rounded-full bg-white text-rose-700 border border-rose-200 shadow-lg hover:bg-rose-50"
            aria-label="Report"
            onClick={() => {
              setSupportKind("report");
              setSupportOpen(true);
            }}
          >
            <Flag className="w-5 h-5" />
          </Button>

          <Button
            type="button"
            size="icon"
            className="h-12 w-12 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700"
            aria-label="Update"
            onClick={() => {
              try {
                window.open("/faq", "_blank", "noopener,noreferrer");
              } catch {
                setLocation("/faq");
              }
            }}
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
        </div>

        <Dialog
          open={supportOpen}
          onOpenChange={(open) => {
            setSupportOpen(open);
            if (!open) {
              setSupportMessage("");
              setSupportVideo(null);
              setSupportFiles([]);
              if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{supportKind === "feedback" ? "Feedback" : "Report"}</DialogTitle>
              <DialogDescription>
                {supportKind === "feedback"
                  ? "Share product feedback or suggestions."
                  : "Report a bug or issue you faced. Attach video/screenshots if possible."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Message</Label>
                <Textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  placeholder={supportKind === "feedback" ? "Write your feedback..." : "Describe the issue and steps to reproduce..."}
                />
              </div>

              {/* <div className="space-y-1.5">
                <Label>Video (optional)</Label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    if (f && f.size > SUPPORT_MAX_VIDEO_BYTES) {
                      toast({
                        title: "Video too large",
                        description: "Max video size is 2MB.",
                        variant: "destructive",
                      });
                      setSupportVideo(null);
                      return;
                    }
                    setSupportVideo(f);
                  }}
                />
              </div> */}

              <div className="space-y-1.5">
                <Label>Attachments (optional)</Label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={supportAttachmentsInputRef}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const nonImage = files.find((f) => !String(f?.type ?? "").toLowerCase().startsWith("image/"));
                    if (nonImage) {
                      toast({
                        title: "Invalid attachment",
                        description: "Only image attachments are allowed.",
                        variant: "destructive",
                      });
                      setSupportFiles([]);
                      if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
                      return;
                    }
                    const bad = files.find((f) => f.size > SUPPORT_MAX_IMAGE_BYTES);
                    if (bad) {
                      toast({
                        title: "Image too large",
                        description: "Each image attachment must be 100KB or less.",
                        variant: "destructive",
                      });
                      setSupportFiles([]);
                      if (supportAttachmentsInputRef.current) supportAttachmentsInputRef.current.value = "";
                      return;
                    }
                    setSupportFiles(files);
                  }}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSupportOpen(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={submitSupport} disabled={supportSubmitting}>
                {supportSubmitting ? "Submitting..." : "Submit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}