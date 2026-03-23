import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

function SectionShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-none shadow-sm">
      <div className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-base font-semibold text-[#0E6049]">{title}</div>
          {description ? <div className="text-xs text-muted-foreground mt-1">{description}</div> : null}
        </div>
      </div>
      <div className="px-4 py-4">{children}</div>
    </Card>
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

        <Button type="button" variant="outline" size="sm" onMouseDown={(e) => e.preventDefault()} onClick={promptLink}>
          Link
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

export default function AdminInternTermsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ terms: { title: string; bodyHtml: string } | null }>({
    queryKey: ["/api/admin/intern/terms"],
  });

  const [form, setForm] = React.useState({
    title: "Intern Terms and Conditions",
    bodyHtml: "",
  });

  React.useEffect(() => {
    const nextTitle = data?.terms?.title ?? "Intern Terms and Conditions";
    const nextBody = data?.terms?.bodyHtml ?? "";
    setForm({ title: nextTitle, bodyHtml: nextBody });
  }, [data?.terms?.title, data?.terms?.bodyHtml]);

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("PUT", "/api/admin/intern/terms", {
        title: payload.title,
        bodyHtml: payload.bodyHtml,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/intern/terms"] });
    },
  });

  return (
    <AdminLayout title="Intern Terms" description="Edit the Intern Terms & Conditions page content.">
      <div className="space-y-6">
        <SectionShell title="Intern Terms & Conditions" description="This content is shown on the intern signup Terms link.">
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

            {isLoading ? <div className="text-xs text-muted-foreground">Loading...</div> : null}
          </div>
        </SectionShell>
      </div>
    </AdminLayout>
  );
}
