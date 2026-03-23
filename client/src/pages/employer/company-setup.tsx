import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Loader2,
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  Globe,
  Users,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
import { companySizes, countryCodes } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { getEmployerAuth, getEmployerAuthProvider, saveEmployerAuth } from "@/lib/employerAuth";
import findternLogo from "@assets/logo.png";
import cityStatePincode from "@/data/cityStatePincode.json";

// Company Setup Schema
const companySetupSchema = z
  .object({
    companyName: z.string().min(2, "Company name is required"),
    websiteUrl: z
      .string()
      .min(1, "Website URL is required")
      .refine(
        (raw) => {
          const input = String(raw ?? "").trim();
          if (!input) return false;

          const normalized = /^https?:\/\//i.test(input) ? input : `https://${input}`;

          try {
            const u = new URL(normalized);
            if (u.protocol !== "http:" && u.protocol !== "https:") return false;
            const host = (u.hostname ?? "").trim();
            if (!host) return false;
            if (!host.includes(".")) return false;

            const tld = host.split(".").pop() ?? "";
            if (tld.length < 2) return false;
            return true;
          } catch {
            return false;
          }
        },
        {
          message: "Please enter a valid website URL (http/https + valid domain)",
        },
      ),
    companyEmail: z.string().email("Please enter a valid email"),
    companySize: z.string().min(1, "Please select company size"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    primaryContactName: z.string().min(2, "Name is required"),
    primaryContactRole: z.string().min(2, "Role is required"),
    primaryContactCountryCode: z
      .string()
      .min(1, "Country code is required")
      .refine((code) => countryCodes.some((c) => c.code === code), {
        message: "Please select a valid country code",
      }),
    primaryContactPhone: z
      .string()
      .min(1, "Contact number is required")
      .refine((val) => /^\d+$/.test(String(val ?? "")), {
        message: "Contact number must contain digits only",
      })
      .refine((val) => !/^0+$/.test(String(val ?? "").replace(/\D/g, "")), {
        message: "Please enter a valid contact number",
      }),
    secondaryContactName: z.string().optional(),
    secondaryContactEmail: z
      .string()
      .email("Please enter a valid email")
      .optional()
      .or(z.literal(""))
      .refine((email) => {
        const value = String(email ?? "").trim();
        if (!value) return true;
        const domain = value.split("@").pop()?.toLowerCase() || "";
        const personalDomains = new Set([
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
        if (domain && personalDomains.has(domain)) {
          return false;
        }
        return true;
      }),
    secondaryContactCountryCode: z.string().optional(),
    secondaryContactPhone: z.string().optional(),
    secondaryContactRole: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const code = String(data.primaryContactCountryCode ?? "").trim();
    const digits = String(data.primaryContactPhone ?? "").replace(/\D/g, "");

    const companyEmail = String(data.companyEmail ?? "").trim();
    const secondaryEmail = String(data.secondaryContactEmail ?? "").trim();
    const secondaryName = String(data.secondaryContactName ?? "").trim();
    const secondaryPhone = String(data.secondaryContactPhone ?? "").trim();
    const secondaryRole = String(data.secondaryContactRole ?? "").trim();
    const secondaryCode = String(data.secondaryContactCountryCode ?? "").trim();
    const hasAnySecondaryDetails = Boolean(secondaryName || secondaryEmail || secondaryPhone || secondaryRole);

    if (companyEmail && secondaryEmail && companyEmail.toLowerCase() === secondaryEmail.toLowerCase()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondaryContactEmail"],
        message: "Email already exists",
      });
    }

    if (hasAnySecondaryDetails) {
      if (!secondaryName) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondaryContactName"],
          message: "Secondary contact name is required",
        });
      }

      if (!secondaryEmail) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondaryContactEmail"],
          message: "Secondary contact email is required",
        });
      }

      if (!secondaryRole) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondaryContactRole"],
          message: "Secondary contact role is required",
        });
      }

      if (!secondaryCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondaryContactCountryCode"],
          message: "Country code is required for secondary contact",
        });
      }

      if (!secondaryPhone) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondaryContactPhone"],
          message: "Secondary contact number is required",
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

    const rule = lengthRules[code] ?? { min: 6, max: 15 };
    if (digits.length < rule.min || digits.length > rule.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["primaryContactPhone"],
        message: `Enter a valid contact number for ${code} (${rule.min}-${rule.max} digits)`,
      });
    }

    const secondaryPhoneRaw = String(data.secondaryContactPhone ?? "").trim();
    if (secondaryPhoneRaw) {
      const secondaryDigits = secondaryPhoneRaw.replace(/\D/g, "");
      if (!/^\d+$/.test(secondaryDigits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondaryContactPhone"],
          message: "Secondary contact number must contain digits only",
        });
      }

      if (/^0+$/.test(secondaryDigits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondaryContactPhone"],
          message: "Please enter a valid contact number",
        });
      }

      const secondaryRule = lengthRules[secondaryCode] ?? { min: 6, max: 15 };
      if (secondaryDigits.length < secondaryRule.min || secondaryDigits.length > secondaryRule.max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["secondaryContactPhone"],
          message: `Enter a valid contact number for ${secondaryCode || "selected country"} (${secondaryRule.min}-${secondaryRule.max} digits)`,
        });
      }
    }

    const secondaryDigits2 = String(data.secondaryContactPhone ?? "").trim().replace(/\D/g, "");
    const samePrimarySecondaryCode =
      String(data.primaryContactCountryCode ?? "").trim() === String(data.secondaryContactCountryCode ?? "").trim();
    if (samePrimarySecondaryCode && digits && secondaryDigits2 && digits === secondaryDigits2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["secondaryContactPhone"],
        message: "Number already exists",
      });
    }
  });

type CompanySetupForm = z.infer<typeof companySetupSchema>;

export default function CompanySetupPage() {
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const auth = getEmployerAuth();
  const isGoogleAuth = String(getEmployerAuthProvider() ?? "").trim().toLowerCase() === "google";
  const skipGooglePrefill = isGoogleAuth && !Boolean(auth?.setupCompleted);

  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [manualCityState, setManualCityState] = useState(false);
  const cityInputRef = useRef<HTMLInputElement | null>(null);

  const cityPlaceholder = cityPopoverOpen ? "Search your city..." : "Enter your city";

  const form = useForm<CompanySetupForm>({
    resolver: zodResolver(companySetupSchema),
    defaultValues: {
      companyName: skipGooglePrefill ? "" : auth?.companyName ?? "",
      websiteUrl: "",
      companyEmail: auth?.companyEmail ?? "",
      companySize: "",
      city: "",
      state: "",
      primaryContactName: auth?.name ?? "",
      primaryContactRole: "",
      primaryContactCountryCode: "+91",
      primaryContactPhone: "",
      country: "",
      secondaryContactName: "",
      secondaryContactEmail: "",
      secondaryContactCountryCode: "",
      secondaryContactPhone: "",
      secondaryContactRole: "",
    },
  });

  useEffect(() => {
    const reset = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      requestAnimationFrame(() => {
        try {
          document.documentElement.scrollTop = 0;
          document.documentElement.scrollLeft = 0;
        } catch {
          // ignore
        }
        try {
          document.body.scrollTop = 0;
          document.body.scrollLeft = 0;
        } catch {
          // ignore
        }

        const containers = document.querySelectorAll<HTMLElement>(
          "[data-scroll-container], [data-radix-scroll-area-viewport], .app-main, #root, [data-scroll-root], .overflow-y-auto, .overflow-auto, .overflow-y-scroll, .overflow-scroll",
        );

        containers.forEach((el) => {
          try {
            el.scrollTo({ top: 0, left: 0, behavior: "auto" });
          } catch {
            el.scrollTop = 0;
            el.scrollLeft = 0;
          }
        });
      });
    };

    reset();
    setTimeout(reset, 0);
    setTimeout(reset, 50);
  }, []);

  useEffect(() => {
    const employerId = String(auth?.id ?? "").trim();
    if (!employerId) return;

    (async () => {
      try {
        const res = await apiRequest("GET", `/api/employer/${encodeURIComponent(employerId)}`);
        const json = await res.json();
        const employer = json?.employer as any;
        if (!employer) return;

        if (skipGooglePrefill) return;

        const companyNameState = form.getFieldState("companyName");
        if (!companyNameState.isDirty) {
          form.setValue("companyName", String(employer.companyName ?? ""), { shouldValidate: false });
        }

        const primaryPhoneState = form.getFieldState("primaryContactPhone");
        if (!primaryPhoneState.isDirty) {
          const raw = String(employer.phoneNumber ?? "");
          const digits = raw.replace(/\D/g, "");
          form.setValue("primaryContactPhone", /^0+$/.test(digits) ? "" : raw, { shouldValidate: false });
        }

        const primaryCodeState = form.getFieldState("primaryContactCountryCode");
        if (!primaryCodeState.isDirty) {
          form.setValue("primaryContactCountryCode", String(employer.countryCode ?? "+91"), { shouldValidate: false });
        }

        const secondaryPhoneState = form.getFieldState("secondaryContactPhone");
        if (!secondaryPhoneState.isDirty) {
          const raw = String(employer.escalationContactPhone ?? "");
          const digits = raw.replace(/\D/g, "");
          form.setValue("secondaryContactPhone", /^0+$/.test(digits) ? "" : raw, { shouldValidate: false });
        }

        const secondaryCodeState = form.getFieldState("secondaryContactCountryCode");
        if (!secondaryCodeState.isDirty) {
          form.setValue(
            "secondaryContactCountryCode",
            String(employer.escalationContactCountryCode ?? ""),
            { shouldValidate: false },
          );
        }
      } catch {
        // ignore
      }
    })();
  }, [auth?.id, form, skipGooglePrefill]);

  const countryValue = form.watch("country");
  const isIndia = (countryValue || "").trim().toLowerCase() === "india";
  const primaryCode = form.watch("primaryContactCountryCode");

  const cityStateOptions = useMemo(() => {
    const raw: any = cityStatePincode as any;
    const districts: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.districts)
        ? raw.districts
        : [];

    const seen = new Set<string>();
    const out: Array<{ city: string; state: string }> = [];

    for (const d of districts) {
      const city = String(d?.district ?? d?.city ?? "").trim();
      const state = String(d?.state ?? "").trim();
      if (!city || !state) continue;
      const k = `${city.toLowerCase()}__${state.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({ city, state });
    }

    return out;
  }, []);

  useEffect(() => {
    const city = String(form.getValues("city") ?? "").trim();
    const state = String(form.getValues("state") ?? "").trim();
    if (!city || !state) return;

    const k = `${city.toLowerCase()}__${state.toLowerCase()}`;
    const exists = cityStateOptions.some(
      (opt) => `${opt.city.toLowerCase()}__${opt.state.toLowerCase()}` === k,
    );
    if (!exists) setManualCityState(true);
  }, [cityStateOptions, form]);

  const handleSubmit = async (data: z.infer<typeof companySetupSchema>) => {
    setIsSaving(true);
    try {
      const auth = getEmployerAuth();
      if (!auth) {
        setLocation("/employer/login");
        return;
      }

      const normalizedWebsiteUrl = (() => {
        const raw = String(data.websiteUrl ?? "").trim();
        if (!raw) return raw;
        return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      })();

      const hasAnySecondaryDetails = Boolean(
        String(data.secondaryContactName ?? "").trim() ||
          String(data.secondaryContactEmail ?? "").trim() ||
          String(data.secondaryContactRole ?? "").trim() ||
          String(data.secondaryContactPhone ?? "").trim(),
      );

      const normalizedSecondary = hasAnySecondaryDetails
        ? {
            secondaryContactName: data.secondaryContactName,
            secondaryContactEmail: data.secondaryContactEmail,
            secondaryContactCountryCode: data.secondaryContactCountryCode,
            secondaryContactPhone: data.secondaryContactPhone,
            secondaryContactRole: data.secondaryContactRole,
          }
        : {
            secondaryContactName: "",
            secondaryContactEmail: "",
            secondaryContactCountryCode: "",
            secondaryContactPhone: "",
            secondaryContactRole: "",
          };

      const primaryCountryCode = String(data.primaryContactCountryCode ?? "").trim();
      const primaryPhoneDigits = String(data.primaryContactPhone ?? "").trim().replace(/\D/g, "");
      const secondaryCountryCode = String(normalizedSecondary.secondaryContactCountryCode ?? "").trim();
      const secondaryPhoneDigits = String(normalizedSecondary.secondaryContactPhone ?? "").trim().replace(/\D/g, "");

      if (
        primaryCountryCode &&
        secondaryCountryCode &&
        primaryPhoneDigits &&
        secondaryPhoneDigits &&
        primaryCountryCode === secondaryCountryCode &&
        primaryPhoneDigits === secondaryPhoneDigits
      ) {
        toast({
          title: "Error",
          description: "Number already exists.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        companyName: data.companyName,
        websiteUrl: normalizedWebsiteUrl,
        companyEmail: data.companyEmail,
        companySize: data.companySize,
        city: data.city,
        state: data.state,
        country: data.country,
        primaryContactName: data.primaryContactName,
        primaryContactRole: data.primaryContactRole,
        primaryContactCountryCode: data.primaryContactCountryCode,
        primaryContactPhone: data.primaryContactPhone,
        secondaryContactName: normalizedSecondary.secondaryContactName,
        secondaryContactEmail: normalizedSecondary.secondaryContactEmail,
        secondaryContactCountryCode: normalizedSecondary.secondaryContactCountryCode,
        secondaryContactPhone: normalizedSecondary.secondaryContactPhone,
        secondaryContactRole: normalizedSecondary.secondaryContactRole,
      };

      const response = await apiRequest("PUT", `/api/employer/${auth.id}/setup`, payload);
      const json = await response.json();

      if (json?.employer) {
        saveEmployerAuth(json.employer);
      }

      toast({
        title: "Company profile saved!",
        description: "Great! Now let's create your first project.",
      });

      setLocation("/employer/onboarding");
    } catch (error) {
      const rawMessage = String((error as any)?.message ?? "").trim();
      const rawMessageLower = rawMessage.toLowerCase();
      const isDuplicatePhone =
        rawMessageLower.includes("phone number already in use") || rawMessageLower.includes("number already exists");

      if (isDuplicatePhone) {
        try {
          form.setError("primaryContactPhone", { type: "manual", message: "Number already exists" });
          const secondaryValue = String(form.getValues("secondaryContactPhone") ?? "").trim();
          if (secondaryValue) {
            form.setError("secondaryContactPhone", { type: "manual", message: "Number already exists" });
          }
        } catch {
          // ignore
        }
      }

      toast({
        title: "Error",
        description: isDuplicatePhone ? "Number already exists." : "Failed to save company profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/30 to-teal-50/40">
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-2">
            <img src={findternLogo} alt="Findtern" className="mylogo" />
          </div>

          <div className="hidden xs:flex items-center text-sm">
            <div className="flex items-center gap-3 rounded-full bg-slate-100 px-3 py-1.5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[13px] font-semibold">
                  1
                </div>
                <span className="hidden sm:inline text-emerald-800 font-medium whitespace-nowrap">Company Profile</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300" />
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center text-[13px] font-semibold">
                  2
                </div>
                <span className="hidden sm:inline text-slate-400 whitespace-nowrap">Create Project</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-br from-emerald-400/10 to-teal-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gradient-to-tl from-emerald-300/10 to-cyan-300/10 rounded-full blur-3xl" />
      </div>

      <div className="container max-w-4xl mx-auto px-4 md:px-8 py-8 md:py-12 relative">
        {/* Welcome Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Welcome to Findtern!
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">
            Complete Your Company Profile
          </h1>
        </div>

        {/* Form Card */}
        <Card className="border-0 shadow-2xl shadow-emerald-900/5 rounded-3xl overflow-hidden">
          {/* Card Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Company Profile</h2>
                <p className="text-emerald-100 text-sm">Tell us about your organization</p>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div className="p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
                {/* Company Details Section */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-emerald-700 mb-4">
                    <Building2 className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Company Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Company Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                placeholder="Enter company name"
                                className="h-12 pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="websiteUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Website URL <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                placeholder="https://example.com"
                                className="h-12 pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="companyEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Company Email <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                type="email"
                                placeholder="contact@company.com"
                                className="h-12 pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                                {...field}
                                disabled
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="companySize"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Company Size <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="h-12 rounded-xl border-slate-200">
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-slate-400" />
                                  <SelectValue placeholder="Select company size" />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {companySizes.map((size) => (
                                  <SelectItem key={size.value} value={size.value}>
                                    {size.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Address Section */}
                <div className="space-y-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-700 mb-4">
                    <MapPin className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Office Location</h3>
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Country <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter country"
                              autoComplete="off"
                              className="h-12 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs md:text-sm font-medium text-foreground">
                              City<span className="text-destructive ml-0.5">*</span>
                            </FormLabel>
                            <FormControl>
                              {isIndia ? (
                                manualCityState ? (
                                  <Input
                                    placeholder="Enter your city"
                                    className={`h-10 md:h-11 rounded-lg text-sm ${form.formState.errors.city ? "border-destructive/70" : ""}`}
                                    value={field.value}
                                    onChange={(e) => field.onChange(e.target.value)}
                                  />
                                ) : (
                                  <Popover open={cityPopoverOpen} onOpenChange={setCityPopoverOpen}>
                                    <PopoverAnchor asChild>
                                      <Input
                                        placeholder={cityPlaceholder}
                                        autoComplete="off"
                                        className={`h-10 md:h-11 rounded-lg text-sm ${form.formState.errors.city ? "border-destructive/70" : ""}`}
                                        value={field.value}
                                        ref={cityInputRef}
                                        onFocus={() => {
                                          setCitySearchQuery(String(field.value ?? ""));
                                          setCityPopoverOpen(true);
                                        }}
                                        onClick={() => setCityPopoverOpen(true)}
                                        onChange={(e) => {
                                          const v = e.target.value;
                                          field.onChange(v);
                                          setCitySearchQuery(v);
                                          if (!cityPopoverOpen) setCityPopoverOpen(true);
                                          form.setValue("state", "", { shouldValidate: true });
                                        }}
                                      />
                                    </PopoverAnchor>
                                    <PopoverContent
                                      className="w-[--radix-popover-trigger-width] p-0"
                                      align="start"
                                      onOpenAutoFocus={(event: any) => {
                                        event.preventDefault();
                                        requestAnimationFrame(() => {
                                          try {
                                            cityInputRef.current?.focus({ preventScroll: true });
                                          } catch {
                                            cityInputRef.current?.focus();
                                          }
                                        });
                                      }}
                                      onFocusOutside={(event: any) => {
                                        const target = event.target as HTMLElement | null;
                                        if (target && cityInputRef.current && cityInputRef.current.contains(target)) {
                                          event.preventDefault();
                                        }
                                      }}
                                      onInteractOutside={(event: any) => {
                                        const target = event.target as HTMLElement | null;
                                        if (target && cityInputRef.current && cityInputRef.current.contains(target)) {
                                          event.preventDefault();
                                        }
                                      }}
                                    >
                                      <Command shouldFilter={false}>
                                        <CommandList>
                                          <CommandEmpty>
                                            <div className="px-2 py-2 text-xs text-muted-foreground">
                                              No city found.
                                              <Button
                                                type="button"
                                                variant="ghost"
                                                className="px-1"
                                                onClick={() => {
                                                  setManualCityState(true);
                                                  setCityPopoverOpen(false);
                                                  setCitySearchQuery("");
                                                  form.setValue("city", "", { shouldValidate: true });
                                                  form.setValue("state", "", { shouldValidate: true });
                                                }}
                                              >
                                                Enter manually
                                              </Button>
                                            </div>
                                          </CommandEmpty>
                                          <CommandGroup>
                                            {cityStateOptions
                                              .filter((item) => {
                                                if (!citySearchQuery.trim()) return true;
                                                const q = citySearchQuery.trim().toLowerCase();
                                                return (
                                                  item.city.toLowerCase().includes(q) ||
                                                  (item.state || "").toLowerCase().includes(q)
                                                );
                                              })
                                              .sort((a, b) => {
                                                const q = citySearchQuery.trim().toLowerCase();

                                                const score = (x: { city: string; state: string }) => {
                                                  if (!q) return 10;
                                                  const city = (x.city || "").toLowerCase();
                                                  const state = (x.state || "").toLowerCase();

                                                  if (city === q) return 0;
                                                  if (city.startsWith(q)) return 1;
                                                  if (city.includes(q)) return 2;
                                                  if (state === q) return 3;
                                                  if (state.startsWith(q)) return 4;
                                                  if (state.includes(q)) return 5;
                                                  return 9;
                                                };

                                                const sa = score(a);
                                                const sb = score(b);
                                                if (sa !== sb) return sa - sb;
                                                return a.city.localeCompare(b.city);
                                              })
                                              .slice(0, 50)
                                              .map((item) => (
                                                <CommandItem
                                                  key={`${item.city}-${item.state}`}
                                                  value={item.city}
                                                  onSelect={() => {
                                                    setManualCityState(false);
                                                    form.setValue("city", item.city, { shouldValidate: true });
                                                    form.setValue("state", item.state, { shouldValidate: true });
                                                    setCityPopoverOpen(false);
                                                    setCitySearchQuery("");
                                                  }}
                                                >
                                                  <div className="flex items-center justify-between w-full">
                                                    <span className="truncate">{item.city}</span>
                                                    <span className="text-xs text-muted-foreground ml-3 shrink-0">
                                                      {item.state}
                                                    </span>
                                                  </div>
                                                </CommandItem>
                                              ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                )
                              ) : (
                                <div className="relative">
                                  <Input
                                    placeholder="Enter city"
                                    className={`h-10 md:h-11 rounded-lg text-sm ${form.formState.errors.city ? "border-destructive/70" : ""}`}
                                    {...field}
                                  />
                                </div>
                              )}
                            </FormControl>
                            <FormMessage />
                            {isIndia && !manualCityState && (
                              <button
                                type="button"
                                className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                                onClick={() => {
                                  setManualCityState(true);
                                  form.setValue("city", "", { shouldValidate: true });
                                  form.setValue("state", "", { shouldValidate: true });
                                }}
                              >
                                Can&apos;t find your city? Enter manually
                              </button>
                            )}
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs md:text-sm font-medium text-foreground">
                              State/Province<span className="text-destructive ml-0.5">*</span>
                            </FormLabel>
                            <FormControl>
                              {isIndia ? (
                                <Input
                                  {...field}
                                  value={field.value}
                                  disabled={!manualCityState}
                                  placeholder={!manualCityState ? "Select a city to auto-fill state" : "Enter your state"}
                                  className={`h-10 md:h-11 rounded-lg text-sm ${form.formState.errors.state ? "border-destructive/70" : ""}`}
                                />
                              ) : (
                                <Input
                                  placeholder="Enter state"
                                  className={`h-10 md:h-11 rounded-lg text-sm ${form.formState.errors.state ? "border-destructive/70" : ""}`}
                                  {...field}
                                />
                              )}
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Primary Contact Section */}
                <div className="space-y-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-700 mb-4">
                    <User className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Primary Contact Person</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <FormField
                      control={form.control}
                      name="primaryContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Full Name <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                placeholder="Enter your name"
                                className="h-12 pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="primaryContactRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">
                            Your Role / Position <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. HR Manager, Founder"
                              className="h-12 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormItem>
                      <FormLabel className="text-sm font-medium text-slate-700">
                        Contact Number <span className="text-red-500">*</span>
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormField
                          control={form.control}
                          name="primaryContactCountryCode"
                          render={({ field }) => (
                            <FormControl>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger className="h-12 w-17 rounded-xl border-slate-200 bg-slate-50">
                                  <SelectValue placeholder="Code" />
                                </SelectTrigger>
                                <SelectContent>
                                  {countryCodes.map((c) => (
                                    <SelectItem key={c.code} value={c.code}>
                                      {c.code}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="primaryContactPhone"
                          render={({ field }) => (
                            <FormControl>
                              <div className="relative flex-1">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                  placeholder="Enter phone number"
                                  className="h-12 pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                                  value={field.value}
                                  inputMode="numeric"
                                  onChange={(e) => {
                                    const maxLen = String(primaryCode) === "+91" || String(primaryCode) === "+1" || String(primaryCode) === "+44" ? 10 : 15;
                                    const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                                    field.onChange(digitsOnly);
                                  }}
                                />
                              </div>
                            </FormControl>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="primaryContactPhone"
                        render={() => <FormMessage />}
                      />
                    </FormItem>
                  </div>
                </div>
<div className="space-y-5 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-emerald-700 mb-4">
                    <User className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Secondary Contact Person</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                     <FormField
                      control={form.control}
                      name="secondaryContactName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">Full Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                placeholder="Enter secondary  name"
                                className="h-12 pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="secondaryContactEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                type="email"
                                placeholder="Enter secondary  email"
                                className="h-12 pl-10 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                     <FormField
                      control={form.control}
                      name="secondaryContactRole"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium text-slate-700">Designation / Position</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. HR Manager, Founder"
                              className="h-12 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                   
                    
                  </div>
                  
                    <div className="flex">
                       <FormField
                      control={form.control}
                      name="secondaryContactCountryCode"
                      render={({ field }) => (
                        <FormItem className="md:col-span-1">
                          <FormLabel className="text-sm font-medium text-slate-700">Country Code</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger className="h-12 w-28 rounded-xl border-slate-200 bg-slate-50">
                                <SelectValue placeholder="Code" />
                              </SelectTrigger>
                              <SelectContent>
                                {countryCodes.map((c) => (
                                  <SelectItem key={c.code} value={c.code}>
                                    {c.code}
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
                      control={form.control}
                      name="secondaryContactPhone"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="text-sm font-medium text-slate-700 ml-4">Phone Number</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="ml-4 absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <Input
                                placeholder="Enter phone number"
                                className="h-12 pl-10 ml-4 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20"
                                value={String(field.value ?? "")}
                                inputMode="numeric"
                                onChange={(e) => {
                                  const code = String(form.getValues("secondaryContactCountryCode") ?? "+91");
                                  const maxLen = code === "+91" || code === "+1" || code === "+44" ? 10 : 15;
                                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                                  field.onChange(digitsOnly);
                                }}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                      
                    />
                    </div>
                </div>
               

                {/* Info Box */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-emerald-800 mb-1">What's Next?</h4>
                      <p className="text-sm text-emerald-700">
                        After saving your company profile, you'll create your first project to start finding the perfect interns for your team.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-4">
                  <Button
                    type="submit"
                    disabled={isSaving}
                    className="h-14 px-12 text-base font-semibold rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-xl shadow-emerald-600/20 transition-all"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        Save & Continue
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </Card>

        {/* Bottom Note */}
        <p className="text-center text-sm text-slate-400 mt-6">
          You can update your company profile later from settings
        </p>
      </div>
    </div>
  );
}