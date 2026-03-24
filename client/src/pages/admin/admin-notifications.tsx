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
import {
  Bell,
  Users,
  Building2,
  Send,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Mail,
  Info,
  Layers,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
      title="Notifications Hub"
      description="Design and broadcast professional notifications to your platform users."
    >
      <div className="max-w-6xl mx-auto space-y-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Configuration */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="p-6 shadow-sm border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight">Compose Notification</h3>
                  <p className="text-xs text-muted-foreground">Draft your message and select your target audience</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Target Audience
                    </Label>
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
                      <SelectTrigger className="h-11 shadow-sm border-slate-200">
                        <SelectValue placeholder="Select target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="intern">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Interns Only</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="employer">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>Employers Only</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            <span>Both Groups</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Message Type
                    </Label>
                    <div className="relative">
                      <Input
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        placeholder="e.g. update, promo, alert"
                        className="h-11 pl-10 shadow-sm border-slate-200"
                      />
                      <Badge className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 p-0 flex items-center justify-center bg-slate-100 text-slate-500 border-none">
                        <Info className="h-3 w-3" />
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Notification Title
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter a compelling title..."
                    className="h-11 shadow-sm border-slate-200 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Message Body
                  </Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe the update in detail..."
                    className="min-h-[160px] shadow-sm border-slate-200 resize-none leading-relaxed"
                  />
                </div>

                <Separator className="bg-slate-100" />

                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-500 hover:text-slate-900 gap-2 font-bold text-xs"
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
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset Draft
                  </Button>
                  <Button
                    onClick={handleSend}
                    disabled={submitting}
                    className="h-11 px-8 bg-[#0E6049] hover:bg-[#0E6049]/90 shadow-md gap-2 font-bold"
                  >
                    {submitting ? (
                      <>
                        <RotateCcw className="h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send Broadcast
                      </>
                    )}
                  </Button>
                </div>

                {error && (
                  <div className="p-4 rounded-xl border border-red-100 bg-red-50/50 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                    <p className="text-sm font-medium text-red-700">{error}</p>
                  </div>
                )}

                {result && (
                  <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Success!</p>
                      <p className="text-xs text-emerald-700 mt-0.5">{result}</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column: Recipient Selection */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="h-full flex flex-col shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                      <UserCheck className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-bold tracking-tight">Recipients</h3>
                  </div>
                  <Badge variant="secondary" className="px-2.5 py-0.5 font-bold text-[10px] uppercase tracking-wider">
                    {loadingRecipients ? "Loading..." : `${internOptions.length + employerOptions.length} Available`}
                  </Badge>
                </div>

                <Tabs defaultValue="interns" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 h-11 p-1 bg-slate-100/50">
                    <TabsTrigger value="interns" className="text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Users className="h-3.5 w-3.5" />
                      Interns
                    </TabsTrigger>
                    <TabsTrigger value="employers" className="text-xs font-bold gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      <Building2 className="h-3.5 w-3.5" />
                      Employers
                    </TabsTrigger>
                  </TabsList>

                  <div className="mt-6 space-y-6">
                    <TabsContent value="interns" className="mt-0 space-y-4 outline-none">
                      {!wantsInterns ? (
                        <div className="py-12 text-center">
                          <div className="p-3 bg-slate-50 rounded-full w-fit mx-auto mb-3">
                            <Users className="h-6 w-6 text-slate-300" />
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">Select 'Interns' in target audience</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id="all-interns"
                                checked={sendAllInterns}
                                onCheckedChange={(v) => {
                                  const checked = Boolean(v);
                                  setSendAllInterns(checked);
                                  if (checked) setSelectedInternIds([]);
                                }}
                                className="h-5 w-5"
                              />
                              <Label htmlFor="all-interns" className="text-sm font-bold cursor-pointer">Select All Interns</Label>
                            </div>
                            <Badge className="bg-primary/10 text-primary border-none text-[10px] font-bold">
                              {internOptions.length} TOTAL
                            </Badge>
                          </div>

                          {!sendAllInterns && (
                            <div className="space-y-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  value={internSearch}
                                  onChange={(e) => setInternSearch(e.target.value)}
                                  placeholder="Filter by name or email..."
                                  className="h-10 pl-10 shadow-sm border-slate-200 text-sm"
                                  disabled={loadingRecipients}
                                />
                              </div>

                              <div className="flex items-center justify-between px-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] font-bold text-primary gap-1.5"
                                  onClick={() => {
                                    const checked = internSelectAllState !== true;
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
                                >
                                  {internSelectAllState === true ? <Square className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
                                  {internSelectAllState === true ? "Deselect Filtered" : "Select Filtered"}
                                </Button>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {selectedInternIds.length} Selected
                                </span>
                              </div>

                              <ScrollArea className="h-[320px] rounded-xl border border-slate-100 bg-white shadow-inner p-1">
                                {filteredInterns.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground italic text-sm">
                                    <Search className="h-8 w-8 text-slate-200 mb-2" />
                                    No results found
                                  </div>
                                ) : (
                                  <div className="divide-y divide-slate-50">
                                    {filteredInterns.map((it) => {
                                      const checked = internIdSet.has(it.id);
                                      return (
                                        <div 
                                          key={it.id} 
                                          className={cn(
                                            "flex items-center gap-4 p-3 transition-colors cursor-pointer hover:bg-slate-50",
                                            checked && "bg-blue-50/30"
                                          )}
                                          onClick={() => {
                                            setSelectedInternIds((prev) => {
                                              const set = new Set(prev);
                                              if (!checked) set.add(it.id);
                                              else set.delete(it.id);
                                              return Array.from(set);
                                            });
                                          }}
                                        >
                                          <Checkbox checked={checked} className="h-4.5 w-4.5" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900 truncate">{it.label.split('(')[0].trim()}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{it.label.includes('(') ? it.label.match(/\(([^)]+)\)/)?.[1] : it.id}</p>
                                          </div>
                                          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </ScrollArea>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>

                    <TabsContent value="employers" className="mt-0 space-y-4 outline-none">
                      {!wantsEmployers ? (
                        <div className="py-12 text-center">
                          <div className="p-3 bg-slate-50 rounded-full w-fit mx-auto mb-3">
                            <Building2 className="h-6 w-6 text-slate-300" />
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">Select 'Employers' in target audience</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id="all-employers"
                                checked={sendAllEmployers}
                                onCheckedChange={(v) => {
                                  const checked = Boolean(v);
                                  setSendAllEmployers(checked);
                                  if (checked) setSelectedEmployerIds([]);
                                }}
                                className="h-5 w-5"
                              />
                              <Label htmlFor="all-employers" className="text-sm font-bold cursor-pointer">Select All Employers</Label>
                            </div>
                            <Badge className="bg-indigo-100 text-indigo-700 border-none text-[10px] font-bold">
                              {employerOptions.length} TOTAL
                            </Badge>
                          </div>

                          {!sendAllEmployers && (
                            <div className="space-y-4">
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input
                                  value={employerSearch}
                                  onChange={(e) => setEmployerSearch(e.target.value)}
                                  placeholder="Filter by company or email..."
                                  className="h-10 pl-10 shadow-sm border-slate-200 text-sm"
                                  disabled={loadingRecipients}
                                />
                              </div>

                              <div className="flex items-center justify-between px-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[11px] font-bold text-indigo-600 gap-1.5"
                                  onClick={() => {
                                    const checked = employerSelectAllState !== true;
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
                                >
                                  {employerSelectAllState === true ? <Square className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
                                  {employerSelectAllState === true ? "Deselect Filtered" : "Select Filtered"}
                                </Button>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {selectedEmployerIds.length} Selected
                                </span>
                              </div>

                              <ScrollArea className="h-[320px] rounded-xl border border-slate-100 bg-white shadow-inner p-1">
                                {filteredEmployers.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground italic text-sm">
                                    <Search className="h-8 w-8 text-slate-200 mb-2" />
                                    No results found
                                  </div>
                                ) : (
                                  <div className="divide-y divide-slate-50">
                                    {filteredEmployers.map((it) => {
                                      const checked = employerIdSet.has(it.id);
                                      return (
                                        <div 
                                          key={it.id} 
                                          className={cn(
                                            "flex items-center gap-4 p-3 transition-colors cursor-pointer hover:bg-slate-50",
                                            checked && "bg-indigo-50/30"
                                          )}
                                          onClick={() => {
                                            setSelectedEmployerIds((prev) => {
                                              const set = new Set(prev);
                                              if (!checked) set.add(it.id);
                                              else set.delete(it.id);
                                              return Array.from(set);
                                            });
                                          }}
                                        >
                                          <Checkbox checked={checked} className="h-4.5 w-4.5" />
                                          <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-900 truncate">{it.label.split('(')[0].trim()}</p>
                                            <p className="text-[11px] text-slate-500 truncate">{it.label.includes('(') ? it.label.match(/\(([^)]+)\)/)?.[1] : it.id}</p>
                                          </div>
                                          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </ScrollArea>
                            </div>
                          )}
                        </>
                      )}
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
              <div className="p-4 bg-slate-50/80 mt-auto border-t border-slate-100">
                <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500 leading-tight">
                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                  <p>Broadcast mode sends to all users of the group, bypassing individual selection.</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
