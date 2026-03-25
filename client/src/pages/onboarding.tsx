import { useState, useCallback, useEffect, useMemo, useRef, type ChangeEvent } from "react";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DateCalendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import skillsData from "@/data/skills.json";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check, UploadCloud, PlayCircle, ZoomIn, ZoomOut, RotateCw, X, FileText, Trash2, Plus, Loader2, MapPin, Laptop, Globe, Calendar as CalendarIcon } from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import Cropper from "react-easy-crop";
import * as faceapi from "face-api.js";
import { countryCodes } from "@shared/schema";
import cityStatePincode from "@/data/cityStatePincode.json";
import findternLogo from "@assets/logo.png";

const steps = [
  "About Me",
  "Academics",
  "Experience",
  "Skills",
  "Languages",
  "Extracurricular",
  "Location Preferences",
  "Profile Preview",
] as const;

const ENABLE_PROFILE_BIO = false;
const ENABLE_PROFILE_INTRO_VIDEO = false;

type AboutMeForm = {
  firstName: string;
  lastName: string;
  phoneCountryCode: string;
  phone: string;
  emergencyCountryCode: string;
  emergencyPhone: string;
  secondPocCountryCode: string;
  secondPocPhone: string;
  email: string;
  linkedinUrl: string;
  location: string;
  bio: string;
  state: string;
  city: string;
  aadhaarNumber: string;
  panNumber: string;
  profilePhoto?: File | null;
  introVideo?: File | null;
  aadhaarImage?: File | null;
  panImage?: File | null;
};

type AboutMeErrors = Partial<
  Record<keyof Omit<AboutMeForm, "profilePhoto" | "introVideo" | "aadhaarImage" | "panImage"> | "profileMedia" | "aadhaarImage" | "panImage", string>
>;

type LocationPreferencesState = {
  locationTypes: string[];
  preferredLocations: string[];
  hasLaptop: string;
};

 function phoneDigits(value: string) {
   return String(value ?? "").replace(/\D/g, "");
 }



 function isRejectedPhoneSequence(digits: string) {
   const d = String(digits ?? "");
   if (d.length !== 10) return true;
   if (/^(\d)\1{9}$/.test(d)) return true;
   const asc = "01234567890123456789";
   const desc = "98765432109876543210";
   if (asc.includes(d) || desc.includes(d)) return true;
   return false;
 }

 function isValidPhoneNumber(value: string) {
   const d = phoneDigits(value);
   if (d.length !== 10) return false;
   if (isRejectedPhoneSequence(d)) return false;
   return true;
 }

export default function OnboardingPage() {
  const [, setLocation] = useLocation();
  const [activeStep, setActiveStep] = useState<number>(0);
  const isEditMode = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("edit") === "1";
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [previewReturnArmed, setPreviewReturnArmed] = useState(false);
  const [backendDocuments, setBackendDocuments] = useState<any | null>(null);
  const aboutMeNameTouchedRef = useRef(false);
  const [skillsLocked, setSkillsLocked] = useState(false);
  const [skillsLockedByAiInterview, setSkillsLockedByAiInterview] = useState(false);
  const [aboutMe, setAboutMe] = useState<AboutMeForm>({
    firstName: "",
    lastName: "",
    phoneCountryCode: "+91",
    phone: "",
    emergencyCountryCode: "+91",
    emergencyPhone: "",
    secondPocCountryCode: "+91",
    secondPocPhone: "",
    email: "",
    linkedinUrl: "",
    location: "",
    bio: "",
    state: "",
    city: "",
    aadhaarNumber: "",
    panNumber: "",
    profilePhoto: null,
    introVideo: null,
    aadhaarImage: null,
    panImage: null,
  });
  const [aboutMeErrors, setAboutMeErrors] = useState<AboutMeErrors>({});
  const [aboutMePhoneDupChecked, setAboutMePhoneDupChecked] = useState<{ phone: string; isDuplicate: boolean } | null>(null);
  const [academicsComplete, setAcademicsComplete] = useState(false);
  const [experienceComplete, setExperienceComplete] = useState(true); // Step 2 is optional (can skip)
  const [skills, setSkills] = useState<SkillEntry[]>([]);
  const [skillsStepComplete, setSkillsStepComplete] = useState(false);
  const [locationPrefs, setLocationPrefs] = useState<LocationPreferencesState>({
    locationTypes: [],
    preferredLocations: [],
    hasLaptop: "",
  });
  const [languagesComplete, setLanguagesComplete] = useState(false);
  const [locationPrefsComplete, setLocationPrefsComplete] = useState(false);
  const [academicsData, setAcademicsData] = useState<any>(null);
  const [experienceData, setExperienceData] = useState<any[]>([]);
  const [languagesData, setLanguagesData] = useState<any[]>([]);
  const [extracurricularData, setExtracurricularData] = useState<any[]>([]);
  const { toast } = useToast();

  const normalizeSkills = useCallback((raw: unknown): SkillEntry[] => {
    const arr = Array.isArray(raw) ? raw : [];
    const next: SkillEntry[] = [];

    for (const item of arr) {
      if (typeof item === "string") {
        const name = item.trim();
        if (!name) continue;
        next.push({ id: `skill-${Date.now()}-${Math.random()}`, name, rating: 1 });
        continue;
      }

      if (item && typeof item === "object") {
        const anyItem: any = item;
        const name = String(anyItem?.name ?? anyItem?.skill ?? anyItem?.title ?? "").trim();
        if (!name) continue;

        const ratingNum = Number(anyItem?.rating);
        const rating = Number.isFinite(ratingNum) && ratingNum > 0 ? ratingNum : 1;
        const id = String(anyItem?.id ?? "").trim() || `skill-${Date.now()}-${Math.random()}`;
        next.push({ id, name, rating });
      }
    }

    return next;
  }, []);

  const openOnboardingMediaDb = useCallback((): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("findternOnboarding", 1);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("media")) {
          db.createObjectStore("media", { keyPath: "key" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  const saveMediaToDb = useCallback(
    async (
      key: "profilePhoto" | "introVideo" | "aadhaarImage" | "panImage",
      file: File
    ) => {
      const db = await openOnboardingMediaDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("media", "readwrite");
        const store = tx.objectStore("media");
        store.put({
          key,
          blob: file,
          name: file.name,
          type: file.type,
          lastModified: file.lastModified,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    [openOnboardingMediaDb]
  );

  const removeMediaFromDb = useCallback(
    async (key: "profilePhoto" | "introVideo" | "aadhaarImage" | "panImage") => {
      const db = await openOnboardingMediaDb();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("media", "readwrite");
        tx.objectStore("media").delete(key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
      db.close();
    },
    [openOnboardingMediaDb]
  );

  const loadMediaFromDb = useCallback(
    async (key: "profilePhoto" | "introVideo" | "aadhaarImage" | "panImage") => {
      const db = await openOnboardingMediaDb();
      const record = await new Promise<any | null>((resolve, reject) => {
        const tx = db.transaction("media", "readonly");
        const request = tx.objectStore("media").get(key);
        request.onsuccess = () => resolve(request.result ?? null);
        request.onerror = () => reject(request.error);
      });
      db.close();

      if (!record?.blob) return null;
      const blob: Blob = record.blob;
      return new File([blob], record.name || key, {
        type: record.type || blob.type || "application/octet-stream",
        lastModified: record.lastModified || Date.now(),
      });
    },
    [openOnboardingMediaDb]
  );

  useEffect(() => {
    const raw = localStorage.getItem("onboardingDraft");
    if (!raw) {
      setDraftHydrated(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        aboutMe?: Partial<AboutMeForm>;
        academicsData?: any;
        experienceData?: any[];
        skills?: SkillEntry[];
        locationPrefs?: LocationPreferencesState;
        languagesData?: any[];
        extracurricularData?: any[];
        academicsComplete?: boolean;
        experienceComplete?: boolean;
        skillsStepComplete?: boolean;
        languagesComplete?: boolean;
        locationPrefsComplete?: boolean;
      };

      if (parsed.aboutMe) {
        const cleanedAboutMe: any = { ...(parsed.aboutMe as any) };
        delete cleanedAboutMe.bankName;
        delete cleanedAboutMe.bankAccountHolderName;
        delete cleanedAboutMe.bankAccountNumber;
        delete cleanedAboutMe.bankIfscCode;
        setAboutMe((prev) => ({
          ...prev,
          ...cleanedAboutMe,
          profilePhoto: prev.profilePhoto ?? null,
          introVideo: prev.introVideo ?? null,
          aadhaarImage: prev.aadhaarImage ?? null,
          panImage: prev.panImage ?? null,
        }));
      }
      if (parsed.academicsData !== undefined) setAcademicsData(parsed.academicsData);
      if (parsed.experienceData) setExperienceData(parsed.experienceData);
      if (parsed.skills) setSkills(normalizeSkills(parsed.skills));
      if (parsed.locationPrefs) setLocationPrefs(parsed.locationPrefs);
      if (parsed.languagesData) setLanguagesData(parsed.languagesData);
      if (parsed.extracurricularData) setExtracurricularData(parsed.extracurricularData);

      if (typeof parsed.academicsComplete === "boolean") setAcademicsComplete(parsed.academicsComplete);
      if (typeof parsed.experienceComplete === "boolean") setExperienceComplete(parsed.experienceComplete);
      if (typeof parsed.skillsStepComplete === "boolean") setSkillsStepComplete(parsed.skillsStepComplete);
      if (typeof parsed.languagesComplete === "boolean") setLanguagesComplete(parsed.languagesComplete);
      if (typeof parsed.locationPrefsComplete === "boolean") setLocationPrefsComplete(parsed.locationPrefsComplete);
    } catch {
      localStorage.removeItem("onboardingDraft");
    } finally {
      setDraftHydrated(true);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const [profilePhoto, introVideo, aadhaarImage, panImage] = await Promise.all([
          loadMediaFromDb("profilePhoto"),
          loadMediaFromDb("introVideo"),
          loadMediaFromDb("aadhaarImage"),
          loadMediaFromDb("panImage"),
        ]);

        if (!isMounted) return;

        setAboutMe((prev) => ({
          ...prev,
          profilePhoto: prev.profilePhoto ?? profilePhoto,
          introVideo: prev.introVideo ?? introVideo,
          aadhaarImage: prev.aadhaarImage ?? aadhaarImage,
          panImage: prev.panImage ?? panImage,
        }));
      } catch {
        // ignore
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadMediaFromDb]);

  useEffect(() => {
    if (!draftHydrated) return;
    const { profilePhoto, introVideo, aadhaarImage, panImage, ...aboutMeDraft } = aboutMe;
    const draft = {
      aboutMe: aboutMeDraft,
      academicsData,
      experienceData,
      skills,
      locationPrefs,
      languagesData,
      extracurricularData,
      academicsComplete,
      experienceComplete,
      skillsStepComplete,
      languagesComplete,
      locationPrefsComplete,
    };
    localStorage.setItem("onboardingDraft", JSON.stringify(draft));
  }, [
    draftHydrated,
    aboutMe,
    academicsData,
    experienceData,
    skills,
    locationPrefs,
    languagesData,
    extracurricularData,
    academicsComplete,
    experienceComplete,
    skillsStepComplete,
    languagesComplete,
    locationPrefsComplete,
  ]);

  useEffect(() => {
    const raw = localStorage.getItem("onboardingActiveStep");
    if (!raw) return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    const next = Math.max(0, Math.min(steps.length - 1, Math.floor(parsed)));
    setActiveStep(next);
  }, []);

  useEffect(() => {
    localStorage.setItem("onboardingActiveStep", String(activeStep));
  }, [activeStep]);

  useEffect(() => {
    let cancelled = false;

    const shouldLockSkills = (onboarding: any) => {
      const ratings = onboarding?.extraData?.ratings;
      if (!ratings || typeof ratings !== "object") return false;
      const adminKeys = new Set(["communication", "coding", "aptitude", "interview", "overall", "academic"]);
      return Object.entries(ratings).some(
        ([k, v]: any) => adminKeys.has(String(k)) && typeof v === "number" && Number.isFinite(v) && v > 0,
      );
    };

    const hydrateFromUser = (user: any) => {
      if (!user) return;

       const candidatePhone = String(user.phoneNumber ?? "");
       const candidatePhoneCountry = String(user.countryCode ?? "");
       const nextPhone = candidatePhone && isValidPhoneNumber(candidatePhone) ? candidatePhone : "";

      setAboutMe((prev) => {
        const shouldOverrideName = !aboutMeNameTouchedRef.current;
        return {
          ...prev,
          firstName: shouldOverrideName ? (user.firstName || "") : prev.firstName,
          lastName: shouldOverrideName ? (user.lastName || "") : prev.lastName,
          email: user.email || prev.email || "",
          phoneCountryCode: candidatePhoneCountry || prev.phoneCountryCode || "+91",
          phone: nextPhone || prev.phone,
        };
      });
    };

    const hydrateFromOnboarding = (onboarding: any) => {
      if (!onboarding) return;

      setSkillsLocked(shouldLockSkills(onboarding));

      setAboutMe((prev) => ({
        ...prev,
        linkedinUrl: prev.linkedinUrl || onboarding.linkedinUrl || "",
        bio: prev.bio || onboarding.bio || onboarding.previewSummary || "",
        state: prev.state || onboarding.state || "",
        city: prev.city || onboarding.city || "",
        aadhaarNumber: prev.aadhaarNumber || onboarding.aadhaarNumber || "",
        panNumber: prev.panNumber || onboarding.panNumber || "",
        emergencyCountryCode:
          prev.emergencyCountryCode || String(onboarding?.extraData?.emergencyCountryCode ?? "") || "+91",
        emergencyPhone: prev.emergencyPhone || String(onboarding?.extraData?.emergencyPhone ?? "") || "",
        secondPocCountryCode:
          prev.secondPocCountryCode || String(onboarding?.extraData?.secondPocCountryCode ?? "") || "+91",
        secondPocPhone: prev.secondPocPhone || String(onboarding?.extraData?.secondPocPhone ?? "") || "",
      }));

      setAcademicsData((prev: any) => (prev ?? onboarding?.extraData?.academics ?? null));

      setExperienceData((prev) => {
        if (Array.isArray(prev) && prev.length > 0) return prev;
        const normalizeMonth = (v: any) => {
          const raw = String(v ?? "").trim();
          if (!raw) return "";
          if (/^\d{4}-\d{2}$/.test(raw)) return raw;
          const mmyyyy = raw.match(/^(\d{1,2})\/(\d{4})$/);
          if (mmyyyy) {
            const mm = String(mmyyyy[1]).padStart(2, "0");
            return `${mmyyyy[2]}-${mm}`;
          }
          if (raw.toLowerCase() === "present") return "Present";
          return raw;
        };

        const list = Array.isArray(onboarding.experienceJson) ? onboarding.experienceJson : [];
        return list.map((e: any) => ({
          ...e,
          from: normalizeMonth(e?.from),
          to: normalizeMonth(e?.to),
        }));
      });

      setSkills(normalizeSkills(onboarding.skills));

      setLanguagesData((prev) => {
        if (Array.isArray(prev) && prev.length > 0) return prev;
        const langs = onboarding?.extraData?.languages;
        return Array.isArray(langs) ? langs : [];
      });

      setExtracurricularData((prev) => {
        if (Array.isArray(prev) && prev.length > 0) return prev;
        const list = onboarding?.extraData?.extracurricular;
        return Array.isArray(list) ? list : [];
      });

      setLocationPrefs((prev) => {
        const hasExisting =
          (Array.isArray(prev.locationTypes) && prev.locationTypes.length > 0) ||
          (Array.isArray(prev.preferredLocations) && prev.preferredLocations.length > 0) ||
          !!prev.hasLaptop;
        if (hasExisting) return prev;

        return {
          locationTypes: Array.isArray(onboarding.locationTypes) ? onboarding.locationTypes : [],
          preferredLocations: Array.isArray(onboarding.preferredLocations) ? onboarding.preferredLocations : [],
          hasLaptop: typeof onboarding.hasLaptop === "boolean" ? (onboarding.hasLaptop ? "yes" : "no") : "",
        };
      });

      if (onboarding?.extraData?.academics) setAcademicsComplete(true);
      if (Array.isArray(onboarding?.skills) && onboarding.skills.length > 0) setSkillsStepComplete(true);
      if (Array.isArray(onboarding?.extraData?.languages) && onboarding.extraData.languages.length > 0) setLanguagesComplete(true);

      const locTypes = Array.isArray(onboarding?.locationTypes) ? onboarding.locationTypes : [];
      const prefLocs = Array.isArray(onboarding?.preferredLocations) ? onboarding.preferredLocations : [];
      const hasLaptopStr = typeof onboarding?.hasLaptop === "boolean" ? (onboarding.hasLaptop ? "yes" : "no") : "";
      if (locTypes.length > 0 && prefLocs.length > 0 && hasLaptopStr) setLocationPrefsComplete(true);
    };

    (async () => {
      try {
        const userId = localStorage.getItem("userId");
        const userEmail = localStorage.getItem("userEmail");

        if (userId) {
          try {
            const res = await apiRequest("GET", `/api/onboarding/${encodeURIComponent(userId)}`);
            const data = await res.json();
            if (cancelled) return;
            hydrateFromUser(data?.user);
            setBackendDocuments(data?.intern_document ?? null);

            setSkillsLocked(shouldLockSkills(data?.onboarding));

            try {
              const iRes = await fetch(`/api/intern/${encodeURIComponent(userId)}/interviews`, {
                credentials: "include",
              });
              if (iRes.ok) {
                const iJson = await iRes.json().catch(() => null);
                const interviews = Array.isArray(iJson?.interviews) ? iJson.interviews : [];
                const ai = interviews.find((i: any) => String(i?.employerId ?? "").trim().toLowerCase() === "admin");

                const rawStatus = String((ai as any)?.status ?? "").trim().toLowerCase();
                const selectedSlot = (ai as any)?.selectedSlot;
                const nowMs = Date.now();

                const effectiveStatus = (() => {
                  const isScheduled = rawStatus === "scheduled" && Boolean(selectedSlot);
                  if (isScheduled) {
                    const selectedKey = `slot${selectedSlot}`;
                    const slotValue = (ai as any)?.[selectedKey];
                    if (!slotValue) return "scheduled";
                    const t = new Date(slotValue);
                    if (Number.isNaN(t.getTime())) return "scheduled";
                    return nowMs > t.getTime() ? "completed" : "scheduled";
                  }

                  if (!selectedSlot) {
                    const slots = [(ai as any)?.slot1, (ai as any)?.slot2, (ai as any)?.slot3]
                      .map((v: any) => {
                        if (!v) return null;
                        const d = new Date(v);
                        if (Number.isNaN(d.getTime())) return null;
                        return d;
                      })
                      .filter(Boolean) as Date[];
                    if (slots.length > 0) {
                      const latest = Math.max(...slots.map((d) => d.getTime()));
                      if (nowMs > latest) return "expired";
                    }
                    return rawStatus || "sent";
                  }

                  if (rawStatus === "completed") return "completed";
                  if (rawStatus === "expired") return "expired";
                  return rawStatus || "sent";
                })();

                setSkillsLockedByAiInterview(Boolean(ai) && !["completed", "expired"].includes(effectiveStatus));
              } else {
                setSkillsLockedByAiInterview(false);
              }
            } catch {
              setSkillsLockedByAiInterview(false);
            }

            if (isEditMode) hydrateFromOnboarding(data?.onboarding);
            return;
          } catch (err) {
            console.log("Unable to hydrate user from /api/onboarding/:userId, falling back to email.", err);
          }
        }

        if (userEmail) {
          const res = await apiRequest(
            "GET",
            `/api/auth/user/by-email/${encodeURIComponent(userEmail)}`,
          );
          const data = await res.json();
          if (cancelled) return;
          hydrateFromUser(data?.user);
        }
      } catch (err) {
        console.log("Unable to hydrate user details for onboarding.", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const userId = localStorage.getItem("userId");
    if (userId) return;

    const signupFirstName = localStorage.getItem("signupFirstName") || "";
    const signupLastName = localStorage.getItem("signupLastName") || "";
    const signupCountryCode = localStorage.getItem("signupCountryCode") || "+91";
    const signupPhoneNumber = localStorage.getItem("signupPhoneNumber") || "";
    const userEmail = localStorage.getItem("userEmail") || "";

     const nextSignupPhone = signupPhoneNumber && isValidPhoneNumber(signupPhoneNumber) ? signupPhoneNumber : "";

    setAboutMe((prev) => ({
      ...prev,
      firstName: prev.firstName || signupFirstName,
      lastName: prev.lastName || signupLastName,
      phoneCountryCode: prev.phoneCountryCode || signupCountryCode,
      phone: prev.phone || nextSignupPhone,
      email: prev.email || userEmail,
    }));
  }, []);

  const handleAboutMeChange = (field: keyof AboutMeForm, value: string | File | null) => {
    if (field === "firstName" || field === "lastName") {
      aboutMeNameTouchedRef.current = true;
    }
    setAboutMe((prev) => ({
      ...prev,
      [field]: value,
    }));

    if (
      field === "profilePhoto" ||
      field === "introVideo" ||
      field === "aadhaarImage" ||
      field === "panImage"
    ) {
      const key = field;
      const fileValue = value instanceof File ? value : null;
      if (fileValue) {
        saveMediaToDb(key, fileValue).catch(() => {
          // ignore
        });
      } else {
        removeMediaFromDb(key).catch(() => {
          // ignore
        });
      }
    }

    // Clear error as user types/changes media
    if (field in aboutMeErrors) {
      setAboutMeErrors((prev) => {
        const updated = { ...prev };
        delete (updated as Record<string, string>)[field as string];
        return updated;
      });
    }
    if ((field === "phone" || field === "phoneCountryCode" || field === "emergencyPhone" || field === "emergencyCountryCode") &&
      (aboutMeErrors as any).secondPocPhone) {
      setAboutMeErrors((prev) => {
        const updated = { ...prev };
        delete (updated as Record<string, string>)['secondPocPhone'];
        return updated;
      });
    }
    if ((field === "profilePhoto" || field === "introVideo") && aboutMeErrors.profileMedia) {
      setAboutMeErrors((prev) => {
        const updated = { ...prev };
        delete (updated as Record<string, string>)["profileMedia"];
        return updated;
      });
    }
    if (field === "aadhaarImage" && aboutMeErrors.aadhaarImage) {
      setAboutMeErrors((prev) => {
        const updated = { ...prev };
        delete (updated as Record<string, string>)["aadhaarImage"];
        return updated;
      });
    }
    if (field === "panImage" && aboutMeErrors.panImage) {
      setAboutMeErrors((prev) => {
        const updated = { ...prev };
        delete (updated as Record<string, string>)["panImage"];
        return updated;
      });
    }
  };

  const validateAboutMe = (): boolean => {
    const errors = computeAboutMeErrors();
    setAboutMeErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const computeAboutMeErrors = (): AboutMeErrors => {
    const errors: AboutMeErrors = {};

    if (!aboutMe.firstName.trim()) errors.firstName = "First name is required";
    if (!aboutMe.lastName.trim()) errors.lastName = "Last name is required";

    if (!aboutMe.phone.trim()) {
      errors.phone = "Phone number is required";
    } else if (!isValidPhoneNumber(aboutMe.phone)) {
      errors.phone = "Enter a valid 10 digit phone number";
    } else if (aboutMePhoneDupChecked?.phone === aboutMe.phone && aboutMePhoneDupChecked?.isDuplicate) {
      errors.phone = "Phone number is already in use";
    }

    if (aboutMe.emergencyPhone.trim()) {
      const phoneD = phoneDigits(aboutMe.phone);
      const emergencyD = phoneDigits(aboutMe.emergencyPhone);
      const sameCode =
        String(aboutMe.phoneCountryCode ?? "").trim() === String(aboutMe.emergencyCountryCode ?? "").trim();

      if (
        sameCode &&
        phoneD.length === 10 &&
        emergencyD.length === 10 &&
        isValidPhoneNumber(phoneD) &&
        isValidPhoneNumber(emergencyD) &&
        phoneD === emergencyD
      ) {
        errors.emergencyPhone = "Emergency contact number must be different from phone number";
      } else if (!isValidPhoneNumber(aboutMe.emergencyPhone)) {
        errors.emergencyPhone = "Enter a valid 10 digit emergency contact number";
      }
    }

    if (aboutMe.secondPocPhone.trim()) {
      const phoneD = phoneDigits(aboutMe.phone);
      const emergencyD = phoneDigits(aboutMe.emergencyPhone);
      const secondD = phoneDigits(aboutMe.secondPocPhone);

      const samePrimaryCode =
        String(aboutMe.phoneCountryCode ?? "").trim() === String(aboutMe.secondPocCountryCode ?? "").trim();
      const sameEmergencyCode =
        String(aboutMe.emergencyCountryCode ?? "").trim() === String(aboutMe.secondPocCountryCode ?? "").trim();

      if (!isValidPhoneNumber(aboutMe.secondPocPhone)) {
        (errors as any).secondPocPhone = "Enter a valid 10 digit second POC number";
      } else if (samePrimaryCode && phoneD && secondD && phoneD === secondD) {
        (errors as any).secondPocPhone = "Second POC number must be different from phone number";
      } else if (aboutMe.emergencyPhone.trim() && sameEmergencyCode && emergencyD && secondD && emergencyD === secondD) {
        (errors as any).secondPocPhone = "Second POC number must be different from emergency contact number";
      }
    }

    if (!aboutMe.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(aboutMe.email)) {
      errors.email = "Enter a valid email address";
    }

    if (aboutMe.linkedinUrl.trim()) {
      const urlPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/.+/i;
      if (!urlPattern.test(aboutMe.linkedinUrl.trim())) {
        errors.linkedinUrl = "Enter a valid LinkedIn profile URL";
      }
    }

    if (!aboutMe.state.trim()) {
      errors.state = "State is required";
    }

    if (!aboutMe.city.trim()) {
      errors.city = "City is required";
    }

    const aadhaarDigits = aboutMe.aadhaarNumber.replace(/\D/g, "");
    if (!aadhaarDigits) {
      errors.aadhaarNumber = "Aadhaar number is required";
    } else if (!/^\d{12}$/.test(aadhaarDigits)) {
      errors.aadhaarNumber = "Aadhaar number must be 12 digits";
    }

    const panValue = aboutMe.panNumber.trim().toUpperCase();
    if (!panValue) {
      errors.panNumber = "PAN number is required";
    } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panValue)) {
      errors.panNumber = "PAN format should be like ABCDE1234F";
    }

    const aadhaarNorm = String(aboutMe.aadhaarNumber ?? "")
      .replace(/\s+/g, "")
      .trim()
      .toUpperCase();
    const panNorm = String(aboutMe.panNumber ?? "")
      .replace(/\s+/g, "")
      .trim()
      .toUpperCase();
    if (aadhaarNorm && panNorm && aadhaarNorm === panNorm) {
      errors.aadhaarNumber = "Aadhaar and PAN number cannot be the same";
      errors.panNumber = "Aadhaar and PAN number cannot be the same";
    }

    if (!aboutMe.profilePhoto && !String(backendDocuments?.profilePhotoName ?? "").trim()) {
      errors.profileMedia = "Add a profile photo so companies can recognise you faster";
    }

    if (!aboutMe.panImage && !String(backendDocuments?.panImageName ?? "").trim()) {
      errors.panImage = "Upload your PAN image";
    }

    return errors;
  };

  const aboutMeIsValid = useMemo(() => {
    if (activeStep !== 0) return true;
    const errors = computeAboutMeErrors();
    return Object.keys(errors).length === 0;
  }, [activeStep, aboutMe, backendDocuments, aboutMePhoneDupChecked]);

  const aboutMeIsValidGlobal = useMemo(() => {
    const errors = computeAboutMeErrors();
    return Object.keys(errors).length === 0;
  }, [aboutMe, backendDocuments, aboutMePhoneDupChecked]);

  const validateExperience = (experiences: any[]): boolean => {
    // Experience step is optional - can be skipped
    // If user has started filling any experience, all fields in that experience must be filled
    if (experiences.length === 0) return true; // Empty is valid (skip)

    // If any experience has any field filled, all fields must be filled
    return experiences.every((exp) => {
      const hasAnyField = exp.type || exp.company || exp.role || exp.from || exp.to || exp.description;
      if (!hasAnyField) return true; // Empty experience is valid
      // If any field is filled, all must be filled
      if (!(exp.type && exp.company && exp.role && exp.from && exp.to && exp.description)) return false;

      const isValidMonth = (v: string) => /^\d{4}-\d{2}$/.test(String(v || "").trim());
      const fromOk = isValidMonth(exp.from);
      const toRaw = String(exp.to || "").trim();
      const toOk = toRaw.toLowerCase() === "present" || isValidMonth(toRaw);
      return fromOk && toOk;
    });
  };

  const focusFirstInvalidField = useCallback(() => {
    if (typeof document === "undefined") return;
    const el = document.querySelector<HTMLElement>(
      "input.border-destructive, textarea.border-destructive, button.border-destructive, [data-invalid='true']"
    );
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      // ignore
    }
    try {
      (el as any)?.focus?.();
    } catch {
      // ignore
    }
  }, []);

  const canLeaveCurrentStep = useCallback(() => {
    if (activeStep === 0) {
      const ok = validateAboutMe();
      if (!ok) {
        toast({
          title: "Complete required fields",
          description: "Please fill all required fields in About Me before continuing.",
          variant: "destructive",
        });
        focusFirstInvalidField();
        return false;
      }
    }
    if (activeStep === 1 && !academicsComplete) {
      toast({
        title: "Complete required fields",
        description: "Please complete Academics before continuing.",
        variant: "destructive",
      });
      focusFirstInvalidField();
      return false;
    }
    if (activeStep === 2 && !experienceComplete) {
      toast({
        title: "Complete required fields",
        description: "Please complete the Experience details you started before continuing.",
        variant: "destructive",
      });
      focusFirstInvalidField();
      return false;
    }
    if (activeStep === 3 && !skillsStepComplete) {
      toast({
        title: "Select at least 1 skill",
        description: "Please add at least one skill before continuing.",
        variant: "destructive",
      });
      return false;
    }
    if (activeStep === 4 && !languagesComplete) {
      toast({
        title: "Complete required fields",
        description: "Please add your languages before continuing.",
        variant: "destructive",
      });
      focusFirstInvalidField();
      return false;
    }
    if (activeStep === 6 && !locationPrefsComplete) {
      toast({
        title: "Complete required fields",
        description: "Please complete location preferences before continuing.",
        variant: "destructive",
      });
      focusFirstInvalidField();
      return false;
    }
    return true;
  }, [activeStep, academicsComplete, experienceComplete, focusFirstInvalidField, languagesComplete, locationPrefsComplete, skillsStepComplete, toast]);

  const allRequiredStepsComplete = useMemo(() => {
    return aboutMeIsValidGlobal && academicsComplete && experienceComplete && skillsStepComplete && languagesComplete && locationPrefsComplete;
  }, [aboutMeIsValidGlobal, academicsComplete, experienceComplete, skillsStepComplete, languagesComplete, locationPrefsComplete]);

  const attemptNavigateToStep = useCallback(
    (nextIndex: number) => {
      if (nextIndex === activeStep) return;
      if (nextIndex < activeStep) {
        if (activeStep === steps.length - 1 && nextIndex < steps.length - 1) {
          setPreviewReturnArmed(true);
        }
        setActiveStep(nextIndex);
        return;
      }

      const ok = canLeaveCurrentStep();
      if (!ok) return;

      if (nextIndex === steps.length - 1 && !allRequiredStepsComplete) {
        toast({
          title: "Complete required fields",
          description: "Please complete all required steps before viewing the profile preview.",
          variant: "destructive",
        });
        return;
      }

      if (activeStep === steps.length - 1 && nextIndex < steps.length - 1) {
        setPreviewReturnArmed(true);
      }
      setActiveStep(nextIndex);
    },
    [activeStep, allRequiredStepsComplete, canLeaveCurrentStep, toast]
  );

  const goNext = () => {
    // Validate step 0 (About Me) when clicking next
    if (activeStep === 0) {
      const ok = validateAboutMe();
      if (!ok) return;
    }
    // Step 1 (Academics) - require main fields
    if (activeStep === 1 && !academicsComplete) {
      return;
    }
    // Step 2 (Experience) - validate if any experience is started
    if (activeStep === 2 && !experienceComplete) {
      return;
    }
    // Step 3 (Skills) - require at least one skill
    if (activeStep === 3 && !skillsStepComplete) {
      return;
    }

    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const skipStep = () => {
    setActiveStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const goBack = () => {
    if (previewReturnArmed && activeStep !== steps.length - 1) {
      setActiveStep(steps.length - 1);
      setPreviewReturnArmed(false);
      return;
    }
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/60 px-3 md:px-6 py-4 md:py-6">
      {/* Top navigation with logo */}
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 pb-3 md:pb-4">
        <button
          type="button"
          className="flex items-center gap-3"
        >
          <img
            src={findternLogo}
            alt="Findtern - Internship Simplified"
            className="h-16 w-auto md:h-20"
          />
        </button>
        <Badge variant="outline" className="hidden md:inline-flex text-[11px] font-medium">
          Step {activeStep + 1} of {steps.length}
        </Badge>
      </header>

      {/* Stepper */}
      <div className="mx-auto mb-4 md:mb-6 flex max-w-5xl flex-col gap-3">
        <div className="flex items-center justify-start gap-2 overflow-x-auto md:overflow-x-visible rounded-full bg-card/80 px-3 py-2 shadow-sm">
          {steps.map((label, index) => {
            const isCompleted = index < activeStep;
            const isActive = index === activeStep;
            const isPreviewStep = index === steps.length - 1;
            const isPreviewDisabled = isPreviewStep && !allRequiredStepsComplete;

            return (
              <button
                key={label}
                type="button"
                disabled={isPreviewDisabled}
                className={`flex min-w-[80px] flex-1 items-center gap-2 rounded-full px-2 py-1.5 text-xs md:text-[13px] transition-colors ${isPreviewDisabled
                  ? "opacity-50 cursor-not-allowed"
                  : ""
                  } ${isActive
                  ? "text-white"
                  : isCompleted
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                  }`}
                style={isActive ? { backgroundColor: '#0E6049' } : {}}
                onClick={() => {
                  // Allow going back freely, but prevent skipping ahead beyond current step
                  if (isPreviewDisabled) return;
                  if (isEditMode || index <= activeStep) {
                    attemptNavigateToStep(index);
                    return;
                  }
                }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/40 bg-white/10 text-[11px]">
                  {isCompleted ? <Check className="h-3 w-3" /> : index + 1}
                </span>
                <span className="truncate text-left">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <main className="mx-auto max-w-5xl">
        <Card className="border border-card-border/80 bg-card/95 shadow-xl rounded-2xl p-4 md:p-6">
          {activeStep === 0 && (
            <StepAboutMe
              form={aboutMe}
              errors={aboutMeErrors}
              onChange={handleAboutMeChange}
              onPhoneDupChecked={setAboutMePhoneDupChecked}
              existingDocuments={backendDocuments}
            />
          )}
          {activeStep === 1 && (
            <StepAcademics
              initialData={academicsData}
              onValidityChange={setAcademicsComplete}
              onDataChange={setAcademicsData}
            />
          )}
          {activeStep === 2 && (
            <StepExperience
              initialData={experienceData}
              onValidityChange={setExperienceComplete}
              onDataChange={setExperienceData}
            />
          )}
          {activeStep === 3 && (
            <StepSkills
              skills={skills}
              locked={skillsLocked || skillsLockedByAiInterview}
              onSkillsChange={(nextSkills, complete) => {
                setSkills(nextSkills);
                setSkillsStepComplete(complete);
              }}
            />
          )}
          {activeStep === 4 && (
            <StepLanguages
              initialData={languagesData}
              onValidityChange={setLanguagesComplete}
              onDataChange={setLanguagesData}
            />
          )}
          {activeStep === 5 && (
            <StepExtraCurricular initialData={extracurricularData} onDataChange={setExtracurricularData} />
          )}
          {activeStep === 6 && (
            <StepLocationPreferences
              state={locationPrefs}
              onChange={setLocationPrefs}
              onValidityChange={setLocationPrefsComplete}
            />
          )}
          {activeStep === 7 && (
            <StepProfilePreview
              aboutMe={aboutMe}
              academicsData={academicsData}
              experienceData={experienceData}
              skills={skills}
              languagesData={languagesData}
              extracurricularData={extracurricularData}
              locationPrefs={locationPrefs}
              existingDocuments={backendDocuments}
            />
          )}
          {/* Navigation buttons */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs md:text-sm sm:w-auto"
              disabled={activeStep === 0}
              onClick={goBack}
            >
              Back
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              {activeStep === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full px-6 text-xs md:text-sm rounded-full sm:w-auto"
                  onClick={skipStep}
                >
                  Skip
                </Button>
              )}
              {activeStep < steps.length - 1 && (
                <Button
                  type="button"
                  className="w-full px-6 text-xs md:text-sm rounded-full sm:w-auto"
                  style={{ backgroundColor: '#0E6049' }}
                  disabled={
                    (activeStep === 0 && !aboutMeIsValid) ||
                    (activeStep === 1 && !academicsComplete) ||
                    (activeStep === 2 && !experienceComplete) ||
                    (activeStep === 3 && !skillsStepComplete) ||
                    (activeStep === 4 && !languagesComplete) ||
                    (activeStep === 6 && !locationPrefsComplete)
                  }
                  onClick={goNext}
                >
                  Save & Continue
                </Button>
              )}
              {activeStep === steps.length - 1 && (
                <FinishOnboardingButton
                  aboutMe={aboutMe}
                  academicsData={academicsData}
                  experienceData={experienceData}
                  skills={skills}
                  languagesData={languagesData}
                  extracurricularData={extracurricularData}
                  locationPrefs={locationPrefs}
                  languagesComplete={languagesComplete}
                  aboutMeIsValid={aboutMeIsValidGlobal}
                  isEditMode={isEditMode}
                  onSuccess={() => setLocation("/dashboard")}
                />
              )}
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 md:mb-6">
      <h2 className="text-lg md:text-xl font-semibold text-foreground mb-1">{title}</h2>
      {subtitle && <p className="text-xs md:text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function SelectedUploadCard({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const isImage = String(file?.type ?? "").startsWith("image/");
  const previewUrl = useMemo(() => {
    if (!isImage) return null;
    return URL.createObjectURL(file);
  }, [file, isImage]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 p-3">
      <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt={file.name} className="h-full w-full object-cover" />
        ) : (
          <FileText className="h-6 w-6 text-muted-foreground" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs md:text-sm font-medium text-foreground truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {(file.size / 1024).toFixed(1)} KB
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onRemove}
      >
        <X className="h-3.5 w-3.5 mr-1" />
        Remove
      </Button>
    </div>
  );
}

function SelectedUploadMetaList({
  uploads,
  onRemoveAt,
}: {
  uploads: { name: string; type: string; size: number; originalName?: string }[];
  onRemoveAt: (idx: number) => void;
}) {
  if (!Array.isArray(uploads) || uploads.length === 0) return null;

  return (
    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {uploads.map((u, idx) => {
        const isImage = String(u?.type ?? "").toLowerCase().startsWith("image/");
        const storedName = String(u?.name ?? "").trim();
        const displayName = String((u as any)?.originalName ?? "").trim() || storedName;
        const previewUrl = isImage
          ? /^https?:\/\//i.test(storedName)
            ? storedName
            : storedName.startsWith("/uploads/")
              ? storedName
              : storedName.startsWith("/")
                ? storedName
                : null
          : null;

        return (
          <div
            key={`${storedName}-${idx}`}
            className="relative group rounded-lg border border-border/80 bg-card/70 overflow-hidden hover:border-primary/50 transition-colors"
          >
            <button
              type="button"
              onClick={() => onRemoveAt(idx)}
              className="absolute top-2 right-2 z-10 h-5 w-5 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity hover:bg-destructive"
              aria-label="Remove file"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="aspect-square w-full bg-muted flex items-center justify-center overflow-hidden">
              {isImage && previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={displayName || "Uploaded file"} className="w-full h-full object-cover" />
              ) : (
                <FileText className="h-8 w-8 text-muted-foreground" />
              )}
            </div>

            <div className="p-2">
              <p className="text-[10px] md:text-xs text-foreground truncate" title={displayName}>
                {displayName}
              </p>
              <p className="text-[9px] text-muted-foreground">
                {(Number(u?.size ?? 0) / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StepAboutMe({
  form,
  errors,
  onChange,
  onPhoneDupChecked,
  existingDocuments,
}: {
  form: AboutMeForm;
  errors: AboutMeErrors;
  onChange: (field: keyof AboutMeForm, value: string | File | null) => void;
  onPhoneDupChecked?: (next: { phone: string; isDuplicate: boolean } | null) => void;
  existingDocuments?: any | null;
}) {
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [manualCityState, setManualCityState] = useState(false);
  const [profileMediaError, setProfileMediaError] = useState<string | null>(null);
  const [aadhaarImageError, setAadhaarImageError] = useState<string | null>(null);
  const [panImageError, setPanImageError] = useState<string | null>(null);
  const [faceModelsLoaded, setFaceModelsLoaded] = useState(false);

  const phoneDupCheckTimer = useRef<number | null>(null);
  const [phoneDuplicateError, setPhoneDuplicateError] = useState<string | null>(null);

  const emergencySameError = useMemo(() => {
    const phoneD = phoneDigits(form.phone);
    const emergencyD = phoneDigits(form.emergencyPhone);
    if (!phoneD || !emergencyD) return null;
    if (phoneD.length !== 10 || emergencyD.length !== 10) return null;
    if (!isValidPhoneNumber(phoneD) || !isValidPhoneNumber(emergencyD)) return null;
    const sameCode =
      String(form.phoneCountryCode ?? "").trim() === String(form.emergencyCountryCode ?? "").trim();
    if (!sameCode) return null;
    if (phoneD !== emergencyD) return null;
    return "Emergency contact number must be different from phone number";
  }, [form.emergencyCountryCode, form.emergencyPhone, form.phone, form.phoneCountryCode]);

  const secondPocSameError = useMemo(() => {
    const phoneD = phoneDigits(form.phone);
    const emergencyD = phoneDigits(form.emergencyPhone);
    const secondD = phoneDigits(form.secondPocPhone);
    if (!secondD) return null;
    if (secondD.length !== 10) return null;
    if (!isValidPhoneNumber(secondD)) return null;

    const samePrimaryCode =
      String(form.phoneCountryCode ?? "").trim() === String(form.secondPocCountryCode ?? "").trim();
    if (samePrimaryCode && phoneD && phoneD.length === 10 && isValidPhoneNumber(phoneD) && phoneD === secondD) {
      return "Second POC number must be different from phone number";
    }

    const sameEmergencyCode =
      String(form.emergencyCountryCode ?? "").trim() === String(form.secondPocCountryCode ?? "").trim();
    if (
      sameEmergencyCode &&
      emergencyD &&
      emergencyD.length === 10 &&
      isValidPhoneNumber(emergencyD) &&
      emergencyD === secondD
    ) {
      return "Second POC number must be different from emergency contact number";
    }

    return null;
  }, [
    form.emergencyCountryCode,
    form.emergencyPhone,
    form.phone,
    form.phoneCountryCode,
    form.secondPocCountryCode,
    form.secondPocPhone,
  ]);

  useEffect(() => {
    const digits = String(form.phone ?? "").replace(/\D/g, "");
    setPhoneDuplicateError(null);
    if (onPhoneDupChecked) onPhoneDupChecked(null);

    if (phoneDupCheckTimer.current) {
      window.clearTimeout(phoneDupCheckTimer.current);
      phoneDupCheckTimer.current = null;
    }

    if (!digits || digits.length !== 10) return;
    if (!isValidPhoneNumber(digits)) return;

    phoneDupCheckTimer.current = window.setTimeout(() => {
      (async () => {
        try {
          const currentUserId = typeof window !== "undefined" ? window.localStorage.getItem("userId") : null;
          const res = await fetch(`/api/users/exists/phone/${encodeURIComponent(digits)}`, { credentials: "include" });
          if (!res.ok) return;
          const json = await res.json().catch(() => null);
          const exists = Boolean(json?.exists);
          const subjectType = json?.subjectType ? String(json.subjectType) : null;
          const subjectId = json?.subjectId ? String(json.subjectId) : null;
          const ownerId = subjectType === "user" ? subjectId : null;
          const isDuplicate = exists && (!currentUserId || (ownerId !== null && ownerId !== currentUserId));
          if (isDuplicate) {
            setPhoneDuplicateError("Phone number is already in use");
          } else {
            setPhoneDuplicateError(null);
          }
          if (onPhoneDupChecked) onPhoneDupChecked({ phone: digits, isDuplicate });
        } catch {
          // ignore
        }
      })();
    }, 350);

    return () => {
      if (phoneDupCheckTimer.current) {
        window.clearTimeout(phoneDupCheckTimer.current);
        phoneDupCheckTimer.current = null;
      }
    };
  }, [form.phone]);

  useEffect(() => {
    let isMounted = true;

    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        if (isMounted) {
          setFaceModelsLoaded(true);
        }
      } catch (error) {
        console.error("Failed to load face detection models", error);
        if (isMounted) {
          setFaceModelsLoaded(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, []);

  const toUploadsUrl = useCallback((raw: string) => {
    const v = String(raw ?? "").trim();
    if (!v) return null;
    if (/^https?:\/\//i.test(v)) return v;
    if (v.startsWith("/uploads/")) return v;
    if (v.startsWith("/")) return v;
    const safePath = v
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    return `/uploads/${safePath}`;
  }, []);

  const profilePreview = form.profilePhoto
    ? URL.createObjectURL(form.profilePhoto)
    : String(existingDocuments?.profilePhotoName ?? "").trim()
      ? toUploadsUrl(String(existingDocuments?.profilePhotoName ?? "").trim())
      : null;
  const introVideoPreview =
    ENABLE_PROFILE_INTRO_VIDEO && form.introVideo
      ? URL.createObjectURL(form.introVideo)
      : ENABLE_PROFILE_INTRO_VIDEO && String(existingDocuments?.introVideoName ?? "").trim()
        ? toUploadsUrl(String(existingDocuments?.introVideoName ?? "").trim())
        : null;
  const aadhaarPreview = form.aadhaarImage
    ? URL.createObjectURL(form.aadhaarImage)
    : String(existingDocuments?.aadhaarImageName ?? "").trim()
      ? toUploadsUrl(String(existingDocuments?.aadhaarImageName ?? "").trim())
      : null;
  const panPreview = form.panImage
    ? URL.createObjectURL(form.panImage)
    : String(existingDocuments?.panImageName ?? "").trim()
      ? toUploadsUrl(String(existingDocuments?.panImageName ?? "").trim())
      : null;

  const cityStateOptions = useMemo(() => {
    const raw: any = cityStatePincode as any;
    const districts: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.districts)
        ? raw.districts
        : [];

    const seen = new Set<string>();
    const out: Array<{ city: string; state: string }> = [];

    for (const d of districts) {
      const city = String(d?.district ?? d?.city ?? "").trim();
      const state = String(d?.state ?? "").trim();
      if (!city || !state) continue;
      const k = `${city.toLowerCase()}__${state.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ city, state });
    }

    return out;
  }, []);

  useEffect(() => {
    if (!form.city || !form.state) return;
    const k = `${String(form.city).trim().toLowerCase()}__${String(form.state).trim().toLowerCase()}`;
    const exists = cityStateOptions.some((opt) => `${opt.city.toLowerCase()}__${opt.state.toLowerCase()}` === k);
    if (!exists) {
      setManualCityState(true);
    }
  }, [cityStateOptions, form.city, form.state]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.src = url;
    });

  const getCroppedImg = async (imageSrc: string, pixelCrop: any, rotation = 0): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No 2d context");
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, "image/jpeg", 0.95);
    });
  };

  const resizeImage = (blob: Blob, width: number, height: number): Promise<Blob> => {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((resizedBlob) => {
            URL.revokeObjectURL(url);
            if (resizedBlob) resolve(resizedBlob);
          }, "image/jpeg", 0.95);
        }
      };
      img.src = url;
    });
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const maxSizeBytes = 1 * 1024 * 1024; // 1MB
    const allowedTypes = ["image/jpeg", "image/png"];

    if (!allowedTypes.includes(file.type)) {
      setProfileMediaError("Please upload a JPG or PNG image");
      e.target.value = "";
      return;
    }

    if (file.size > maxSizeBytes) {
      setProfileMediaError("Image must be under 1MB");
      e.target.value = "";
      return;
    }

    setProfileMediaError(null);
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setShowCropDialog(true);

    // Allow selecting the same file again
    e.target.value = "";
  };

  const handleCropComplete = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      const croppedImage = await getCroppedImg(
        imageToCrop,
        croppedAreaPixels,
        rotation
      );

      // Resize to passport size: 600x600 pixels (2x2 inches at 300 DPI)
      const resizedImage = await resizeImage(croppedImage, 600, 600);

      const file = new File([resizedImage], "profile-photo.jpg", {
        type: "image/jpeg",
      });

      onChange("profilePhoto", file);
      setShowCropDialog(false);
      setImageToCrop(null);
    } catch (error) {
      console.error("Error cropping image:", error);
    }
  };

  return (
    <div className="space-y-6">
      <SectionTitle
        title="About Me"
        subtitle="Tell us the basics so we can build your profile for opportunities."
      />

      {/* Media section */}
      <div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.1fr] gap-4 md:gap-6">
        {/* Photo upload */}
        <div className="space-y-2">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Profile photo (Passport Size)<span className="text-destructive ml-0.5">*</span>
          </label>
          <label
            className={`group flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed px-4 py-3 md:px-5 md:py-4 bg-card/70 hover:bg-primary/5 transition-colors ${errors.profileMedia ? "border-destructive/60" : "border-border/80"
              }`}
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted overflow-hidden">
              {profilePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profilePreview} alt="Profile preview" className="h-full w-full object-cover" />
              ) : (
                <UploadCloud className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
              )}
            </div>
            <div className="flex flex-1 flex-col">
              <span className="text-xs md:text-sm font-medium text-foreground">
                {form.profilePhoto ? "Change profile photo" : "Upload passport size photo"}
              </span>
              <span className="text-[11px] md:text-xs text-muted-foreground">
                JPG or PNG, max 1MB. You can crop and adjust to passport size (2x2 inches).
              </span>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
          {errors.profileMedia && (
            <p className="text-[11px] text-destructive mt-0.5">{errors.profileMedia}</p>
          )}
          {profileMediaError && !errors.profileMedia && (
            <p className="text-[11px] text-destructive mt-0.5">{profileMediaError}</p>
          )}

          {/* Crop Dialog */}
          <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
            <DialogContent className="max-w-2xl w-[95vw] h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Crop & Adjust Photo (Passport Size - 2x2 inches)</DialogTitle>
              </DialogHeader>
              <div className="flex-1 relative bg-black rounded-lg overflow-hidden">
                {imageToCrop && (
                  <Cropper
                    image={imageToCrop}
                    crop={crop}
                    zoom={zoom}
                    rotation={rotation}
                    aspect={1}
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onRotationChange={setRotation}
                    onCropComplete={onCropComplete}
                    cropShape="rect"
                    showGrid={true}
                    style={{
                      containerStyle: {
                        width: "100%",
                        height: "100%",
                        position: "relative",
                      },
                    }}
                  />
                )}
              </div>
              <div className="space-y-4 pt-4">
                {/* Zoom Control */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ZoomOut className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="range"
                      min={1}
                      max={3}
                      step={0.1}
                      value={zoom}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="flex-1"
                    />
                    <ZoomIn className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                </div>
                {/* Rotation Control */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RotateCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground w-20">Rotation:</span>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={1}
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-12 text-right">
                      {rotation}°
                    </span>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowCropDialog(false);
                      setImageToCrop(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleCropComplete}
                    style={{ backgroundColor: '#0E6049' }}
                  >
                    Save Photo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {ENABLE_PROFILE_INTRO_VIDEO && (
          <>
            {/* Intro video section */}
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-foreground">Intro video (optional)</label>
              <label className="group flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-border/80 px-4 py-3 md:px-5 md:py-4 bg-card/70 hover:bg-primary/5 transition-colors">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                  {introVideoPreview ? (
                    <video
                      src={introVideoPreview}
                      className="h-full w-full rounded-2xl object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <PlayCircle className="h-7 w-7 text-muted-foreground group-hover:text-primary" />
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <span className="text-xs md:text-sm font-medium text-foreground">
                    {form.introVideo ? "Replace intro video" : "Add a short intro video"}
                  </span>
                  <span className="text-[11px] md:text-xs text-muted-foreground">
                    30–60 seconds about yourself, your background and what roles you&apos;re excited about.
                  </span>
                </div>
                <input
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    onChange("introVideo", file);
                  }}
                />
              </label>
            </div>
          </>
        )}
      </div>

      {/* Basic details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            First Name<span className="text-destructive ml-0.5">*</span>
          </label>
          <Input
            placeholder="Enter your first name"
            className={`h-10 md:h-11 rounded-lg text-sm ${errors.firstName ? "border-destructive/70" : ""
              }`}
            value={form.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
          />
          {errors.firstName && (
            <p className="text-[11px] text-destructive mt-0.5">{errors.firstName}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Last Name<span className="text-destructive ml-0.5">*</span>
          </label>
          <Input
            placeholder="Enter your last name"
            className={`h-10 md:h-11 rounded-lg text-sm ${errors.lastName ? "border-destructive/70" : ""
              }`}
            value={form.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
          />
          {errors.lastName && (
            <p className="text-[11px] text-destructive mt-0.5">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Phone + Emergency contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Phone Number<span className="text-destructive ml-0.5">*</span>
          </label>
          <div className="flex gap-2.5">
            <div className="w-[110px]">
              <Select
                value={form.phoneCountryCode}
                onValueChange={(value) => onChange("phoneCountryCode", value)}
              >
                <SelectTrigger className="h-10 md:h-11 rounded-lg text-xs md:text-sm">
                  <SelectValue placeholder="Code" />
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.filter((country) => country.code === "+91").map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs md:text-sm">{country.country}</span>
                        <span className="text-muted-foreground text-[11px] md:text-xs">
                          {country.code}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Enter your phone number"
              className={`flex-1 h-10 md:h-11 rounded-lg text-sm ${errors.phone ? "border-destructive/70" : ""
                }`}
              value={form.phone}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                onChange("phone", digitsOnly);
              }}
            />
          </div>
          {errors.phone && <p className="text-[11px] text-destructive mt-0.5">{errors.phone}</p>}
          {!errors.phone && phoneDuplicateError && (
            <p className="text-[11px] text-destructive mt-0.5">{phoneDuplicateError}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Emergency Contact Number (optional)
          </label>
          <div className="flex gap-2.5">
            <div className="w-[110px]">
              <Select
                value={form.emergencyCountryCode}
                onValueChange={(value) => onChange("emergencyCountryCode", value)}
              >
                <SelectTrigger className="h-10 md:h-11 rounded-lg text-xs md:text-sm">
                  <SelectValue placeholder="Code" />
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.filter((country) => country.code === "+91").map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs md:text-sm">{country.country}</span>
                        <span className="text-muted-foreground text-[11px] md:text-xs">
                          {country.code}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Emergency phone number"
              className={`flex-1 h-10 md:h-11 rounded-lg text-sm ${errors.emergencyPhone || emergencySameError ? "border-destructive/70" : ""
                }`}
              value={form.emergencyPhone}
              inputMode="numeric"
              maxLength={10}
              onChange={(e) => {
                const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                onChange("emergencyPhone", digitsOnly);
              }}
            />
          </div>
          {errors.emergencyPhone && (
            <p className="text-[11px] text-destructive mt-0.5">{errors.emergencyPhone}</p>
          )}
          {!errors.emergencyPhone && emergencySameError && (
            <p className="text-[11px] text-destructive mt-0.5">{emergencySameError}</p>
          )}
        </div>
      </div>



      <div className="space-y-1.5">
        <label className="text-xs md:text-sm font-medium text-foreground">
          Email<span className="text-destructive ml-0.5">*</span>
        </label>
        <Input
          placeholder="Personal email"
          className={`h-10 md:h-11 rounded-lg text-sm ${errors.email ? "border-destructive/70" : ""
            }`}
          value={form.email}
          disabled
        />
        {errors.email && <p className="text-[11px] text-destructive mt-0.5">{errors.email}</p>}
      </div>

      <div className="space-y-1.5">
        <label className="text-xs md:text-sm font-medium text-foreground">
          LinkedIn Profile (optional)
        </label>
        <Input
          placeholder="https://www.linkedin.com/in/your-profile"
          className={`h-10 md:h-11 rounded-lg text-sm ${errors.linkedinUrl ? "border-destructive/70" : ""
            }`}
          value={form.linkedinUrl}
          onChange={(e) => onChange("linkedinUrl", e.target.value)}
        />
        {errors.linkedinUrl && (
          <p className="text-[11px] text-destructive mt-0.5">{errors.linkedinUrl}</p>
        )}
      </div>

      {/* City, State */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            City<span className="text-destructive ml-0.5">*</span>
          </label>
          {manualCityState ? (
            <Input
              placeholder="Enter your city"
              className={`h-10 md:h-11 rounded-lg text-sm ${errors.city ? "border-destructive/70" : ""}`}
              value={form.city}
              onChange={(e) => onChange("city", e.target.value)}
            />
          ) : (
            <Popover open={cityPopoverOpen} onOpenChange={setCityPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={`w-full h-10 md:h-11 justify-between rounded-lg text-sm ${errors.city ? "border-destructive/70" : ""}`}
                >
                  <span className="truncate text-left">
                    {form.city
                      ? form.city
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (ch) => ch.toUpperCase())
                      : "Select your city"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[360px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search Indian cities..."
                    value={citySearchQuery}
                    onValueChange={setCitySearchQuery}
                  />
                  <CommandList>
                    <CommandEmpty>
                      <div className="px-2 py-2 text-xs text-muted-foreground">
                        No city found.
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-1"
                          onClick={() => {
                            setManualCityState(true);
                            setCityPopoverOpen(false);
                            setCitySearchQuery("");
                            onChange("city", "");
                            onChange("state", "");
                          }}
                        >
                          Enter manually
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup>
                      {cityStateOptions
                        .filter((item) => {
                          if (!citySearchQuery.trim()) return true;
                          const q = citySearchQuery.trim().toLowerCase();
                          return (
                            item.city.toLowerCase().includes(q) ||
                            (item.state || "").toLowerCase().includes(q)
                          );
                        })
                        .sort((a, b) => {
                          const q = citySearchQuery.trim().toLowerCase();

                          const score = (x: { city: string; state: string }) => {
                            if (!q) return 10;
                            const city = (x.city || "").toLowerCase();
                            const state = (x.state || "").toLowerCase();

                            if (city === q) return 0;
                            if (city.startsWith(q)) return 1;
                            if (city.includes(q)) return 2;
                            if (state === q) return 3;
                            if (state.startsWith(q)) return 4;
                            if (state.includes(q)) return 5;
                            return 9;
                          };

                          const sa = score(a);
                          const sb = score(b);
                          if (sa !== sb) return sa - sb;
                          return a.city.localeCompare(b.city);
                        })
                        .map((item) => (
                          <CommandItem
                            key={`${item.city}-${item.state}`}
                            value={item.city}
                            onSelect={() => {
                              setManualCityState(false);
                              onChange("city", item.city);
                              onChange("state", item.state);
                              setCityPopoverOpen(false);
                              setCitySearchQuery("");
                            }}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="truncate">{item.city}</span>
                              <span className="text-xs text-muted-foreground ml-3 shrink-0">{item.state}</span>
                            </div>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          {errors.city && <p className="text-[11px] text-destructive mt-0.5">{errors.city}</p>}
          {!manualCityState && (
            <button
              type="button"
              className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
              onClick={() => {
                setManualCityState(true);
                onChange("city", "");
                onChange("state", "");
              }}
            >
              Can&apos;t find your city? Enter manually
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            State<span className="text-destructive ml-0.5">*</span>
          </label>
          <Input
            placeholder={manualCityState ? "Enter your state" : "Auto-filled from city"}
            className={`h-10 md:h-11 rounded-lg text-sm ${errors.state ? "border-destructive/70" : ""
              }`}
            value={form.state}
            disabled={!manualCityState}
            onChange={(e) => onChange("state", e.target.value)}
          />
          {errors.state && <p className="text-[11px] text-destructive mt-0.5">{errors.state}</p>}
        </div>
      </div>

      {/* Aadhaar / PAN numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Aadhaar Number<span className="text-destructive ml-0.5">*</span>
          </label>
          <Input
            placeholder="Enter Aadhaar number"
            className={`h-10 md:h-11 rounded-lg text-sm ${errors.aadhaarNumber ? "border-destructive/70" : ""
              }`}
            value={form.aadhaarNumber}
            maxLength={14}
            onChange={(e) => {
              const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 12);

              const formatted = digitsOnly
                .match(/.{1,4}/g)
                ?.join(" ")
                .trim() ?? "";

              onChange("aadhaarNumber", formatted);
            }}
          />
          {errors.aadhaarNumber && (
            <p className="text-[11px] text-destructive mt-0.5">{errors.aadhaarNumber}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            PAN Number<span className="text-destructive ml-0.5">*</span>
          </label>
          <Input
            placeholder="Enter PAN number"
            className={`h-10 md:h-11 rounded-lg text-sm ${errors.panNumber ? "border-destructive/70" : ""
              }`}
            value={form.panNumber}
            maxLength={10}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10);
              onChange("panNumber", cleaned);
            }}
          />
          {errors.panNumber && (
            <p className="text-[11px] text-destructive mt-0.5">{errors.panNumber}</p>
          )}
        </div>
      </div>

    

      {/* Document uploads */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        <div className="space-y-2">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Upload Aadhaar (optional)
          </label>
          <label
            className={`group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-dashed px-4 py-3 md:px-5 md:py-4 bg-card/70 hover:bg-primary/5 transition-colors ${errors.aadhaarImage ? "border-destructive/60" : "border-border/80"
              }`}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted overflow-hidden">
                {aadhaarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={aadhaarPreview} alt="Aadhaar preview" className="h-full w-full object-cover" />
                ) : (
                  <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-xs md:text-sm font-medium text-foreground">
                  {form.aadhaarImage ? "Change Aadhaar image" : "Upload Aadhaar image"}
                </span>
                <span className="text-[11px] md:text-xs text-muted-foreground">
                  Clear photo or scan of your Aadhaar card.
                </span>
              </div>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) {
                  setAadhaarImageError(null);
                  onChange("aadhaarImage", null);
                  return;
                }

                const maxSizeBytes = 1 * 1024 * 1024; // 1MB
                const allowedTypes = ["image/jpeg", "image/png"];
                if (!allowedTypes.includes(file.type) || file.size > maxSizeBytes) {
                  setAadhaarImageError(
                    !allowedTypes.includes(file.type)
                      ? "Please upload a JPG or PNG image"
                      : "Image must be under 1MB"
                  );
                  e.target.value = "";
                  return;
                }

                setAadhaarImageError(null);
                onChange("aadhaarImage", file);

                // Allow selecting the same file again
                e.target.value = "";
              }}
            />
          </label>
          {errors.aadhaarImage && (
            <p className="text-[11px] text-destructive mt-0.5">{errors.aadhaarImage}</p>
          )}
          {aadhaarImageError && !errors.aadhaarImage && (
            <p className="text-[11px] text-destructive mt-0.5">{aadhaarImageError}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Upload PAN<span className="text-destructive ml-0.5">*</span>
          </label>
          <label
            className={`group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border border-dashed px-4 py-3 md:px-5 md:py-4 bg-card/70 hover:bg-primary/5 transition-colors ${errors.panImage ? "border-destructive/60" : "border-border/80"
              }`}
          >
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted overflow-hidden">
                {panPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={panPreview} alt="PAN preview" className="h-full w-full object-cover" />
                ) : (
                  <UploadCloud className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <span className="text-xs md:text-sm font-medium text-foreground">
                  {form.panImage ? "Change PAN image" : "Upload PAN image"}
                </span>
                <span className="text-[11px] md:text-xs text-muted-foreground">
                  Clear photo or scan of your PAN card.
                </span>
              </div>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                if (!file) {
                  setPanImageError(null);
                  onChange("panImage", null);
                  return;
                }

                const maxSizeBytes = 1 * 1024 * 1024; // 1MB
                const allowedTypes = ["image/jpeg", "image/png"];
                if (!allowedTypes.includes(file.type) || file.size > maxSizeBytes) {
                  setPanImageError(
                    !allowedTypes.includes(file.type)
                      ? "Please upload a JPG or PNG image"
                      : "Image must be under 1MB"
                  );
                  e.target.value = "";
                  return;
                }

                setPanImageError(null);
                onChange("panImage", file);

                // Allow selecting the same file again
                e.target.value = "";
              }}
            />
          </label>
          {errors.panImage && <p className="text-[11px] text-destructive mt-0.5">{errors.panImage}</p>}
          {panImageError && !errors.panImage && (
            <p className="text-[11px] text-destructive mt-0.5">{panImageError}</p>
          )}
        </div>
      </div>
        {ENABLE_PROFILE_BIO && (
          <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">Bio (optional)</label>
          <Textarea
            placeholder="Tell us briefly about yourself, your goals, or what kind of work you’d love to do."
            className="min-h-[90px] md:min-h-[110px] rounded-lg text-sm"
            value={form.bio}
            onChange={(e) => onChange("bio", e.target.value)}
          />
        </div>
        )}
    </div>
  );
}

function StepAcademics({
  initialData,
  onValidityChange,
  onDataChange,
}: {
  initialData?: any;
  onValidityChange: (valid: boolean) => void;
  onDataChange?: (data: any) => void;
}) {
  const didHydrateFromInitialData = useRef(false);
  const [level, setLevel] = useState<string>("");
  const [degree, setDegree] = useState<string>("");
  const [degreeOther, setDegreeOther] = useState<string>("");
  const [specialization, setSpecialization] = useState<string>("");
  const [status, setStatus] = useState<string>("Completed");
  const [institution, setInstitution] = useState<string>("");
  const [startYear, setStartYear] = useState<string>("");
  const [endYear, setEndYear] = useState<string>("");
  const [yearError, setYearError] = useState<string | null>(null);
  const [scoreType, setScoreType] = useState<"percentage" | "cgpa">("percentage");
  const [score, setScore] = useState<string>("");
  const [scoreTouched, setScoreTouched] = useState(false);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [marksheetFiles, setMarksheetFiles] = useState<File[]>([]);
  const [marksheetUploadError, setMarksheetUploadError] = useState<string | null>(null);
  const [marksheetUploadInFlight, setMarksheetUploadInFlight] = useState(false);
  const [marksheetUploads, setMarksheetUploads] = useState<
    {
      name: string;
      type: string;
      size: number;
      originalName?: string;
    }[]
  >([]);

  const removeMarksheetByName = useCallback((name: string) => {
    const normalized = String(name ?? "").trim();
    if (!normalized) return;

    setMarksheetFiles((prev) => prev.filter((f) => String(f?.name ?? "").trim() !== normalized));
    setMarksheetUploads((prev) =>
      prev.filter((u) => {
        const stored = String(u?.name ?? "").trim();
        const original = String((u as any)?.originalName ?? "").trim();
        return stored !== normalized && original !== normalized;
      }),
    );
  }, []);

  const removeMarksheetByUploadIndex = useCallback((idx: number) => {
    setMarksheetUploads((prev) => {
      const target = prev?.[idx];
      if (!target) return prev;

      const original = String((target as any)?.originalName ?? "").trim();
      const stored = String(target?.name ?? "").trim();
      const keyForLocal = original || stored;

      if (keyForLocal) {
        setMarksheetFiles((filesPrev) => filesPrev.filter((f) => String(f?.name ?? "").trim() !== keyForLocal));
      }

      return prev.filter((_, i) => i !== idx);
    });
  }, []);

  const normalizeAndClampScore = useCallback((raw: string, type: "percentage" | "cgpa") => {
    const trimmed = String(raw ?? "");
    if (!trimmed.trim()) return { value: "", error: null as string | null };

    const n = Number(trimmed);
    if (!Number.isFinite(n)) return { value: trimmed, error: "Enter a valid number." };

    const max = type === "percentage" ? 100 : 10;
    const clamped = Math.min(max, Math.max(0, n));

    if (n > max) {
      return { value: String(clamped), error: type === "percentage" ? "Percentage cannot be more than 100." : "CGPA cannot be more than 10." };
    }
    if (n < 0) {
      return { value: String(clamped), error: "Score cannot be negative." };
    }

    return { value: trimmed, error: null as string | null };
  }, []);
  const [professionalCourses, setProfessionalCourses] = useState<
    {
      id: string;
      level: string;
      status: string;
      institution: string;
      courseNamePreset: "CA" | "CS" | "CMA" | "CFA" | "Other" | "";
      courseNameOther: string;
      completionDate: string;
      scoreType: "percentage" | "cgpa";
      score: string;
      certificateUploads: { name: string; type: string; size: number; originalName?: string }[];
      certificateFile?: File | null;
    }[]
  >([]);
  const [professionalCertificateErrors, setProfessionalCertificateErrors] = useState<Record<string, string>>({});
  const [certifications, setCertifications] = useState<
    {
      id: string;
      certificateName: string;
      institution: string;
      startDate: string;
      endDate: string;
      certificateUploads: { name: string; type: string; size: number; originalName?: string }[];
      certificateFile?: File | null;
    }[]
  >([]);
  const [certificationCertificateErrors, setCertificationCertificateErrors] = useState<Record<string, string>>({});

  const resolveUserId = useCallback(async () => {
    const stored = String(localStorage.getItem("userId") ?? "").trim();
    if (stored) return stored;

    const userEmail = String(localStorage.getItem("userEmail") ?? "").trim();
    if (!userEmail) return null;

    try {
      const response = await apiRequest("GET", `/api/auth/user/by-email/${encodeURIComponent(userEmail)}`);
      const data = await response.json().catch(() => null);
      const recovered = String(data?.user?.id ?? "").trim();
      if (recovered) {
        localStorage.setItem("userId", recovered);
        return recovered;
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const uploadAcademicsFiles = useCallback(
    async (files: File[]): Promise<{ name: string; type: string; size: number; originalName?: string }[]> => {
      const userId = await resolveUserId();
      if (!userId) return [];
      if (!Array.isArray(files) || files.length === 0) return [];

      const formData = new FormData();
      formData.append("userId", userId);
      for (const f of files) formData.append("files", f);

      const res = await fetch("/api/onboarding/academics/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        return [];
      }

      const json = await res.json().catch(() => null);
      const uploads = Array.isArray(json?.uploads) ? json.uploads : [];
      return uploads
        .map((u: any) => ({
          name: String(u?.name ?? "").trim(),
          type: String(u?.type ?? "").trim(),
          size: Number(u?.size ?? 0),
          originalName: String(u?.originalName ?? "").trim() || undefined,
        }))
        .filter((u: any) => u.name);
    },
    [resolveUserId],
  );

  useEffect(() => {
    if (!initialData) return;
    if (didHydrateFromInitialData.current) return;
    didHydrateFromInitialData.current = true;

    setLevel(initialData.level || "");
    const nextLevel = String(initialData.level || "");
    const rawDegree = String(initialData.degree || "");
    if ((nextLevel === "bachelors" || nextLevel === "masters") && rawDegree) {
      const options = degreeOptions[nextLevel] || [];
      if (options.includes(rawDegree)) {
        setDegree(rawDegree);
        setDegreeOther("");
      } else {
        setDegree("Other");
        setDegreeOther(rawDegree);
      }
    } else {
      setDegree(rawDegree);
      setDegreeOther("");
    }
    setSpecialization(initialData.specialization || "");
    setStatus(initialData.status || "Completed");
    setInstitution(initialData.institution || "");
    setStartYear(initialData.startYear || "");
    setEndYear(initialData.endYear || "");
    setScoreType(initialData.scoreType || "percentage");
    setScore(initialData.score || "");
    setProfessionalCourses(
      Array.isArray(initialData.professionalCourses)
        ? initialData.professionalCourses.map((c: any) => {
            const rawPreset = String(c?.courseNamePreset ?? c?.title ?? c?.courseType ?? "").trim();
            const preset =
              rawPreset === "CA" || rawPreset === "CS" || rawPreset === "CMA" || rawPreset === "CFA"
                ? rawPreset
                : "Other";
            const otherName = preset === "Other" ? String(c?.courseNameOther ?? c?.title ?? "").trim() : "";
            return {
              id: typeof c?.id === "string" ? c.id : `prof-course-${Date.now()}-${Math.random()}`,
              courseNamePreset: preset,
              courseNameOther: otherName,
              level: typeof c?.level === "string" ? c.level : "",
              status: typeof c?.status === "string" ? c.status : "Completed",
              institution: typeof c?.institution === "string" ? c.institution : "",
              completionDate: typeof c?.completionDate === "string" ? c.completionDate : String(c?.endDate ?? c?.issueDate ?? ""),
              scoreType: c?.scoreType === "cgpa" ? "cgpa" : "percentage",
              score: typeof c?.score === "string" ? c.score : "",
              certificateUploads: Array.isArray(c?.certificateUploads) ? c.certificateUploads : [],
              certificateFile: null,
            };
          })
        : [],
    );
    setCertifications(
      Array.isArray(initialData.certifications)
        ? initialData.certifications.map((c: any) => ({
            id: typeof c?.id === "string" ? c.id : `cert-${Date.now()}-${Math.random()}`,
            certificateName: typeof c?.certificateName === "string" ? c.certificateName : "",
            institution: typeof c?.institution === "string" ? c.institution : "",
            startDate: typeof c?.startDate === "string" ? c.startDate : "",
            endDate: typeof c?.endDate === "string" ? c.endDate : "",
            certificateUploads: Array.isArray(c?.certificateUploads) ? c.certificateUploads : [],
            certificateFile: null,
          }))
        : [],
    );
    setMarksheetUploads(Array.isArray(initialData.marksheetUploads) ? initialData.marksheetUploads : []);
  }, [initialData]);

  // Degree options based on level
  const degreeOptions: Record<string, string[]> = {
    bachelors: [
      "BA",
      "B.Com",
      "BBA",
      "BMS",
      "BSc",
      "B.Tech",
      "BCA",
      
      "MBBS",
      "BDS",
      "B.Pharm",
      "BAMS/BHMS",
      "LLB",
      "B.Des",
      "BFA",
      "B.Ed",
      "Other",
    ],
    masters: [
      "MBA",
      "PGDM",
      "M.Com",
      "MSc",
      "MS",
      "MA",
      "M.Des",
      "MFA",
      "LLM",
      "MCA",
      "MPH",
      "M.Ed",
      "MSW",
      "Other",
    ],
  };

  useEffect(() => {
    if (status !== "Completed") {
      setScoreError(null);
      setScoreTouched(false);
    }
  }, [status]);

  useEffect(() => {
    if (level === "phd") {
      setScore("");
      setScoreError(null);
      setScoreTouched(false);
    }
  }, [level]);

  // Compute validity whenever key fields change
  useEffect(() => {
    const isCompleted = status === "Completed";
    const scoreOk = level === "phd" || !isCompleted || String(score ?? "").trim() !== "";

    const degreeOk = (() => {
      if (level === "bachelors" || level === "masters") {
        if (!degree) return false;
        if (degree !== "Other") return true;
        return String(degreeOther || "").trim().length > 0;
      }
      return String(degree || "").trim().length > 0;
    })();

    const startOk = startYear.length === 4;
    const endOk = !isCompleted || endYear.length === 4;
    let yearsOk = true;
    let error: string | null = null;

    if (startYear.length === 4 && endYear.length === 4) {
      const sy = Number(startYear);
      const ey = Number(endYear);
      if (Number.isFinite(sy) && Number.isFinite(ey)) {
        if (sy >= ey) {
          yearsOk = false;
          error = "Start year must be less than end year.";
        }
      }
    }

    setYearError(error);

    const isBlankRow = (obj: Record<string, any>, keys: string[]) => {
      return !keys.some((k) => {
        const v = obj?.[k];
        if (Array.isArray(v)) return v.length > 0;
        return String(v ?? "").trim() !== "";
      });
    };

    const isPartialRow = (obj: Record<string, any>, requiredKeys: string[], anyKeys: string[]) => {
      const hasAny = !isBlankRow(obj, anyKeys);
      if (!hasAny) return false;
      return !requiredKeys.every((k) => {
        const v = obj?.[k];
        if (Array.isArray(v)) return v.length > 0;
        return String(v ?? "").trim() !== "";
      });
    };

    const profAnyKeys = [
      "courseNamePreset",
      "courseNameOther",
      "level",
      "status",
      "institution",
      "completionDate",
      "scoreType",
      "score",
      "certificateUploads",
    ];
    const getProfRequiredKeys = (course: any) => {
      const required = ["courseNamePreset", "level", "status", "institution"];
      if (String(course?.courseNamePreset ?? "") === "Other") required.push("courseNameOther");
      if (String(course?.status ?? "") === "Completed") {
        required.push("completionDate");
        required.push("score");
      }
      return required;
    };

    const certAnyKeys = [
      "certificateName",
      "institution",
      "startDate",
      "endDate",
      "certificateUploads",
    ];
    const certRequiredKeys = ["certificateName", "institution", "startDate", "endDate"];

    const hasPartialProfessionalCourse = professionalCourses.some((c) =>
      isPartialRow(c as any, getProfRequiredKeys(c as any), profAnyKeys),
    );
    const hasPartialCertification = certifications.length > 0 && certifications.some((c) => {
      const hasAny = !isBlankRow(c as any, certAnyKeys);
      const isMissingRequired = !certRequiredKeys.every((k) => {
        const v = (c as any)?.[k];
        if (Array.isArray(v)) return v.length > 0;
        return String(v ?? "").trim() !== "";
      });

      // Certifications are optional, but if the user adds a row, it must be complete.
      // Treat even a fully blank added row as incomplete.
      return hasAny ? isMissingRequired : true;
    });

    const valid =
      !!level &&
      degreeOk &&
      !!institution &&
      startOk &&
      endOk &&
      yearsOk &&
      scoreOk &&
      !hasPartialProfessionalCourse &&
      !hasPartialCertification;

    onValidityChange(valid);

    if (onDataChange) {
      const stripFile = <T extends { certificateFile?: File | null }>(row: T) => {
        const { certificateFile: _cf, ...rest } = row as any;
        return rest as Omit<T, "certificateFile">;
      };

      onDataChange({
        level,
        degree: (level === "bachelors" || level === "masters") && degree === "Other" ? String(degreeOther || "").trim() : degree,
        specialization,
        status,
        institution,
        startYear,
        endYear,
        scoreType,
        score,
        marksheetUploads,
        professionalCourses: professionalCourses.map((c) => stripFile(c as any)),
        certifications: certifications.map((c) => stripFile(c as any)),
      });
    }
  }, [level, degree, degreeOther, specialization, status, institution, startYear, endYear, scoreType, score, marksheetUploads, professionalCourses, certifications, onValidityChange, onDataChange]);

  const addProfessionalCourse = () => {
    setProfessionalCourses((prev) => [
      ...prev,
      {
        id: `prof-course-${Date.now()}-${Math.random()}`,
        level: "",
        status: "Completed",
        institution: "",
        courseNamePreset: "",
        courseNameOther: "",
        completionDate: "",
        scoreType: "percentage",
        score: "",
        certificateUploads: [],
      },
    ]);
  };

  const updateProfessionalCourse = (
    id: string,
    field: keyof Omit<{
      id: string;
      level: string;
      status: string;
      institution: string;
      courseNamePreset: "CA" | "CS" | "CMA" | "CFA" | "Other" | "";
      courseNameOther: string;
      completionDate: string;
      scoreType: "percentage" | "cgpa";
      score: string;
      certificateUploads: { name: string; type: string; size: number }[];
    }, "id">,
    value: string,
  ) => {
    setProfessionalCourses((prev) =>
      prev.map((course) => {
        if (course.id !== id) return course;
        if (field === "courseNamePreset") {
          const nextPreset = value as any;
          return {
            ...course,
            courseNamePreset: nextPreset,
            courseNameOther: nextPreset === "Other" ? course.courseNameOther : "",
          };
        }
        if (field === "status") {
          const nextStatus = value;
          return {
            ...course,
            status: nextStatus,
            completionDate: nextStatus === "Completed" ? course.completionDate : "",
          };
        }
        return { ...course, [field]: value } as any;
      }),
    );
  };

  const addCertification = () => {
    setCertifications((prev) => [
      ...prev,
      {
        id: `cert-${Date.now()}-${Math.random()}`,
        certificateName: "",
        institution: "",
        startDate: "",
        endDate: "",
        certificateUploads: [],
      },
    ]);
  };

  const updateCertification = (
    id: string,
    field: keyof Omit<{
      id: string;
      certificateName: string;
      institution: string;
      startDate: string;
      endDate: string;
      certificateUploads: { name: string; type: string; size: number }[];
    }, "id">,
    value: string,
  ) => {
    setCertifications((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };

  const removeCertification = (id: string) => {
    setCertifications((prev) => prev.filter((c) => c.id !== id));
  };

  const removeProfessionalCourse = (id: string) => {
    setProfessionalCourses((prev) => prev.filter((course) => course.id !== id));
  };

  const isValidIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(String(v || "").trim());

  const todayIso = (() => {
    const d = new Date();
    const pad2 = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  })();

  const currentYear = new Date().getFullYear();

  const validateYears = useCallback(
    (nextStart: string, nextEnd: string, nextStatus: string) => {
      const s = String(nextStart || "").trim();
      const e = String(nextEnd || "").trim();

      if (s.length === 4) {
        const sn = Number(s);
        if (Number.isFinite(sn) && sn > currentYear) return "Year cannot be greater than current year.";
      }

      if (e.length === 4) {
        const en = Number(e);
        if (Number.isFinite(en) && en > currentYear) return "Year cannot be greater than current year.";
      }

      if (nextStatus === "Pursuing" && !e) return null;

      if (s.length === 4 && e.length === 4) {
        const sn = Number(s);
        const en = Number(e);
        if (Number.isFinite(sn) && Number.isFinite(en) && en < sn) return "End year cannot be less than start year.";
      }

      return null;
    },
    [currentYear],
  );

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Highest Qualification"
        subtitle=""
      />

      <div className="space-y-1.5">
        <label className="text-xs md:text-sm font-medium text-foreground">
          Level<span className="text-destructive ml-0.5">*</span>
        </label>
        <Select value={level} onValueChange={(value) => {
          setLevel(value);
          setDegree(""); // Reset degree when level changes
          setDegreeOther("");
        }}>
          <SelectTrigger className="h-10 md:h-11 rounded-lg text-sm">
            <SelectValue placeholder="Select Level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="diploma">Diploma</SelectItem>
            <SelectItem value="bachelors">Bachelor&apos;s</SelectItem>
            <SelectItem value="masters">Master&apos;s</SelectItem>
            <SelectItem value="phd">Ph.D</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs md:text-sm font-medium text-foreground">
          {level === "diploma" ? "Diploma" : level === "phd" ? "Ph.D" : "Degree"}
          <span className="text-destructive ml-0.5">*</span>
        </label>
        {level === "diploma" || level === "phd" ? (
          <Input
            placeholder="Type here"
            className="h-10 md:h-11 rounded-lg text-sm"
            value={degree}
            onChange={(e) => setDegree(e.target.value)}
            disabled={!level}
          />
        ) : (
          <Select value={degree} onValueChange={setDegree} disabled={!level}>
            <SelectTrigger className="h-10 md:h-11 rounded-lg text-sm">
              <SelectValue placeholder={level ? "Select Degree" : "Select Level first"} />
            </SelectTrigger>
            <SelectContent>
              {level && degreeOptions[level]?.map((deg) => (
                <SelectItem key={deg} value={deg}>{deg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {(level === "bachelors" || level === "masters") && degree === "Other" && (
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Specify degree<span className="text-destructive ml-0.5">*</span>
          </label>
          <Input
            placeholder="Type your degree"
            className="h-10 md:h-11 rounded-lg text-sm"
            value={degreeOther}
            onChange={(e) => setDegreeOther(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs md:text-sm font-medium text-foreground">
          Specialization
        </label>
        <Input
          placeholder="Specialization"
          className="h-10 md:h-11 rounded-lg text-sm"
          value={specialization}
          onChange={(e) => setSpecialization(e.target.value)}
        />
      </div>

      

      <div className="space-y-1.5">
        <label className="text-xs md:text-sm font-medium text-foreground">
          Status<span className="text-destructive ml-0.5">*</span>
        </label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-10 md:h-11 rounded-lg text-sm">
            <SelectValue placeholder="Select Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Pursuing">Pursuing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs md:text-sm font-medium text-foreground">
          Institution<span className="text-destructive ml-0.5">*</span>
        </label>
        <Input
          placeholder="Institution Name"
          className="h-10 md:h-11 rounded-lg text-sm"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Start Year<span className="text-destructive ml-0.5">*</span>
          </label>
          <Input
            placeholder="YYYY"
            className="h-10 md:h-11 rounded-lg text-sm"
            value={startYear}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 4);
              const clamped = value.length === 4 && Number(value) > currentYear ? String(currentYear) : value;
              setStartYear(clamped);
              setYearError(validateYears(clamped, endYear, status));
            }}
            maxLength={4}
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            End Year{status === "Pursuing" ? "" : <span className="text-destructive ml-0.5">*</span>}
          </label>
          <Input
            placeholder="YYYY"
            className="h-10 md:h-11 rounded-lg text-sm"
            value={endYear}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 4);
              const clamped = value.length === 4 && Number(value) > currentYear ? String(currentYear) : value;
              setEndYear(clamped);
              setYearError(validateYears(startYear, clamped, status));
            }}
            maxLength={4}
          />
          {yearError && (
            <p className="text-[11px] text-destructive mt-0.5">{yearError}</p>
          )}
        </div>
      </div>

      {level !== "phd" && (
        <div className="space-y-1.5">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Score{status === "Completed" ? <span className="text-destructive ml-0.5">*</span> : null}
          </label>
          <div className="space-y-3">
            <RadioGroup
              value={scoreType}
              onValueChange={(value) => setScoreType(value as "percentage" | "cgpa")}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="text-sm font-normal cursor-pointer">
                  Percentage
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cgpa" id="cgpa" />
                <Label htmlFor="cgpa" className="text-sm font-normal cursor-pointer">
                  CGPA
                </Label>
              </div>
            </RadioGroup>
            <Input
              placeholder={scoreType === "percentage" ? "Percentage" : "CGPA"}
              className="h-10 md:h-11 rounded-lg text-sm"
              value={score}
              onChange={(e) => {
                const next = e.target.value;
                const normalized = normalizeAndClampScore(next, scoreType);
                setScore(normalized.value);
                if (status !== "Completed") {
                  setScoreError(null);
                  return;
                }
                if (!scoreTouched) return;

                if (!String(normalized.value ?? "").trim()) {
                  setScoreError("Score is required.");
                  return;
                }
                setScoreError(normalized.error);
              }}
              onBlur={(e) => {
                setScoreTouched(true);
                if (status !== "Completed") return;
                const next = e.currentTarget.value;
                const normalized = normalizeAndClampScore(next, scoreType);
                setScore(normalized.value);

                if (!String(normalized.value ?? "").trim()) {
                  setScoreError("Score is required.");
                  return;
                }
                setScoreError(normalized.error);
              }}
              type="number"
              step={scoreType === "cgpa" ? "0.01" : "0.1"}
              min={0}
              max={scoreType === "cgpa" ? 10 : 100}
            />
            {scoreTouched && scoreError && (
              <p className="text-[11px] text-destructive mt-0.5">{scoreError}</p>
            )}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs md:text-sm font-medium text-foreground">
          {String(level ?? "").trim().toLowerCase() === "phd" ? "Certificate" : "Marksheet"}
        </label>
        <div className="space-y-3">
          {/* File Upload Button */}
          <label htmlFor="marksheet-upload" className="cursor-pointer">
            <input
              id="marksheet-upload"
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const maxSizeBytes = 1 * 1024 * 1024; // 1MB
                const acceptedFiles = files.filter((f) => f.size <= maxSizeBytes);
                const rejectedCount = files.length - acceptedFiles.length;

                if (rejectedCount > 0) {
                  setMarksheetUploadError("Each file must be under 1MB");
                } else {
                  setMarksheetUploadError(null);
                }

                if (acceptedFiles.length > 0) {
                  setMarksheetFiles((prev) => [...prev, ...acceptedFiles]);
                  setMarksheetUploadInFlight(true);
                  uploadAcademicsFiles(acceptedFiles)
                    .then((uploaded) => {
                      if (uploaded.length > 0) {
                        setMarksheetUploads((prev) => [...prev, ...uploaded]);
                      } else {
                        setMarksheetUploads((prev) => [
                          ...prev,
                          ...acceptedFiles.map((f) => ({ name: f.name, type: f.type, size: f.size, originalName: f.name })),
                        ]);
                      }
                    })
                    .finally(() => setMarksheetUploadInFlight(false));
                }
                // Reset input to allow selecting same file again
                e.target.value = "";
              }}
            />
            
 

            <Button
              type="button"
              variant="outline"
              className="h-10 md:h-11 rounded-lg text-sm border-2"
              style={{ borderColor: '#0E6049' }}
              disabled={marksheetUploadInFlight}
              onClick={(e) => {
                e.preventDefault();
                const fileInput = document.getElementById("marksheet-upload") as HTMLInputElement;
                fileInput?.click();
              }}
            >
              <UploadCloud className="h-4 w-4 mr-2" />
              Choose Files
            </Button>
          </label>

          {/* File Previews */}
          {marksheetFiles.length > 0 && (
            <div className="space-y-2">
              {marksheetFiles.map((file, index) => (
                <SelectedUploadCard
                  key={`${file.name}-${file.size}-${index}`}
                  file={file}
                  onRemove={() => removeMarksheetByName(file.name)}
                />
              ))}
            </div>
          )}

          {marksheetFiles.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No files chosen. You can upload multiple files.
            </p>
          )}

          {marksheetUploadError && (
            <p className="text-[11px] text-destructive mt-0.5">{marksheetUploadError}</p>
          )}

          {marksheetUploads.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Previously uploaded:</p>
              <SelectedUploadMetaList
                uploads={marksheetUploads}
                onRemoveAt={removeMarksheetByUploadIndex}
              />
            </div>
          )}
        </div>
      </div>
           <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Professional Courses (optional)
          </label>
          {professionalCourses.length > 0 && (
            <span className="text-[11px] text-muted-foreground">
              Add any additional bootcamps, online programmes or specialised trainings.
            </span>
          )}
        </div>

        {professionalCourses.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-card/40 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] md:text-xs text-muted-foreground sm:mr-3">
              If you have done any professional or industry‑oriented courses, you can add them here.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full rounded-full text-[11px] md:text-xs sm:w-auto shrink-0"
              onClick={addProfessionalCourse}
            >
              Add professional course
            </Button>
          </div>
        )}

        {professionalCourses.length > 0 && (
          <div className="space-y-4">
            {professionalCourses.map((course, index) => (
              <div
                key={course.id}
                className="rounded-xl border border-border/70 bg-card/60 p-4 md:p-5 space-y-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs md:text-sm font-medium text-foreground">
                    Professional Course {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeProfessionalCourse(course.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Course name
                    </label>
                    <Select
                      value={course.courseNamePreset}
                      onValueChange={(value) => updateProfessionalCourse(course.id, "courseNamePreset", value)}
                    >
                      <SelectTrigger className="h-9 md:h-10 rounded-lg text-xs md:text-sm">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CA">CA</SelectItem>
                        <SelectItem value="CS">CS</SelectItem>
                        <SelectItem value="CMA">CMA</SelectItem>
                        <SelectItem value="CFA">CFA</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Level
                    </label>
                    <Input
                      placeholder="Type level"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                      value={course.level}
                      onChange={(e) => updateProfessionalCourse(course.id, "level", e.target.value)}
                    />
                  </div>
                </div>

                {course.courseNamePreset === "Other" && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Course name
                    </label>
                    <Input
                      placeholder="Enter course name"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                      value={course.courseNameOther}
                      onChange={(e) => updateProfessionalCourse(course.id, "courseNameOther", e.target.value)}
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Status
                    </label>
                    <Select
                      value={course.status}
                      onValueChange={(value) => updateProfessionalCourse(course.id, "status", value)}
                    >
                      <SelectTrigger className="h-9 md:h-10 rounded-lg text-xs md:text-sm">
                        <SelectValue placeholder="Completed / Ongoing" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Pursuing">Pursuing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {course.status === "Completed" && (
                    <div className="space-y-1.5">
                      <label className="text-[11px] md:text-xs font-medium text-foreground">
                        Completion date
                      </label>
                      <Input
                        type="date"
                        className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                        max={todayIso}
                        value={course.completionDate || ""}
                        onChange={(e) => {
                          const next = e.target.value;
                          if (!next) {
                            updateProfessionalCourse(course.id, "completionDate", next);
                            return;
                          }
                          if (isValidIsoDate(next) && next <= todayIso) {
                            updateProfessionalCourse(course.id, "completionDate", next);
                          }
                        }}
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Institution name
                    </label>
                    <Input
                      placeholder="Type institution name"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                      value={course.institution}
                      onChange={(e) => updateProfessionalCourse(course.id, "institution", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Grades
                    </label>
                    <div className="flex gap-2">
                      <Select
                        value={course.scoreType}
                        onValueChange={(value) => updateProfessionalCourse(course.id, "scoreType", value)}
                      >
                        <SelectTrigger className="h-9 md:h-10 rounded-lg text-xs md:text-sm w-[130px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="cgpa">CGPA</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder={course.scoreType === "cgpa" ? "CGPA" : "%"}
                        className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                        value={course.score || ""}
                        onChange={(e) => {
                          const normalized = normalizeAndClampScore(e.target.value, course.scoreType);
                          updateProfessionalCourse(course.id, "score", normalized.value);
                        }}
                        type="number"
                        step={course.scoreType === "cgpa" ? "0.01" : "0.1"}
                        min={0}
                        max={course.scoreType === "cgpa" ? 10 : 100}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] md:text-xs font-medium text-foreground">
                    Upload certificate
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple={false}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) {
                          setProfessionalCertificateErrors((prev) => {
                            const next = { ...prev };
                            delete next[course.id];
                            return next;
                          });
                          return;
                        }

                        const maxSizeBytes = 1 * 1024 * 1024; // 1MB
                        if (file.size > maxSizeBytes) {
                          setProfessionalCertificateErrors((prev) => ({ ...prev, [course.id]: "File must be under 1MB" }));
                          e.target.value = "";
                          return;
                        }
                        setProfessionalCourses((prev) =>
                          prev.map((p) =>
                            p.id === course.id
                              ? {
                                  ...p,
                                  certificateFile: file,
                                }
                              : p,
                          ),
                        );
                        uploadAcademicsFiles([file]).then((uploaded) => {
                          if (uploaded.length === 0) return;
                          setProfessionalCourses((prev) =>
                            prev.map((p) =>
                              p.id === course.id
                                ? {
                                    ...p,
                                    certificateUploads: [...(Array.isArray(p.certificateUploads) ? p.certificateUploads : []), ...uploaded],
                                  }
                                : p,
                            ),
                          );
                        });
                        setProfessionalCertificateErrors((prev) => {
                          const next = { ...prev };
                          delete next[course.id];
                          return next;
                        });
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm border-2"
                      style={{ borderColor: "#0E6049" }}
                      onClick={(e) => {
                        e.preventDefault();
                        (e.currentTarget.parentElement?.querySelector("input[type=file]") as HTMLInputElement | null)?.click();
                      }}
                    >
                      <UploadCloud className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  </label>
                  {course.certificateFile && (
                    <SelectedUploadCard
                      file={course.certificateFile}
                      onRemove={() => {
                        const key = String(course.certificateFile?.name ?? "").trim();
                        setProfessionalCourses((prev) =>
                          prev.map((p) =>
                            p.id === course.id
                              ? {
                                  ...p,
                                  certificateFile: null,
                                  certificateUploads: Array.isArray(p.certificateUploads)
                                    ? p.certificateUploads.filter((u) => {
                                        const stored = String(u?.name ?? "").trim();
                                        const original = String((u as any)?.originalName ?? "").trim();
                                        return key ? stored !== key && original !== key : true;
                                      })
                                    : p.certificateUploads,
                                }
                              : p,
                          ),
                        );
                        setProfessionalCertificateErrors((prev) => {
                          const next = { ...prev };
                          delete next[course.id];
                          return next;
                        });
                      }}
                    />
                  )}
                  {Array.isArray(course.certificateUploads) && course.certificateUploads.length > 0 && (
                    <SelectedUploadMetaList
                      uploads={course.certificateUploads}
                      onRemoveAt={(idx) => {
                        setProfessionalCourses((prev) =>
                          prev.map((p) => {
                            if (p.id !== course.id) return p;
                            const target = p.certificateUploads?.[idx];
                            const key = String((target as any)?.originalName ?? target?.name ?? "").trim();
                            const nextFile =
                              key && p.certificateFile && String(p.certificateFile?.name ?? "").trim() === key ? null : p.certificateFile;
                            return {
                              ...p,
                              certificateFile: nextFile,
                              certificateUploads: p.certificateUploads.filter((_, i) => i !== idx),
                            };
                          }),
                        );
                      }}
                    />
                  )}
                  {professionalCertificateErrors[course.id] && (
                    <p className="text-[11px] text-destructive mt-0.5">{professionalCertificateErrors[course.id]}</p>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="mt-1 text-[11px] md:text-xs rounded-full"
              onClick={addProfessionalCourse}
            >
              Add another professional course
            </Button>
          </div>
        )}
      </div>
      <div className="space-y-1.5">
        <label className="text-xs md:text-sm font-medium text-foreground">
          Certifications (optional)
        </label>
        {certifications.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/70 bg-card/40 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[11px] md:text-xs text-muted-foreground sm:mr-3">
              Add certificates you have earned.
            </p>
            <Button
              type="button"
              variant="outline"
              className="h-8 w-full rounded-full text-[11px] md:text-xs sm:w-auto shrink-0"
              onClick={addCertification}
            >
              Add certification
            </Button>
          </div>
        )}

        {certifications.length > 0 && (
          <div className="space-y-4">
            {certifications.map((cert, index) => (
              <div
                key={cert.id}
                className="rounded-xl border border-border/70 bg-card/60 p-4 md:p-5 space-y-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs md:text-sm font-medium text-foreground">
                    Certification {index + 1}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => removeCertification(cert.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Name of certificate
                    </label>
                    <Input
                      placeholder="e.g. AWS Cloud Practitioner"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                      value={cert.certificateName}
                      onChange={(e) => updateCertification(cert.id, "certificateName", e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Institution / Body
                    </label>
                    <Input
                      placeholder="e.g. Coursera, Microsoft, IIT Bombay"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                      value={cert.institution}
                      onChange={(e) => updateCertification(cert.id, "institution", e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      Start date
                    </label>
                    <Input
                      type="date"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                      max={todayIso}
                      value={cert.startDate || ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!next) {
                          updateCertification(cert.id, "startDate", next);
                          return;
                        }
                        if (isValidIsoDate(next) && next <= todayIso) {
                          updateCertification(cert.id, "startDate", next);
                          if (cert.endDate && isValidIsoDate(cert.endDate) && cert.endDate < next) {
                            updateCertification(cert.id, "endDate", "");
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] md:text-xs font-medium text-foreground">
                      End date
                    </label>
                    <Input
                      type="date"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm"
                      min={cert.startDate || undefined}
                      max={todayIso}
                      value={cert.endDate || ""}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (!next) {
                          updateCertification(cert.id, "endDate", next);
                          return;
                        }
                        if (
                          isValidIsoDate(next) &&
                          next <= todayIso &&
                          (!cert.startDate || (isValidIsoDate(cert.startDate) && next >= cert.startDate))
                        ) {
                          updateCertification(cert.id, "endDate", next);
                        }
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] md:text-xs font-medium text-foreground">
                    Upload certificate
                  </label>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      multiple={false}
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) {
                          setCertificationCertificateErrors((prev) => {
                            const next = { ...prev };
                            delete next[cert.id];
                            return next;
                          });
                          return;
                        }

                        const maxSizeBytes = 1 * 1024 * 1024; // 1MB
                        if (file.size > maxSizeBytes) {
                          setCertificationCertificateErrors((prev) => ({ ...prev, [cert.id]: "File must be under 1MB" }));
                          e.target.value = "";
                          return;
                        }
                        setCertifications((prev) =>
                          prev.map((c) =>
                            c.id === cert.id
                              ? {
                                  ...c,
                                  certificateFile: file,
                                }
                              : c,
                          ),
                        );
                        uploadAcademicsFiles([file]).then((uploaded) => {
                          if (uploaded.length === 0) return;
                          setCertifications((prev) =>
                            prev.map((c) =>
                              c.id === cert.id
                                ? {
                                    ...c,
                                    certificateUploads: [...(Array.isArray(c.certificateUploads) ? c.certificateUploads : []), ...uploaded],
                                  }
                                : c,
                            ),
                          );
                        });
                        setCertificationCertificateErrors((prev) => {
                          const next = { ...prev };
                          delete next[cert.id];
                          return next;
                        });
                        e.target.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-9 md:h-10 rounded-lg text-xs md:text-sm border-2"
                      style={{ borderColor: "#0E6049" }}
                      onClick={(e) => {
                        e.preventDefault();
                        (e.currentTarget.parentElement?.querySelector("input[type=file]") as HTMLInputElement | null)?.click();
                      }}
                    >
                      <UploadCloud className="h-4 w-4 mr-2" />
                      Choose Files
                    </Button>
                  </label>
                  {cert.certificateFile && (
                    <SelectedUploadCard
                      file={cert.certificateFile}
                      onRemove={() => {
                        const key = String(cert.certificateFile?.name ?? "").trim();
                        setCertifications((prev) =>
                          prev.map((c) =>
                            c.id === cert.id
                              ? {
                                  ...c,
                                  certificateFile: null,
                                  certificateUploads: Array.isArray(c.certificateUploads)
                                    ? c.certificateUploads.filter((u) => {
                                        const stored = String(u?.name ?? "").trim();
                                        const original = String((u as any)?.originalName ?? "").trim();
                                        return key ? stored !== key && original !== key : true;
                                      })
                                    : c.certificateUploads,
                                }
                              : c,
                          ),
                        );
                        setCertificationCertificateErrors((prev) => {
                          const next = { ...prev };
                          delete next[cert.id];
                          return next;
                        });
                      }}
                    />
                  )}
                  {Array.isArray(cert.certificateUploads) && cert.certificateUploads.length > 0 && (
                    <SelectedUploadMetaList
                      uploads={cert.certificateUploads}
                      onRemoveAt={(idx) => {
                        setCertifications((prev) =>
                          prev.map((c) => {
                            if (c.id !== cert.id) return c;
                            const target = c.certificateUploads?.[idx];
                            const key = String((target as any)?.originalName ?? target?.name ?? "").trim();
                            const nextFile =
                              key && c.certificateFile && String(c.certificateFile?.name ?? "").trim() === key ? null : c.certificateFile;
                            return {
                              ...c,
                              certificateFile: nextFile,
                              certificateUploads: c.certificateUploads.filter((_, i) => i !== idx),
                            };
                          }),
                        );
                      }}
                    />
                  )}
                  {certificationCertificateErrors[cert.id] && (
                    <p className="text-[11px] text-destructive mt-0.5">{certificationCertificateErrors[cert.id]}</p>
                  )}
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="mt-1 text-[11px] md:text-xs rounded-full"
              onClick={addCertification}
            >
              Add another certification
            </Button>
          </div>
        )}

       
      </div>
    </div>
  );
}

type ExperienceEntry = {
  id: string;
  type: string;
  company: string;
  role: string;
  from: string;
  to: string;
  description: string;
};

function StepExperience({
  initialData,
  onValidityChange,
  onDataChange,
}: {
  initialData?: ExperienceEntry[];
  onValidityChange: (valid: boolean) => void;
  onDataChange?: (data: ExperienceEntry[]) => void;
}) {
  const [experiences, setExperiences] = useState<ExperienceEntry[]>([
    {
      id: `exp-${Date.now()}`,
      type: "",
      company: "",
      role: "",
      from: "",
      to: "",
      description: "",
    },
  ]);

  const [presentIds, setPresentIds] = useState<Record<string, boolean>>({});

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const experienceHydratedRef = useRef(false);

  useEffect(() => {
    if (experienceHydratedRef.current) return;
    if (!Array.isArray(initialData) || initialData.length === 0) return;

    experienceHydratedRef.current = true;
    const nextPresent: Record<string, boolean> = {};

    const normalizeMonth = (v: any) => {
      const raw = String(v ?? "").trim();
      if (!raw) return "";
      if (/^\d{4}-\d{2}$/.test(raw)) return raw;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
      const mmyyyy = raw.match(/^(\d{1,2})\/(\d{4})$/);
      if (mmyyyy) {
        const mm = String(mmyyyy[1]).padStart(2, "0");
        return `${mmyyyy[2]}-${mm}`;
      }
      if (raw.toLowerCase() === "present") return "Present";
      return raw;
    };

    const normalizeExperienceType = (v: any) => {
      const raw = String(v ?? "").trim();
      if (!raw) return "";
      const key = raw.toLowerCase();
      if (key === "internship" || key === "intern") return "Internship";
      if (key === "job" || key === "full-time" || key === "full time") return "Job";
      if (key === "project" || key === "projects") return "Project";
      if (key === "freelancing" || key === "freelance" || key === "freelancer") return "Freelancing";
      if (raw === "Internship" || raw === "Job" || raw === "Project" || raw === "Freelancing") return raw;
      return raw;
    };

    const nextExperiences: ExperienceEntry[] = initialData.map((exp: any) => {
      const rawPeriod = typeof exp.period === "string" ? exp.period : "";
      const rawFrom = typeof exp.from === "string" ? exp.from : "";
      const rawTo = typeof exp.to === "string" ? exp.to : "";

      const normalizedPeriod = rawPeriod.replace(/\s+/g, " ").trim();
      const [periodFrom, periodTo] = (() => {
        if (!normalizedPeriod) return ["", ""];
        const parts = normalizedPeriod.split("-").map((p: string) => p.trim()).filter(Boolean);
        if (parts.length === 0) return ["", ""];
        if (parts.length === 1) return [parts[0], ""];
        return [parts[0], parts.slice(1).join(" - ")];
      })();

      const bullets = Array.isArray(exp.bullets)
        ? exp.bullets.filter((b: any) => typeof b === "string" && b.trim())
        : [];
      const rawDescription = typeof exp.description === "string" ? exp.description : "";
      const description = rawDescription || (bullets.length > 0 ? bullets.join("\n") : "");

      const id = exp.id || `exp-${Date.now()}-${Math.random()}`;
      const fromValue = normalizeMonth(rawFrom || periodFrom);
      const toValue = normalizeMonth(rawTo || periodTo);
      if (String(toValue).toLowerCase() === "present") {
        nextPresent[id] = true;
      }

      return {
        id,
        type: normalizeExperienceType((exp as any)?.type),
        company: typeof exp.company === "string" ? exp.company : "",
        role: typeof exp.role === "string" ? exp.role : "",
        from: fromValue,
        to: toValue,
        description,
      };
    });

    setPresentIds(nextPresent);
    setExperiences(nextExperiences);
  }, [initialData]);

  useEffect(() => {
    const isValidDateLike = (v: string) => {
      const raw = String(v || "").trim();
      if (!raw) return false;
      if (/^\d{4}-\d{2}$/.test(raw)) return true;
      if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return true;
      return false;
    };

    const valid = experiences.every((exp) => {
      const hasAnyField = exp.type || exp.company || exp.role || exp.from || exp.to || exp.description;
      if (!hasAnyField) return true;
      if (!(exp.type && exp.company && exp.role && exp.from && exp.to && exp.description)) return false;

      const fromOk = isValidDateLike(exp.from);
      const toRaw = String(exp.to || "").trim();
      const toOk = toRaw.toLowerCase() === "present" || isValidDateLike(toRaw);
      return fromOk && toOk;
    });
    onValidityChange(valid);
    if (onDataChange) {
      onDataChange(experiences.filter((exp) => exp.type && exp.company && exp.role && exp.from && exp.to && exp.description));
    }
  }, [experiences, onValidityChange, onDataChange]);

  const addExperience = () => {
    setExperiences((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}-${Math.random()}`,
        type: "",
        company: "",
        role: "",
        from: "",
        to: "",
        description: "",
      },
    ]);
  };

  const removeExperience = (id: string) => {
    setExperiences((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((exp) => exp.id !== id);
    });
  };

  const updateExperience = (id: string, field: keyof ExperienceEntry, value: string) => {
    setExperiences((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, [field]: value } : exp)),
    );
  };

  const isPresent = (id: string) => Boolean(presentIds[id]);

  const togglePresent = (id: string, value: boolean) => {
    setPresentIds((prev) => ({ ...prev, [id]: value }));
    if (value) {
      updateExperience(id, "to", "Present");
    } else {
      updateExperience(id, "to", "");
    }
  };

  const toIsoDate = (d: Date) => {
    const t = d.getTime();
    if (Number.isNaN(t)) return "";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const parseIsoDate = (raw: string): Date | null => {
    const value = String(raw || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [y, m, d] = value.split("-").map((p) => Number(p));
    if (!y || !m || !d) return null;
    const local = new Date(y, m - 1, d);
    if (Number.isNaN(local.getTime())) return null;
    return local;
  };

  const displayDate = (raw: string) => {
    const value = String(raw || "").trim();
    if (!value) return "";
    if (value.toLowerCase() === "present") return "Present";
    if (/^\d{4}-\d{2}$/.test(value)) return value;
    const d = parseIsoDate(value);
    if (!d) return value;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Experience"
        subtitle="Tell us about any internships, projects or part‑time work you’ve done."
      />

      {experiences.map((experience, index) => (
        <div key={experience.id} className="space-y-5 p-4 md:p-5 rounded-lg border border-border/50 bg-card/50">
          {experiences.length > 1 && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm font-medium text-muted-foreground">
                Experience {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => removeExperience(experience.id)}
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Remove
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs md:text-sm font-medium text-foreground">Type</label>
            <Select value={experience.type} onValueChange={(v) => updateExperience(experience.id, "type", v)}>
              <SelectTrigger className="h-10 md:h-11 rounded-lg text-sm">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Internship">Internship</SelectItem>
                <SelectItem value="Job">Job</SelectItem>
                <SelectItem value="Project">Project</SelectItem>
                <SelectItem value="Freelancing">Freelancing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-medium text-foreground">
                {experience.type === "Project" ? "Project name" : "Company"}
              </label>
              <Input
                placeholder={experience.type === "Project" ? "Enter project name" : "Enter company name"}
                className="h-10 md:h-11 rounded-lg text-sm"
                value={experience.company}
                onChange={(e) => updateExperience(experience.id, "company", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-medium text-foreground">Role</label>
              <Input
                placeholder="e.g. Marketing Intern"
                className="h-10 md:h-11 rounded-lg text-sm"
                value={experience.role}
                onChange={(e) => updateExperience(experience.id, "role", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-medium text-foreground">From</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 md:h-11 w-full justify-start rounded-lg text-sm font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className={experience.from ? "" : "text-muted-foreground"}>
                      {experience.from ? displayDate(experience.from) : "Select date"}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DateCalendar
                    mode="single"
                    selected={parseIsoDate(experience.from) ?? undefined}
                    toMonth={today}
                    disabled={{
                      after: (() => {
                        const toSelected = parseIsoDate(experience.to);
                        if (toSelected && toSelected.getTime() < today.getTime()) return toSelected;
                        return today;
                      })(),
                    }}
                    onSelect={(d) => {
                      if (!d) return;
                      updateExperience(experience.id, "from", toIsoDate(d));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs md:text-sm font-medium text-foreground">To</label>
              <div className="space-y-2">
                {!isPresent(experience.id) ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 md:h-11 w-full justify-start rounded-lg text-sm font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                        <span className={experience.to ? "" : "text-muted-foreground"}>
                          {experience.to ? displayDate(experience.to) : "Select date"}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <DateCalendar
                        mode="single"
                        selected={parseIsoDate(experience.to) ?? undefined}
                        toMonth={today}
                        disabled={{
                          after: today,
                          before: parseIsoDate(experience.from) ?? undefined,
                        }}
                        onSelect={(d) => {
                          if (!d) return;
                          updateExperience(experience.id, "to", toIsoDate(d));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    type="text"
                    placeholder="Present"
                    className="h-10 md:h-11 rounded-lg text-sm"
                    value={experience.to}
                    disabled
                  />
                )}
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                  <Checkbox
                    checked={isPresent(experience.id)}
                    onCheckedChange={(checked) => togglePresent(experience.id, Boolean(checked))}
                  />
                  <span>I currently work here</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs md:text-sm font-medium text-foreground">
              {experience.type === "Project" ? "Project description" : "About your role"}
            </label>
            <Textarea
              placeholder={
                experience.type === "Project"
                  ? "Describe what you built, your responsibilities and what you learnt."
                  : "Describe what you worked on, your responsibilities and what you learnt."
              }
              className="min-h-[90px] md:min-h-[110px] rounded-lg text-sm"
              value={experience.description}
              onChange={(e) => updateExperience(experience.id, "description", e.target.value)}
            />
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="mt-2 text-xs md:text-sm rounded-full"
        onClick={addExperience}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add more experience
      </Button>
    </div>
  );
}
type ActivityEntry = {
  id: string;
  activity: string;
  level: string;
};

function StepExtraCurricular({
  initialData,
  onDataChange,
}: {
  initialData: any[];
  onDataChange: (next: any[]) => void;
}) {
  const initialList = useMemo<ActivityEntry[]>(() => {
    const list = Array.isArray(initialData) ? initialData : [];
    const out: ActivityEntry[] = [];
    for (const v of list) {
      if (typeof v === "string") {
        const activity = String(v ?? "").trim();
        if (!activity) continue;
        out.push({ id: `act-${Date.now()}-${Math.random()}`, activity, level: "" });
        continue;
      }
      if (v && typeof v === "object") {
        const activity = String((v as any)?.activity ?? (v as any)?.title ?? (v as any)?.name ?? "").trim();
        const level = String((v as any)?.level ?? "").trim();
        if (!activity) continue;
        out.push({ id: String((v as any)?.id ?? `act-${Date.now()}-${Math.random()}`), activity, level });
        continue;
      }
      const activity = String(v ?? "").trim();
      if (!activity) continue;
      out.push({ id: `act-${Date.now()}-${Math.random()}`, activity, level: "" });
    }
    if (out.length === 0) {
      return [
        {
          id: `act-${Date.now()}-${Math.random()}`,
          activity: "",
          level: "Beginner",
        },
      ];
    }
    return out.slice(0, 10);
  }, [initialData]);

  const [items, setItems] = useState<ActivityEntry[]>(initialList);

  const hydratedRef = useRef(false);

  useEffect(() => {
    if (hydratedRef.current) {
      // Only re-hydrate if we actually received persisted data and UI is still empty.
      if (initialList.length > 0 && items.length === 0) {
        setItems(initialList);
      }
      return;
    }

    hydratedRef.current = true;
    setItems(initialList);
  }, [initialList]);

  const pushUpdate = useCallback(
    (next: ActivityEntry[]) => {
      const cleanedForUi = next
        .map((x) => ({
          id: String(x?.id ?? `act-${Date.now()}-${Math.random()}`),
          activity: String(x?.activity ?? ""),
          level: String(x?.level ?? ""),
        }))
        .slice(0, 10);

      setItems(cleanedForUi);

      const cleanedForPersist = cleanedForUi
        .map((x) => ({
          ...x,
          activity: String(x.activity ?? "").trim(),
          level: String(x.level ?? "").trim(),
        }))
        .filter((x) => Boolean(x.activity));

      const normalizePersist = (arr: any[]) =>
        (Array.isArray(arr) ? arr : [])
          .map((v: any) => {
            if (typeof v === "string") return { activity: String(v ?? "").trim(), level: "" };
            if (v && typeof v === "object") {
              return {
                activity: String((v as any)?.activity ?? (v as any)?.title ?? (v as any)?.name ?? "").trim(),
                level: String((v as any)?.level ?? "").trim(),
              };
            }
            return { activity: String(v ?? "").trim(), level: "" };
          })
          .filter((x: any) => Boolean(String(x.activity ?? "").trim()));

      const prevPersist = normalizePersist(initialData);
      const nextPersist = normalizePersist(cleanedForPersist);
      if (JSON.stringify(prevPersist) !== JSON.stringify(nextPersist)) {
        onDataChange(cleanedForPersist);
      }
    },
    [initialData, items.length, onDataChange],
  );

  const addItem = () => {
    const next: ActivityEntry[] = [
      ...items,
      {
        id: `act-${Date.now()}-${Math.random()}`,
        activity: "",
        level: "Beginner",
      },
    ];
    pushUpdate(next);
  };

  const removeItem = (id: string) => {
    pushUpdate(items.filter((x) => x.id !== id));
  };

  const updateItem = (id: string, patch: Partial<ActivityEntry>) => {
    const next = items.map((x) => (x.id === id ? { ...x, ...patch } : x));
    pushUpdate(next);
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Extra-Curricular Activities"
        subtitle="Activities outside academics that show your interests and leadership."
      />

      <Card className="border border-card-border/80 bg-card/95 rounded-2xl p-4 md:p-5">
        <div className="space-y-3">
          {items.length === 0 ? (
            <div className="text-sm text-muted-foreground">No activities added.</div>
          ) : (
            items.map((it) => (
              <div key={it.id} className="rounded-xl border border-border/70 bg-card/60 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Activity</Label>
                    <Input
                      value={it.activity}
                      onChange={(e) => updateItem(it.id, { activity: e.target.value })}
                      placeholder="e.g., NSS Volunteer"
                      className="h-11 rounded-xl text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Level</Label>
                    <Select value={it.level} onValueChange={(v) => updateItem(it.id, { level: v })}>
                      <SelectTrigger className="h-11 rounded-xl text-sm">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {items.length > 1 ? (
                  <div className="mt-3 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeItem(it.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}

          <div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-6"
              onClick={addItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add activity
            </Button>
          </div>
        </div>
      </Card>

      <div className="text-xs text-muted-foreground">
        Adding extra-curriculars is optional but helpful – it highlights your interests, teamwork, and leadership skills beyond academics.
      </div>
    </div>
  );
}

type SkillEntry = {
  id: string;
  name: string;
  rating: number;
};

function StepSkills({
  skills,
  locked,
  onSkillsChange,
}: {
  skills: SkillEntry[];
  locked?: boolean;
  onSkillsChange: (nextSkills: SkillEntry[], complete: boolean) => void;
}) {
  const selectedSkills = skills;
  const isLocked = Boolean(locked);
  const [open, setOpen] = useState(false);
  const [customSkill, setCustomSkill] = useState("");
  const [dismissedSuggestionFor, setDismissedSuggestionFor] = useState<string | null>(null);
  const allSkills = (skillsData as unknown as string[]).sort();

  const toLower = (v: any) => String(v ?? "").trim().toLowerCase();

  const suggestion = useMemo(() => {
    const original = customSkill.trim();
    if (!original) return null;
    if (original.length < 3) return null;
    if (dismissedSuggestionFor === original) return null;

    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const normalized = normalize(original);
    const selectedLower = new Set(selectedSkills.map((s) => toLower((s as any)?.name)));
    if (selectedLower.has(normalized)) return null;

    const levenshtein = (a: string, b: string) => {
      const m = a.length;
      const n = b.length;
      const dp = new Array(n + 1);
      for (let j = 0; j <= n; j++) dp[j] = j;

      for (let i = 1; i <= m; i++) {
        let prev = dp[0];
        dp[0] = i;
        for (let j = 1; j <= n; j++) {
          const tmp = dp[j];
          const cost = a[i - 1] === b[j - 1] ? 0 : 1;
          dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
          prev = tmp;
        }
      }
      return dp[n];
    };

    const maxDistance = Math.min(4, Math.max(1, Math.floor(normalized.length / 3)));
    let best: { value: string; distance: number } | null = null;

    for (const skill of allSkills) {
      const s = normalize(skill);
      if (selectedLower.has(s)) continue;

      const dist = levenshtein(normalized, s);
      if (dist > maxDistance) continue;

      if (!best || dist < best.distance) {
        best = { value: skill, distance: dist };
        if (dist === 1) break;
      }
    }

    if (!best) return null;
    if (best.value.toLowerCase() === normalized) return null;
    return { original, corrected: best.value };
  }, [allSkills, customSkill, dismissedSuggestionFor, selectedSkills]);

  const addSkill = (skillName: string) => {
    if (isLocked) return;
    if (selectedSkills.length >= 7) return;
    const nextLower = toLower(skillName);
    if (selectedSkills.some((s) => toLower((s as any)?.name) === nextLower)) return;

    const next = [
      ...selectedSkills,
      {
        id: `skill-${Date.now()}-${Math.random()}`,
        name: skillName,
        rating: 1,
      },
    ];
    onSkillsChange(next, next.length >= 4);
    setOpen(false);
  };

  const removeSkill = (id: string) => {
    if (isLocked) return;
    const next = selectedSkills.filter((s) => s.id !== id);
    onSkillsChange(next, next.length >= 4);
  };

  const updateRating = (id: string, rating: number) => {
    if (isLocked) return;
    const next = selectedSkills.map((s) => (s.id === id ? { ...s, rating } : s));
    onSkillsChange(next, next.length >= 4);
  };

  const handleCustomSkill = () => {
    if (isLocked) return;
    if (customSkill.trim() && selectedSkills.length < 7) {
      addSkill(customSkill.trim());
      setCustomSkill("");
      setDismissedSuggestionFor(null);
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        title=" Skills"
        subtitle=""
      />

     

      <div className="space-y-2">
        <label className="text-xs md:text-sm font-medium text-foreground">
          Select Skills (up to 7)
        </label>
        <Popover
          open={isLocked ? false : open}
          onOpenChange={(nextOpen) => {
            if (isLocked) return;
            setOpen(nextOpen);
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full min-h-10 md:min-h-11 justify-between rounded-lg text-xs md:text-sm font-normal flex items-center gap-2"
              disabled={isLocked || selectedSkills.length >= 7}
            >
              <div className="flex flex-1 flex-wrap items-center gap-2 text-left">
                {selectedSkills.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[11px] md:text-xs text-foreground"
                  >
                    {skill.name}
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive flex items-center justify-center"
                      disabled={isLocked}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSkill(skill.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {selectedSkills.length < 7 && (
                  <span className="text-muted-foreground whitespace-nowrap">
                    {selectedSkills.length === 0 ? "Search and select skills..." : "Add more skills"}
                  </span>
                )}
              </div>
              <UploadCloud className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput placeholder="Search skills..." />
              <CommandList>
                <CommandEmpty>No skill found.</CommandEmpty>
                <CommandGroup>
                  {allSkills.map((skill) => (
                    <CommandItem
                      key={skill}
                      value={skill}
                      onSelect={() => addSkill(skill)}
                      disabled={selectedSkills.length >= 7 || selectedSkills.some((s) => toLower((s as any)?.name) === toLower(skill))}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedSkills.some((s) => toLower((s as any)?.name) === toLower(skill))
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {skill}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-[11px] text-muted-foreground">
          For the best results, add at least 4 or more skills in order of importance.
        </p>
      </div>

      {/* Custom Skill Input */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Enter custom skill"
            className="h-10 md:h-11 rounded-lg text-sm"
            value={customSkill}
            onChange={(e) => {
              setCustomSkill(e.target.value);
              setDismissedSuggestionFor(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCustomSkill();
              }
            }}
            disabled={isLocked || selectedSkills.length >= 7}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 md:h-11 rounded-lg text-sm"
            onClick={handleCustomSkill}
            disabled={isLocked || selectedSkills.length >= 7 || !customSkill.trim()}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        </div>

        {suggestion && (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <div className="text-foreground">
              These are results for{" "}
              <button
                type="button"
                className="font-semibold text-primary underline underline-offset-2"
                onClick={() => {
                  setCustomSkill(suggestion.corrected);
                }}
              >
                {suggestion.corrected}
              </button>
            </div>
            <div className="text-muted-foreground">
              Search instead for{" "}
              <button
                type="button"
                className="text-primary underline underline-offset-2"
                onClick={() => {
                  setDismissedSuggestionFor(suggestion.original);
                }}
              >
                {suggestion.original}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Selected Skills with Ratings */}
      {selectedSkills.length > 0 && (
        <div className="space-y-4">
          {selectedSkills.map((skill, index) => (
            <div key={skill.id} className="p-4 rounded-lg border border-border/50 bg-card/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">#{index + 1}</span>
                  <span className="text-sm font-medium text-foreground">{skill.name}</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeSkill(skill.id)}
                  disabled={isLocked}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Rating</label>
                <Select
                  value={String((skill as any)?.rating ?? 1)}
                  onValueChange={(value) => {
                    const next = parseInt(value, 10);
                    updateRating(skill.id, Number.isFinite(next) ? next : 1);
                  }}
                  disabled={isLocked}
                >
                  <SelectTrigger className="h-10 md:h-11 rounded-lg text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Beginner</SelectItem>
                    <SelectItem value="2">Intermediate</SelectItem>
                    <SelectItem value="3">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Information */}
      <div className="space-y-2 pt-2">
      

        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 mt-3">
          <div className="flex items-start gap-2">
            <span className="text-yellow-600 dark:text-yellow-400 text-base">⚠</span>
            <div className="flex-1">
              <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Important Note</p>
              <p className="text-[11px] text-yellow-700 dark:text-yellow-300">
                The self-evaluated skill ratings you provide will directly influence the difficulty level of your AI interview. Giving honest and accurate ratings will ensure you are assessed fairly, helping you achieve a better score and improving your chances of being shortlisted by employers.
              </p>
               <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-3">
        <div className="text-[11px] md:text-xs text-muted-foreground leading-relaxed">
          <ol className="list-decimal pl-4 space-y-1">
            <li>
              Your AI interview questions are based on the skills you provide, allowing employers to assess you accurately.
            </li>
            <li>
              Once submitted, skills cannot be changed as this impacts your vetting status. To update skills after completion of your AI Interview, please contact Findtern Support; note that additional charges and terms apply.
            </li>
          </ol>
        </div>
      </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

type LanguageEntry = {
  id: string;
  language: string;
  level: string;
  read: string;
  write: string;
  speak: string;
};

function StepLanguages({
  initialData,
  onValidityChange,
  onDataChange,
}: {
  initialData?: any[];
  onValidityChange: (valid: boolean) => void;
  onDataChange?: (data: any[]) => void;
}) {
  const [languages, setLanguages] = useState<LanguageEntry[]>([
    {
      id: `lang-${Date.now()}-hi`,
      language: "hindi",
      level: "native",
      read: "yes",
      write: "yes",
      speak: "yes",
    },
    {
      id: `lang-${Date.now()}-en`,
      language: "english",
      level: "professional",
      read: "yes",
      write: "yes",
      speak: "yes",
    },
  ]);

  const languagesHydratedRef = useRef(false);

  useEffect(() => {
    if (languagesHydratedRef.current) return;
    if (!Array.isArray(initialData) || initialData.length === 0) return;

    languagesHydratedRef.current = true;
    setLanguages(
      initialData.map((lang: any) => ({
        id: lang.id || `lang-${Date.now()}-${Math.random()}`,
        language: lang.language || "",
        level: lang.level || "",
        read: lang.read || "",
        write: lang.write || "",
        speak: lang.speak || "",
      }))
    );
  }, [initialData]);

  const addLanguage = () => {
    setLanguages([
      ...languages,
      {
        id: `lang-${Date.now()}-${Math.random()}`,
        language: "",
        level: "",
        read: "",
        write: "",
        speak: "",
      },
    ]);
  };

  const removeLanguage = (id: string) => {
    if (languages.length > 1) {
      setLanguages(languages.filter((lang) => lang.id !== id));
    }
  };

  const updateLanguage = (id: string, field: keyof LanguageEntry, value: string) => {
    const updated = languages.map((lang) => (lang.id === id ? { ...lang, [field]: value } : lang));
    setLanguages(updated);
  };

  useEffect(() => {
    const isFilled = (value: string) => value.trim().length > 0;
    const isComplete = (lang: LanguageEntry) =>
      isFilled(lang.language) &&
      isFilled(lang.level) &&
      isFilled(lang.read) &&
      isFilled(lang.write) &&
      isFilled(lang.speak);

    const complete = languages.filter(isComplete);
    const valid = languages.length > 0 && complete.length === languages.length;

    if (onDataChange) {
      onDataChange(complete);
    }
    onValidityChange(valid);
  }, [languages, onDataChange, onValidityChange]);

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Languages"
        subtitle="Tell us which languages you’re comfortable with for work and communication."
      />

      <div className="space-y-4">
        {languages.map((language, index) => (
          <div key={language.id} className="p-4 rounded-lg border border-border/50 bg-card/50 space-y-3">
            {languages.length > 1 && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs md:text-sm font-medium text-muted-foreground">
                  Language {index + 1}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => removeLanguage(language.id)}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs md:text-sm font-medium text-foreground">Language</label>
                <Select
                  value={language.language || undefined}
                  onValueChange={(value) => updateLanguage(language.id, "language", value)}
                >
                  <SelectTrigger className="h-10 md:h-11 rounded-lg text-sm">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hindi">Hindi</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="spanish">Spanish</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                    <SelectItem value="chinese">Chinese</SelectItem>
                    <SelectItem value="japanese">Japanese</SelectItem>
                    <SelectItem value="korean">Korean</SelectItem>
                    <SelectItem value="arabic">Arabic</SelectItem>
                    <SelectItem value="portuguese">Portuguese</SelectItem>
                    <SelectItem value="italian">Italian</SelectItem>
                    <SelectItem value="russian">Russian</SelectItem>
                    <SelectItem value="tamil">Tamil</SelectItem>
                    <SelectItem value="telugu">Telugu</SelectItem>
                    <SelectItem value="marathi">Marathi</SelectItem>
                    <SelectItem value="bengali">Bengali</SelectItem>
                    <SelectItem value="gujarati">Gujarati</SelectItem>
                    <SelectItem value="kannada">Kannada</SelectItem>
                    <SelectItem value="malayalam">Malayalam</SelectItem>
                    <SelectItem value="punjabi">Punjabi</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs md:text-sm font-medium text-foreground">Level</label>
                <Select
                  value={language.level || undefined}
                  onValueChange={(value) => updateLanguage(language.id, "level", value)}
                >
                  <SelectTrigger className="h-10 md:h-11 rounded-lg text-sm">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="native">Native</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {["Read", "Write", "Speak"].map((label) => (
                <div key={label} className="space-y-1.5">
                  <label className="text-xs md:text-sm font-medium text-foreground">{label}</label>
                  <Select
                    value={(language[label.toLowerCase() as keyof LanguageEntry] as string) || undefined}
                    onValueChange={(value) => updateLanguage(language.id, label.toLowerCase() as keyof LanguageEntry, value)}
                  >
                    <SelectTrigger className="h-10 md:h-11 rounded-lg text-sm">
                      <SelectValue placeholder="Yes/No" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-1 text-xs md:text-sm rounded-full"
        onClick={addLanguage}
      >
        <Plus className="h-4 w-4 mr-2" />
        Add language
      </Button>
    </div>
  );
}

function StepLocationPreferences({
  state,
  onChange,
  onValidityChange,
}: {
  state: LocationPreferencesState;
  onChange: (next: LocationPreferencesState) => void;
  onValidityChange: (valid: boolean) => void;
}) {
  const { locationTypes, preferredLocations, hasLaptop } = state;
  const [locationSearch, setLocationSearch] = useState("");
  const [customLocationDialogOpen, setCustomLocationDialogOpen] = useState(false);
  const [customCityDraft, setCustomCityDraft] = useState("");
  const [customStateDraft, setCustomStateDraft] = useState("");
  const [locationTypesTouched, setLocationTypesTouched] = useState(false);
  const [preferredLocationsTouched, setPreferredLocationsTouched] = useState(false);
  const [hasLaptopTouched, setHasLaptopTouched] = useState(false);
  const customCityInputRef = useRef<HTMLInputElement | null>(null);
  const customStateInputRef = useRef<HTMLInputElement | null>(null);

  const indianCityOptions = useMemo(() => {
    const raw: any = cityStatePincode as any;
    const districts: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.districts)
        ? raw.districts
        : [];

    const seen = new Set<string>();
    const out: Array<{ city: string; state: string; value: string }> = [];

    for (const d of districts) {
      const city = String(d?.district ?? d?.city ?? "").trim();
      const st = String(d?.state ?? "").trim();
      if (!city) continue;
      if (!st) continue;
      const value = `${city}, ${st}`;
      const key = value.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ city, state: st, value });
    }

    return out.sort((a, b) => a.value.localeCompare(b.value));
  }, []);

  const toggleLocationType = (type: string) => {
    setLocationTypesTouched(true);
    const alreadySelected = locationTypes.includes(type);

    // Naye rules ke hisaab se fixed combinations:
    // - Remote click  -> ["remote"]
    // - Hybrid click  -> ["remote", "hybrid"]
    // - Onsite click  -> ["remote", "hybrid", "onsite"]
    // - Agar jo type already selected hai uspe dobara click karein -> sab clear

    if (alreadySelected) {
      onChange({ ...state, locationTypes: [] });
      return;
    }

    if (type === "remote") {
      onChange({ ...state, locationTypes: ["remote"], preferredLocations: [] });
      setPreferredLocationsTouched(false);
    } else if (type === "hybrid") {
      onChange({ ...state, locationTypes: ["remote", "hybrid"] });
    } else if (type === "onsite") {
      onChange({ ...state, locationTypes: ["remote", "hybrid", "onsite"] });
    }
  };

  const addLocation = (city: string) => {
    if (preferredLocations.length >= 5) return;
    const normalized = city.trim();
    if (!normalized) return;
    if (!preferredLocations.some((x) => x.toLowerCase() === normalized.toLowerCase())) {
      onChange({ ...state, preferredLocations: [...preferredLocations, normalized] });
      setLocationSearch("");
    }
  };

  const removeLocation = (city: string) => {
    onChange({
      ...state,
      preferredLocations: preferredLocations.filter((loc) => loc !== city),
    });
  };

  const filteredCityOptions = indianCityOptions.filter((opt) => {
    const q = locationSearch.toLowerCase();
    return opt.city.toLowerCase().includes(q) || opt.state.toLowerCase().includes(q);
  });

  const cityToUniqueValue = useMemo(() => {
    const map = new Map<string, string>();
    const dupes = new Set<string>();
    for (const opt of indianCityOptions) {
      const k = opt.city.toLowerCase();
      if (map.has(k)) {
        dupes.add(k);
        continue;
      }
      map.set(k, opt.value);
    }
    dupes.forEach((k) => {
      map.delete(k);
    });
    return map;
  }, [indianCityOptions]);

  const formatPreferredLocation = useCallback(
    (loc: string) => {
      const trimmed = String(loc ?? "").trim();
      if (!trimmed) return trimmed;
      if (trimmed.includes(",")) return trimmed;
      return cityToUniqueValue.get(trimmed.toLowerCase()) ?? trimmed;
    },
    [cityToUniqueValue]
  );

  const customCandidate = locationSearch.trim();
  const showCustomAdd =
    !!customCandidate &&
    filteredCityOptions.length === 0 &&
    !preferredLocations.some((x) => x.toLowerCase() === customCandidate.toLowerCase());

  const canSaveCustomLocation = Boolean(customCityDraft.trim() && customStateDraft.trim());

  useEffect(() => {
    if (!customLocationDialogOpen) return;
    const id = window.setTimeout(() => {
      customCityInputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(id);
  }, [customLocationDialogOpen]);

  const saveCustomLocation = () => {
    const city = customCityDraft.trim();
    const st = customStateDraft.trim();
    if (!city || !st) return;
    if (preferredLocations.length >= 5) return;
    addLocation(`${city}, ${st}`);
    setPreferredLocationsTouched(true);
    setCustomLocationDialogOpen(false);
  };

  const requiresPreferredLocations = locationTypes.includes("hybrid") || locationTypes.includes("onsite");
  const requiresLaptop = true;
  const showLaptopError = requiresLaptop && !hasLaptop && (hasLaptopTouched || locationTypesTouched || preferredLocationsTouched);

  useEffect(() => {
    const validLocationType = locationTypes.length > 0;
    const validPreferredLocations = !requiresPreferredLocations || preferredLocations.length > 0;
    const validLaptop = !requiresLaptop || hasLaptop === "yes" || hasLaptop === "no";
    onValidityChange(validLocationType && validPreferredLocations && validLaptop);
  }, [locationTypes, preferredLocations, hasLaptop, onValidityChange, requiresPreferredLocations, requiresLaptop]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Location Preferences"
        subtitle="Help us match you with internships that fit your location preferences and availability."
      />

      <div className="space-y-3">
        <label className="text-xs md:text-sm font-medium text-foreground">
          Internship Location Types<span className="text-destructive ml-0.5">*</span>
          <span className="text-xs text-muted-foreground ml-2">(select at least one)</span>
        </label>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={locationTypes.includes("remote")}
              onCheckedChange={() => toggleLocationType("remote")}
            />
            <span className="flex items-center gap-1.5">
              <Globe className="w-4 h-4" />
              <span>Remote</span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={locationTypes.includes("hybrid")}
              onCheckedChange={() => toggleLocationType("hybrid")}
            />
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>Hybrid</span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <Checkbox
              checked={locationTypes.includes("onsite")}
              onCheckedChange={() => toggleLocationType("onsite")}
            />
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              <span>Onsite</span>
            </span>
          </label>
        </div>

      

        {locationTypesTouched && locationTypes.length === 0 && (
          <p className="text-[11px] text-destructive">Please select at least one location type</p>
        )}
      </div>

      {requiresPreferredLocations && (
        <div className="space-y-3">
          <label className="text-xs md:text-sm font-medium text-foreground">
            Preferred Locations
            <span className="text-destructive ml-0.5">*</span>
            <span className="text-xs text-muted-foreground ml-2">(up to 5 cities)</span>
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full h-11 justify-between rounded-xl text-sm font-normal border-2 hover:border-[#0E6049]/50 transition-colors"
                disabled={preferredLocations.length >= 5}
              >
                <span className="text-muted-foreground flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {preferredLocations.length >= 5 ? "Maximum 5 locations selected" : "Search Indian cities..."}
                </span>
                <UploadCloud className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[min(400px,calc(100vw-2rem))] p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search cities..."
                  value={locationSearch}
                  onValueChange={setLocationSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    <div className="px-2 py-2 text-xs text-muted-foreground">
                      No city found.
                      {showCustomAdd && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="px-1"
                          onClick={() => {
                            const parts = customCandidate
                              .split(",")
                              .map((x) => x.trim())
                              .filter(Boolean);
                            setCustomCityDraft(parts[0] ?? customCandidate);
                            setCustomStateDraft(parts.length > 1 ? parts.slice(1).join(", ") : "");
                            setCustomLocationDialogOpen(true);
                          }}
                        >
                          Add "{customCandidate}"
                        </Button>
                      )}
                    </div>
                  </CommandEmpty>
                  <CommandGroup>
                    {filteredCityOptions.map((opt) => (
                      <CommandItem
                        key={opt.value}
                        value={opt.value}
                        onSelect={() => {
                          addLocation(opt.value);
                          setPreferredLocationsTouched(true);
                        }}
                        disabled={preferredLocations.some((x) => formatPreferredLocation(x).toLowerCase() === opt.value.toLowerCase()) || preferredLocations.length >= 5}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            preferredLocations.some((x) => formatPreferredLocation(x).toLowerCase() === opt.value.toLowerCase()) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex items-center justify-between w-full gap-3">
                          <span className="truncate">{opt.city}</span>
                          <span className="text-[11px] text-muted-foreground shrink-0">{opt.state}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Dialog open={customLocationDialogOpen} onOpenChange={setCustomLocationDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add custom location</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>City</Label>
                  <Input
                    ref={customCityInputRef}
                    value={customCityDraft}
                    onChange={(e) => setCustomCityDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setCustomLocationDialogOpen(false);
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        customStateInputRef.current?.focus();
                      }
                    }}
                    placeholder="Enter city"
                    className="h-10 rounded-lg"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>State</Label>
                  <Input
                    ref={customStateInputRef}
                    value={customStateDraft}
                    onChange={(e) => setCustomStateDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setCustomLocationDialogOpen(false);
                        return;
                      }
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!canSaveCustomLocation || preferredLocations.length >= 5) return;
                        saveCustomLocation();
                      }
                    }}
                    placeholder="Enter state"
                    className="h-10 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setCustomLocationDialogOpen(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#0E6049] hover:bg-[#0b4b3a]"
                    disabled={!canSaveCustomLocation || preferredLocations.length >= 5}
                    onClick={() => {
                      saveCustomLocation();
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {preferredLocations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {preferredLocations.map((city) => (
                <Badge
                  key={city}
                  variant="secondary"
                  className="px-3 py-1.5 text-xs flex items-center gap-1.5 bg-[#0E6049]/10 text-[#0E6049] border border-[#0E6049]/20 hover:bg-[#0E6049]/20 transition-colors"
                >
                  <MapPin className="w-3 h-3" />
                  {formatPreferredLocation(city)}
                  <button
                    type="button"
                    onClick={() => removeLocation(city)}
                    className="ml-1 hover:text-destructive transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          {preferredLocations.length === 0 && (
            <p className="text-[11px] text-muted-foreground">Select cities where you'd prefer to work</p>
          )}
          {preferredLocationsTouched && preferredLocations.length === 0 && (
            <p className="text-[11px] text-destructive">Please select at least one preferred location</p>
          )}
        </div>
      )}

      <div className="space-y-3 p-4 rounded-xl border-2 border-border bg-card/50">
        <label className="text-xs md:text-sm font-medium text-foreground flex items-center gap-2">
          <Laptop className="w-4 h-4" />
          Do you have a laptop?
          <span className="text-destructive ml-0.5">*</span>
        </label>
        <RadioGroup
          value={hasLaptop}
          onValueChange={(value) => {
            setHasLaptopTouched(true);
            onChange({ ...state, hasLaptop: value });
          }}
        >
          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="yes" id="laptop-yes" className="border-2" />
              <Label htmlFor="laptop-yes" className="text-sm font-normal cursor-pointer">
                Yes, I have a laptop
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="no" id="laptop-no" className="border-2" />
              <Label htmlFor="laptop-no" className="text-sm font-normal cursor-pointer">
                No, I don't have a laptop
              </Label>
            </div>
          </div>
        </RadioGroup>
        {!hasLaptop && (
          <p className="text-[11px] text-muted-foreground mt-2">
            Some remote internships may require you to have your own laptop
          </p>
        )}
        {showLaptopError && (
          <p className="text-[11px] text-destructive mt-2">Please select whether you have a laptop</p>
        )}
      </div>

    </div>
  );
}

function FinishOnboardingButton({
  aboutMe,
  academicsData,
  experienceData,
  skills,
  languagesData,
  extracurricularData,
  locationPrefs,
  languagesComplete,
  aboutMeIsValid,
  onSuccess,
  isEditMode,
}: {
  aboutMe: AboutMeForm;
  academicsData: any;
  experienceData: any[];
  skills: SkillEntry[];
  languagesData: any[];
  extracurricularData: any[];
  locationPrefs: LocationPreferencesState;
  languagesComplete: boolean;
  aboutMeIsValid: boolean;
  onSuccess: () => void;
  isEditMode: boolean;
}) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const academicsStatus = String(academicsData?.status ?? "").trim();
  const isAcademicsCompleted = academicsStatus === "Completed";
  const academicsLevel = String(academicsData?.level ?? "").trim();
  const scoreOk =
    academicsLevel === "phd" ||
    !isAcademicsCompleted ||
    String(academicsData?.score ?? "").trim() !== "";

  const uploadDocumentsIfNeeded = async (userId: string) => {
    const formData = new FormData();
    formData.append("userId", userId);

    if (aboutMe.profilePhoto) formData.append("profilePhoto", aboutMe.profilePhoto);
    if (ENABLE_PROFILE_INTRO_VIDEO && aboutMe.introVideo) formData.append("introVideo", aboutMe.introVideo);
    if (aboutMe.aadhaarImage) formData.append("aadhaarImage", aboutMe.aadhaarImage);
    if (aboutMe.panImage) formData.append("panImage", aboutMe.panImage);

    const hasAny =
      !!aboutMe.profilePhoto ||
      !!aboutMe.aadhaarImage ||
      !!aboutMe.panImage ||
      (ENABLE_PROFILE_INTRO_VIDEO && !!aboutMe.introVideo);

    if (!hasAny) return;

    const res = await fetch("/api/onboarding/documents/upload", {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    if (!res.ok) {
      const msg = await res
        .json()
        .then((j) => j?.message)
        .catch(() => null);
      throw new Error(msg || "Failed to upload documents");
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      // Get userId from localStorage (set during signup)
      let userId = localStorage.getItem("userId");
      console.log("handleFinish: Initial userId check:", userId);

      // If no userId, try to recover from email
      if (!userId) {
        const userEmail = localStorage.getItem("userEmail");
        if (userEmail) {
          console.log("Attempting to recover userId from email:", userEmail);
          try {
            const response = await apiRequest("GET", `/api/auth/user/by-email/${encodeURIComponent(userEmail ?? "")}`);
            const data = await response.json();
            if (data.user?.id) {
              userId = data.user.id;
              console.log("Successfully recovered userId:", userId);
              if (userId) {
                localStorage.setItem("userId", userId);
              }
            }
          } catch (err) {
            console.error("Failed to recover userId:", err);
          }
        }
      }

      if (!userId) {
        console.error("UserId not found in localStorage. Available keys:", Object.keys(localStorage));
        toast({
          title: "User not found",
          description: "Please sign up first before completing onboarding. If you just signed up, try refreshing the page.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }
      console.log("Using userId for onboarding:", userId);

      let updatedUser: any | null = null;
      const fn = String(aboutMe.firstName ?? "").trim();
      const ln = String(aboutMe.lastName ?? "").trim();
      const cc = String(aboutMe.phoneCountryCode ?? "").trim();
      const pn = String(aboutMe.phone ?? "").trim();
      if (fn || ln || cc || pn) {
        try {
          const nameRes = await apiRequest("PUT", `/api/users/${encodeURIComponent(userId)}`, {
            ...(fn ? { firstName: fn } : {}),
            ...(ln ? { lastName: ln } : {}),
            ...(cc ? { countryCode: cc } : {}),
            ...(pn ? { phoneNumber: pn } : {}),
          });
          const nameJson = await nameRes.json().catch(() => null);
          updatedUser = nameJson?.user ?? null;
        } catch (e: any) {
          if (e?.status === 409) {
            toast({
              title: "Phone number already in use",
              description: e?.message || "This phone number is already in use. Please enter another.",
              variant: "destructive",
            });
            return;
          }
          throw e;
        }
      }

      const onboardingData = {
        userId,
        linkedinUrl: aboutMe.linkedinUrl || null,
        pinCode: null,
        state: aboutMe.state || null,
        city: aboutMe.city || null,
        aadhaarNumber: aboutMe.aadhaarNumber || null,
        panNumber: aboutMe.panNumber || null,
        bio: ENABLE_PROFILE_BIO ? aboutMe.bio || null : null,
        experienceJson: experienceData || [],
        skills: (Array.isArray(skills) ? skills : []).map((s) => ({
          id: String((s as any)?.id ?? "").trim() || `skill-${Date.now()}-${Math.random()}`,
          name: String((s as any)?.name ?? "").trim(),
          rating: (() => {
            const n = Number((s as any)?.rating);
            return Number.isFinite(n) ? n : 1;
          })(),
        })).filter((s) => Boolean(s.name)),
        locationTypes: locationPrefs.locationTypes || [],
        preferredLocations: locationPrefs.preferredLocations || [],
        hasLaptop: locationPrefs.hasLaptop === "yes" ? true : locationPrefs.hasLaptop === "no" ? false : null,
        previewSummary: ENABLE_PROFILE_BIO ? aboutMe.bio || "" : "",
        extraData: {
          academics: academicsData,
          languages: languagesData,
          extracurricular: extracurricularData,
          emergencyCountryCode: String(aboutMe.emergencyCountryCode ?? "").trim() || null,
          emergencyPhone: String(aboutMe.emergencyPhone ?? "").trim() || null,
          secondPocCountryCode: String(aboutMe.secondPocCountryCode ?? "").trim() || null,
          secondPocPhone: String(aboutMe.secondPocPhone ?? "").trim() || null,
        },
      };

      console.log("Onboarding data to send:", onboardingData);
      console.log("locationTypes type:", typeof onboardingData.locationTypes);
      console.log("locationTypes value:", onboardingData.locationTypes);

      const response = await apiRequest("POST", "/api/onboarding", onboardingData);
      const result = await response.json();

      try {
        await uploadDocumentsIfNeeded(userId);
      } catch (docErr) {
        console.error("Failed to upload documents:", docErr);
      }

      try {
        const fn = String(aboutMe.firstName ?? "").trim();
        const ln = String(aboutMe.lastName ?? "").trim();
        const queryKey: [string, string] = ["/api/onboarding", userId];

        queryClient.setQueryData(queryKey, (prev: any) => {
          const prevObj = prev && typeof prev === "object" ? prev : {};
          const prevUser = prevObj?.user && typeof prevObj.user === "object" ? prevObj.user : {};

          const mergedUser = {
            ...prevUser,
            ...(updatedUser && typeof updatedUser === "object" ? updatedUser : {}),
            ...(fn ? { firstName: fn } : {}),
            ...(ln ? { lastName: ln } : {}),
          };

          return {
            ...prevObj,
            user: mergedUser,
            onboarding: result?.onboarding ?? prevObj?.onboarding ?? null,
            intern_document: prevObj?.intern_document ?? null,
          };
        });

        await queryClient.invalidateQueries({ queryKey });
      } catch (e) {
        console.error("Failed to refresh onboarding cache:", e);
      }

      toast({
        title: isEditMode ? "Profile updated!" : "Onboarding completed!",
        description: "Your profile has been saved successfully.",
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Failed to save onboarding",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Button
      type="button"
      className="px-6 text-xs md:text-sm rounded-full"
      style={{ backgroundColor: '#0E6049' }}
      onClick={handleFinish}
      disabled={isSaving || !aboutMeIsValid || (!isEditMode && (!languagesComplete || !scoreOk))}
    >
      {isSaving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        isEditMode ? "Save Changes" : "Finish "
      )}
    </Button>
  );
}

function StepProfilePreview({
  aboutMe,
  existingDocuments,
  academicsData,
  experienceData,
  skills,
  languagesData,
  extracurricularData,
  locationPrefs,
}: {
  aboutMe: AboutMeForm;
  existingDocuments?: any | null;
  academicsData: any;
  experienceData: any[];
  skills: SkillEntry[];
  languagesData: any[];
  extracurricularData: any[];
  locationPrefs: LocationPreferencesState;
}) {
  const primarySkills = skills.slice(0, 6).map((s) => s.name);
  const locationSummary =
    locationPrefs.preferredLocations.length > 0
      ? locationPrefs.preferredLocations.join(", ")
      : aboutMe.city || "";

  const extracurricularList = useMemo(() => {
    const list = Array.isArray(extracurricularData) ? extracurricularData : [];
    return list
      .map((v: any) => {
        if (typeof v === "string") return v;
        if (v && typeof v === "object") {
          const title = String((v as any)?.title ?? "").trim();
          const name = String((v as any)?.name ?? "").trim();
          const value = String((v as any)?.value ?? "").trim();
          return title || name || value;
        }
        return String(v ?? "").trim();
      })
      .map((v: any) => String(v ?? "").trim())
      .filter(Boolean)
      .slice(0, 6);
  }, [extracurricularData]);

  const preferredLocationPairs = useMemo(() => {
    return (locationPrefs.preferredLocations || [])
      .map((raw) => String(raw ?? "").trim())
      .filter(Boolean)
      .map((raw) => {
        const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
        const city = parts[0] ?? raw;
        const state = parts.length > 1 ? parts.slice(1).join(", ") : "";
        return { city, state, raw };
      });
  }, [locationPrefs.preferredLocations]);

  const fullName = `${aboutMe.firstName || ""} ${aboutMe.lastName || ""}`.trim() || "Your Name";
  const contactPhone = aboutMe.phone ? `${aboutMe.phoneCountryCode} ${aboutMe.phone}` : "Phone";
  const contactEmail = aboutMe.email || "Email";
  const contactCity = locationSummary || aboutMe.city || "City";

  const introVideoPreview = ENABLE_PROFILE_INTRO_VIDEO && aboutMe.introVideo ? URL.createObjectURL(aboutMe.introVideo) : null;

  const headline = ENABLE_PROFILE_BIO && aboutMe.bio
    ? aboutMe.bio.split("\n")[0].slice(0, 120)
    : "Student · Looking for internships";

  const locationLine = [aboutMe.city, aboutMe.state].filter(Boolean).join(", ") || contactCity;

  const existingProfilePhotoUrl = useMemo(() => {
    const fn = String((existingDocuments as any)?.profilePhotoName ?? "").trim();
    if (!fn) return null;
    if (/^https?:\/\//i.test(fn)) return fn;
    if (fn.startsWith("/uploads/")) return fn;
    if (fn.startsWith("/")) return fn;
    const safePath = fn
      .split("/")
      .map((seg) => encodeURIComponent(seg))
      .join("/");
    return `/uploads/${safePath}`;
  }, [existingDocuments]);

  const profilePhotoPreviewUrl = useMemo(() => {
    if (aboutMe.profilePhoto) return URL.createObjectURL(aboutMe.profilePhoto);
    return existingProfilePhotoUrl;
  }, [aboutMe.profilePhoto, existingProfilePhotoUrl]);

  useEffect(() => {
    if (!aboutMe.profilePhoto) return;
    const url = profilePhotoPreviewUrl;
    if (!url || !url.startsWith("blob:")) return;
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [aboutMe.profilePhoto, profilePhotoPreviewUrl]);

  const educationText = academicsData
    ? `${academicsData.degree || ""}${academicsData.institution ? ` from ${academicsData.institution}` : ""}${academicsData.endYear ? ` (${academicsData.endYear})` : ""}`.trim()
    : "Your latest degree, college, graduation year and key academic details will show here.";

  const locationTypesText = locationPrefs.locationTypes.length > 0
    ? locationPrefs.locationTypes.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", ")
    : "";

  const hasLaptopText = locationPrefs.hasLaptop === "yes" ? "Yes" : locationPrefs.hasLaptop === "no" ? "No" : "";

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Profile Preview"
        subtitle="Here’s how your internship profile will look to companies once you complete onboarding."
      />

      <div className="grid grid-cols-1 md:grid-cols-[0.9fr_1.5fr] gap-4 md:gap-6">
        {/* Sidebar summary */}
        <div className="rounded-2xl bg-card/90 border border-card-border/80 text-foreground px-5 py-6 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                {profilePhotoPreviewUrl ? (
                  <img
                    src={profilePhotoPreviewUrl}
                    alt="Profile"
                    className="h-20 w-20 rounded-2xl object-cover border border-border bg-background"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center border border-border bg-background">
                    <span className="text-muted-foreground text-xs">Photo</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-lg font-semibold leading-tight truncate">{fullName}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{headline}</div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span className="truncate">{locationLine}</span>
                </div>
              </div>

            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="font-semibold uppercase tracking-[0.18em] text-[11px] mb-1.5">
                Contact
              </div>
              <p className="text-muted-foreground">
                {contactPhone} • {contactEmail}
              </p>
            </div>
            <div>
              <div className="font-semibold uppercase tracking-[0.18em] text-[11px] mb-1.5">
                Skills
              </div>
              <p className="text-muted-foreground">
                {primarySkills.length > 0
                  ? primarySkills.join(" · ")
                  : "A quick list of your key skills and strengths so companies can scan your profile fast."}
              </p>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="rounded-2xl bg-card/80 border border-card-border/80 px-5 py-6 space-y-4">
          <div>
            <h3 className="text-sm md:text-base font-semibold mb-1">Education</h3>
            <p className="text-xs md:text-sm text-muted-foreground">{educationText}</p>
          </div>

          {experienceData && experienceData.length > 0 && (
            <div>
              <h3 className="text-sm md:text-base font-semibold mb-1">Experience</h3>
              <div className="space-y-2">
                {experienceData.map((exp, idx) => (
                  <div key={idx} className="text-xs md:text-sm text-muted-foreground">
                    {exp.type && <span className="mr-2">{exp.type}</span>}
                    <span className="font-medium">{exp.role}</span>
                    {exp.company && ` at ${exp.company}`}
                    {exp.from && exp.to && ` (${exp.from} - ${exp.to})`}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm md:text-base font-semibold mb-1">Location & Preferences</h3>
            <div className="space-y-2 text-xs md:text-sm text-muted-foreground">
              {locationTypesText && (
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  <span>Location Types: {locationTypesText}</span>
                </div>
              )}
              {locationPrefs.preferredLocations.length > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <div className="flex flex-wrap items-center gap-2">
                    <span>Preferred:</span>
                    {preferredLocationPairs.map((loc) => (
                      <Badge
                        key={loc.raw}
                        variant="secondary"
                        className="px-2.5 py-1 text-[11px] bg-muted/60 text-foreground border border-border/60 max-w-full whitespace-normal break-words"
                      >
                        <span className="font-medium">City:</span>
                        <span className="ml-1 break-words">{loc.city}</span>
                        {loc.state ? (
                          <>
                            <span className="mx-2 text-muted-foreground">|</span>
                            <span className="font-medium">State:</span>
                            <span className="ml-1 break-words">{loc.state}</span>
                          </>
                        ) : null}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {hasLaptopText && (
                <div className="flex items-center gap-2">
                  <Laptop className="w-4 h-4" />
                  <span>Laptop: {hasLaptopText}</span>
                </div>
              )}
            </div>
          </div>

 
        </div>
      </div>
    </div>
  );
}

