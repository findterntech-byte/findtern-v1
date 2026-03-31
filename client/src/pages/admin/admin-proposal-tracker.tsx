import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Eye, Filter, Calendar, Building2, GraduationCap, FolderKanban, Info, Link as LinkIcon, FileText, Clock, User, Briefcase, Activity, CheckCircle2, XCircle, AlertCircle, CalendarRange, X, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { format, isAfter, isBefore, startOfDay, endOfDay, subDays, startOfWeek, startOfMonth } from "date-fns";

type Proposal = {
  id: string;
  employerId: string;
  internId: string;
  projectId: string;
  status: string;
  currency: string;
  offerDetails: any;
  createdAt: string;
  updatedAt: string;
};

type Interview = {
  id: string;
  employerId: string;
  internId: string;
  projectId: string | null;
  status: string;
  slot1: string | null;
  slot2: string | null;
  slot3: string | null;
  selectedSlot: number | null;
  timezone: string | null;
  meetingLink: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

type Intern = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

type Employer = {
  id: string;
  companyName: string;
  companyEmail: string;
};

type Project = {
  id: string;
  projectName: string;
};

// Helper to strip HTML tags if needed, or we can use dangerouslySetInnerHTML
const isHTML = (str: string) => /<[a-z][\s\S]*>/i.test(str);

const formatKey = (key: string) => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
};

export default function AdminProposalTrackerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [interns, setInterns] = useState<Intern[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Filters
  const [activeTab, setActiveTab] = useState("interns");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [internFilter, setInternFilter] = useState("all");
  const [employerFilter, setEmployerFilter] = useState("all");

  // Date Filters
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [dateRangeOption, setDateRangeOption] = useState<string>("all");

  // Details Dialog
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [selectedInternActivity, setSelectedInternActivity] = useState<Intern | null>(null);
  const [selectedEmployerActivity, setSelectedEmployerActivity] = useState<Employer | null>(null);
  const [openProposalDetails, setOpenProposalDetails] = useState(false);
  const [openInterviewDetails, setOpenInterviewDetails] = useState(false);
  const [openInternDetails, setOpenInternDetails] = useState(false);
  const [openEmployerDetails, setOpenEmployerDetails] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const now = new Date();
    if (dateRangeOption === "today") {
      setStartDate(format(startOfDay(now), "yyyy-MM-dd"));
      setEndDate(format(endOfDay(now), "yyyy-MM-dd"));
    } else if (dateRangeOption === "yesterday") {
      const yesterday = subDays(now, 1);
      setStartDate(format(startOfDay(yesterday), "yyyy-MM-dd"));
      setEndDate(format(endOfDay(yesterday), "yyyy-MM-dd"));
    } else if (dateRangeOption === "thisWeek") {
      setStartDate(format(startOfWeek(now), "yyyy-MM-dd"));
      setEndDate(format(endOfDay(now), "yyyy-MM-dd"));
    } else if (dateRangeOption === "thisMonth") {
      setStartDate(format(startOfMonth(now), "yyyy-MM-dd"));
      setEndDate(format(endOfDay(now), "yyyy-MM-dd"));
    } else if (dateRangeOption === "all") {
      setStartDate("");
      setEndDate("");
    }
  }, [dateRangeOption]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiRequest("GET", "/api/admin/proposals-tracker");
      const json = await res.json();
      setProposals(json.proposals || []);
      setInterviews(json.interviews || []);
      setInterns(json.interns || []);
      setEmployers(json.employers || []);
      setProjects(json.projects || []);
    } catch (e: any) {
      setError(e.message || "Failed to load tracker data");
    } finally {
      setLoading(false);
    }
  };

  const internsById = useMemo(() => {
    const map = new Map<string, Intern>();
    interns.forEach((i) => map.set(i.id, i));
    return map;
  }, [interns]);

  const employersById = useMemo(() => {
    const map = new Map<string, Employer>();
    employers.forEach((e) => map.set(e.id, e));
    return map;
  }, [employers]);

  const projectsById = useMemo(() => {
    const map = new Map<string, Project>();
    projects.forEach((p) => map.set(p.id, p));
    return map;
  }, [projects]);

  const isWithinDateRange = (dateStr: string) => {
    if (!startDate && !endDate) return true;
    const date = new Date(dateStr);
    const start = startDate ? startOfDay(new Date(startDate)) : null;
    const end = endDate ? endOfDay(new Date(endDate)) : null;

    if (start && isBefore(date, start)) return false;
    if (end && isAfter(date, end)) return false;
    return true;
  };

  const filteredInterns = useMemo(() => {
    return interns.filter(i => {
      const searchStr = `${i.firstName} ${i.lastName} ${i.email}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });
  }, [interns, searchQuery]);

  const filteredEmployers = useMemo(() => {
    return employers.filter(e => {
      const searchStr = `${e.companyName} ${e.companyEmail}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });
  }, [employers, searchQuery]);

  const filteredProposals = useMemo(() => {
    return proposals.filter((p) => {
      const intern = internsById.get(p.internId);
      const employer = employersById.get(p.employerId);
      const project = projectsById.get(p.projectId);

      const searchStr = `${intern?.firstName} ${intern?.lastName} ${employer?.companyName} ${project?.projectName} ${p.status}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      const matchesIntern = internFilter === "all" || p.internId === internFilter;
      const matchesEmployer = employerFilter === "all" || p.employerId === employerFilter;
      const matchesDate = isWithinDateRange(p.createdAt);

      return matchesSearch && matchesStatus && matchesIntern && matchesEmployer && matchesDate;
    });
  }, [proposals, searchQuery, statusFilter, internFilter, employerFilter, startDate, endDate, internsById, employersById, projectsById]);

  const filteredInterviews = useMemo(() => {
    return interviews.filter((i) => {
      const intern = internsById.get(i.internId);
      const employer = employersById.get(i.employerId);
      const project = i.projectId ? projectsById.get(i.projectId) : null;

      const searchStr = `${intern?.firstName} ${intern?.lastName} ${employer?.companyName} ${project?.projectName || ""} ${i.status}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || i.status === statusFilter;
      const matchesIntern = internFilter === "all" || i.internId === internFilter;
      const matchesEmployer = employerFilter === "all" || i.employerId === employerFilter;
      const matchesDate = isWithinDateRange(i.createdAt);

      return matchesSearch && matchesStatus && matchesIntern && matchesEmployer && matchesDate;
    });
  }, [interviews, searchQuery, statusFilter, internFilter, employerFilter, startDate, endDate, internsById, employersById, projectsById]);

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case "accepted":
      case "hired":
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 flex items-center gap-1 w-fit"><CheckCircle2 className="h-3 w-3" />{status}</Badge>;
      case "scheduled":
        return <Badge className="bg-blue-100 text-blue-700 border-blue-200 flex items-center gap-1 w-fit"><Calendar className="h-3 w-3" />{status}</Badge>;
      case "sent":
        return <Badge className="bg-purple-100 text-purple-700 border-purple-200 flex items-center gap-1 w-fit"><Send className="h-3 w-3" />{status}</Badge>;
      case "rejected":
      case "expired":
      case "withdrawn":
        return <Badge className="bg-rose-100 text-rose-700 border-rose-200 flex items-center gap-1 w-fit"><XCircle className="h-3 w-3" />{status}</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200 flex items-center gap-1 w-fit"><Clock className="h-3 w-3" />{status}</Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1 w-fit"><AlertCircle className="h-3 w-3" />{status}</Badge>;
    }
  };

  const formatDate = (dateStr: string | null, short = false) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return format(date, short ? "MMM dd, HH:mm" : "MMM dd, yyyy HH:mm");
    } catch {
      return dateStr;
    }
  };

  const getHiredDisplayLabel = (activity: Proposal | Interview) => {
    if ((activity as Proposal).projectId) {
      const proj = projectsById.get((activity as Proposal).projectId);
      if (proj && (proj as any).fullTimeOffer) {
        return "Full-time Hired";
      }
    }
    return "Internship Hired";
  };

  const getActivityDisplayStatus = (activity: Proposal | Interview) => {
    if (activity.status === "hired") {
      return getHiredDisplayLabel(activity);
    }
    return activity.status;
  };

  const proposalStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    proposals.forEach(p => {
      counts[p.status] = (counts[p.status] || 0) + 1;
    });
    return counts;
  }, [proposals]);

  const interviewStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    interviews.forEach(i => {
      counts[i.status] = (counts[i.status] || 0) + 1;
    });
    return counts;
  }, [interviews]);

  if (loading) {
    return (
      <AdminLayout title="Proposal Tracker" description="Track all intern proposals and interviews.">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Activity className="h-8 w-8 text-emerald-600 animate-pulse" />
          <p className="text-muted-foreground animate-pulse font-medium">Loading advanced tracker data...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Advanced Tracker" description="Manage and monitor all intern proposals and interviews in one place.">
      <div className="space-y-6">
        {/* Premium Stats Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Proposals Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-700"></div>
            <Card className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30">
                    <FileText className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Proposals</h3>
                    <p className="text-xs text-slate-400">Application pipeline</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">{proposals.length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Sent</p>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg">
                      <Send className="h-4 w-4 text-cyan-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sent</span>
                  </div>
                  <p className="text-2xl font-bold text-white">{proposalStatusCounts["sent"] || 0}</p>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full" style={{ width: `${proposals.length > 0 ? ((proposalStatusCounts["sent"] || 0) / proposals.length * 100) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Accepted</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-400">{proposalStatusCounts["accepted"] || 0}</p>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full" style={{ width: `${proposals.length > 0 ? ((proposalStatusCounts["accepted"] || 0) / proposals.length * 100) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-teal-500/20 rounded-lg">
                      <Briefcase className="h-4 w-4 text-teal-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Hired</span>
                  </div>
                  <p className="text-2xl font-bold text-teal-400">{proposalStatusCounts["hired"] || 0}</p>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full" style={{ width: `${proposals.length > 0 ? ((proposalStatusCounts["hired"] || 0) / proposals.length * 100) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Clock className="h-4 w-4 text-amber-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expired</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-400">{proposalStatusCounts["expired"] || 0}</p>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${proposals.length > 0 ? ((proposalStatusCounts["expired"] || 0) / proposals.length * 100) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-rose-500/20 rounded-lg">
                      <XCircle className="h-4 w-4 text-rose-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Rejected</span>
                  </div>
                  <p className="text-2xl font-bold text-rose-400">{proposalStatusCounts["rejected"] || 0}</p>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full" style={{ width: `${proposals.length > 0 ? ((proposalStatusCounts["rejected"] || 0) / proposals.length * 100) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <X className="h-4 w-4 text-orange-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Withdrawn</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-400">{proposalStatusCounts["withdrawn"] || 0}</p>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" style={{ width: `${proposals.length > 0 ? ((proposalStatusCounts["withdrawn"] || 0) / proposals.length * 100) : 0}%` }}></div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Interviews Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-700"></div>
            <Card className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-0 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30">
                    <Calendar className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Interviews</h3>
                    <p className="text-xs text-slate-400">Interview sessions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">{interviews.length}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Total Sessions</p>
                </div>
              </div>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-purple-500/20 rounded-lg">
                      <Send className="h-4 w-4 text-purple-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sent</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-400">{interviewStatusCounts["sent"] || 0}</p>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full" style={{ width: `${interviews.length > 0 ? ((interviewStatusCounts["sent"] || 0) / interviews.length * 100) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Calendar className="h-4 w-4 text-blue-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Scheduled</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{interviewStatusCounts["scheduled"] || 0}</p>
                  <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full" style={{ width: `${interviews.length > 0 ? ((interviewStatusCounts["scheduled"] || 0) / interviews.length * 100) : 0}%` }}></div>
                  </div>
                </div>
                
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card col-span-2">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Completed</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold text-emerald-400">{interviewStatusCounts["completed"] || 0}</p>
                    <div className="flex-1 ml-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${interviews.length > 0 ? ((interviewStatusCounts["completed"] || 0) / interviews.length * 100) : 0}%` }}></div>
                    </div>
                  </div>
                </div>
                
             
        
                
                <div className="relative p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition-all duration-300 group/card">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-orange-500/20 rounded-lg">
                      <Clock className="h-4 w-4 text-orange-400" />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expired</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <p className="text-3xl font-bold text-orange-400">{interviewStatusCounts["expired"] || 0}</p>
                    <div className="flex-1 ml-4 h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500" style={{ width: `${interviews.length > 0 ? ((interviewStatusCounts["expired"] || 0) / interviews.length * 100) : 0}%` }}></div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
        {/* Global Filters */}
        <Card className="p-4 bg-slate-50/50 border-slate-200 shadow-sm">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search everything (Intern, Company, Project, Email)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white border-slate-200 focus-visible:ring-emerald-500"
                />
              </div>
              <div className="flex flex-wrap gap-4">
                <Select value={internFilter} onValueChange={setInternFilter}>
                  <SelectTrigger className="w-[180px] bg-white border-slate-200">
                    <SelectValue placeholder="All Interns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Interns</SelectItem>
                    {interns.map(i => (
                      <SelectItem key={i.id} value={i.id}>{i.firstName} {i.lastName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={employerFilter} onValueChange={setEmployerFilter}>
                  <SelectTrigger className="w-[180px] bg-white border-slate-200">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {employers.map(e => (
                      <SelectItem key={e.id} value={e.id}>{e.companyName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" className="bg-white border-slate-200 hover:bg-slate-50" onClick={loadData}>
                  <Activity className="h-4 w-4 mr-2 text-emerald-600" />
                  Refresh
                </Button>
              </div>
            </div>

            {/* Advanced Date Filter Bar */}
            <div className="flex flex-col md:flex-row items-center gap-4 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Date Range</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <Select value={dateRangeOption} onValueChange={setDateRangeOption}>
                  <SelectTrigger className="w-[140px] h-9 text-xs bg-white">
                    <SelectValue placeholder="Quick Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="thisWeek">This Week</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                <div className={`flex items-center gap-2 transition-all duration-300 ${dateRangeOption === "custom" ? "opacity-100 translate-x-0" : "opacity-50 pointer-events-none"}`}>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-9 text-xs w-[140px] bg-white"
                  />
                  <span className="text-xs text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-9 text-xs w-[140px] bg-white"
                  />
                </div>

                {(startDate || endDate) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-[10px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                    onClick={() => {
                      setDateRangeOption("all");
                      setStartDate("");
                      setEndDate("");
                    }}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear Date
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="interns" className="px-8 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Intern List
            </TabsTrigger>
            <TabsTrigger value="companies" className="px-8 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Company List
            </TabsTrigger>
            <TabsTrigger value="proposals" className="px-8 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Proposals
              <Badge variant="secondary" className="ml-2 bg-emerald-100 text-emerald-700">{filteredProposals.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="interviews" className="px-8 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Interviews
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700">{filteredInterviews.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interns" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInterns.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-muted-foreground">
                  No interns found matching your search.
                </div>
              ) : (
                filteredInterns.map(intern => {
                  const internProposals = proposals.filter(p => p.internId === intern.id && isWithinDateRange(p.createdAt));
                  const internInterviews = interviews.filter(i => i.internId === intern.id && isWithinDateRange(i.createdAt));
                  const lastActivity = [...internProposals, ...internInterviews].sort((a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                  )[0];

                  return (
                    <Card key={intern.id} className="p-5 hover:shadow-md transition-all border-slate-200 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setSelectedInternActivity(intern);
                          setOpenInternDetails(true);
                        }}>
                          <Eye className="h-4 w-4 text-emerald-600" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">
                          {intern.firstName[0]}{intern.lastName[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 leading-tight">{intern.firstName} {intern.lastName}</h3>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{intern.email}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Proposals</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">{internProposals.length}</span>
                            <FileText className="h-3 w-3 text-emerald-600" />
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Interviews</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">{internInterviews.length}</span>
                            <Calendar className="h-3 w-3 text-blue-600" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Latest Activity</p>
                        {lastActivity ? (
                          <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-md border border-slate-100">
                            <span className="text-xs font-medium truncate max-w-[120px]">
                              {getActivityDisplayStatus(lastActivity)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(lastActivity.updatedAt, true)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No activity yet</p>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="companies" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredEmployers.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-muted-foreground">
                  No companies found matching your search.
                </div>
              ) : (
                filteredEmployers.map(employer => {
                  const employerProposals = proposals.filter(p => p.employerId === employer.id && isWithinDateRange(p.createdAt));
                  const employerInterviews = interviews.filter(i => i.employerId === employer.id && isWithinDateRange(i.createdAt));
                  const lastActivity = [...employerProposals, ...employerInterviews].sort((a, b) =>
                    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
                  )[0];

                  return (
                    <Card key={employer.id} className="p-5 hover:shadow-md transition-all border-slate-200 group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setSelectedEmployerActivity(employer);
                          setOpenEmployerDetails(true);
                        }}>
                          <Eye className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
                          {employer.companyName[0]}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 leading-tight">{employer.companyName}</h3>
                          <p className="text-xs text-muted-foreground truncate max-w-[180px]">{employer.companyEmail}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Sent Proposals</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">{employerProposals.length}</span>
                            <FileText className="h-3 w-3 text-emerald-600" />
                          </div>
                        </div>
                        <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Schedules</p>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-900">{employerInterviews.length}</span>
                            <Calendar className="h-3 w-3 text-blue-600" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Latest Activity</p>
                        {lastActivity ? (
                          <div className="flex items-center justify-between bg-slate-50/50 p-2 rounded-md border border-slate-100">
                            <span className="text-xs font-medium truncate max-w-[120px]">
                              {getActivityDisplayStatus(lastActivity)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(lastActivity.updatedAt, true)}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No activity yet</p>
                        )}
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="proposals" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-slate-700">Recent Proposals</h3>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] h-8 text-xs bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status ({proposals.length})</SelectItem>
                    <SelectItem value="sent">Sent ({proposalStatusCounts["sent"] || 0})</SelectItem>
                    <SelectItem value="accepted">Accepted ({proposalStatusCounts["accepted"] || 0})</SelectItem>
                    <SelectItem value="rejected">Rejected ({proposalStatusCounts["rejected"] || 0})</SelectItem>
                    <SelectItem value="withdrawn">Withdrawn ({proposalStatusCounts["withdrawn"] || 0})</SelectItem>
                    <SelectItem value="hired">Hired ({proposalStatusCounts["hired"] || 0})</SelectItem>
                    <SelectItem value="expired">Expired ({proposalStatusCounts["expired"] || 0})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="w-[200px]">Intern</TableHead>
                    <TableHead>Employer / Project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No proposals found matching your filters.</TableCell>
                    </TableRow>
                  ) : (
                    filteredProposals.map((p) => {
                      const intern = internsById.get(p.internId);
                      const employer = employersById.get(p.employerId);
                      const project = projectsById.get(p.projectId);
                      return (
                        <TableRow key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{intern ? `${intern.firstName} ${intern.lastName}` : "Unknown"}</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{intern?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-blue-600" />
                                <span className="font-medium text-slate-800">{employer?.companyName || "Unknown"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <FolderKanban className="h-3 w-3 text-amber-600" />
                                <span>{project?.projectName || "Unknown"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(p.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{formatDate(p.createdAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="hover:bg-emerald-50 hover:text-emerald-700" onClick={() => {
                              setSelectedProposal(p);
                              setOpenProposalDetails(true);
                            }}>
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          <TabsContent value="interviews" className="space-y-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold text-slate-700">Interview Schedules</h3>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] h-8 text-xs bg-white">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status ({interviews.length})</SelectItem>
                    <SelectItem value="sent">Sent ({interviewStatusCounts["sent"] || 0})</SelectItem>
                    <SelectItem value="pending">Pending ({interviewStatusCounts["pending"] || 0})</SelectItem>
                    <SelectItem value="scheduled">Scheduled ({interviewStatusCounts["scheduled"] || 0})</SelectItem>
                    <SelectItem value="completed">Completed ({interviewStatusCounts["completed"] || 0})</SelectItem>
                    <SelectItem value="expired">Expired ({interviewStatusCounts["expired"] || 0})</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Card className="p-0 overflow-hidden border-slate-200 shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHead className="w-[200px]">Intern</TableHead>
                    <TableHead>Employer / Project</TableHead>
                    <TableHead>Slots & Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInterviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">No interviews found matching your filters.</TableCell>
                    </TableRow>
                  ) : (
                    filteredInterviews.map((i) => {
                      const intern = internsById.get(i.internId);
                      const employer = employersById.get(i.employerId);
                      const project = i.projectId ? projectsById.get(i.projectId) : null;
                      const selectedSlotTime = i.selectedSlot === 1 ? i.slot1 : i.selectedSlot === 2 ? i.slot2 : i.selectedSlot === 3 ? i.slot3 : null;

                      return (
                        <TableRow key={i.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{intern ? `${intern.firstName} ${intern.lastName}` : "Unknown"}</span>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{intern?.email}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-1">
                                <Building2 className="h-3 w-3 text-blue-600" />
                                <span className="font-medium text-slate-800">{employer?.companyName || "Unknown"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <FolderKanban className="h-3 w-3 text-amber-600" />
                                <span>{project?.projectName || "General Interview"}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1.5 py-1">
                              {i.selectedSlot ? (
                                <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-2 py-1 rounded-md border border-emerald-100 w-fit">
                                  <CheckCircle2 className="h-3 w-3" />
                                  <span className="text-[10px] font-bold uppercase tracking-tight">Confirmed: {formatDate(selectedSlotTime, true)}</span>
                                </div>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {[i.slot1, i.slot2, i.slot3].map((s, idx) => s && (
                                    <Badge key={idx} variant="outline" className="text-[9px] font-normal py-0 h-5 border-slate-200 bg-white">
                                      S{idx + 1}: {formatDate(s, true)}
                                    </Badge>
                                  ))}
                                  {!i.slot1 && !i.slot2 && !i.slot3 && <span className="text-[10px] text-muted-foreground italic">No slots provided yet</span>}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(i.status)}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="hover:bg-blue-50 hover:text-blue-700" onClick={() => {
                              setSelectedInterview(i);
                              setOpenInterviewDetails(true);
                            }}>
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Proposal Details Dialog */}
      <Dialog open={openProposalDetails} onOpenChange={setOpenProposalDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-600" />
              Proposal Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            {selectedProposal && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <User className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Intern</h4>
                        <p className="font-semibold text-slate-900 leading-none">
                          {internsById.get(selectedProposal.internId)?.firstName} {internsById.get(selectedProposal.internId)?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{internsById.get(selectedProposal.internId)?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-4 w-4 text-blue-700" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Employer</h4>
                        <p className="font-semibold text-slate-900 leading-none">{employersById.get(selectedProposal.employerId)?.companyName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{employersById.get(selectedProposal.employerId)?.companyEmail}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Briefcase className="h-4 w-4 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Project</h4>
                        <p className="font-semibold text-slate-900 leading-none">{projectsById.get(selectedProposal.projectId)?.projectName}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-200 rounded-lg">
                        <Info className="h-4 w-4 text-slate-700" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Status</h4>
                        <div className="mt-1">{getStatusBadge(selectedProposal.status)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    Offer Details
                  </h4>
                  <div className="bg-muted/30 rounded-xl overflow-hidden border">
                    {selectedProposal.offerDetails ? (
                      <div className="divide-y divide-muted/50">
                        {Object.entries(selectedProposal.offerDetails).map(([key, value]) => {
                          const formattedKey = formatKey(key);
                          const valStr = String(value);
                          const isValueHTML = isHTML(valStr);

                          return (
                            <div key={key} className="grid grid-cols-[160px,1fr] p-4 items-start gap-4">
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {formattedKey}
                              </span>
                              <div className="text-sm">
                                {isValueHTML ? (
                                  <div
                                    className="prose prose-sm max-w-none prose-emerald"
                                    dangerouslySetInnerHTML={{ __html: valStr }}
                                  />
                                ) : (
                                  <span className="font-medium">{valStr}</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground p-4 text-center italic">No extra offer details available.</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <p>Created: {formatDate(selectedProposal.createdAt)}</p>
                  <p>Last Updated: {formatDate(selectedProposal.updatedAt)}</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Interview Details Dialog */}
      <Dialog open={openInterviewDetails} onOpenChange={setOpenInterviewDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              Interview Details
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            {selectedInterview && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <User className="h-4 w-4 text-emerald-700" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Intern</h4>
                        <p className="font-semibold text-slate-900 leading-none">
                          {internsById.get(selectedInterview.internId)?.firstName} {internsById.get(selectedInterview.internId)?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{internsById.get(selectedInterview.internId)?.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Building2 className="h-4 w-4 text-blue-700" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Employer</h4>
                        <p className="font-semibold text-slate-900 leading-none">{employersById.get(selectedInterview.employerId)?.companyName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{employersById.get(selectedInterview.employerId)?.companyEmail}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-amber-100 rounded-lg">
                        <Briefcase className="h-4 w-4 text-amber-700" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Project</h4>
                        <p className="font-semibold text-slate-900 leading-none">{selectedInterview.projectId ? projectsById.get(selectedInterview.projectId)?.projectName : "General Interview"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-200 rounded-lg">
                        <Info className="h-4 w-4 text-slate-700" />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">Status</h4>
                        <div className="mt-1">{getStatusBadge(selectedInterview.status)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    Time Slots
                  </h4>
                  <div className="grid gap-3">
                    {[selectedInterview.slot1, selectedInterview.slot2, selectedInterview.slot3].map((slot, idx) => (
                      <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${selectedInterview.selectedSlot === idx + 1 ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-background border-slate-100'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${selectedInterview.selectedSlot === idx + 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Slot {idx + 1}</p>
                            <p className={`text-sm font-medium ${selectedInterview.selectedSlot === idx + 1 ? 'text-emerald-900' : 'text-slate-700'}`}>
                              {slot ? formatDate(slot) : `Not provided`}
                            </p>
                          </div>
                        </div>
                        {selectedInterview.selectedSlot === idx + 1 && (
                          <Badge className="bg-emerald-600 text-white border-transparent">Confirmed Slot</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {selectedInterview.meetingLink && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-emerald-600" />
                      Meeting Details
                    </h4>
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Join Link</span>
                        <a
                          href={selectedInterview.meetingLink.startsWith('http') ? selectedInterview.meetingLink : `https://${selectedInterview.meetingLink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-emerald-700 font-medium hover:underline break-all"
                        >
                          {selectedInterview.meetingLink}
                        </a>
                      </div>
                      <Button size="sm" variant="outline" className="bg-white" onClick={() => window.open(selectedInterview.meetingLink?.startsWith('http') ? selectedInterview.meetingLink : `https://${selectedInterview.meetingLink}`, '_blank')}>
                        Join Now
                      </Button>
                    </div>
                  </div>
                )}

                {selectedInterview.notes && (
                  <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Admin/Employer Notes
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap italic">
                      "{selectedInterview.notes}"
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                  <p>Created: {formatDate(selectedInterview.createdAt)}</p>
                  <p>Last Updated: {formatDate(selectedInterview.updatedAt)}</p>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Intern Details Dialog */}
      <Dialog open={openInternDetails} onOpenChange={setOpenInternDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-emerald-600" />
              Intern Activity History
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            {selectedInternActivity && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-2xl font-bold shadow-sm">
                    {selectedInternActivity.firstName[0]}{selectedInternActivity.lastName[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-none">{selectedInternActivity.firstName} {selectedInternActivity.lastName}</h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-1"><User className="h-4 w-4" /> {selectedInternActivity.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Proposals
                    </h3>
                    <div className="space-y-3">
                      {proposals.filter(p => p.internId === selectedInternActivity.id && isWithinDateRange(p.createdAt)).map(p => (
                        <div key={p.id} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 transition-colors shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800 text-sm">{employersById.get(p.employerId)?.companyName}</span>
                            {getStatusBadge(p.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {projectsById.get(p.projectId)?.projectName}
                          </p>
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                            <span className="text-[10px] text-muted-foreground">{formatDate(p.createdAt)}</span>
                            <Button variant="link" size="sm" className="h-auto p-0 text-emerald-600 text-[10px] font-bold" onClick={() => {
                              setSelectedProposal(p);
                              setOpenProposalDetails(true);
                            }}>View Details</Button>
                          </div>
                        </div>
                      ))}
                      {proposals.filter(p => p.internId === selectedInternActivity.id && isWithinDateRange(p.createdAt)).length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-4 bg-slate-50 rounded-lg">No proposals found.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Interviews
                    </h3>
                    <div className="space-y-3">
                      {interviews.filter(i => i.internId === selectedInternActivity.id && isWithinDateRange(i.createdAt)).map(i => (
                        <div key={i.id} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-200 transition-colors shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800 text-sm">{employersById.get(i.employerId)?.companyName}</span>
                            {getStatusBadge(i.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {i.projectId ? projectsById.get(i.projectId)?.projectName : "General Interview"}
                          </p>
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                            <span className="text-[10px] text-muted-foreground">{formatDate(i.createdAt)}</span>
                            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 text-[10px] font-bold" onClick={() => {
                              setSelectedInterview(i);
                              setOpenInterviewDetails(true);
                            }}>View Details</Button>
                          </div>
                        </div>
                      ))}
                      {interviews.filter(i => i.internId === selectedInternActivity.id && isWithinDateRange(i.createdAt)).length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-4 bg-slate-50 rounded-lg">No interviews found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Employer Details Dialog */}
      <Dialog open={openEmployerDetails} onOpenChange={setOpenEmployerDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              Company Activity History
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[75vh] pr-4">
            {selectedEmployerActivity && (
              <div className="space-y-6">
                <div className="flex items-center gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold shadow-sm">
                    {selectedEmployerActivity.companyName[0]}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-none">{selectedEmployerActivity.companyName}</h2>
                    <p className="text-slate-500 mt-2 flex items-center gap-1"><Building2 className="h-4 w-4" /> {selectedEmployerActivity.companyEmail}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1">
                      <FileText className="h-4 w-4 text-emerald-600" />
                      Sent Proposals
                    </h3>
                    <div className="space-y-3">
                      {proposals.filter(p => p.employerId === selectedEmployerActivity.id && isWithinDateRange(p.createdAt)).map(p => (
                        <div key={p.id} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 transition-colors shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800 text-sm">To: {internsById.get(p.internId)?.firstName} {internsById.get(p.internId)?.lastName}</span>
                            {getStatusBadge(p.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {projectsById.get(p.projectId)?.projectName}
                          </p>
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                            <span className="text-[10px] text-muted-foreground">{formatDate(p.createdAt)}</span>
                            <Button variant="link" size="sm" className="h-auto p-0 text-emerald-600 text-[10px] font-bold" onClick={() => {
                              setSelectedProposal(p);
                              setOpenProposalDetails(true);
                            }}>View Details</Button>
                          </div>
                        </div>
                      ))}
                      {proposals.filter(p => p.employerId === selectedEmployerActivity.id && isWithinDateRange(p.createdAt)).length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-4 bg-slate-50 rounded-lg">No proposals sent.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 px-1">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      Scheduled Interviews
                    </h3>
                    <div className="space-y-3">
                      {interviews.filter(i => i.employerId === selectedEmployerActivity.id && isWithinDateRange(i.createdAt)).map(i => (
                        <div key={i.id} className="p-4 rounded-xl border border-slate-100 bg-white hover:border-blue-200 transition-colors shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800 text-sm">With: {internsById.get(i.internId)?.firstName} {internsById.get(i.internId)?.lastName}</span>
                            {getStatusBadge(i.status)}
                          </div>
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                            <FolderKanban className="h-3 w-3" />
                            {i.projectId ? projectsById.get(i.projectId)?.projectName : "General Interview"}
                          </p>
                          <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50">
                            <span className="text-[10px] text-muted-foreground">{formatDate(i.createdAt)}</span>
                            <Button variant="link" size="sm" className="h-auto p-0 text-blue-600 text-[10px] font-bold" onClick={() => {
                              setSelectedInterview(i);
                              setOpenInterviewDetails(true);
                            }}>View Details</Button>
                          </div>
                        </div>
                      ))}
                      {interviews.filter(i => i.employerId === selectedEmployerActivity.id && isWithinDateRange(i.createdAt)).length === 0 && (
                        <p className="text-sm text-muted-foreground italic text-center py-4 bg-slate-50 rounded-lg">No interviews found.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
