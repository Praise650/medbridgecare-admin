import { Navigate, Outlet } from "react-router-dom";
import { useAdminSession } from "@/hooks/useAdminSession";
import { AdminLayout } from "./AdminLayout";

// UX guard only — RLS is what actually blocks unauthorised reads/writes.
export default function AdminGuard() {
  const { status, user, signOut } = useAdminSession();

  if (status === "loading")
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  if (status !== "admin") return <Navigate to="/admin/login" replace />;

  return (
    <AdminLayout email={user?.email ?? ""} onSignOut={signOut}>
      <Outlet />
    </AdminLayout>
  );
}
