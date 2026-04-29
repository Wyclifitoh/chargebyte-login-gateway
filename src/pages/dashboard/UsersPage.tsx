import { Users } from "lucide-react";
import DataTable from "@/components/DataTable";
import StatusBadge from "@/components/StatusBadge";
import { PageHeader, TableSkeleton, EmptyState, ErrorState } from "@/components/shared";
import { useUsers } from "@/hooks/useDashboardData";
import { ROLE_LABELS, type UserRole } from "@/types/dashboard";

const UsersPage = () => {
  const { data: users, isLoading, error, isFallback, refetch } = useUsers();

  return (
    <div className="space-y-6">
      <PageHeader title="User Management" description="Manage system users and roles" />

      {isFallback && !isLoading && (
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-400">
          Showing demo data — backend unreachable.
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : error && !isFallback ? (
        <ErrorState title="Couldn't load users" message={error} onRetry={refetch} />
      ) : users.length === 0 ? (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <EmptyState
            icon={<Users className="h-6 w-6 text-muted-foreground" />}
            title="No users yet"
            description="Invite team members to get started."
          />
        </div>
      ) : (
        <DataTable
          data={users}
          searchKey="email"
          searchPlaceholder="Search users..."
          columns={[
            { key: "name", label: "Name" },
            { key: "email", label: "Email" },
            { key: "phone", label: "Phone", render: (v) => <span>{v ? String(v) : "—"}</span> },
            { key: "role", label: "Role", render: (v) => <span>{ROLE_LABELS[v as UserRole] ?? String(v)}</span> },
            { key: "role", label: "Status", render: () => <StatusBadge status="active" /> },
          ]}
        />
      )}
    </div>
  );
};

export default UsersPage;
