"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase/client";

type AppUser = {
  id: string;
  email: string | null;
  isDemo: boolean;
};

type AuthContextValue = {
  user: AppUser | null;
  loading: boolean;
  isSupabaseEnabled: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, nextPassword: string) => Promise<void>;
  updatePassword: (nextPassword: string) => Promise<void>;
  sendPasswordReset: (email: string, redirectTo?: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const demoUser: AppUser = {
  id: "demo-teacher",
  email: "demo.teacher@example.local",
  isDemo: true
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isSupabaseEnabled = isSupabaseConfigured();
  const [user, setUser] = useState<AppUser | null>(isSupabaseEnabled ? null : demoUser);
  const [loading, setLoading] = useState(isSupabaseEnabled);

  useEffect(() => {
    if (!isSupabaseEnabled) {
      setUser(demoUser);
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let mounted = true;

    supabase.auth
      .getUser()
      .then(({ data }: { data: { user: User | null } }) => {
        if (!mounted) return;
        setUser(data.user ? { id: data.user.id, email: data.user.email ?? null, isDemo: false } : null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ? { id: session.user.id, email: session.user.email ?? null, isDemo: false } : null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [isSupabaseEnabled]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!isSupabaseEnabled) {
        setUser({ ...demoUser, email: email || demoUser.email });
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user ? { id: data.user.id, email: data.user.email ?? null, isDemo: false } : null);
    },
    [isSupabaseEnabled]
  );

  const signOut = useCallback(async () => {
    if (!isSupabaseEnabled) {
      setUser(demoUser);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
  }, [isSupabaseEnabled]);

  const updatePassword = useCallback(
    async (nextPassword: string) => {
      if (!isSupabaseEnabled) {
        throw new Error("Demo mode ไม่ได้เชื่อม Supabase Auth");
      }

      const { error } = await getSupabaseBrowserClient().auth.updateUser({ password: nextPassword });
      if (error) throw error;
    },
    [isSupabaseEnabled]
  );

  const changePassword = useCallback(
    async (currentPassword: string, nextPassword: string) => {
      if (!isSupabaseEnabled) {
        throw new Error("Demo mode ไม่ได้เชื่อม Supabase Auth");
      }

      if (!user?.email) {
        throw new Error("ไม่พบอีเมลผู้ใช้สำหรับยืนยันรหัสผ่านเดิม");
      }

      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      if (signInError) throw signInError;

      const { error: updateError } = await supabase.auth.updateUser({ password: nextPassword });
      if (updateError) throw updateError;
    },
    [isSupabaseEnabled, user?.email]
  );

  const sendPasswordReset = useCallback(
    async (email: string, redirectTo?: string) => {
      if (!isSupabaseEnabled) {
        throw new Error("Demo mode ไม่ได้เชื่อม Supabase Auth");
      }

      const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
      if (error) throw error;
    },
    [isSupabaseEnabled]
  );

  const value = useMemo(
    () => ({ user, loading, isSupabaseEnabled, signIn, signOut, changePassword, updatePassword, sendPasswordReset }),
    [user, loading, isSupabaseEnabled, signIn, signOut, changePassword, updatePassword, sendPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
