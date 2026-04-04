import { Users, ShieldCheck } from "lucide-react";
import { PageHeader, EmptyState } from "@/components/shared";

const UsersPage = () => (
  <div className="space-y-6">
    <PageHeader title="User Management" description="Manage system users and roles" />
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <EmptyState
        icon={<Users className="h-6 w-6 text-muted-foreground" />}
        title="Backend integration required"
        description="User management requires backend integration. Enable Lovable Cloud to manage users and roles."
      />
    </div>
  </div>
);

export default UsersPage;
