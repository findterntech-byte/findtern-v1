import { storage } from "./storage";

function isoMonthKeyUtc(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function formatNotification(template: string, vars: Record<string, string | number | null | undefined>) {
  return template.replace(/\[([^\]]+)\]/g, (_m, key) => {
    const v = vars[String(key)];
    if (v === null || v === undefined) return "";
    return String(v);
  });
}

async function sendWeeklyEmployerHireTip(now: Date) {
  if (now.getUTCDay() !== 1) return; // Monday

  const weekKey = isoWeekKeyUtc(now);
  const employers = await storage.getEmployers().catch(() => [] as any[]);

  for (const e of employers) {
    const employerId = String((e as any)?.id ?? "").trim();
    if (!employerId) continue;

    if (Boolean((e as any)?.onboardingCompleted) !== true) continue;

    const proposals = await storage.getProposalsByEmployerId(employerId).catch(() => [] as any[]);
    const hired = (Array.isArray(proposals) ? proposals : []).filter(
      (p) => String((p as any)?.status ?? "").trim().toLowerCase() === "hired",
    );
    if (hired.length === 0) continue;

    const internIds = Array.from(
      new Set(
        hired
          .map((p) => String((p as any)?.internId ?? (p as any)?.intern_id ?? "").trim())
          .filter(Boolean),
      ),
    );
    if (internIds.length === 0) continue;

    const intern = await storage.getUser(internIds[0]).catch(() => undefined);
    const internName = intern
      ? `${String((intern as any)?.firstName ?? "").trim()} ${String((intern as any)?.lastName ?? "").trim()}`.trim() || "your intern"
      : "your intern";

    await storage.createNotificationDeduped({
      recipientType: "employer",
      recipientId: employerId,
      type: "weekly_hire_tip",
      title: "Weekly tip",
      message: formatNotification(
        "🚀 Internship completed! Consider hiring [Intern Name] full-time.",
        { "Intern Name": internName },
      ),
      data: { week: weekKey, internId: internIds[0], internName },
      dedupeKey: `weekly_hire_tip:${employerId}:${weekKey}`,
      isRead: false,
    } as any);
  }
}

async function sendDailyEmployerProfileCompletionNudges(now: Date) {
  const dayKey = isoDateKeyUtc(now);
  const employers = await storage.getEmployers().catch(() => [] as any[]);

  for (const e of employers) {
    const employerId = String((e as any)?.id ?? "").trim();
    if (!employerId) continue;

    const setupCompleted = Boolean((e as any)?.setupCompleted);
    const onboardingCompleted = Boolean((e as any)?.onboardingCompleted);
    const hasLogo = Boolean(String((e as any)?.logoUrl ?? "").trim());
    const hasWebsite = Boolean(String((e as any)?.websiteUrl ?? "").trim());
    const hasCompanySize = Boolean(String((e as any)?.companySize ?? "").trim());
    const hasCity = Boolean(String((e as any)?.city ?? "").trim());

    if (setupCompleted && onboardingCompleted && hasLogo && hasWebsite && hasCompanySize && hasCity) continue;

    await storage.createNotificationDeduped({
      recipientType: "employer",
      recipientId: employerId,
      type: "employer_profile_completion_nudge",
      title: "Complete your employer profile",
      message: "📌 Missing details? Update your employer profile today.",
      data: {
        setupCompleted,
        onboardingCompleted,
        hasLogo,
        hasWebsite,
        hasCompanySize,
        hasCity,
      },
      dedupeKey: `employer_profile_completion_nudge:${employerId}:${dayKey}`,
      isRead: false,
    } as any);
  }
}

async function sendDailyEmployerTalentSpotlight(now: Date) {
  const dayKey = isoDateKeyUtc(now);
  const employers = await storage.getEmployers().catch(() => [] as any[]);
  if (!Array.isArray(employers) || employers.length === 0) return;

  const allOnboarding = await storage.getAllInternOnboarding().catch(() => [] as any[]);
  if (!Array.isArray(allOnboarding) || allOnboarding.length === 0) return;

  const internUsers = await storage.getUsers().catch(() => [] as any[]);
  const userById = new Map<string, any>();
  for (const u of internUsers) {
    const id = String((u as any)?.id ?? "").trim();
    if (id) userById.set(id, u);
  }

  const internProfiles = allOnboarding
    .map((o) => {
      const internId = String((o as any)?.userId ?? (o as any)?.user_id ?? "").trim();
      const skillsRaw = Array.isArray((o as any)?.skills) ? (o as any).skills : [];
      const skills = skillsRaw
        .map((s: any) => (typeof s === "string" ? s : String((s as any)?.value ?? (s as any)?.name ?? "")))
        .map((s: string) => s.trim().toLowerCase())
        .filter(Boolean);
      const scoreRaw = (o as any)?.extraData?.findternScore ?? (o as any)?.extra_data?.findternScore ?? 0;
      const score = Number(scoreRaw ?? 0);
      return {
        internId,
        skills: new Set(skills),
        score: Number.isFinite(score) ? score : 0,
      };
    })
    .filter((p) => p.internId);

  if (internProfiles.length === 0) return;

  for (const e of employers) {
    const employerId = String((e as any)?.id ?? "").trim();
    if (!employerId) continue;

    if (Boolean((e as any)?.onboardingCompleted) !== true) continue;

    const projects = await storage.getProjectsByEmployerId(employerId).catch(() => [] as any[]);
    const projectSkills = new Set(
      (Array.isArray(projects) ? projects : [])
        .flatMap((p: any) => (Array.isArray(p?.skills) ? p.skills : []))
        .map((s: any) => String(s ?? "").trim().toLowerCase())
        .filter(Boolean),
    );

    if (projectSkills.size === 0) continue;

    const ranked = internProfiles
      .map((p) => {
        let overlap = 0;
        const skillsArr = Array.from(projectSkills);
        for (let idx = 0; idx < skillsArr.length; idx += 1) {
          const s = skillsArr[idx];
          if (p.skills.has(s)) overlap += 1;
        }
        return { ...p, overlap };
      })
      .filter((p) => p.overlap > 0)
      .sort((a, b) => {
        if (b.overlap !== a.overlap) return b.overlap - a.overlap;
        return b.score - a.score;
      })
      .slice(0, 5);

    if (ranked.length === 0) continue;

    const candidateIds = ranked.map((r) => r.internId);
    const candidateNames = ranked
      .map((r) => {
        const u = userById.get(r.internId);
        const name = u
          ? `${String((u as any)?.firstName ?? "").trim()} ${String((u as any)?.lastName ?? "").trim()}`.trim()
          : "";
        return name || r.internId;
      })
      .slice(0, 5);

    await storage.createNotificationDeduped({
      recipientType: "employer",
      recipientId: employerId,
      type: "talent_spotlight",
      title: "Talent spotlight",
      message: "🚀 Talent spotlight: Check out today’s top candidate profiles.",
      data: {
        skills: Array.from(projectSkills).slice(0, 25),
        candidateIds,
        candidateNames,
      },
      dedupeKey: `talent_spotlight:${employerId}:${dayKey}`,
      isRead: false,
    } as any);
  }
}

async function sendEmployerInterviewFeedbackRequests(now: Date) {
  const interviews = await storage.listInterviewsByStatus(["completed"]).catch(() => [] as any[]);
  if (!Array.isArray(interviews) || interviews.length === 0) return;

  for (const i of interviews) {
    const interviewId = String((i as any)?.id ?? "").trim();
    if (!interviewId) continue;

    const employerId = String((i as any)?.employerId ?? (i as any)?.employer_id ?? "").trim();
    if (!employerId || employerId === "admin") continue;

    const internId = String((i as any)?.internId ?? (i as any)?.intern_id ?? "").trim();
    const createdAt = (i as any)?.updatedAt ?? (i as any)?.updated_at ?? (i as any)?.createdAt ?? (i as any)?.created_at;
    const dayKey = isoDateKeyUtc(createdAt ? new Date(createdAt) : now);

    await storage.createNotificationDeduped({
      recipientType: "employer",
      recipientId: employerId,
      type: "interview_feedback_request",
      title: "Provide interview feedback",
      message: "📝 Share your thoughts! Provide feedback on the interview.",
      data: {
        interviewId,
        internId: internId || null,
      },
      dedupeKey: `interview_feedback_request:${interviewId}:${employerId}:${dayKey}`,
      isRead: false,
    } as any);
  }
}

async function sendDailyProfileCompletionNudges(now: Date) {
  const dayKey = isoDateKeyUtc(now);
  const users = await storage.getUsers().catch(() => [] as any[]);

  for (const u of users) {
    const internId = String((u as any)?.id ?? "").trim();
    if (!internId) continue;

    const onboarding = await storage.getInternOnboardingByUserId(internId).catch(() => undefined);
    const hasSkills = Array.isArray((onboarding as any)?.skills) && (onboarding as any).skills.length > 0;
    const hasBio = Boolean(String((onboarding as any)?.bio ?? "").trim());
    const hasCity = Boolean(String((onboarding as any)?.city ?? "").trim());
    if (onboarding && hasSkills && hasBio && hasCity) continue;

    const internName = `${String((u as any)?.firstName ?? "").trim()} ${String((u as any)?.lastName ?? "").trim()}`.trim() || "Candidate";

    await storage.createNotificationDeduped({
      recipientType: "intern",
      recipientId: internId,
      type: "profile_completion_nudge",
      title: "Complete your profile",
      message: `🚀 ${internName}, complete your profile to attract more employers!`,
      data: {
        hasOnboarding: Boolean(onboarding),
        hasSkills,
        hasBio,
        hasCity,
      },
      dedupeKey: `profile_completion_nudge:${internId}:${dayKey}`,
      isRead: false,
    } as any);
  }
}

function isoDateKeyUtc(d: Date) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function isoWeekKeyUtc(d: Date) {
  const base = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
  const day = base.getUTCDay(); // 0 Sun .. 6 Sat
  const mondayOffset = (day + 6) % 7;
  const monday = new Date(base.getTime() - mondayOffset * 24 * 60 * 60 * 1000);
  return `${isoDateKeyUtc(monday)}_wk`;
}

async function sendMonthlyProfileViewsSummary(now: Date) {
  if (now.getUTCDate() !== 1) return;

  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
  const monthKey = isoMonthKeyUtc(prevMonthStart);

  const users = await storage.getUsers().catch(() => [] as any[]);
  for (const u of users) {
    const internId = String((u as any)?.id ?? "").trim();
    if (!internId) continue;

    const internName = `${String((u as any)?.firstName ?? "").trim()} ${String((u as any)?.lastName ?? "").trim()}`.trim();

    const views = await storage.countProfileViewsForIntern(internId, prevMonthStart, thisMonthStart).catch(() => 0);

    await storage.createNotificationDeduped({
      recipientType: "intern",
      recipientId: internId,
      type: "monthly_profile_views",
      title: "Monthly profile views",
      message: `🚀 Growth check: ${views} views this month! Keep up the momentum.`,
      data: {
        month: monthKey,
        views,
        internName: internName || null,
      },
      dedupeKey: `monthly_profile_views:${internId}:${monthKey}`,
      isRead: false,
    } as any);
  }
}

async function sendEmployerCartInactivityReminders(now: Date) {
  const olderThan = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const items = await storage
    .listEmployerCartItemsOlderThan({ listType: "cart", olderThan, limit: 20000 })
    .catch(() => [] as any[]);

  if (!Array.isArray(items) || items.length === 0) return;

  const byEmployer = new Map<string, number>();
  for (const it of items) {
    const employerId = String((it as any)?.employerId ?? "").trim();
    if (!employerId) continue;
    byEmployer.set(employerId, (byEmployer.get(employerId) ?? 0) + 1);
  }

  const dayKey = isoDateKeyUtc(now);
  for (const [employerId, count] of Array.from(byEmployer.entries())) {
    await storage.createNotificationDeduped({
      recipientType: "employer",
      recipientId: employerId,
      type: "cart_inactivity",
      title: "Cart reminder",
      message: "🛒 Reminder: You still have candidates waiting in your cart.",
      data: { count },
      dedupeKey: `cart_inactivity:${employerId}:${dayKey}`,
      isRead: false,
    } as any);
  }
}

async function tick() {
  const now = new Date();

  try {
    await sendMonthlyProfileViewsSummary(now);
  } catch (err) {
    console.error("Monthly profile views scheduler error:", err);
  }

  try {
    await sendEmployerCartInactivityReminders(now);
  } catch (err) {
    console.error("Cart inactivity scheduler error:", err);
  }

  try {
    await sendWeeklyEmployerHireTip(now);
  } catch (err) {
    console.error("Weekly employer tip scheduler error:", err);
  }

  try {
    await sendDailyProfileCompletionNudges(now);
  } catch (err) {
    console.error("Profile completion nudge scheduler error:", err);
  }

  try {
    await sendDailyEmployerProfileCompletionNudges(now);
  } catch (err) {
    console.error("Employer profile completion nudge scheduler error:", err);
  }

  try {
    await sendDailyEmployerTalentSpotlight(now);
  } catch (err) {
    console.error("Talent spotlight scheduler error:", err);
  }

  try {
    await sendEmployerInterviewFeedbackRequests(now);
  } catch (err) {
    console.error("Interview feedback request scheduler error:", err);
  }
}

export function startNotificationScheduler() {
  const g: any = globalThis as any;
  if (g.__findternNotificationSchedulerStarted) return;
  g.__findternNotificationSchedulerStarted = true;

  tick().catch((err) => console.error("Notification scheduler tick error:", err));

  const intervalMs = 6 * 60 * 60 * 1000;
  setInterval(() => {
    tick().catch((err) => console.error("Notification scheduler tick error:", err));
  }, intervalMs);
}
