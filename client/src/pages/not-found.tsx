import { type ReactNode } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Home, MapPin } from "lucide-react";

export function AnimatedEmptyStateCard({
  label,
  code,
  title,
  description,
  actions,
  variant,
  context,
}: {
  label?: string;
  code?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  variant?: "default" | "location";
  context?: string;
}) {
  const isLocation = variant === "location";

  return (
    <Card className="w-full max-w-lg mx-auto border-0 shadow-xl shadow-emerald-900/5 rounded-3xl overflow-hidden bg-white">
      <CardContent className="pt-8 pb-8 px-6 md:px-10">
        <div className="relative">
          <div
            className={`pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full blur-3xl ${
              isLocation ? "bg-sky-300/25" : "bg-emerald-300/20"
            }`}
            style={{ animation: "ft404Blob1 7s ease-in-out infinite" }}
          />
          <div
            className={`pointer-events-none absolute -bottom-12 -left-10 h-52 w-52 rounded-full blur-3xl ${
              isLocation ? "bg-amber-300/20" : "bg-teal-300/20"
            }`}
            style={{ animation: "ft404Blob2 8.5s ease-in-out infinite" }}
          />

          {isLocation ? (
            <div className="pointer-events-none absolute inset-x-0 -top-6 flex justify-center">
              <svg
                width="520"
                height="170"
                viewBox="0 0 520 170"
                className="max-w-full"
                style={{ animation: "ftLocSceneFloat 4.2s ease-in-out infinite" }}
              >
                <g opacity="0.18">
                  <text
                    x="30"
                    y="135"
                    fontSize="150"
                    fontWeight="900"
                    fill="#F59E0B"
                    fontFamily="ui-sans-serif, system-ui"
                  >
                    404
                  </text>
                </g>

                <g style={{ animation: "ftLocCloudDrift 9s linear infinite" }}>
                  <path
                    d="M360 52c9-18 35-18 44 0 15-6 31 6 30 22 14 4 22 20 16 34H330c-14-1-23-13-21-27 1-12 11-22 23-22 5 0 10 2 14 5z"
                    fill="#93C5FD"
                    opacity="0.55"
                  />
                </g>
                <g style={{ animation: "ftLocCloudDrift2 11s linear infinite" }}>
                  <path
                    d="M95 70c7-14 27-14 34 0 12-5 24 5 23 17 11 3 17 15 12 26H72c-11-1-18-10-16-20 1-10 9-18 18-18 4 0 8 2 11 4z"
                    fill="#A7F3D0"
                    opacity="0.55"
                  />
                </g>

                <g style={{ animation: "ftLocBalloonFloat 3.8s ease-in-out infinite" }}>
                  <ellipse cx="435" cy="36" rx="16" ry="20" fill="#7DD3FC" opacity="0.95" />
                  <ellipse cx="435" cy="36" rx="12" ry="16" fill="#38BDF8" opacity="0.75" />
                  <path d="M430 55h10l-3 8h-4z" fill="#F59E0B" opacity="0.85" />
                  <path d="M433 63v8" stroke="#F59E0B" strokeWidth="2" opacity="0.75" />
                </g>
              </svg>
            </div>
          ) : null}

          <div className="pointer-events-none absolute inset-x-0 -top-2 flex justify-center">
            <div
              className="select-none text-[84px] md:text-[104px] font-black tracking-tight leading-none"
              style={{
                WebkitTextStroke: "1px rgba(15, 118, 110, 0.12)",
                color: isLocation ? "rgba(245, 158, 11, 0.10)" : "rgba(16, 185, 129, 0.08)",
                animation: isLocation ? "ftLocSceneFloat 4.2s ease-in-out infinite" : "ft404Float 3.6s ease-in-out infinite",
              }}
            >
              {code ?? "404"}
            </div>
          </div>

          <div className="relative flex items-start gap-4">
            <div
              className="relative shrink-0"
              style={{ animation: isLocation ? "ftLocPinBounce 2.6s ease-in-out infinite" : "ft404Wiggle 2.8s ease-in-out infinite" }}
            >
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center ${
                isLocation ? "bg-sky-50" : "bg-rose-50"
              }`}>
                {isLocation ? (
                  <MapPin className="h-7 w-7 text-sky-600" />
                ) : (
                  <AlertCircle className="h-7 w-7 text-rose-600" />
                )}
              </div>
              <div
                className={`absolute -inset-2 rounded-3xl border ${
                  isLocation ? "border-sky-200/60" : "border-rose-200/60"
                }`}
                style={{ animation: "ft404Pulse 1.8s ease-in-out infinite" }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {label ?? "Error 404"}
              </div>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-slate-900">{title}</h1>
              {context ? (
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-700">
                  <MapPin className="h-3.5 w-3.5 text-sky-600" />
                  <span className="truncate">{context}</span>
                </div>
              ) : null}
              <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed">{description}</p>
            </div>
          </div>
        </div>

        {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}

        <style>{`@keyframes ft404Pulse { 0% { opacity: .35; transform: scale(.96); } 50% { opacity: .9; transform: scale(1); } 100% { opacity: .35; transform: scale(.96); } }
@keyframes ft404Float { 0% { transform: translateY(0px); } 50% { transform: translateY(10px); } 100% { transform: translateY(0px); } }
@keyframes ft404Blob1 { 0% { transform: translate(0px, 0px) scale(1); } 50% { transform: translate(-18px, 12px) scale(1.08); } 100% { transform: translate(0px, 0px) scale(1); } }
@keyframes ft404Blob2 { 0% { transform: translate(0px, 0px) scale(1); } 50% { transform: translate(16px, -10px) scale(1.06); } 100% { transform: translate(0px, 0px) scale(1); } }
@keyframes ft404Wiggle { 0% { transform: rotate(0deg); } 50% { transform: rotate(-1.5deg); } 100% { transform: rotate(0deg); } }
@keyframes ftLocPinBounce { 0% { transform: translateY(0px); } 50% { transform: translateY(-6px); } 100% { transform: translateY(0px); } }
@keyframes ftLocBalloonFloat { 0% { transform: translateY(0px); } 50% { transform: translateY(8px); } 100% { transform: translateY(0px); } }
@keyframes ftLocSceneFloat { 0% { transform: translateY(0px); } 50% { transform: translateY(10px); } 100% { transform: translateY(0px); } }
@keyframes ftLocCloudDrift { 0% { transform: translateX(0px); } 100% { transform: translateX(-110px); } }
@keyframes ftLocCloudDrift2 { 0% { transform: translateX(0px); } 100% { transform: translateX(120px); } }
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; }
}`}</style>
      </CardContent>
    </Card>
  );
}

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 px-4">
      <AnimatedEmptyStateCard
        label="Error 404"
        code="404"
        title="Page not found"
        description="The page you’re looking for doesn’t exist or may have been moved."
        actions={
          <>
            <Button
              type="button"
              className="h-10 rounded-full bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setLocation("/")}
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-slate-200"
              onClick={() => {
                if (typeof window !== "undefined") window.history.back();
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </>
        }
      />
    </div>
  );
}
