import { useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

type Audience = "intern" | "employer" | "both";

type InternOption = {
  id: string;
  label: string;
};

type EmployerOption = {
  id: string;
  label: string;
};

export default function AdminNotificationsPage() {
  const [audience, setAudience] = useState<Audience>("intern");

  const [sendAllInterns, setSendAllInterns] = useState(false);
  const [sendAllEmployers, setSendAllEmployers] = useState(false);

  const [internSearch, setInternSearch] = useState("");
  const [employerSearch, setEmployerSearch] = useState("");

  const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
  const [selectedEmployerIds, setSelectedEmployerIds] = useState<string[]>([]);

  const [type, setType] = useState("custom");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [dataJson, setDataJson] = useState("{}");

  const [internOptions, setInternOptions] = useState<InternOption[]>([]);
  const [employerOptions, setEmployerOptions] = useState<EmployerOption[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoadingRecipients(true);

        const [internsRes, employersRes] = await Promise.all([
          apiRequest("GET", "/api/interns"),
          apiRequest("GET", "/api/admin/employers"),
        ]);

        const internsJson = await internsRes.json();
        const employersJson = await employersRes.json();

        const nextInterns: InternOption[] = (Array.isArray(internsJson?.interns) ? internsJson.interns : [])
          .map((row: any) => {
            const user = row?.user ?? {};
            const id = String(user?.id ?? row?.id ?? "").trim();
            if (!id) return null;
            const name = `${String(user?.firstName ?? "")} ${String(user?.lastName ?? "")}`.trim() || "Intern";
            const email = String(user?.email ?? "").trim();
            const label = email ? `${name} (${email})` : name;
            return { id, label };
          })
          .filter(Boolean) as InternOption[];

        const nextEmployers: EmployerOption[] = (Array.isArray(employersJson?.employers) ? employersJson.employers : [])
          .map((row: any) => {
            const id = String(row?.id ?? "").trim();
            if (!id) return null;
            const companyName = String(row?.companyName ?? row?.name ?? "Employer").trim();
            const email = String(row?.companyEmail ?? "").trim();
            const label = email ? `${companyName} (${email})` : companyName;
            return { id, label };
          })
          .filter(Boolean) as EmployerOption[];

        if (!mounted) return;
        setInternOptions(nextInterns);
        setEmployerOptions(nextEmployers);
      } catch {
        if (!mounted) return;
        setInternOptions([]);
        setEmployerOptions([]);
      } finally {
        if (!mounted) return;
        setLoadingRecipients(false);
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  const internIdSet = useMemo(() => new Set(selectedInternIds), [selectedInternIds]);
  const employerIdSet = useMemo(() => new Set(selectedEmployerIds), [selectedEmployerIds]);

  const filteredInterns = useMemo(() => {
    const q = internSearch.trim().toLowerCase();
    if (!q) return internOptions;
    return internOptions.filter((x) => x.label.toLowerCase().includes(q) || x.id.toLowerCase().includes(q));
  }, [internOptions, internSearch]);

  const filteredEmployers = useMemo(() => {
    const q = employerSearch.trim().toLowerCase();
    if (!q) return employerOptions;
    return employerOptions.filter((x) => x.label.toLowerCase().includes(q) || x.id.toLowerCase().includes(q));
  }, [employerOptions, employerSearch]);

  const internSelectAllState = useMemo(() => {
    if (filteredInterns.length === 0) return false as boolean | "indeterminate";
    const some = filteredInterns.some((x) => internIdSet.has(x.id));
    const all = filteredInterns.every((x) => internIdSet.has(x.id));
    if (all) return true;
    if (some) return "indeterminate";
    return false;
  }, [filteredInterns, internIdSet]);

  const employerSelectAllState = useMemo(() => {
    if (filteredEmployers.length === 0) return false as boolean | "indeterminate";
    const some = filteredEmployers.some((x) => employerIdSet.has(x.id));
    const all = filteredEmployers.every((x) => employerIdSet.has(x.id));
    if (all) return true;
    if (some) return "indeterminate";
    return false;
  }, [filteredEmployers, employerIdSet]);

  const wantsInterns = audience === "intern" || audience === "both";
  const wantsEmployers = audience === "employer" || audience === "both";

  const handleSend = async () => {
    setResult(null);
    setError(null);

    const titleTrimmed = title.trim();
    const messageTrimmed = message.trim();
    const typeTrimmed = type.trim() || "custom";

    if (!titleTrimmed || !messageTrimmed) {
      setError("Title and message are required");
      return;
    }

    if (wantsInterns && !sendAllInterns && selectedInternIds.length === 0) {
      setError("Select at least one intern (or enable 'All interns')");
      return;
    }

    if (wantsEmployers && !sendAllEmployers && selectedEmployerIds.length === 0) {
      setError("Select at least one employer (or enable 'All employers')");
      return;
    }

    let data: any = {};
    try {
      data = dataJson.trim() ? JSON.parse(dataJson) : {};
    } catch {
      setError("Data must be valid JSON");
      return;
    }

    try {
      setSubmitting(true);

      const base = {
        type: typeTrimmed,
        title: titleTrimmed,
        message: messageTrimmed,
        data,
      };

      const results: string[] = [];

      if (wantsInterns) {
        const res = await apiRequest("POST", "/api/admin/notifications", {
          ...base,
          recipientType: "intern" as const,
          broadcast: sendAllInterns,
          ...(sendAllInterns ? {} : { recipientIds: selectedInternIds }),
        });
        const json = await res.json().catch(() => null);
        const createdCount = Number(json?.createdCount ?? 0);
        results.push(`Interns: ${createdCount}`);
      }

      if (wantsEmployers) {
        const res = await apiRequest("POST", "/api/admin/notifications", {
          ...base,
          recipientType: "employer" as const,
          broadcast: sendAllEmployers,
          ...(sendAllEmployers ? {} : { recipientIds: selectedEmployerIds }),
        });
        const json = await res.json().catch(() => null);
        const createdCount = Number(json?.createdCount ?? 0);
        results.push(`Employers: ${createdCount}`);
      }

      setResult(results.join(" | "));
    } catch (e: any) {
      setError(e?.message ?? "Failed to send notification");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Notifications"
      description="Send custom notifications to interns and employers."
    >
      <div className="space-y-4">
        <Card className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Send To</Label>
              <Select
                value={audience}
                onValueChange={(v) => {
                  const next = v as Audience;
                  setAudience(next);
                  setSendAllInterns(false);
                  setSendAllEmployers(false);
                  setSelectedInternIds([]);
                  setSelectedEmployerIds([]);
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select recipient type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intern">Interns</SelectItem>
                  <SelectItem value="employer">Employers</SelectItem>
                  <SelectItem value="both">Both (Interns + Employers)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Input
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="custom"
              />
            </div>
          </div>

          {/* Interns (always first) */}
          {wantsInterns && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Interns</p>
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedInternIds.length}{sendAllInterns ? " (All)" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-interns"
                    checked={sendAllInterns}
                    onCheckedChange={(v) => {
                      const checked = Boolean(v);
                      setSendAllInterns(checked);
                      if (checked) setSelectedInternIds([]);
                    }}
                  />
                  <Label htmlFor="all-interns">All interns</Label>
                </div>
              </div>

              {!sendAllInterns && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Search interns</Label>
                      <Input
                        value={internSearch}
                        onChange={(e) => setInternSearch(e.target.value)}
                        placeholder="Search by name/email"
                        disabled={loadingRecipients}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Select all (filtered)</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Checkbox
                          checked={internSelectAllState}
                          onCheckedChange={(v) => {
                            const checked = v === true;
                            if (checked) {
                              const merged = new Set(selectedInternIds);
                              for (const it of filteredInterns) merged.add(it.id);
                              setSelectedInternIds(Array.from(merged));
                            } else {
                              const next = new Set(selectedInternIds);
                              for (const it of filteredInterns) next.delete(it.id);
                              setSelectedInternIds(Array.from(next));
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {filteredInterns.length} shown
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md max-h-[280px] overflow-auto">
                    {filteredInterns.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No interns found.</div>
                    ) : (
                      <div className="divide-y">
                        {filteredInterns.map((it) => {
                          const checked = internIdSet.has(it.id);
                          return (
                            <div key={it.id} className="flex items-center gap-3 p-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const nextChecked = Boolean(v);
                                  setSelectedInternIds((prev) => {
                                    const set = new Set(prev);
                                    if (nextChecked) set.add(it.id);
                                    else set.delete(it.id);
                                    return Array.from(set);
                                  });
                                }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm text-slate-900 truncate">{it.label}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{it.id}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Employers */}
          {wantsEmployers && (
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Employers</p>
                  <p className="text-xs text-muted-foreground">
                    Selected: {selectedEmployerIds.length}{sendAllEmployers ? " (All)" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="all-employers"
                    checked={sendAllEmployers}
                    onCheckedChange={(v) => {
                      const checked = Boolean(v);
                      setSendAllEmployers(checked);
                      if (checked) setSelectedEmployerIds([]);
                    }}
                  />
                  <Label htmlFor="all-employers">All employers</Label>
                </div>
              </div>

              {!sendAllEmployers && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Search employers</Label>
                      <Input
                        value={employerSearch}
                        onChange={(e) => setEmployerSearch(e.target.value)}
                        placeholder="Search by company/email"
                        disabled={loadingRecipients}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Select all (filtered)</Label>
                      <div className="flex items-center gap-2 h-10">
                        <Checkbox
                          checked={employerSelectAllState}
                          onCheckedChange={(v) => {
                            const checked = v === true;
                            if (checked) {
                              const merged = new Set(selectedEmployerIds);
                              for (const it of filteredEmployers) merged.add(it.id);
                              setSelectedEmployerIds(Array.from(merged));
                            } else {
                              const next = new Set(selectedEmployerIds);
                              for (const it of filteredEmployers) next.delete(it.id);
                              setSelectedEmployerIds(Array.from(next));
                            }
                          }}
                        />
                        <span className="text-xs text-muted-foreground">
                          {filteredEmployers.length} shown
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md max-h-[280px] overflow-auto">
                    {filteredEmployers.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">No employers found.</div>
                    ) : (
                      <div className="divide-y">
                        {filteredEmployers.map((it) => {
                          const checked = employerIdSet.has(it.id);
                          return (
                            <div key={it.id} className="flex items-center gap-3 p-3">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={(v) => {
                                  const nextChecked = Boolean(v);
                                  setSelectedEmployerIds((prev) => {
                                    const set = new Set(prev);
                                    if (nextChecked) set.add(it.id);
                                    else set.delete(it.id);
                                    return Array.from(set);
                                  });
                                }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm text-slate-900 truncate">{it.label}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{it.id}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </Card>
          )}

          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              className="min-h-[120px]"
            />
          </div>

         

          {error && (
            <Card className="p-3 border-red-200 bg-red-50">
              <p className="text-sm text-red-700">{error}</p>
            </Card>
          )}

          {result && (
            <Card className="p-3 border-emerald-200 bg-emerald-50">
              <p className="text-sm text-emerald-800">{result}</p>
            </Card>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null);
                setError(null);
                setAudience("intern");
                setSendAllInterns(false);
                setSendAllEmployers(false);
                setInternSearch("");
                setEmployerSearch("");
                setSelectedInternIds([]);
                setSelectedEmployerIds([]);
                setType("custom");
                setTitle("");
                setMessage("");
                setDataJson("{}");
              }}
              disabled={submitting}
            >
              Reset
            </Button>
            <Button onClick={handleSend} disabled={submitting} style={{ backgroundColor: "#0E6049" }}>
              {submitting ? "Sending..." : "Send"}
            </Button>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
