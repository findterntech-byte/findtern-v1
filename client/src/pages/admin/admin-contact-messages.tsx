import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  RotateCcw, 
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
  FilterX
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

  const kind = kindRaw && (kindRaw === "feedback" || kindRaw === "report") ? kindRaw : null;
  const role = userTypeRaw && (userTypeRaw === "intern" || userTypeRaw === "employer") ? userTypeRaw : null;

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

export default function AdminContactMessagesPage() {
  const qc = useQueryClient();
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<ContactMessage | null>(null);

  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterQueryType, setFilterQueryType] = useState<string>("all");
  const [filterCountry, setFilterCountry] = useState<string>("all");
  const [filterHasUploads, setFilterHasUploads] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const { data, isLoading } = useQuery<{ items: ContactMessage[] }>({
    queryKey: ["/api/admin/contact/messages"],
  });

  const items = data?.items ?? [];

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

      return {
        message: m,
        meta,
        uploads,
      };
    });
  }, [items]);

  const queryTypeOptions = useMemo(() => {
    const set = new Set<string>();
    enrichedItems.forEach((x) => {
      const v = String(x.message.queryType ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enrichedItems]);

  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    enrichedItems.forEach((x) => {
      const v = String(x.message.countryCode ?? "").trim();
      if (v) set.add(v);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [enrichedItems]);

  const filteredItems = useMemo(() => {
    const q = String(search ?? "").trim().toLowerCase();

    return enrichedItems.filter((x) => {
      const m = x.message;
      const meta = x.meta;

      if (filterRole !== "all" && String(meta.role ?? "") !== filterRole) return false;
      if (filterKind !== "all" && String(meta.kind ?? "") !== filterKind) return false;
      if (filterStatus !== "all") {
        const isRead = Boolean(m.isRead);
        if (filterStatus === "new" && isRead) return false;
        if (filterStatus === "read" && !isRead) return false;
      }
      if (filterQueryType !== "all" && String(m.queryType ?? "") !== filterQueryType) return false;
      if (filterCountry !== "all" && String(m.countryCode ?? "") !== filterCountry) return false;
      if (filterHasUploads !== "all") {
        const has = x.uploads.length > 0;
        if (filterHasUploads === "yes" && !has) return false;
        if (filterHasUploads === "no" && has) return false;
      }

      if (!q) return true;
      const hay = [
        `${m.firstName ?? ""} ${m.lastName ?? ""}`,
        m.email,
        m.phone ?? "",
        m.subject ?? "",
        m.queryType ?? "",
        m.countryCode ?? "",
        meta.body ?? "",
      ]
        .map((v) => String(v ?? "").toLowerCase())
        .join("\n");

      return hay.includes(q);
    });
  }, [
    enrichedItems,
    filterCountry,
    filterHasUploads,
    filterKind,
    filterQueryType,
    filterRole,
    filterStatus,
    search,
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

  const newCount = items.filter(m => !m.isRead).length;

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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <p className="text-2xl font-bold text-blue-900">{items.length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 bg-amber-50 border-amber-100 shadow-sm">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-700">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Reports</p>
              <p className="text-2xl font-bold text-amber-900">{items.filter(m => parseSupportMeta(m.message).kind === "report").length}</p>
            </div>
          </Card>
          <Card className="p-4 flex items-center gap-4 bg-slate-50 border-slate-200 shadow-sm">
            <div className="p-3 bg-slate-200 rounded-xl text-slate-700">
              <Paperclip className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-800 uppercase tracking-wider">With Uploads</p>
              <p className="text-2xl font-bold text-slate-900">{enrichedItems.filter(x => x.uploads.length > 0).length}</p>
            </div>
          </Card>
        </div>

        {/* Advanced Filters */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm overflow-visible">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, subject, or message content..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500 h-11"
                />
              </div>
              <Button
                variant="outline"
                className="bg-white border-slate-200 hover:bg-slate-50 h-11 px-6"
                onClick={() => {
                  setFilterRole("all");
                  setFilterKind("all");
                  setFilterStatus("all");
                  setFilterQueryType("all");
                  setFilterCountry("all");
                  setFilterHasUploads("all");
                  setSearch("");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2 text-slate-500" />
                Reset Filters
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-xs font-medium">
                  <SelectValue placeholder="User Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="intern">Intern</SelectItem>
                  <SelectItem value="employer">Employer</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterKind} onValueChange={setFilterKind}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-xs font-medium">
                  <SelectValue placeholder="Kind" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Kinds</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="report">Report</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterQueryType} onValueChange={setFilterQueryType}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-xs font-medium">
                  <SelectValue placeholder="Query Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Query Types</SelectItem>
                  {queryTypeOptions.map((qt) => (
                    <SelectItem key={qt} value={qt}>{qt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              

              <Select value={filterHasUploads} onValueChange={setFilterHasUploads}>
                <SelectTrigger className="bg-slate-50 border-slate-200 h-10 text-xs font-medium">
                  <SelectValue placeholder="Attachments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Inbox</SelectItem>
                  <SelectItem value="yes">With Uploads</SelectItem>
                  <SelectItem value="no">No Uploads</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Messages Table */}
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
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
                    <TableCell colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="h-8 w-8 text-emerald-600 animate-pulse" />
                        <p className="text-muted-foreground animate-pulse font-medium">Loading inbox...</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <FilterX className="h-10 w-10 opacity-20" />
                        <p className="font-medium">No messages match your criteria.</p>
                        <Button variant="link" className="text-emerald-600 h-auto p-0" onClick={() => setSearch("")}>Clear Search</Button>
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
                        className={`group cursor-pointer hover:bg-slate-50/80 transition-all ${!m.isRead ? 'bg-emerald-50/20 border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                        onClick={() => {
                          setSelected(m);
                          setViewOpen(true);
                        }}
                      >
                        <TableCell>
                          {!m.isRead ? (
                            <Badge className="bg-emerald-600 text-white border-transparent shadow-sm">New</Badge>
                          ) : (
                            <Badge variant="outline" className="text-slate-400 border-slate-200 bg-white">Read</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 flex items-center gap-1.5 group-hover:text-emerald-700 transition-colors">
                              {m.firstName} {m.lastName}
                              {meta.role === 'employer' && <Badge variant="outline" className="text-[9px] h-4 bg-blue-50 text-blue-700 border-blue-100">Employer</Badge>}
                              {meta.role === 'intern' && <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-100">Intern</Badge>}
                            </span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Mail className="h-3 w-3" />
                              {m.email}
                            </span>
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
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                              <FileText className="h-3 w-3" />
                              {m.queryType || "Support"}
                            </div>
                            {meta.kind && (
                              <Badge className={`w-fit text-[9px] h-4 font-bold ${meta.kind === 'report' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
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
              Total {items.length} messages found • Showing {filteredItems.length} after filters
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
        <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          {selected && selectedMeta ? (
            <div className="flex flex-col h-full bg-white">
              <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
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
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700">
                    <User className="h-4 w-4 text-emerald-600" />
                    {selected.firstName} {selected.lastName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {selected.email}
                  </span>
                  {selected.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      {selected.phone}
                    </span>
                  )}
                </DialogDescription>
              </DialogHeader>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-8">
                  {/* Context Badges */}
                  <div className="flex flex-wrap gap-2">
                    {selectedMeta.role && (
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-1 font-bold uppercase tracking-tighter">
                        {selectedMeta.role}
                      </Badge>
                    )}
                    {selectedMeta.kind && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-100 px-3 py-1 font-bold uppercase tracking-tighter">
                        {selectedMeta.kind}
                      </Badge>
                    )}
                    {selected.queryType && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 font-bold uppercase tracking-tighter">
                        {selected.queryType}
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
                    <ScrollArea className="h-[350px] w-full p-6">
                      {renderFormattedBody(String(selectedMeta.body ?? ""))}
                    </ScrollArea>
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

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
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
