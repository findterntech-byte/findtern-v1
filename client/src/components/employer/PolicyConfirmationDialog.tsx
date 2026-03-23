import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

type PolicyConfirmationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  isConfirming?: boolean;
  countdownSeconds?: number;
  title?: string;
  description?: string;
  confirmLabel?: string;
};

export function PolicyConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  isConfirming,
  countdownSeconds = 10,
  title = "Before Sending or Confirming a Proposal",
  description = "By sending or confirming an internship proposal through Findtern, employers acknowledge and agree to the following platform policies:",
  confirmLabel = "I Agree & Continue",
}: PolicyConfirmationDialogProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(countdownSeconds);
  const [hasAgreed, setHasAgreed] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSecondsLeft(countdownSeconds);
    setHasAgreed(false);

    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(id);
    };
  }, [open, countdownSeconds]);

  const canConfirm = secondsLeft <= 0 && hasAgreed && !isConfirming;

  const confirmButtonLabel = useMemo(() => {
    if (isConfirming) return "Please wait...";
    if (secondsLeft > 0) return `${confirmLabel} (${secondsLeft}s)`;
    return confirmLabel;
  }, [confirmLabel, isConfirming, secondsLeft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 min-h-0 pr-4">
          <div className="space-y-4 text-sm text-slate-700">
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">Do Not Recruit Outside the Platform</div>
              <div className="text-slate-700">
                Employers must not directly hire, engage, or continue employment discussions with Findtern-listed interns outside the platform to avoid platform service or facilitation fees.
              </div>
              <div className="text-slate-700">
                Any hiring initiated through Findtern must be completed in compliance with platform policies.
              </div>
              <div className="text-slate-700">
                Violations may attract monetary penalties and employer account restrictions.
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-900">Do Not Cancel Confirmed Internship Without Valid Reason</div>
              <div className="text-slate-700">
                Employers must not terminate or withdraw confirmed internship offers without justified business or performance-related reasons.
              </div>
              <div className="text-slate-700">Non-compliance may lead to:</div>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li>Monetary penalties</li>
                <li>Employer account suspension or candidate access restrictions</li>
                <li>Reduced employer credibility on the platform</li>
              </ul>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-900">Mandatory PPO Reporting</div>
              <div className="text-slate-700">
                Employers must notify Findtern before issuing any PPO or full-time employment offer to interns sourced through the platform.
              </div>
              <div className="text-slate-700">PPO-related communication must be shared at:</div>
              <div className="font-medium text-slate-900">communicate@findtern.in</div>
              <div className="text-slate-700">
                Failure to disclose PPO conversion may result in contractual and financial penalties.
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-900">Professional Internship Environment</div>
              <div className="text-slate-700">
                Employers must ensure fair task allocation, ethical working conditions, and adherence to agreed internship scope.
              </div>
              <div className="text-slate-700">
                Employers must not assign illegal, exploitative, or role-irrelevant work.
              </div>
            </div>

            <div className="space-y-1">
              <div className="font-semibold text-slate-900">Data Protection & Confidentiality</div>
              <div className="text-slate-700">
                Employers must not misuse intern personal data, AI interview recordings, or candidate profile details outside recruitment or internship purposes.
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <Checkbox
                checked={hasAgreed}
                onCheckedChange={(v) => setHasAgreed(Boolean(v))}
                className="mt-0.5 border-emerald-300 data-[state=checked]:bg-emerald-600"
              />
              <div className="text-sm text-slate-700">
                <div className="font-medium text-slate-900">I have read and agree to the above policies.</div>
                <div className="text-xs text-slate-500 mt-1">
                  {secondsLeft > 0
                    ? `Please wait ${secondsLeft}s before continuing.`
                    : "You can continue once you confirm your agreement."}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-emerald-600 enabled:hover:bg-emerald-700"
            disabled={!canConfirm}
            onClick={async () => {
              onOpenChange(false);
              await onConfirm();
            }}
          >
            {confirmButtonLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
