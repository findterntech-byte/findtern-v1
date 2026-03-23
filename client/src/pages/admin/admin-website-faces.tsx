import React from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { PlaceholderSection } from "@/pages/admin/admin-website";

export default function AdminWebsiteFacesPage() {
  return (
    <AdminLayout title="Happy Faces" description="Testimonials section for website.">
      <div className="space-y-6">
        <PlaceholderSection title="Happy Faces" subtitle="Testimonials section for website." />
      </div>
    </AdminLayout>
  );
}
