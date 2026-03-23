import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Lock,
  Eye,
  EyeOff,
  Save,
} from "lucide-react";

import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CandidateHeader } from "@/components/CandidateHeader";

export default function SettingsPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [openToWork, setOpenToWork] = useState(() => {
    if (typeof window === "undefined") return true;
    const raw = window.localStorage.getItem("openToWork");
    if (raw === "false") return false;
    if (raw === "true") return true;
    return true;
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const isStrongPassword = (value: string) => {
    if (value.length < 8) return false;
    if (!/[A-Z]/.test(value)) return false;
    if (!/[a-z]/.test(value)) return false;
    if (!/[0-9]/.test(value)) return false;
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) return false;
    return true;
  };

  const isNewPasswordStrong = newPassword ? isStrongPassword(newPassword) : true;

  const view = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("view") || "";
  }, [location]);

  const isChangePasswordOnly = useMemo(() => {
    if (view === "change-password") return true;
    if (typeof window === "undefined") return false;
    return window.location.pathname === "/settings/change-password";
  }, [view]);

  const [bankName, setBankName] = useState("");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSaving, setBankSaving] = useState(false);
  const [onboardingSnapshot, setOnboardingSnapshot] = useState<any>(null);

  useEffect(() => {
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      toast({
        title: "Not logged in",
        description: "User session not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    let cancelled = false;
    setBankLoading(true);

    (async () => {
      try {
        const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || res.statusText || "Unable to load bank details");
        }
        const json = (await res.json()) as any;
        const onboarding = json?.onboarding ?? null;
        const bankDetails = onboarding?.extraData?.bankDetails ?? {};

        if (cancelled) return;
        setOnboardingSnapshot(onboarding);
        setBankName(String(bankDetails?.bankName ?? ""));
        setAccountHolderName(String(bankDetails?.accountHolderName ?? ""));
        setAccountNumber(String(bankDetails?.accountNumber ?? ""));
        setIfscCode(String(bankDetails?.ifscCode ?? ""));
        setUpiId(String(bankDetails?.upiId ?? ""));
      } catch (err: any) {
        if (cancelled) return;
        toast({
          title: "Unable to load bank details",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) setBankLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  const handleSaveBankDetails = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanedBankName = bankName.trim();
    const cleanedHolder = accountHolderName.trim();
    const cleanedAccount = accountNumber.trim();
    const cleanedIfsc = ifscCode.trim().toUpperCase();
    const cleanedUpi = upiId.trim();

    if (!cleanedBankName || !cleanedHolder || !cleanedAccount || !cleanedIfsc) {
      toast({
        title: "Missing fields",
        description: "Please fill all required bank details.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[0-9]{9,18}$/.test(cleanedAccount)) {
      toast({
        title: "Invalid account number",
        description: "Account number should be 9 to 18 digits.",
        variant: "destructive",
      });
      return;
    }

    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(cleanedIfsc)) {
      toast({
        title: "Invalid IFSC code",
        description: "Please enter a valid IFSC code.",
        variant: "destructive",
      });
      return;
    }

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      toast({
        title: "Not logged in",
        description: "User session not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    setBankSaving(true);
    try {
      let existing = onboardingSnapshot;
      if (!existing) {
        const res = await fetch(`/api/onboarding/${encodeURIComponent(userId)}`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || res.statusText || "Unable to load onboarding data");
        }
        const json = (await res.json()) as any;
        existing = json?.onboarding ?? null;
        setOnboardingSnapshot(existing);
      }

      const prevExtra = existing?.extraData ?? {};
      const nextExtra = {
        ...prevExtra,
        bankDetails: {
          bankName: cleanedBankName,
          accountHolderName: cleanedHolder,
          accountNumber: cleanedAccount,
          ifscCode: cleanedIfsc,
          upiId: cleanedUpi || null,
        },
      };

      const payload = {
        userId,
        linkedinUrl: existing?.linkedinUrl ?? null,
        pinCode: existing?.pinCode ?? null,
        state: existing?.state ?? null,
        city: existing?.city ?? null,
        aadhaarNumber: existing?.aadhaarNumber ?? null,
        panNumber: existing?.panNumber ?? null,
        bio: existing?.bio ?? null,
        experienceJson: Array.isArray(existing?.experienceJson) ? existing.experienceJson : [],
        skills: Array.isArray(existing?.skills) ? existing.skills : [],
        locationTypes: Array.isArray(existing?.locationTypes) ? existing.locationTypes : [],
        preferredLocations: Array.isArray(existing?.preferredLocations) ? existing.preferredLocations : [],
        hasLaptop: existing?.hasLaptop ?? null,
        previewSummary: existing?.previewSummary ?? null,
        extraData: nextExtra,
      };

      const res = await apiRequest("POST", "/api/onboarding", payload);
      const json = (await res.json()) as any;
      setOnboardingSnapshot(json?.onboarding ?? existing);

      toast({
        title: "Bank details saved",
        description: "Your bank details have been updated successfully.",
      });
    } catch (err: any) {
      toast({
        title: "Unable to save bank details",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBankSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword) {
      toast({
        title: "Missing fields",
        description: "Please enter current and new password.",
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

    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "New password and confirm password must be same.",
        variant: "destructive",
      });
      return;
    }

    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (!userId) {
      toast({
        title: "Not logged in",
        description: "User session not found. Please login again.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("POST", `/api/users/${userId}/change-password`, {
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
    } catch (err: any) {
      toast({
        title: "Unable to change password",
        description: err?.message || "Please check your current password and try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <CandidateHeader openToWork={openToWork} onOpenToWorkChange={setOpenToWork} />

      <div className="container px-4 md:px-6 py-8">
        {!isChangePasswordOnly && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Settings</h1>
              <p className="text-muted-foreground">Manage your account settings and preferences</p>
            </div>

            <div className="max-w-2xl space-y-6">
              <Card className="p-6">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-semibold">Bank Details</h3>
                  {bankLoading && <p className="text-sm text-muted-foreground">Loading...</p>}
                </div>

                <form className="space-y-4" onSubmit={handleSaveBankDetails}>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name</Label>
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      disabled={bankLoading || bankSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name</Label>
                    <Input
                      id="accountHolderName"
                      value={accountHolderName}
                      onChange={(e) => setAccountHolderName(e.target.value)}
                      disabled={bankLoading || bankSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      inputMode="numeric"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      disabled={bankLoading || bankSaving}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ifscCode">IFSC Code</Label>
                    <Input
                      id="ifscCode"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value)}
                      disabled={bankLoading || bankSaving}
                      style={{ textTransform: "uppercase" }}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upiId">UPI ID (optional)</Label>
                    <Input
                      id="upiId"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={bankLoading || bankSaving}
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLocation("/dashboard")}
                      disabled={bankSaving}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      className="bg-[#0E6049] hover:bg-[#0b4b3a]"
                      disabled={bankLoading || bankSaving}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {bankSaving ? "Saving..." : "Save Bank Details"}
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </>
        )}

        {isChangePasswordOnly && (
          <div className="max-w-xl">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <form className="space-y-4" onSubmit={handleChangePassword}>
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10 pr-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                      aria-invalid={!isNewPasswordStrong}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                  <p className={isNewPasswordStrong ? "text-xs text-muted-foreground" : "text-xs text-red-600"}>
                    Use at least 8 characters with uppercase, lowercase, number, and special character.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <Button type="button" variant="outline" onClick={() => setLocation("/dashboard")}
                  >
                    Back
                  </Button>
                  <Button type="submit" className="bg-[#0E6049] hover:bg-[#0b4b3a]">
                    <Lock className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}