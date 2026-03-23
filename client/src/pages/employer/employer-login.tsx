import { useEffect, useState, type SVGProps } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { saveEmployerAuth, setEmployerAuthProvider } from "@/lib/employerAuth";
import findternLogo from "@assets/logo.png";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false),
});

type LoginForm = z.infer<typeof loginSchema>;

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

export default function EmployerLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  useEffect(() => {
    document.title = "Findtern - Employer Login";

    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("oauthError");
    if (oauthError) {
      toast({
        title: "Google sign-in failed",
        description: oauthError,
        variant: "destructive",
      });

      params.delete("oauthError");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    }
    const googleEmployerId = params.get("googleEmployerId");
    const email = params.get("email");
    const next = params.get("next");

    if (googleEmployerId) {
      const bootstrap = async () => {
        try {
          const res = await fetch(`/api/employer/${encodeURIComponent(googleEmployerId)}`, {
            credentials: "include",
          });
          if (!res.ok) {
            setLocation("/employer/login");
            return;
          }
          const json = await res.json().catch(() => null);
          const employer = json?.employer;
          if (employer?.id) {
            params.delete("googleEmployerId");
            params.delete("email");
            params.delete("next");
            const qs = params.toString();
            window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);

            saveEmployerAuth(employer, { persist: "local" });
            setEmployerAuthProvider("google", { persist: "local" });
            if (next && next.startsWith("/")) {
              setLocation(next);
            } else if (!employer.setupCompleted) {
              setLocation("/employer/setup");
            } else if (!employer.onboardingCompleted) {
              setLocation("/employer/onboarding");
            } else {
              setLocation("/employer/dashboard");
            }
            return;
          }
        } catch {
          // ignore
        }

        if (email) {
          toast({
            title: "Account not found",
            description: "No employer account exists for this Google email. Please sign up first.",
            variant: "destructive",
          });
          setLocation(
            `/employer/signup?googleEmail=${encodeURIComponent(email)}` +
              `${next && next.startsWith("/") ? `&next=${encodeURIComponent(next)}` : ""}`,
          );
          return;
        }

        setLocation("/employer/login");
      };

      bootstrap();
    }
  }, [setLocation, toast]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/employer/login", data);
      return response.json();
    },
    onSuccess: (data: any) => {
      const employer = data?.employer;
      if (employer) {
        const remember = Boolean(form.getValues("rememberMe"));
        const persist = remember ? "local" : "session";
        saveEmployerAuth(employer, { persist });
        setEmployerAuthProvider("password", { persist });
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });

      if (!employer?.setupCompleted) {
        setLocation("/employer/setup");
        return;
      }
      if (!employer?.onboardingCompleted) {
        setLocation("/employer/onboarding");
        return;
      }
      setLocation("/employer/dashboard");
    },
    onError: (error: Error) => {
      const msg = String(error?.message ?? "");
      if (msg.toLowerCase().includes("verify") && msg.toLowerCase().includes("email")) {
        const email = String(form.getValues("email") ?? "").trim().toLowerCase();
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("pendingEmployerEmail", email);
          }
        } catch {}
        setLocation("/employer/verify-email");
        toast({
          title: "Email verification required",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") ? next : null;
    window.location.href = `/api/auth/google/start?role=employer${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`;
  };

  return (
    <div className="min-h-[calc(100vh-74px)] bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40 flex items-center justify-center px-3 py-6 sm:px-6 md:py-12 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-tl from-emerald-300/10 to-cyan-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/4 w-48 h-48 bg-gradient-to-r from-teal-200/20 to-emerald-200/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="absolute top-20 right-[20%] w-4 h-4 bg-emerald-400/40 rounded-full" />
        <div className="absolute top-40 left-[15%] w-6 h-6 border-2 border-emerald-300/40 rounded-lg transform rotate-45" />
        <div className="absolute bottom-32 left-[25%] w-3 h-3 bg-teal-400/50 rounded-full" />
        <div className="absolute top-1/3 right-[10%] w-8 h-8 border-2 border-teal-300/30 rounded-full" />
        
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <Card className="w-full max-w-md p-6 md:p-8 relative z-10 rounded-3xl bg-white border border-slate-200/60 shadow-2xl shadow-emerald-900/10 ring-1 ring-black/5">
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

          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-50/80 to-teal-50/80 border border-emerald-200/60 mb-4">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Employer Portal</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-sm text-slate-600">
            Login to access your employer dashboard
          </p>
        </div>

        {/* Google Sign-in */}
        <Button
          type="button"
          variant="outline"
          className="w-full h-12 mb-4 rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all duration-200 flex items-center justify-center gap-3"
          onClick={handleGoogleLogin}
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
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold text-slate-700">
                    Email Address
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Enter your email"
                      className="h-12 rounded-xl border-slate-200 bg-white focus:border-emerald-400 focus:ring-emerald-400/20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold text-slate-700">
                      Password
                    </FormLabel>
                    <a
                      href="#"
                      className="text-xs text-emerald-700 hover:underline underline-offset-2"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation("/employer/forgot-password");
                      }}
                    >
                      Forgot password?
                    </a>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="h-12 pr-11 rounded-xl border-slate-200 bg-white focus:border-emerald-400 focus:ring-emerald-400/20"
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <FormField
              control={form.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-emerald-300 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                  </FormControl>
                  <FormLabel className="text-sm font-normal text-slate-600 cursor-pointer">
                    Remember me
                  </FormLabel>
                </FormItem>
              )}
            /> */}

            <Button
              type="submit"
              className="w-full h-12 mt-4 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/25 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </Form>

        {/* Register Link */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Don't have an account?{" "}
          <Link href="/employer/signup" className="text-emerald-600 font-semibold hover:underline underline-offset-2">
            Create Account
          </Link>
        </p>
      </Card>
    </div>
  );
}

