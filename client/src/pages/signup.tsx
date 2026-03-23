import { useState, useMemo, SVGProps, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import findternLogo from "@assets/logo.png";

function GoogleGIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.69 1.22 9.19 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.9-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.17 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function PasswordStrengthIndicator({ password }: { password: string }) {
  const requirements = useMemo(() => {
    return [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
      { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
      { label: "Contains number", met: /[0-9]/.test(password) },
      { label: "Contains special character", met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
    ];
  }, [password]);

  const strength = useMemo(() => {
    const metCount = requirements.filter((r) => r.met).length;
    if (metCount === 0) return { level: 0, label: "", color: "" };
    if (metCount <= 2) return { level: 1, label: "Weak", color: "bg-destructive" };
    if (metCount <= 3) return { level: 2, label: "Fair", color: "bg-yellow-500" };
    if (metCount <= 4) return { level: 3, label: "Good", color: "bg-primary/70" };
    return { level: 4, label: "Strong", color: "bg-primary" };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2" data-testid="password-strength-indicator">
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-colors ${level <= strength.level ? strength.color : "bg-muted"
                }`}
              data-testid={`strength-bar-${level}`}
            />
          ))}
        </div>
        {strength.label && (
          <span
            className={`text-xs font-medium ${strength.level <= 1
              ? "text-destructive"
              : strength.level === 2
                ? "text-yellow-600 dark:text-yellow-500"
                : "text-primary"
              }`}
            data-testid="text-strength-label"
          >
            {strength.label}
          </span>
        )}
      </div>

      {/* Requirements list */}
      <div className="grid grid-cols-1 gap-1">
        {requirements.map((req, index) => (
          <div
            key={index}
            className="flex items-center gap-1.5 text-xs"
            data-testid={`requirement-${index}`}
          >
            {req.met ? (
              <Check className="w-3.5 h-3.5 text-primary" />
            ) : (
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <span className={req.met ? "text-foreground" : "text-muted-foreground"}>
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [emailVerificationActive, setEmailVerificationActive] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [otp, setOtp] = useState<string>("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const form = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      countryCode: "+91",
      phoneNumber: "",
      password: "",
      agreedToTerms: true,
    },
  });

  const emailValue = form.watch("email");

  useEffect(() => {
    setEmailVerificationActive(false);
    setEmailVerified(false);
    setOtp("");
    setCooldownUntil(0);
  }, [emailValue]);

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
    document.title = "Findtern - Sign Up";

    form.setValue("countryCode", "+91", { shouldDirty: false, shouldTouch: false });
    form.setValue("agreedToTerms", true, { shouldDirty: false, shouldTouch: false, shouldValidate: false });

    const params = new URLSearchParams(window.location.search);
    const googleEmail = params.get("googleEmail");
    const firstName = params.get("firstName");
    const lastName = params.get("lastName");

    if (googleEmail) {
      form.setValue("email", googleEmail, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
    if (firstName) {
      form.setValue("firstName", firstName, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
    if (lastName) {
      form.setValue("lastName", lastName, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
  }, [form]);

  const signupMutation = useMutation({
    mutationFn: async (data: InsertUser) => {
      const response = await apiRequest("POST", "/api/auth/signup", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      if (!data?.user?.id) {
        toast({
          title: "Registration failed",
          description: "User created but ID not returned. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      try {
        localStorage.removeItem("onboardingDraft");
        localStorage.removeItem("onboardingActiveStep");
        if (typeof indexedDB !== "undefined") {
          indexedDB.deleteDatabase("findternOnboarding");
        }
      } catch {}

      try {
        localStorage.setItem("userId", String(data.user.id));
        localStorage.setItem("userEmail", String(data.user.email ?? ""));

        const currentValues = form.getValues();
        localStorage.setItem("signupFirstName", currentValues.firstName || "");
        localStorage.setItem("signupLastName", currentValues.lastName || "");
        localStorage.setItem("signupCountryCode", currentValues.countryCode || "+91");
        localStorage.setItem("signupPhoneNumber", currentValues.phoneNumber || "");
      } catch {}

      toast({
        title: "Account created",
        description: "Your account has been created successfully.",
      });

      setLocation("/onboarding-loading");
    },
    onError: (error: Error) => {
      console.error("Signup error:", error);
      toast({
        title: "Registration failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const sendOtp = async () => {
    const trimmed = String(emailValue ?? "").trim().toLowerCase();
    if (!trimmed) {
      toast({ title: "Email required", description: "Please enter your email", variant: "destructive" });
      return;
    }

    try {
      setSendingOtp(true);
      const res = await apiRequest("POST", "/api/auth/signup/send-otp", { email: trimmed });
      await res.json().catch(() => null);
      setEmailVerificationActive(true);
      setCooldownUntil(Date.now() + 60 * 1000);
      toast({ title: "OTP sent", description: `We sent a 6-digit code to ${trimmed}` });
    } catch (e: any) {
      if (e?.status === 429) {
        const remainingSeconds = Number((e as any)?.data?.remainingSeconds);
        if (Number.isFinite(remainingSeconds) && remainingSeconds > 0) {
          setEmailVerificationActive(true);
          setCooldownUntil(Date.now() + Math.ceil(remainingSeconds) * 1000);
          toast({ title: "Please wait", description: e?.message ?? "Please wait before requesting a new code" });
          return;
        }
      }
      toast({ title: "Could not send OTP", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    const trimmedEmail = String(emailValue ?? "").trim().toLowerCase();
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
      setVerifyingOtp(true);
      await apiRequest("POST", "/api/auth/signup/verify-otp", {
        email: trimmedEmail,
        otp: trimmedOtp,
      });

      setEmailVerified(true);
      toast({ title: "Email verified", description: "Now you can click Create Account." });
    } catch (e: any) {
      toast({ title: "Verification failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const onSubmit = (data: InsertUser) => {
    signupMutation.mutate(data);
  };

  const handleGoogleSignup = () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") ? next : null;
    window.location.href = `/api/auth/google/start?role=intern${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`;
  };

  return (
    <div className="min-h-[calc(100vh-74px)] bg-background flex items-center justify-center  md:py-10 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Top left decorative shapes */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-20 left-10 w-8 h-8 border-2 border-primary/20 rounded-lg transform rotate-12" />
        <div className="absolute top-40 left-20 w-4 h-4 bg-primary/30 rounded-full" />

        {/* Top right decorative shapes */}
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
        <div className="absolute top-32 right-20 w-6 h-6 border-2 border-primary/20 rounded-full" />

        {/* Bottom decorative shapes */}
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-32 w-12 h-12 bg-primary/10 rounded-full" />
        <div className="absolute bottom-20 left-32 w-16 h-16 border-2 border-primary/10 rounded-full" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <Card className="w-full max-w-md md:max-w-lg p-5 md:p-7 relative z-10 border border-card-border/80 shadow-xl rounded-2xl bg-card/95 backdrop-blur">
        {/* Logo */}
        <div className="flex justify-center" data-testid="logo-container">
          <img
            src={findternLogo}
            alt="Findtern - Internship Simplified"
            className="h-28  w-auto"
            data-testid="img-logo"
          />
        </div>

        {/* Tagline chip */}
        <div className="flex justify-center mb-3">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-1 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-primary">
            For students & freshers looking for internships
          </span>
        </div>

        {/* Heading */}
        <h1
          className="text-xl md:text-2xl font-semibold text-center text-foreground mb-1.5"
          data-testid="text-hero-heading"
        >
          Sign up to find work you love
        </h1>
        <p className="text-xs md:text-[14px] text-center text-muted-foreground mb-5">
          One profile to discover internships that match your skills, college schedule, and the career you actually want to build.
        </p>

        {/* Google Sign-in Button */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 mb-4 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3"
          onClick={handleGoogleSignup}
        >
          <GoogleGIcon className="h-5 w-5" />
          <span>Continue with Google</span>
        </Button>
        <p className="text-[11px] text-center text-muted-foreground mb-4">
          Use your primary personal email – this will be your main login and communication ID.
        </p>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-card text-muted-foreground font-medium">OR</span>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3.5">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      First Name<span className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="First Name"
                        className="h-11 rounded-lg text-sm"
                        data-testid="input-first-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Last Name<span className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Last Name"
                        className="h-11 rounded-lg text-sm"
                        data-testid="input-last-name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email and Phone Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-foreground">
                      Email<span className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Email"
                        className="h-11 rounded-lg text-sm"
                        data-testid="input-email"
                        disabled={emailVerificationActive || emailVerified}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />

                    {!emailVerificationActive && !emailVerified && (
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-2 w-full h-10"
                        onClick={sendOtp}
                        disabled={sendingOtp || cooldownSeconds > 0}
                      >
                        {cooldownSeconds > 0
                          ? `Resend in ${cooldownSeconds}s`
                          : sendingOtp
                            ? "Sending..."
                            : "Send OTP"}
                      </Button>
                    )}

                    {emailVerificationActive && !emailVerified && (
                      <div className="mt-2 space-y-2">
                        <div className="flex items-center justify-center">
                          <InputOTP
                            maxLength={6}
                            value={otp}
                            onChange={setOtp}
                            disabled={verifyingOtp}
                          >
                            <InputOTPGroup>
                              {Array.from({ length: 6 }).map((_, idx) => (
                                <InputOTPSlot key={idx} index={idx} />
                              ))}
                            </InputOTPGroup>
                          </InputOTP>
                        </div>

                        <Button
                          type="button"
                          className="w-full h-10"
                          onClick={verifyOtp}
                          disabled={verifyingOtp}
                        >
                          {verifyingOtp ? "Verifying..." : "Verify Email"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-10"
                          onClick={sendOtp}
                          disabled={sendingOtp || cooldownSeconds > 0}
                        >
                          {cooldownSeconds > 0
                            ? `Resend in ${cooldownSeconds}s`
                            : sendingOtp
                              ? "Sending..."
                              : "Resend code"}
                        </Button>
                      </div>
                    )}

                    {emailVerified && (
                      <div className="mt-2 text-xs font-medium text-primary">Email verified</div>
                    )}
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel className="text-sm font-medium text-foreground">
                  Phone Number<span className="text-destructive ml-0.5">*</span>
                </FormLabel>
                <FormField
                  control={form.control}
                  name="countryCode"
                  render={({ field }) => (
                    <input type="hidden" {...field} />
                  )}
                />
                <div className="relative">
                  <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">
                    +91
                  </div>
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Phone Number"
                          className="h-11 w-full rounded-lg pl-14 text-sm"
                          data-testid="input-phone-number"
                          {...field}
                          inputMode="numeric"
                          maxLength={10}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                            field.onChange(digitsOnly);
                          }}
                        />
                      </FormControl>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={() => <FormMessage />}
                />
              </FormItem>
            </div>

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-foreground">
                    Password<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        className="h-11 pr-11 rounded-lg text-sm"
                        data-testid="input-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <PasswordStrengthIndicator password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Terms Checkbox */}
            <div className="pt-1.5">
              <p className="text-xs md:text-sm font-normal text-foreground">
                By creating an account, you agree to our{" "}
                <a
                  href="/intern-terms-and-conditions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-medium underline underline-offset-2 hover:text-primary/80 transition-colors"
                  data-testid="link-terms"
                >
                  Terms and Conditions and Privacy Policy
                </a>
                .
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-11 mt-4 text-sm md:text-[15px] font-semibold rounded-full"
              disabled={signupMutation.isPending || !emailVerified}
              data-testid="button-create-account"
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground mt-6" data-testid="text-login-prompt">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-primary font-medium hover:underline underline-offset-2 transition-colors"
            data-testid="link-login"
          >
            Login
          </Link>
        </p>

      </Card>
    </div>
  );
}