import React from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { PlaceholderSection } from "@/pages/admin/admin-website";

export default function AdminWebsiteFaqPage() {
  return (
    <AdminLayout title="FAQ" description="Frequently asked questions for website.">
      <div className="space-y-6">
        <PlaceholderSection title="FAQ" subtitle="Frequently asked questions for website." />
      </div>
    </AdminLayout>
  );
}
