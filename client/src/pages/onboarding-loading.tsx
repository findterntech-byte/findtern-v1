import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import findternLogo from "@assets/logo.png";

export default function OnboardingLoadingPage() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const timer = setTimeout(() => {
      setLocation("/onboarding");
    }, 1800);

    return () => clearTimeout(timer);
  }, [setLocation]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-background/60 relative overflow-hidden">
      {/* Soft background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-primary/5 blur-3xl rounded-full" />
        <div className="absolute bottom-[-160px] right-16 w-[320px] h-[320px] bg-primary/8 blur-3xl rounded-full" />
      </div>

      <Card className="relative z-10 w-full max-w-md px-8 py-10 md:px-10 md:py-12 flex flex-col items-center gap-8 border border-card-border/90 shadow-xl rounded-2xl bg-card/95 backdrop-blur">
        <img
          src={findternLogo}
          alt="Findtern - Internship Simplified"
          className="h-10 md:h-12 w-auto "
        />

        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="h-14 w-14 rounded-full border-4 border-primary/15 border-t-primary animate-spin" />
          </div>
          <p className="text-sm md:text-base text-muted-foreground text-center max-w-xs">
            Please wait while we load things for you...
          </p>
        </div>
      </Card>
    </div>
  );
}


