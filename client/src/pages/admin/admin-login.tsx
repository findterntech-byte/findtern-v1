import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Lock, Mail } from "lucide-react";
import findternLogo from "@assets/logo.png";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [form, setForm] = useState<AdminLoginInput>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof AdminLoginInput, string>>>({});

  const loginMutation = useMutation({
    mutationFn: async (data: AdminLoginInput) => {
      const res = await apiRequest("POST", "/api/admin/login", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Logged in as admin",
        description: "Redirecting to admin dashboard...",
      });
      setLocation("/admin/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Admin login failed",
        description: error.message || "Invalid admin credentials",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = adminLoginSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof AdminLoginInput, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as keyof AdminLoginInput;
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    loginMutation.mutate(parsed.data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0E6049]/10 via-background to-background p-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl">
        <div className="flex flex-col items-center gap-4">
          <img src={findternLogo} alt="Findtern" className="h-12 w-auto" />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-[#0E6049]">Admin Login</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Access the admin dashboard
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="admin@findtern.com"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                className="pl-10 h-11"
                required
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive mt-1">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                className="pl-10 h-11"
                required
              />
            </div>
            {errors.password && (
              <p className="text-xs text-destructive mt-1">{errors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            style={{ backgroundColor: '#0E6049' }}
            disabled={loginMutation.isPending}
          >
            {loginMutation.isPending ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground">
          <button
            onClick={() => setLocation("/login")}
            className="text-[#0E6049] hover:underline"
          >
            Back to User Login
          </button>
        </div>
      </Card>
    </div>
  );
}
