import { Helmet } from "react-helmet-async";
import { Link, NavLink } from "react-router-dom";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdminLayout({
  children,
  email,
  onSignOut,
}: {
  children: React.ReactNode;
  email: string;
  onSignOut: () => void;
}) {
  return (
    <div className="min-h-screen bg-muted/40">
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/admin" className="text-lg font-semibold">
              Medbridge Admin
            </Link>
            <nav aria-label="Main" className="flex gap-4 text-sm">
              {[
                { to: "/admin", label: "Jobs", end: true },
                { to: "/admin/applications", label: "Applications", end: false },
              ].map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => (isActive ? "font-medium" : "text-muted-foreground hover:text-foreground")}
                >
                  {l.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">{email}</span>
            <Button variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="h-4 w-4" aria-hidden /> Log out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
