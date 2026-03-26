
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  type User,
  type InsertUser,
  type Employer,
  type InsertEmployer,
  type Admin,
  type InsertAdmin,
  type AdminRole,
  type InsertAdminRole,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type EmailOtp,
  type InsertEmailOtp,
  type WebsiteSliderItem,
  type InsertWebsiteSliderItem,
  type WebsiteBlogPost,
  type InsertWebsiteBlogPost,
  type WebsiteFeaturedSkill,
  type InsertWebsiteFeaturedSkill,
  type WebsiteHappyFace,
  type InsertWebsiteHappyFace,
  type WebsitePartner,
  type InsertWebsitePartner,
  type WebsitePlan,
  type InsertWebsitePlan,
  type WebsiteFaq,
  type InsertWebsiteFaq,
  type WebsiteTerms,
  type InsertWebsiteTerms,
  type InternTerms,
  type InsertInternTerms,
  type InternNonDisclosureClause,
  type InsertInternNonDisclosureClause,
  type EmployerTerms,
  type InsertEmployerTerms,
  type ContactMessage,
  type InsertContactMessage,
  type PricingPlan,
  type InsertPricingPlan,
  type EmployerGoogleToken,
  type InternDocuments,
  type InsertInternDocuments,
  type InternOnboarding,
  type InsertInternOnboarding,
  type InternPayment,
  type InsertInternPayment,
  type InternPayout,
  type InsertInternPayout,
  type EmployerPayment,
  type InsertEmployerPayment,
  type Project,
  type InsertProject,
  type Proposal,
  type InsertProposal,
  type Timesheet,
  type InsertTimesheet,
  type Interview,
  type InsertInterview,
  type Notification,
  type InsertNotification,
  type ProfileView,
  type InsertProfileView,
  type EmployerSavedSearch,
  type InsertEmployerSavedSearch,
  type EmployerCartItem,
  type InsertEmployerCartItem,
  users,
  passwordResetTokens,
  emailOtps,
  employers,
  admins,
  adminRoles,
  websiteSlider,
  websiteBlogPosts,
  websiteFeaturedSkills,
  websiteHappyFaces,
  websitePartners,
  websitePlans,
  websiteFaqs,
  websiteTerms,
  internTerms,
  internNonDisclosureClauses,
  employerTerms,
  contactMessages,
  pricingPlans,
  internOnboarding,
  internDocuments,
  internPayments,
  internPayouts,
  employerPayments,
  projects,
  proposals,
  timesheets,
  interviews,
  employerGoogleTokens,
  notifications,
  profileViews,
  employerSavedSearches,
  employerCartItems,
} from "@shared/schema";
import { eq, desc, and, or, isNull, asc, sql, inArray } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;

const databaseSslEnabled = (() => {
  try {
    const cs = String(connectionString ?? "").trim();
    if (!cs) return false;
    const url = new URL(cs);
    const sslmode = (url.searchParams.get("sslmode") ?? "").toLowerCase();
    const ssl = (url.searchParams.get("ssl") ?? "").toLowerCase();

    if (sslmode && sslmode !== "disable") return true;
    if (ssl === "true" || ssl === "1") return true;

    return url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
  } catch {
    return true;
  }
})();

const shouldUseSsl = databaseSslEnabled;

const sslRejectUnauthorized = (() => {
  const raw = (process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "").trim().toLowerCase();
  if (!raw) return false;
  return raw !== "0" && raw !== "false" && raw !== "no";
})();

const pool = new Pool({
  connectionString,
  ...(shouldUseSsl ? { ssl: { rejectUnauthorized: sslRejectUnauthorized } } : {}),
});

const db = drizzle(pool);

export interface IStorage {
  // Users (interns)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined>;
  getUserByCountryCodeAndPhoneNumber(
    countryCode: string,
    phoneNumber: string,
  ): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  updateUser(id: string, data: Partial<typeof users.$inferInsert>): Promise<User | undefined>;
  deleteUser(id: string): Promise<void>;

  // Password reset tokens
  createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: string, usedAt: Date): Promise<PasswordResetToken | undefined>;
  deletePasswordResetTokensForSubject(subjectType: string, subjectId: string): Promise<void>;

  // Email OTPs
  createEmailOtp(data: InsertEmailOtp): Promise<EmailOtp>;
  getLatestEmailOtpForSubject(subjectType: string, subjectId: string): Promise<EmailOtp | undefined>;
  markEmailOtpUsed(id: string, usedAt: Date): Promise<EmailOtp | undefined>;
  deleteEmailOtpsForSubject(subjectType: string, subjectId: string): Promise<void>;

  // Website CMS
  listWebsiteSlider(): Promise<WebsiteSliderItem[]>;
  createWebsiteSliderItem(data: InsertWebsiteSliderItem): Promise<WebsiteSliderItem>;
  updateWebsiteSliderItem(
    id: string,
    data: Partial<InsertWebsiteSliderItem>,
  ): Promise<WebsiteSliderItem | undefined>;
  deleteWebsiteSliderItem(id: string): Promise<void>;

  listWebsiteBlogPosts(): Promise<WebsiteBlogPost[]>;
  createWebsiteBlogPost(data: InsertWebsiteBlogPost): Promise<WebsiteBlogPost>;
  updateWebsiteBlogPost(
    id: string,
    data: Partial<InsertWebsiteBlogPost>,
  ): Promise<WebsiteBlogPost | undefined>;
  deleteWebsiteBlogPost(id: string): Promise<void>;

  listWebsiteFeaturedSkills(): Promise<WebsiteFeaturedSkill[]>;
  createWebsiteFeaturedSkill(data: InsertWebsiteFeaturedSkill): Promise<WebsiteFeaturedSkill>;
  updateWebsiteFeaturedSkill(
    id: string,
    data: Partial<InsertWebsiteFeaturedSkill>,
  ): Promise<WebsiteFeaturedSkill | undefined>;
  deleteWebsiteFeaturedSkill(id: string): Promise<void>;

  listWebsiteHappyFaces(): Promise<WebsiteHappyFace[]>;
  createWebsiteHappyFace(data: InsertWebsiteHappyFace): Promise<WebsiteHappyFace>;
  updateWebsiteHappyFace(
    id: string,
    data: Partial<InsertWebsiteHappyFace>,
  ): Promise<WebsiteHappyFace | undefined>;
  deleteWebsiteHappyFace(id: string): Promise<void>;

  listWebsitePartners(): Promise<WebsitePartner[]>;
  createWebsitePartner(data: InsertWebsitePartner): Promise<WebsitePartner>;
  updateWebsitePartner(
    id: string,
    data: Partial<InsertWebsitePartner>,
  ): Promise<WebsitePartner | undefined>;
  deleteWebsitePartner(id: string): Promise<void>;

  listWebsitePlans(): Promise<WebsitePlan[]>;
  createWebsitePlan(data: InsertWebsitePlan): Promise<WebsitePlan>;
  updateWebsitePlan(
    id: string,
    data: Partial<InsertWebsitePlan>,
  ): Promise<WebsitePlan | undefined>;
  deleteWebsitePlan(id: string): Promise<void>;

  // Pricing plans
  listPricingPlans(region?: string | null): Promise<PricingPlan[]>;
  createPricingPlan(data: InsertPricingPlan): Promise<PricingPlan>;
  updatePricingPlan(id: string, data: Partial<InsertPricingPlan>): Promise<PricingPlan | undefined>;
  deletePricingPlan(id: string): Promise<void>;

  listWebsiteFaqs(): Promise<WebsiteFaq[]>;
  createWebsiteFaq(data: InsertWebsiteFaq): Promise<WebsiteFaq>;
  updateWebsiteFaq(
    id: string,
    data: Partial<InsertWebsiteFaq>,
  ): Promise<WebsiteFaq | undefined>;
  deleteWebsiteFaq(id: string): Promise<void>;

  getWebsiteTerms(): Promise<WebsiteTerms | undefined>;
  setWebsiteTerms(data: Pick<InsertWebsiteTerms, "title" | "bodyHtml">): Promise<WebsiteTerms>;

  getInternTerms(): Promise<InternTerms | undefined>;
  setInternTerms(data: Pick<InsertInternTerms, "title" | "bodyHtml">): Promise<InternTerms>;

  listInternNonDisclosureClauses(): Promise<InternNonDisclosureClause[]>;
  createInternNonDisclosureClause(data: InsertInternNonDisclosureClause): Promise<InternNonDisclosureClause>;
  updateInternNonDisclosureClause(
    id: string,
    data: Partial<InsertInternNonDisclosureClause>,
  ): Promise<InternNonDisclosureClause | undefined>;
  deleteInternNonDisclosureClause(id: string): Promise<void>;

  getEmployerTerms(): Promise<EmployerTerms | undefined>;
  setEmployerTerms(data: Pick<InsertEmployerTerms, "title" | "bodyHtml">): Promise<EmployerTerms>;

  createContactMessage(data: InsertContactMessage): Promise<ContactMessage>;
  getContactMessage(id: string): Promise<ContactMessage | undefined>;
  listContactMessages(limit?: number): Promise<ContactMessage[]>;
  markContactMessageRead(id: string, isRead: boolean): Promise<ContactMessage | undefined>;
  deleteContactMessage(id: string): Promise<void>;

  // Employers
  getEmployer(id: string): Promise<Employer | undefined>;
  getEmployerByEmail(email: string): Promise<Employer | undefined>;
  getEmployerByPhoneNumber(phoneNumber: string): Promise<Employer | undefined>;
  getEmployerByCountryCodeAndPhoneNumber(
    countryCode: string,
    phoneNumber: string,
  ): Promise<Employer | undefined>;
  getEmployerByEscalationCountryCodeAndPhoneNumber(
    countryCode: string,
    phoneNumber: string,
  ): Promise<Employer | undefined>;
  createEmployer(employer: InsertEmployer): Promise<Employer>;
  getEmployers(): Promise<Employer[]>;
  updateEmployer(
    id: string,
    data: Partial<typeof employers.$inferInsert>,
  ): Promise<Employer | undefined>;
  deleteEmployer(id: string): Promise<void>;

  // Employer Projects
  createProject(project: InsertProject): Promise<Project>;
  getProjectsByEmployerId(employerId: string): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  updateProject(id: string, data: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: string): Promise<void>;

  // Admins
  getAdminByEmail(email: string): Promise<Admin | undefined>;
  getAdmin(id: string): Promise<Admin | undefined>;
  createAdmin(data: InsertAdmin): Promise<Admin>;
  deleteAdmin(id: string): Promise<void>;

  listAdmins(): Promise<Admin[]>;
  updateAdmin(id: string, data: Partial<{ firstName: string; lastName: string; email: string }>): Promise<Admin | undefined>;
  updateAdminRoleKey(adminId: string, roleKey: string | null): Promise<Admin | undefined>;
  updateAdminPassword(adminId: string, password: string): Promise<Admin | undefined>;
  listAdminRoles(): Promise<AdminRole[]>;
  createAdminRole(data: InsertAdminRole): Promise<AdminRole>;
  updateAdminRole(id: string, data: Partial<InsertAdminRole>): Promise<AdminRole | undefined>;
  deleteAdminRole(id: string): Promise<void>;

  // Google OAuth Tokens (Employer Calendar / Meet)
  getEmployerGoogleToken(employerId: string): Promise<EmployerGoogleToken | undefined>;
  upsertEmployerGoogleToken(
    employerId: string,
    data: Partial<EmployerGoogleToken>,
  ): Promise<EmployerGoogleToken>;

  // Intern Onboarding
  createInternOnboarding(data: InsertInternOnboarding): Promise<InternOnboarding>;
  getInternOnboardingByUserId(userId: string): Promise<InternOnboarding | undefined>;
  getAllInternOnboarding(): Promise<InternOnboarding[]>;
  getInternOnboardingByAadhaarNumber(aadhaarNumber: string): Promise<InternOnboarding | undefined>;
  getInternOnboardingByPanNumber(panNumber: string): Promise<InternOnboarding | undefined>;
  isInternEmergencyContactInUse(countryCode: string, phoneNumber: string, excludeUserId?: string): Promise<boolean>;
  isInternSecondPocContactInUse(countryCode: string, phoneNumber: string, excludeUserId?: string): Promise<boolean>;
  isEmployerEscalationContactInUse(countryCode: string, phoneNumber: string): Promise<boolean>;
  updateInternOnboarding(userId: string, data: Partial<InsertInternOnboarding>): Promise<InternOnboarding | undefined>;

  // Intern payments
  createInternPayment(data: InsertInternPayment): Promise<InternPayment>;
  getInternPaymentByOrderId(orderId: string): Promise<InternPayment | undefined>;
  updateInternPaymentByOrderId(
    orderId: string,
    data: Partial<InsertInternPayment>,
  ): Promise<InternPayment | undefined>;
  listAllInternPayments(
    opts?: { status?: string; currency?: string; limit?: number; q?: string; from?: Date; to?: Date },
  ): Promise<InternPayment[]>;

  // Intern payouts (Findtern -> Intern)
  createInternPayout(data: InsertInternPayout): Promise<InternPayout>;
  getInternPayout(id: string): Promise<InternPayout | undefined>;
  updateInternPayout(id: string, data: Partial<InsertInternPayout>): Promise<InternPayout | undefined>;
  listInternPayoutsByInternId(internId: string, opts?: { limit?: number }): Promise<InternPayout[]>;
  listAllInternPayouts(opts?: { status?: string; limit?: number }): Promise<InternPayout[]>;

  // Employer payments
  createEmployerPayment(data: InsertEmployerPayment): Promise<EmployerPayment>;
  getEmployerPaymentByOrderId(orderId: string): Promise<EmployerPayment | undefined>;
  updateEmployerPaymentByOrderId(
    orderId: string,
    data: Partial<InsertEmployerPayment>,
  ): Promise<EmployerPayment | undefined>;
  listAllEmployerPayments(
    opts?: {
      status?: string;
      currency?: string;
      limit?: number;
      q?: string;
      from?: Date;
      to?: Date;
      paidFrom?: Date;
      paidTo?: Date;
    },
  ): Promise<EmployerPayment[]>;
  listEmployerPaymentsByEmployerId(
    employerId: string,
    opts?: {
      status?: string;
      currency?: string;
      limit?: number;
      q?: string;
      from?: Date;
      to?: Date;
      paidFrom?: Date;
      paidTo?: Date;
    },
  ): Promise<EmployerPayment[]>;

  // Intern Documents
  getInternDocumentsByUserId(userId: string): Promise<InternDocuments | undefined>;
  upsertInternDocumentsByUserId(userId: string, data: Partial<InsertInternDocuments>): Promise<InternDocuments>;

  // Proposals
  createProposal(data: InsertProposal): Promise<Proposal>;
  getAllProposals(): Promise<Proposal[]>;
  getProposal(id: string): Promise<Proposal | undefined>;
  getProposalsByIds(ids: string[]): Promise<Proposal[]>;
  getProposalsByEmployerId(employerId: string): Promise<Proposal[]>;
  getProposalsByInternId(internId: string): Promise<Proposal[]>;
  updateProposalStatus(id: string, status: string): Promise<Proposal | undefined>;
  updateProposal(id: string, data: Partial<InsertProposal>): Promise<Proposal | undefined>;

  // Timesheets
  createTimesheet(data: InsertTimesheet): Promise<Timesheet>;
  getTimesheet(id: string): Promise<Timesheet | undefined>;
  getTimesheetsByInternId(internId: string, limit?: number): Promise<Timesheet[]>;
  listTimesheetsByEmployerId(
    employerId: string,
    opts?: { status?: string; proposalId?: string; internId?: string; limit?: number },
  ): Promise<Timesheet[]>;
  updateTimesheet(id: string, data: Partial<InsertTimesheet>): Promise<Timesheet | undefined>;
  deleteTimesheet(id: string): Promise<boolean>;

  // Interviews
  createInterview(data: InsertInterview): Promise<Interview>;
  listInterviewsByStatus(statuses: string[]): Promise<Interview[]>;
  getAllInterviews(): Promise<Interview[]>;
  getLatestInterviewForEmployerInternProject(
    employerId: string,
    internId: string,
    projectId?: string | null,
  ): Promise<Interview | undefined>;
  getInterviewsByInternId(internId: string): Promise<Interview[]>;
  getInterviewsByEmployerId(employerId: string): Promise<Interview[]>;
  updateInterviewSelectedSlot(id: string, selectedSlot: number): Promise<Interview | undefined>;
  updateInterviewScheduleWithMeetingLink(
    id: string,
    selectedSlot: number,
    meetingLink: string | null,
    calendarEventId?: string | null,
  ): Promise<Interview | undefined>;
  updateInterviewMeetingLink(
    id: string,
    meetingLink: string,
    notes?: string | null,
  ): Promise<Interview | undefined>;
  updateInterviewNotes(id: string, notes: string | null): Promise<Interview | undefined>;
  resetInterviewToPending(id: string): Promise<Interview | undefined>;
  getInterview(id: string): Promise<Interview | undefined>;
  updateInterviewStatus(id: string, status: string): Promise<Interview | undefined>;

  // Notifications
  createNotification(data: InsertNotification): Promise<Notification>;
  getNotificationByDedupeKey(
    recipientType: string,
    recipientId: string,
    dedupeKey: string,
  ): Promise<Notification | undefined>;
  createNotificationDeduped(data: InsertNotification): Promise<Notification>;
  listNotificationsForRecipient(
    recipientType: string,
    recipientId: string,
    limit?: number,
  ): Promise<Notification[]>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  getAllNotifications(): Promise<Notification[]>;

  // Profile views (Employer -> Intern)
  recordProfileView(data: InsertProfileView): Promise<ProfileView>;
  countProfileViewsForIntern(
    internId: string,
    since: Date,
    until: Date,
  ): Promise<number>;

  // Employer saved searches ("mark missing")
  createEmployerSavedSearch(data: InsertEmployerSavedSearch): Promise<EmployerSavedSearch>;
  listEmployerSavedSearches(employerId: string): Promise<EmployerSavedSearch[]>;
  listAllEmployerSavedSearches(): Promise<EmployerSavedSearch[]>;
  updateEmployerSavedSearchLastNotifiedAt(
    id: string,
    lastNotifiedAt: Date,
  ): Promise<EmployerSavedSearch | undefined>;

  // Employer cart (DB backed)
  listEmployerCartInternIds(
    employerId: string,
    projectId: string,
    listType: "cart" | "checkout",
  ): Promise<string[]>;
  setEmployerCartInternIds(
    employerId: string,
    projectId: string,
    listType: "cart" | "checkout",
    internIds: string[],
  ): Promise<string[]>;
  addEmployerCartItem(
    employerId: string,
    projectId: string,
    listType: "cart" | "checkout",
    internId: string,
  ): Promise<EmployerCartItem | undefined>;
  removeEmployerCartItem(
    employerId: string,
    projectId: string,
    listType: "cart" | "checkout",
    internId: string,
  ): Promise<boolean>;

  removeEmployerCartItemsByIntern(
    employerId: string,
    internId: string,
  ): Promise<number>;

  listEmployerCartItemsOlderThan(
    opts: {
      listType: "cart" | "checkout";
      olderThan: Date;
      limit?: number;
    },
  ): Promise<EmployerCartItem[]>;
}

export class PostgresStorage implements IStorage {

  async createPasswordResetToken(data: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [row] = await db.insert(passwordResetTokens).values(data).returning();
    return row;
  }

  async listAllInternPayments(
    opts?: { status?: string; currency?: string; limit?: number; q?: string; from?: Date; to?: Date },
  ): Promise<InternPayment[]> {
    const status = String(opts?.status ?? "").trim().toLowerCase();
    const currency = String(opts?.currency ?? "").trim().toUpperCase();
    const q = String(opts?.q ?? "").trim().toLowerCase();
    const from = opts?.from instanceof Date && Number.isFinite(opts.from.getTime()) ? opts.from : undefined;
    const to = opts?.to instanceof Date && Number.isFinite(opts.to.getTime()) ? opts.to : undefined;
    const limitRaw = Number(opts?.limit ?? 5000);
    const limit = Number.isFinite(limitRaw) ? Math.min(20000, Math.max(1, Math.floor(limitRaw))) : 5000;

    const conditions: any[] = [];
    if (status) conditions.push(eq(internPayments.status, status));
    if (currency) conditions.push(eq(internPayments.currency, currency));
    if (from) conditions.push(sql`${internPayments.createdAt} >= ${from}`);
    if (to) conditions.push(sql`${internPayments.createdAt} <= ${to}`);
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          sql`lower(${internPayments.orderId}) like ${pattern}`,
          sql`lower(coalesce(${internPayments.paymentId}, '')) like ${pattern}`,
          sql`lower(${internPayments.internId}) like ${pattern}`,
        ),
      );
    }

    const base = db.select().from(internPayments);
    const filtered = conditions.length ? base.where(and(...conditions)) : base;
    const rows = await filtered
      .orderBy(desc(internPayments.createdAt))
      .limit(limit);
    return rows;
  }

  async listAllInternPayouts(opts?: { status?: string; limit?: number }): Promise<InternPayout[]> {
    const limitRaw = Number(opts?.limit ?? 5000);
    const limit = Number.isFinite(limitRaw) ? Math.min(20000, Math.max(1, Math.floor(limitRaw))) : 5000;
    const status = String(opts?.status ?? "").trim().toLowerCase();

    const whereClause = status ? eq(internPayouts.status, status) : undefined;
    const q = db
      .select()
      .from(internPayouts)
      .orderBy(desc(internPayouts.createdAt))
      .limit(limit);

    const rows = whereClause ? await q.where(whereClause) : await q;
    return rows;
  }

  async listAllEmployerPayments(
    opts?: {
      status?: string;
      currency?: string;
      limit?: number;
      q?: string;
      from?: Date;
      to?: Date;
      paidFrom?: Date;
      paidTo?: Date;
    },
  ): Promise<EmployerPayment[]> {
    const status = String(opts?.status ?? "").trim().toLowerCase();
    const currency = String(opts?.currency ?? "").trim().toUpperCase();
    const q = String(opts?.q ?? "").trim().toLowerCase();
    const from = opts?.from instanceof Date && Number.isFinite(opts.from.getTime()) ? opts.from : undefined;
    const to = opts?.to instanceof Date && Number.isFinite(opts.to.getTime()) ? opts.to : undefined;
    const paidFrom =
      opts?.paidFrom instanceof Date && Number.isFinite(opts.paidFrom.getTime()) ? opts.paidFrom : undefined;
    const paidTo = opts?.paidTo instanceof Date && Number.isFinite(opts.paidTo.getTime()) ? opts.paidTo : undefined;
    const limitRaw = Number(opts?.limit ?? 5000);
    const limit = Number.isFinite(limitRaw) ? Math.min(20000, Math.max(1, Math.floor(limitRaw))) : 5000;

    const conditions: any[] = [];
    if (status) conditions.push(eq(employerPayments.status, status));
    if (currency) conditions.push(eq(employerPayments.currency, currency));
    if (from) conditions.push(sql`${employerPayments.createdAt} >= ${from}`);
    if (to) conditions.push(sql`${employerPayments.createdAt} <= ${to}`);
    if (paidFrom) conditions.push(sql`${employerPayments.paidAt} >= ${paidFrom}`);
    if (paidTo) conditions.push(sql`${employerPayments.paidAt} <= ${paidTo}`);
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          sql`lower(${employerPayments.orderId}) like ${pattern}`,
          sql`lower(coalesce(${employerPayments.paymentId}, '')) like ${pattern}`,
          sql`lower(${employerPayments.employerId}) like ${pattern}`,
        ),
      );
    }

    const base = db.select().from(employerPayments);
    const filtered = conditions.length ? base.where(and(...conditions)) : base;
    const rows = await filtered
      .orderBy(desc(employerPayments.createdAt))
      .limit(limit);
    return rows;
  }

  async createEmployerPayment(data: InsertEmployerPayment): Promise<EmployerPayment> {
    const next: any = {
      ...(data as any),
      raw: (data as any)?.raw ?? {},
      updatedAt: new Date(),
    };

    const [row] = await db.insert(employerPayments).values(next).returning();
    return row;
  }

  async getEmployerPaymentByOrderId(orderId: string): Promise<EmployerPayment | undefined> {
    const id = String(orderId ?? "").trim();
    if (!id) return undefined;

    const [row] = await db
      .select()
      .from(employerPayments)
      .where(eq(employerPayments.orderId, id))
      .orderBy(desc(employerPayments.createdAt))
      .limit(1);
    return row;
  }

  async updateEmployerPaymentByOrderId(
    orderId: string,
    data: Partial<InsertEmployerPayment>,
  ): Promise<EmployerPayment | undefined> {
    const id = String(orderId ?? "").trim();
    if (!id) return undefined;

    const next: any = {
      ...(data as any),
      updatedAt: new Date(),
    };

    const [row] = await db
      .update(employerPayments)
      .set(next)
      .where(eq(employerPayments.orderId, id))
      .returning();
    return row;
  }

  async listEmployerPaymentsByEmployerId(
    employerId: string,
    opts?: {
      status?: string;
      currency?: string;
      limit?: number;
      q?: string;
      from?: Date;
      to?: Date;
      paidFrom?: Date;
      paidTo?: Date;
    },
  ): Promise<EmployerPayment[]> {
    const id = String(employerId ?? "").trim();
    if (!id) return [];

    const status = String(opts?.status ?? "").trim().toLowerCase();
    const currency = String(opts?.currency ?? "").trim().toUpperCase();
    const q = String(opts?.q ?? "").trim().toLowerCase();
    const from = opts?.from instanceof Date && Number.isFinite(opts.from.getTime()) ? opts.from : undefined;
    const to = opts?.to instanceof Date && Number.isFinite(opts.to.getTime()) ? opts.to : undefined;
    const paidFrom =
      opts?.paidFrom instanceof Date && Number.isFinite(opts.paidFrom.getTime()) ? opts.paidFrom : undefined;
    const paidTo = opts?.paidTo instanceof Date && Number.isFinite(opts.paidTo.getTime()) ? opts.paidTo : undefined;
    const limitRaw = Number(opts?.limit ?? 50);
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, Math.floor(limitRaw))) : 50;

    const conditions: any[] = [eq(employerPayments.employerId, id)];
    if (status) conditions.push(eq(employerPayments.status, status));
    if (currency) conditions.push(eq(employerPayments.currency, currency));
    if (from) conditions.push(sql`${employerPayments.createdAt} >= ${from}`);
    if (to) conditions.push(sql`${employerPayments.createdAt} <= ${to}`);
    if (paidFrom) conditions.push(sql`${employerPayments.paidAt} >= ${paidFrom}`);
    if (paidTo) conditions.push(sql`${employerPayments.paidAt} <= ${paidTo}`);
    if (q) {
      const pattern = `%${q}%`;
      conditions.push(
        or(
          sql`lower(${employerPayments.orderId}) like ${pattern}`,
          sql`lower(coalesce(${employerPayments.paymentId}, '')) like ${pattern}`,
        ),
      );
    }

    const rows = await db
      .select()
      .from(employerPayments)
      .where(and(...conditions))
      .orderBy(desc(employerPayments.createdAt))
      .limit(limit);
    return rows;
  }

  async getPasswordResetTokenByHash(tokenHash: string): Promise<PasswordResetToken | undefined> {
    const [row] = await db
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    return row;
  }

  async markPasswordResetTokenUsed(
    id: string,
    usedAt: Date,
  ): Promise<PasswordResetToken | undefined> {
    const [row] = await db
      .update(passwordResetTokens)
      .set({ usedAt } as any)
      .where(eq(passwordResetTokens.id, id))
      .returning();
    return row;
  }

  async deletePasswordResetTokensForSubject(subjectType: string, subjectId: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.subjectType, subjectType), eq(passwordResetTokens.subjectId, subjectId)));
  }

  async createEmailOtp(data: InsertEmailOtp): Promise<EmailOtp> {
    const [row] = await db.insert(emailOtps).values(data).returning();
    return row;
  }

  async getLatestEmailOtpForSubject(subjectType: string, subjectId: string): Promise<EmailOtp | undefined> {
    const [row] = await db
      .select()
      .from(emailOtps)
      .where(and(eq(emailOtps.subjectType, subjectType), eq(emailOtps.subjectId, subjectId), isNull(emailOtps.usedAt)))
      .orderBy(desc(emailOtps.createdAt))
      .limit(1);
    return row;
  }

  async markEmailOtpUsed(id: string, usedAt: Date): Promise<EmailOtp | undefined> {
    const [row] = await db
      .update(emailOtps)
      .set({ usedAt })
      .where(eq(emailOtps.id, id))
      .returning();
    return row;
  }

  async deleteEmailOtpsForSubject(subjectType: string, subjectId: string): Promise<void> {
    await db
      .delete(emailOtps)
      .where(and(eq(emailOtps.subjectType, subjectType), eq(emailOtps.subjectId, subjectId)));
  }

  async getUser(id: string): Promise<User | undefined> {
    const normalized = String(id ?? "").trim();
    if (!normalized) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, normalized));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByPhoneNumber(phoneNumber: string): Promise<User | undefined> {
    const normalized = String(phoneNumber ?? "").trim();
    if (!normalized) return undefined;
    const [user] = await db.select().from(users).where(eq(users.phoneNumber, normalized));
    return user;
  }

  async getUserByCountryCodeAndPhoneNumber(
    countryCode: string,
    phoneNumber: string,
  ): Promise<User | undefined> {
    const code = String(countryCode ?? "").trim();
    const number = String(phoneNumber ?? "").trim();
    if (!code || !number) return undefined;
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.countryCode, code), eq(users.phoneNumber, number)));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async updateUser(id: string, data: Partial<typeof users.$inferInsert>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    // Cascade cleanup for intern/user data so orphaned records don't keep showing up in lists.
    // Delete child records first.
    await db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.subjectType, "intern"), eq(passwordResetTokens.subjectId, id)));
    await db
      .delete(emailOtps)
      .where(and(eq(emailOtps.subjectType, "intern"), eq(emailOtps.subjectId, id)));
    await db.delete(profileViews).where(eq(profileViews.internId, id));
    await db
      .delete(notifications)
      .where(and(eq(notifications.recipientType, "intern"), eq(notifications.recipientId, id)));
    await db.delete(proposals).where(eq(proposals.internId, id));
    await db.delete(interviews).where(eq(interviews.internId, id));
    await db.delete(internDocuments).where(eq(internDocuments.userId, id));
    await db.delete(internOnboarding).where(eq(internOnboarding.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }

  // Employers
  async getEmployer(id: string): Promise<Employer | undefined> {
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.id, id));
    return employer;
  }

  async getEmployerByEmail(email: string): Promise<Employer | undefined> {
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.companyEmail, email));
    return employer;
  }

  async getEmployerByPhoneNumber(phoneNumber: string): Promise<Employer | undefined> {
    const normalized = String(phoneNumber ?? "").trim();
    if (!normalized) return undefined;
    const [employer] = await db
      .select()
      .from(employers)
      .where(eq(employers.phoneNumber, normalized));
    return employer;
  }

  async getEmployerByCountryCodeAndPhoneNumber(
    countryCode: string,
    phoneNumber: string,
  ): Promise<Employer | undefined> {
    const code = String(countryCode ?? "").trim();
    const number = String(phoneNumber ?? "").trim();
    if (!code || !number) return undefined;
    const [employer] = await db
      .select()
      .from(employers)
      .where(and(eq(employers.countryCode, code), eq(employers.phoneNumber, number)));
    return employer;
  }

  async getEmployerByEscalationCountryCodeAndPhoneNumber(
    countryCode: string,
    phoneNumber: string,
  ): Promise<Employer | undefined> {
    const code = String(countryCode ?? "").trim();
    const digits = String(phoneNumber ?? "").trim().replace(/\D/g, "");
    if (!code || !digits) return undefined;
    const [employer] = await db
      .select()
      .from(employers)
      .where(and(eq(employers.escalationContactCountryCode, code), eq(employers.escalationContactPhone, digits)));
    return employer;
  }

  async createEmployer(insertEmployer: InsertEmployer): Promise<Employer> {
    const [employer] = await db
      .insert(employers)
      .values(insertEmployer)
      .returning();
    return employer;
  }

  async getEmployers(): Promise<Employer[]> {
    return db.select().from(employers);
  }

  async updateEmployer(
    id: string,
    data: Partial<typeof employers.$inferInsert>,
  ): Promise<Employer | undefined> {
    const [employer] = await db
      .update(employers)
      .set(data)
      .where(eq(employers.id, id))
      .returning();
    return employer;
  }

  async deleteEmployer(id: string): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(and(eq(passwordResetTokens.subjectType, "employer"), eq(passwordResetTokens.subjectId, id)));
    await db
      .delete(emailOtps)
      .where(and(eq(emailOtps.subjectType, "employer"), eq(emailOtps.subjectId, id)));
    await db.delete(employers).where(eq(employers.id, id));
  }

  // Employer Projects
  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject as any).returning();
    return project;
  }

  async getProjectsByEmployerId(employerId: string): Promise<Project[]> {
    const result = await db
      .select()
      .from(projects)
      .where(eq(projects.employerId, employerId))
      .orderBy(desc(projects.createdAt));
    return result;
  }

  async getAllProjects(): Promise<Project[]> {
    const result = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
    return result;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async updateProject(
    id: string,
    data: Partial<InsertProject>,
  ): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set({ ...(data as any), updatedAt: sql`now()` } as any)
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Admins
  async getAdminByEmail(email: string): Promise<Admin | undefined> {
    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.email, email));
    return admin;
  }

  async getAdmin(id: string): Promise<Admin | undefined> {
    const aid = String(id ?? "").trim();
    if (!aid) return undefined;
    const [admin] = await db.select().from(admins).where(eq(admins.id, aid)).limit(1);
    return admin;
  }

  async createAdmin(data: InsertAdmin): Promise<Admin> {
    const [admin] = await db.insert(admins).values(data as any).returning();
    return admin;
  }

  async deleteAdmin(id: string): Promise<void> {
    const aid = String(id ?? "").trim();
    if (!aid) return;
    await db.delete(admins).where(eq(admins.id, aid));
  }

  async listAdmins(): Promise<Admin[]> {
    return db.select().from(admins).orderBy(desc(admins.createdAt));
  }

  async updateAdmin(id: string, data: Partial<{ firstName: string; lastName: string; email: string }>): Promise<Admin | undefined> {
    const aid = String(id ?? "").trim();
    if (!aid) return undefined;
    const [admin] = await db
      .update(admins)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(admins.id, aid))
      .returning();
    return admin;
  }

  async updateAdminRoleKey(adminId: string, roleKey: string | null): Promise<Admin | undefined> {
    const [admin] = await db
      .update(admins)
      .set({ role: roleKey ?? null } as any)
      .where(eq(admins.id, adminId))
      .returning();
    return admin;
  }

  async updateAdminPassword(adminId: string, password: string): Promise<Admin | undefined> {
    const aid = String(adminId ?? "").trim();
    if (!aid) return undefined;
    const [admin] = await db
      .update(admins)
      .set({ password } as any)
      .where(eq(admins.id, aid))
      .returning();
    return admin;
  }

  // Admin roles (RBAC)
  async getAdminRoleByKey(key: string): Promise<AdminRole | undefined> {
    try {
      const [row] = await db.select().from(adminRoles).where(eq(adminRoles.key, key));
      return row;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") return undefined;
      throw e;
    }
  }

  async listAdminRoles(): Promise<AdminRole[]> {
    try {
      return db.select().from(adminRoles).orderBy(asc(adminRoles.name));
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") return [];
      throw e;
    }
  }

  async createAdminRole(data: InsertAdminRole): Promise<AdminRole> {
    const [row] = await db
      .insert(adminRoles)
      .values({
        ...(data as any),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateAdminRole(id: string, data: Partial<InsertAdminRole>): Promise<AdminRole | undefined> {
    const [row] = await db
      .update(adminRoles)
      .set({
        ...(data as any),
        updatedAt: new Date(),
      })
      .where(eq(adminRoles.id, id))
      .returning();
    return row;
  }

  async deleteAdminRole(id: string): Promise<void> {
    await db.delete(adminRoles).where(eq(adminRoles.id, id));
  }

  // Website CMS
  async listWebsiteSlider(): Promise<WebsiteSliderItem[]> {
    return db
      .select()
      .from(websiteSlider)
      .orderBy(asc(websiteSlider.sortOrder), desc(websiteSlider.createdAt));
  }

  async createWebsiteSliderItem(data: InsertWebsiteSliderItem): Promise<WebsiteSliderItem> {
    const [row] = await db
      .insert(websiteSlider)
      .values({
        ...(data as any),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateWebsiteSliderItem(
    id: string,
    data: Partial<InsertWebsiteSliderItem>,
  ): Promise<WebsiteSliderItem | undefined> {
    const [row] = await db
      .update(websiteSlider)
      .set({
        ...(data as any),
        updatedAt: new Date(),
      })
      .where(eq(websiteSlider.id, id))
      .returning();
    return row;
  }

  async deleteWebsiteSliderItem(id: string): Promise<void> {
    await db.delete(websiteSlider).where(eq(websiteSlider.id, id));
  }

  async listWebsiteBlogPosts(): Promise<WebsiteBlogPost[]> {
    return db
      .select()
      .from(websiteBlogPosts)
      .orderBy(desc(websiteBlogPosts.createdAt));
  }

  async createWebsiteBlogPost(data: InsertWebsiteBlogPost): Promise<WebsiteBlogPost> {
    const next: any = {
      ...(data as any),
      updatedAt: new Date(),
    };

    if (next.status === "published" && next.publishedAt == null) {
      next.publishedAt = new Date();
    }

    const [row] = await db.insert(websiteBlogPosts).values(next).returning();
    return row;
  }

  async updateWebsiteBlogPost(
    id: string,
    data: Partial<InsertWebsiteBlogPost>,
  ): Promise<WebsiteBlogPost | undefined> {
    const next: any = {
      ...(data as any),
      updatedAt: new Date(),
    };

    if (data.status !== undefined) {
      if (data.status === "published") {
        if (data.publishedAt === undefined) {
          next.publishedAt = new Date();
        }
      } else {
        next.publishedAt = null;
      }
    }

    const [row] = await db
      .update(websiteBlogPosts)
      .set(next)
      .where(eq(websiteBlogPosts.id, id))
      .returning();
    return row;
  }

  async deleteWebsiteBlogPost(id: string): Promise<void> {
    await db.delete(websiteBlogPosts).where(eq(websiteBlogPosts.id, id));
  }

  async listWebsiteFeaturedSkills(): Promise<WebsiteFeaturedSkill[]> {
    return db
      .select()
      .from(websiteFeaturedSkills)
      .orderBy(asc(websiteFeaturedSkills.sortOrder), desc(websiteFeaturedSkills.createdAt));
  }

  async createWebsiteFeaturedSkill(
    data: InsertWebsiteFeaturedSkill,
  ): Promise<WebsiteFeaturedSkill> {
    const [row] = await db
      .insert(websiteFeaturedSkills)
      .values({
        ...(data as any),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateWebsiteFeaturedSkill(
    id: string,
    data: Partial<InsertWebsiteFeaturedSkill>,
  ): Promise<WebsiteFeaturedSkill | undefined> {
    const [row] = await db
      .update(websiteFeaturedSkills)
      .set({
        ...(data as any),
        updatedAt: new Date(),
      })
      .where(eq(websiteFeaturedSkills.id, id))
      .returning();
    return row;
  }

  async deleteWebsiteFeaturedSkill(id: string): Promise<void> {
    await db.delete(websiteFeaturedSkills).where(eq(websiteFeaturedSkills.id, id));
  }

  async listWebsiteHappyFaces(): Promise<WebsiteHappyFace[]> {
    return db
      .select()
      .from(websiteHappyFaces)
      .orderBy(asc(websiteHappyFaces.sortOrder), desc(websiteHappyFaces.createdAt));
  }

  async createWebsiteHappyFace(data: InsertWebsiteHappyFace): Promise<WebsiteHappyFace> {
    const [row] = await db
      .insert(websiteHappyFaces)
      .values({
        ...(data as any),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateWebsiteHappyFace(
    id: string,
    data: Partial<InsertWebsiteHappyFace>,
  ): Promise<WebsiteHappyFace | undefined> {
    const [row] = await db
      .update(websiteHappyFaces)
      .set({
        ...(data as any),
        updatedAt: new Date(),
      })
      .where(eq(websiteHappyFaces.id, id))
      .returning();
    return row;
  }

  async deleteWebsiteHappyFace(id: string): Promise<void> {
    await db.delete(websiteHappyFaces).where(eq(websiteHappyFaces.id, id));
  }

  async listWebsitePartners(): Promise<WebsitePartner[]> {
    return db
      .select()
      .from(websitePartners)
      .orderBy(asc(websitePartners.sortOrder), desc(websitePartners.createdAt));
  }

  async createWebsitePartner(data: InsertWebsitePartner): Promise<WebsitePartner> {
    const [row] = await db
      .insert(websitePartners)
      .values({
        ...(data as any),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateWebsitePartner(
    id: string,
    data: Partial<InsertWebsitePartner>,
  ): Promise<WebsitePartner | undefined> {
    const [row] = await db
      .update(websitePartners)
      .set({
        ...(data as any),
        updatedAt: new Date(),
      })
      .where(eq(websitePartners.id, id))
      .returning();
    return row;
  }

  async deleteWebsitePartner(id: string): Promise<void> {
    await db.delete(websitePartners).where(eq(websitePartners.id, id));
  }

  async listWebsitePlans(): Promise<WebsitePlan[]> {
    return db
      .select()
      .from(websitePlans)
      .orderBy(asc(websitePlans.sortOrder), desc(websitePlans.createdAt));
  }

  async createWebsitePlan(data: InsertWebsitePlan): Promise<WebsitePlan> {
    const [row] = await db
      .insert(websitePlans)
      .values({
        ...(data as any),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateWebsitePlan(
    id: string,
    data: Partial<InsertWebsitePlan>,
  ): Promise<WebsitePlan | undefined> {
    const [row] = await db
      .update(websitePlans)
      .set({
        ...(data as any),
        updatedAt: new Date(),
      })
      .where(eq(websitePlans.id, id))
      .returning();
    return row;
  }

  async deleteWebsitePlan(id: string): Promise<void> {
    await db.delete(websitePlans).where(eq(websitePlans.id, id));
  }

  // Pricing plans
  async listPricingPlans(region?: string | null): Promise<PricingPlan[]> {
    if (region === undefined) {
      // Admin usage: list all plans across regions
      const rows = await db
        .select()
        .from(pricingPlans)
        .orderBy(asc(pricingPlans.sortOrder), desc(pricingPlans.createdAt));
      return rows;
    }

    const normalized = typeof region === "string" ? region.trim() : "";

    if (normalized) {
      // Prefer region-specific plans, but fall back to global ones
      const regionRows = await db
        .select()
        .from(pricingPlans)
        .where(and(eq(pricingPlans.region, normalized), eq(pricingPlans.isActive, true)))
        .orderBy(asc(pricingPlans.sortOrder), desc(pricingPlans.createdAt));
      if (regionRows && regionRows.length) return regionRows;
    }

    const globalRows = await db
      .select()
      .from(pricingPlans)
      .where(and(isNull(pricingPlans.region), eq(pricingPlans.isActive, true)))
      .orderBy(asc(pricingPlans.sortOrder), desc(pricingPlans.createdAt));
    return globalRows;
  }

  async createPricingPlan(data: InsertPricingPlan): Promise<PricingPlan> {
    const [row] = await db.insert(pricingPlans).values({ ...(data as any), updatedAt: new Date() }).returning();
    return row;
  }

  async updatePricingPlan(id: string, data: Partial<InsertPricingPlan>): Promise<PricingPlan | undefined> {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) return undefined;

    // First check existence (prevents false negatives when RETURNING is unsupported)
    const [existing] = await db.select().from(pricingPlans).where(eq(pricingPlans.id, normalizedId));
    if (!existing) return undefined;

    const [row] = await db
      .update(pricingPlans)
      .set({ ...(data as any), updatedAt: new Date() })
      .where(eq(pricingPlans.id, normalizedId))
      .returning();

    if (row) return row;

    // Fallback: read updated row
    const [fresh] = await db.select().from(pricingPlans).where(eq(pricingPlans.id, normalizedId));
    return fresh;
  }

  async deletePricingPlan(id: string): Promise<void> {
    await db.delete(pricingPlans).where(eq(pricingPlans.id, id));
  }

  async listWebsiteFaqs(): Promise<WebsiteFaq[]> {
    return db
      .select()
      .from(websiteFaqs)
      .orderBy(asc(websiteFaqs.sortOrder), desc(websiteFaqs.createdAt));
  }

  async createWebsiteFaq(data: InsertWebsiteFaq): Promise<WebsiteFaq> {
    const [row] = await db
      .insert(websiteFaqs)
      .values({
        ...(data as any),
        updatedAt: new Date(),
      })
      .returning();
    return row;
  }

  async updateWebsiteFaq(
    id: string,
    data: Partial<InsertWebsiteFaq>,
  ): Promise<WebsiteFaq | undefined> {
    const [row] = await db
      .update(websiteFaqs)
      .set({
        ...(data as any),
        updatedAt: new Date(),
      })
      .where(eq(websiteFaqs.id, id))
      .returning();
    return row;
  }

  async deleteWebsiteFaq(id: string): Promise<void> {
    await db.delete(websiteFaqs).where(eq(websiteFaqs.id, id));
  }

  async getWebsiteTerms(): Promise<WebsiteTerms | undefined> {
    const [row] = await db
      .select()
      .from(websiteTerms)
      .orderBy(desc(websiteTerms.updatedAt), desc(websiteTerms.createdAt))
      .limit(1);
    return row;
  }

  async setWebsiteTerms(
    data: Pick<InsertWebsiteTerms, "title" | "bodyHtml">,
  ): Promise<WebsiteTerms> {
    const existing = await this.getWebsiteTerms();

    if (existing) {
      const [row] = await db
        .update(websiteTerms)
        .set({ ...(data as any), updatedAt: new Date() })
        .where(eq(websiteTerms.id, existing.id))
        .returning();
      if (row) return row;

      const fresh = await this.getWebsiteTerms();
      if (fresh) return fresh;
    }

    const [created] = await db
      .insert(websiteTerms)
      .values({ ...(data as any), updatedAt: new Date() })
      .returning();
    return created;
  }

  async getInternTerms(): Promise<InternTerms | undefined> {
    const [row] = await db
      .select()
      .from(internTerms)
      .orderBy(desc(internTerms.updatedAt), desc(internTerms.createdAt))
      .limit(1);
    return row;
  }

  async setInternTerms(
    data: Pick<InsertInternTerms, "title" | "bodyHtml">,
  ): Promise<InternTerms> {
    const existing = await this.getInternTerms();

    if (existing) {
      const [row] = await db
        .update(internTerms)
        .set({ ...(data as any), updatedAt: new Date() })
        .where(eq(internTerms.id, existing.id))
        .returning();
      if (row) return row;

      const fresh = await this.getInternTerms();
      if (fresh) return fresh;
    }

    const [created] = await db
      .insert(internTerms)
      .values({ ...(data as any), updatedAt: new Date() })
      .returning();
    return created;
  }

  async listInternNonDisclosureClauses(): Promise<InternNonDisclosureClause[]> {
    return db
      .select()
      .from(internNonDisclosureClauses)
      .orderBy(asc(internNonDisclosureClauses.sortOrder), desc(internNonDisclosureClauses.createdAt));
  }

  async createInternNonDisclosureClause(
    data: InsertInternNonDisclosureClause,
  ): Promise<InternNonDisclosureClause> {
    const [row] = await db
      .insert(internNonDisclosureClauses)
      .values({ ...(data as any), updatedAt: new Date() })
      .returning();
    return row;
  }

  async updateInternNonDisclosureClause(
    id: string,
    data: Partial<InsertInternNonDisclosureClause>,
  ): Promise<InternNonDisclosureClause | undefined> {
    const [row] = await db
      .update(internNonDisclosureClauses)
      .set({ ...(data as any), updatedAt: new Date() })
      .where(eq(internNonDisclosureClauses.id, id))
      .returning();
    return row;
  }

  async deleteInternNonDisclosureClause(id: string): Promise<void> {
    await db.delete(internNonDisclosureClauses).where(eq(internNonDisclosureClauses.id, id));
  }

  async getEmployerTerms(): Promise<EmployerTerms | undefined> {
    const [row] = await db
      .select()
      .from(employerTerms)
      .orderBy(desc(employerTerms.updatedAt), desc(employerTerms.createdAt))
      .limit(1);
    return row;
  }

  async setEmployerTerms(
    data: Pick<InsertEmployerTerms, "title" | "bodyHtml">,
  ): Promise<EmployerTerms> {
    const existing = await this.getEmployerTerms();

    if (existing) {
      const [row] = await db
        .update(employerTerms)
        .set({ ...(data as any), updatedAt: new Date() })
        .where(eq(employerTerms.id, existing.id))
        .returning();
      if (row) return row;

      const fresh = await this.getEmployerTerms();
      if (fresh) return fresh;
    }

    const [created] = await db
      .insert(employerTerms)
      .values({ ...(data as any), updatedAt: new Date() })
      .returning();
    return created;
  }

  async createContactMessage(data: InsertContactMessage): Promise<ContactMessage> {
    const [message] = await db.insert(contactMessages).values(data).returning();
    return message;
  }

  async getContactMessage(id: string): Promise<ContactMessage | undefined> {
    const mid = String(id ?? "").trim();
    if (!mid) return undefined;
    const [row] = await db.select().from(contactMessages).where(eq(contactMessages.id, mid)).limit(1);
    return row;
  }

  async listContactMessages(limit?: number): Promise<ContactMessage[]> {
    const query = db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
    if (limit) {
      return await query.limit(limit);
    }
    return query;
  }

  async markContactMessageRead(id: string, isRead: boolean): Promise<ContactMessage | undefined> {
    const normalizedId = String(id || "").trim();
    if (!normalizedId) return undefined;

    const [row] = await db
      .update(contactMessages)
      .set({ isRead } as any)
      .where(eq(contactMessages.id, normalizedId))
      .returning();
    return row;
  }

  async deleteContactMessage(id: string): Promise<void> {
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
  }

  // Google OAuth Tokens (Employer Calendar / Meet)
  async getEmployerGoogleToken(
    employerId: string,
  ): Promise<EmployerGoogleToken | undefined> {
    const [row] = await db
      .select()
      .from(employerGoogleTokens)
      .where(eq(employerGoogleTokens.employerId, employerId));
    return row;
  }

  async upsertEmployerGoogleToken(
    employerId: string,
    data: Partial<EmployerGoogleToken>,
  ): Promise<EmployerGoogleToken> {
    const existing = await this.getEmployerGoogleToken(employerId);

    if (existing) {
      const [updated] = await db
        .update(employerGoogleTokens)
        .set({
          ...data,
          employerId,
          updatedAt: new Date(),
        } as any)
        .where(eq(employerGoogleTokens.employerId, employerId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(employerGoogleTokens)
      .values({
        ...(data as any),
        employerId,
        updatedAt: new Date(),
      })
      .returning();
    return created;
  }

  // Intern Onboarding
  async createInternOnboarding(data: InsertInternOnboarding): Promise<InternOnboarding> {
    // Prepare data for insert: pass native JS values for jsonb fields
    const sanitizedData: any = {
      ...data,
      experienceJson: data.experienceJson ?? [],
      skills: data.skills ?? [],
      extraData: data.extraData ?? {},
      locationTypes: Array.isArray(data.locationTypes) ? data.locationTypes : [],
      preferredLocations: Array.isArray(data.preferredLocations) ? data.preferredLocations : [],
      updatedAt: new Date(),
    };

    console.log("Prepared data for DB insert:", sanitizedData);

    const [onboarding] = await db
      .insert(internOnboarding)
      .values(sanitizedData as any)
      .returning();
    return onboarding;
  }

  async getInternOnboardingByUserId(userId: string): Promise<InternOnboarding | undefined> {
    const [onboarding] = await db
      .select()
      .from(internOnboarding)
      .where(eq(internOnboarding.userId, userId))
      .orderBy(desc(internOnboarding.createdAt))
      .limit(1);
    return onboarding;
  }

  async getAllInternOnboarding(): Promise<InternOnboarding[]> {
    const result = await db
      .select()
      .from(internOnboarding)
      .orderBy(desc(internOnboarding.createdAt));
    return result;
  }

  async getInternOnboardingByAadhaarNumber(aadhaarNumber: string): Promise<InternOnboarding | undefined> {
    const normalized = String(aadhaarNumber ?? "").replace(/\s+/g, "").trim().toUpperCase();
    if (!normalized) return undefined;
    const [row] = await db
      .select()
      .from(internOnboarding)
      .where(
        sql`upper(regexp_replace(coalesce(${internOnboarding.aadhaarNumber}, ''), '\\s+', '', 'g')) = ${normalized}`,
      )
      .orderBy(desc(internOnboarding.createdAt))
      .limit(1);
    return row;
  }

  async getInternOnboardingByPanNumber(panNumber: string): Promise<InternOnboarding | undefined> {
    const normalized = String(panNumber ?? "").replace(/\s+/g, "").trim().toUpperCase();
    if (!normalized) return undefined;
    const [row] = await db
      .select()
      .from(internOnboarding)
      .where(
        sql`upper(regexp_replace(coalesce(${internOnboarding.panNumber}, ''), '\\s+', '', 'g')) = ${normalized}`,
      )
      .orderBy(desc(internOnboarding.createdAt))
      .limit(1);
    return row;
  }

  async isInternEmergencyContactInUse(countryCode: string, phoneNumber: string, excludeUserId?: string): Promise<boolean> {
    const code = String(countryCode ?? "").trim();
    const digits = String(phoneNumber ?? "").trim().replace(/\D/g, "");
    if (!code || !digits) return false;

    const exclude = String(excludeUserId ?? "").trim();

    const rows = await db
      .select({ one: sql`1` })
      .from(internOnboarding)
      .where(
        sql`coalesce(${internOnboarding.extraData} ->> 'emergencyCountryCode', '') = ${code}
            and regexp_replace(coalesce(${internOnboarding.extraData} ->> 'emergencyPhone', ''), '\\D', '', 'g') = ${digits}
            and (${exclude} = '' or coalesce(${internOnboarding.userId}, '') <> ${exclude})`,
      )
      .limit(1);

    return rows.length > 0;
  }

  async isInternSecondPocContactInUse(countryCode: string, phoneNumber: string, excludeUserId?: string): Promise<boolean> {
    const code = String(countryCode ?? "").trim();
    const digits = String(phoneNumber ?? "").trim().replace(/\D/g, "");
    if (!code || !digits) return false;

    const exclude = String(excludeUserId ?? "").trim();

    const rows = await db
      .select({ one: sql`1` })
      .from(internOnboarding)
      .where(
        sql`coalesce(${internOnboarding.extraData} ->> 'secondPocCountryCode', '') = ${code}
            and regexp_replace(coalesce(${internOnboarding.extraData} ->> 'secondPocPhone', ''), '\\D', '', 'g') = ${digits}
            and (${exclude} = '' or coalesce(${internOnboarding.userId}, '') <> ${exclude})`,
      )
      .limit(1);

    return rows.length > 0;
  }

  async isEmployerEscalationContactInUse(countryCode: string, phoneNumber: string): Promise<boolean> {
    const code = String(countryCode ?? "").trim();
    const digits = String(phoneNumber ?? "").trim().replace(/\D/g, "");
    if (!code || !digits) return false;

    const rows = await db
      .select({ one: sql`1` })
      .from(employers)
      .where(and(eq(employers.escalationContactCountryCode, code), eq(employers.escalationContactPhone, digits)))
      .limit(1);

    return rows.length > 0;
  }

  async updateInternOnboarding(
    userId: string,
    data: Partial<InsertInternOnboarding>,
  ): Promise<InternOnboarding | undefined> {
    // Handle different column types:
    // - JSONB columns: must be JSON strings
    // - text[] array columns: must be native arrays or null
    const sanitizedData: any = { ...data };

    // JSONB columns - pass native JS values
    if (data.experienceJson !== undefined) {
      sanitizedData.experienceJson = data.experienceJson ?? [];
    }
    if (data.skills !== undefined) {
      sanitizedData.skills = data.skills ?? [];
    }
    if (data.extraData !== undefined) {
      sanitizedData.extraData = data.extraData ?? {};
    }

    // jsonb array columns - ensure arrays
    if (data.locationTypes !== undefined) {
      sanitizedData.locationTypes = Array.isArray(data.locationTypes) ? data.locationTypes : [];
    }
    if (data.preferredLocations !== undefined) {
      sanitizedData.preferredLocations = Array.isArray(data.preferredLocations) ? data.preferredLocations : [];
    }
    const [updated] = await db
      .update(internOnboarding)
      .set({ ...sanitizedData, updatedAt: new Date() })
      .where(eq(internOnboarding.userId, userId))
      .returning();
    return updated;
  }

  async listEmployerCartInternIds(
    employerId: string,
    projectId: string,
    listType: "cart" | "checkout",
  ): Promise<string[]> {
    try {
      const eid = String(employerId ?? "").trim();
      const pid = String(projectId ?? "").trim();
      const lt = String(listType ?? "").trim().toLowerCase();
      if (!eid || !pid || (lt !== "cart" && lt !== "checkout")) return [];

      const rows = await db
        .select({ internId: employerCartItems.internId, createdAt: employerCartItems.createdAt } as any)
        .from(employerCartItems)
        .where(
          and(
            eq(employerCartItems.employerId, eid),
            eq(employerCartItems.projectId, pid),
            eq(employerCartItems.listType, lt),
          ),
        )
        .orderBy(desc(employerCartItems.createdAt));

      return (rows ?? [])
        .map((r: any) => String(r?.internId ?? "").trim())
        .filter(Boolean);
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") return [];
      throw e;
    }
  }

  async listEmployerCartItemsOlderThan(opts: {
    listType: "cart" | "checkout";
    olderThan: Date;
    limit?: number;
  }): Promise<EmployerCartItem[]> {
    try {
      const lt = String(opts?.listType ?? "").trim().toLowerCase();
      const olderThan = opts?.olderThan;
      const limitRaw = Number(opts?.limit ?? 2000);
      const limit = Number.isFinite(limitRaw) ? Math.min(20000, Math.max(1, Math.floor(limitRaw))) : 2000;

      if (lt !== "cart" && lt !== "checkout") return [];
      if (!olderThan || !(olderThan instanceof Date) || !Number.isFinite(olderThan.getTime())) return [];

      const rows = await db
        .select()
        .from(employerCartItems)
        .where(and(eq(employerCartItems.listType, lt), sql`${employerCartItems.createdAt} < ${olderThan}`))
        .orderBy(desc(employerCartItems.createdAt))
        .limit(limit);
      return rows;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") return [];
      throw e;
    }
  }

  async setEmployerCartInternIds(
    employerId: string,
    projectId: string,
    listType: "cart" | "checkout",
    internIds: string[],
  ): Promise<string[]> {
    try {
      const eid = String(employerId ?? "").trim();
      const pid = String(projectId ?? "").trim();
      const lt = String(listType ?? "").trim().toLowerCase();
      if (!eid || !pid || (lt !== "cart" && lt !== "checkout")) return [];

      const normalized = Array.from(
        new Set(
          (Array.isArray(internIds) ? internIds : [])
            .map((v) => String(v ?? "").trim())
            .filter(Boolean),
        ),
      );

      await db
        .delete(employerCartItems)
        .where(
          and(
            eq(employerCartItems.employerId, eid),
            eq(employerCartItems.projectId, pid),
            eq(employerCartItems.listType, lt),
          ),
        );

      if (normalized.length === 0) return [];

      await db.insert(employerCartItems).values(
        normalized.map(
          (internId) =>
            ({
              employerId: eid,
              projectId: pid,
              internId,
              listType: lt,
              createdAt: new Date(),
            }) as InsertEmployerCartItem,
        ),
      );

      return normalized;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") return [];
      throw e;
    }
  }

  async addEmployerCartItem(
    employerId: string,
    projectId: string,
    listType: "cart" | "checkout",
    internId: string,
  ): Promise<EmployerCartItem | undefined> {
    try {
      const eid = String(employerId ?? "").trim();
      const pid = String(projectId ?? "").trim();
      const iid = String(internId ?? "").trim();
      const lt = String(listType ?? "").trim().toLowerCase();
      if (!eid || !pid || !iid || (lt !== "cart" && lt !== "checkout")) return undefined;

      const [created] = await db
        .insert(employerCartItems)
        .values({
          employerId: eid,
          projectId: pid,
          internId: iid,
          listType: lt,
          createdAt: new Date(),
        } as InsertEmployerCartItem)
        .onConflictDoNothing()
        .returning();

      if (created) return created;

      const [existing] = await db
        .select()
        .from(employerCartItems)
        .where(
          and(
            eq(employerCartItems.employerId, eid),
            eq(employerCartItems.projectId, pid),
            eq(employerCartItems.internId, iid),
            eq(employerCartItems.listType, lt),
          ),
        )
        .limit(1);
      return existing;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") return undefined;
      throw e;
    }
  }

  async removeEmployerCartItem(
    employerId: string,
    projectId: string,
    listType: "cart" | "checkout",
    internId: string,
  ): Promise<boolean> {
    try {
      const eid = String(employerId ?? "").trim();
      const pid = String(projectId ?? "").trim();
      const iid = String(internId ?? "").trim();
      const lt = String(listType ?? "").trim().toLowerCase();
      if (!eid || !pid || !iid || (lt !== "cart" && lt !== "checkout")) return false;

      const deleted = await db
        .delete(employerCartItems)
        .where(
          and(
            eq(employerCartItems.employerId, eid),
            eq(employerCartItems.projectId, pid),
            eq(employerCartItems.internId, iid),
            eq(employerCartItems.listType, lt),
          ),
        )
        .returning({ id: employerCartItems.id } as any);

      return Array.isArray(deleted) ? deleted.length > 0 : false;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") return false;
      throw e;
    }
  }

  async removeEmployerCartItemsByIntern(
    employerId: string,
    internId: string,
  ): Promise<number> {
    try {
      const eid = String(employerId ?? "").trim();
      const iid = String(internId ?? "").trim();
      if (!eid || !iid) return 0;

      const deleted = await db
        .delete(employerCartItems)
        .where(and(eq(employerCartItems.employerId, eid), eq(employerCartItems.internId, iid)))
        .returning({ id: employerCartItems.id } as any);

      return Array.isArray(deleted) ? deleted.length : 0;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") return 0;
      throw e;
    }
  }

  async createInternPayment(data: InsertInternPayment): Promise<InternPayment> {
    const next: any = {
      ...(data as any),
      raw: (data as any)?.raw ?? {},
      updatedAt: new Date(),
    };

    const [row] = await db.insert(internPayments).values(next).returning();
    return row;
  }

  async getInternPaymentByOrderId(orderId: string): Promise<InternPayment | undefined> {
    const id = String(orderId ?? "").trim();
    if (!id) return undefined;

    const [row] = await db
      .select()
      .from(internPayments)
      .where(eq(internPayments.orderId, id))
      .orderBy(desc(internPayments.createdAt))
      .limit(1);
    return row;
  }

  async updateInternPaymentByOrderId(
    orderId: string,
    data: Partial<InsertInternPayment>,
  ): Promise<InternPayment | undefined> {
    const id = String(orderId ?? "").trim();
    if (!id) return undefined;

    const next: any = {
      ...(data as any),
      updatedAt: new Date(),
    };

    const [row] = await db
      .update(internPayments)
      .set(next)
      .where(eq(internPayments.orderId, id))
      .returning();
    return row;
  }

  async createInternPayout(data: InsertInternPayout): Promise<InternPayout> {
    const next: any = {
      ...(data as any),
      raw: (data as any)?.raw ?? {},
      updatedAt: new Date(),
    };

    const [row] = await db.insert(internPayouts).values(next).returning();
    return row;
  }

  async getInternPayout(id: string): Promise<InternPayout | undefined> {
    const pid = String(id ?? "").trim();
    if (!pid) return undefined;
    const [row] = await db.select().from(internPayouts).where(eq(internPayouts.id, pid));
    return row;
  }

  async updateInternPayout(id: string, data: Partial<InsertInternPayout>): Promise<InternPayout | undefined> {
    const pid = String(id ?? "").trim();
    if (!pid) return undefined;

    const next: any = {
      ...(data as any),
      updatedAt: new Date(),
    };

    const [row] = await db
      .update(internPayouts)
      .set(next)
      .where(eq(internPayouts.id, pid))
      .returning();
    return row;
  }

  async listInternPayoutsByInternId(
    internId: string,
    opts?: { limit?: number },
  ): Promise<InternPayout[]> {
    const id = String(internId ?? "").trim();
    if (!id) return [];

    const limitRaw = Number(opts?.limit ?? 200);
    const limit = Number.isFinite(limitRaw) ? Math.min(1000, Math.max(1, Math.floor(limitRaw))) : 200;

    const rows = await db
      .select()
      .from(internPayouts)
      .where(eq(internPayouts.internId, id))
      .orderBy(desc(internPayouts.createdAt))
      .limit(limit);
    return rows;
  }

  async updateInterviewMeetingLink(
    id: string,
    meetingLink: string,
    notes?: string | null,
  ): Promise<Interview | undefined> {
    const [updated] = await db
      .update(interviews)
      .set({
        meetingLink,
        notes: notes ?? null,
        updatedAt: new Date(),
      } as any)
      .where(eq(interviews.id, id))
      .returning();
    return updated;
  }

  async updateInterviewNotes(id: string, notes: string | null): Promise<Interview | undefined> {
    const [updated] = await db
      .update(interviews)
      .set({
        notes: notes ?? null,
        updatedAt: new Date(),
      } as any)
      .where(eq(interviews.id, id))
      .returning();
    return updated;
  }

  // Interviews
  async createInterview(data: InsertInterview): Promise<Interview> {
    const [interview] = await db
      .insert(interviews)
      .values({
        ...data,
        updatedAt: new Date(),
      } as any)
      .returning();
    return interview;
  }

  async listInterviewsByStatus(statuses: string[]): Promise<Interview[]> {
    const normalized = Array.isArray(statuses)
      ? statuses.map((s) => String(s ?? "").trim()).filter(Boolean)
      : [];
    if (normalized.length === 0) return [];

    const rows = await db
      .select()
      .from(interviews)
      .where(inArray(interviews.status, normalized as any[]))
      .orderBy(desc(interviews.createdAt));
    return rows;
  }

  async getLatestInterviewForEmployerInternProject(
    employerId: string,
    internId: string,
    projectId?: string | null,
  ): Promise<Interview | undefined> {
    const conditions = [eq(interviews.employerId, employerId), eq(interviews.internId, internId)];
    if (projectId !== undefined) {
      if (projectId === null) {
        conditions.push(isNull(interviews.projectId));
      } else {
        conditions.push(eq(interviews.projectId, projectId));
      }
    }

    const [interview] = await db
      .select()
      .from(interviews)
      .where(and(...conditions))
      .orderBy(desc(interviews.createdAt))
      .limit(1);
    return interview;
  }

  async getInterviewsByInternId(internId: string): Promise<Interview[]> {
    const result = await db
      .select()
      .from(interviews)
      .where(eq(interviews.internId, internId))
      .orderBy(desc(interviews.createdAt));
    return result;
  }

  async getInterviewsByEmployerId(employerId: string): Promise<Interview[]> {
    const result = await db
      .select()
      .from(interviews)
      .where(eq(interviews.employerId, employerId))
      .orderBy(desc(interviews.createdAt));
    return result;
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    const [interview] = await db
      .select()
      .from(interviews)
      .where(eq(interviews.id, id));
    return interview;
  }

  async updateInterviewSelectedSlot(
    id: string,
    selectedSlot: number,
  ): Promise<Interview | undefined> {
    const [updated] = await db
      .update(interviews)
      .set({
        selectedSlot,
        status: "scheduled",
        updatedAt: new Date(),
      } as any)
      .where(eq(interviews.id, id))
      .returning();
    return updated;
  }

  async updateInterviewScheduleWithMeetingLink(
    id: string,
    selectedSlot: number,
    meetingLink: string | null,
    calendarEventId?: string | null,
  ): Promise<Interview | undefined> {
    const [updated] = await db
      .update(interviews)
      .set({
        selectedSlot,
        status: "scheduled",
        meetingLink,
        calendarEventId: calendarEventId ?? null,
        updatedAt: new Date(),
      } as any)
      .where(eq(interviews.id, id))
      .returning();
    return updated;
  }

  async resetInterviewToPending(id: string): Promise<Interview | undefined> {
    const [updated] = await db
      .update(interviews)
      .set({
        status: "pending",
        selectedSlot: null,
        updatedAt: new Date(),
      } as any)
      .where(eq(interviews.id, id))
      .returning();
    return updated;
  }

  async updateInterviewStatus(
    id: string,
    status: string,
  ): Promise<Interview | undefined> {
    const [updated] = await db
      .update(interviews)
      .set({ status, updatedAt: new Date() } as any)
      .where(eq(interviews.id, id))
      .returning();
    return updated;
  }

  // Notifications
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values({ ...(data as any) })
      .returning();
    return created;
  }

  async getNotificationByDedupeKey(
    recipientType: string,
    recipientId: string,
    dedupeKey: string,
  ): Promise<Notification | undefined> {
    const key = String(dedupeKey ?? "").trim();
    if (!key) return undefined;

    const [existing] = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.recipientType, recipientType),
          eq(notifications.recipientId, recipientId),
          eq(notifications.dedupeKey, key),
        ),
      )
      .orderBy(desc(notifications.createdAt))
      .limit(1);

    return existing;
  }

  async createNotificationDeduped(data: InsertNotification): Promise<Notification> {
    const dedupeKey = String((data as any)?.dedupeKey ?? "").trim();

    if (dedupeKey) {
      const existing = await this.getNotificationByDedupeKey(
        String((data as any).recipientType),
        String((data as any).recipientId),
        dedupeKey,
      );
      if (existing) return existing;
    }

    return this.createNotification(data);
  }

  async listNotificationsForRecipient(
    recipientType: string,
    recipientId: string,
    limit = 50,
  ): Promise<Notification[]> {
    try {
      const items = await db
        .select()
        .from(notifications)
        .where(and(eq(notifications.recipientType, recipientType), eq(notifications.recipientId, recipientId)))
        .orderBy(desc(notifications.createdAt))
        .limit(limit);
      return items;
    } catch (e: any) {
      const code = String(e?.code ?? "");
      if (code === "42P01") {
        return [];
      }
      throw e;
    }
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() } as any)
      .where(eq(notifications.id, id))
      .returning();
    return updated;
  }

  async markAllNotificationsReadForRecipient(
    recipientType: string,
    recipientId: string,
  ): Promise<number> {
    const updated = await db
      .update(notifications)
      .set({ isRead: true, readAt: new Date() } as any)
      .where(
        and(
          eq(notifications.recipientType, recipientType),
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false),
        ),
      )
      .returning({ id: notifications.id } as any);

    return Array.isArray(updated) ? updated.length : 0;
  }

  async getAllNotifications(): Promise<Notification[]> {
    return db
      .select()
      .from(notifications)
      .orderBy(desc(notifications.createdAt));
  }

  async recordProfileView(data: InsertProfileView): Promise<ProfileView> {
    const [created] = await db
      .insert(profileViews)
      .values({ ...(data as any) })
      .returning();
    return created;
  }

  async countProfileViewsForIntern(
    internId: string,
    since: Date,
    until: Date,
  ): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)` })
      .from(profileViews)
      .where(
        and(
          eq(profileViews.internId, internId),
          sql`${profileViews.createdAt} >= ${since}`,
          sql`${profileViews.createdAt} < ${until}`,
        ),
      );

    const count = (rows?.[0] as any)?.count;
    return typeof count === "number" ? count : Number(count ?? 0);
  }

  async createEmployerSavedSearch(
    data: InsertEmployerSavedSearch,
  ): Promise<EmployerSavedSearch> {
    const [created] = await db
      .insert(employerSavedSearches)
      .values({ ...(data as any) })
      .returning();
    return created;
  }

  async listEmployerSavedSearches(employerId: string): Promise<EmployerSavedSearch[]> {
    const rows = await db
      .select()
      .from(employerSavedSearches)
      .where(eq(employerSavedSearches.employerId, employerId))
      .orderBy(desc(employerSavedSearches.createdAt));
    return rows;
  }

  async listAllEmployerSavedSearches(): Promise<EmployerSavedSearch[]> {
    const rows = await db
      .select()
      .from(employerSavedSearches)
      .orderBy(desc(employerSavedSearches.createdAt));
    return rows;
  }

  async updateEmployerSavedSearchLastNotifiedAt(
    id: string,
    lastNotifiedAt: Date,
  ): Promise<EmployerSavedSearch | undefined> {
    const [updated] = await db
      .update(employerSavedSearches)
      .set({ lastNotifiedAt } as any)
      .where(eq(employerSavedSearches.id, id))
      .returning();
    return updated;
  }

  // Intern Documents
  async getInternDocumentsByUserId(userId: string): Promise<InternDocuments | undefined> {
    const [doc] = await db
      .select()
      .from(internDocuments)
      .where(eq(internDocuments.userId, userId))
      .orderBy(desc(internDocuments.createdAt))
      .limit(1);
    return doc;
  }

  async upsertInternDocumentsByUserId(
    userId: string,
    data: Partial<InsertInternDocuments>,
  ): Promise<InternDocuments> {
    const existing = await this.getInternDocumentsByUserId(userId);

    if (existing) {
      const [updated] = await db
        .update(internDocuments)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(internDocuments.userId, userId))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(internDocuments)
      .values({ ...(data as InsertInternDocuments), userId, updatedAt: new Date() })
      .returning();
    return created;
  }

  // Proposals
  async createProposal(data: InsertProposal): Promise<Proposal> {
    const [proposal] = await db
      .insert(proposals)
      .values({
        ...data,
        interviewId: data.interviewId, // Pass through optional interviewId
        // ensure jsonb defaults are always proper objects/arrays
        offerDetails: data.offerDetails ?? {},
        aiRatings: data.aiRatings ?? {},
        skills: Array.isArray(data.skills) ? data.skills : [],
        updatedAt: sql`now()`,
      } as any)
      .returning();
    return proposal;
  }

  async getAllProposals(): Promise<Proposal[]> {
    const rows = await db
      .select()
      .from(proposals)
      .orderBy(desc(proposals.createdAt));
    return rows;
  }

  async getProposalsByIds(ids: string[]): Promise<Proposal[]> {
    const list = Array.isArray(ids) ? ids.map((v) => String(v ?? "").trim()).filter(Boolean) : [];
    if (list.length === 0) return [];

    const rows = await db
      .select()
      .from(proposals)
      .where(inArray(proposals.id, list as any[]));
    return rows;
  }

  async getProposal(id: string): Promise<Proposal | undefined> {
    const [proposal] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, id));
    return proposal;
  }

  async getProposalsByEmployerId(employerId: string): Promise<Proposal[]> {
    const result = await db
      .select()
      .from(proposals)
      .where(eq(proposals.employerId, employerId))
      .orderBy(desc(proposals.createdAt));
    return result;
  }

  async getProposalsByInternId(internId: string): Promise<Proposal[]> {
    const result = await db
      .select()
      .from(proposals)
      .where(eq(proposals.internId, internId))
      .orderBy(desc(proposals.createdAt));
    return result;
  }

  async updateProposalStatus(
    id: string,
    status: string,
  ): Promise<Proposal | undefined> {
    const [updated] = await db
      .update(proposals)
      .set({ status, updatedAt: sql`now()` } as any)
      .where(eq(proposals.id, id))
      .returning();
    return updated;
  }

  async updateProposal(
    id: string,
    data: Partial<InsertProposal>,
  ): Promise<Proposal | undefined> {
    const sanitized: any = { ...data };

    if (data.offerDetails !== undefined) {
      sanitized.offerDetails = data.offerDetails ?? {};
    }
    if (data.aiRatings !== undefined) {
      sanitized.aiRatings = data.aiRatings ?? {};
    }
    if (data.skills !== undefined) {
      sanitized.skills = Array.isArray(data.skills) ? data.skills : [];
    }

    const [updated] = await db
      .update(proposals)
      .set({ ...sanitized, updatedAt: sql`now()` } as any)
      .where(eq(proposals.id, id))
      .returning();
    return updated;
  }

  // Timesheets
  async createTimesheet(data: InsertTimesheet): Promise<Timesheet> {
    const [row] = await db
      .insert(timesheets)
      .values({
        ...data,
        entries: (data as any)?.entries ?? [],
        updatedAt: sql`now()`,
      } as any)
      .returning();
    return row;
  }

  async getTimesheet(id: string): Promise<Timesheet | undefined> {
    const [row] = await db.select().from(timesheets).where(eq(timesheets.id, id));
    return row;
  }

  async getTimesheetsByInternId(internId: string, limit?: number): Promise<Timesheet[]> {
    const id = String(internId ?? "").trim();
    if (!id) return [];

    const limitRaw = Number(limit ?? 200);
    const safeLimit = Number.isFinite(limitRaw) ? Math.min(500, Math.max(1, Math.floor(limitRaw))) : 200;

    const rows = await db
      .select()
      .from(timesheets)
      .where(eq(timesheets.internId, id))
      .orderBy(desc(timesheets.periodStart))
      .limit(safeLimit);
    return rows;
  }

  async listTimesheetsByEmployerId(
    employerId: string,
    opts?: { status?: string; proposalId?: string; internId?: string; limit?: number },
  ): Promise<Timesheet[]> {
    const eid = String(employerId ?? "").trim();
    if (!eid) return [];

    const status = String(opts?.status ?? "").trim().toLowerCase();
    const proposalId = String(opts?.proposalId ?? "").trim();
    const internId = String(opts?.internId ?? "").trim();

    const limitRaw = Number(opts?.limit ?? 500);
    const limit = Number.isFinite(limitRaw) ? Math.min(5000, Math.max(1, Math.floor(limitRaw))) : 500;

    const conditions: any[] = [eq(timesheets.employerId, eid)];
    if (status) conditions.push(eq(timesheets.status, status));
    if (proposalId) conditions.push(eq(timesheets.proposalId, proposalId));
    if (internId) conditions.push(eq(timesheets.internId, internId));

    const rows = await db
      .select()
      .from(timesheets)
      .where(and(...conditions))
      .orderBy(desc(timesheets.periodStart))
      .limit(limit);
    return rows;
  }

  async updateTimesheet(id: string, data: Partial<InsertTimesheet>): Promise<Timesheet | undefined> {
    const tid = String(id ?? "").trim();
    if (!tid) return undefined;

    const sanitized: any = { ...data };
    if (data.entries !== undefined) {
      sanitized.entries = (data as any).entries ?? [];
    }

    const [row] = await db
      .update(timesheets)
      .set({ ...sanitized, updatedAt: sql`now()` } as any)
      .where(eq(timesheets.id, tid))
      .returning();
    return row;
  }

  async deleteTimesheet(id: string): Promise<boolean> {
    const tid = String(id ?? "").trim();
    if (!tid) return false;

    const rows = await db.delete(timesheets).where(eq(timesheets.id, tid)).returning({ id: timesheets.id } as any);
    return Array.isArray(rows) && rows.length > 0;
  }

  // Interviews
  async getAllInterviews(): Promise<Interview[]> {
    const rows = await db
      .select()
      .from(interviews)
      .orderBy(desc(interviews.createdAt));
    return rows;
  }
}

export const storage = new PostgresStorage();
