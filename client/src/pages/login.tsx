import { SVGProps, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { SiGoogle } from "react-icons/si";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import findternLogo from "@assets/logo.png";
import { disableGuestMode, enableGuestMode } from "@/lib/guestMode";

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

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const resolvePostLoginRoute = async (userId: string, safeNext: string | null) => {
    try {
      const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}`, { credentials: "include" });
      if (res.ok) {
        return safeNext ?? "/dashboard";
      }
      if (res.status === 404) {
        return "/onboarding";
      }
      return safeNext ?? "/dashboard";
    } catch {
      return safeNext ?? "/dashboard";
    }
  };

  useEffect(() => {
    document.title = "Findtern - Login";

    const params = new URLSearchParams(window.location.search);
    const googleUserId = params.get("googleUserId");
    const email = params.get("email");
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") ? next : null;
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

    if (googleUserId) {
      try {
        window.localStorage.setItem("userId", googleUserId);
        if (email) window.localStorage.setItem("userEmail", email);

        window.localStorage.removeItem("onboardingDraft");
        window.localStorage.removeItem("onboardingActiveStep");
        window.localStorage.removeItem("signupFirstName");
        window.localStorage.removeItem("signupLastName");
        window.localStorage.removeItem("signupCountryCode");
        window.localStorage.removeItem("signupPhoneNumber");
      } catch {
        // ignore
      }

      params.delete("googleUserId");
      params.delete("email");
      params.delete("next");
      const qs = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);

      (async () => {
        const to = await resolvePostLoginRoute(googleUserId, safeNext);
        setLocation(to);
      })();
    }
  }, [setLocation, toast]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: async (data: any) => {
      const user = data?.user;

      if (user?.id) {
        try {
          if (typeof window !== "undefined") {
            disableGuestMode();
            window.localStorage.setItem("userId", user.id);
            if (user.email) {
              window.localStorage.setItem("userEmail", user.email);
            }

            window.localStorage.removeItem("onboardingDraft");
            window.localStorage.removeItem("onboardingActiveStep");
            window.localStorage.removeItem("signupFirstName");
            window.localStorage.removeItem("signupLastName");
            window.localStorage.removeItem("signupCountryCode");
            window.localStorage.removeItem("signupPhoneNumber");
          }

          const params = new URLSearchParams(window.location.search);
          const next = params.get("next");
          const safeNext = next && next.startsWith("/") ? next : null;
          const to = await resolvePostLoginRoute(user.id, safeNext);
          setLocation(to);
        } catch {
          setLocation("/dashboard");
        }
      }

      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      const msg = String(error?.message ?? "");
      if (msg.toLowerCase().includes("verify") && msg.toLowerCase().includes("email")) {
        const email = String(form.getValues("email") ?? "").trim().toLowerCase();
        try {
          if (typeof window !== "undefined") {
            window.localStorage.setItem("pendingUserEmail", email);
          }
        } catch {}
        setLocation(email ? `/verify-email?email=${encodeURIComponent(email)}` : "/verify-email");
        toast({
          title: "Email verification required",
          description: msg,
          variant: "destructive",
        });
        return;
      }
      toast({
        title: "Login failed",
        description: error.message || "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const handleGoogleLogin = () => {
    disableGuestMode();
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    const safeNext = next && next.startsWith("/") ? next : null;
    window.location.href = `/api/auth/google/start?role=intern${safeNext ? `&next=${encodeURIComponent(safeNext)}` : ""}`;
  };

  const handleGuest = () => {
    enableGuestMode();
    setLocation("/opportunities");
  };

  return (
    <div className="min-h-[calc(100vh-74px)] bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-20 left-10 w-8 h-8 border-2 border-primary/20 rounded-lg transform rotate-12" />
        <div className="absolute top-40 left-20 w-4 h-4 bg-primary/30 rounded-full" />
        <div className="absolute -top-10 -right-10 w-48 h-48 bg-primary/5 rounded-full blur-2xl" />
        <div className="absolute top-32 right-20 w-6 h-6 border-2 border-primary/20 rounded-full" />
        <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-32 right-32 w-12 h-12 bg-primary/10 rounded-full" />
        <div className="absolute bottom-20 left-32 w-16 h-16 border-2 border-primary/10 rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <Card className="w-full max-w-md p-6 md:p-8 relative z-10 border-card-border shadow-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6" data-testid="logo-container">
          <img 
            src={findternLogo} 
            alt="Findtern - Internship Simplified" 
            className="h-28  w-auto"
            data-testid="img-logo"
          />
        </div>

        {/* Heading */}
        <h1 className="text-2xl md:text-3xl font-semibold text-center text-foreground mb-2" data-testid="text-hero-heading">
          Welcome back
        </h1>
        <p className="text-center text-muted-foreground mb-8" data-testid="text-subheading">
          Sign in to continue your journey
        </p>

        {/* Google Sign-in Button */}
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
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
                      placeholder="Enter your email"
                      className="h-12"
                      data-testid="input-email"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-sm font-medium text-foreground">
                      Password<span className="text-destructive ml-0.5">*</span>
                    </FormLabel>
                    <a
                      href="#"
                      className="text-sm text-primary font-medium hover:underline underline-offset-2 transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        setLocation("/forgot-password");
                      }}
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="h-12 pr-12"
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
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 mt-6 text-base font-medium"
              disabled={loginMutation.isPending}
              data-testid="button-login"
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

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground mt-6" data-testid="text-signup-prompt">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-primary font-medium hover:underline underline-offset-2 transition-colors"
            data-testid="link-signup"
          >
            Sign up
          </Link>
        </p>
      </Card>
    </div>
  );
}
