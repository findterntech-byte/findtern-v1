import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Search,
  Bell,
  User,
  Building2,
  GraduationCap,
  Calendar,
  Clock,
  FilterX,
  Loader2,
  Send,
  CheckCircle2,
  AlertCircle,
  History,
  Filter,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";

type NotificationRecord = {
  id: string;
  recipientId: string;
  recipientType: string;
  recipientName: string;
  recipientEmail?: string;
  recipientCompany?: string;
  title: string;
  message: string;
  type: string;
  status: string;
  sentAt: string;
  senderId?: string;
  senderName?: string;
  senderRole?: string;
  readAt?: string;
};

export default function NotificationHistoryPage() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterRecipientType, setFilterRecipientType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterSenderRole, setFilterSenderRole] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<{ items: NotificationRecord[]; total: number }>({
    queryKey: ["/api/admin/notifications/history"],
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const typeOptions = useMemo(() => {
    const types = new Set(items.map(i => i.type).filter(Boolean));
    return Array.from(types).sort();
  }, [items]);

  const senderRoleOptions = useMemo(() => {
    const roles = new Set(items.map(i => i.senderRole).filter(Boolean));
    return Array.from(roles).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    const q = String(search ?? "").trim().toLowerCase();
    return items.filter(item => {
      if (filterType !== "all" && item.type !== filterType) return false;
      if (filterRecipientType !== "all" && item.recipientType !== filterRecipientType) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterSenderRole !== "all" && item.senderRole !== filterSenderRole) return false;
      if (!q) return true;
      const hay = [
        item.recipientName,
        item.recipientEmail ?? "",
        item.recipientCompany ?? "",
        item.senderName ?? "",
        item.senderRole ?? "",
        item.title,
        item.message,
      ].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [items, search, filterType, filterRecipientType, filterStatus, filterSenderRole]);

  const stats = useMemo(() => ({
    total: filteredItems.length,
    sent: filteredItems.filter(i => i.status === "sent").length,
    delivered: filteredItems.filter(i => i.status === "delivered").length,
    failed: filteredItems.filter(i => i.status === "failed").length,
    byRole: senderRoleOptions.reduce((acc, role) => {
      acc[role] = filteredItems.filter(i => i.senderRole === role).length;
      return acc;
    }, {} as Record<string, number>),
  }), [filteredItems, senderRoleOptions]);

  const getRecipientIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case "intern": return <GraduationCap className="h-4 w-4 text-emerald-600" />;
      case "employer": return <Building2 className="h-4 w-4 text-blue-600" />;
      case "admin": return <User className="h-4 w-4 text-purple-600" />;
      default: return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "sent":
      case "delivered":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />{status}</Badge>;
      case "failed":
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" />{status}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      "email": "bg-blue-100 text-blue-700 border-blue-200",
      "push": "bg-purple-100 text-purple-700 border-purple-200",
      "sms": "bg-cyan-100 text-cyan-700 border-cyan-200",
      "in_app": "bg-amber-100 text-amber-700 border-amber-200",
    };
    return (
      <Badge className={colors[type?.toLowerCase()] ?? "bg-slate-100 text-slate-700 border-slate-200"}>
        {type?.toUpperCase() || "NOTIFICATION"}
      </Badge>
    );
  };

  return (
    <AdminLayout title="Notification History" description="View all sent notifications and their delivery status.">
      <div className="space-y-6">


        {/* Filters */}
        <Card className="p-5 border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recipient, title, message, sender..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-11 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Select value={filterSenderRole} onValueChange={setFilterSenderRole}>
                <SelectTrigger className="w-[160px] h-11 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Sender Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Senders</SelectItem>
                  {senderRoleOptions.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRecipientType} onValueChange={setFilterRecipientType}>
                <SelectTrigger className="w-[160px] h-11 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Recipient Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Recipients</SelectItem>
                  <SelectItem value="intern">Interns</SelectItem>
                  <SelectItem value="employer">Employers</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] h-11 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {typeOptions.map(type => (
                    <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px] h-11 bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                className="h-11 px-4"
                onClick={() => { setSearch(""); setFilterType("all"); setFilterRecipientType("all"); setFilterStatus("all"); setFilterSenderRole("all"); }}
              >
                <FilterX className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
        </Card>

        {/* Table */}
        <Card className="border-slate-200 bg-white shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-slate-50 to-slate-50/50">
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Sender</TableHead>
                <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Recipient</TableHead>
                <TableHead className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Title</TableHead>
                <TableHead className="w-[80px] font-bold text-slate-700 uppercase tracking-wider text-[10px]">Type</TableHead>
                <TableHead className="w-[140px] font-bold text-slate-700 uppercase tracking-wider text-[10px]">Sent At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                      <p className="text-muted-foreground animate-pulse font-medium">Loading notification history...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <History className="h-10 w-10 opacity-20" />
                      <p className="font-medium">No notifications found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <TableRow 
                      className={`group cursor-pointer transition-all hover:bg-slate-50/80 ${expandedId === item.id ? 'bg-emerald-50/30' : ''}`}
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                          {expandedId === item.id ? (
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-slate-400" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-purple-100 rounded-lg">
                              <User className="h-3 w-3 text-purple-600" />
                            </div>
                            <span className="text-xs font-bold text-slate-700">{item.senderName || "System"}</span>
                          </div>
                          {item.senderRole && (
                            <Badge className="w-fit mt-1 bg-purple-50 text-purple-700 border-purple-100 text-[9px] px-1.5">
                              {item.senderRole}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-slate-100 rounded-lg">
                            {getRecipientIcon(item.recipientType)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 text-sm">{item.recipientName}</p>
                            <p className="text-[10px] text-slate-500">{item.recipientEmail || item.recipientCompany || item.recipientType}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-slate-800 text-sm line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{item.message}</p>
                      </TableCell>
                      <TableCell>{getTypeBadge(item.type)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{format(new Date(item.sentAt), "MMM dd, yyyy")}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(item.sentAt), "HH:mm")}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedId === item.id && (
                      <TableRow className="bg-gradient-to-r from-emerald-50/50 to-transparent border-l-4 border-l-emerald-500">
                        <TableCell colSpan={6} className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recipient Details</h4>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-slate-400" />
                                    <span className="text-sm font-semibold">{item.recipientName}</span>
                                  </div>
                                  {item.recipientEmail && (
                                    <div className="flex items-center gap-2">
                                      <span className="h-4 w-4 flex items-center justify-center text-slate-400 text-xs">@</span>
                                      <span className="text-sm text-slate-600">{item.recipientEmail}</span>
                                    </div>
                                  )}
                                  {item.recipientCompany && (
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-slate-400" />
                                      <span className="text-sm text-slate-600">{item.recipientCompany}</span>
                                    </div>
                                  )}
                                  <Badge variant="outline" className="mt-2">{item.recipientType}</Badge>
                                </div>
                              </div>
                              
                            </div>
                            <div className="space-y-4">
                              <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Notification Content</h4>
                                <div className="mb-3">
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Title</p>
                                  <p className="font-bold text-slate-900">{item.title}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Message</p>
                                  <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg">{item.message}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>
          <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">
              Showing {filteredItems.length} of {total} notifications
            </p>
            <div className="flex items-center gap-2">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="w-[80px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <span className="px-3 text-xs font-medium">Page {page} / {pageCount}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                  disabled={page >= pageCount}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
