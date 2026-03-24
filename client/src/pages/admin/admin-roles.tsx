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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  ShieldCheck, 
  Users, 
  UserPlus, 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Key, 
  Mail, 
  User, 
  ChevronRight, 
  Settings2,
  Lock,
  Search,
  AlertCircle,
  RotateCcw,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";

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
    <AdminLayout title="Access Control" description="Manage administrative roles, permissions, and platform managers.">
      <div className="max-w-7xl mx-auto space-y-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 flex items-center gap-5 shadow-sm border-slate-200 bg-white group hover:shadow-md transition-all">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-2xl group-hover:scale-110 transition-transform">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Defined Roles</p>
              <p className="text-3xl font-black text-slate-900">{roles.length}</p>
            </div>
          </Card>

          <Card className="p-6 flex items-center gap-5 shadow-sm border-slate-200 bg-white group hover:shadow-md transition-all">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl group-hover:scale-110 transition-transform">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Active Admins</p>
              <p className="text-3xl font-black text-slate-900">{admins.filter(a => !!a.role).length}</p>
            </div>
          </Card>

          <Card className="p-6 flex items-center gap-5 shadow-sm border-slate-200 bg-white group hover:shadow-md transition-all">
            <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Users</p>
              <p className="text-3xl font-black text-slate-900">{admins.length}</p>
            </div>
          </Card>
        </div>

        {/* Roles Management Section */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <Settings2 className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Administrative Roles</h3>
                <p className="text-xs text-muted-foreground">Define and group permissions for platform access</p>
              </div>
            </div>
            <Button 
              onClick={startCreateRole} 
              className="bg-[#0E6049] hover:bg-[#0E6049]/90 shadow-sm gap-2 font-bold h-10 px-6"
            >
              <Plus className="h-4 w-4" />
              Create New Role
            </Button>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RotateCcw className="h-8 w-8 text-emerald-600 animate-spin" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">Fetching roles...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-red-500">
                <AlertCircle className="h-10 w-10" />
                <p className="font-bold">Failed to load roles.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500 px-6">Role Identity</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500">Key Identifier</TableHead>
                    <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500">Privileges</TableHead>
                    <TableHead className="text-right font-bold uppercase text-[10px] tracking-wider text-slate-500 px-6">Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-20 text-center text-sm text-muted-foreground">
                        No custom roles defined yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((r) => (
                      <TableRow key={r.id} className="hover:bg-slate-50/30 transition-colors group">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-10 w-10 rounded-xl flex items-center justify-center font-bold",
                              r.key === "super_admin" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            )}>
                              {r.name.charAt(0)}
                            </div>
                            <div className="font-bold text-slate-900">{r.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] px-2 py-0.5 bg-slate-50 border-slate-200">
                            {r.key}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[400px]">
                            {(Array.isArray(r.permissions) ? r.permissions : []).slice(0, 3).map(p => (
                              <Badge key={p} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-100 px-1.5 py-0 hover:bg-indigo-100 transition-colors">
                                {p}
                              </Badge>
                            ))}
                            {(r.permissions?.length ?? 0) > 3 && (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Badge variant="ghost" className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 cursor-pointer">
                                    +{r.permissions.length - 3} more
                                  </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-3 rounded-xl shadow-xl border-slate-100">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-b pb-2">All Permissions</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {r.permissions.map(p => (
                                      <Badge key={p} className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-100 px-1.5 py-0">
                                        {p}
                                      </Badge>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )}
                            {(!r.permissions || r.permissions.length === 0) && "-"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right px-6 py-4">
                          <div className="flex justify-end gap-2 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                              onClick={() => startEditRole(r)}
                              disabled={r.key === "super_admin"}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => {
                                if (r.key === "super_admin") return;
                                const ok = window.confirm("Delete this role?");
                                if (!ok) return;
                                deleteRoleMutation.mutate(r.id);
                              }}
                              disabled={deleteRoleMutation.isPending || r.key === "super_admin"}
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
            )}
          </div>
        </Card>

        {/* Admin Users Section */}
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg">
                <UserCheck className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Authorized Managers</h3>
                <p className="text-xs text-muted-foreground">Manage administrative access for team members</p>
              </div>
            </div>
            <Button 
              onClick={() => setAdminOpen(true)} 
              className="bg-[#0E6049] hover:bg-[#0E6049]/90 shadow-sm gap-2 font-bold h-10 px-6"
            >
              <UserPlus className="h-4 w-4" />
              Add Admin User
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500 px-6">User Details</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500">Contact</TableHead>
                  <TableHead className="font-bold uppercase text-[10px] tracking-wider text-slate-500">Access Level</TableHead>
                  <TableHead className="text-right font-bold uppercase text-[10px] tracking-wider text-slate-500 px-6">Operations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {admins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-20 text-center text-sm text-muted-foreground">
                      No administrative users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  admins.map((a) => (
                    <TableRow key={a.id} className="hover:bg-slate-50/30 transition-colors group">
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <User className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm">{a.name || "System Admin"}</span>
                            <span className="text-[11px] text-muted-foreground">Added {a.createdAt ? format(new Date(a.createdAt), 'MMM dd, yyyy') : "-"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {a.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "font-bold text-[10px] uppercase px-2 py-0.5 border-none",
                            a.role === "super_admin" ? "bg-amber-100 text-amber-700" : 
                            a.role ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                          )}
                        >
                          {a.role ? a.role.replace('_', ' ') : "DEACTIVATED"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right px-6 py-4">
                        <div className="flex justify-end gap-2 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                            onClick={() => {
                              setEditingAdmin(a);
                              setEditingAdminRoleKey(a.role ? String(a.role).trim() : "__deactivated__");
                              setEditingAdminPassword("");
                              setEditAdminOpen(true);
                            }}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {a.role ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                              onClick={() => {
                                const ok = window.confirm("Deactivate this admin user?");
                                if (!ok) return;
                                deactivateAdminMutation.mutate(a.id);
                              }}
                              disabled={deactivateAdminMutation.isPending || a.role === "super_admin"}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50"
                              onClick={() => {
                                setEditingAdmin(a);
                                setEditingAdminRoleKey("__deactivated__");
                                setEditingAdminPassword("");
                                setEditAdminOpen(true);
                              }}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              const ok = window.confirm("Delete this admin user?");
                              if (!ok) return;
                              deleteAdminMutation.mutate(a.id);
                            }}
                            disabled={deleteAdminMutation.isPending}
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
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[800px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Settings2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{editingRole ? "Configure Role" : "Define New Role"}</DialogTitle>
                <p className="text-xs text-muted-foreground">Assign a unique identity and specific access rights</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-8 max-h-[70vh] overflow-y-auto">
            {/* Presets Grid */}
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Quick Templates</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {[
                  { key: "super_admin", name: "Super Admin", permissions: ["*"] },
                  { 
                    key: "admin", 
                    name: "Admin", 
                    permissions: ["dashboard:read", "users:read", "notifications:write", "interns:read", "interns:write", "companies:read", "companies:write", "reports:read", "transactions:read", "cms:read", "cms:write", "contact:intern:read", "contact:intern:write", "contact:employer:read", "contact:employer:write"] 
                  },
                  { key: "exec_accounts", name: "Accounts", permissions: ["reports:read", "transactions:read"] },
                  { key: "exec_operations", name: "Operations", permissions: ["dashboard:read", "interns:read", "contact:intern:read", "contact:intern:write", "notifications:write"] },
                  { key: "exec_sales", name: "Sales", permissions: ["companies:read", "contact:employer:read", "contact:employer:write"] }
                ].map((preset) => (
                  <Button
                    key={preset.key}
                    type="button"
                    variant="outline"
                    className="h-auto py-3 px-2 flex flex-col gap-1 border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all text-center group"
                    onClick={() => applyPreset(preset)}
                  >
                    <span className="text-[10px] font-bold text-slate-900">{preset.name}</span>
                    <span className="text-[8px] text-slate-400 font-mono uppercase">{preset.key}</span>
                  </Button>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-100" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Role Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="role-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Operations Manager"
                      className="h-11 pl-10 bg-slate-50/50 border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role-key" className="text-xs font-bold uppercase tracking-wider text-slate-500">System Key</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="role-key"
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      placeholder="e.g. ops_manager"
                      className="h-11 pl-10 bg-slate-50/50 border-slate-200 font-mono text-sm"
                      disabled={Boolean(editingRole)}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Permissions Overview</Label>
                  <ScrollArea className="h-[120px] rounded-xl border border-slate-100 bg-white p-3 shadow-inner">
                    <div className="flex flex-wrap gap-1.5">
                      {parsedPermissions.length === 0 ? (
                        <p className="text-[10px] italic text-slate-400">No permissions selected yet...</p>
                      ) : (
                        parsedPermissions.map(p => (
                          <Badge key={p} className="text-[9px] font-bold bg-indigo-50 text-indigo-700 border-indigo-100 px-1.5 py-0">
                            {p}
                          </Badge>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </div>

            <Separator className="bg-slate-100" />

            {/* Permission Grid */}
            <div className="space-y-4">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Select Privileges</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {permissionGroups.map((g) => (
                  <div key={g.label} className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 mb-2">{g.label}</div>
                    <div className="space-y-3">
                      {g.items.map((p) => (
                        <label key={p} className="flex items-center gap-3 text-[11px] font-bold text-slate-600 cursor-pointer group">
                          <Checkbox
                            checked={permissionsSet.has(p)}
                            onCheckedChange={() => togglePermission(p)}
                            className="h-4.5 w-4.5 rounded-md"
                          />
                          <span className="font-mono group-hover:text-blue-600 transition-colors">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 gap-3">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={createMutation.isPending}
              className="font-bold text-slate-500"
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
              className="bg-[#0E6049] hover:bg-[#0E6049]/90 shadow-md font-bold px-8 h-11"
            >
              {editingRole
                ? updateRoleMutation.isPending
                  ? "Applying Changes..."
                  : "Update Role"
                : createMutation.isPending
                  ? "Defining Role..."
                  : "Create Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Admin Dialog */}
      <Dialog open={editAdminOpen} onOpenChange={setEditAdminOpen}>
        <DialogContent className="max-w-[500px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Edit2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">Edit Manager</DialogTitle>
                <p className="text-xs text-muted-foreground">Modify access rights and credentials</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-8">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="h-12 w-12 rounded-full bg-white flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                <Mail className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Account Email</p>
                <p className="text-sm font-bold text-slate-900">{editingAdmin?.email ?? "-"}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Access Level</Label>
                <Select value={editingAdminRoleKey} onValueChange={setEditingAdminRoleKey}>
                  <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__deactivated__" className="text-red-600 font-bold">DEACTIVATED</SelectItem>
                    <Separator className="my-1" />
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.key} className="font-medium">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="admin-new-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Reset Password</Label>
                <div className="space-y-3">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="admin-new-password"
                      type="password"
                      value={editingAdminPassword}
                      onChange={(e) => setEditingAdminPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      className="h-11 pl-10 bg-slate-50/50 border-slate-200"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 font-bold border-slate-200 hover:bg-slate-50 text-slate-600"
                    onClick={() => updateAdminPasswordMutation.mutate()}
                    disabled={updateAdminPasswordMutation.isPending || !editingAdmin?.id || editingAdminPassword.length < 8}
                  >
                    {updateAdminPasswordMutation.isPending ? "Updating Security..." : "Change Account Password"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setEditAdminOpen(false);
                setEditingAdmin(null);
                setEditingAdminRoleKey("");
                setEditingAdminPassword("");
              }}
              disabled={updateAdminRoleMutation.isPending || updateAdminPasswordMutation.isPending}
              className="font-bold text-slate-500"
            >
              Discard
            </Button>
            <Button
              onClick={() => updateAdminRoleMutation.mutate()}
              disabled={updateAdminRoleMutation.isPending || updateAdminPasswordMutation.isPending || !editingAdmin?.id}
              className="bg-[#0E6049] hover:bg-[#0E6049]/90 shadow-md font-bold px-8 h-11"
            >
              {updateAdminRoleMutation.isPending ? "Applying Access..." : "Update Manager Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Admin Dialog */}
      <Dialog open={adminOpen} onOpenChange={setAdminOpen}>
        <DialogContent className="max-w-[500px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
          <DialogHeader className="p-6 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">New Platform Manager</DialogTitle>
                <p className="text-xs text-muted-foreground">Onboard a new administrator to the platform</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="admin-email" className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="admin-email"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="manager@findtern.com"
                  className="h-11 pl-10 bg-slate-50/50 border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-wider text-slate-500">Initial Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="admin-password"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="h-11 pl-10 bg-slate-50/50 border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="admin-name" className="text-xs font-bold uppercase tracking-wider text-slate-500">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="admin-name"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="h-11 pl-10 bg-slate-50/50 border-slate-200"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Initial Role</Label>
              <Select value={adminRoleKey} onValueChange={setAdminRoleKey}>
                <SelectTrigger className="h-11 bg-slate-50/50 border-slate-200">
                  <SelectValue placeholder="Select access level" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.key} className="font-medium">
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 gap-3">
            <Button 
              variant="ghost" 
              onClick={() => setAdminOpen(false)} 
              disabled={createAdminMutation.isPending}
              className="font-bold text-slate-500"
            >
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
              className="bg-[#0E6049] hover:bg-[#0E6049]/90 shadow-md font-bold px-8 h-11"
            >
              {createAdminMutation.isPending ? "Onboarding..." : "Onboard Manager"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
