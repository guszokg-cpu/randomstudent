"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { StarBurstOverlay } from "@/components/effects/star-burst-overlay";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { PresentationToggle } from "@/components/play/presentation-toggle";
import { useAuth } from "@/components/providers/auth-provider";
import { SoundEffectsProvider } from "@/components/sound/sound-effects-provider";

function isPublicRoute(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/student-score") || pathname.startsWith("/play");
}

function isDisplayRoute(pathname: string) {
  return pathname.startsWith("/play") || pathname.startsWith("/leaderboard");
}

function EffectsFrame({ children }: { children: React.ReactNode }) {
  return (
    <SoundEffectsProvider>
      <StarBurstOverlay />
      {children}
    </SoundEffectsProvider>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, isSupabaseEnabled } = useAuth();
  const publicRoute = isPublicRoute(pathname);
  const displayRoute = isDisplayRoute(pathname);
  const requiresAuth = !publicRoute;
  const showAdminChrome = !publicRoute && !displayRoute;
  const isGuestPlayMode = isSupabaseEnabled && !loading && !user && pathname.startsWith("/play");

  useEffect(() => {
    if (isSupabaseEnabled && requiresAuth && !loading && !user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isSupabaseEnabled, loading, pathname, requiresAuth, router, user]);

  if (isSupabaseEnabled && requiresAuth && (loading || !user)) {
    return (
      <EffectsFrame>
        <main className="grid min-h-screen place-items-center p-6">
          <div className="glass-panel rounded-3xl p-8 text-center">
            <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-violet-600" />
            <p className="font-extrabold text-violet-950">กำลังตรวจสอบการเข้าสู่ระบบ</p>
          </div>
        </main>
      </EffectsFrame>
    );
  }

  if (!showAdminChrome) {
    return (
      <EffectsFrame>
        {pathname.startsWith("/play") ? (
          <>
            {isGuestPlayMode ? (
              <div className="fixed left-3 top-3 z-50 max-w-[calc(100vw-7rem)] rounded-2xl border border-white/20 bg-violet-950/82 px-3 py-2 text-white shadow-xl shadow-violet-950/25 backdrop-blur sm:left-4 sm:top-4 sm:max-w-none">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-black sm:text-sm">
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    โหมดทดลอง
                  </span>
                  <span className="hidden text-xs font-bold text-violet-100 sm:inline">สุ่มได้ แต่ไม่บันทึกดาว</span>
                  <Link
                    href={`/login?next=${encodeURIComponent(pathname)}`}
                    className="inline-flex min-h-8 items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-black text-violet-900 shadow-sm transition hover:bg-amber-100"
                  >
                    <LockKeyhole className="h-3.5 w-3.5" />
                    เข้ารหัสครู
                  </Link>
                </div>
              </div>
            ) : null}
            <div className="fixed right-4 top-4 z-50">
              <PresentationToggle className="min-h-10 px-3 text-xs sm:min-h-11 sm:px-4 sm:text-sm" />
            </div>
          </>
        ) : null}
        {children}
      </EffectsFrame>
    );
  }

  return (
    <EffectsFrame>
      <div className="admin-shell">
        <Sidebar />
        <main className="min-h-screen pb-24 lg:ml-72 lg:pb-0">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-6 lg:px-8 lg:py-6">{children}</div>
        </main>
        <MobileNav />
      </div>
    </EffectsFrame>
  );
}
