import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AdminRole = {
  id: string;
  key: string;
  name: string;
  permissions: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
};

type AdminUser = {
  id: string;
  email: string;
  name?: string | null;
  role?: string | null;
  createdAt?: string | null;
};

export default function AdminRolesPage() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery<{ roles: AdminRole[] }>({
    queryKey: ["/api/admin/roles"],
  });

  const { data: adminsData } = useQuery<{ admins: AdminUser[] }>({
    queryKey: ["/api/admin/admins"],
    queryFn: async () => {
      const res = await fetch("/api/admin/admins", { credentials: "include" });
      if (res.status === 401 || res.status === 403) return { admins: [] };
      if (!res.ok) throw new Error("Failed to load admin users");
      return (await res.json()) as { admins: AdminUser[] };
    },
  });

  const roles = data?.roles ?? [];
  const admins = adminsData?.admins ?? [];

  const [open, setOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [editAdminOpen, setEditAdminOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [editingAdminRoleKey, setEditingAdminRoleKey] = useState<string>("");
  const [editingAdminPassword, setEditingAdminPassword] = useState<string>("");
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [permissionsText, setPermissionsText] = useState("");

  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminRoleKey, setAdminRoleKey] = useState<string>("");

  const updateAdminPasswordMutation = useMutation({
    mutationFn: async () => {
      if (!editingAdmin?.id) throw new Error("No admin selected");
      const payload = { password: editingAdminPassword };
      const res = await apiRequest("PUT", `/api/admin/admins/${editingAdmin.id}/password`, payload);
      return res.json();
    },
    onSuccess: async () => {
      setEditingAdminPassword("");
      await qc.invalidateQueries({ queryKey: ["/api/admin/admins"] });
    },
  });

  const parsedPermissions = useMemo(() => {
    return permissionsText
      .split(/[\n,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [permissionsText]);

  const permissionGroups = useMemo(
    () =>
      [
        {
          label: "Dashboard",
          items: ["dashboard:read"],
        },
        {
          label: "Users",
          items: ["users:read"],
        },
        {
          label: "Reports & Transactions",
          items: ["reports:read", "transactions:read"],
        },
        {
          label: "Interns",
          items: ["interns:read", "interns:write"],
        },
        {
          label: "Companies",
          items: ["companies:read", "companies:write"],
        },
        {
          label: "CMS",
          items: ["cms:read", "cms:write"],
        },
        {
          label: "Contact Messages",
          items: [
            "contact:intern:read",
            "contact:intern:write",
            "contact:employer:read",
            "contact:employer:write",
          ],
        },
        {
          label: "Notifications",
          items: ["notifications:write"],
        },
        {
          label: "Role Management",
          items: ["roles:write"],
        },
      ] as const,
    [],
  );

  const permissionsSet = useMemo(() => new Set(parsedPermissions), [parsedPermissions]);

  const togglePermission = (p: string) => {
    const current = parsedPermissions;
    const set = new Set(current);
    if (set.has(p)) set.delete(p);
    else set.add(p);
    setPermissionsText(Array.from(set).sort((a, b) => a.localeCompare(b)).join("\n"));
  };

  const applyPreset = (preset: {
    key: string;
    name: string;
    permissions: string[];
  }) => {
    setKey(preset.key);
    setName(preset.name);
    setPermissionsText(preset.permissions.join("\n"));
  };

  const startCreateRole = () => {
    setEditingRole(null);
    setKey("");
    setName("");
    setPermissionsText("");
    setOpen(true);
  };

  const startEditRole = (role: AdminRole) => {
    setEditingRole(role);
    setKey(role.key);
    setName(role.name);
    setPermissionsText((Array.isArray(role.permissions) ? role.permissions : []).join("\n"));
    setOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        key: key.trim(),
        name: name.trim(),
        permissions: parsedPermissions,
      };
      const res = await apiRequest("POST", "/api/admin/roles", payload);
      return res.json();
    },
    onSuccess: async () => {
      setOpen(false);
      setKey("");
      setName("");
      setPermissionsText("");
      await qc.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async () => {
      if (!editingRole?.id) throw new Error("No role selected");
      const payload = {
        key: key.trim(),
        name: name.trim(),
        permissions: parsedPermissions,
      };
      const res = await apiRequest("PUT", `/api/admin/roles/${editingRole.id}`, payload);
      return res.json();
    },
    onSuccess: async () => {
      setOpen(false);
      setEditingRole(null);
      setKey("");
      setName("");
      setPermissionsText("");
      await qc.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/roles/${roleId}`);
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/roles"] });
    },
  });

  const createAdminMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        email: adminEmail.trim(),
        password: adminPassword,
        name: adminName.trim() || null,
        roleKey: adminRoleKey,
      };
      const res = await apiRequest("POST", "/api/admin/admins", payload);
      return res.json();
    },
    onSuccess: async () => {
      setAdminOpen(false);
      setAdminEmail("");
      setAdminPassword("");
      setAdminName("");
      setAdminRoleKey("");
      await qc.invalidateQueries({ queryKey: ["/api/admin/admins"] });
    },
  });

  const updateAdminRoleMutation = useMutation({
    mutationFn: async () => {
      if (!editingAdmin?.id) throw new Error("No admin selected");
      const roleKeyRaw = editingAdminRoleKey.trim();
      const roleKey = roleKeyRaw === "__deactivated__" ? null : roleKeyRaw || null;
      const payload = { roleKey };
      const res = await apiRequest("PUT", `/api/admin/admins/${editingAdmin.id}/role`, payload);
      return res.json();
    },
    onSuccess: async () => {
      setEditAdminOpen(false);
      setEditingAdmin(null);
      setEditingAdminRoleKey("");
      await qc.invalidateQueries({ queryKey: ["/api/admin/admins"] });
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const res = await apiRequest("DELETE", `/api/admin/admins/${adminId}`);
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/admins"] });
    },
  });

  const deactivateAdminMutation = useMutation({
    mutationFn: async (adminId: string) => {
      const res = await apiRequest("PUT", `/api/admin/admins/${adminId}/role`, { roleKey: null });
      return res.json();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["/api/admin/admins"] });
    },
  });

  return (
    <AdminLayout title="Roles" description="Create and manage admin roles and permissions.">
      <Card className="border-none shadow-sm">
        <div className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Role List</p>
          </div>
          <Button onClick={startCreateRole} style={{ backgroundColor: "#0E6049" }}>
            Add Role
          </Button>
        </div>

        <div className="overflow-x-auto px-4 py-4">
          {isLoading ? (
            <div className="text-sm text-muted-foreground px-2 py-2">Loading...</div>
          ) : error ? (
            <div className="text-sm text-destructive px-2 py-2">Failed to load roles.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                      No roles found.
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.key}</TableCell>
                      <TableCell className="text-xs">
                        {(Array.isArray(r.permissions) ? r.permissions : []).join(", ") || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startEditRole(r)}
                            disabled={r.key === "super_admin"}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (r.key === "super_admin") return;
                              const ok = window.confirm("Delete this role?");
                              if (!ok) return;
                              deleteRoleMutation.mutate(r.id);
                            }}
                            disabled={deleteRoleMutation.isPending || r.key === "super_admin"}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </Card>

      <Card className="border-none shadow-sm mt-6">
        <div className="flex flex-col gap-3 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Admin Users</p>
          </div>
          <Button onClick={() => setAdminOpen(true)} style={{ backgroundColor: "#0E6049" }}>
            Add Admin User
          </Button>
        </div>

        <div className="overflow-x-auto px-4 py-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                    No admin users found.
                  </TableCell>
                </TableRow>
              ) : (
                admins.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.email}</TableCell>
                    <TableCell>{a.name || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{a.role || "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingAdmin(a);
                            setEditingAdminRoleKey(a.role ? String(a.role).trim() : "__deactivated__");
                            setEditingAdminPassword("");
                            setEditAdminOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {a.role ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const ok = window.confirm("Deactivate this admin user?");
                              if (!ok) return;
                              deactivateAdminMutation.mutate(a.id);
                            }}
                            disabled={deactivateAdminMutation.isPending || a.role === "super_admin"}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingAdmin(a);
                              setEditingAdminRoleKey("__deactivated__");
                              setEditingAdminPassword("");
                              setEditAdminOpen(true);
                            }}
                          >
                            Activate
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const ok = window.confirm("Delete this admin user?");
                            if (!ok) return;
                            deleteAdminMutation.mutate(a.id);
                          }}
                          disabled={deleteAdminMutation.isPending}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit Role" : "Add Role"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Presets</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    applyPreset({
                      key: "super_admin",
                      name: "Super Admin",
                      permissions: ["*"],
                    })
                  }
                >
                  Super Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    applyPreset({
                      key: "admin",
                      name: "Admin",
                      permissions: [
                        "dashboard:read",
                        "users:read",
                        "notifications:write",
                        "interns:read",
                        "interns:write",
                        "companies:read",
                        "companies:write",
                        "reports:read",
                        "transactions:read",
                        "cms:read",
                        "cms:write",
                        "contact:intern:read",
                        "contact:intern:write",
                        "contact:employer:read",
                        "contact:employer:write",
                      ],
                    })
                  }
                >
                  Admin
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    applyPreset({
                      key: "exec_accounts",
                      name: "Executive - Accounts",
                      permissions: ["reports:read", "transactions:read"],
                    })
                  }
                >
                  Executive - Accounts
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    applyPreset({
                      key: "exec_operations",
                      name: "Executive - Operations",
                      permissions: [
                        "dashboard:read",
                        "interns:read",
                        "contact:intern:read",
                        "contact:intern:write",
                        "notifications:write",
                      ],
                    })
                  }
                >
                  Executive - Operations
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    applyPreset({
                      key: "exec_sales",
                      name: "Executive - Sales",
                      permissions: [
                        "companies:read",
                        "contact:employer:read",
                        "contact:employer:write",
                      ],
                    })
                  }
                >
                  Executive - Sales
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Executive - Accounts"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-key">Key</Label>
              <Input
                id="role-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="exec_accounts"
                disabled={Boolean(editingRole)}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissions</Label>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Quick select</Label>
                  <ScrollArea type="always" className="h-[220px] rounded-md border p-3">
                    <div className="space-y-3">
                      {permissionGroups.map((g) => (
                        <div key={g.label} className="space-y-2">
                          <div className="text-xs font-medium text-muted-foreground">{g.label}</div>
                          <div className="space-y-2">
                            {g.items.map((p) => (
                              <label key={p} className="flex items-center gap-2 text-xs">
                                <Checkbox
                                  checked={permissionsSet.has(p)}
                                  onCheckedChange={() => togglePermission(p)}
                                />
                                <span className="font-mono">{p}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-perms" className="text-xs text-muted-foreground">
                    Manual edit (comma or new line separated)
                  </Label>
                  <Textarea
                    id="role-perms"
                    value={permissionsText}
                    onChange={(e) => setPermissionsText(e.target.value)}
                    placeholder="reports:read\ntransactions:read"
                    className="min-h-[220px] font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => (editingRole ? updateRoleMutation.mutate() : createMutation.mutate())}
              disabled={
                createMutation.isPending ||
                updateRoleMutation.isPending ||
                !name.trim() ||
                !key.trim() ||
                (editingRole?.key === "super_admin")
              }
              style={{ backgroundColor: "#0E6049" }}
            >
              {editingRole
                ? updateRoleMutation.isPending
                  ? "Saving..."
                  : "Save"
                : createMutation.isPending
                  ? "Creating..."
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editAdminOpen} onOpenChange={setEditAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Email</div>
              <div className="text-sm font-medium">{editingAdmin?.email ?? "-"}</div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editingAdminRoleKey} onValueChange={setEditingAdminRoleKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__deactivated__">Deactivated</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.key}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-new-password">New Password</Label>
              <Input
                id="admin-new-password"
                type="password"
                value={editingAdminPassword}
                onChange={(e) => setEditingAdminPassword(e.target.value)}
                placeholder="At least 8 chars (Upper/Lower/Number/Special)"
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => updateAdminPasswordMutation.mutate()}
                  disabled={updateAdminPasswordMutation.isPending || !editingAdmin?.id || editingAdminPassword.length < 8}
                >
                  {updateAdminPasswordMutation.isPending ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditAdminOpen(false);
                setEditingAdmin(null);
                setEditingAdminRoleKey("");
                setEditingAdminPassword("");
              }}
              disabled={updateAdminRoleMutation.isPending || updateAdminPasswordMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateAdminRoleMutation.mutate()}
              disabled={updateAdminRoleMutation.isPending || updateAdminPasswordMutation.isPending || !editingAdmin?.id}
              style={{ backgroundColor: "#0E6049" }}
            >
              {updateAdminRoleMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password">Password</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-name">Name (optional)</Label>
              <Input
                id="admin-name"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={adminRoleKey} onValueChange={setAdminRoleKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.key}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminOpen(false)} disabled={createAdminMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={() => createAdminMutation.mutate()}
              disabled={
                createAdminMutation.isPending ||
                !adminEmail.trim() ||
                adminPassword.length < 8 ||
                !adminRoleKey
              }
              style={{ backgroundColor: "#0E6049" }}
            >
              {createAdminMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
