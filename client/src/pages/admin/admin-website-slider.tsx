import React from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { SliderSection } from "@/pages/admin/admin-website";

export default function AdminWebsiteSliderPage() {
  return (
    <AdminLayout title="Hero Slider" description="Homepage hero banner images (image, order, visibility).">
      <div className="space-y-6">
        <SliderSection />
      </div>
    </AdminLayout>
  );
}
