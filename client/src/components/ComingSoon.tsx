import findternLogo from "@assets/logo.png";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

export default function ComingSoon({ subtitle }: { subtitle?: string }) {
  return (
    <div className="min-h-[calc(100vh-74px)] bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-lg p-10 text-center">
        <img src={findternLogo} alt="Findtern" className="mx-auto h-20 w-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Coming soon</h1>
        <p className="text-muted-foreground mb-6">{subtitle || "We're working on this page. Check back soon!"}</p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="text-primary font-medium hover:underline">
            Go to Home
          </Link>
          <Link href="/contact" className="text-muted-foreground hover:underline">
            Contact Us
          </Link>
        </div>
      </Card>
    </div>
  );
}
