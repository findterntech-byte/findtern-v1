                                                                                                                  import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { 
  Search, 
  Mail, 
  User, 
  Phone, 
  Globe, 
  FileText, 
  Paperclip, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  Clock,
  MessageSquare,
  ShieldAlert,
  ExternalLink,
  ChevronRight,
  Inbox,
  Calendar,
  FilterX,
  Loader2,
  X
} from "lucide-react";
import { format } from "date-fns";

type ContactMessage = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  countryCode?: string | null;
  queryType?: string | null;
  subject: string | null;
  message: string;
  isRead: boolean;
  createdAt: string;
  userId?: string | null;
  userInfo?: UserInfo | null;
};

type UserInfo = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string | null;
  countryCode?: string | null;
  profilePhoto?: string | null;
} | {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  countryCode?: string;
};

const parseSupportMeta = (message: string) => {
  const rawLines = String(message ?? "").split("\n");
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);

  const metaMap: Record<string, string> = {};
  let bodyFromMeta: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = /^([^:]{1,40}):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].trim();
    const value = m[2].trim();
    metaMap[key] = value;
    if (key.toLowerCase() === "message") {
      const rest = lines.slice(i + 1);
      bodyFromMeta = [value, ...rest].filter(Boolean).join("\n");
      break;
    }
  }

  const kindRaw = metaMap.kind ?? metaMap.Kind ?? null;
  const userTypeRaw = metaMap.userType ?? metaMap.UserType ?? null;
  const video = metaMap.video ?? metaMap.Video ?? null;
  const attachmentsRaw = metaMap.attachments ?? metaMap.Attachments ?? null;
  const attachments = attachmentsRaw
    ? attachmentsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const kind = kindRaw && (kindRaw === "feedback" || kindRaw === "report" || kindRaw === "website") ? kindRaw : null;
  const validRoles = ["intern", "employer", "intern web app", "employer web app", "general", "hiring partner"];
  const role = userTypeRaw && validRoles.includes(userTypeRaw.toLowerCase()) ? userTypeRaw : null;

  const body = bodyFromMeta ?? String(message ?? "");
  return { kind, role, video, attachments, metaMap, body };
};

const extractUploadUrlsFromText = (text: string) => {
  const raw = String(text ?? "");
  const matches = raw.match(/(https?:\/\/[^\s]+|\/uploads\/[\w\-./%]+|uploads\/[\w\-./%]+)/gi) ?? [];
  const cleaned = matches
    .map((m) => m.trim().replace(/[),.\]]+$/g, ""))
    .map((m) => (m.startsWith("uploads/") ? `/${m}` : m))
    .filter((m) => m.includes("/uploads/"));
  return Array.from(new Set(cleaned));
};

const getUrlExt = (u: string) => {
  const clean = String(u ?? "").split("?")[0].split("#")[0];
  const last = clean.split("/").pop() ?? "";
  const parts = last.split(".");
  if (parts.length < 2) return "";
  return (parts.pop() ?? "").toLowerCase();
};

const isImageUrl = (u: string) => {
  const ext = getUrlExt(u);
  return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
};

const isVideoUrl = (u: string) => {
  const ext = getUrlExt(u);
  return ["mp4", "webm", "ogg", "mov", "m4v"].includes(ext);
};

const getFileLabelFromUrl = (u: string) => {
  const clean = String(u ?? "").split("?")[0].split("#")[0];
  const last = clean.split("/").pop() ?? "";
  return last || "Attachment";
};

const isUuidV4 = (value?: string | null) => {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value).trim());
};

export default function AdminContactMessagesPage() {
  const qc = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<ContactMessage | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState<string>("");
  const [queryTypeFilters, setQueryTypeFilters] = useState<string[]>([]);

  const toggleFilter = (value: string) => {
    setQueryTypeFilters(prev => 
      prev.includes(value) 
        ? prev.filter(f => f !== value)
        : [...prev, value]
    );
  };

  const { data, isLoading } = useQuery<{ items: ContactMessage[] }>({
    queryKey: ["/api/admin/contact/messages"],
  });

  const items = data?.items ?? [];

  const userIds = useMemo(() => {
    const ids = new Set<string>();
    items.forEach((m) => {
      const meta = parseSupportMeta(m.message);
      if (meta.metaMap.userId) ids.add(meta.metaMap.userId);
    });
    return Array.from(ids);
  }, [items]);

  const { data: allUsersData } = useQuery<{ users: UserInfo[] }>({
    queryKey: ["/api/admin/users"],
  });

  const { data: allEmployersData } = useQuery<{ employers: any[] }>({
    queryKey: ["/api/admin/employers"],
  });

  const usersMap = useMemo(() => {
    if (!allUsersData?.users) return {};
    const map: Record<string, UserInfo> = {};
    allUsersData.users.forEach((u) => {
      const uid = String((u as any).id ?? "").trim();
      if (uid && userIds.includes(uid)) {
        map[uid] = u;
      }
    });
    return map;
  }, [allUsersData, userIds]);

  const usersEmailMap = useMemo(() => {
    if (!allUsersData?.users) return {};
    const map: Record<string, UserInfo> = {};
    allUsersData.users.forEach((u) => {
      const e = String(u.email ?? "").trim().toLowerCase();
      if (e) map[e] = u;
    });
    return map;
  }, [allUsersData]);

const employersMap = useMemo(() => {
    if (!allEmployersData?.employers) return { map: {}, emailMap: {} };
    const map: Record<string, { firstName: string; lastName: string; email: string; phoneNumber?: string; countryCode?: string }> = {};
    const emailMap: Record<string, { firstName: string; lastName: string; email: string; phoneNumber?: string; countryCode?: string }> = {};
    allEmployersData.employers.forEach((e: any) => {
      if (userIds.includes(e.id)) {
        map[e.id] = {
          firstName: e.companyName || e.companyName || '',
          lastName: '',
          email: e.companyEmail || e.email || '',
          phoneNumber: e.phoneNumber || e.phone || '',
          countryCode: e.countryCode || '',
        };
      }
      const email = (e.companyEmail || e.email || '').toLowerCase();
      if (email) {
        emailMap[email] = {
          firstName: e.companyName || '',
          lastName: '',
          email: e.companyEmail || e.email || '',
          phoneNumber: e.phoneNumber || e.phone || '',
          countryCode: e.countryCode || '',
        };
      }
    });
    return { map, emailMap };
  }, [allEmployersData, userIds]);

  const enrichedItems = useMemo(() => {
    return items.map((m) => {
      const meta = parseSupportMeta(m.message);
      const derivedAttachments = extractUploadUrlsFromText(meta.body);
      const uploads = Array.from(
        new Set([
          ...(meta.video ? [meta.video] : []),
          ...(meta.attachments ?? []),
          ...derivedAttachments,
        ].filter(Boolean)),
      );

      const userId = meta.metaMap.userId || null;
      const role = meta.role;
      const isEmployer = role === 'employer' || role === 'employer web app';
      const isIntern = role === 'intern' || role === 'intern web app';
      const msgEmail = (m.email || '').toLowerCase();
      
      let userInfo = null;
      if (userId) {
        if (isEmployer && employersMap.map?.[userId]) {
          userInfo = employersMap.map[userId];
        } else if (isIntern && usersMap?.[userId]) {
          userInfo = usersMap[userId];
        } else if (usersMap?.[userId]) {
          userInfo = usersMap[userId];
        } else if (employersMap.map?.[userId]) {
          userInfo = employersMap.map[userId];
        }
      }

      if (!userInfo && msgEmail) {
        if (usersEmailMap[msgEmail]) {
          userInfo = usersEmailMap[msgEmail];
        } else if (employersMap.emailMap?.[msgEmail]) {
          userInfo = employersMap.emailMap[msgEmail];
        }
      }

      if (!userInfo && userId) {
        const fallbackUser = (allUsersData?.users ?? []).find((u) => String((u as any).id ?? "").trim() === String(userId).trim());
        if (fallbackUser) {
          userInfo = fallbackUser;
        }
      }

      if (!userInfo && isUuidV4(m.lastName)) {
        const uid = String(m.lastName).trim();
        const fallbackUser = (allUsersData?.users ?? []).find((u) => String((u as any).id ?? "").trim() === uid);
        if (fallbackUser) {
          userInfo = fallbackUser;
        } else if (usersMap?.[uid]) {
          userInfo = usersMap[uid];
        } else if (employersMap.map?.[uid]) {
          userInfo = employersMap.map[uid];
        }
      }

      if (!userInfo && m.email) {
        // fallback to query by first name/email from form entries in a user list
        const lowerEmail = String(m.email).trim().toLowerCase();
        if (usersEmailMap[lowerEmail]) {
          userInfo = usersEmailMap[lowerEmail];
        }
      }

      return {
        message: m,
        meta,
        uploads,
        userId,
        userInfo,
      };
    });
  }, [items]);

  const queryTypeOptions = useMemo(() => {
    const qtSet = new Set<string>();
    const roleSet = new Set<string>();
    const kindSet = new Set<string>();
    
    enrichedItems.forEach((x) => {
      const qt = String(x.message.queryType ?? "").trim();
      if (qt) {
        qtSet.add(qt);
      }
      if (x.meta.role) {
        roleSet.add(x.meta.role);
      }
      if (x.meta.kind) {
        kindSet.add(x.meta.kind);
      }
    });
    
    const qtOptions = Array.from(qtSet)
      .filter(q => !q.toLowerCase().includes("support") && !q.toLowerCase().includes("report"))
      .sort((a, b) => a.localeCompare(b));
    const roleOptions = Array.from(roleSet).sort((a, b) => a.localeCompare(b));
    const kindOptions = Array.from(kindSet).sort((a, b) => a.localeCompare(b));
    
    const hasInternFeedback = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      return qt.includes("intern") && (qt.includes("feedback") || qt.includes("report"));
    });
    const hasEmployerFeedback = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      return qt.includes("employer") && (qt.includes("feedback") || qt.includes("report"));
    });
    const hasInternFeedbackData = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      return qt.includes("intern") && qt.includes("feedback");
    });
    const hasInternReportData = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      return qt.includes("intern") && qt.includes("report");
    });
    const hasEmployerFeedbackData = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      return qt.includes("employer") && qt.includes("feedback");
    });
    const hasEmployerReportData = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      return qt.includes("employer") && qt.includes("report");
    });
    const hasHiringData = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      const firstName = (x.message.firstName ?? "").toLowerCase();
      return qt.includes("hiring") && firstName !== "employer";
    });
    const hasInternQuery = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      const firstName = (x.message.firstName ?? "").toLowerCase();
      return qt.includes("intern") && !qt.includes("feedback") && !qt.includes("report") && firstName !== "intern";
    });
    const hasEmployerQuery = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      const firstName = (x.message.firstName ?? "").toLowerCase();
      return qt.includes("employer") && !qt.includes("feedback") && !qt.includes("report") && firstName !== "employer";
    });
    const hasInternRole = roleOptions.some(r => r.toLowerCase().includes("intern"));
    const hasEmployerRole = roleOptions.some(r => r.toLowerCase().includes("employer"));
    const hasGeneralQuery = enrichedItems.some(x => {
      const qt = (x.message.queryType ?? "").toLowerCase();
      return !qt.includes("support") && !qt.includes("report") && !qt.includes("feedback") && !qt.includes("intern") && !qt.includes("employer") && !qt.includes("hiring") && qt.length > 0;
    });
    
    const allQt: string[] = [];
    const allRoles = [...roleOptions];
    
    if (hasInternFeedbackData) allQt.push("Intern Feedback");
    if (hasInternReportData) allQt.push("Intern Report");
    if (hasEmployerFeedbackData) allQt.push("Employer Feedback");
    if (hasEmployerReportData) allQt.push("Employer Report");
    if (hasHiringData) allQt.push("hiring");
    if (hasInternQuery) allQt.push("intern");
    if (hasEmployerQuery) allQt.push("employer");
    if (hasGeneralQuery) allQt.push("General");
    if (hasInternRole) allRoles.push("intern");
    if (hasEmployerRole) allRoles.push("employer");
    
    return { qt: Array.from(new Set(allQt)).sort((a, b) => a.localeCompare(b)), roles: Array.from(new Set(allRoles)).sort((a, b) => a.localeCompare(b)), kinds: kindOptions };
  }, [enrichedItems]);

  const checkFilterMatch = (item: typeof enrichedItems[0], filter: string): boolean => {
    const m = item.message;
    const msgQt = String(m.queryType ?? "").trim().toLowerCase();
    const msgRole = item.meta.role?.toLowerCase();
    const msgKind = item.meta.kind;
    const firstName = String(m.firstName ?? "").toLowerCase();
    
    if (filter.startsWith("qt:")) {
      const qtVal = filter.replace("qt:", "").toLowerCase();
      
      if (qtVal === "intern feedback") {
        return msgQt.includes("intern") && msgQt.includes("feedback");
      } else if (qtVal === "intern report") {
        return msgQt.includes("intern") && msgQt.includes("report");
      } else if (qtVal === "employer feedback") {
        return msgQt.includes("employer") && msgQt.includes("feedback");
      } else if (qtVal === "employer report") {
        return msgQt.includes("employer") && msgQt.includes("report");
      } else if (qtVal === "hiring") {
        return msgQt.includes("hiring") && firstName !== "employer";
      } else if (qtVal === "intern") {
        return !msgQt.includes("support") && !msgQt.includes("report") && msgQt.includes("intern") && firstName !== "intern";
      } else if (qtVal === "employer") {
        return !msgQt.includes("support") && !msgQt.includes("report") && msgQt.includes("employer") && firstName !== "employer";
      } else if (qtVal === "general") {
        return !msgQt.includes("support") && !msgQt.includes("report") && !msgQt.includes("feedback") && !msgQt.includes("intern") && !msgQt.includes("employer") && !msgQt.includes("hiring") && msgQt.length > 0;
      } else if (!msgQt.includes("support") && !msgQt.includes("report") && msgQt === qtVal) {
        return true;
      }
    } else if (filter.startsWith("role:")) {
      const roleVal = filter.replace("role:", "").toLowerCase();
      if (!msgQt.includes("support") && !msgQt.includes("report")) {
        if (roleVal === "intern") {
          return Boolean(msgRole && msgRole.includes("intern") && !msgRole.includes("partner"));
        } else if (roleVal === "employer") {
          return Boolean(msgRole && msgRole.includes("employer"));
        } else if (msgRole === roleVal) {
          return true;
        }
      }
    } else if (queryTypeOptions.kinds.includes(filter)) {
      return !msgQt.includes("support") && !msgQt.includes("report") && msgKind === filter;
    }
    
    return false;
  };

  const filteredItems = useMemo(() => {
    const q = String(search ?? "").trim().toLowerCase();

    return enrichedItems.filter((x) => {
      const m = x.message;
      const meta = x.meta;

      const subjectLower = String(m.subject ?? "").toLowerCase();
      if (subjectLower.includes("full-time offer") || subjectLower.includes("full time offer")) return false;

      if (queryTypeFilters.length > 0) {
        const matchesAny = queryTypeFilters.some(filter => checkFilterMatch(x, filter));
        if (!matchesAny) return false;
      }

      if (!q) return true;
      const hay = [
        `${m.firstName ?? ""} ${m.lastName ?? ""}`,
        m.email,
        m.phone ?? "",
        m.subject ?? "",
        meta.body ?? "",
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join("\n");

      return hay.includes(q);
    });
  }, [
    enrichedItems,
    search,
    queryTypeFilters,
  ]);

  const markReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: string; isRead: boolean }) => {
      const res = await apiRequest("PUT", `/api/admin/contact/messages/${id}/read`, { isRead });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/contact/messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/contact/messages/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/contact/messages"] });
    },
  });

  const bulkMarkReadMutation = useMutation({
    mutationFn: async ({ ids, isRead }: { ids: string[]; isRead: boolean }) => {
      await Promise.all(ids.map(id => apiRequest("PUT", `/api/admin/contact/messages/${id}/read`, { isRead })));
      return true;
    },
    onSuccess: async () => {
      setSelectedIds(new Set());
      await qc.invalidateQueries({ queryKey: ["/api/admin/contact/messages"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiRequest("DELETE", `/api/admin/contact/messages/${id}`)));
      return true;
    },
    onSuccess: async () => {
      setSelectedIds(new Set());
      await qc.invalidateQueries({ queryKey: ["/api/admin/contact/messages"] });
    },
  });

  const selectedMeta = useMemo(() => {
    if (!selected) return null;
    return parseSupportMeta(selected.message);
  }, [selected]);

  const attachmentsToPreview = useMemo(() => {
    const list: string[] = [];
    if (selectedMeta?.video) list.push(selectedMeta.video);
    if (selectedMeta?.attachments?.length) list.push(...selectedMeta.attachments);
    if (selectedMeta?.body) list.push(...extractUploadUrlsFromText(selectedMeta.body));
    return Array.from(new Set(list.filter(Boolean)));
  }, [selectedMeta]);

  const filteredAllItems = items.filter(m => {
    const subjectLower = String(m.subject ?? "").toLowerCase();
    return !subjectLower.includes("full-time offer") && !subjectLower.includes("full time offer");
  });
  const newCount = filteredAllItems.filter(m => !m.isRead).length;

  const renderFormattedBody = (text: string) => {
    const lines = text.split("\n");
    return (
      <div className="space-y-1.5">
        {lines.map((line, i) => {
          // Look for key: value pattern
          const match = line.match(/^([^:]+):\s*(.*)$/);
          if (match) {
            const key = match[1].trim();
            const value = match[2].trim();
            const isUrl = value.startsWith("http") || value.startsWith("/uploads");
            
            return (
              <div key={i} className="grid grid-cols-[140px,1fr] gap-3 py-1.5 border-b border-slate-100 last:border-0 items-start hover:bg-slate-50 transition-colors px-2 -mx-2 rounded-md">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{key}</span>
                <div className="text-sm font-bold text-slate-700 break-all leading-relaxed">
                  {isUrl ? (
                    <a 
                      href={value} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1.5 text-emerald-600 hover:text-emerald-700 hover:underline bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg shadow-sm"
                    >
                      <Paperclip className="h-3.5 w-3.5" />
                      {value.split('/').pop() || 'View File'}
                    </a>
                  ) : (
                    value
                  )}
                </div>
              </div>
            );
          }
          
          // Non key-value lines (header or general text)
          return line.trim() ? (
            <p key={i} className="text-sm font-bold text-slate-900 py-2 border-b border-slate-100 mb-2 first:mt-0">
              {line}
            </p>
          ) : null;
        })}
      </div>
    );
  };

  return (
    <AdminLayout title="Inbox" description="Manage and respond to messages from users.">
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 flex items-center gap-4 bg-emerald-50 border-emerald-100 shadow-sm">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-700">
              <Inbox className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">New Messages</p>
              <p className="text-2xl font-bold text-emerald-900">{newCount}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 bg-blue-50 border-blue-100 shadow-sm">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Total Inbox</p>
              <p className="text-2xl font-bold text-blue-900">{filteredAllItems.length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 bg-amber-50 border-amber-100 shadow-sm">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Reports</p>
              <p className="text-2xl font-bold text-amber-900">{filteredAllItems.filter(m => parseSupportMeta(m.message).kind === "report").length}</p>
            </div>
          </Card>
        </div>

        {/* Search Bar */}
        <Card className="p-4 border-slate-200 bg-white shadow-sm">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search name, email, subject, or message content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 h-12 text-base"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select onValueChange={(val) => { if (val === "all") setQueryTypeFilters([]); }}>
                <SelectTrigger className="w-[280px] bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 h-12">
                  <SelectValue placeholder="Filter by Query Type">
                    {queryTypeFilters.length === 0 ? "Query Type" : `${queryTypeFilters.length} filter(s) selected`}
                  </SelectValue>
                </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Query Types</SelectItem>
                {queryTypeOptions.qt.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase">Query Types</div>
                    {queryTypeOptions.qt.map((qt) => (
                      <div 
                        key={`qt:${qt}`}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 cursor-pointer"
                        onClick={() => toggleFilter(`qt:${qt}`)}
                      >
                        <input 
                          type="checkbox" 
                          checked={queryTypeFilters.includes(`qt:${qt}`)} 
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-sm">{qt}</span>
                      </div>
                    ))}
                  </>
                )}
                {queryTypeOptions.roles.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase">User Type</div>
                    {queryTypeOptions.roles.map((role) => (
                      <div 
                        key={`role:${role}`}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 cursor-pointer"
                        onClick={() => toggleFilter(`role:${role}`)}
                      >
                        <input 
                          type="checkbox" 
                          checked={queryTypeFilters.includes(`role:${role}`)} 
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-sm">{role}</span>
                      </div>
                    ))}
                  </>
                )}
                {queryTypeOptions.kinds.length > 0 && (
                  <>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase">Category</div>
                    {queryTypeOptions.kinds.map((kind) => (
                      <div 
                        key={kind}
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 cursor-pointer"
                        onClick={() => toggleFilter(kind)}
                      >
                        <input 
                          type="checkbox" 
                          checked={queryTypeFilters.includes(kind)} 
                          onChange={() => {}}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        <span className="text-sm">{kind}</span>
                      </div>
                    ))}
                  </>
                )}
              </SelectContent>
              </Select>
              {queryTypeFilters.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setQueryTypeFilters([])} className="h-12 px-3 text-slate-500 hover:text-red-600">
                  <X className="h-4 w-4 mr-1" />
                  Clear All
                </Button>
              )}
              {queryTypeFilters.map((filter) => (
                <Badge key={filter} variant="secondary" className="h-8 px-3 gap-1 bg-emerald-100 text-emerald-700 border-emerald-200">
                  {filter.replace('qt:', '').replace('role:', '')}
                  <button 
                    onClick={() => toggleFilter(filter)} 
                    className="ml-1 hover:text-red-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            </div>
        </Card>

        {/* Bulk Actions Bar */}
        {selectedIds.size > 0 && (
          <Card className="p-4 bg-emerald-50 border-emerald-200 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-600 text-white">{selectedIds.size} selected</Badge>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 bg-white border-emerald-200 hover:bg-emerald-100 text-emerald-700"
                    onClick={() => bulkMarkReadMutation.mutate({ ids: Array.from(selectedIds), isRead: true })}
                    disabled={bulkMarkReadMutation.isPending}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Mark as Read
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-8 bg-white border-rose-200 hover:bg-rose-50 text-rose-600"
                    onClick={() => {
                      if (window.confirm(`Delete ${selectedIds.size} messages?`)) {
                        bulkDeleteMutation.mutate(Array.from(selectedIds));
                      }
                    }}
                    disabled={bulkDeleteMutation.isPending}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-8 text-slate-500"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear Selection
              </Button>
            </div>
          </Card>
        )}

        {/* Messages Table */}
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                  <TableHead className="w-[50px]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(filteredItems.map(x => x.message.id)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead className="w-[100px] font-bold text-slate-700 uppercase tracking-wider text-[10px]">Status</TableHead>
                  <TableHead className="w-[180px] font-bold text-slate-700 uppercase tracking-wider text-[10px]">Sender</TableHead>
                  <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Subject & Message</TableHead>
                  <TableHead className="w-[120px] font-bold text-slate-700 uppercase tracking-wider text-[10px]">Details</TableHead>
                  <TableHead className="w-[100px] font-bold text-slate-700 uppercase tracking-wider text-[10px]">Date</TableHead>
                  <TableHead className="text-right font-bold text-slate-700 uppercase tracking-wider text-[10px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                        <p className="text-muted-foreground animate-pulse font-medium">Loading inbox...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FilterX className="h-10 w-10 opacity-20" />
                        <p className="font-medium">No messages match your criteria.</p>
                        <Button variant="ghost" className="text-emerald-600 h-auto p-0" onClick={() => setSearch("")}>Clear Search</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((x) => {
                    const m = x.message;
                    const meta = x.meta;
                    const uploads = x.uploads;
                    
                    return (
                      <TableRow 
                        key={m.id} 
                        className={`group transition-all ${selectedIds.has(m.id) ? 'bg-emerald-50/50' : !m.isRead ? 'bg-emerald-50/20 border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                            checked={selectedIds.has(m.id)}
                            onChange={() => {
                              const newSelected = new Set(selectedIds);
                              if (newSelected.has(m.id)) {
                                newSelected.delete(m.id);
                              } else {
                                newSelected.add(m.id);
                              }
                              setSelectedIds(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell onClick={() => { setSelected({ ...m, userInfo: x.userInfo }); setViewOpen(true); }}>
                          {!m.isRead ? (
                            <Badge className="bg-emerald-600 text-white border-transparent shadow-sm">New</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 bg-white">Read</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            {(() => {
                              const isGenericFirstName = ["Intern", "Employer"].includes(String(m.firstName ?? "").trim());
                              const uuidLikeLastName = isUuidV4(String(m.lastName ?? ""));
                              
                              let resolutionUserInfo = x.userInfo;
                              
                              // If we have placeholder firstname + UUID lastname, try hard to resolve
                              if (!resolutionUserInfo && isGenericFirstName && uuidLikeLastName) {
                                const uuid = String(m.lastName).trim();
                                // Try from direct user list at render time
                                const directUser = (allUsersData?.users ?? []).find((u) => String((u as any).id ?? "").trim() === uuid);
                                if (directUser) {
                                  resolutionUserInfo = directUser;
                                } else {
                                  // Try from employers
                                  const directEmployer = (allEmployersData?.employers ?? []).find((e: any) => String(e.id ?? "").trim() === uuid);
                                  if (directEmployer) {
                                    resolutionUserInfo = {
                                      firstName: String(directEmployer.companyName || directEmployer.name || "").trim(),
                                      lastName: "",
                                      email: String(directEmployer.companyEmail || directEmployer.email || "").trim(),
                                    } as any;
                                  }
                                }
                              }

                              const displayName = resolutionUserInfo
                                ? `${resolutionUserInfo.firstName} ${resolutionUserInfo.lastName || ""}`.trim()
                                : [String(m.firstName ?? "").trim(), !isUuidV4(String(m.lastName ?? "")) ? String(m.lastName ?? "").trim() : ""]
                                    .filter(Boolean)
                                    .join(" ")
                                    .trim() || "Unknown";
                              const displayEmail = resolutionUserInfo?.email || m.email || "—";
                              const showId = !resolutionUserInfo && x.userId;

                              return (
                                <>
                                  <span className="font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-emerald-700 transition-colors">
                                  {displayName}
                                  {meta.role === 'employer' && <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-100">Employer</Badge>}
                                  {meta.role === 'intern' && <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-100">Intern</Badge>}
                                </span>
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Mail className="h-3 w-3" />
                                  {displayEmail}
                                </span>
                                {showId && (
                                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                    ID: {x.userId}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 max-w-[450px]">
                            <span className="font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-900">{m.subject || "(No Subject)"}</span>
                            <p 
                              className="text-[11px] text-slate-500 line-clamp-1 italic opacity-80 group-hover:opacity-100"
                              title={String(meta.body ?? "").trim()}
                            >
                              {String(meta.body ?? "").trim() || "Empty message body"}
                            </p>
                            {uploads.length > 0 && (
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="secondary" 
                                  className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[9px] font-bold py-0 h-5 hover:bg-emerald-100 transition-colors shadow-sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelected(m);
                                    setViewOpen(true);
                                  }}
                                >
                                  <Paperclip className="h-3 w-3 mr-1" />
                                  {uploads.length} Attachments
                                </Badge>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {m.queryType && !m.queryType.toLowerCase().includes("hiring") && (
                              <Badge variant="outline" className="w-fit text-[9px] h-4 font-bold bg-indigo-50 text-indigo-700 border-indigo-100">
                                {m.queryType}
                              </Badge>
                            )}
                            {meta.role && (
                              <Badge variant="outline" className={`w-fit text-[9px] h-4 font-bold ${meta.role === 'employer' || meta.role === 'employer web app' ? 'bg-blue-50 text-blue-700 border-blue-100' : meta.role === 'hiring partner' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}`}>
                                {meta.role}
                              </Badge>
                            )}
                            {meta.kind && (
                              <Badge className={`w-fit text-[9px] h-4 font-bold ${meta.kind === 'report' ? 'bg-rose-100 text-rose-700 border-rose-200' : meta.kind === 'website' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                                {meta.kind}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-[10px] text-slate-500 font-bold">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3 text-slate-400" /> {format(new Date(m.createdAt), "MMM dd")}</span>
                            <span className="flex items-center gap-1 mt-0.5 opacity-60 font-medium"><Clock className="h-3 w-3" /> {format(new Date(m.createdAt), "HH:mm")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelected(m);
                                setViewOpen(true);
                              }}
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 transition-all ${!m.isRead ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-100'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                markReadMutation.mutate({ id: m.id, isRead: !m.isRead });
                              }}
                              disabled={markReadMutation.isPending}
                              title={m.isRead ? "Mark Unread" : "Mark Read"}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Are you sure you want to delete this message?")) {
                                  deleteMutation.mutate(m.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              title="Delete Message"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 font-medium italic text-center">
              Total {filteredAllItems.length} messages found • Showing {filteredItems.length} after filters
            </p>
          </div>
        </Card>
      </div>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 border-none shadow-2xl rounded-2xl overflow-hidden [&>div]:max-h-[90vh] [&>div]:flex [&>div]:flex-col">
          {selected && selectedMeta ? (
            <div className="flex flex-col bg-white max-h-[90vh]">
              <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100 shrink-0">
                <div className="flex items-center justify-between mb-4">
                  <Badge className={selected.isRead ? "bg-slate-200 text-slate-700" : "bg-emerald-600 text-white"}>
                    {selected.isRead ? "Archived" : "Unread Message"}
                  </Badge>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {format(new Date(selected.createdAt), "PPP p")}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-bold text-slate-900 leading-tight">
                  {selected.subject || "(No Subject)"}
                </DialogTitle>
                <DialogDescription className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-slate-500">
                  {(() => {
                    const isGenericFirstName = ["Intern", "Employer"].includes(String(selected.firstName ?? "").trim());
                    const uuidLikeLastName = isUuidV4(String(selected.lastName ?? ""));
                    
                    let modalUserInfo = selected.userInfo;
                    
                    // If placeholder pattern detected, try to resolve
                    if (!modalUserInfo && isGenericFirstName && uuidLikeLastName) {
                      const uuid = String(selected.lastName).trim();
                      const directUser = (allUsersData?.users ?? []).find((u) => String((u as any).id ?? "").trim() === uuid);
                      if (directUser) {
                        modalUserInfo = directUser;
                      } else {
                        const directEmployer = (allEmployersData?.employers ?? []).find((e: any) => String(e.id ?? "").trim() === uuid);
                        if (directEmployer) {
                          modalUserInfo = {
                            firstName: String(directEmployer.companyName || directEmployer.name || "").trim(),
                            lastName: "",
                            email: String(directEmployer.companyEmail || directEmployer.email || "").trim(),
                            phoneNumber: directEmployer.phoneNumber || directEmployer.phone,
                            countryCode: directEmployer.countryCode,
                          } as any;
                        }
                      }
                    }

                    const displayName = modalUserInfo
                      ? `${modalUserInfo.firstName} ${modalUserInfo.lastName || ""}`.trim()
                      : `${selected.firstName} ${selected.lastName}`.trim();
                    const displayEmail = modalUserInfo?.email || selected.email;
                    const displayPhone = modalUserInfo?.phoneNumber || selected.phone;
                    const displayCountry = modalUserInfo?.countryCode;

                    return (
                      <>
                        <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                          <User className="h-4 w-4 text-emerald-600" />
                          {displayName}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Mail className="h-4 w-4" />
                          {displayEmail}
                        </span>
                        {displayPhone && (
                          <span className="flex items-center gap-1.5">
                            <Phone className="h-4 w-4" />
                            {displayPhone}
                          </span>
                        )}
                        {displayCountry && (
                          <span className="flex items-center gap-1.5">
                            <Globe className="h-4 w-4" />
                            {displayCountry}
                          </span>
                        )}
                      </>
                    );
                  })()}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 min-h-0 p-6 overflow-y-auto">
                <div className="space-y-8">
                  {/* Context Badges */}
                  <div className="flex flex-wrap gap-2">
                    {selected.queryType && (
                      <Badge variant="outline" className="px-3 py-1 font-bold uppercase tracking-tighter bg-indigo-50 text-indigo-700 border-indigo-100">
                        {selected.queryType}
                      </Badge>
                    )}
                    {selectedMeta.role && (
                      <Badge variant="outline" className={`px-3 py-1 font-bold uppercase tracking-tighter ${
                        selectedMeta.role === 'employer' || selectedMeta.role === 'employer web app' 
                          ? 'bg-blue-50 text-blue-700 border-blue-100' 
                          : selectedMeta.role === 'hiring partner' 
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                      }`}>
                        {selectedMeta.role}
                      </Badge>
                    )}
                    {selectedMeta.kind && (
                      <Badge variant="outline" className={`px-3 py-1 font-bold uppercase tracking-tighter ${
                        selectedMeta.kind === 'report' 
                          ? 'bg-rose-50 text-rose-700 border-rose-100'
                          : selectedMeta.kind === 'website'
                            ? 'bg-cyan-50 text-cyan-700 border-cyan-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {selectedMeta.kind}
                      </Badge>
                    )}
                    {selected.countryCode && (
                      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 px-3 py-1 font-bold uppercase tracking-tighter">
                        <Globe className="h-3 w-3 mr-1.5" />
                        {selected.countryCode}
                      </Badge>
                    )}
                  </div>

                  {/* Message Body */}
                  <div className="bg-slate-50/50 rounded-2xl border border-slate-100 relative shadow-inner overflow-hidden">
                    <MessageSquare className="absolute -top-3 -left-3 h-8 w-8 text-emerald-100" />
                    <div className="p-6 overflow-y-auto max-h-[400px]">
                      {renderFormattedBody(String(selectedMeta.body ?? ""))}
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedMeta.metaMap.pageUrl && (
                      <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center justify-between group">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Page Origin</span>
                          <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{selectedMeta.metaMap.pageUrl}</span>
                        </div>
                        <a href={selectedMeta.metaMap.pageUrl} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    )}
                    {selectedMeta.metaMap.userId && (
                      <div className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm flex items-center gap-3">
                        <div className="p-2 bg-slate-50 rounded-lg text-slate-400">
                          <User className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">User ID</span>
                          <span className="text-xs font-mono font-bold text-slate-700">{selectedMeta.metaMap.userId}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Uploads Section */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-emerald-600" />
                      Attachments ({attachmentsToPreview.length})
                    </h4>
                    {attachmentsToPreview.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <p className="text-sm text-slate-400 italic">No files attached to this message.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        {attachmentsToPreview.map((u, idx) => {
                          const isVid = isVideoUrl(u);
                          const isImg = isImageUrl(u);
                          
                          return (
                            <div key={`${u}-${idx}`} className="group relative rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
                              {isImg ? (
                                <img src={u} alt="Attachment" className="w-full h-40 object-cover" />
                              ) : isVid ? (
                                <video src={u} className="w-full h-40 object-cover" />
                              ) : (
                                <div className="w-full h-40 bg-slate-50 flex items-center justify-center">
                                  <FileText className="h-12 w-12 text-slate-200" />
                                </div>
                              )}
                              <div className="p-3 bg-white border-t border-slate-50 flex items-center justify-between">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                                    {isImg ? 'Image File' : isVid ? 'Video File' : 'Document'}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-700 truncate max-w-[140px]">
                                    {getFileLabelFromUrl(u)}
                                  </span>
                                </div>
                                <div className="flex gap-1.5">
                                  <a href={u} target="_blank" rel="noreferrer" className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-colors">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0 mt-auto">
                <Button
                  variant="outline"
                  className="bg-white border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 font-bold text-xs"
                  onClick={() => {
                    if (window.confirm("Delete this message forever?")) {
                      deleteMutation.mutate(selected.id);
                      setViewOpen(false);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Permanently
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="bg-white border-slate-200 font-bold text-xs"
                    onClick={() => markReadMutation.mutate({ id: selected.id, isRead: !selected.isRead })}
                    disabled={markReadMutation.isPending}
                  >
                    {selected.isRead ? <Clock className="h-4 w-4 mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    {selected.isRead ? "Mark as New" : "Mark as Read"}
                  </Button>
                  <Button 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-100"
                    onClick={() => window.location.href = `mailto:${selected.email}?subject=Re: ${selected.subject || "Findtern Support"}`}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Reply via Email
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
