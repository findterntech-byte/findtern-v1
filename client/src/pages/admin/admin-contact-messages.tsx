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

  return (
    <AdminLayout title="Contact Messages" description="Messages submitted from the Contact Us form.">
      <Card className="border-none shadow-sm">
        <div className="border-b px-6 py-4">
          <div className="text-sm font-medium text-muted-foreground">Inbox</div>
        </div>

        <div className="px-4 pt-4">
          <div className="rounded-xl border bg-background p-3">
            <div className="grid gap-3 md:grid-cols-12">
              <div className="md:col-span-3">
                <Input
                  placeholder="Search (email / subject / message)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Select value={filterKind} onValueChange={setFilterKind}>
                  <SelectTrigger>
                    <SelectValue placeholder="Kind" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All kinds</SelectItem>
                    <SelectItem value="feedback">Feedback</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2">
                <Select value={filterHasUploads} onValueChange={setFilterHasUploads}>
                  <SelectTrigger>
                    <SelectValue placeholder="Uploads" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All uploads</SelectItem>
                    <SelectItem value="yes">Has uploads</SelectItem>
                    <SelectItem value="no">No uploads</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-1 flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full md:w-auto"
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
                  Clear
                </Button>
              </div>

              <div className="md:col-span-3">
                <Select value={filterQueryType} onValueChange={setFilterQueryType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Query type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All query types</SelectItem>
                    {queryTypeOptions.map((qt) => (
                      <SelectItem key={qt} value={qt}>
                        {qt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3">
                <Select value={filterCountry} onValueChange={setFilterCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countryOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-6 flex items-center justify-between text-xs text-muted-foreground">
                <div>
                  Showing <span className="font-medium text-foreground">{filteredItems.length}</span> of{" "}
                  <span className="font-medium text-foreground">{enrichedItems.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto px-4 py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>                <TableHead>Query Type</TableHead>
                <TableHead>Country</TableHead>                <TableHead>Subject</TableHead>
                <TableHead>Uploads</TableHead>
                <TableHead>Message</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    No messages yet.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((x) => {
                  const m = x.message;
                  const meta = x.meta;
                  const uploads = x.uploads;
                  return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Badge variant={m.isRead ? "outline" : "default"}>{m.isRead ? "Read" : "New"}</Badge>
                    </TableCell>
                    <TableCell>{meta.kind ? meta.kind : "-"}</TableCell>
                    <TableCell>{meta.role ? meta.role : "-"}</TableCell>
                    <TableCell className="font-medium">{m.firstName} {m.lastName}</TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{m.phone ?? "-"}</TableCell>
                    <TableCell>{m.queryType ?? '-'}</TableCell>
                    <TableCell>{m.countryCode ?? '-'}</TableCell>
                    <TableCell>{m.subject ?? "-"}</TableCell>
                    <TableCell className="max-w-[220px] whitespace-pre-wrap break-words">
                      {uploads.length === 0 ? (
                        "-"
                      ) : (
                        <div>
                          {uploads.slice(0, 4).map((u, idx) => (
                            <div key={u + idx}>
                              <a href={u} target="_blank" rel="noreferrer" className="underline">
                                {isVideoUrl(u) ? "Video" : `Attachment ${idx + 1}`}
                              </a>
                            </div>
                          ))}
                          {uploads.length > 4 ? (
                            <div className="text-[11px] text-muted-foreground mt-1">+{uploads.length - 4} more</div>
                          ) : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[420px] whitespace-pre-wrap break-words">
                      {String(meta.body ?? "").trim() || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelected(m);
                            setViewOpen(true);
                          }}
                        >
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => markReadMutation.mutate({ id: m.id, isRead: !m.isRead })}
                          disabled={markReadMutation.isPending}
                        >
                          {m.isRead ? "Mark Unread" : "Mark Read"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(m.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Delete
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
      </Card>

      <Dialog
        open={viewOpen}
        onOpenChange={(open) => {
          setViewOpen(open);
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Message details</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.firstName} ${selected.lastName} • ${new Date(selected.createdAt).toLocaleString()}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selected && selectedMeta ? (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border bg-card p-4">
                    <div className="text-sm font-semibold text-foreground">Contact</div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Email:</span> {selected.email}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Phone:</span> {selected.phone ?? "-"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Country:</span> {selected.countryCode ?? "-"}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-card p-4">
                    <div className="text-sm font-semibold text-foreground">Context</div>
                    <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Status:</span> {selected.isRead ? "Read" : "New"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Kind:</span> {selectedMeta.kind ?? "-"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Role:</span> {selectedMeta.role ?? "-"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Query Type:</span> {selected.queryType ?? "-"}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Subject:</span> {selected.subject ?? "-"}
                      </div>
                      {selectedMeta.metaMap.pageUrl ? (
                        <div>
                          <span className="font-medium text-foreground">Page:</span>{" "}
                          <a
                            href={selectedMeta.metaMap.pageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            {selectedMeta.metaMap.pageUrl}
                          </a>
                        </div>
                      ) : null}
                      {selectedMeta.metaMap.userId ? (
                        <div>
                          <span className="font-medium text-foreground">User ID:</span> {selectedMeta.metaMap.userId}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <div className="text-sm font-semibold text-foreground">Message</div>
                  <div className="mt-2 rounded-lg border bg-background p-3">
                    <div className="whitespace-pre-wrap break-words text-sm text-foreground">
                      {String(selectedMeta.body ?? "").trim() || "-"}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border bg-card p-4">
                  <div className="text-sm font-semibold text-foreground">Uploads</div>
                  {attachmentsToPreview.length === 0 ? (
                    <div className="mt-2 text-sm text-muted-foreground">No uploads.</div>
                  ) : (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {attachmentsToPreview.map((u, idx) => {
                        if (isVideoUrl(u)) {
                          return (
                            <div key={`${u}-${idx}`} className="rounded-xl border bg-background p-2">
                              <video src={u} controls className="w-full rounded-lg" />
                              <div className="mt-2 text-xs text-muted-foreground break-all">
                                <a href={u} target="_blank" rel="noreferrer" className="underline">
                                  {getFileLabelFromUrl(u)}
                                </a>
                              </div>
                            </div>
                          );
                        }

                        if (isImageUrl(u)) {
                          return (
                            <a
                              key={`${u}-${idx}`}
                              href={u}
                              target="_blank"
                              rel="noreferrer"
                              className="group rounded-xl border bg-background p-2 hover:bg-muted/40 transition-colors"
                            >
                              <img src={u} alt={getFileLabelFromUrl(u)} className="w-full h-44 object-cover rounded-lg" loading="lazy" />
                              <div className="mt-2 text-xs text-muted-foreground break-all group-hover:underline">
                                {getFileLabelFromUrl(u)}
                              </div>
                            </a>
                          );
                        }

                        return (
                          <div key={`${u}-${idx}`} className="rounded-xl border bg-background p-3">
                            <div className="text-sm font-medium text-foreground">File</div>
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              <a href={u} target="_blank" rel="noreferrer" className="underline">
                                {getFileLabelFromUrl(u)}
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
