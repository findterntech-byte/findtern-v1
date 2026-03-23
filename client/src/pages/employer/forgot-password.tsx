import { useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function EmployerForgotPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!value) {
      toast({
        title: "Email required",
        description: "Please enter your email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/forgot-password", {
        email: value,
        role: "employer",
      });
      const json = await res.json().catch(() => null);
      toast({
        title: "Check your email",
        description:
          json?.message || "If an account exists, a reset link will be sent.",
      });
      setLocation("/employer/login");
    } catch (err: any) {
      toast({
        title: "Unable to request reset",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-74px)] bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 md:p-8 border-card-border shadow-lg">
        <h1 className="text-2xl font-semibold text-foreground mb-2">Forgot password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Enter your work email and we’ll send you a reset link.
        </p>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setLocation("/employer/login")} disabled={loading}>
              Back
            </Button>
            <Button type="submit" className="bg-[#0E6049] hover:bg-[#0b4b3a]" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
