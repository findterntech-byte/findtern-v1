import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

function isStrongPassword(value: string) {
  if (value.length < 8) return false;
  if (!/[A-Z]/.test(value)) return false;
  if (!/[a-z]/.test(value)) return false;
  if (!/[0-9]/.test(value)) return false;
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(value)) return false;
  return true;
}

export default function EmployerResetPasswordPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [token, setToken] = useState<string>("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) {
      toast({
        title: "Invalid link",
        description: "Reset token is missing.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast({
        title: "Invalid link",
        description: "Reset token is missing.",
        variant: "destructive",
      });
      return;
    }

    if (!newPassword || !confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please enter and confirm your new password.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirm password must be same.",
        variant: "destructive",
      });
      return;
    }

    if (!isStrongPassword(newPassword)) {
      toast({
        title: "Weak password",
        description:
          "Use at least 8 characters with uppercase, lowercase, number, and special character.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword,
      });
      const json = await res.json().catch(() => null);
      toast({
        title: "Password updated",
        description: json?.message || "Your password has been updated successfully.",
      });
      setLocation("/employer/login");
    } catch (err: any) {
      toast({
        title: "Unable to reset password",
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
        <h1 className="text-2xl font-semibold text-foreground mb-2">Reset password</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Choose a new password for your account.
        </p>

        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={() => setLocation("/employer/login")} disabled={loading}>
              Back
            </Button>
            <Button type="submit" className="bg-[#0E6049] hover:bg-[#0b4b3a]" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
