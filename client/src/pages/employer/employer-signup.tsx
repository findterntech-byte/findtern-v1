import { useEffect, useState, useMemo, SVGProps } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Check, X, Sparkles } from "lucide-react";
import { SiGoogle } from "react-icons/si";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { insertEmployerSchema, type InsertEmployer, countryCodes } from "@shared/schema";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import findternLogo from "@assets/logo.png";
import { saveEmployerAuth, setEmployerAuthProvider } from "@/lib/employerAuth";
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
    if (metCount <= 4) return { level: 3, label: "Good", color: "bg-emerald-500" };
    return { level: 4, label: "Strong", color: "bg-emerald-600" };
  }, [requirements]);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <div
              key={level}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                level <= strength.level ? strength.color : "bg-muted"
              }`}
            />
          ))}
        </div>
        {strength.label && (
          <span
            className={`text-xs font-medium ${
              strength.level <= 1
                ? "text-destructive"
                : strength.level === 2
                ? "text-yellow-600"
                : "text-emerald-600"
            }`}
          >
            {strength.label}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-1">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-1.5 text-xs">
            {req.met ? (
              <Check className="w-3.5 h-3.5 text-emerald-600" />
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

export default function EmployerSignupPage() {
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

  const form = useForm<InsertEmployer>({
    resolver: zodResolver(insertEmployerSchema),
    defaultValues: {
      name: "",
      companyName: "",
      companyEmail: "",
      countryCode: "+91",
      phoneNumber: "",
      password: "",
      agreedToTerms: true,
    },
  });

  const emailValue = form.watch("companyEmail");

  const cooldownSeconds = useMemo(() => {
    const ms = cooldownUntil - nowMs;
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  }, [cooldownUntil, nowMs]);

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [cooldownUntil]);

  const countryCode = form.watch("countryCode");
  const phoneMaxLen = String(countryCode ?? "+91") === "+91" ? 10 : 11;

  useEffect(() => {
    document.title = "Findtern - Employer Sign Up";
    form.setValue("agreedToTerms", true, { shouldDirty: false, shouldTouch: false, shouldValidate: false });
    const params = new URLSearchParams(window.location.search);
    const googleEmail = params.get("googleEmail");
    if (googleEmail) {
      form.setValue("companyEmail", googleEmail, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    }
  }, [form]);

  const signupMutation = useMutation({
    mutationFn: async (data: InsertEmployer) => {
      const response = await apiRequest("POST", "/api/auth/employer/signup", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      const employer = data?.employer;
      if (employer?.id) {
        try {
          window.localStorage.setItem("pendingEmployerId", String(employer.id));
          window.localStorage.setItem("pendingEmployerEmail", String(employer.companyEmail ?? ""));
        } catch {}
      }
      toast({
        title: "Account created successfully!",
        description: "Please verify your email to continue.",
      });

      setEmailVerificationActive(true);
      setCooldownUntil(Date.now() + 60 * 1000);
    },
    onError: (error: any) => {
      if (error?.status === 409) {
        form.setError("phoneNumber", {
          type: "manual",
          message: error?.message || "Phone number already in use",
        });
        toast({
          title: "Phone number already in use",
          description: error?.message || "Please enter another phone number.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Registration failed",
        description: error?.message || "Something went wrong. Please try again.",
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

    if (!emailVerificationActive) {
      toast({ title: "Create account first", description: "Please create your account, then verify your email." });
      return;
    }

    try {
      setSendingOtp(true);
      const res = await apiRequest("POST", "/api/auth/email/send-otp", { email: trimmed, role: "employer" });
      await res.json().catch(() => null);
      setCooldownUntil(Date.now() + 60 * 1000);
      toast({ title: "OTP sent", description: `We sent a 6-digit code to ${trimmed}` });
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
      await apiRequest("POST", "/api/auth/email/verify-otp", {
        email: trimmedEmail,
        role: "employer",
        otp: trimmedOtp,
      });

      let pendingEmployerId: string | null = null;
      try {
        pendingEmployerId = window.localStorage.getItem("pendingEmployerId");
      } catch {}

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
              setEmployerAuthProvider("password", { persist: "local" });
            }
          }
        } catch {}

        try {
          window.localStorage.removeItem("pendingEmployerId");
          window.localStorage.removeItem("pendingEmployerEmail");
        } catch {}
      }

      setEmailVerified(true);
      toast({ title: "Email verified", description: "Your email has been verified successfully." });
      setLocation("/employer/setup");
    } catch (e: any) {
      toast({ title: "Verification failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const onSubmit = (data: InsertEmployer) => {
    signupMutation.mutate(data);
  };

  const handleGoogleSignup = () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") ? next : null;
    window.location.href = `/api/auth/google/start?role=employer${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`;
  };

  return (
    <div className="min-h-[calc(100vh-74px)] bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40 flex items-center justify-center px-3 py-6 md:py-10 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating geometric shapes */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-tl from-emerald-300/10 to-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-gradient-to-r from-teal-200/20 to-emerald-200/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Decorative shapes */}
        <div className="absolute top-20 right-[20%] w-4 h-4 bg-emerald-400/40 rounded-full" />
        <div className="absolute top-40 left-[15%] w-6 h-6 border-2 border-emerald-300/40 rounded-lg transform rotate-45" />
        <div className="absolute bottom-32 left-[25%] w-3 h-3 bg-teal-400/50 rounded-full" />
        <div className="absolute top-1/3 right-[10%] w-8 h-8 border-2 border-teal-300/30 rounded-full" />
        <div className="absolute bottom-40 right-[30%] w-5 h-5 bg-emerald-300/40 transform rotate-45" />
        
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
        
        {/* Diagonal lines accent */}
        <svg className="absolute top-0 right-0 w-64 h-64 text-emerald-200/20" viewBox="0 0 200 200">
          <line x1="0" y1="200" x2="200" y2="0" stroke="currentColor" strokeWidth="1" />
          <line x1="40" y1="200" x2="200" y2="40" stroke="currentColor" strokeWidth="1" />
          <line x1="80" y1="200" x2="200" y2="80" stroke="currentColor" strokeWidth="1" />
        </svg>
        <svg className="absolute bottom-0 left-0 w-64 h-64 text-teal-200/20 transform rotate-180" viewBox="0 0 200 200">
          <line x1="0" y1="200" x2="200" y2="0" stroke="currentColor" strokeWidth="1" />
          <line x1="40" y1="200" x2="200" y2="40" stroke="currentColor" strokeWidth="1" />
          <line x1="80" y1="200" x2="200" y2="80" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      <Card className="w-full max-w-md md:max-w-xl p-6 md:p-8 relative z-10 border-0 shadow-2xl shadow-emerald-900/5 rounded-3xl bg-white/80 backdrop-blur-xl">
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center">
            <div className="relative">
              <img 
                src={findternLogo} 
                alt="Findtern" 
                className="inner_logo__img"
              />
            </div>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/50 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">For Employers</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-2">
            Sign Up to find best interns
          </h1>
          <p className="text-sm text-slate-500">
            Create your account and start hiring talented interns today
          </p>
        </div>

        {/* Google Sign-in */}
  <Button
           type="button"
           variant="outline"
           className="w-full h-12 mb-4 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3"
           onClick={handleGoogleSignup}
         >
           <GoogleGIcon className="h-5 w-5" />
           <span>Continue with Google</span>
         </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-slate-400 font-medium">OR</span>
          </div>
        </div>

        {/* Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Name & Company Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Name<span className="text-red-500 ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Name"
                        className="h-11 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Company Name<span className="text-red-500 ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Company Name"
                        className="h-11 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Email & Phone Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-slate-700">
                      Company Email<span className="text-red-500 ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Email"
                        className="h-11 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                        disabled={emailVerificationActive}
                        {...field}
                      />
                    </FormControl>

                    {!emailVerified && !emailVerificationActive && (
                      <Button
                        type="button"
                        className="mt-2 h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6"
                        onClick={() => {
                          void form.handleSubmit(onSubmit)();
                        }}
                        disabled={signupMutation.isPending || sendingOtp || cooldownSeconds > 0}
                      >
                        {cooldownSeconds > 0
                          ? `Send in ${cooldownSeconds}s`
                          : signupMutation.isPending
                            ? (
                                <span className="inline-flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Sending...
                                </span>
                              )
                            : "Send OTP"}
                      </Button>
                    )}

                    <FormMessage />

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
                          className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                          onClick={verifyOtp}
                          disabled={verifyingOtp}
                        >
                          {verifyingOtp ? "Verifying..." : "Verify Email"}
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-11 rounded-xl"
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
                      <div className="mt-2 text-xs font-semibold text-emerald-700">Email verified</div>
                    )}
                  </FormItem>
                )}
              />
              
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700">
                  Phone Number<span className="text-red-500 ml-0.5">*</span>
                </FormLabel>
                <div className="flex gap-2">
                  <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field }) => (
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          const maxLen = String(value ?? "+91") === "+91" ? 10 : 11;
                          const current = String(form.getValues("phoneNumber") ?? "");
                          const digitsOnly = current.replace(/\D/g, "").slice(0, maxLen);
                          form.setValue("phoneNumber", digitsOnly, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-24 h-11 shrink-0 rounded-xl border-slate-200">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countryCodes.map((country) => (
                            <SelectItem key={country.code} value={country.code}>
                              <span className="flex items-center gap-1.5">
                                <span>{country.country}</span>
                                <span className="text-muted-foreground">{country.code}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="Phone Number"
                          className="h-11 min-w-0 w-full flex-1 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                          {...field}
                          inputMode="numeric"
                          maxLength={phoneMaxLen}
                          onChange={(e) => {
                            const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, phoneMaxLen);
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
                  <FormLabel className="text-sm font-medium text-slate-700">
                    Password<span className="text-red-500 ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        className="h-11 pr-11 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </FormControl>
                  <PasswordStrengthIndicator password={field.value} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-1.5">
              <p className="text-xs md:text-sm font-normal text-slate-600">
                By creating an account, you agree to our{" "}
                <a
                  href="/employer-terms-and-conditions"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 font-medium underline underline-offset-2 hover:text-emerald-700"
                >
                  Terms and Conditions and Privacy Policy
                </a>
                .
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 mt-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20 transition-all duration-200"
              disabled={signupMutation.isPending || !emailVerified}
            >
              {signupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>
        </Form>

        {/* Login Link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{" "}
          <Link href="/employer/login" className="text-emerald-600 font-semibold hover:underline underline-offset-2">
            Login
          </Link>
        </p>

      
      </Card>
    </div>
  );
}

