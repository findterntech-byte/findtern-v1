import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  return (
    <AdminLayout
      title="Settings"
      description="Configure security and pricing options for the platform."
    >
      <Card className="border-none shadow-sm">
        <Tabs defaultValue="token" className="w-full">
          <TabsList className="mx-6 mt-4 w-fit bg-muted">
            <TabsTrigger value="token">Token Expiry</TabsTrigger>
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
          </TabsList>
          <TabsContent value="token" className="px-6 pb-6 pt-4">
            <div className="max-w-md space-y-3">
              <p className="text-sm text-muted-foreground">
                Control how long authentication tokens remain valid.
              </p>
              <Input placeholder="Token Expiry (in minutes)" />
              <Button className="bg-[#0E6049] hover:bg-[#0b4b3a] w-fit">
                Update
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="pricing" className="px-6 pb-6 pt-4">
            <div className="max-w-md space-y-3">
              <Input placeholder="Intern Price (₹)" type="number" />
              <Input placeholder="Company Price (₹)" type="number" />
              <Button className="bg-[#0E6049] hover:bg-[#0b4b3a] w-fit">
                Update
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </AdminLayout>
  );
}


