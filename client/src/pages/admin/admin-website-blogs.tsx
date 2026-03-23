import React from "react";
import { AdminLayout } from "@/pages/admin/admin-layout";
import { BlogsSection } from "@/pages/admin/admin-website";

export default function AdminWebsiteBlogsPage() {
  return (
    <AdminLayout title="Blogs" description="Create and publish website blog posts.">
      <div className="space-y-6">
        <BlogsSection />
      </div>
    </AdminLayout>
  );
}
