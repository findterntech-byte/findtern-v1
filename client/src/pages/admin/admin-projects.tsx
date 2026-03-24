import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { apiRequest } from "@/lib/queryClient";
import { ChevronDown, ChevronRight, Folder, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import logo from "@assets/logo-1.jpg";

type Project = {
  id: string;
  employerId: string;
  employerCompanyName?: string | null;
  projectName: string;
  skills: string[];
  location: string;
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

export default function AdminProjectsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [employers, setEmployers] = useState<EmployerOption[]>([]);
  const [selectedEmployerId, setSelectedEmployerId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [openCompanies, setOpenCompanies] = useState<Record<string, boolean>>({});

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
                return Number.isNaN(d.getTime()) ? String(createdAtRaw) : d.toISOString().slice(0, 10);
              })()
            : "-";
          const location = formatProjectLocation(p);
          const skills = Array.isArray(p?.skills) ? p.skills.map((s: any) => String(s)) : [];
          const pincode = String(p?.pincode ?? "-") || "-";
          const timezone = String(p?.timezone ?? "-") || "-";
          return {
            id: String(p?.id ?? ""),
            employerId: String(p?.employerId ?? p?.employer_id ?? ""),
            employerCompanyName: p?.employerCompanyName ?? null,
            projectName: String(p?.projectName ?? "-"),
            skills,
            location: String(location),
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

  const filtered = useMemo(() => {
    let list = projects;
    if (selectedEmployerId !== "all") {
      list = list.filter((p) => p.employerId === selectedEmployerId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => 
        p.projectName.toLowerCase().includes(q) ||
        p.skills.some(s => s.toLowerCase().includes(q))
      );
    }
    return list;
  }, [projects, selectedEmployerId, searchQuery]);

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

  return (
    <AdminLayout
      title="Projects"
      description="View and filter all projects created by companies."
    >
      <div className="mb-6 flex items-center gap-4">
       
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Management</h1>
          <p className="text-sm text-muted-foreground">Manage and track all internship projects</p>
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-center flex-1">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by project name or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full max-w-xs">
              <Select value={selectedEmployerId} onValueChange={(v) => setSelectedEmployerId(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {employers.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto px-4 py-4">
          {loading && (
            <p className="text-sm text-muted-foreground px-2 pb-3">Loading projects...</p>
          )}
          {!loading && error && (
            <p className="text-sm text-red-600 px-2 pb-3">{error}</p>
          )}
          {!loading && grouped.length === 0 && (
            <p className="text-sm text-muted-foreground px-2">No projects found.</p>
          )}

          <div className="space-y-3">
            {grouped.map(([companyName, items]) => {
              const isOpen = openCompanies[companyName] !== false;
              return (
                <Card key={companyName} className="border border-slate-100">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="h-4 w-4 text-emerald-600 shrink-0" />
                      <p className="text-sm font-semibold text-slate-900 truncate">{companyName}</p>
                      <Badge variant="outline" className="ml-2 text-[11px]">
                        {items.length} project{items.length === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setOpenCompanies((prev) => ({
                          ...prev,
                          [companyName]: !(prev[companyName] !== false),
                        }))
                      }
                      className="gap-1"
                    >
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      {isOpen ? "Hide" : "Show"}
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Project Title</TableHead>
                            <TableHead>Skills</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Scope</TableHead>
                            <TableHead>Location Type</TableHead>
                            <TableHead>Timezone</TableHead>
                            <TableHead>Full-Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Created</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-medium">{p.projectName}</TableCell>
                              <TableCell className="max-w-[260px]">
                                <div className="flex flex-wrap gap-1">
                                  {p.skills.length === 0 ? (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  ) : (
                                    p.skills.slice(0, 6).map((s) => (
                                      <Badge key={s} variant="outline" className="text-[11px] rounded-full">
                                        {s}
                                      </Badge>
                                    ))
                                  )}
                                  {p.skills.length > 6 && (
                                    <Badge variant="outline" className="text-[11px] rounded-full">
                                      +{p.skills.length - 6}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{p.location}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full">
                                  {p.scopeOfWork}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="rounded-full">
                                  {p.locationType}
                                </Badge>
                              </TableCell>
                              <TableCell>{p.timezone}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-emerald-500 bg-emerald-50 text-emerald-700"
                                >
                                  {p.fullTimeOffer ? "Yes" : "No"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge className={p.status === "active" ? "bg-[#0E6049]" : "bg-slate-500"}>
                                  {p.status}
                                </Badge>
                              </TableCell>
                              <TableCell>{p.createdAt}</TableCell>
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
        </div>
      </Card>
    </AdminLayout>
  );
}


