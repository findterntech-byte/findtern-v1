import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Power, RefreshCw } from "lucide-react";
import { EmployerHeader } from "@/components/employer/EmployerHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getEmployerAuth } from "@/lib/employerAuth";
import { apiRequest } from "@/lib/queryClient";

type EmployerProject = {
  id: string;
  projectName: string;
  scopeOfWork?: string | null;
  locationType?: string | null;
  timezone?: string | null;
  fullTimeOffer?: boolean | null;
  city?: string | null;
  state?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

function toTitleWord(value: string) {
  const v = String(value ?? "").trim();
  if (!v) return "";
  return v.charAt(0).toUpperCase() + v.slice(1).toLowerCase();
}

function toTitleName(name: string) {
  const cleaned = String(name ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((p) => toTitleWord(p))
    .join(" ");
}

export default function EmployerProjectsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const auth = getEmployerAuth();
  const employerId = auth?.id ? String(auth.id) : "";

  const MAX_SELECTED_PROJECTS = 5;
  const selectedProjectIdStorageKey = "employerSelectedProjectId";
  const selectedProjectIdsStorageKey = "employerSelectedProjectIds";

  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = window.localStorage.getItem(selectedProjectIdsStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const list = Array.isArray(parsed) ? parsed : [];
      const seen = new Set<string>();
      const normalized: string[] = [];
      for (const item of list) {
        const v = String(item ?? "").trim();
        if (!v) continue;
        const key = v.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        normalized.push(v);
        if (normalized.length >= MAX_SELECTED_PROJECTS) break;
      }
      if (normalized.length > 0) return normalized;

      const legacy = String(window.localStorage.getItem(selectedProjectIdStorageKey) ?? "").trim();
      return legacy ? [legacy] : [];
    } catch {
      return [];
    }
  });

  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(selectedProjectIdsStorageKey, JSON.stringify(selectedProjectIds));
      if (selectedProjectIds.length > 0) {
        window.localStorage.setItem(selectedProjectIdStorageKey, String(selectedProjectIds[0] ?? ""));
      } else {
        window.localStorage.removeItem(selectedProjectIdStorageKey);
      }

      window.dispatchEvent(new Event("employerProjectChanged"));
      window.dispatchEvent(new Event("employerProjectsUpdated"));
    } catch {
      // ignore
    }
  }, [selectedProjectIds]);

  const projectsQueryKey = useMemo(
    () => ["/api/employer", employerId, "projects"],
    [employerId],
  );

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: projectsQueryKey,
    enabled: !!employerId,
    queryFn: async () => {
      const res = await fetch(`/api/employer/${encodeURIComponent(employerId)}/projects`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.message || "Failed to load projects");
      }
      return res.json();
    },
  });

  const projects: EmployerProject[] = useMemo(() => {
    const list = (data?.projects ?? []) as any[];
    return list.map((p) => ({
      id: String(p?.id ?? "").trim(),
      projectName: String(p?.projectName ?? p?.project_name ?? "").trim() || "Project",
      scopeOfWork: p?.scopeOfWork ?? p?.scope_of_work ?? null,
      locationType: p?.locationType ?? p?.location_type ?? null,
      timezone: p?.timezone ?? null,
      fullTimeOffer: typeof p?.fullTimeOffer === "boolean" ? p.fullTimeOffer : p?.full_time_offer ?? null,
      city: p?.city ?? null,
      state: p?.state ?? null,
      status: p?.status ?? null,
      createdAt: p?.createdAt ?? p?.created_at ?? null,
    }));
  }, [data?.projects]);

  useEffect(() => {
    if (projects.length === 0) return;
    setSelectedProjectIds((prev) => {
      const existing = Array.isArray(prev) ? prev : [];
      if (existing.length === 0) {
        const toMs = (value: unknown) => {
          const raw = String(value ?? "").trim();
          if (!raw) return 0;
          const ms = Date.parse(raw);
          return Number.isFinite(ms) ? ms : 0;
        };

        const activeSorted = projects
          .filter((p) => String(p.status ?? "active").trim().toLowerCase() !== "inactive")
          .slice()
          .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

        const nextDefault = activeSorted
          .slice(0, MAX_SELECTED_PROJECTS)
          .map((p) => String(p.id ?? "").trim())
          .filter(Boolean);

        return nextDefault;
      }

      const validIdSet = new Set(projects.map((p) => String(p.id ?? "").trim().toLowerCase()).filter(Boolean));
      const next = existing.filter((id) => validIdSet.has(String(id ?? "").trim().toLowerCase()));
      if (next.length === existing.length) return existing;
      return next;
    });
  }, [projects]);

  const selectedProjects = useMemo(() => {
    const lowerSet = new Set(selectedProjectIds.map((id) => String(id ?? "").trim().toLowerCase()).filter(Boolean));
    return projects.filter((p) => lowerSet.has(String(p.id ?? "").trim().toLowerCase()));
  }, [projects, selectedProjectIds]);

  const includeProject = (projectId: string) => {
    const id = String(projectId ?? "").trim();
    if (!id) return;

    const project = projects.find((p) => String(p.id) === id);
    const status = String(project?.status ?? "active").trim().toLowerCase() || "active";
    if (status === "inactive") {
      toast({
        title: "Inactive project",
        description: "Activate the project before including it.",
        variant: "destructive",
      });
      return;
    }

    setSelectedProjectIds((prev) => {
      const existing = Array.isArray(prev) ? prev : [];
      const prevLower = existing.map((v) => String(v ?? "").trim());
      const exists = prevLower.some((v) => v.toLowerCase() === id.toLowerCase());
      if (exists) return existing;
      if (existing.length >= MAX_SELECTED_PROJECTS) {
        toast({
          title: "Limit reached",
          description: `You can select a maximum of ${MAX_SELECTED_PROJECTS} projects. To add a new one, remove an existing project.`,
          variant: "destructive",
        });
        return existing;
      }
      return [id, ...existing];
    });
  };

  const excludeProject = (projectId: string) => {
    const id = String(projectId ?? "").trim();
    if (!id) return;

    const existing = Array.isArray(selectedProjectIds) ? selectedProjectIds : [];
    const remaining = existing.filter((v) => String(v ?? "").trim().toLowerCase() !== id.toLowerCase());
    if (existing.length > 0 && remaining.length === 0) {
      toast({
        title: "At least one project required",
        description: "You must keep at least one project included.",
        variant: "destructive",
      });
      return;
    }

    setSelectedProjectIds(remaining);
  };

  const selectedLabel = useMemo(() => {
    return selectedProjects
      .map((p) => toTitleName(p.projectName))
      .filter(Boolean)
      .join(", ");
  }, [selectedProjects]);

  const displayProjects = useMemo(() => {
    const normalized = projects.map((p) => {
      const status = String(p.status ?? "active").trim().toLowerCase() || "active";
      return { ...p, status };
    });

    if (statusFilter === "all") return normalized;
    return normalized.filter((p) => String(p.status ?? "active").trim().toLowerCase() === statusFilter);
  }, [projects, statusFilter]);

  const emptyStateMessage = useMemo(() => {
    if (projects.length === 0) return "No projects found.";

    if (displayProjects.length === 0) {
      if (statusFilter === "active") {
        const hasInactive = projects.some(
          (p) => String(p.status ?? "active").trim().toLowerCase() === "inactive",
        );
        if (hasInactive) {
          return "No active projects found. Switch filter to Inactive or All to view inactive projects.";
        }
        return "No active projects found.";
      }

      if (statusFilter === "inactive") {
        return "No inactive projects found.";
      }

      return "No projects found.";
    }

    return "No projects found.";
  }, [displayProjects.length, projects, statusFilter]);

  useEffect(() => {
    setSelectedProjectIds((prev) => {
      const existing = Array.isArray(prev) ? prev : [];
      if (existing.length <= MAX_SELECTED_PROJECTS) return existing;
      return existing.slice(0, MAX_SELECTED_PROJECTS);
    });
  }, [MAX_SELECTED_PROJECTS]);

  const toggleStatus = async (project: EmployerProject) => {
    const projectId = String(project.id ?? "").trim();
    if (!projectId) return;

    const current = String(project.status ?? "active").trim().toLowerCase();
    const next = current === "inactive" ? "active" : "inactive";

    if (next === "inactive") {
      const activeCount = projects.filter(
        (p) => String(p.status ?? "active").trim().toLowerCase() !== "inactive",
      ).length;
      if (activeCount <= 1) {
        toast({
          title: "At least one active project required",
          description: "You must keep at least one project active.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      await apiRequest("PUT", `/api/projects/${encodeURIComponent(projectId)}`, {
        status: next,
      });

      if (next === "inactive") {
        setSelectedProjectIds((prev) =>
          (Array.isArray(prev) ? prev : []).filter(
            (v) => String(v ?? "").trim().toLowerCase() !== projectId.toLowerCase(),
          ),
        );
      }

      await queryClient.invalidateQueries({ queryKey: projectsQueryKey });
      try {
        window.dispatchEvent(new Event("employerProjectsUpdated"));
      } catch {
        // ignore
      }
      toast({
        title: next === "active" ? "Activated" : "Deactivated",
        description: `Project status updated to ${next}.`,
      });
    } catch (e) {
      toast({
        title: "Error",
        description: e instanceof Error ? e.message : "Failed to update project",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      <EmployerHeader active="none" />

      <div className="container max-w-6xl mx-auto px-4 md:px-6 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 truncate">Projects</h1>
            <p className="text-sm text-slate-500 mt-1">
              {selectedLabel ? (
                <>
                  Selected ({Math.min(selectedProjects.length, MAX_SELECTED_PROJECTS)}/{MAX_SELECTED_PROJECTS}):{" "}
                  <span className="font-medium text-slate-800">{selectedLabel}</span>
                </>
              ) : (
                "Select a project to use across hiring and filters."
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="h-10 w-[160px] rounded-xl border-slate-200 text-sm">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-10 rounded-xl border-slate-200"
              disabled={!employerId || isFetching}
              onClick={() => refetch()}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => setLocation("/employer/dashboard")}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        <Card className="p-0 rounded-2xl border-slate-100 bg-white shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-slate-600">Loading projects...</div>
          ) : error instanceof Error ? (
            <div className="p-8 text-center">
              <div className="text-sm font-medium text-red-700">Failed to load projects</div>
              <div className="text-xs text-red-600 mt-1">{error.message}</div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="h-9 rounded-xl border-slate-200"
                  onClick={() => refetch()}
                >
                  Try again
                </Button>
              </div>
            </div>
          ) : displayProjects.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">{emptyStateMessage}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[220px]">Title</TableHead>
                    <TableHead className="min-w-[160px]">Scope</TableHead>
                    <TableHead className="min-w-[140px]">Location Type</TableHead>
                    <TableHead className="min-w-[180px]">Time Zone</TableHead>
                    <TableHead className="min-w-[120px]">Full Time</TableHead>
                    <TableHead className="min-w-[160px]">Status</TableHead>
                    <TableHead className="min-w-[160px]">Project List</TableHead>
                    <TableHead className="text-right min-w-[220px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayProjects.map((p) => {
                    const isSelected = selectedProjectIds.some(
                      (id) => String(id ?? "").trim().toLowerCase() === String(p.id ?? "").trim().toLowerCase(),
                    );
                    const status = String(p.status ?? "active").trim().toLowerCase() || "active";
                    const statusBadgeClass =
                      status === "active"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-700 border-slate-200";

                    return (
                      <TableRow key={p.id} className="hover:bg-emerald-50/40 transition-colors">
                        <TableCell className="font-medium text-slate-900">
                          <div className="flex items-center gap-2 min-w-0">
                            {isSelected ? <Check className="w-4 h-4 text-emerald-600" /> : null}
                            <span className="truncate">{toTitleName(p.projectName)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {p.scopeOfWork ? toTitleName(p.scopeOfWork) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {p.locationType ? toTitleWord(p.locationType) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {p.timezone ? String(p.timezone) : "-"}
                        </TableCell>
                        <TableCell className="text-sm text-slate-600">
                          {p.fullTimeOffer ? "Yes" : "No"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[11px] ${statusBadgeClass}`}>
                            {status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-[150px]">
                            <Select
                              value={isSelected ? "include" : "exclude"}
                              onValueChange={(value) => {
                                if (value === "include") includeProject(p.id);
                                if (value === "exclude") excludeProject(p.id);
                              }}
                            >
                              <SelectTrigger className="h-8 rounded-full border-slate-200 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="include">Include</SelectItem>
                                <SelectItem value="exclude">Exclude</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full border-slate-200"
                            onClick={() => toggleStatus(p)}
                          >
                            <Power className="w-3.5 h-3.5 mr-1.5" />
                            {status === "active" ? "Deactivate" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
