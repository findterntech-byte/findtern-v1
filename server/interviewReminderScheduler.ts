import { storage } from "./storage";

type ReminderHours = 24 | 12 | 1;

function getInterviewStartTime(interview: any): Date | null {
  const selected = Number(interview?.selectedSlot);
  const pick = (slot: any) => {
    if (!slot) return null;
    const d = new Date(slot);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  if (selected === 1) return pick(interview?.slot1);
  if (selected === 2) return pick(interview?.slot2);
  if (selected === 3) return pick(interview?.slot3);

  return pick(interview?.slot1) ?? pick(interview?.slot2) ?? pick(interview?.slot3);
}

function formatReminderTitle(hours: ReminderHours) {
  return hours === 1 ? "Interview in 1 hour" : `Interview in ${hours} hours`;
}

function formatReminderMessage(hours: ReminderHours, recipient: "intern" | "employer") {
  if (recipient === "intern") {
    if (hours === 1) return "⏰ Your interview starts in 1 hour. Be ready!";
    if (hours === 12) return "⏰ Reminder: your interview is in 12 hours. Get ready!";
    return "⏰ Reminder: your interview is in 24 hours. Prepare well!";
  }

  if (hours === 1) return "⏰ Interview starts in 1 hour.";
  if (hours === 12) return "⏰ Reminder: interview is in 12 hours.";
  return "⏰ Reminder: interview is in 24 hours.";
}

async function sendReminderForInterview(interview: any, hours: ReminderHours) {
  const interviewId = String(interview?.id ?? "").trim();
  if (!interviewId) return;

  const startTime = getInterviewStartTime(interview);
  if (!startTime) return;

  const internId = String(interview?.internId ?? "").trim();
  const employerId = String(interview?.employerId ?? "").trim();

  // Intern reminder
  if (internId) {
    await storage.createNotificationDeduped({
      recipientType: "intern",
      recipientId: internId,
      type: "interview_reminder",
      title: formatReminderTitle(hours),
      message: formatReminderMessage(hours, "intern"),
      data: {
        interviewId,
        hours,
        startTime: startTime.toISOString(),
        employerId: employerId || null,
      },
      dedupeKey: `interview_reminder:${interviewId}:intern:${hours}h`,
    } as any);
  }

  // Employer reminder (skip AI interview employer=admin)
  if (employerId && employerId !== "admin") {
    await storage.createNotificationDeduped({
      recipientType: "employer",
      recipientId: employerId,
      type: "interview_reminder",
      title: formatReminderTitle(hours),
      message: formatReminderMessage(hours, "employer"),
      data: {
        interviewId,
        hours,
        startTime: startTime.toISOString(),
        internId: internId || null,
      },
      dedupeKey: `interview_reminder:${interviewId}:employer:${hours}h`,
    } as any);
  }
}

async function tick() {
  const now = new Date();
  const windowMs = 10 * 60 * 1000; // 10 minutes

  const interviews = await storage.listInterviewsByStatus(["scheduled"]);

  for (const interview of interviews) {
    const startTime = getInterviewStartTime(interview);
    if (!startTime) continue;

    const diffMs = startTime.getTime() - now.getTime();

    const checks: ReminderHours[] = [24, 12, 1];
    for (const hours of checks) {
      const targetMs = hours * 60 * 60 * 1000;
      if (diffMs <= targetMs + windowMs && diffMs >= targetMs - windowMs) {
        try {
          await sendReminderForInterview(interview, hours);
        } catch (err) {
          console.error("Interview reminder send error:", err);
        }
      }
    }
  }
}

export function startInterviewReminderScheduler() {
  const g: any = globalThis as any;
  if (g.__findternInterviewReminderSchedulerStarted) return;
  g.__findternInterviewReminderSchedulerStarted = true;

  const intervalMs = 5 * 60 * 1000; // 5 minutes

  // Fire once on boot (best effort)
  tick().catch((err) => console.error("Interview reminder scheduler tick error:", err));

  setInterval(() => {
    tick().catch((err) => console.error("Interview reminder scheduler tick error:", err));
  }, intervalMs);
}
