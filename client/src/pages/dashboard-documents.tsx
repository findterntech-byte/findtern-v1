import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import findternLogo from "@assets/logo.png";
import { ArrowLeft, FileText, Image as ImageIcon, Video } from "lucide-react";

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

export default function DashboardDocumentsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [introVideoUrl, setIntroVideoUrl] = useState<string | null>(null);
  const [aadhaarUrl, setAadhaarUrl] = useState<string | null>(null);
  const [panUrl, setPanUrl] = useState<string | null>(null);

  const storedUserId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  const storedUserEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null;

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

  const { data: userByEmailResp } = useQuery<any>({
    queryKey: ["/api/auth/user/by-email", storedUserEmail ? encodeURIComponent(storedUserEmail) : ""],
    enabled: !storedUserId && !!storedUserEmail,
    queryFn: async ({ queryKey }) => {
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
  const documents = onboardingResp?.intern_document || null;

  const profileUploadUrl = (() => {
    const fn = String(documents?.profilePhotoName ?? "").trim();
    if (!fn) return null;
    return `/uploads/${encodeURIComponent(fn)}`;
  })();
  const introUploadUrl = (() => {
    const fn = String(documents?.introVideoName ?? "").trim();
    if (!fn) return null;
    return `/uploads/${encodeURIComponent(fn)}`;
  })();
  const aadhaarUploadUrl = (() => {
    const fn = String(documents?.aadhaarImageName ?? "").trim();
    if (!fn) return null;
    return `/uploads/${encodeURIComponent(fn)}`;
  })();
  const panUploadUrl = (() => {
    const fn = String(documents?.panImageName ?? "").trim();
    if (!fn) return null;
    return `/uploads/${encodeURIComponent(fn)}`;
  })();

  useEffect(() => {
    let active = true;
    let lastProfileUrl: string | null = null;
    let lastIntroUrl: string | null = null;
    let lastAadhaarUrl: string | null = null;
    let lastPanUrl: string | null = null;

    (async () => {
      const [profileFile, introFile, aadhaarFile, panFile] = await Promise.all([
        loadMediaFromDb("profilePhoto"),
        loadMediaFromDb("introVideo"),
        loadMediaFromDb("aadhaarImage"),
        loadMediaFromDb("panImage"),
      ]);
      if (!active) return;

      if (profileFile) {
        const url = URL.createObjectURL(profileFile);
        lastProfileUrl = url;
        setProfilePhotoUrl(url);
      } else {
        setProfilePhotoUrl(profileUploadUrl);
      }

      if (introFile) {
        const url = URL.createObjectURL(introFile);
        lastIntroUrl = url;
        setIntroVideoUrl(url);
      } else {
        setIntroVideoUrl(introUploadUrl);
      }

      if (aadhaarFile) {
        const url = URL.createObjectURL(aadhaarFile);
        lastAadhaarUrl = url;
        setAadhaarUrl(url);
      } else {
        setAadhaarUrl(aadhaarUploadUrl);
      }

      if (panFile) {
        const url = URL.createObjectURL(panFile);
        lastPanUrl = url;
        setPanUrl(url);
      } else {
        setPanUrl(panUploadUrl);
      }
    })();

    return () => {
      active = false;
      if (lastProfileUrl) URL.revokeObjectURL(lastProfileUrl);
      if (lastIntroUrl) URL.revokeObjectURL(lastIntroUrl);
      if (lastAadhaarUrl) URL.revokeObjectURL(lastAadhaarUrl);
      if (lastPanUrl) URL.revokeObjectURL(lastPanUrl);
    };
  }, [profileUploadUrl, introUploadUrl, aadhaarUploadUrl, panUploadUrl]);

  const documentRows: { label: string; name?: string | null; type?: string | null; size?: number | null }[] = [
    {
      label: "Profile photo",
      name: documents?.profilePhotoName,
      type: documents?.profilePhotoType,
      size: documents?.profilePhotoSize,
    },
    {
      label: "Intro video",
      name: documents?.introVideoName,
      type: documents?.introVideoType,
      size: documents?.introVideoSize,
    },
    {
      label: "Aadhaar",
      name: documents?.aadhaarImageName,
      type: documents?.aadhaarImageType,
      size: documents?.aadhaarImageSize,
    },
    {
      label: "PAN",
      name: documents?.panImageName,
      type: documents?.panImageType,
      size: documents?.panImageSize,
    },
  ];

  const hasAnyDocuments = documentRows.some((r) => !!r.name);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-2 md:px-6">
          <div className="flex items-center gap-2">
            <img src={findternLogo} alt="Findtern" className="inner_logo__img"  />
            {/* <span className="text-lg font-semibold text-[#0E6049]">FINDTERN</span>
            <span className="text-sm text-muted-foreground">INTERNSHIP SIMPLIFIED</span> */}
          </div>

          <Button variant="outline" className="h-9 text-xs" onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>

      <div className="container px-4 md:px-6 py-6">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-lg font-semibold">Documents</div>
                <div className="text-xs text-muted-foreground">
                  View your uploaded documents{user?.firstName ? `, ${user.firstName}` : ""}.
                </div>
              </div>
            </div>

            {!hasAnyDocuments && (
              <div className="mt-4 text-sm text-muted-foreground">No documents uploaded yet.</div>
            )}

            {hasAnyDocuments && (
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    Profile photo
                  </div>
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 overflow-hidden aspect-video flex items-center justify-center">
                    {profilePhotoUrl ? (
                      <img src={profilePhotoUrl} alt="Profile photo" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground text-xs">
                        <FileText className="h-5 w-5 mb-1" />
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground truncate" title={documents?.profilePhotoName ?? ""}>
                    {documents?.profilePhotoName || ""}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    Intro video
                  </div>
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 overflow-hidden aspect-video flex items-center justify-center">
                    {introVideoUrl ? (
                      <video src={introVideoUrl} className="h-full w-full " controls playsInline />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground text-xs">
                        <FileText className="h-5 w-5 mb-1" />
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground truncate" title={documents?.introVideoName ?? ""}>
                    {documents?.introVideoName || ""}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    Aadhaar
                  </div>
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 overflow-hidden aspect-video flex items-center justify-center">
                    {aadhaarUrl ? (
                      <img src={aadhaarUrl} alt="Aadhaar" className="h-full w-full " />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground text-xs">
                        <FileText className="h-5 w-5 mb-1" />
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground truncate" title={documents?.aadhaarImageName ?? ""}>
                    {documents?.aadhaarImageName || ""}
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    PAN
                  </div>
                  <div className="mt-3 rounded-xl border border-border/60 bg-muted/30 overflow-hidden aspect-video flex items-center justify-center">
                    {panUrl ? (
                      <img src={panUrl} alt="PAN" className="h-full w-full " />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground text-xs">
                        <FileText className="h-5 w-5 mb-1" />
                        No preview
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-[11px] text-muted-foreground truncate" title={documents?.panImageName ?? ""}>
                    {documents?.panImageName || ""}
                  </div>
                </Card>
              </div>
            )}
          </Card>

          {hasAnyDocuments && (
            <Card className="p-6">
              <div className="text-sm font-medium">File details</div>
              <div className="mt-3 space-y-2">
                {documentRows
                  .filter((r) => !!r.name)
                  .map((r) => (
                    <div
                      key={r.label}
                      className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-card/40 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{r.label}</div>
                        <div className="text-xs text-muted-foreground truncate" title={r.name ?? ""}>
                          {r.name}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0 text-right">
                        {typeof r.size === "number" ? `${Math.round(r.size / 1024)} KB` : ""}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}