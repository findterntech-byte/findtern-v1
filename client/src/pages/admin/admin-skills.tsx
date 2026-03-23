import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { UploadCloud, Download } from "lucide-react";

const mockSkillCategories = [
  "AI & Data Science",
  "Artificial Intelligence & Data Science",
  "Business & Strategy",
  "Cloud & DevOps",
  "Custom",
  "Cybersecurity",
];

export default function AdminSkillsPage() {
  return (
    <AdminLayout
      title="Manage Skills"
      description="Upload, organize, and browse all skill categories available on Findtern."
    >
      <Card className="border-none shadow-sm">
        <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Existing Skills
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-[#0E6049] hover:bg-[#0b4b3a]">
              <UploadCloud className="mr-2 h-4 w-4" />
              Upload Skills
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Download Sample
            </Button>
          </div>
        </div>
        <div className="px-2 py-4 md:px-4">
          <Accordion type="multiple" className="space-y-2">
            {mockSkillCategories.map((category) => (
              <AccordionItem
                key={category}
                value={category}
                className="rounded-lg border bg-card px-4"
              >
                <AccordionTrigger className="py-3 text-sm font-semibold text-[#0E6049] hover:no-underline">
                  {category}
                </AccordionTrigger>
                <AccordionContent className="pb-4 text-sm text-muted-foreground">
                  Skill details will appear here. Connect this section to your
                  API to show skills inside each category.
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </Card>
    </AdminLayout>
  );
}


