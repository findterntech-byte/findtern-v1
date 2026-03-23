import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Shield, Eye, EyeOff } from "lucide-react";
import findternLogo from "@assets/logo.png";
import { apiRequest } from "@/lib/queryClient";
import { getEmployerAuth } from "@/lib/employerAuth";

export default function EmployerChangePasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isStrongPassword = (value: string) => {
    if (value.length < 8) return false;
    if (!/[A-Z]/.test(value)) return false;
    if (!/[a-z]/.test(value)) return false;
    if (!/[0-9]/.test(value)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return false;
    return true;
  };

  const isNewPasswordStrong = newPassword ? isStrongPassword(newPassword) : true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword === currentPassword) {
      toast({
        title: "Choose a different password",
        description: "New password must be different from current password.",
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

    const auth = getEmployerAuth();
    if (!auth) {
      setLocation("/employer/login");
      return;
    }

    setIsSubmitting(true);
    try {
      // apiRequest will throw automatically if response is not OK
      await apiRequest("POST", `/api/employer/${auth.id}/change-password`, {
        currentPassword,
        newPassword,
      });

      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setLocation("/employer/account");
    } catch (error: any) {
      toast({
        title: "Unable to change password",
        description:
          error?.message || "Please check your current password and try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg">
        <div className="flex h-16 items-center justify-between px-4 md:px-8">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => setLocation("/employer/dashboard")}
            aria-label="Go to Employer Dashboard"
          >
            <img src={findternLogo} alt="Findtern" className="inner_logo__img"  />
          </button>
          <Button
            variant="ghost"
            className="h-9 px-3 text-xs flex items-center gap-2 text-slate-600"
            onClick={() => setLocation("/employer/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 md:px-8 py-8 md:py-10">
        <Card className="p-6 md:p-8 rounded-2xl shadow-sm bg-white/90 space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Change Password</h1>
              <p className="text-xs md:text-sm text-slate-600">
                Update the password used to sign in to your employer account.
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-10"
                  aria-invalid={!isNewPasswordStrong}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className={isNewPasswordStrong ? "text-xs text-slate-500" : "text-xs text-red-600"}>
                Use at least 8 characters with uppercase, lowercase, number, and special character.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="h-9 px-4 text-xs"
                onClick={() => setLocation("/employer/account")}
              >
                Cancel
              </Button>
              <Button type="submit" className="h-9 px-4 text-xs" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save password"}
              </Button>
            </div>
          </form>
        </Card>
      </main>
    </div>
  );
}
