import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Check, 
  ArrowLeft,
  ChevronRight, 
  MapPin, 
  Globe,
  Briefcase, 
  Target, 
  Loader2,
  Plus,
  X,
  LogOut,
  Search
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
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
  FormDescription,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { scopeOfWorkOptions, timezones } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { getIanaTimezonesCached, type TimeZoneOption } from "@/lib/timezone";
import { clearEmployerAuth, getEmployerAuth, saveEmployerAuth } from "@/lib/employerAuth";
import findternLogo from "@assets/logo.png";
import skillsData from "@/data/skills.json";
import cityStatePincode from "@/data/cityStatePincode.json";

// Step schemas
const projectNameSchema = z.object({
  projectName: z.string().min(2, "Project name must be at least 2 characters"),
});

const skillsSchema = z.object({
  skills: z.array(z.string()).min(1, "Select at least one skill").max(7, "Maximum 7 skills allowed"),
});

const scopeSchema = z.object({
  scopeOfWork: z.string().min(1, "Please select scope of work"),
  fullTimeOffer: z.boolean().default(false),
});

const locationSchema = z.object({
  locationType: z.enum(["remote", "hybrid", "onsite"], {
    required_error: "Please select at least one location type",
  }),
  preferredLocations: z.array(z.string()).max(5, "Maximum 5 locations allowed").default([]),
  timezone: z.string().min(1, "Please select a timezone"),
});

type StepData = {
  projectName: string;
  skills: string[];
  scopeOfWork: string;
  fullTimeOffer: boolean;
  locationType: "remote" | "hybrid" | "onsite" | "";
  preferredLocations: string[];
  timezone: string;
};

const steps = [
  { id: 1, title: "Project Name", icon: Briefcase },
  { id: 2, title: "Skills", icon: Target },
  { id: 3, title: "Scope of Work", icon: Target },
  { id: 4, title: "Location", icon: MapPin },
];

export default function EmployerOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<StepData>({
    projectName: "",
    skills: [],
    scopeOfWork: "",
    fullTimeOffer: false,
    locationType: "",
    preferredLocations: [],
    timezone: "Asia/Kolkata",
  });
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [companyCity, setCompanyCity] = useState<string>("");
  const [companyState, setCompanyState] = useState<string>("");
  const [companyCountry, setCompanyCountry] = useState<string>("");

  useEffect(() => {
    const auth = getEmployerAuth();
    if (!auth) return;
    (async () => {
      try {
        const response = await apiRequest("GET", `/api/employer/${auth.id}`);
        const json = await response.json();
        const employer = json?.employer as any;
        if (!employer) return;
        setCompanyCity(String(employer.city ?? ""));
        setCompanyState(String(employer.state ?? ""));
        setCompanyCountry(String(employer.country ?? ""));
      } catch {
        // ignore
      }
    })();
  }, []);

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
          "[data-scroll-container], [data-radix-scroll-area-viewport], .overflow-y-auto, .overflow-auto, .overflow-y-scroll, .overflow-scroll",
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
  }, [currentStep]);

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleLogout = () => {
    clearEmployerAuth();
    setLocation("/employer/login");
  };

  const handleNext = (stepData: Partial<StepData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
    if (currentStep < 4) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
    } else {
      handleSubmit({ ...formData, ...stepData });
    }
  };

  const handleSubmit = async (data: StepData) => {
    setIsLoading(true);
    try {
      const auth = getEmployerAuth();
      if (!auth) {
        setLocation("/employer/login");
        return;
      }

      const payload = {
        projectName: data.projectName,
        skills: data.skills,
        scopeOfWork: data.scopeOfWork,
        fullTimeOffer: data.fullTimeOffer,
        locationType: data.locationType || undefined,
        preferredLocations: Array.isArray(data.preferredLocations) ? data.preferredLocations : [],
        pincode: undefined,
        city: companyCity || undefined,
        state: companyState || undefined,
        timezone: data.timezone,
      };

      const response = await apiRequest("PUT", `/api/employer/${auth.id}/onboarding`, payload);
      const json = await response.json();

      if (json?.employer) {
        saveEmployerAuth(json.employer);
      }

      try {
        const createdId = String(
          json?.project?.id ??
            json?.project?.projectId ??
            json?.project?.project_id ??
            json?.projectId ??
            json?.id ??
            "",
        ).trim();

        if (createdId) {
          const selectedProjectIdStorageKey = "employerSelectedProjectId";
          const selectedProjectIdsStorageKey = "employerSelectedProjectIds";
          window.localStorage.setItem(selectedProjectIdStorageKey, createdId);

          const raw = window.localStorage.getItem(selectedProjectIdsStorageKey);
          const parsed = raw ? JSON.parse(raw) : [];
          const list = Array.isArray(parsed) ? parsed : [];
          const seen = new Set<string>();
          const next: string[] = [];

          const push = (value: unknown) => {
            const v = String(value ?? "").trim();
            if (!v) return;
            const key = v.toLowerCase();
            if (seen.has(key)) return;
            seen.add(key);
            next.push(v);
          };

          push(createdId);
          for (const item of list) {
            push(item);
            if (next.length >= 5) break;
          }

          window.localStorage.setItem(selectedProjectIdsStorageKey, JSON.stringify(next));
          window.dispatchEvent(new Event("employerProjectChanged"));
          window.dispatchEvent(new Event("employerProjectsUpdated"));
        }
      } catch {
        // ignore
      }
      toast({
        title: "Project created successfully!",
        description: "Your project is now live. Start exploring candidates.",
      });
      setLocation("/employer/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create project. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-lg">
        <div className="container flex h-16 items-center justify-between px-4 md:px-8">
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => setLocation("/employer/dashboard")}
            aria-label="Go to Employer Dashboard"
          >
            <img src={findternLogo} alt="Findtern" className="inner_logo__img"  />
            {/* <div className="hidden sm:block">
              <span className="text-lg font-bold text-emerald-700">FINDTERN</span>
              <span className="text-xs text-slate-400 ml-1.5">INTERNSHIP SIMPLIFIED</span>
            </div> */}
          </button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleLogout}
            className="text-slate-600 hover:text-slate-900 gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="hidden py-6 border-b bg-white/50">
        <div className="container px-4 md:px-8">
          <div className="flex items-center justify-center gap-0 md:gap-4">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                      currentStep > step.id
                        ? "bg-emerald-600 text-white"
                        : currentStep === step.id
                        ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium hidden sm:block ${
                    currentStep >= step.id ? "text-emerald-700" : "text-slate-400"
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 md:w-24 h-0.5 mx-2 transition-all duration-300 ${
                    currentStep > step.id ? "bg-emerald-500" : "bg-slate-200"
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container px-4 md:px-8 py-8 md:py-12">
        <div className="max-w-xl mx-auto">
          {currentStep === 1 && (
            <Step1ProjectName 
              defaultValue={formData.projectName} 
              onNext={(data) => handleNext(data)} 
            />
          )}
          {currentStep === 2 && (
            <Step2Skills 
              defaultValue={formData.skills} 
              onNext={(data) => handleNext(data)}
              onBack={handleBack}
            />
          )}
          {currentStep === 3 && (
            <Step3Scope 
              defaultValue={{ scopeOfWork: formData.scopeOfWork, fullTimeOffer: formData.fullTimeOffer }} 
              onNext={(data) => handleNext(data)}
              onBack={handleBack}
            />
          )}
          {currentStep === 4 && (
            <Step4Location 
              defaultValue={{ 
                locationType: formData.locationType,
                preferredLocations: formData.preferredLocations,
                timezone: formData.timezone,
              }}
              onNext={(d) => handleNext(d)}
              onBack={handleBack}
              isLoading={isLoading}
              companyLocation={{
                city: companyCity,
                state: companyState,
                country: companyCountry,
              }}
              onCompanyCityStateChange={(city, state) => {
                setCompanyCity(city);
                setCompanyState(state);
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// Step 1: Project Name
function Step1ProjectName({ defaultValue, onNext }: { defaultValue: string; onNext: (data: { projectName: string }) => void }) {
  const form = useForm({
    resolver: zodResolver(projectNameSchema),
    defaultValues: { projectName: defaultValue },
  });

  return (
    <Card className="p-8 md:p-10 border-0 shadow-xl shadow-emerald-900/5 rounded-3xl bg-white">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
          Enter Your Project Name
        </h2>
        <p className="text-slate-500">
          Enter the name of the project you need resources for. You can always add more projects later in the dashboard if you're hiring for multiple projects.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField
            control={form.control}
            name="projectName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700">
                  Project Name<span className="text-red-500 ml-0.5">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Mobile App Development"
                    className="h-12 rounded-xl border-slate-200 focus:border-emerald-400 focus:ring-emerald-400/20 text-base"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20"
          >
            Continue
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </form>
      </Form>
    </Card>
  );
}

// Step 2: Skills
function Step2Skills({
  defaultValue,
  onNext,
  onBack,
}: {
  defaultValue: string[];
  onNext: (data: { skills: string[] }) => void;
  onBack: () => void;
}) {
  const [selectedSkills, setSelectedSkills] = useState<string[]>(defaultValue);
  const [searchQuery, setSearchQuery] = useState("");
  const [customSkill, setCustomSkill] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCustomDropdownOpen, setIsCustomDropdownOpen] = useState(false);
  const skillsDropdownRef = useRef<HTMLDivElement | null>(null);
  const customDropdownRef = useRef<HTMLDivElement | null>(null);

  const allSkills = useMemo(
    () => (skillsData as unknown as string[]).slice().sort((a, b) => a.localeCompare(b)),
    [],
  );

  const selectedLower = useMemo(
    () => selectedSkills.map((s) => s.toLowerCase()),
    [selectedSkills],
  );

  const filteredSkills = useMemo(() => {
    const base = allSkills.filter(
      (skill) => !selectedLower.includes(skill.toLowerCase()),
    );
    if (!searchQuery) return base;
    return base
      .filter((skill) =>
        skill.toLowerCase().includes(searchQuery.toLowerCase()),
      );
  }, [allSkills, searchQuery, selectedLower]);

  const addSkill = useCallback((skill: string) => {
    const normalized = skill.trim();
    const lower = normalized.toLowerCase();
    if (
      normalized &&
      selectedSkills.length < 7 &&
      !selectedSkills.some((s) => s.toLowerCase() === lower)
    ) {
      setSelectedSkills((prev) => [...prev, normalized]);
      setSearchQuery("");
      setIsDropdownOpen(false);
    }
  }, [selectedSkills]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(target)) {
        setIsDropdownOpen(false);
      }
      if (customDropdownRef.current && !customDropdownRef.current.contains(target)) {
        setIsCustomDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const removeSkill = useCallback((skill: string) => {
    setSelectedSkills(prev => prev.filter(s => s !== skill));
  }, []);

  const addCustomSkill = () => {
    const value = customSkill.trim();
    const lower = value.toLowerCase();
    if (
      value &&
      selectedSkills.length < 7 &&
      !selectedSkills.some((s) => s.toLowerCase() === lower)
    ) {
      setSelectedSkills((prev) => [...prev, value]);
      setCustomSkill("");
      setIsCustomDropdownOpen(false);
    }
  };

  const minSkills = 4;

  const handleSubmit = () => {
    if (selectedSkills.length >= minSkills) {
      onNext({ skills: selectedSkills });
    }
  };

  return (
    <Card className="p-8 md:p-10 border-0 shadow-xl shadow-emerald-900/5 rounded-3xl bg-white">
      <div className="text-center mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
          What are the main skills required for your work?
        </h2>
      </div>

      <div className="space-y-6">
        {/* Skills Search with Selected Tags Inside Input */}
        <div className="space-y-2" ref={skillsDropdownRef}>
          <label className="text-sm font-medium text-slate-700">
            Select Skills (up to 7)
          </label>
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 min-h-[3rem]">
              {selectedSkills.map((skill) => (
                <Badge
                  key={skill}
                  variant="secondary"
                  className="px-2.5 py-1 text-xs md:text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center"
                >
                  {skill}
                  <button
                    type="button"
                    onClick={() => removeSkill(skill)}
                    className="ml-1.5 text-emerald-600 hover:text-emerald-800 flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </Badge>
              ))}
              <div className="relative flex-1 min-w-[140px]">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={selectedSkills.length === 0 ? "Search and select skills..." : "Add more skills"}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsDropdownOpen(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    e.stopPropagation();

                    const query = searchQuery.trim();
                    if (!query) return;

                    const exact = filteredSkills.find(
                      (s) => s.toLowerCase() === query.toLowerCase(),
                    );
                    const best = exact ?? filteredSkills[0];
                    if (best) addSkill(best);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  className="pl-7 h-8 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-sm bg-transparent"
                  disabled={selectedSkills.length >= 7}
                />
              </div>
            </div>
            {isDropdownOpen && (searchQuery || filteredSkills.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto z-50 ring-1 ring-slate-900/5">
                {filteredSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    disabled={selectedSkills.length >= 7}
                    onClick={() => addSkill(skill)}
                    className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                  >
                    {skill}
                  </button>
                ))}
                {filteredSkills.length === 0 && searchQuery && (
                  <div className="px-4 py-3 text-sm text-slate-500">
                    No skills found. Add it as custom skill below.
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            {selectedSkills.length}/{7} selected. Add at least {minSkills} skills for best results.
          </p>
        </div>

        {/* Custom Skill */}
        <div className="space-y-2" ref={customDropdownRef}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                placeholder="Enter custom skill"
                value={customSkill}
                onChange={(e) => {
                  setCustomSkill(e.target.value);
                  setIsCustomDropdownOpen(true);
                }}
                className="w-full h-11 rounded-xl border-slate-200"
                onFocus={() => setIsCustomDropdownOpen(!!customSkill)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
                disabled={selectedSkills.length >= 7}
              />
              {isCustomDropdownOpen && customSkill.trim() && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto z-40">
                  {skillsData
                    .filter((skill) =>
                      skill.toLowerCase().includes(customSkill.toLowerCase()),
                    )
                    .slice(0, 8)
                    .map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => {
                          setCustomSkill(skill);
                          setIsCustomDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-emerald-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                      >
                        {skill}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={addCustomSkill}
              className="h-11 px-6 rounded-xl border-slate-200 hover:border-emerald-300 hover:bg-emerald-50"
              disabled={selectedSkills.length >= 7}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Skill
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Start typing and we'll suggest matching skills. Click a suggestion to auto-fill, then add it.
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={selectedSkills.length < minSkills}
          className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {selectedSkills.length < minSkills ? `Add at least ${minSkills} skills` : "Save & Continue"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full h-12 rounded-xl border-slate-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>
    </Card>
  );
}

// Step 3: Scope of Work
function Step3Scope({
  defaultValue,
  onNext,
  onBack,
}: {
  defaultValue: { scopeOfWork: string; fullTimeOffer: boolean };
  onNext: (data: { scopeOfWork: string; fullTimeOffer: boolean }) => void;
  onBack: () => void;
}) {
  const form = useForm({
    resolver: zodResolver(scopeSchema),
    defaultValues: defaultValue,
  });

  const selectedScope = form.watch("scopeOfWork");

  return (
    <Card className="p-8 md:p-10 border-0 shadow-xl shadow-emerald-900/5 rounded-3xl bg-white">
      <div className="mb-8">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-3">
          Next, estimate the scope of your work
        </h2>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField
            control={form.control}
            name="scopeOfWork"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-slate-700">
                  Scope of Work <span className="text-slate-400 font-normal">(Select one)</span>
                </FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="space-y-3 mt-3"
                  >
                    {scopeOfWorkOptions.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          field.value === option.value
                            ? "border-emerald-500 bg-emerald-50/50"
                            : "border-slate-200 hover:border-emerald-200"
                        }`}
                      >
                        <RadioGroupItem value={option.value} className="text-emerald-600" />
                        <span className="font-medium text-slate-700">{option.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fullTimeOffer"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-200 transition-colors">
                <button
                  type="button"
                  aria-pressed={!!field.value}
                  onClick={() => field.onChange(!field.value)}
                  className={`peer h-4 w-4 shrink-0 rounded-sm border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center ${
                    field.value
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "border-emerald-300"
                  }`}
                >
                  {field.value ? <Check className="h-4 w-4" /> : null}
                </button>
                <FormLabel className="text-sm font-medium text-slate-700 cursor-pointer m-0">
                  Would you consider offering a <span className="text-emerald-600 font-semibold">full-time position</span> to the interns after their internship?
                </FormLabel>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={!selectedScope}
            className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20"
          >
            Save & Continue
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="w-full h-12 rounded-xl border-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </form>
      </Form>
    </Card>
  );
}

// Step 4: Location
function Step4Location({
  defaultValue,
  onNext,
  onBack,
  isLoading,
  companyLocation,
  onCompanyCityStateChange,
}: {
  defaultValue: {
    locationType: "remote" | "hybrid" | "onsite" | "";
    preferredLocations: string[];
    timezone: string;
  };
  onNext: (data: z.infer<typeof locationSchema>) => void;
  onBack: () => void;
  isLoading: boolean;
  companyLocation: {
    city: string;
    state: string;
    country: string;
  };
  onCompanyCityStateChange: (city: string, state: string) => void;
}) {
  const form = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: defaultValue as any,
  });

  const locationTypeValue = form.watch("locationType");
  const timezoneValue = form.watch("timezone");
  const [timezoneSearch, setTimezoneSearch] = useState("");
  const [timezonePopoverOpen, setTimezonePopoverOpen] = useState(false);

  const [availableTimezones, setAvailableTimezones] = useState<TimeZoneOption[]>(() =>
    (timezones as unknown as TimeZoneOption[]).slice(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getIanaTimezonesCached(timezones as unknown as TimeZoneOption[]);
        if (!cancelled && Array.isArray(list) && list.length > 0) setAvailableTimezones(list);
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const requiresCompanyCityState = locationTypeValue === "hybrid" || locationTypeValue === "onsite";

  const [cityPopoverOpen, setCityPopoverOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState("");
  const [manualCityState, setManualCityState] = useState(false);
  const [cityStateTouched, setCityStateTouched] = useState(false);

  const cityStateOptions = useMemo(() => {
    const raw: any = cityStatePincode as any;
    const districts: any[] = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.districts)
        ? raw.districts
        : [];

    const out: Array<{ city: string; state: string }> = [];
    const seen = new Set<string>();
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

  const [selectedCity, setSelectedCity] = useState<string>(String(companyLocation.city ?? ""));
  const [selectedState, setSelectedState] = useState<string>(String(companyLocation.state ?? ""));

  useEffect(() => {
    setSelectedCity(String(companyLocation.city ?? ""));
    setSelectedState(String(companyLocation.state ?? ""));
  }, [companyLocation.city, companyLocation.state]);

  useEffect(() => {
    setCityStateTouched(false);

    if (!requiresCompanyCityState) return;

    const nextCity = String(selectedCity ?? "").trim();
    const nextState = String(selectedState ?? "").trim();
    const fallbackCity = String(companyLocation.city ?? "").trim();
    const fallbackState = String(companyLocation.state ?? "").trim();

    if (!nextCity && fallbackCity) setSelectedCity(fallbackCity);
    if (!nextState && fallbackState) setSelectedState(fallbackState);
  }, [companyLocation.city, companyLocation.state, requiresCompanyCityState, selectedCity, selectedState]);

  const hasCompanyCityState = Boolean(String(selectedCity ?? "").trim()) && Boolean(String(selectedState ?? "").trim());
  const allTimezones = availableTimezones.length > 0 ? availableTimezones : (timezones as unknown as TimeZoneOption[]);
  const filteredTimezones = useMemo(() => {
    if (!timezoneSearch.trim()) return allTimezones;
    const q = timezoneSearch.toLowerCase();
    return allTimezones.filter(
      (tz) =>
        tz.value.toLowerCase().includes(q) ||
        tz.label.toLowerCase().includes(q),
    );
  }, [allTimezones, timezoneSearch]);

  const timezoneDisplayLabel = useMemo(() => {
    const current = String(timezoneValue ?? "");
    const match = allTimezones.find((t) => t.value === current);
    return match?.label ?? current;
  }, [allTimezones, timezoneValue]);

  const getTimezoneFlag = (tz: string): string => {
    // Specific country flags
    const map: Record<string, string> = {
      "Asia/Kolkata": "🇮🇳",
      "Europe/London": "🇬🇧",
      "Europe/Paris": "🇫🇷",
      "Europe/Berlin": "🇩🇪",
      "America/New_York": "🇺🇸",
      "America/Chicago": "🇺🇸",
      "America/Denver": "🇺🇸",
      "America/Los_Angeles": "🇺🇸",
      "Australia/Sydney": "🇦🇺",
      "Pacific/Auckland": "🇳🇿",
      "Asia/Tokyo": "🇯🇵",
      "Asia/Seoul": "🇰🇷",
      "Asia/Shanghai": "🇨🇳",
      "Asia/Hong_Kong": "🇭🇰",
      "Asia/Singapore": "🇸🇬",
      "Asia/Dubai": "🇦🇪",
      "Africa/Cairo": "🇪🇬",
      "Africa/Johannesburg": "🇿🇦",
    };

    if (map[tz]) return map[tz];

    if (tz.startsWith("Asia/")) return "🌏";
    if (tz.startsWith("Europe/")) return "🌍";
    if (tz.startsWith("America/")) return "🌎";
    if (tz.startsWith("Africa/")) return "🌍";
    if (tz.startsWith("Australia/") || tz.startsWith("Pacific/")) return "🌏";
    if (tz.startsWith("Etc/") || tz === "UTC") return "🕒";
    return "";
  };

  return (
    <Card className="p-8 md:p-10 border-0 shadow-xl shadow-emerald-900/5 rounded-3xl bg-white">
      <div className="mb-8">
        <p className="text-sm text-slate-500 uppercase tracking-wider mb-2">Internship Details</p>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 flex items-center gap-2">
          <MapPin className="w-7 h-7 text-rose-500" />
          Internship Location
        </h2>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data) => {
            if (requiresCompanyCityState && !hasCompanyCityState) {
              setCityStateTouched(true);
              return;
            }
            if (requiresCompanyCityState) {
              onCompanyCityStateChange(String(selectedCity ?? ""), String(selectedState ?? ""));
            }
            onNext(data);
          })}
          className="space-y-6"
        >
        

          <FormField
            control={form.control}
            name="locationType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Internship Location Types
                </FormLabel>

                <div className="flex flex-wrap gap-4 pt-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={field.value === "remote"}
                      onCheckedChange={() => {
                        setCityStateTouched(false);
                        field.onChange("remote");
                      }}
                      className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                    />
                    <span className="flex items-center gap-1.5">
                      <Globe className="w-4 h-4" />
                      <span>Remote</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={field.value === "hybrid"}
                      onCheckedChange={() => {
                        setCityStateTouched(false);
                        field.onChange("hybrid");
                      }}
                      className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                    />
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>Hybrid</span>
                    </span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={field.value === "onsite"}
                      onCheckedChange={() => {
                        setCityStateTouched(false);
                        field.onChange("onsite");
                      }}
                      className="border-emerald-300 data-[state=checked]:bg-emerald-600"
                    />
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4" />
                      <span>Onsite</span>
                    </span>
                  </label>
                </div>

                <FormMessage />
              </FormItem>
            )}
          />
  {requiresCompanyCityState && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormItem>
                  <FormLabel className="text-xs md:text-sm font-medium text-foreground">
                    City<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    {manualCityState ? (
                      <Input
                        placeholder="Enter your city"
                        className="h-10 md:h-11 rounded-lg text-sm"
                        value={selectedCity}
                        onChange={(e) => {
                          const v = e.target.value;
                          setSelectedCity(v);
                          setCityStateTouched(true);
                          onCompanyCityStateChange(v, String(selectedState ?? ""));
                        }}
                      />
                    ) : (
                      <Popover open={cityPopoverOpen} onOpenChange={setCityPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full h-10 md:h-11 justify-between rounded-lg text-sm"
                          >
                            <span className="truncate text-left">
                              {selectedCity
                                ? String(selectedCity)
                                    .replace(/_/g, " ")
                                    .replace(/\b\w/g, (ch) => ch.toUpperCase())
                                : "Select your city"}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[360px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search Indian cities..."
                              value={citySearchQuery}
                              onValueChange={setCitySearchQuery}
                            />
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
                                      setSelectedCity("");
                                      setSelectedState("");
                                      onCompanyCityStateChange("", "");
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
                                  .map((item) => (
                                    <CommandItem
                                      key={`${item.city}-${item.state}`}
                                      value={item.city}
                                      onSelect={() => {
                                        setManualCityState(false);
                                        setSelectedCity(item.city);
                                        setSelectedState(item.state);
                                        onCompanyCityStateChange(item.city, item.state);
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
                    )}
                  </FormControl>
                  {(!manualCityState || !selectedCity) && (
                    <>
                      {!manualCityState && (
                        <button
                          type="button"
                          className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                          onClick={() => {
                            setManualCityState(true);
                            setSelectedCity("");
                            setSelectedState("");
                            onCompanyCityStateChange("", "");
                          }}
                        >
                          Can&apos;t find your city? Enter manually
                        </button>
                      )}
                    </>
                  )}
                </FormItem>

                <FormItem>
                  <FormLabel className="text-xs md:text-sm font-medium text-foreground">
                    State<span className="text-destructive ml-0.5">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      value={selectedState}
                      disabled={!manualCityState}
                      placeholder={manualCityState ? "Enter your state" : "Auto-filled from city"}
                      className="h-10 md:h-11 rounded-lg text-sm"
                      onChange={(e) => {
                        const v = e.target.value;
                        setSelectedState(v);
                        setCityStateTouched(true);
                        onCompanyCityStateChange(String(selectedCity ?? ""), v);
                      }}
                    />
                  </FormControl>
                </FormItem>
              </div>

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-900">
                  <span className="font-semibold">Disclaimer:</span> Candidates are India-based. Please select only cities and states within India.
                </div>
            </>
            
          )}
          <FormField
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Select Your Time Zone
                </FormLabel>
                <Popover
                  open={timezonePopoverOpen}
                  onOpenChange={(open) => {
                    setTimezonePopoverOpen(open);
                    if (open) setTimezoneSearch("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-11 justify-between rounded-xl border-slate-200"
                    >
                      <span className="truncate text-left">
                        {field.value ? (
                          <span className="flex items-center gap-2">
                            <span>{getTimezoneFlag(String(field.value))}</span>
                            <span className="truncate">{timezoneDisplayLabel}</span>
                          </span>
                        ) : (
                          "Select time zone"
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[360px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Type to search..."
                        value={timezoneSearch}
                        onValueChange={setTimezoneSearch}
                      />
                      <CommandList>
                        <CommandEmpty>
                          <div className="px-2 py-2 text-xs text-muted-foreground">No time zone found.</div>
                        </CommandEmpty>
                        <CommandGroup>
                          {filteredTimezones.map((tz) => (
                            <CommandItem
                              key={tz.value}
                              value={tz.value}
                              onSelect={() => {
                                field.onChange(tz.value);
                                setTimezoneSearch("");
                                setTimezonePopoverOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span>{getTimezoneFlag(tz.value)}</span>
                                <span>{tz.label}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
                <p className="mt-1 text-xs text-slate-500">
                  Since our candidates are based in India, all meeting schedules will be converted from your selected timezone to IST (Indian Standard Time)
                </p>
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isLoading || !timezoneValue || !locationTypeValue || (requiresCompanyCityState && !hasCompanyCityState)}
            className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-600/20"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Creating Project...
              </>
            ) : (
              "Save & Continue"
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={isLoading}
            className="w-full h-12 rounded-xl border-slate-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </form>
      </Form>
    </Card>
  );
}

