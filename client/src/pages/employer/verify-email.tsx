import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { saveEmployerAuth } from "@/lib/employerAuth";

function getEmailFromQuery() {
  if (typeof window === "undefined") return "";
  const params = new URLSearchParams(window.location.search);
  return String(params.get("email") ?? "").trim().toLowerCase();
}

export default function EmployerVerifyEmailPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState<string>("");
  const [otp, setOtp] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const cooldownSeconds = useMemo(() => {
    const ms = cooldownUntil - nowMs;
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }, [cooldownUntil, nowMs]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  useEffect(() => {
    document.title = "Findtern - Verify Email";

    const initial = getEmailFromQuery();
    if (initial) {
      setEmail(initial);
      try {
        window.localStorage.setItem("pendingEmployerEmail", initial);
      } catch {}
      return;
    }

    try {
      const stored = String(window.localStorage.getItem("pendingEmployerEmail") ?? "").trim().toLowerCase();
      if (stored) setEmail(stored);
    } catch {}
  }, []);

  useEffect(() => {
    if (!email) return;

    let cancelled = false;
    const run = async () => {
      try {
        setSending(true);
        const res = await apiRequest("POST", "/api/auth/email/send-otp", { email, role: "employer" });
        await res.json().catch(() => null);
        if (!cancelled) {
          setCooldownUntil(Date.now() + 60 * 1000);
        }
      } catch (e: any) {
        if (!cancelled && e?.status === 429) {
          const remainingSeconds = Number((e as any)?.data?.remainingSeconds);
          if (Number.isFinite(remainingSeconds) && remainingSeconds > 0) {
            setCooldownUntil(Date.now() + Math.ceil(remainingSeconds) * 1000);
          }
        }
      } finally {
        if (!cancelled) setSending(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [email]);

  const sendOtp = async () => {
    const trimmed = String(email ?? "").trim().toLowerCase();
    if (!trimmed) {
      toast({ title: "Email required", description: "Please enter your email", variant: "destructive" });
      return;
    }

    try {
      setSending(true);
      const res = await apiRequest("POST", "/api/auth/email/send-otp", { email: trimmed, role: "employer" });
      await res.json().catch(() => null);
      setCooldownUntil(Date.now() + 60 * 1000);
      toast({ title: "OTP sent", description: `We sent a 6-digit code to ${trimmed}` });
      try {
        window.localStorage.setItem("pendingEmployerEmail", trimmed);
      } catch {}
    } catch (e: any) {
      if (e?.status === 429) {
        const remainingSeconds = Number((e as any)?.data?.remainingSeconds);
        if (Number.isFinite(remainingSeconds) && remainingSeconds > 0) {
          setCooldownUntil(Date.now() + Math.ceil(remainingSeconds) * 1000);
          toast({ title: "Please wait", description: e?.message ?? "Please wait before requesting a new code" });
          return;
        }
      }
      toast({ title: "Could not send OTP", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const verify = async () => {
    const trimmedEmail = String(email ?? "").trim().toLowerCase();
    const trimmedOtp = String(otp ?? "").trim();

    if (!trimmedEmail) {
      toast({ title: "Email required", description: "Please enter your email", variant: "destructive" });
      return;
    }
    if (!/^\d{6}$/.test(trimmedOtp)) {
      toast({ title: "Invalid code", description: "Enter the 6-digit OTP", variant: "destructive" });
      return;
    }

    try {
      setVerifying(true);
      const verifyRes = await apiRequest("POST", "/api/auth/email/verify-otp", {
        email: trimmedEmail,
        role: "employer",
        otp: trimmedOtp,
      });

      const verifyJson = await verifyRes.json().catch(() => null);
      const verifiedEmployer = (verifyJson as any)?.subject;

      let pendingEmployerId: string | null = null;
      try {
        pendingEmployerId = window.localStorage.getItem("pendingEmployerId");
      } catch {}

      if (verifiedEmployer?.id) {
        saveEmployerAuth(verifiedEmployer, { persist: "local" });
        try {
          window.localStorage.removeItem("pendingEmployerId");
          window.localStorage.removeItem("pendingEmployerEmail");
        } catch {}

        toast({ title: "Email verified", description: "Your email has been verified successfully." });

        const setupCompleted = Boolean(verifiedEmployer?.setupCompleted);
        const onboardingCompleted = Boolean(verifiedEmployer?.onboardingCompleted);
        if (!setupCompleted) {
          setLocation("/employer/setup");
          return;
        }
        if (!onboardingCompleted) {
          setLocation("/employer/onboarding");
          return;
        }
        setLocation("/employer/dashboard");
        return;
      }

      if (pendingEmployerId) {
        try {
          const res = await fetch(`/api/employer/${encodeURIComponent(pendingEmployerId)}`, {
            credentials: "include",
          });
          if (res.ok) {
            const json = (await res.json()) as any;
            const employer = json?.employer;
            if (employer?.id) {
              saveEmployerAuth(employer, { persist: "local" });
            }
          }
        } catch {}

        try {
          window.localStorage.removeItem("pendingEmployerId");
          window.localStorage.removeItem("pendingEmployerEmail");
        } catch {}

        toast({ title: "Email verified", description: "Your email has been verified successfully." });
        setLocation("/employer/setup");
        return;
      }

      toast({ title: "Email verified", description: "Your email has been verified successfully." });
    } catch (e: any) {
      toast({ title: "Verification failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-74px)] bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 md:p-8 border-card-border shadow-lg">
        <h1 className="text-2xl md:text-3xl font-semibold text-center text-foreground mb-2">
          Verify your email
        </h1>
        <p className="text-center text-muted-foreground mb-6">
          Enter the 6-digit code sent to your company email.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">Email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="h-12 mt-1"
              disabled={verifying}
            />
          </div>

          <div className="flex items-center justify-center">
            <InputOTP maxLength={6} value={otp} onChange={setOtp} disabled={verifying}>
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, idx) => (
                  <InputOTPSlot key={idx} index={idx} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <Button className="w-full h-12" onClick={verify} disabled={verifying}>
            {verifying ? "Verifying..." : "Verify"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12"
            onClick={sendOtp}
            disabled={sending || cooldownSeconds > 0}
          >
            {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : sending ? "Sending..." : "Resend code"}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <span>Wrong email?</span>{" "}
            <Link href="/employer/signup" className="text-primary underline">
              Go back
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
