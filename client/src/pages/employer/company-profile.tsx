import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Save, 
  Loader2,
  Building2,
  ChevronDown,
  ShoppingCart,
  MessageSquare,
  CheckCircle,
  X,
  ArrowLeft
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { companySizes } from "@shared/schema";
import { countryCodes as allCountryCodes } from "@/lib/countryCodes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest, apiRequestFormData } from "@/lib/queryClient";
import { getEmployerAuth, saveEmployerAuth } from "@/lib/employerAuth";
import { EmployerHeader } from "@/components/employer/EmployerHeader";

const personalEmailDomains = new Set([
  "gmail.com",
  "yahoo.com",
  "yahoo.in",
  "outlook.com",
  "hotmail.com",
  "icloud.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "gmx.com",
  "live.com",
  "rediffmail.com",
]);

// Basic Info Schema
const basicInfoSchema = z.object({
  companyName: z.string().min(2, "Company name is required"),
  logoUrl: z.string().optional().or(z.literal("")),
  websiteUrl: z
    .string()
    .trim()
    .min(1, "Website URL is required")
    .transform((val) => (val.startsWith("http://") || val.startsWith("https://") ? val : `https://${val}`))
    .pipe(z.string().url("Please enter a valid URL")),
  companyEmail: z.string().email("Please enter a valid email"),
  companySize: z.string().min(1, "Please select company size"),
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  primaryContactName: z.string().min(2, "Name is required"),
  primaryContactRole: z.string().min(2, "Role is required"),
  primaryContactCountryCode: z.string().optional(),
  primaryContactPhone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      const digits = String(val ?? "").replace(/\D/g, "");
      if (!digits) return true;
      if (/^0+$/.test(digits)) return false;
      return digits.length >= 10 && digits.length <= 15;
    }, {
      message: "Enter a valid contact number",
    }),
  escalationContactName: z.string().optional(),
  escalationContactEmail: z
    .string()
    .email("Please enter a valid email")
    .optional()
    .or(z.literal(""))
    .refine(
      (email) => {
        const value = String(email ?? "").trim().toLowerCase();
        if (!value) return true;
        const domain = value.split("@").pop() ?? "";
        return !!domain && !personalEmailDomains.has(domain);
      },
      {
        message: "Please use a company/work email address (not Gmail, Yahoo, Outlook, etc.)",
      },
    ),
  escalationContactCountryCode: z.string().optional(),
  escalationContactPhone: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((val) => {
      const digits = String(val ?? "").replace(/\D/g, "");
      if (!digits) return true;
      return digits.length >= 6 && digits.length <= 15;
    }, {
      message: "Enter a valid contact number",
    }),
  escalationContactRole: z.string().optional(),
}).superRefine((data, ctx) => {
  const companyEmail = String((data as any)?.companyEmail ?? "").trim();
  const escalationName = String((data as any)?.escalationContactName ?? "").trim();
  const escalationEmail = String((data as any)?.escalationContactEmail ?? "").trim();
  const escalationCode = String((data as any)?.escalationContactCountryCode ?? "").trim();
  const escalationPhone = String((data as any)?.escalationContactPhone ?? "").trim();
  const escalationRole = String((data as any)?.escalationContactRole ?? "").trim();
  const escalationAny = Boolean(escalationName || escalationEmail || escalationPhone || escalationRole);

  if (companyEmail && escalationEmail && companyEmail.toLowerCase() === escalationEmail.toLowerCase()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["escalationContactEmail"],
      message: "Email already exists",
    });
  }

  if (escalationAny) {
    if (!escalationName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["escalationContactName"],
        message: "Name is required for secondary contact",
      });
    }
    if (!escalationEmail) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["escalationContactEmail"],
        message: "Email is required for secondary contact",
      });
    }
    if (!escalationCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["escalationContactCountryCode"],
        message: "Country code is required for secondary contact",
      });
    }
    if (!escalationPhone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["escalationContactPhone"],
        message: "Phone is required for secondary contact",
      });
    }
    if (!escalationRole) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["escalationContactRole"],
        message: "Role is required for secondary contact",
      });
    }
  }

  const lengthRules: Record<string, { min: number; max: number }> = {
    "+91": { min: 10, max: 10 },
    "+1": { min: 10, max: 10 },
    "+44": { min: 10, max: 10 },
    "+61": { min: 9, max: 10 },
    "+49": { min: 10, max: 11 },
    "+33": { min: 9, max: 9 },
    "+81": { min: 10, max: 11 },
    "+86": { min: 11, max: 11 },
    "+65": { min: 8, max: 8 },
    "+971": { min: 9, max: 9 },
  };

  const primaryCode = String((data as any)?.primaryContactCountryCode ?? "").trim();
  const primaryDigits = String((data as any)?.primaryContactPhone ?? "").replace(/\D/g, "");
  if (primaryDigits) {
    const rule = lengthRules[primaryCode] ?? { min: 6, max: 15 };
    if (primaryDigits.length < rule.min || primaryDigits.length > rule.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryContactPhone"],
        message: `Enter a valid contact number for ${primaryCode || "selected country"} (${rule.min}-${rule.max} digits)`,
      });
    }
  }

  const escalationDigits = String((data as any)?.escalationContactPhone ?? "").replace(/\D/g, "");
  if (escalationDigits) {
    const rule = lengthRules[escalationCode] ?? { min: 6, max: 15 };
    if (escalationDigits.length < rule.min || escalationDigits.length > rule.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["escalationContactPhone"],
        message: `Enter a valid contact number for ${escalationCode || "selected country"} (${rule.min}-${rule.max} digits)`,
      });
    }
  }

  const primaryDigits2 = String((data as any)?.primaryContactPhone ?? "").replace(/\D/g, "");
  const escalationDigits2 = String((data as any)?.escalationContactPhone ?? "").replace(/\D/g, "");
  const samePrimaryEscalationCode =
    String((data as any)?.primaryContactCountryCode ?? "").trim() ===
    String((data as any)?.escalationContactCountryCode ?? "").trim();
  if (samePrimaryEscalationCode && primaryDigits2 && escalationDigits2 && primaryDigits2 === escalationDigits2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["escalationContactPhone"],
      message: "Number already exists",
    });
  }
});

export default function CompanyProfilePage() {
  const [activeTab, setActiveTab] = useState("basic");
  const [isSaving, setIsSaving] = useState(false);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string>("");
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Sample projects for dropdown
  const projects = [
    { id: "1", name: "test 1" },
    { id: "2", name: "Mobile App" },
    { id: "3", name: "Web Platform" },
  ];
  const [selectedProject, setSelectedProject] = useState(projects[0]);

  const basicForm = useForm({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      companyName: "",
      logoUrl: "",
      websiteUrl: "",
      companyEmail: "",
      companySize: "",
      country: "",
      city: "",
      state: "",
      primaryContactName: "",
      primaryContactRole: "",
      primaryContactCountryCode: "+91",
      primaryContactPhone: "",
      escalationContactName: "",
      escalationContactEmail: "",
      escalationContactCountryCode: "+91",
      escalationContactPhone: "",
      escalationContactRole: "",
    },
  });

  const logoUrlValue = basicForm.watch("logoUrl");

  useEffect(() => {
    const url = String(logoUrlValue ?? "").trim();
    if (!url) {
      setLogoPreviewUrl("");
      return;
    }
    setLogoPreviewUrl(url);
  }, [logoUrlValue]);

  const countryValue = basicForm.watch("country");
  const hasCountry = Boolean((countryValue || "").trim());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const auth = getEmployerAuth();
        if (!auth?.id) return;
        const res = await apiRequest("GET", `/api/employer/${encodeURIComponent(String(auth.id))}`);
        const json = await res.json().catch(() => null);
        const employer = json?.employer as any;
        if (!employer || cancelled) return;
        saveEmployerAuth(employer);
        basicForm.reset({
          ...basicForm.getValues(),
          companyName: String(employer.companyName ?? ""),
          logoUrl: String(employer.logoUrl ?? ""),
          websiteUrl: String(employer.websiteUrl ?? ""),
          companyEmail: String(employer.companyEmail ?? ""),
          companySize: String(employer.companySize ?? ""),
          country: String(employer.country ?? ""),
          city: String(employer.city ?? ""),
          state: String(employer.state ?? ""),
          primaryContactName: String(employer.primaryContactName ?? ""),
          primaryContactRole: String(employer.primaryContactRole ?? ""),
          primaryContactCountryCode: String(employer.countryCode ?? "+91"),
          primaryContactPhone: String(employer.phoneNumber ?? ""),
          escalationContactName: String(employer.escalationContactName ?? ""),
          escalationContactEmail: String(employer.escalationContactEmail ?? ""),
          escalationContactCountryCode: String(employer.escalationContactCountryCode ?? "+91"),
          escalationContactPhone: String(employer.escalationContactPhone ?? ""),
          escalationContactRole: String(employer.escalationContactRole ?? ""),
        });
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [basicForm]);

  const primaryContactCode = basicForm.watch("primaryContactCountryCode");
  const escalationContactCode = basicForm.watch("escalationContactCountryCode");

  const escalationContactName = basicForm.watch("escalationContactName");
  const escalationContactEmail = basicForm.watch("escalationContactEmail");
  const escalationContactPhone = basicForm.watch("escalationContactPhone");
  const escalationContactRole = basicForm.watch("escalationContactRole");
  const escalationAny = Boolean(
    String(escalationContactName ?? "").trim() ||
      String(escalationContactEmail ?? "").trim() ||
      String(escalationContactPhone ?? "").trim() ||
      String(escalationContactRole ?? "").trim(),
  );
  const escalationAllFilled =
    !escalationAny ||
    (Boolean(String(escalationContactName ?? "").trim()) &&
      Boolean(String(escalationContactEmail ?? "").trim()) &&
      Boolean(String(escalationContactCode ?? "").trim()) &&
      Boolean(String(escalationContactPhone ?? "").trim()) &&
      Boolean(String(escalationContactRole ?? "").trim()));
  const disableSaveForEscalation = escalationAny && !escalationAllFilled;

  // Load employer profile from backend when page mounts
  useEffect(() => {
    const load = async () => {
      const auth = getEmployerAuth();
      if (!auth) {
        setLocation("/employer/login");
        return;
      }

      try {
        const response = await apiRequest("GET", `/api/employer/${auth.id}`);
        const json = await response.json();

        if (!response.ok || !json?.employer) return;

        const employer = json.employer as any;

        basicForm.reset({
          companyName: employer.companyName ?? "",
          logoUrl: employer.logoUrl ?? "",
          websiteUrl: employer.websiteUrl ?? "",
          companyEmail: employer.companyEmail ?? "",
          companySize: employer.companySize ?? "",
          country: employer.country ?? "",
          city: employer.city ?? "",
          state: employer.state ?? "",
          primaryContactName: employer.primaryContactName ?? "",
          primaryContactRole: employer.primaryContactRole ?? "",
          primaryContactCountryCode: employer.countryCode ?? "+91",
          primaryContactPhone: (() => {
            const raw = String(employer.phoneNumber ?? "");
            const digits = raw.replace(/\D/g, "");
            return /^0+$/.test(digits) ? "" : raw;
          })(),
          escalationContactName: employer.escalationContactName ?? "",
          escalationContactEmail: employer.escalationContactEmail ?? "",
          escalationContactCountryCode: employer.escalationContactCountryCode ?? "+91",
          escalationContactPhone: employer.escalationContactPhone ?? "",
          escalationContactRole: employer.escalationContactRole ?? "",
        });

        // keep local auth in sync so header etc. show latest name/company
        saveEmployerAuth(employer);
      } catch (error) {
        // silent fail; user can still edit manually
        console.error("Failed to load employer profile", error);
      }
    };

    load();
  }, [basicForm, setLocation]);

  const saveProfileToBackend = async () => {
    const auth = getEmployerAuth();
    if (!auth) {
      setLocation("/employer/login");
      return;
    }

    const basic = basicForm.getValues();

    const normalizedWebsiteUrl =
      basic.websiteUrl && !(basic.websiteUrl.startsWith("http://") || basic.websiteUrl.startsWith("https://"))
        ? `https://${basic.websiteUrl}`
        : basic.websiteUrl;

    setIsSaving(true);
    try {
      const payload = {
        companyName: basic.companyName,
        logoUrl: String((basic as any).logoUrl ?? "").trim() || undefined,
        websiteUrl: normalizedWebsiteUrl,
        companyEmail: basic.companyEmail,
        companySize: basic.companySize,
        country: basic.country,
        city: basic.city,
        state: basic.state,
        primaryContactName: basic.primaryContactName,
        primaryContactRole: basic.primaryContactRole,
        primaryContactCountryCode: (basic as any).primaryContactCountryCode,
        primaryContactPhone: (basic as any).primaryContactPhone,
        secondaryContactName: basic.escalationContactName,
        secondaryContactEmail: basic.escalationContactEmail,
        secondaryContactCountryCode: basic.escalationContactCountryCode,
        secondaryContactPhone: basic.escalationContactPhone,
        secondaryContactRole: basic.escalationContactRole,
      };

      const response = await apiRequest("PUT", `/api/employer/${auth.id}/setup`, payload);
      const json = await response.json();

      if (json?.employer) {
        saveEmployerAuth(json.employer);
      }

      toast({
        title: "Profile updated",
        description: "Your company information has been saved.",
      });
      setLocation("/employer/account");
    } catch (error) {
      const status = Number((error as any)?.status ?? 0);
      const rawMessage = String((error as any)?.message ?? "").trim().toLowerCase();
      const isDuplicatePhone =
        status === 409 ||
        rawMessage.includes("phone number already in use") ||
        rawMessage.includes("number already exists");

      if (isDuplicatePhone) {
        const msg = "Number already exists";
        basicForm.setError("primaryContactPhone", { type: "manual", message: msg });
        basicForm.setError("escalationContactPhone", { type: "manual", message: msg });
      }
      toast({
        title: "Error",
        description: isDuplicatePhone ? "Number already exists." : "Failed to save changes.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBasicInfoSave = async (_data: z.infer<typeof basicInfoSchema>) => {
    await saveProfileToBackend();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40">
      <EmployerHeader active="none" />

      {/* Content */}
      <div className="container px-4 md:px-8 py-8 max-w-4xl mx-auto">
        <Card className="border-0 shadow-xl shadow-emerald-900/5 rounded-3xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-2 text-white hover:bg-white/10"
                onClick={() => setLocation("/employer/account")}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <h1 className="text-xl font-bold text-white">Company Profile</h1>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-slate-100 px-8">
              <TabsList className="h-14 bg-transparent gap-8 p-0">
                <TabsTrigger 
                  value="basic" 
                  className="h-14 px-0 border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-700 rounded-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none font-medium"
                >
                  Basic Info
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="p-8 mt-0">
              <Form {...basicForm}>
                <form onSubmit={basicForm.handleSubmit(handleBasicInfoSave)} className="space-y-8">
                  {/* Company Details Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Company Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={basicForm.control}
                        name="companyName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Company Name <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={basicForm.control}
                        name="logoUrl"
                        render={() => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">Company Logo</FormLabel>
                            <FormControl>
                              <div className="space-y-2">
                                <input
                                  ref={logoFileInputRef}
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;

                                    if (file.size > 1 * 1024 * 1024) {
                                      toast({
                                        title: "File too large",
                                        description: "Logo must be 1MB or smaller.",
                                        variant: "destructive",
                                      });
                                      e.target.value = "";
                                      return;
                                    }

                                    const auth = getEmployerAuth();
                                    if (!auth?.id) {
                                      toast({
                                        title: "Please login",
                                        description: "You need to be logged in to upload a logo.",
                                        variant: "destructive",
                                      });
                                      setLocation("/employer/login");
                                      return;
                                    }

                                    try {
                                      setIsLogoUploading(true);
                                      const fd = new FormData();
                                      fd.append("logo", file);
                                      const res = await apiRequestFormData(
                                        "POST",
                                        `/api/employer/${encodeURIComponent(String(auth.id))}/logo/upload`,
                                        fd,
                                      );
                                      const json = await res.json().catch(() => null);
                                      const nextLogoUrl = String(json?.logoUrl ?? "").trim();
                                      if (!nextLogoUrl) throw new Error("Upload failed");

                                      basicForm.setValue("logoUrl", nextLogoUrl, { shouldValidate: true, shouldDirty: true });
                                      if (json?.employer) {
                                        saveEmployerAuth(json.employer);
                                      }
                                      toast({
                                        title: "Logo uploaded",
                                        description: "Your company logo has been uploaded.",
                                      });
                                    } catch (err: any) {
                                      const msg = String(err?.message ?? "Failed to upload logo");
                                      toast({
                                        title: "Upload failed",
                                        description: msg,
                                        variant: "destructive",
                                      });
                                    } finally {
                                      setIsLogoUploading(false);
                                      e.target.value = "";
                                    }
                                  }}
                                />

                                <div className="flex items-center gap-3">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-11 rounded-xl"
                                    disabled={isLogoUploading}
                                    onClick={() => logoFileInputRef.current?.click()}
                                  >
                                    {isLogoUploading ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Uploading...
                                      </>
                                    ) : (
                                      "Upload Logo"
                                    )}
                                  </Button>
                                  <div className="text-xs text-slate-500">
                                    Max size: 1MB
                                  </div>
                                </div>

                                {logoPreviewUrl ? (
                                  <div className="flex items-center gap-3">
                                    <div className="h-11 w-11 rounded-xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
                                      <img
                                        src={logoPreviewUrl}
                                        alt="Company logo preview"
                                        className="h-full w-full object-contain"
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="text-xs font-medium text-slate-700">Preview</div>
                                      <div className="text-[11px] text-slate-500 truncate">{logoPreviewUrl}</div>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500">No logo uploaded yet.</div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={basicForm.control}
                        name="websiteUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Website URL <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter Website URL"
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={basicForm.control}
                        name="companyEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Company Email
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-11 rounded-xl border-slate-200 bg-slate-50"
                                disabled
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={basicForm.control}
                        name="companySize"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Size of Company <span className="text-red-500">*</span>
                            </FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                  <SelectValue placeholder="Select size" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {companySizes.map((size) => (
                                  <SelectItem key={size.value} value={size.value}>
                                    {size.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">Office Location</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={basicForm.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Country <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter country"
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={basicForm.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              City <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={hasCountry ? "Enter City" : "Select country first"}
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                disabled={!hasCountry}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={basicForm.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              State/Province <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder={hasCountry ? "Enter State" : "Select country first"}
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                disabled={!hasCountry}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* First Point of Contact Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">First Point of Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={basicForm.control}
                        name="primaryContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Full Name <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={basicForm.control}
                        name="primaryContactRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Position / Role <span className="text-red-500">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter Position / Role"
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={basicForm.control}
                        name="primaryContactCountryCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">Country Code</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                  <SelectValue placeholder="Code" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allCountryCodes.map((c) => (
                                    <SelectItem key={`${c.name}-${c.code}-primary`} value={c.code}>
                                      {c.name} {c.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={basicForm.control}
                        name="primaryContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">Contact Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter Contact Number"
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                value={field.value ?? ""}
                                inputMode="numeric"
                                maxLength={String(primaryContactCode ?? "+91") === "+91" ? 10 : 15}
                                onChange={(e) => {
                                  const code = String(primaryContactCode ?? "+91");
                                  const maxLen = code === "+91" || code === "+1" || code === "+44" ? 10 : 15;
                                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                                  field.onChange(digitsOnly);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Escalation Contact Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Escalation Contact <span className="text-emerald-600 font-normal">(Second Contact)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={basicForm.control}
                        name="escalationContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter Name"
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={basicForm.control}
                        name="escalationContactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">Email</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter Email"
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={basicForm.control}
                        name="escalationContactCountryCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">Country Code</FormLabel>
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                  <SelectValue placeholder="Code" />
                                </SelectTrigger>
                                <SelectContent>
                                  {allCountryCodes.map((c) => (
                                    <SelectItem key={`${c.name}-${c.code}`} value={c.code}>
                                      {c.name} {c.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={basicForm.control}
                        name="escalationContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">Phone</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter Phone"
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                value={field.value ?? ""}
                                inputMode="numeric"
                                maxLength={String(escalationContactCode ?? "+91") === "+91" ? 10 : 15}
                                onChange={(e) => {
                                  const code = String(escalationContactCode ?? "+91");
                                  const maxLen = code === "+91" || code === "+1" || code === "+44" ? 10 : 15;
                                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                                  field.onChange(digitsOnly);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={basicForm.control}
                        name="escalationContactRole"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-medium text-slate-600">
                              Position / <span className="text-red-500">Role</span>
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Enter Position / Role"
                                className="h-11 rounded-xl border-slate-200 focus:border-emerald-400"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-center pt-4">
                    <Button
                      type="submit"
                      disabled={isSaving || disableSaveForEscalation}
                      className="h-12 px-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

