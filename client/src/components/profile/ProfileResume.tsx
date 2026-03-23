import { useEffect, useState, type FC, type ReactNode } from "react";
import { Mail, Linkedin, IdCard, MapPin, Laptop, Phone, BookOpen, Sparkles, Languages } from "lucide-react";
import logoRemove from "@assets/logo-remove.png";

const ENABLE_PROFILE_BIO = false;

const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(" ");

const formatBytes = (value?: number | null) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return "";
  if (value <= 0) return "0 B";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(value) / Math.log(k)));
  const n = value / Math.pow(k, i);
  return `${n.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const toTitleCase = (value: string) => {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

type User = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  countryCode?: string | null;
  phoneNumber?: string | null;
  role?: string | null;
};

type OnboardingSkill = { id: string; name: string; rating?: number };

type OnboardingLanguage = {
  id: string;
  language: string;
  level?: string;
  read?: string;
  write?: string;
  speak?: string;
};

type OnboardingAcademics = {
  level?: string;
  score?: string;
  degree?: string;
  status?: string;
  endYear?: string;
  scoreType?: string;
  startYear?: string;
  institution?: string;
  specialization?: string;
  professionalCourses?: {
    id?: string;
    level?: string;
    status?: string;
    institution?: string;
    courseNamePreset?: "CA" | "CS" | "CMA" | "CFA" | "Other" | "";
    courseNameOther?: string;
    completionDate?: string;
    scoreType?: string;
    score?: string;
    certificateUploads?: { name: string; type: string; size: number }[];
  }[];
  certifications?: {
    id?: string;
    certificateName?: string;
    institution?: string;
    startDate?: string;
    endDate?: string;
    certificateUploads?: { name: string; type: string; size: number }[];
  }[];
};

type OnboardingExperience = {
  id?: string;
  company?: string;
  role?: string;
  location?: string;
  period?: string;
  from?: string;
  to?: string;
  description?: string;
  bullets?: string[];
};

type OnboardingData = {
  linkedinUrl?: string | null;
  pinCode?: string | null;
  state?: string | null;
  city?: string | null;
  aadhaarNumber?: string | null;
  panNumber?: string | null;
  experienceJson?: OnboardingExperience[];
  skills?: OnboardingSkill[];
  bio?: string | null;
  previewSummary?: string | null;
  locationTypes?: string[];
  preferredLocations?: string[];
  hasLaptop?: boolean;
  extraData?: {
    academics?: OnboardingAcademics;
    languages?: OnboardingLanguage[];
    extracurricular?: unknown[];
  };
};

type MediaKey = "profilePhoto" | "introVideo" | "aadhaarImage" | "panImage";

const openOnboardingMediaDb = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
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

interface ProfileResumeProps {
  user: User | null;
  onboarding?: OnboardingData;
  documents?: any;
}

const StickyHeader = ({ children, className }: { children: string; className?: string }) => {
  return (
    <div
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-sm bg-yellow-200 text-slate-900 shadow-[0_6px_0_rgba(0,0,0,0.08)]",
        "font-semibold tracking-wide",
        "-rotate-2",
        className
      )}
    >
      {children}
    </div>
  );
};

type ChipVariant = "outline" | "solid";

const Chip: FC<{ children: ReactNode; variant?: ChipVariant; className?: string }> = ({
  children,
  variant = "outline",
  className,
}) => {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold max-w-full whitespace-normal break-words",
        "border border-slate-200",
        variant === "solid" ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-800",
        className
      )}
    >
      {children}
    </span>
  );
};

const formatPeriod = (e: OnboardingExperience) => {
  const p = String(e.period ?? "").trim();
  if (p) return p;
  const from = String(e.from ?? "").trim();
  const to = String(e.to ?? "").trim();
  if (from && to) return `${from} — ${to}`;
  return from || to || "";
};

const ProfileResume: FC<ProfileResumeProps> = ({
  user,
  onboarding,
  documents,
}) => {
  const fullName = `${(user?.firstName ?? "").trim()} ${(user?.lastName ?? "").trim()}`.trim();
  const title = onboarding?.extraData?.academics?.degree || "";

  const city = onboarding?.city || "";
  const state = onboarding?.state || "";
  const pin = onboarding?.pinCode || "";
  const addressLine = [city, state, pin].filter(Boolean).join(", ");

  const phone = [user?.countryCode, user?.phoneNumber].filter(Boolean).join(" ").trim();
  const email = (user?.email ?? "").trim();

  const skills = onboarding?.skills ?? [];
  const languages = onboarding?.extraData?.languages ?? [];
  const academics = onboarding?.extraData?.academics;
  const experiences = (onboarding?.experienceJson as OnboardingExperience[] | undefined) ?? [];

  const certificationsCount = (() => {
    const raw = (academics as any)?.certifications;
    if (!Array.isArray(raw)) return 0;
    return raw.filter((c: any) => {
      if (!c || typeof c !== "object") return false;
      const name = String(c.certificateName ?? c.name ?? "").trim();
      const institution = String(c.institution ?? "").trim();
      const start = String(c.startDate ?? "").trim();
      const end = String(c.endDate ?? "").trim();
      const uploads = Array.isArray(c.certificateUploads) ? c.certificateUploads : [];
      return Boolean(name || institution || start || end || uploads.length > 0);
    }).length;
  })();

  const ratingEntries = (() => {
    const raw = (onboarding as any)?.extraData?.ratings ?? {};
    const round1 = (n: number) => Math.round(n * 10) / 10;
    const storedFindternScore = (onboarding as any)?.extraData?.findternScore;
    const computedFindternScore = (() => {
      if (typeof storedFindternScore === "number" && Number.isFinite(storedFindternScore)) {
        return round1(storedFindternScore);
      }

      const comm = raw.communication;
      const coding = raw.coding;
      const aptitude = raw.aptitude;
      const interview = raw.interview;
      if (
        typeof comm !== "number" ||
        !Number.isFinite(comm) ||
        typeof coding !== "number" ||
        !Number.isFinite(coding) ||
        typeof aptitude !== "number" ||
        !Number.isFinite(aptitude) ||
        typeof interview !== "number" ||
        !Number.isFinite(interview)
      ) {
        return null;
      }
      return round1((comm + coding + aptitude + interview) / 4);
    })();

    const entries = [
      ...(computedFindternScore !== null
        ? [{ key: "findternScore", label: "Findtern Score", value: computedFindternScore }]
        : []),
      { key: "overall", label: "Overall", value: raw.overall },
      { key: "communication", label: "Communication", value: raw.communication },
      { key: "aptitude", label: "Aptitude", value: raw.aptitude },
      { key: "coding", label: "Coding", value: raw.coding },
      { key: "academic", label: "Academic", value: raw.academic },
      { key: "interview", label: "Interview", value: raw.interview },
    ]
      .filter((e) => typeof e.value === "number" && Number.isFinite(e.value))
      .map((e) => ({ ...e, value: e.value as number }));

    return entries;
  })();

  const locationTypes = onboarding?.locationTypes ?? [];
  const preferredLocations = onboarding?.preferredLocations ?? [];
  const requiresPreferredLocations = locationTypes.includes("hybrid") || locationTypes.includes("onsite");
  const preferredLocationsDisplay =
    preferredLocations.length > 0
      ? preferredLocations
      : !requiresPreferredLocations && locationTypes.includes("remote")
        ? ["Remote"]
        : [];
  const hasLaptop = onboarding?.hasLaptop;
  const extracurricular = onboarding?.extraData?.extracurricular ?? [];

  const linkedinUrl = (onboarding?.linkedinUrl ?? "").trim();

  const maskedAadhaar = (() => {
    const raw = (onboarding?.aadhaarNumber ?? "").replace(/\s+/g, "");
    if (!raw) return "";
    const last4 = raw.slice(-4);
    return `XXXX-XXXX-${last4}`;
  })();

  const maskedPan = (() => {
    const raw = (onboarding?.panNumber ?? "").trim();
    if (!raw) return "";
    if (raw.length <= 4) return raw;
    return `${raw.slice(0, 2)}XXXXX${raw.slice(-2)}`;
  })();

  const headline = title
    ? title
    : "Student · Looking for internships";

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);

  const profileUploadUrl = (() => {
    const fn = String(documents?.profilePhotoName ?? "").trim();
    if (!fn) return null;
    return `/uploads/${encodeURIComponent(fn)}`;
  })();

  useEffect(() => {
    let active = true;
    let lastProfileUrl: string | null = null;

    (async () => {
      const profileFile = await loadMediaFromDb("profilePhoto");
      if (!active) return;

      if (profileFile) {
        const url = URL.createObjectURL(profileFile);
        lastProfileUrl = url;
        setProfilePhotoUrl(url);
      } else {
        setProfilePhotoUrl(profileUploadUrl);
      }
    })();

    return () => {
      active = false;
      if (lastProfileUrl) URL.revokeObjectURL(lastProfileUrl);
    };
  }, [profileUploadUrl]);

  return (
    <div className="w-full flex justify-start bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/30 py-4 sm:py-6 px-3 sm:px-4">
      <div
        className={cn(
          "w-full max-w-6xl rounded-2xl border border-slate-200 bg-white/80 shadow-sm overflow-hidden relative",
          "backdrop-blur",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-y-0 right-0 hidden lg:block",
            "w-[260px]",
            "bg-slate-950",
            "border-l border-slate-200/60"
          )}
        >
          <img
            src={logoRemove}
            alt="Findtern"
            className="absolute left-1/2 top-1/2  w-auto max-w-[100%] -translate-x-1/2 -translate-y-1/2 rotate-90 opacity-90 select-none pointer-events-none"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
          <div className="lg:col-span-12 p-4 sm:p-7">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
              <div className="shrink-0 flex items-start">
                <div className="relative">
                  <div className="absolute -inset-2 rounded-2xl bg-slate-900/5 blur-sm" />
                  <div className="relative w-[112px] h-[112px] sm:w-[140px] sm:h-[140px] rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm rotate-2">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200" />
                    )}
                  </div>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-3xl sm:text-[44px] leading-[1.05] sm:leading-[0.95] font-black tracking-tight text-slate-900 break-words">
                  {fullName || "Your Name"}
                </div>
                <div className="mt-2 text-sm sm:text-base text-slate-700 font-medium">
                  {headline}
                </div>

                {ratingEntries.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {ratingEntries.slice(0, 4).map((r) => (
                      <div
                        key={r.key}
                        className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-xs font-semibold max-w-full whitespace-normal break-words"
                        title={r.label}
                      >
                        {r.label}: {r.value}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="hidden lg:block sm:ml-auto">
                <div className="relative h-[140px] w-[56px]" />
              </div>
            </div>

            <div className="mt-6">
              <StickyHeader className="rotate-1">Skills</StickyHeader>
              <div className="mt-4">
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <div
                        key={s.id}
                        className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-sm text-slate-800 shadow-[0_4px_0_rgba(0,0,0,0.05)] max-w-full whitespace-normal break-words"
                      >
                        {s.name}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500">No skills added yet.</div>
                )}
              </div>
            </div>

            <div className="mt-6">
              <StickyHeader className="-rotate-1">Academics</StickyHeader>
              <div className="mt-4 text-sm text-slate-700">
                {academics ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div>
                        <span className="font-semibold text-slate-900">Level:</span>{" "}
                        {(() => {
                          const raw = String(academics.level ?? "").trim();
                          if (!raw) return "Not specified.";
                          return raw.toLowerCase() === "phd" ? "Ph.D" : raw;
                        })()}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Degree:</span> {String(academics.degree ?? "").trim() || "Not specified."}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Institution:</span> {String(academics.institution ?? "").trim() || "Not specified."}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Status:</span> {String(academics.status ?? "").trim() || "Not specified."}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Specialization:</span> {String(academics.specialization ?? "").trim() || "Not specified."}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <span className="font-semibold text-slate-900">Score:</span>{" "}
                        {String(academics.score ?? "").trim()
                          ? `${String(academics.score ?? "").trim()} ${String(academics.scoreType ?? "").trim()}`.trim()
                          : "Not specified."}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">Start year:</span> {String(academics.startYear ?? "").trim() || "Not specified."}
                      </div>
                      <div>
                        <span className="font-semibold text-slate-900">End year:</span> {String(academics.endYear ?? "").trim() || "Not specified."}
                      </div>
                      {certificationsCount > 0 ? (
                        <div>
                          <span className="font-semibold text-slate-900">Certifications:</span>{" "}
                          {String(certificationsCount)}
                        </div>
                      ) : null}
                      <div>
                        <span className="font-semibold text-slate-900">Professional courses:</span>{" "}
                        {Array.isArray((academics as any)?.professionalCourses)
                          ? String(((academics as any).professionalCourses as any[]).length)
                          : "0"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500">Not specified.</div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Languages className="w-4 h-4" />
                  Languages
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  {languages.length > 0 ? (
                    <div className="space-y-1 max-w-sm">
                      {languages.map((l) => (
                        <div key={l.id} className="grid grid-cols-[1fr_auto] items-baseline gap-3">
                          <div className="font-medium">{toTitleCase(l.language)}</div>
                          <div className="text-slate-500 text-right">{(l.level ?? "").trim()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500">Not specified.</div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <Laptop className="w-4 h-4" />
                  Availability
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {typeof hasLaptop === "boolean" ? (
                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-900 text-white">
                      {hasLaptop ? "Has laptop" : "No laptop"}
                    </div>
                  ) : null}
                  {locationTypes.map((t) => (
                    <div
                      key={t}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-white border border-slate-200"
                    >
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6">
              <div>
                <StickyHeader className="rotate-1">Preferred Locations</StickyHeader>
                <div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {preferredLocationsDisplay.length > 0 ? (
                      <>
                        {preferredLocationsDisplay.map((loc) => (
                          <div key={loc} title={loc} className="max-w-full">
                            <Chip>{loc}</Chip>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="text-xs text-slate-500">Not specified.</div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <StickyHeader className="-rotate-1">Contact</StickyHeader>
                <div className="mt-4 space-y-2 text-sm">
                  {email ? (
                    <div className="flex items-center gap-2 text-slate-800">
                      <Mail className="w-4 h-4 text-slate-600" />
                      <a className="break-words hover:underline" href={`mailto:${email}`}>
                        {email}
                      </a>
                    </div>
                  ) : null}
                  {phone ? (
                    <div className="flex items-center gap-2 text-slate-800">
                      <Phone className="w-4 h-4 text-slate-600" />
                      <span className="break-words">{phone}</span>
                    </div>
                  ) : null}
                  {linkedinUrl ? (
                    <a
                      className="flex items-center gap-2 text-slate-800 hover:underline"
                      href={linkedinUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Linkedin className="w-4 h-4 text-slate-600" />
                      <span className="break-words">{linkedinUrl.replace(/^https?:\/\//i, "")}</span>
                    </a>
                  ) : null}
                  {addressLine ? (
                    <div className="flex items-center gap-2 text-slate-800">
                      <MapPin className="w-4 h-4 text-slate-600" />
                      <span className="break-words">{addressLine}</span>
                    </div>
                  ) : null}

                  {(maskedAadhaar || maskedPan) && (
                    <div className="pt-2 mt-3 border-t border-slate-200/70 text-xs text-slate-600 space-y-1">
                      {maskedAadhaar ? (
                        <div className="flex items-center gap-2">
                          <IdCard className="w-4 h-4 text-slate-500" />
                          <span>Aadhaar: {maskedAadhaar}</span>
                        </div>
                      ) : null}
                      {maskedPan ? (
                        <div className="flex items-center gap-2">
                          <IdCard className="w-4 h-4 text-slate-500" />
                          <span>PAN: {maskedPan}</span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <StickyHeader className="-rotate-1">Experience</StickyHeader>
                <div className="mt-4 text-sm text-slate-700">
                  {experiences.length > 0 ? (
                    <div className="space-y-3">
                      {experiences.map((e, idx) => (
                        <div key={e.id ?? String(idx)} className="rounded-xl border border-slate-200 bg-white p-3">
                          <div className="font-semibold text-slate-900">{String(e.role ?? "").trim() || "Experience"}</div>
                          <div className="mt-1 text-slate-700">
                            {[String(e.company ?? "").trim(), String(e.location ?? "").trim()].filter(Boolean).join(" · ")}
                          </div>
                          {formatPeriod(e) ? <div className="mt-1 text-xs text-slate-500">{formatPeriod(e)}</div> : null}
                          {String(e.description ?? "").trim() ? (
                            <div className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{String(e.description ?? "").trim()}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500">No experience added yet.</div>
                  )}
                </div>
              </div>

              {/* <div>
                <StickyHeader className="rotate-1">User Details</StickyHeader>
                <div className="mt-4 text-sm text-slate-700 space-y-1">
                  <div>
                    <span className="font-semibold text-slate-900">User ID:</span> {String(user?.id ?? "").trim() || "Not specified."}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Role:</span> {String(user?.role ?? "").trim() || "Not specified."}
                  </div>
                </div>
              </div> */}

              {extracurricular.length > 0 ? (
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <BookOpen className="w-4 h-4" />
                    Extracurricular
                  </div>
                  <div className="mt-2 text-sm text-slate-700">
                    {Array.isArray(extracurricular) ? String(extracurricular.length) : ""}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileResume;