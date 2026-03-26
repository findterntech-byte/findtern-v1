import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Globe,
  Building2,
  GraduationCap,
  FolderKanban,
  LayoutDashboard,
  Bell,
  Newspaper,
  LogOut,
  Settings,
  Sparkles,
  Users,
  Receipt,
  ChevronDown,
  Shield,
  User,
  KeyRound,
  Camera,
  Loader2,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  X,
  History,
} from "lucide-react";
import findternLogo from "/logo-1.jpg";
import React, { ReactNode, useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

type AdminLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  required?: string | string[];
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", required: "dashboard:read" },
  { label: "Proposal Tracker", icon: FolderKanban, href: "/admin/proposal-tracker", required: ["interns:read", "companies:read"] },
  { label: "Notifications", icon: Bell, href: "/admin/notifications", required: "notifications:read" },
  { label: "Notification History", icon: History, href: "/admin/notification-history", required: "notifications:read" },
  { label: "Contact Messages", icon: FolderKanban, href: "/admin/contact", required: ["contact:intern:read", "contact:employer:read"] },
  { label: "Roles", icon: Shield, href: "/admin/roles", required: "roles:write" },
];

const internItems: NavItem[] = [
  { label: "Interns", icon: GraduationCap, href: "/admin/interns", required: "interns:read" },
  { label: "Terms & Conditions", icon: FolderKanban, href: "/admin/interns/terms", required: "interns:read" },
  { label: "Non-Disclosure Clauses", icon: FolderKanban, href: "/admin/interns/non-disclosure", required: "interns:read" },
];

const companyItems: NavItem[] = [
  { label: "Companies", icon: Building2, href: "/admin/companies", required: "companies:read" },
  { label: "Projects", icon: FolderKanban, href: "/admin/projects", required: "companies:read" },
  { label: "Terms & Conditions", icon: FolderKanban, href: "/admin/companies/terms", required: "companies:read" },
];

const reportsItems: NavItem[] = [
  { label: "Reports", icon: Newspaper, href: "/admin/reports", required: "reports:read" },
  { label: "Transactions", icon: Receipt, href: "/admin/transactions", required: "transactions:read" },
];

const cmsItems: NavItem[] = [
  { label: "Blogs", icon: Newspaper, href: "/admin/website?tab=blogs", required: "cms:read" },
  { label: "Featured Skills", icon: Sparkles, href: "/admin/website?tab=skills", required: "cms:read" },
  { label: "Happy Faces", icon: Users, href: "/admin/website?tab=faces", required: "cms:read" },
  { label: "Partners", icon: Users, href: "/admin/website?tab=partners", required: "cms:read" },
  { label: "Pricing", icon: Receipt, href: "/admin/website?tab=pricing", required: "cms:read" },
  { label: "FAQ", icon: FolderKanban, href: "/admin/website?tab=faq", required: "cms:read" },
  { label: "Terms & Conditions", icon: FolderKanban, href: "/admin/website?tab=terms", required: "cms:read" },
];

type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
};

export function AdminLayout({ title, description, children }: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const [adminPermissions, setAdminPermissions] = React.useState<string[] | null>(null);
  const [adminUser, setAdminUser] = React.useState<UserProfile | null>(null);

  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", email: "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [profileError, setProfileError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const isInternRoute = location.startsWith("/admin/interns");
  const isCompanyRoute = location.startsWith("/admin/companies") || location.startsWith("/admin/projects");
  const isReportsRoute = location.startsWith("/admin/reports") || location.startsWith("/admin/transactions");
  const isCmsRoute = location.startsWith("/admin/website");
  const [internOpen, setInternOpen] = React.useState<boolean>(isInternRoute);
  const [companyOpen, setCompanyOpen] = React.useState<boolean>(isCompanyRoute);
  const [reportsOpen, setReportsOpen] = React.useState<boolean>(isReportsRoute);
  const [cmsOpen, setCmsOpen] = React.useState<boolean>(isCmsRoute);

  const [urlSearch, setUrlSearch] = React.useState(() => {
    if (typeof window === "undefined") return "";
    return window.location.search;
  });

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const onUrlChange = () => setUrlSearch(window.location.search);
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
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch("/api/admin/me", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setAdminPermissions([]);
          return;
        }
        const json = (await res.json()) as any;
        const perms = Array.isArray(json?.admin?.permissions) ? (json.admin.permissions as string[]) : [];
        if (!cancelled) setAdminPermissions(perms);
        if (!cancelled && json?.admin) {
          setAdminUser({
            id: json.admin.id ?? "",
            firstName: json.admin.firstName ?? "",
            lastName: json.admin.lastName ?? "",
            email: json.admin.email ?? "",
            role: json.admin.role ?? "",
          });
          setProfileForm({
            firstName: json.admin.firstName ?? "",
            lastName: json.admin.lastName ?? "",
            email: json.admin.email ?? "",
          });
        }
      } catch {
        if (!cancelled) setAdminPermissions([]);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const can = React.useCallback((required?: string | string[]) => {
    if (!required) return true;
    const perms = adminPermissions;
    if (!perms) return true;
    if (perms.includes("*")) return true;
    if (Array.isArray(required)) return required.some((p) => perms.includes(p));
    return perms.includes(required);
  }, [adminPermissions]);

  const visibleNavItems = React.useMemo(() => navItems.filter((i) => can(i.required)), [can]);
  const visibleInternItems = React.useMemo(() => internItems.filter((i) => can(i.required)), [can]);
  const visibleCompanyItems = React.useMemo(() => companyItems.filter((i) => can(i.required)), [can]);
  const visibleReportsItems = React.useMemo(() => reportsItems.filter((i) => can(i.required)), [can]);
  const visibleCmsItems = React.useMemo(() => cmsItems.filter((i) => can(i.required)), [can]);

  const activeCmsTab = React.useMemo(() => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(urlSearch);
    return params.get("tab");
  }, [urlSearch]);

  React.useEffect(() => { if (isInternRoute) setInternOpen(true); }, [isInternRoute]);
  React.useEffect(() => { if (isCompanyRoute) setCompanyOpen(true); }, [isCompanyRoute]);
  React.useEffect(() => { if (isReportsRoute) setReportsOpen(true); }, [isReportsRoute]);
  React.useEffect(() => { if (isCmsRoute) setCmsOpen(true); }, [isCmsRoute]);

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/admin/logout");
    } catch {
      // ignore
    } finally {
      setLocation("/admin/login");
    }
  };

  const handleSaveProfile = async () => {
    setProfileError("");
    if (!profileForm.firstName.trim()) {
      setProfileError("First name is required");
      return;
    }
    if (!profileForm.lastName.trim()) {
      setProfileError("Last name is required");
      return;
    }
    if (!profileForm.email.trim()) {
      setProfileError("Email is required");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileForm.email)) {
      setProfileError("Please enter a valid email address");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await apiRequest("PUT", "/api/admin/profile", {
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim(),
      });
      const json = await res.json();
      setAdminUser((prev) => prev ? {
        ...prev,
        firstName: profileForm.firstName.trim(),
        lastName: profileForm.lastName.trim(),
        email: profileForm.email.trim(),
      } : prev);
      setProfileOpen(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
    } catch (e: any) {
      setProfileError(e?.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError("New password is required");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      await apiRequest("POST", "/api/admin/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordOpen(false);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
        className: "bg-emerald-50 border-emerald-200 text-emerald-800",
      });
    } catch (e: any) {
      setPasswordError(e?.message || "Failed to change password");
    } finally {
      setSavingPassword(false);
    }
  };

  const openProfileDialog = () => {
    if (adminUser) {
      setProfileForm({
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        email: adminUser.email,
      });
    }
    setProfileError("");
    setProfileOpen(true);
    setUserMenuOpen(false);
  };

  const openPasswordDialog = () => {
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordError("");
    setPasswordOpen(true);
    setUserMenuOpen(false);
  };

  const getUserInitials = () => {
    if (!adminUser) return "?";
    const first = adminUser.firstName?.charAt(0) || "";
    const last = adminUser.lastName?.charAt(0) || "";
    if (!first && !last) return adminUser.email?.charAt(0).toUpperCase() || "?";
    return (first + last).toUpperCase();
  };

  return (
    <SidebarProvider defaultOpen={true} className="bg-background">
      <Sidebar className="border-r bg-gradient-to-b from-slate-50 to-white text-slate-900 shadow-xl" collapsible="offcanvas">
        <SidebarHeader className="border-b-0 px-0 py-0">
          <div className="bg-gradient-to-r from-[#0E6049] to-[#0b4b3a] px-4 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-lg overflow-hidden p-0.5">
                <img src={findternLogo} alt="" className="h-full w-full object-contain" />
              </div>
              <div>
                <h2 className="text-white font-bold text-xl tracking-tight">Findtern</h2>
                <p className="text-white/60 text-xs font-medium">Admin Dashboard</p>
              </div>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="px-3 pt-4">
          <SidebarGroup>
            <SidebarGroupLabel className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#0E6049]/60">Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href || location.startsWith(item.href.split("?")[0]);
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={isActive} onClick={() => setLocation(item.href)} className={cn(
                        "relative text-[13px] font-medium transition-all duration-200 rounded-xl px-3 py-2.5 hover:bg-[#0E6049]/5",
                        isActive ? "bg-gradient-to-r from-[#0E6049] to-[#0b4b3a] text-white shadow-lg shadow-[#0E6049]/20" : "text-slate-600 hover:text-[#0E6049]"
                      )}>
                        <div className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                          isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-[#0E6049]/10 group-hover:text-[#0E6049]"
                        )}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <span>{item.label}</span>
                        {isActive && (
                          <div className="absolute right-2 h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarGroup className="pt-4">
            <SidebarGroupLabel className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-[#0E6049]/60">Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {visibleInternItems.length > 0 && (
                  <Collapsible open={internOpen} onOpenChange={setInternOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={isInternRoute} className={cn(
                          "text-[13px] font-medium transition-all duration-200 rounded-xl px-3 py-2.5 hover:bg-[#0E6049]/5",
                          isInternRoute ? "bg-gradient-to-r from-[#0E6049] to-[#0b4b3a] text-white shadow-lg shadow-[#0E6049]/20" : "text-slate-600 hover:text-[#0E6049]"
                        )}>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                            isInternRoute ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            <GraduationCap className="h-4 w-4" />
                          </div>
                          <span>Interns</span>
                          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform duration-200", internOpen ? "rotate-180" : "")} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden">
                        <SidebarMenuSub className="mt-2 ml-4 space-y-0.5 border-l-2 border-[#0E6049]/20 pl-4">
                          {visibleInternItems.map((sub) => {
                            const Icon = sub.icon;
                            const isActive = location === sub.href || location.startsWith(sub.href);
                            return (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton href={sub.href} isActive={isActive} onClick={(e) => { e.preventDefault(); setLocation(sub.href); }} className={cn(
                                  "gap-2 text-[12px] rounded-lg px-3 py-2 transition-all duration-150",
                                  isActive ? "bg-[#0E6049]/10 text-[#0E6049] font-semibold" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                )}>
                                  <Icon className="h-3.5 w-3.5" />
                                  <span className="truncate">{sub.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}

                {visibleCompanyItems.length > 0 && (
                  <Collapsible open={companyOpen} onOpenChange={setCompanyOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={isCompanyRoute} className={cn(
                          "text-[13px] font-medium transition-all duration-200 rounded-xl px-3 py-2.5 hover:bg-[#0E6049]/5",
                          isCompanyRoute ? "bg-gradient-to-r from-[#0E6049] to-[#0b4b3a] text-white shadow-lg shadow-[#0E6049]/20" : "text-slate-600 hover:text-[#0E6049]"
                        )}>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                            isCompanyRoute ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            <Building2 className="h-4 w-4" />
                          </div>
                          <span>Company</span>
                          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform duration-200", companyOpen ? "rotate-180" : "")} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden">
                        <SidebarMenuSub className="mt-2 ml-4 space-y-0.5 border-l-2 border-[#0E6049]/20 pl-4">
                          {visibleCompanyItems.map((sub) => {
                            const Icon = sub.icon;
                            const isActive = location === sub.href || location.startsWith(sub.href);
                            return (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton href={sub.href} isActive={isActive} onClick={(e) => { e.preventDefault(); setLocation(sub.href); }} className={cn(
                                  "gap-2 text-[12px] rounded-lg px-3 py-2 transition-all duration-150",
                                  isActive ? "bg-[#0E6049]/10 text-[#0E6049] font-semibold" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                )}>
                                  <Icon className="h-3.5 w-3.5" />
                                  <span className="truncate">{sub.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}

                {visibleReportsItems.length > 0 && (
                  <Collapsible open={reportsOpen} onOpenChange={setReportsOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={isReportsRoute} className={cn(
                          "text-[13px] font-medium transition-all duration-200 rounded-xl px-3 py-2.5 hover:bg-[#0E6049]/5",
                          isReportsRoute ? "bg-gradient-to-r from-[#0E6049] to-[#0b4b3a] text-white shadow-lg shadow-[#0E6049]/20" : "text-slate-600 hover:text-[#0E6049]"
                        )}>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                            isReportsRoute ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            <Newspaper className="h-4 w-4" />
                          </div>
                          <span>Reports</span>
                          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform duration-200", reportsOpen ? "rotate-180" : "")} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden">
                        <SidebarMenuSub className="mt-2 ml-4 space-y-0.5 border-l-2 border-[#0E6049]/20 pl-4">
                          {visibleReportsItems.map((sub) => {
                            const Icon = sub.icon;
                            const isActive = location === sub.href || location.startsWith(sub.href);
                            return (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton href={sub.href} isActive={isActive} onClick={(e) => { e.preventDefault(); setLocation(sub.href); }} className={cn(
                                  "gap-2 text-[12px] rounded-lg px-3 py-2 transition-all duration-150",
                                  isActive ? "bg-[#0E6049]/10 text-[#0E6049] font-semibold" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                )}>
                                  <Icon className="h-3.5 w-3.5" />
                                  <span className="truncate">{sub.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}

                {visibleCmsItems.length > 0 && (
                  <Collapsible open={cmsOpen} onOpenChange={setCmsOpen}>
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton isActive={isCmsRoute} className={cn(
                          "text-[13px] font-medium transition-all duration-200 rounded-xl px-3 py-2.5 hover:bg-[#0E6049]/5",
                          isCmsRoute ? "bg-gradient-to-r from-[#0E6049] to-[#0b4b3a] text-white shadow-lg shadow-[#0E6049]/20" : "text-slate-600 hover:text-[#0E6049]"
                        )}>
                          <div className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                            isCmsRoute ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          )}>
                            <Globe className="h-4 w-4" />
                          </div>
                          <span>Website CMS</span>
                          <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform duration-200", cmsOpen ? "rotate-180" : "")} />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="overflow-hidden">
                        <SidebarMenuSub className="mt-2 ml-4 space-y-0.5 border-l-2 border-[#0E6049]/20 pl-4">
                          {visibleCmsItems.map((sub) => {
                            const expectedTab = new URLSearchParams(sub.href.split("?")[1] ?? "").get("tab");
                            const isActive = isCmsRoute && expectedTab != null && activeCmsTab === expectedTab;
                            const Icon = sub.icon;
                            return (
                              <SidebarMenuSubItem key={sub.href}>
                                <SidebarMenuSubButton href={sub.href} isActive={isActive} onClick={(e) => { e.preventDefault(); setLocation(sub.href); }} className={cn(
                                  "gap-2 text-[12px] rounded-lg px-3 py-2 transition-all duration-150",
                                  isActive ? "bg-[#0E6049]/10 text-[#0E6049] font-semibold" : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                )}>
                                  <Icon className="h-3.5 w-3.5" />
                                  <span className="truncate">{sub.label}</span>
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            );
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-200/50 bg-slate-50/50 px-3 py-4 mt-auto">
          <div className="rounded-xl bg-white border border-slate-200 p-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#0E6049] to-[#0b4b3a] text-white font-bold text-sm shadow-md">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{adminUser?.email}</p>
                <p className="text-[11px] text-slate-400 truncate">{adminUser?.role || "Admin"}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full mt-3 justify-start gap-2 rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors" 
              onClick={handleLogout}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500">
                <LogOut className="h-3.5 w-3.5" />
              </span>
              <span>Sign Out</span>
            </Button>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col min-h-screen overflow-x-hidden">
        <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/90 px-4 backdrop-blur md:px-6">
          <div className="flex flex-1 items-center gap-3">
            <SidebarTrigger className="h-8 w-8 shrink-0 md:hidden" />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-tight text-[#0E6049]">{title}</h1>
              {description && <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">{description}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="ghost"
                className="flex items-center gap-2 h-auto py-1.5 px-2 rounded-lg hover:bg-muted/50"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0E6049] text-white font-bold text-sm shadow-sm hover:shadow-md transition-shadow">
                  {getUserInitials()}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", userMenuOpen && "rotate-180")} />
              </Button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border bg-white shadow-lg z-50 overflow-hidden">
                    <div className="p-4 border-b bg-gradient-to-r from-[#0E6049]/5 to-transparent flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0E6049] text-white font-bold text-lg shadow-md">
                        {getUserInitials()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{adminUser?.email}</p>
                        <p className="text-xs text-muted-foreground truncate">{adminUser?.role || "Admin"}</p>
                      </div>
                    </div>
                    <div className="p-2">
                      <button
                        onClick={openProfileDialog}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">My Profile</p>
                          <p className="text-xs text-muted-foreground">Update your account info</p>
                        </div>
                      </button>
                      <button
                        onClick={openPasswordDialog}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                          <KeyRound className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">Change Password</p>
                          <p className="text-xs text-muted-foreground">Update your password</p>
                        </div>
                      </button>
                    </div>
                    <div className="p-2 border-t">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left hover:bg-red-50 transition-colors text-red-600"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-500">
                          <LogOut className="h-4 w-4" />
                        </div>
                        <p className="font-medium">Logout</p>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-muted/30">
          <div className="mx-auto w-full max-w-screen-2xl space-y-6 px-4 py-6 md:px-6 md:py-8">
            {children}
          </div>
        </div>

        <Separator className="mt-auto opacity-0" />
      </SidebarInset>

      {/* Profile Edit Dialog */}
      <Dialog open={profileOpen} onOpenChange={(open) => { if (!open) setProfileOpen(false); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0E6049] text-white font-bold text-3xl shadow-lg">
                {getUserInitials()}
              </div>
              <div className="text-center">
                <DialogTitle className="text-xl">My Profile</DialogTitle>
                <DialogDescription className="text-xs mt-1">Your account information</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {profileError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                disabled
                placeholder="john.doe@example.com"
                className="h-11 bg-muted/30 cursor-not-allowed opacity-60"
              />
            </div>

            <div className="rounded-lg bg-muted/50 p-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span>Role: <span className="font-medium">{adminUser?.role || "Admin"}</span></span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button onClick={() => setProfileOpen(false)} className="h-10 gap-2">
              <Check className="h-4 w-4" />
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={(open) => { if (!open) setPasswordOpen(false); }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                <KeyRound className="h-7 w-7" />
              </div>
              <div>
                <DialogTitle className="text-xl">Change Password</DialogTitle>
                <DialogDescription className="text-xs">Ensure your account stays secure</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {passwordError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-sm font-medium">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((p) => ({ ...p, current: !p.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPasswords.new ? "text" : "password"}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
                  placeholder="Min. 8 characters"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((p) => ({ ...p, new: !p.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords((p) => ({ ...p, confirm: !p.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <p className="text-xs text-amber-800">
                <strong>Tip:</strong> Use a strong password with at least 8 characters including letters, numbers, and symbols.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setPasswordOpen(false)} className="h-10">
              Cancel
            </Button>
            <Button onClick={handleChangePassword} disabled={savingPassword} className="h-10 gap-2">
              {savingPassword ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  Update Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
