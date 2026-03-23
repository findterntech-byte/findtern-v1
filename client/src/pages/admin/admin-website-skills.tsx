import React from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { PlaceholderSection } from "@/pages/admin/admin-website";

export default function AdminWebsiteSkillsPage() {
  return (
    <AdminLayout title="Featured Skills" description="Cards shown on website homepage.">
      <div className="space-y-6">
        <PlaceholderSection title="Featured Skills" subtitle="Cards shown on website homepage." />
      </div>
    </AdminLayout>
  );
}
