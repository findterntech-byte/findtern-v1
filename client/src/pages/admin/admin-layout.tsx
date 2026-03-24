import {

  SidebarProvider,

  Sidebar,

  SidebarContent,

  SidebarFooter,

  SidebarGroup,

  SidebarGroupContent,

  SidebarHeader,

  SidebarInset,

  SidebarMenu,

  SidebarMenuButton,

  SidebarMenuItem,

  SidebarMenuSub,

  SidebarMenuSubButton,

  SidebarMenuSubItem,

  SidebarTrigger,

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

} from "lucide-react";

import findternLogo from "@assets/logo-1.jpg";

import React, { ReactNode } from "react";

import { apiRequest } from "@/lib/queryClient";



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


  { label: "Notifications", icon: Bell, href: "/admin/notifications", required: "notifications:read" },

  {
    label: "Contact Messages",
    icon: FolderKanban,
    href: "/admin/contact",
    required: ["contact:intern:read", "contact:employer:read"],
  },

  { label: "Roles", icon: Shield, href: "/admin/roles", required: "roles:write" },

];



// const settingsItem: NavItem = { label: "Settings", icon: Settings, href: "/admin/settings" };



const internItems: NavItem[] = [

  { label: "Interns", icon: GraduationCap, href: "/admin/interns", required: "interns:read" },

  {
    label: "Terms & Conditions",
    icon: FolderKanban,
    href: "/admin/interns/terms",
    required: "interns:read",
  },

  {
    label: "Non-Disclosure Clauses",
    icon: FolderKanban,
    href: "/admin/interns/non-disclosure",
    required: "interns:read",
  },

];



const companyItems: NavItem[] = [

  { label: "Companies", icon: Building2, href: "/admin/companies", required: "companies:read" },

  { label: "Projects", icon: FolderKanban, href: "/admin/projects", required: "companies:read" },

  {
    label: "Terms & Conditions",
    icon: FolderKanban,
    href: "/admin/companies/terms",
    required: "companies:read",
  },

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



export function AdminLayout({ title, description, children }: AdminLayoutProps) {

  const [location, setLocation] = useLocation();

  const [adminPermissions, setAdminPermissions] = React.useState<string[] | null>(null);



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
      } catch {
        if (!cancelled) setAdminPermissions([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const can = React.useCallback(
    (required?: string | string[]) => {
      if (!required) return true;
      const perms = adminPermissions;
      if (!perms) return true;
      if (perms.includes("*")) return true;
      if (Array.isArray(required)) return required.some((p) => perms.includes(p));
      return perms.includes(required);
    },
    [adminPermissions],
  );

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



  React.useEffect(() => {

    if (isInternRoute) setInternOpen(true);

  }, [isInternRoute]);



  React.useEffect(() => {

    if (isCompanyRoute) setCompanyOpen(true);

  }, [isCompanyRoute]);



  React.useEffect(() => {

    if (isReportsRoute) setReportsOpen(true);

  }, [isReportsRoute]);



  React.useEffect(() => {

    if (isCmsRoute) setCmsOpen(true);

  }, [isCmsRoute]);



  const handleLogout = async () => {

    try {

      await apiRequest("POST", "/api/admin/logout");

    } catch {

      // ignore

    } finally {

      setLocation("/admin/login");

    }

  };



  return (

    <SidebarProvider defaultOpen={true} className="bg-background">

      {/* Light sidebar so text is always clearly visible */}

      <Sidebar className="border-r bg-white text-slate-900" collapsible="offcanvas">

        <SidebarHeader className="flex items-center gap-3 border-b px-4 py-4">
 <div className="flex justify-center" data-testid="logo-container">
          <img
            src={findternLogo}
            alt="Findtern - Internship Simplified"
            className=" w-auto"
            data-testid="img-logo"
          />
        </div>

        </SidebarHeader>

        <SidebarContent className="px-2 pt-2">

          <SidebarGroup>

            <SidebarGroupContent>

              <SidebarMenu className="space-y-1">

                {visibleNavItems.map((item) => {

                  const Icon = item.icon;

                  const isActive = location === item.href || location.startsWith(item.href.split("?")[0]);

                  return (

                    <SidebarMenuItem key={item.href}>

                      <SidebarMenuButton

                        isActive={isActive}

                        onClick={() => setLocation(item.href)}

                        className={`text-[13px] font-medium transition-all duration-150

                          ${

                            isActive

                              ? "bg-emerald-50 text-emerald-900 shadow-sm"

                              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                          }`}

                      >

                        <div

                          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[13px]

                            ${

                              isActive

                                ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                : "border-slate-200 bg-slate-50 text-slate-500"

                            }`}

                        >

                          <Icon className="h-3.5 w-3.5" />

                        </div>

                        <span>{item.label}</span>

                      </SidebarMenuButton>

                    </SidebarMenuItem>

                  );

                })}



                {visibleInternItems.length > 0 && (
                  <Collapsible open={internOpen} onOpenChange={setInternOpen}>

                  <SidebarMenuItem>

                    <CollapsibleTrigger asChild>

                      <SidebarMenuButton

                        isActive={isInternRoute}

                        className={`text-[13px] font-medium transition-all duration-150

                          ${

                            isInternRoute

                              ? "bg-emerald-50 text-emerald-900 shadow-sm"

                              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                          }`}

                      >

                        <div

                          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[13px]

                            ${

                              isInternRoute

                                ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                : "border-slate-200 bg-slate-50 text-slate-500"

                            }`}

                        >

                          <GraduationCap className="h-3.5 w-3.5" />

                        </div>

                        <span>Interns</span>

                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", internOpen ? "rotate-180" : "")} />

                      </SidebarMenuButton>

                    </CollapsibleTrigger>

                    <CollapsibleContent>

                      <SidebarMenuSub>

                        {visibleInternItems.map((sub) => {

                          const Icon = sub.icon;

                          const isActive = location === sub.href || location.startsWith(sub.href);

                          return (

                            <SidebarMenuSubItem key={sub.href}>

                              <SidebarMenuSubButton

                                href={sub.href}

                                isActive={isActive}

                                onClick={(e) => {

                                  e.preventDefault();

                                  setLocation(sub.href);

                                }}

                                className={cn(

                                  "gap-2 text-[13px]",

                                  isActive

                                    ? "bg-emerald-50 text-emerald-900"

                                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                                )}

                              >

                                <span

                                  className={cn(

                                    "flex h-6 w-6 items-center justify-center rounded-md border",

                                    isActive

                                      ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                      : "border-slate-200 bg-white text-slate-500"

                                  )}

                                >

                                  <Icon className="h-3.5 w-3.5" />

                                </span>

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

                      <SidebarMenuButton

                        isActive={isCompanyRoute}

                        className={`text-[13px] font-medium transition-all duration-150

                          ${

                            isCompanyRoute

                              ? "bg-emerald-50 text-emerald-900 shadow-sm"

                              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                          }`}

                      >

                        <div

                          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[13px]

                            ${

                              isCompanyRoute

                                ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                : "border-slate-200 bg-slate-50 text-slate-500"

                            }`}

                        >

                          <Building2 className="h-3.5 w-3.5" />

                        </div>

                        <span>Company</span>

                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", companyOpen ? "rotate-180" : "")} />

                      </SidebarMenuButton>

                    </CollapsibleTrigger>

                    <CollapsibleContent>

                      <SidebarMenuSub>

                        {visibleCompanyItems.map((sub) => {

                          const Icon = sub.icon;

                          const isActive = location === sub.href || location.startsWith(sub.href);

                          return (

                            <SidebarMenuSubItem key={sub.href}>

                              <SidebarMenuSubButton

                                href={sub.href}

                                isActive={isActive}

                                onClick={(e) => {

                                  e.preventDefault();

                                  setLocation(sub.href);

                                }}

                                className={cn(

                                  "gap-2 text-[13px]",

                                  isActive

                                    ? "bg-emerald-50 text-emerald-900"

                                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                                )}

                              >

                                <span

                                  className={cn(

                                    "flex h-6 w-6 items-center justify-center rounded-md border",

                                    isActive

                                      ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                      : "border-slate-200 bg-white text-slate-500"

                                  )}

                                >

                                  <Icon className="h-3.5 w-3.5" />

                                </span>

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

                      <SidebarMenuButton

                        isActive={isReportsRoute}

                        className={`text-[13px] font-medium transition-all duration-150

                          ${

                            isReportsRoute

                              ? "bg-emerald-50 text-emerald-900 shadow-sm"

                              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                          }`}

                      >

                        <div

                          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[13px]

                            ${

                              isReportsRoute

                                ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                : "border-slate-200 bg-slate-50 text-slate-500"

                            }`}

                        >

                          <Newspaper className="h-3.5 w-3.5" />

                        </div>

                        <span>Reports</span>

                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", reportsOpen ? "rotate-180" : "")} />

                      </SidebarMenuButton>

                    </CollapsibleTrigger>

                    <CollapsibleContent>

                      <SidebarMenuSub>

                        {visibleReportsItems.map((sub) => {

                          const Icon = sub.icon;

                          const isActive = location === sub.href || location.startsWith(sub.href);

                          return (

                            <SidebarMenuSubItem key={sub.href}>

                              <SidebarMenuSubButton

                                href={sub.href}

                                isActive={isActive}

                                onClick={(e) => {

                                  e.preventDefault();

                                  setLocation(sub.href);

                                }}

                                className={cn(

                                  "gap-2 text-[13px]",

                                  isActive

                                    ? "bg-emerald-50 text-emerald-900"

                                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                                )}

                              >

                                <span

                                  className={cn(

                                    "flex h-6 w-6 items-center justify-center rounded-md border",

                                    isActive

                                      ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                      : "border-slate-200 bg-white text-slate-500"

                                  )}

                                >

                                  <Icon className="h-3.5 w-3.5" />

                                </span>

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

                      <SidebarMenuButton

                        isActive={isCmsRoute}

                        className={`text-[13px] font-medium transition-all duration-150

                          ${

                            isCmsRoute

                              ? "bg-emerald-50 text-emerald-900 shadow-sm"

                              : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                          }`}

                      >

                        <div

                          className={`flex h-6 w-6 items-center justify-center rounded-md border text-[13px]

                            ${

                              isCmsRoute

                                ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                : "border-slate-200 bg-slate-50 text-slate-500"

                            }`}

                        >

                          <Globe className="h-3.5 w-3.5" />

                        </div>

                        <span>Website CMS</span>

                        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", cmsOpen ? "rotate-180" : "")} />

                      </SidebarMenuButton>

                    </CollapsibleTrigger>

                    <CollapsibleContent>

                      <SidebarMenuSub>

                        {visibleCmsItems.map((sub) => {

                          const expectedTab = new URLSearchParams(sub.href.split("?")[1] ?? "").get("tab");

                          const isActive = isCmsRoute && expectedTab != null && activeCmsTab === expectedTab;

                          const Icon = sub.icon;

                          return (

                            <SidebarMenuSubItem key={sub.href}>

                              <SidebarMenuSubButton

                                href={sub.href}

                                isActive={isActive}

                                onClick={(e) => {

                                  e.preventDefault();

                                  setLocation(sub.href);

                                }}

                                className={cn(

                                  "gap-2 text-[13px]",

                                  isActive

                                    ? "bg-emerald-50 text-emerald-900"

                                    : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-900"

                                )}

                              >

                                <span

                                  className={cn(

                                    "flex h-6 w-6 items-center justify-center rounded-md border",

                                    isActive

                                      ? "border-emerald-500 bg-emerald-100 text-emerald-900"

                                      : "border-slate-200 bg-white text-slate-500"

                                  )}

                                >

                                  <Icon className="h-3.5 w-3.5" />

                                </span>

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

        <SidebarFooter className="border-t bg-slate-50 px-3 py-3">

          <Button

            variant="ghost"

            className="w-full justify-start gap-2 rounded-lg bg-white text-xs font-medium text-slate-700 hover:bg-slate-100"

            onClick={handleLogout}

          >

            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-red-50 text-red-500">

              <LogOut className="h-3.5 w-3.5" />

            </span>

            <span>Logout</span>

          </Button>

        </SidebarFooter>

      </Sidebar>

      <SidebarInset className="flex flex-col min-h-screen overflow-x-hidden">

        <header className="sticky top-0 z-40 flex h-14 items-center border-b bg-background/90 px-4 backdrop-blur md:px-6">

          <div className="flex flex-1 items-center gap-3">

            <SidebarTrigger className="h-8 w-8 shrink-0 md:hidden" />

            <div className="min-w-0 flex-1">

              <h1 className="text-lg font-semibold tracking-tight text-[#0E6049]">

                {title}

              </h1>

              {description && (

                <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">

                  {description}

                </p>

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

    </SidebarProvider>

  );

}





