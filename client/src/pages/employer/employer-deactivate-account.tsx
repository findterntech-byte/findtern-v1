import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ArrowLeft, Trash2 } from "lucide-react";
import findternLogo from "@assets/logo.png";
import { apiRequest } from "@/lib/queryClient";
import { getEmployerAuth, clearEmployerAuth } from "@/lib/employerAuth";

export default function EmployerDeactivateAccountPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const handleDeactivate = async () => {
    const auth = getEmployerAuth();
    if (!auth) {
      clearEmployerAuth();
      setLocation("/employer/login");
      return;
    }

    try {
      const response = await apiRequest("POST", `/api/employer/${auth.id}/deactivate`, {});
      const json = await response.json();

      if (!response.ok) {
        toast({
          title: "Unable to deactivate",
          description: json?.message || "Something went wrong while deactivating your account.",
          variant: "destructive",
        });
        return;
      }

      clearEmployerAuth();
      toast({
        title: "Account deactivated",
        description: "Your employer account has been deactivated.",
      });
      setLocation("/employer/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong while deactivating your account.",
        variant: "destructive",
      });
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
            <img src={findternLogo} alt="Findtern" className="h-9 w-auto" />
            <span className="hidden sm:inline text-lg font-bold text-emerald-700">FINDTERN</span>
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

      <main className="max-w-2xl mx-auto px-4 md:px-8 py-8 md:py-10">
        <Card className="p-6 md:p-8 rounded-2xl shadow-sm bg-white/90 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900">Deactivate Account</h1>
              <p className="text-xs md:text-sm text-slate-600">
                This is a demo page. In production, your account and all associated data will be reviewed before deactivation.
              </p>
            </div>
          </div>

          <ul className="list-disc list-inside text-xs md:text-sm text-slate-600 space-y-1">
            <li>Your existing job posts and intern orders may be paused.</li>
            <li>Access to employer dashboard features will be removed.</li>
            <li>You can reach out to support anytime to re-activate, if allowed by policy.</li>
          </ul>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 px-4 text-xs"
              onClick={() => setLocation("/employer/account")}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-9 px-4 text-xs"
              onClick={() => setOpen(true)}
            >
              Deactivate account
            </Button>
          </div>
        </Card>

        <AlertDialog open={open} onOpenChange={setOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone in this demo. In the real product, our team will review your request before permanently deactivating your company account.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeactivate}>
                Deactivate
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
