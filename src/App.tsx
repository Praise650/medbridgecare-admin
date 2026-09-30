import { lazy, Suspense } from "react";
import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import { Toaster } from "sonner";

const AdminGuard = lazy(() => import("@/components/admin/AdminGuard"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminJobEditor = lazy(() => import("@/pages/admin/AdminJobEditor"));

const queryClient = new QueryClient();

const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/admin" replace /> },
  { path: "/admin/login", element: <AdminLogin /> },
  {
    path: "/admin",
    element: <AdminGuard />,
    children: [
      { index: true, element: <AdminDashboard /> },
      { path: "jobs/new", element: <AdminJobEditor /> },
      { path: "jobs/:id/edit", element: <AdminJobEditor /> },
    ],
  },
  { path: "*", element: <Navigate to="/admin" replace /> },
]);

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Suspense fallback={<p className="p-8" role="status">Loading…</p>}>
          <RouterProvider router={router} />
        </Suspense>
        <Toaster richColors />
      </QueryClientProvider>
    </HelmetProvider>
  );
}
