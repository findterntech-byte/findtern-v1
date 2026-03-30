import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { apiRequest } from "@/lib/queryClient";
import {
  ChevronDown, ChevronRight, Folder, Search, Plus, Briefcase, MapPin, Clock, Users, Loader2,
  ArrowLeft, ArrowRight, Building2, X, AlertCircle, TrendingUp, CheckCircle2
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  employerId: string;
  employerCompanyName?: string | null;
  projectName: string;
  skills: string[];
  location: string;
  city: string;
  state: string;
  preferredLocations: string[];
  scopeOfWork: string;
  locationType: string;
  pincode: string;
  timezone: string;
  fullTimeOffer: boolean;
  status: string;
  createdAt: string;
};

type EmployerOption = {
  id: string;
  label: string;
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "muted";
}

function StatCard({ title, value, subtitle, icon, className, variant = "default" }: StatCardProps) {
  const variants = {
    default: "bg-gradient-to-br from-slate-50 to-white border-slate-200",
    success: "bg-gradient-to-br from-emerald-50 to-emerald-100/30 border-emerald-200",
    warning: "bg-gradient-to-br from-amber-50 to-amber-100/30 border-amber-200",
    muted: "bg-gradient-to-br from-slate-100/50 to-slate-50 border-slate-200/50",
  };

  const iconVariants = {
    default: "bg-slate-100 text-slate-600",
    success: "bg-emerald-100 text-emerald-600",
    warning: "bg-amber-100 text-amber-600",
    muted: "bg-slate-200 text-slate-500",
  };

  return (
    <Card className={cn("p-5 relative overflow-hidden border", variants[variant], className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("p-3 rounded-xl", iconVariants[variant])}>
          {icon}
        </div>
      </div>
    </Card>
  );
}

function EmptyState({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === "active") {
    return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-medium">Active</Badge>;
  }
  if (s === "inactive") {
    return <Badge className="bg-red-100 text-red-700 border-red-200 font-medium">Inactive</Badge>;
  }
  if (s === "draft") {
    return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-medium">Draft</Badge>;
  }
  return <Badge variant="outline" className="font-medium">{status}</Badge>;
}

function EmptyProjectCard({ companyName }: { companyName: string }) {
  return (
    <Card className="border border-dashed border-muted-foreground/20">
      <div className="flex flex-col items-center justify-center py-8 px-4">
        <Folder className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No projects for {companyName}</p>
      </div>
    </Card>
  );
}

export default function AdminProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openCompanies, setOpenCompanies] = useState<Record<string, boolean>>({});
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null);

  const formatProjectLocation = (p: any) => {
    const city = String(p?.city ?? "").trim();
    const state = String(p?.state ?? "").trim();
    const pincode = String(p?.pincode ?? "").trim();
    const preferred = Array.isArray(p?.preferredLocations)
      ? p.preferredLocations.map((x: any) => String(x ?? "").trim()).filter(Boolean)
      : [];

    const parts = [city, state].filter(Boolean);
    const base = parts.join(", ");

    if (base && pincode) return `${base} (${pincode})`;
    if (base) return base;
    if (preferred.length > 0) return preferred.slice(0, 2).join(", ");
    if (pincode) return pincode;
    return "-";
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [employersRes, projectsRes] = await Promise.all([
          apiRequest("GET", "/api/admin/employers"),
          apiRequest("GET", "/api/admin/projects"),
        ]);

        const employersJson = await employersRes.json();
        const employersList = (employersJson?.employers ?? []) as any[];
        setEmployers(
          employersList.map((e) => ({
            id: String(e?.id ?? ""),
            label: String(e?.companyName ?? e?.name ?? "Company"),
          })),
        );

        const projectsJson = await projectsRes.json();
        const list = (projectsJson?.projects ?? []) as any[];
        const mapped: Project[] = list.map((p) => {
          const createdAtRaw = p?.createdAt ?? p?.created_at ?? null;
          const createdAt = createdAtRaw
            ? (() => {
                const d = new Date(createdAtRaw);
                return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
              })()
            : "-";
          const location = formatProjectLocation(p);
          const skills = Array.isArray(p?.skills) ? p.skills.map((s: any) => String(s)) : [];
          const pincode = String(p?.pincode ?? "-") || "-";
          const timezone = String(p?.timezone ?? "-") || "-";
          const rawCity = String(p?.city ?? "").trim();
          const rawState = String(p?.state ?? "").trim().toLowerCase();
          const city = rawCity && rawCity !== "null" ? rawCity : "-";
          const state = rawState && rawState !== "active" && rawState !== "inactive" && rawState !== "draft" && rawState !== "null" ? String(p?.state ?? "-") : "-";
          const preferredLocations = Array.isArray(p?.preferredLocations) ? p.preferredLocations.map((x: any) => String(x ?? "").trim()).filter(Boolean) : [];
          return {
            id: String(p?.id ?? ""),
            employerId: String(p?.employerId ?? p?.employer_id ?? ""),
            employerCompanyName: p?.employerCompanyName ?? null,
            projectName: String(p?.projectName ?? "-"),
            skills,
            location: String(location),
            city,
            state,
            preferredLocations,
            scopeOfWork: String(p?.scopeOfWork ?? "-"),
            locationType: String(p?.locationType ?? "-"),
            pincode,
            timezone,
            fullTimeOffer: !!p?.fullTimeOffer,
            status: String(p?.status ?? "active"),
            createdAt,
          };
        });

        setProjects(mapped);
      } catch (e) {
        console.error("Failed to load projects", e);
        setError("Failed to load projects");
        setProjects([]);
        setEmployers([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const stats = useMemo(() => {
    const total = projects.length;
    const active = projects.filter(p => p.status.toLowerCase() === "active").length;
    const inactive = projects.filter(p => p.status.toLowerCase() === "inactive").length;
    const uniqueCompanies = new Set(projects.map(p => p.employerId)).size;
    return { total, active, inactive, uniqueCompanies };
  }, [projects]);

  const filtered = useMemo(() => {
    let list = projects;
    if (selectedEmployerId !== "all") {
      list = list.filter((p) => p.employerId === selectedEmployerId);
    }
    if (statusFilter !== "all") {
      list = list.filter((p) => p.status.toLowerCase() === statusFilter.toLowerCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
        p.projectName.toLowerCase().includes(q) ||
        p.skills.some(s => s.toLowerCase().includes(q)) ||
        p.location.toLowerCase().includes(q)
      );
    }
    return list;
  }, [projects, selectedEmployerId, searchQuery, statusFilter]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Project[]>();
    for (const p of filtered) {
      const key = String(p.employerCompanyName ?? "Unknown Company").trim() || "Unknown Company";
      const prev = groups.get(key);
      if (prev) prev.push(p);
      else groups.set(key, [p]);
    }
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  useEffect(() => {
    setOpenCompanies((prev) => {
      const next: Record<string, boolean> = { ...prev };
      for (const [companyName] of grouped) {
        if (next[companyName] === undefined) next[companyName] = true;
      }
      return next;
    });
  }, [grouped]);

  const toggleCompany = (companyName: string) => {
    setOpenCompanies(prev => ({ ...prev, [companyName]: !prev[companyName] }));
  };

  return (
    <AdminLayout title="Projects" description="View and manage all internship projects">
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading projects...</p>
            </div>
          </div>
        ) : error ? (
          <Card className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{error}</h3>
                <p className="text-sm text-muted-foreground mt-1">Something went wrong while loading projects.</p>
              </div>
            </div>
          </Card>
        ) : (
          <>
            {/* Stats Row */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard title="Total Projects" value={stats.total} icon={<Briefcase className="h-5 w-5" />} subtitle={`${stats.uniqueCompanies} companies`} />
              <StatCard title="Active Projects" value={stats.active} icon={<CheckCircle2 className="h-5 w-5" />} variant="success" subtitle="Currently running" />
              <StatCard title="Inactive Projects" value={stats.inactive} icon={<Clock className="h-5 w-5" />} variant="warning" subtitle="Paused or closed" />
              <StatCard title="Companies" value={stats.uniqueCompanies} icon={<Building2 className="h-5 w-5" />} subtitle="With projects" />
            </div>

            {/* Main Card */}
            <Card className="border shadow-sm overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-r from-muted/50 to-muted/30 border-b px-6 py-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                      <Folder className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Project Directory</h2>
                      <p className="text-sm text-muted-foreground">{grouped.length} companies with {filtered.length} projects</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-[280px]">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search projects, skills..."
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                        className="h-11 pl-11 pr-10 bg-background"
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <Select value={selectedEmployerId} onValueChange={(v) => { setSelectedEmployerId(v); setPage(1); }}>
                      <SelectTrigger className="h-11 w-full sm:w-[180px] bg-background">
                        <SelectValue placeholder="All Companies" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Companies</SelectItem>
                        {employers.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                      <SelectTrigger className="h-11 w-full sm:w-[150px] bg-background">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {grouped.length === 0 ? (
                  <EmptyState
                    icon={Folder}
                    title="No projects found"
                    description={searchQuery || selectedEmployerId !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters to see more results."
                      : "No projects have been created yet."}
                  />
                ) : (
                  <div className="space-y-4">
                    {grouped.map(([companyName, items]) => {
                      const isOpen = openCompanies[companyName] !== false;
                      const activeCount = items.filter(p => p.status.toLowerCase() === "active").length;

                      return (
                        <Card key={companyName} className="border overflow-hidden">
                          {/* Company Header */}
                          <button
                            onClick={() => toggleCompany(companyName)}
                            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold shrink-0">
                                {companyName.charAt(0).toUpperCase()}
                              </div>
                              <div className="text-left min-w-0">
                                <p className="font-semibold text-foreground truncate">{companyName}</p>
                                <p className="text-xs text-muted-foreground">{items.length} project{items.length === 1 ? "" : "s"} • {activeCount} active</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="hidden sm:flex">{items.length}</Badge>
                              {isOpen ? (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                  <ChevronDown className="h-4 w-4" />
                                </div>
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                  <ChevronRight className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                          </button>

                          {/* Projects Table */}
                          {isOpen && (
                            <div className="border-t">
                              <Table>
                                <TableHeader>
                                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="font-semibold">Project</TableHead>
                                    <TableHead className="font-semibold">Skills</TableHead>
                                    <TableHead className="font-semibold">City</TableHead>
                                    <TableHead className="font-semibold">State</TableHead>
                                    <TableHead className="font-semibold">Preferred Locations</TableHead>
                                    <TableHead className="font-semibold">Work Mode</TableHead>
                                    <TableHead className="font-semibold">Scope</TableHead>
                                    <TableHead className="font-semibold">Full-time Possible</TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold">Created</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((p) => (
                                    <TableRow key={p.id} className="group hover:bg-muted/30 transition-colors">
                                      <TableCell className="font-medium">{p.projectName}</TableCell>
                                      <TableCell className="max-w-[200px]">
                                        <div className="flex flex-wrap gap-1">
                                          {p.skills.length === 0 ? (
                                            <span className="text-xs text-muted-foreground">—</span>
                                          ) : (
                                            p.skills.slice(0, 3).map((s) => (
                                              <Badge key={s} variant="outline" className="text-[10px] rounded-full">
                                                {s}
                                              </Badge>
                                            ))
                                          )}
                                          {p.skills.length > 3 && (
                                            <Badge variant="outline" className="text-[10px] rounded-full">
                                              +{p.skills.length - 3}
                                            </Badge>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell>{p.city}</TableCell>
                                      <TableCell>{p.state}</TableCell>
                                      <TableCell>
                                        {p.preferredLocations.length > 0 ? (
                                          <div className="flex flex-wrap gap-1">
                                            {p.preferredLocations.slice(0, 2).map((loc) => (
                                              <Badge key={loc} variant="outline" className="text-[10px]">
                                                {loc}
                                              </Badge>
                                            ))}
                                            {p.preferredLocations.length > 2 && (
                                              <Badge variant="outline" className="text-[10px]">
                                                +{p.preferredLocations.length - 2}
                                              </Badge>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-muted-foreground">—</span>
                                        )}
                                      </TableCell>
                                      <TableCell className="capitalize">{p.locationType}</TableCell>
                                      <TableCell>
                                        <Badge variant="outline" className="rounded-full">
                                          {p.scopeOfWork}
                                        </Badge>
                                      </TableCell>
                                      <TableCell>
                                        {p.fullTimeOffer ? (
                                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Yes</Badge>
                                        ) : (
                                          <Badge variant="outline" className="text-muted-foreground">No</Badge>
                                        )}
                                      </TableCell>
                                      <TableCell><StatusBadge status={p.status} /></TableCell>
                                      <TableCell className="text-muted-foreground">{p.createdAt}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
