import { AdminLayout } from "@/pages/admin/admin-layout";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { useState } from "react";

type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  countryCode: string;
};

const MOCK_USERS: AdminUser[] = [
  {
    id: "1",
    firstName: "Prakhar",
    lastName: "Srivastava",
    email: "prakhar@example.com",
    phoneNumber: "9999999999",
    countryCode: "+91",
  },
  {
    id: "2",
    firstName: "Somil",
    lastName: "Jangid",
    email: "somil@example.com",
    phoneNumber: "8888888888",
    countryCode: "+91",
  },
  {
    id: "3",
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    phoneNumber: "7777777777",
    countryCode: "+1",
  },
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const users = MOCK_USERS;

  const filtered = users.filter((user) => {
    const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
    const q = search.toLowerCase();
    return fullName.includes(q) || user.email.toLowerCase().includes(q);
  });

  return (
    <AdminLayout
      title="Users"
      description="All registered users on the platform."
    >
      <Card className="border-none shadow-sm">
        <div className="flex flex-col gap-4 border-b px-6 py-4 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-medium text-muted-foreground">
            User List
          </p>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search user..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        <div className="overflow-x-auto px-4 py-4">
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {user.countryCode} {user.phoneNumber}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
        </div>
      </Card>
    </AdminLayout>
  );
}


