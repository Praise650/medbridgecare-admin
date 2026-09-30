import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AdminStatus = "loading" | "admin" | "not-admin" | "signed-out";

const MAX_SESSION_MS = 8 * 60 * 60 * 1000;
const CHECK_EVERY_MS = 5 * 60 * 1000;
const LOGIN_KEY = "admin_login_at";

export const markAdminLogin = () => {
  try {
    sessionStorage.setItem(LOGIN_KEY, String(Date.now()));
  } catch {
    /* storage unavailable; falls back to last_sign_in_at */
  }
};

const loginTime = (user: User): number => {
  try {
    const v = sessionStorage.getItem(LOGIN_KEY);
    if (v) return Number(v);
  } catch {
    /* ignore */
  }
  return user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : Date.now();
};

export const isSessionExpired = (user: User, now = Date.now()) => now - loginTime(user) > MAX_SESSION_MS;

export async function checkIsAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
  return !error && !!data;
}

export function useAdminSession() {
  const [state, setState] = useState<{ status: AdminStatus; user: User | null }>({ status: "loading", user: null });

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    try {
      sessionStorage.removeItem(LOGIN_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let active = true;
    const apply = async (user: User | null) => {
      if (!user) return active && setState({ status: "signed-out", user: null });
      if (isSessionExpired(user)) {
        await signOut();
        return;
      }
      const ok = await checkIsAdmin(user.id);
      if (!active) return;
      if (!ok) {
        await supabase.auth.signOut();
        return;
      }
      setState({ status: "admin", user });
    };

    supabase.auth.getSession().then(({ data }) => apply(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // defer to avoid calling supabase inside the auth callback
      setTimeout(() => apply(session?.user ?? null), 0);
    });
    const timer = setInterval(() => {
      supabase.auth.getSession().then(({ data }) => {
        if (data.session?.user && isSessionExpired(data.session.user)) void signOut();
      });
    }, CHECK_EVERY_MS);

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      clearInterval(timer);
    };
  }, [signOut]);

  return { ...state, signOut };
}
