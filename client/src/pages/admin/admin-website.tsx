import React from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Pencil, Trash2, ImageUp, Search, ChevronLeft, ChevronRight, Eye } from "lucide-react";

type CmsTab = "blogs" | "skills" | "faces" | "partners" | "pricing" | "faq" | "terms";

async function readFileAsDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function TermsSection() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ terms: { title: string; bodyHtml: string } | null }>({
    queryKey: ["/api/admin/website/terms"],
  });

  const [form, setForm] = React.useState({
    title: "Terms and Conditions",
    bodyHtml: "",
  });

  React.useEffect(() => {
    const nextTitle = data?.terms?.title ?? "Terms and Conditions";
    const nextBody = data?.terms?.bodyHtml ?? "";
    setForm({ title: nextTitle, bodyHtml: nextBody });
  }, [data?.terms?.title, data?.terms?.bodyHtml]);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("PUT", "/api/admin/website/terms", {
        title: payload.title,
        bodyHtml: payload.bodyHtml,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/terms"] });
    },
  });

  return (
    <SectionShell title="Terms & Conditions" description="Edit the Terms & Conditions page content.">
      <div className="space-y-4">
        <div className="grid gap-2">
          <div className="text-sm font-medium">Title</div>
          <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
        </div>

        <div className="grid gap-2">
          <div className="text-sm font-medium">Content</div>
          <RichTextEditor value={form.bodyHtml} onChange={(next) => setForm((p) => ({ ...p, bodyHtml: next }))} />
        </div>

        <div className="flex items-center justify-end gap-2">
          <Button
            className="bg-[#0E6049] hover:bg-[#0b4b3a]"
            onClick={() => saveMutation.mutate(form)}
            disabled={isLoading || saveMutation.isPending || !form.title.trim() || !form.bodyHtml.trim()}
          >
            Save
          </Button>
        </div>

        {isLoading ? (
          <div className="text-xs text-muted-foreground">Loading...</div>
        ) : null}
      </div>
    </SectionShell>
  );
}

function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [mode, setMode] = React.useState<"visual" | "html">("visual");

  React.useEffect(() => {
    if (mode !== "visual") return;
    const el = ref.current;
    if (!el) return;
    const next = value ?? "";
    if (el.innerHTML !== next) el.innerHTML = next;
  }, [value, mode]);

  const emit = () => {
    const el = ref.current;
    if (!el) return;
    onChange(el.innerHTML);
  };

  const exec = (command: string, commandValue?: string) => {
    if (typeof document === "undefined") return;
    try {
      document.execCommand(command, false, commandValue);
    } catch {
      // ignore
    }
    emit();
    ref.current?.focus();
  };

  const setBlock = (tag: string) => {
    exec("formatBlock", tag);
  };

  const promptLink = () => {
    const url = window.prompt("Enter link URL");
    if (!url) return;
    exec("createLink", url);
  };

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File too large. Please upload an image under 2MB.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      exec("insertImage", dataUrl);
    } catch {
      alert("Failed to upload image.");
    }
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap items-center gap-2 border-b p-2">
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")}>
          B
        </Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")}>
          I
        </Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")}>
          U
        </Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("strikeThrough")}>
          S
        </Button>

        <div className="mx-1 h-6 w-px bg-border" />

        <select
          className="h-8 rounded-md border bg-background px-2 text-xs"
          value=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            setBlock(v);
            e.target.value = "";
          }}
        >
          <option value="">Paragraph</option>
          <option value="p">Paragraph</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="blockquote">Quote</option>
        </select>

        <div className="mx-1 h-6 w-px bg-border" />

        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertUnorderedList")}>
          UL
        </Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("insertOrderedList")}>
          OL
        </Button>

        <div className="mx-1 h-6 w-px bg-border" />

        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyLeft")}>
          Left
        </Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyCenter")}>
          Center
        </Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyRight")}>
          Right
        </Button>
        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("justifyFull")}>
          Justify
        </Button>

        <div className="mx-1 h-6 w-px bg-border" />

        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={promptLink}>
          Link
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          Image
        </Button>

        <div className="mx-1 h-6 w-px bg-border" />

        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")}>
          Clear
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <Button
            type="button"
            variant={mode === "visual" ? "default" : "outline"}
            size="sm"
            className={mode === "visual" ? "bg-[#0E6049] hover:bg-[#0b4b3a]" : ""}
            onClick={() => setMode("visual")}
          >
            Visual
          </Button>
          <Button
            type="button"
            variant={mode === "html" ? "default" : "outline"}
            size="sm"
            className={mode === "html" ? "bg-[#0E6049] hover:bg-[#0b4b3a]" : ""}
            onClick={() => setMode("html")}
          >
            HTML
          </Button>
        </div>
      </div>

      {mode === "html" ? (
        <Textarea className="min-h-[220px] border-0" value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <div
          ref={ref}
          className="min-h-[220px] p-3 text-sm outline-none"
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
        />
      )}
    </div>
  );
}

function PartnersSection() {
  const qc = useQueryClient();

  const [filterText, setFilterText] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Partner | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    logoUrl: "",
    href: "",
    sortOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery<{ items: Partner[] }>({
    queryKey: ["/api/admin/website/partners"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/website/partners", {
        name: payload.name,
        logoUrl: payload.logoUrl,
        href: payload.href || null,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/partners"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const res = await apiRequest("PUT", `/api/admin/website/partners/${id}`, {
        name: payload.name,
        logoUrl: payload.logoUrl,
        href: payload.href || null,
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/partners"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/website/partners/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/partners"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", logoUrl: "", href: "", sortOrder: 0, isActive: true });
    setOpen(true);
  };

  const openEdit = (item: Partner) => {
    setEditing(item);
    setForm({
      name: item.name,
      logoUrl: item.logoUrl,
      href: item.href ?? "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
      return;
    }
    createMutation.mutate(form);
  };

  const items = data?.items ?? [];
  const { paged, page, setPage, totalPages } = useFilterPagination(
    items,
    filterText,
    (item, q) => {
      const p = item as Partner;
      return (
        p.name.toLowerCase().includes(q) ||
        p.logoUrl.toLowerCase().includes(q) ||
        (p.href ?? "").toLowerCase().includes(q)
      );
    },
  );

  return (
    <SectionShell title="Partners" description="Partner logos shown on website" onAdd={openCreate}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search partners..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
          />
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Partner" : "Add Partner"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Name</div>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <ImageUrlField
              label="Logo URL"
              value={form.logoUrl}
              onChange={(next) => setForm((p) => ({ ...p, logoUrl: next }))}
            />

            <div className="grid gap-2">
              <div className="text-sm font-medium">Link (optional)</div>
              <Input value={form.href} onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Sort Order</div>
                <Input
                  type="number"
                  value={String(form.sortOrder)}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Status</div>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.isActive ? "1" : "0"}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "1" }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0E6049] hover:bg-[#0b4b3a]"
              onClick={submit}
              disabled={createMutation.isPending || updateMutation.isPending || !form.name.trim() || !form.logoUrl.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No partners yet.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>
                    <img src={item.logoUrl} alt={item.name} className="h-8 w-auto max-w-[120px] rounded" />
                  </TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>{item.isActive ? "Active" : "Hidden"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </SectionShell>
  );
}

function ImageUrlField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  const inputId = React.useId();

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Please upload an image under 5MB.");
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    onChange(dataUrl);
  };

  const looksLikeImage = value.startsWith("data:image") || /^https?:\/\//i.test(value);

  return (
    <div className="grid gap-2">
      <div className="text-sm font-medium">{label}</div>
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
        <div className="flex items-center gap-2">
          <input id={inputId} type="file" accept="image/*" className="hidden" onChange={onPick} />
          <Button type="button" variant="outline" className="gap-2" onClick={() => document.getElementById(inputId)?.click()}>
            <ImageUp className="h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>
      {value && looksLikeImage ? (
        <div className="rounded-md border bg-muted/30 p-2">
          <img src={value} alt="preview" className="h-16 w-auto max-w-full rounded " />
        </div>
      ) : null}
    </div>
  );
}

function useFilterPagination<T>(items: T[], filterText: string, filterFn: (item: T, q: string) => boolean) {
  const q = filterText.trim().toLowerCase();
  const filtered = React.useMemo(() => {
    if (!q) return items;
    return items.filter((i) => filterFn(i, q));
  }, [items, q, filterFn]);

  const [page, setPage] = React.useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  React.useEffect(() => {
    setPage(1);
  }, [q]);

  React.useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const paged = React.useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  return { q, filtered, paged, page, setPage, pageSize, totalPages };
}

type SliderItem = {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isActive: boolean;
};

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverImageUrl: string | null;
  bannerImageUrl: string | null;
  body: string;
  status: string;
  publishedAt: string | null;
};

type FeaturedSkill = {
  id: string;
  title: string;
  iconClass: string | null;
  metaText: string | null;
  resourceCount: number;
  href: string | null;
  sortOrder: number;
  isActive: boolean;
};

type HappyFace = {
  id: string;
  quote: string;
  title: string;
  name: string;
  company: string;
  avatarUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

type Partner = {
  id: string;
  name: string;
  logoUrl: string;
  href: string | null;
  sortOrder: number;
  isActive: boolean;
};

type Plan = {
  id: string;
  name: string;
  priceText: string | null;
  subtitle: string | null;
  features: string[];
  sortOrder: number;
  isActive: boolean;
};

type FaqItem = {
  id: string;
  category: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

function useCmsTab(): [CmsTab, (t: CmsTab) => void] {
  const [, setLocation] = useLocation();

  const getTabFromSearch = React.useCallback((search: string): CmsTab => {
    const allowed: CmsTab[] = ["blogs", "skills", "faces", "partners", "pricing", "faq", "terms"];
    const params = new URLSearchParams((search ?? "").replace(/^\?/, ""));
    const raw = params.get("tab") ?? "blogs";
    if (allowed.includes(raw as CmsTab)) return raw as CmsTab;
    return "blogs";
  }, []);

  const [currentTab, setCurrentTab] = React.useState<CmsTab>(() => {
    if (typeof window === "undefined") return "blogs";
    return getTabFromSearch(window.location.search);
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;

    const onUrlChange = () => {
      setCurrentTab(getTabFromSearch(window.location.search));
    };

    const w = window as any;
    if (!w.__findternHistoryPatched) {
      w.__findternHistoryPatched = true;
      const origPushState = history.pushState.bind(history);
      const origReplaceState = history.replaceState.bind(history);

      history.pushState = ((...args: Parameters<History["pushState"]>) => {
        const ret = origPushState(...args);
        window.dispatchEvent(new Event("locationchange"));
        return ret;
      }) as History["pushState"];

      history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
        const ret = origReplaceState(...args);
        window.dispatchEvent(new Event("locationchange"));
        return ret;
      }) as History["replaceState"];
    }

    window.addEventListener("popstate", onUrlChange);
    window.addEventListener("hashchange", onUrlChange);
    window.addEventListener("locationchange", onUrlChange as any);
    onUrlChange();

    return () => {
      window.removeEventListener("popstate", onUrlChange);
      window.removeEventListener("hashchange", onUrlChange);
      window.removeEventListener("locationchange", onUrlChange as any);
    };
  }, [getTabFromSearch]);

  const setTab = (next: CmsTab) => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    setLocation(url.pathname + url.search);
    setCurrentTab(next);
  };

  return [currentTab, setTab];
}

function SectionShell({
  title,
  description,
  onAdd,
  children,
}: {
  title: string;
  description?: string;
  onAdd?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-none shadow-sm">
      <div className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold text-[#0E6049]">{title}</div>
          {description ? (
            <div className="text-xs text-muted-foreground mt-1">{description}</div>
          ) : null}
        </div>
        {onAdd ? (
          <Button className="bg-[#0E6049] hover:bg-[#0b4b3a]" onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        ) : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </Card>
  );
}

export function SliderSection() {
  const qc = useQueryClient();

  const defaultSlideTitle = "Hero Banner";

  const [filterText, setFilterText] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<SliderItem | null>(null);
  const [form, setForm] = React.useState({
    title: defaultSlideTitle,
    subtitle: "",
    imageUrl: "",
    sortOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery<{ items: SliderItem[] }>({
    queryKey: ["/api/admin/website/slider"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/website/slider", {
        ...payload,
        subtitle: payload.subtitle || null,
        imageUrl: payload.imageUrl || null,
        ctaText: null,
        ctaHref: null,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/slider"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const res = await apiRequest("PUT", `/api/admin/website/slider/${id}`, {
        ...payload,
        subtitle: payload.subtitle || null,
        imageUrl: payload.imageUrl || null,
        ctaText: null,
        ctaHref: null,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/slider"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/website/slider/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/slider"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: defaultSlideTitle,
      subtitle: "",
      imageUrl: "",
      sortOrder: 0,
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (item: SliderItem) => {
    setEditing(item);
    setForm({
      title: item.title || defaultSlideTitle,
      subtitle: item.subtitle ?? "",
      imageUrl: item.imageUrl ?? "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
      return;
    }
    createMutation.mutate(form);
  };

  const items = data?.items ?? [];
  const { paged, page, setPage, totalPages, filtered } = useFilterPagination(
    items,
    filterText,
    (item, q) => {
      const s = item as SliderItem;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.subtitle ?? "").toLowerCase().includes(q) ||
        (s.imageUrl ?? "").toLowerCase().includes(q)
      );
    },
  );

  return (
    <SectionShell
      title="Slider"
      description="Homepage hero slider items"
      onAdd={openCreate}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Slide" : "Add Slide"}</DialogTitle>
            <DialogDescription>
              Manage hero banner images (image, order, visibility).
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <ImageUrlField
                label="Image URL"
                value={form.imageUrl}
                onChange={(next) => setForm((p) => ({ ...p, imageUrl: next }))}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Sort Order</div>
                <Input
                  type="number"
                  value={String(form.sortOrder)}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Active</div>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.isActive ? "1" : "0"}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "1" }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </div>
            </div>
          </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[#0E6049] hover:bg-[#0b4b3a]"
            onClick={submit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <div className="flex flex-col gap-3 px-1 pb-2 md:flex-row md:items-center md:justify-between">
      <div className="relative w-full md:max-w-[420px]">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Search slides..."
          className="pl-9"
        />
      </div>
      <div className="text-xs text-muted-foreground">
        {filtered.length} result(s)
      </div>
    </div>

    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                Loading...
              </TableCell>
            </TableRow>
          ) : items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                No slides yet.
              </TableCell>
            </TableRow>
          ) : (
            paged.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.title}</TableCell>
                <TableCell>{item.sortOrder}</TableCell>
                <TableCell>{item.isActive ? "Active" : "Hidden"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>

    <div className="flex items-center justify-end gap-2 pt-3">
      <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="text-xs text-muted-foreground">
        Page {page} / {totalPages}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setPage(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </SectionShell>
);
}

export function BlogsSection() {
  const qc = useQueryClient();

  const [filterText, setFilterText] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BlogPost | null>(null);
  const [form, setForm] = React.useState({
    slug: "",
    title: "",
    excerpt: "",
    coverImageUrl: "",
    bannerImageUrl: "",
    body: "",
    status: "draft",
  });

  const { data, isLoading } = useQuery<{ posts: BlogPost[] }>({
    queryKey: ["/api/admin/website/blogs"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/website/blogs", {
        ...payload,
        excerpt: payload.excerpt || null,
        coverImageUrl: payload.coverImageUrl || null,
        bannerImageUrl: payload.bannerImageUrl || null,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/blogs"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const res = await apiRequest("PUT", `/api/admin/website/blogs/${id}`, {
        ...payload,
        excerpt: payload.excerpt || null,
        coverImageUrl: payload.coverImageUrl || null,
        bannerImageUrl: payload.bannerImageUrl || null,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/blogs"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/website/blogs/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/blogs"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ slug: "", title: "", excerpt: "", coverImageUrl: "", bannerImageUrl: "", body: "", status: "draft" });
    setOpen(true);
  };

  const openEdit = (post: BlogPost) => {
    setEditing(post);
    setForm({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt ?? "",
      coverImageUrl: post.coverImageUrl ?? "",
      bannerImageUrl: post.bannerImageUrl ?? "",
      body: post.body,
      status: post.status,
    });
    setOpen(true);
  };

  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
      return;
    }
    createMutation.mutate(form);
  };

  const posts = data?.posts ?? [];
  const { paged, page, setPage, totalPages, filtered } = useFilterPagination(
    posts,
    filterText,
    (post, q) => {
      const p = post as BlogPost;
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        p.status.toLowerCase().includes(q)
      );
    },
  );

  const insertIntoBody = (url: string) => {
    if (!url) return;
    setForm((p) => ({
      ...p,
      body: `${p.body}${p.body.trim() ? "\n\n" : ""}${url}\n`,
    }));
  };

  return (
    <SectionShell
      title="Blogs"
      description="Create and publish website blog posts"
      onAdd={openCreate}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[820px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Blog" : "Add Blog"}</DialogTitle>
            <DialogDescription>
              Slug must be unique (example: hiring-interns-2026). Published posts will show on website.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Slug</div>
                <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Status</div>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Title</div>
              <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Excerpt</div>
              <Textarea value={form.excerpt} onChange={(e) => setForm((p) => ({ ...p, excerpt: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <ImageUrlField
                label="Cover Image URL"
                value={form.coverImageUrl}
                onChange={(next) => setForm((p) => ({ ...p, coverImageUrl: next }))}
              />
            
            </div>

            <div className="grid gap-2">
              <ImageUrlField
                label="Banner Image URL"
                value={form.bannerImageUrl}
                onChange={(next) => setForm((p) => ({ ...p, bannerImageUrl: next }))}
              />
              
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Body</div>
              <RichTextEditor value={form.body} onChange={(next) => setForm((p) => ({ ...p, body: next }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0E6049] hover:bg-[#0b4b3a]"
              onClick={submit}
              disabled={createMutation.isPending || updateMutation.isPending || !form.slug.trim() || !form.title.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 px-1 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-[420px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search blogs..."
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} result(s)</div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : posts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No blog posts.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((post) => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>{post.slug}</TableCell>
                  <TableCell>{post.status}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(post)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(post.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </SectionShell>
  );
}

function FeaturedSkillsSection() {
  const qc = useQueryClient();

  const [filterText, setFilterText] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FeaturedSkill | null>(null);
  const [form, setForm] = React.useState({
    resourceCount: 0,
    title: "",
  });

  const { data, isLoading } = useQuery<{ items: FeaturedSkill[] }>({
    queryKey: ["/api/admin/website/skills"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const res = await apiRequest("PUT", `/api/admin/website/skills/${id}`, {
        resourceCount: payload.resourceCount,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/skills"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const openView = (item: FeaturedSkill) => {
    setEditing(item);
    setForm({
      title: item.title,
      resourceCount: Number((item as any).resourceCount ?? 0),
    });
    setOpen(true);
  };

  const submit = () => {
    if (!editing) return;
    updateMutation.mutate({ id: editing.id, payload: form });
  };

  const items = data?.items ?? [];

  const { paged, page, setPage, totalPages, filtered } = useFilterPagination(
    items,
    filterText,
    (item, q) => {
      const s = item as FeaturedSkill;
      return (
        s.title.toLowerCase().includes(q) ||
        (s.iconClass ?? "").toLowerCase().includes(q) ||
        (s.metaText ?? "").toLowerCase().includes(q) ||
        (s.href ?? "").toLowerCase().includes(q)
      );
    },
  );

  return (
    <SectionShell
      title="Featured Skills"
      description="Cards shown on website homepage"
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>View Skill</DialogTitle>
            <DialogDescription>Only resource count can be updated.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Title</div>
              <Input value={form.title} disabled />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Resources Count</div>
              <Input
                type="number"
                value={String(form.resourceCount)}
                onChange={(e) => setForm((p) => ({ ...p, resourceCount: Number(e.target.value) }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0E6049] hover:bg-[#0b4b3a]"
              onClick={submit}
              disabled={updateMutation.isPending || !editing}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 px-1 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-[420px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search testimonials..."
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} result(s)</div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                  No skills yet.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>{item.isActive ? "Active" : "Hidden"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openView(item)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </SectionShell>
  );
}

function HappyFacesSection() {
  const qc = useQueryClient();

  const [filterText, setFilterText] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<HappyFace | null>(null);
  const [form, setForm] = React.useState({
    quote: "",
    title: "",
    name: "",
    company: "",
    avatarUrl: "",
    sortOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery<{ items: HappyFace[] }>({
    queryKey: ["/api/admin/website/faces"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/website/faces", {
        ...payload,
        avatarUrl: payload.avatarUrl || null,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/faces"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const res = await apiRequest("PUT", `/api/admin/website/faces/${id}`, {
        ...payload,
        avatarUrl: payload.avatarUrl || null,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/faces"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/website/faces/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/faces"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      quote: "",
      title: "",
      name: "",
      company: "",
      avatarUrl: "",
      sortOrder: 0,
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (item: HappyFace) => {
    setEditing(item);
    setForm({
      quote: item.quote,
      title: item.title,
      name: item.name,
      company: item.company,
      avatarUrl: item.avatarUrl ?? "",
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
      return;
    }
    createMutation.mutate(form);
  };

  const items = data?.items ?? [];

  const { paged, page, setPage, totalPages, filtered } = useFilterPagination(
    items,
    filterText,
    (item, q) => {
      const t = item as HappyFace;
      return (
        t.quote.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.company.toLowerCase().includes(q)
      );
    },
  );

  return (
    <SectionShell
      title="Happy Faces"
      description="Testimonials section for website"
      onAdd={openCreate}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[860px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Testimonial" : "Add Testimonial"}</DialogTitle>
            <DialogDescription>Manage testimonials (quote, person, company, avatar, order).</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Quote</div>
              <Textarea value={form.quote} onChange={(e) => setForm((p) => ({ ...p, quote: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Title</div>
                <Input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <ImageUrlField
                  label="Avatar URL"
                  value={form.avatarUrl}
                  onChange={(next) => setForm((p) => ({ ...p, avatarUrl: next }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Name</div>
                <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Company</div>
                <Input value={form.company} onChange={(e) => setForm((p) => ({ ...p, company: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Sort Order</div>
                <Input
                  type="number"
                  value={String(form.sortOrder)}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Active</div>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.isActive ? "1" : "0"}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "1" }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0E6049] hover:bg-[#0b4b3a]"
              onClick={submit}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !form.quote.trim() ||
                !form.title.trim() ||
                !form.name.trim() ||
                !form.company.trim()
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col gap-3 px-1 pb-2 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-[420px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="Search testimonials..."
            className="pl-9"
          />
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} result(s)</div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No testimonials yet.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>{item.isActive ? "Active" : "Hidden"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </SectionShell>
  );
}

function PlansSection() {
  const qc = useQueryClient();

  const [filterText, setFilterText] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Plan | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    priceText: "",
    subtitle: "",
    featuresText: "",
    sortOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery<{ items: Plan[] }>({
    queryKey: ["/api/admin/website/plans"],
  });

  const parseFeatures = (text: string) => {
    return text
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/website/plans", {
        name: payload.name,
        priceText: payload.priceText || null,
        subtitle: payload.subtitle || null,
        features: parseFeatures(payload.featuresText),
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/plans"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const res = await apiRequest("PUT", `/api/admin/website/plans/${id}`, {
        name: payload.name,
        priceText: payload.priceText || null,
        subtitle: payload.subtitle || null,
        features: parseFeatures(payload.featuresText),
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/plans"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/website/plans/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/plans"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: "",
      priceText: "",
      subtitle: "",
      featuresText: "",
      sortOrder: 0,
      isActive: true,
    });
    setOpen(true);
  };

  const openEdit = (item: Plan) => {
    setEditing(item);
    setForm({
      name: item.name,
      priceText: item.priceText ?? "",
      subtitle: item.subtitle ?? "",
      featuresText: (item.features ?? []).join("\n"),
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
      return;
    }
    createMutation.mutate(form);
  };

  const items = data?.items ?? [];

  const { paged, page, setPage, totalPages, filtered } = useFilterPagination(
    items,
    filterText,
    (item, q) => {
      const p = item as Plan;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.priceText ?? "").toLowerCase().includes(q) ||
        (p.subtitle ?? "").toLowerCase().includes(q)
      );
    },
  );

  return (
    <SectionShell
      title="Plans"
      description="Pricing plans shown on website"
      onAdd={openCreate}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[860px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Plan" : "Add Plan"}</DialogTitle>
            <DialogDescription>Features: one feature per line.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Name</div>
              <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Price Text</div>
                <Input value={form.priceText} onChange={(e) => setForm((p) => ({ ...p, priceText: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Subtitle</div>
                <Input value={form.subtitle} onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Features</div>
              <Textarea
                className="min-h-[160px]"
                value={form.featuresText}
                onChange={(e) => setForm((p) => ({ ...p, featuresText: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Sort Order</div>
                <Input
                  type="number"
                  value={String(form.sortOrder)}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Active</div>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.isActive ? "1" : "0"}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "1" }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0E6049] hover:bg-[#0b4b3a]"
              onClick={submit}
              disabled={createMutation.isPending || updateMutation.isPending || !form.name.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No plans yet.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.priceText ?? ""}</TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>{item.isActive ? "Active" : "Hidden"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground">Page {page} / {totalPages}</div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </SectionShell>
  );
}

function FaqSection() {
  const qc = useQueryClient();

  const [filterText, setFilterText] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<FaqItem | null>(null);
  const [form, setForm] = React.useState({
    category: "",
    question: "",
    answer: "",
    sortOrder: 0,
    isActive: true,
  });

  const { data, isLoading } = useQuery<{ items: FaqItem[] }>({
    queryKey: ["/api/admin/website/faq"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/website/faq", payload);
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/faq"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const res = await apiRequest("PUT", `/api/admin/website/faq/${id}`, payload);
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/faq"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/website/faq/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/faq"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ category: "", question: "", answer: "", sortOrder: 0, isActive: true });
    setOpen(true);
  };

  const openEdit = (item: FaqItem) => {
    setEditing(item);
    setForm({
      category: item.category,
      question: item.question,
      answer: item.answer,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    });
    setOpen(true);
  };

  const submit = () => {
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload: form });
      return;
    }
    createMutation.mutate(form);
  };

  const items = data?.items ?? [];

  const { paged, page, setPage, totalPages, filtered } = useFilterPagination(
    items,
    filterText,
    (item, q) => {
      const f = item as FaqItem;
      return (
        f.category.toLowerCase().includes(q) ||
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q)
      );
    },
  );

  return (
    <SectionShell
      title="FAQ"
      description="Frequently asked questions for website"
      onAdd={openCreate}
    >
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[860px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit FAQ" : "Add FAQ"}</DialogTitle>
            <DialogDescription>Create FAQ items with category, question, answer, and order.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <div className="text-sm font-medium">Category</div>
              <Input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Question</div>
              <Input value={form.question} onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))} />
            </div>

            <div className="grid gap-2">
              <div className="text-sm font-medium">Answer</div>
              <Textarea value={form.answer} onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Sort Order</div>
                <Input
                  type="number"
                  value={String(form.sortOrder)}
                  onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Active</div>
                <select
                  className="h-10 rounded-md border bg-background px-3 text-sm"
                  value={form.isActive ? "1" : "0"}
                  onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "1" }))}
                >
                  <option value="1">Active</option>
                  <option value="0">Hidden</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0E6049] hover:bg-[#0b4b3a]"
              onClick={submit}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !form.category.trim() ||
                !form.question.trim() ||
                !form.answer.trim()
              }
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Category</TableHead>
              <TableHead>Question</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No FAQs yet.
                </TableCell>
              </TableRow>
            ) : (
              paged.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="max-w-[520px] truncate">{item.question}</TableCell>
                  <TableCell>{item.sortOrder}</TableCell>
                  <TableCell>{item.isActive ? "Active" : "Hidden"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-2 pt-3">
        <Button variant="outline" size="sm" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-xs text-muted-foreground">
          Page {page} / {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </SectionShell>
  );
}

export function PlaceholderSection({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <SectionShell title={title} description={subtitle}>
      <div className="rounded-lg border bg-background p-6 text-sm text-muted-foreground">
        Coming next: CRUD UI + DB tables + API endpoints.
      </div>
    </SectionShell>
  );
}

function PricingSection() {
  const qc = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<any | null>(null);
  const [form, setForm] = React.useState({
    slug: "",
    displayName: "",
    region: "",
    currency: "INR",
    priceHourly: "0.00",
    perHireCharge: "0.00",
    internshipDuration: "",
    gstApplicable: true,
    featuresText: "",
    isActive: true,
    sortOrder: 0,
  });

  const { data, isLoading } = useQuery<{ items: any[] }>({
    queryKey: ["/api/admin/website/pricing"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      // convert major units to minor (cents/paise)
      const priceHourlyMinor = Math.round(Number(payload.priceHourly || 0) * 100);
      const perHireMinor = Math.round(Number(payload.perHireCharge || 0) * 100);
      const res = await apiRequest("POST", "/api/admin/website/pricing", {
        slug: payload.slug,
        displayName: payload.displayName,
        region: payload.region || null,
        currency: payload.currency,
        priceHourlyMinor: priceHourlyMinor,
        perHireChargeMinor: perHireMinor,
        internshipDuration: payload.internshipDuration || null,
        features: payload.featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
        gstApplicable: Boolean(payload.gstApplicable),
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/pricing"] });
      setOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const priceHourlyMinor = Math.round(Number(payload.priceHourly || 0) * 100);
      const perHireMinor = Math.round(Number(payload.perHireCharge || 0) * 100);
      const res = await apiRequest("PUT", `/api/admin/website/pricing/${id}`, {
        slug: payload.slug,
        displayName: payload.displayName,
        region: payload.region || null,
        currency: payload.currency,
        priceHourlyMinor: priceHourlyMinor,
        perHireChargeMinor: perHireMinor,
        internshipDuration: payload.internshipDuration || null,
        features: payload.featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
        gstApplicable: Boolean(payload.gstApplicable),
        sortOrder: payload.sortOrder,
        isActive: payload.isActive,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/pricing"] });
      setOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/website/pricing/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/website/pricing"] });
    },
  });

  const openCreate = () => {
    setEditing(null);
    setForm({
      slug: "",
      displayName: "",
      region: "",
      currency: "INR",
      priceHourly: "0.00",
      perHireCharge: "0.00",
      internshipDuration: "",
      gstApplicable: true,
      featuresText: "",
      isActive: true,
      sortOrder: 0,
    });
    setOpen(true);
  };

  const openEdit = (item: any) => {
    setEditing(item);
    setForm({
      slug: item.slug,
      displayName: item.displayName,
      region: item.region ?? "",
      currency: item.currency,
      priceHourly: ((item.priceHourlyMinor ?? 0) / 100).toFixed(2),
      perHireCharge: ((item.perHireChargeMinor ?? 0) / 100).toFixed(2),
      internshipDuration: item.internshipDuration ?? "",
      gstApplicable: Boolean(item.gstApplicable),
      featuresText: (item.features ?? []).join("\n"),
      isActive: item.isActive,
      sortOrder: item.sortOrder,
    });
    setOpen(true);
  };

  const items = data?.items ?? [];

  const mapBySlug = (list: any[]) => {
    const map: Record<string, any> = {};
    for (const it of list) {
      const key = String(it?.slug ?? "").trim().toLowerCase();
      if (!key) continue;
      map[key] = it;
    }
    return map;
  };

  const globalItems = React.useMemo(() => items.filter((p) => !p?.region), [items]);
  const inItems = React.useMemo(
    () => items.filter((p) => String(p?.region ?? "").trim().toUpperCase() === "IN"),
    [items],
  );

  const globalBySlug = React.useMemo(() => mapBySlug(globalItems), [globalItems]);
  const inBySlug = React.useMemo(() => mapBySlug(inItems), [inItems]);

  const formatCurrency = (minor: number, currency: string) => {
    const cur = String(currency || "USD").toUpperCase();
    const major = Number(minor || 0) / 100;
    const hasDecimals = Math.round(major * 100) % 100 !== 0;
    const formatted = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: hasDecimals ? 2 : 0,
    }).format(major);

    if (cur === "USD") return `$${formatted}`;
    if (cur === "INR") return `INR ${formatted}`;
    return `${cur} ${formatted}`;
  };

  const priceText = (p: any, fallback: string) => {
    if (!p) return fallback;
    const minor = Number(p.priceHourlyMinor ?? 0);
    if (!Number.isFinite(minor) || minor <= 0) return "Free";
    return `${formatCurrency(minor, p.currency)}/hr`;
  };

  const perHireText = (p: any, fallback: string) => {
    if (!p) return fallback;
    const minor = Number(p.perHireChargeMinor ?? 0);
    if (!Number.isFinite(minor) || minor <= 0) return formatCurrency(0, p.currency);
    return `${formatCurrency(minor, p.currency)} per hire`;
  };

  const getFeature = (p: any, idx: number, fallback: string) => {
    const arr = Array.isArray(p?.features) ? p.features : [];
    const v = typeof arr[idx] === "string" ? String(arr[idx]) : "";
    return v.trim() ? v : fallback;
  };

  const renderComparisonTable = (
    title: string,
    bySlug: Record<string, any>,
    defaults: {
      perHire: [string, string, string];
      price: [string, string, string];
    },
  ) => {
    const espresso = bySlug["espresso"];
    const cappuccino = bySlug["cappuccino"];
    const latte = bySlug["latte"];
    const cols = [espresso, cappuccino, latte];

    return (
      <div className="space-y-2">
        <div className="text-sm font-medium">{title}</div>
        <div className="overflow-x-auto rounded-lg border bg-background">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">☕ Plan</TableHead>
                {cols.map((p, idx) => {
                  const fallbackTitle = ["Espresso", "Cappuccino", "Latte"][idx];
                  const headTitle = String(p?.displayName ?? fallbackTitle);
                  const headSub = `(${priceText(p, defaults.price[idx])})`;
                  return (
                    <TableHead key={idx}>
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold">{headTitle}</div>
                          <div className="text-xs text-muted-foreground">{headSub}</div>
                        </div>
                        {p ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${headTitle}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  <TableRow>
                    <TableCell className="font-medium">Who&apos;s it for?</TableCell>
                    <TableCell>{getFeature(espresso, 0, "Budget-friendly hiring")}</TableCell>
                    <TableCell>{getFeature(cappuccino, 0, "Skilled interns")}</TableCell>
                    <TableCell>{getFeature(latte, 0, "Top-rated talent")}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Findtern Score</TableCell>
                    <TableCell>{getFeature(espresso, 1, "⭐ Less than 6/10")}</TableCell>
                    <TableCell>{getFeature(cappuccino, 1, "⭐ 6-8/10")}</TableCell>
                    <TableCell>{getFeature(latte, 1, "⭐ 8+/10 (Top Rated)")}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Per Hiring Charge</TableCell>
                    <TableCell>{perHireText(espresso, defaults.perHire[0])}</TableCell>
                    <TableCell>{perHireText(cappuccino, defaults.perHire[1])}</TableCell>
                    <TableCell>{perHireText(latte, defaults.perHire[2])}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Price</TableCell>
                    <TableCell>{priceText(espresso, defaults.price[0])}</TableCell>
                    <TableCell>{priceText(cappuccino, defaults.price[1])}</TableCell>
                    <TableCell>{priceText(latte, defaults.price[2])}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">Internship Duration</TableCell>
                    <TableCell>{String(espresso?.internshipDuration ?? "Up to 60 days")}</TableCell>
                    <TableCell>{String(cappuccino?.internshipDuration ?? "1-6 months")}</TableCell>
                    <TableCell>{String(latte?.internshipDuration ?? "1-6 months")}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-medium">What You Get</TableCell>
                    <TableCell>{getFeature(espresso, 2, "Access to basic talent")}</TableCell>
                    <TableCell>{getFeature(cappuccino, 2, "Access to medium skilled talent")}</TableCell>
                    <TableCell>{getFeature(latte, 2, "Top-rated talent")}</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>

          {(() => {
            const showGst = cols.some((p) => !!p?.gstApplicable);
            return showGst ? <div className="px-4 py-3 text-center text-xs text-muted-foreground">* Price includes GST</div> : null;
          })()}
        </div>
      </div>
    );
  };

  return (
    <SectionShell title="Pricing" description="Manage region-aware pricing plans (INR/USD, GST flag)">
     

      <div className="mt-4 space-y-6">
        {renderComparisonTable("Outside India (USD)", globalBySlug, {
          perHire: ["$50 per hire", "$0", "$0"],
          price: ["Free", "$1/hr", "$2/hr"],
        })}

        {renderComparisonTable("India (INR)", inBySlug, {
          perHire: ["INR 5,000 per hire", "INR 0", "INR 0"],
          price: ["Free", "INR 100/hr", "INR 200/hr"],
        })}
      </div>

      {/* Simple modal-ish area */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[860px] max-h-[85vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Pricing" : "Create Pricing"}</DialogTitle>
            <DialogDescription>
              Use <strong>Region = IN</strong> for India pricing. Keep region empty for global (outside India).
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(85vh-220px)] overflow-y-auto pr-2">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Slug</div>
                  <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="espresso / cappuccino / latte" />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Display Name</div>
                  <Input value={form.displayName} onChange={(e) => setForm((p) => ({ ...p, displayName: e.target.value }))} placeholder="Espresso" />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Region</div>
                  <Input value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))} placeholder="IN (leave empty for global)" />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Currency</div>
                  <Input value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} placeholder="USD / INR" />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Hourly Price</div>
                  <Input
                    value={form.priceHourly}
                    onChange={(e) => setForm((p) => ({ ...p, priceHourly: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Per-hire Charge</div>
                  <Input
                    value={form.perHireCharge}
                    onChange={(e) => setForm((p) => ({ ...p, perHireCharge: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Internship Duration</div>
                  <Input
                    value={form.internshipDuration}
                    onChange={(e) => setForm((p) => ({ ...p, internshipDuration: e.target.value }))}
                    placeholder="Up to 60 days / 1-6 months"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Sort Order</div>
                  <Input
                    type="number"
                    value={String(form.sortOrder)}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">GST</div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.gstApplicable}
                      onChange={(e) => setForm((p) => ({ ...p, gstApplicable: e.target.checked }))}
                    />
                    GST applicable
                  </label>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Status</div>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={form.isActive ? "1" : "0"}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "1" }))}
                  >
                    <option value="1">Active</option>
                    <option value="0">Hidden</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="text-sm font-medium">Table Text (one line per row item)</div>
                <Textarea
                  className="min-h-[160px]"
                  value={form.featuresText}
                  onChange={(e) => setForm((p) => ({ ...p, featuresText: e.target.value }))}
                  placeholder={"Line 1: Who's it for?\nLine 2: Findtern Score\nLine 3: What you get"}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            {editing ? (
              <Button
                className="bg-[#0E6049] hover:bg-[#0b4b3a]"
                onClick={() => updateMutation.mutate({ id: editing.id, payload: form })}
              >
                Save
              </Button>
            ) : (
              <Button className="bg-[#0E6049] hover:bg-[#0b4b3a]" onClick={() => createMutation.mutate(form)}>
                Create
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionShell>
  );
}

export default function AdminWebsitePage() {
  const [tab] = useCmsTab();

  const content = React.useMemo(() => {
    switch (tab) {
      case "blogs":
        return <BlogsSection />;
      case "skills":
        return <FeaturedSkillsSection />;
      case "faces":
        return <HappyFacesSection />;
      case "partners":
        return <PartnersSection />;
      case "pricing":
        return <PricingSection />;
      case "faq":
        return <FaqSection />;
      case "terms":
        return <TermsSection />;
      default:
        return <BlogsSection />;
    }
  }, [tab]);

  return (
    <AdminLayout
      title="Website CMS"
      description="Manage website content (blogs, skills, testimonials, FAQs)."
    >
      <div className="space-y-6">
        {content}
      </div>
    </AdminLayout>
  );
}
