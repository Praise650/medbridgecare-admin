import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { checkIsAdmin, markAdminLogin, useAdminSession } from "@/hooks/useAdminSession";

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 60;

export default function AdminLogin() {
  const navigate = useNavigate();
  const { status } = useAdminSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedFor, setLockedFor] = useState(0);

  useEffect(() => {
    if (lockedFor <= 0) return;
    const t = setTimeout(() => setLockedFor((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [lockedFor]);

  if (status === "admin") return <Navigate to="/admin" replace />;

  const fail = () => {
    setError(true);
    const n = attempts + 1;
    setAttempts(n);
    if (n >= MAX_ATTEMPTS) {
      setAttempts(0);
      setLockedFor(LOCK_SECONDS);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || lockedFor > 0) return;
    setBusy(true);
    setError(false);
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err || !data.user) return fail();
      if (!(await checkIsAdmin(data.user.id))) {
        await supabase.auth.signOut();
        return fail();
      }
      markAdminLogin();
      navigate("/admin", { replace: true });
    } catch {
      fail();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-lg border bg-background p-6 shadow-sm">
        <h1 className="text-xl font-semibold">Admin login</h1>
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">Invalid credentials</p>}
        {lockedFor > 0 && <p className="text-sm text-muted-foreground">Too many attempts. Try again in {lockedFor}s.</p>}
        <Button type="submit" className="w-full" disabled={busy || lockedFor > 0}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
