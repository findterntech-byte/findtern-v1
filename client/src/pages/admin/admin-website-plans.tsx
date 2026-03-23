import React from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { PlaceholderSection } from "@/pages/admin/admin-website";

export default function AdminWebsitePlansPage() {
  return (
    <AdminLayout title="Plans" description="Pricing plans shown on website.">
      <div className="space-y-6">
        <PlaceholderSection title="Plans" subtitle="Pricing plans shown on website." />
      </div>
    </AdminLayout>
  );
}
