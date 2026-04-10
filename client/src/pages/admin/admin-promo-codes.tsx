import React from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Tag, Calendar, Percent, DollarSign } from "lucide-react";

type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discountType: "percentage" | "fixed";
  discountValue: number;
  maxUsages: number | null;
  usedCount: number;
  minOrderAmountMinor: number | null;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
  createdAt: string;
};

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
            Add Promo Code
          </Button>
        ) : null}
      </div>
      <div className="px-4 py-4">{children}</div>
    </Card>
  );
}

export default function AdminPromoCodesPage() {
  const qc = useQueryClient();

  const [filterText, setFilterText] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PromoCode | null>(null);
  const [form, setForm] = React.useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: 10,
    maxUsages: "" as string | number,
    minOrderAmountMinor: "" as string | number,
    validFrom: "",
    validUntil: "",
    isActive: true,
  });

  const { data, isLoading } = useQuery<{ items: PromoCode[] }>({
    queryKey: ["/api/admin/promo-codes"],
  });

  const createMutation = useMutation({
    mutationFn: async (payload: typeof form) => {
      const res = await apiRequest("POST", "/api/admin/promo-codes", {
        code: payload.code,
        description: payload.description || null,
        discountType: payload.discountType,
        discountValue: Number(payload.discountValue),
        maxUsages: payload.maxUsages ? Number(payload.maxUsages) : null,
        minOrderAmountMinor: 249900,
        validFrom: payload.validFrom ? new Date(payload.validFrom).toISOString() : null,
        validUntil: payload.validUntil ? new Date(payload.validUntil).toISOString() : null,
        isActive: payload.isActive,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      setOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: typeof form }) => {
      const res = await apiRequest("PUT", `/api/admin/promo-codes/${id}`, {
        code: payload.code,
        description: payload.description || null,
        discountType: payload.discountType,
        discountValue: Number(payload.discountValue),
        maxUsages: payload.maxUsages ? Number(payload.maxUsages) : null,
        minOrderAmountMinor: 249900,
        validFrom: payload.validFrom ? new Date(payload.validFrom).toISOString() : null,
        validUntil: payload.validUntil ? new Date(payload.validUntil).toISOString() : null,
        isActive: payload.isActive,
      });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
      setOpen(false);
      setEditing(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/promo-codes/${id}`);
      return true;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/promo-codes"] });
    },
  });

  const resetForm = () => {
    setForm({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: 10,
      maxUsages: "",
      minOrderAmountMinor: "",
      validFrom: "",
      validUntil: "",
      isActive: true,
    });
  };

  const openCreate = () => {
    setEditing(null);
    resetForm();
    setOpen(true);
  };

  const openEdit = (item: PromoCode) => {
    setEditing(item);
    setForm({
      code: item.code,
      description: item.description ?? "",
      discountType: item.discountType,
      discountValue: item.discountValue,
      maxUsages: item.maxUsages ?? "",
      minOrderAmountMinor: item.minOrderAmountMinor ? Math.round(item.minOrderAmountMinor) : "",
      validFrom: item.validFrom ? item.validFrom.slice(0, 16) : "",
      validUntil: item.validUntil ? item.validUntil.slice(0, 16) : "",
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
      const p = item as PromoCode;
      return (
        p.code.toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      );
    },
  );

  const formatDiscount = (type: string, value: number) => {
    if (type === "percentage") return `${value}%`;
    return `₹${(value / 100).toFixed(0)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <AdminLayout title="Promo Codes" description="Manage discount codes for intern payments">
      <div className="space-y-6">
        <SectionShell
          title="Promo Codes"
          description="Create and manage discount codes for account activation"
          onAdd={openCreate}
        >
          <Dialog open={open} onOpenChange={(isOpen) => {
            setOpen(isOpen);
            if (!isOpen) {
              setEditing(null);
              resetForm();
            }
          }}>
            <DialogContent className="sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>{editing ? "Edit Promo Code" : "Add Promo Code"}</DialogTitle>
                <DialogDescription>
                  Create a discount code that interns can use during payment.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="text-sm font-medium">Promo Code</div>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                    placeholder="e.g. SAVE20"
                    className="uppercase"
                  />
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Description *</div>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. New year discount"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Discount Type</div>
                    <select
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      value={form.discountType}
                      onChange={(e) => setForm((p) => ({ ...p, discountType: e.target.value as "percentage" | "fixed" }))}
                    >
                      <option value="percentage">Percentage (%)</option>
                      {/* <option value="fixed">Fixed Amount (₹)</option> */}
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Discount Value</div>
                    <Input
                      type="number"
                      min={1}
                      value={String(form.discountValue)}
                      onChange={(e) => setForm((p) => ({ ...p, discountValue: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Max Usages (optional)</div>
                    <Input
                      type="number"
                      min={1}
                      value={String(form.maxUsages)}
                      onChange={(e) => setForm((p) => ({ ...p, maxUsages: e.target.value }))}
                      placeholder="Leave empty for unlimited"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Min Order Amount (₹)</div>
                    <Input
                      type="number"
                      min={0}
                      value={2499}
                      disabled
                      placeholder="2499"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Valid From</div>
                    <Input
                      type="datetime-local"
                      value={form.validFrom}
                      onChange={(e) => setForm((p) => ({ ...p, validFrom: e.target.value }))}
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Valid Until</div>
                    <Input
                      type="datetime-local"
                      value={form.validUntil}
                      onChange={(e) => setForm((p) => ({ ...p, validUntil: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <div className="text-sm font-medium">Status</div>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={form.isActive ? "1" : "0"}
                    onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.value === "1" }))}
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="bg-[#0E6049] hover:bg-[#0b4b3a]"
                  onClick={submit}
                  disabled={createMutation.isPending || updateMutation.isPending || !form.code.trim()}
                >
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex flex-col gap-3 px-1 pb-2 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-[320px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Search promo codes..."
                className="pl-9"
              />
            </div>
            <div className="text-xs text-muted-foreground">{filtered.length} result(s)</div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Used</TableHead>
                  <TableHead>Min Order</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Status</TableHead>
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
                      No promo codes yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  paged.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Tag className="h-4 w-4 text-emerald-600" />
                          {item.code}
                        </div>
                        {item.description && (
                          <div className="text-xs text-muted-foreground">{item.description}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                         
                          {formatDiscount(item.discountType, item.discountValue)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {item.usedCount}
                          {item.maxUsages ? ` / ${item.maxUsages}` : " (unlimited)"}
                        </div>
                      </TableCell>
                      <TableCell>
                        ₹2499
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs">
                          <Calendar className="h-3 w-3" />
                          {formatDate(item.validFrom)} - {formatDate(item.validUntil)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full ${item.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {item.isActive ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this promo code?")) {
                                deleteMutation.mutate(item.id);
                              }
                            }}
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
      </div>
    </AdminLayout>
  );
}