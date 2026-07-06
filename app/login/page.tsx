"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, LogIn, Rocket, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/fields";
import { useAuth } from "@/components/providers/auth-provider";
import { getTeacherLoginEmail } from "@/lib/supabase/client";
import { readClientParam } from "@/lib/url";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, sendPasswordReset, user, isSupabaseEnabled } = useAuth();
  const teacherLoginEmail = getTeacherLoginEmail();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [nextPath, setNextPath] = useState("/play");
  const previewPath = nextPath.startsWith("/play") ? nextPath : "/play";

  useEffect(() => {
    setNextPath(readClientParam("next") || "/play");
  }, []);

  useEffect(() => {
    if (user) router.replace(nextPath);
  }, [nextPath, router, user]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isSupabaseEnabled && !teacherLoginEmail) {
      setError("ยังไม่ได้ตั้งค่า NEXT_PUBLIC_TEACHER_LOGIN_EMAIL ใน Vercel หรือ .env.local");
      return;
    }

    if (isSupabaseEnabled && !password) {
      setError("กรุณากรอกรหัสผ่าน");
      return;
    }

    setSaving(true);
    try {
      await signIn(teacherLoginEmail || "demo.teacher@example.local", password);
      router.replace(nextPath);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    setError("");
    setResetMessage("");

    if (!isSupabaseEnabled) {
      setResetMessage("Demo mode ไม่ต้องใช้รหัสผ่านจริง");
      return;
    }

    if (!teacherLoginEmail) {
      setResetMessage("ยังไม่ได้ตั้งค่าอีเมลครูหลักสำหรับรับลิงก์รีเซ็ต");
      return;
    }

    setResetBusy(true);
    try {
      const redirectTo = `${window.location.origin}/settings?mode=password-recovery`;
      await sendPasswordReset(teacherLoginEmail, redirectTo);
      setResetMessage("ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลครูหลักแล้ว");
    } catch (caught) {
      setResetMessage(caught instanceof Error ? caught.message : "ส่งลิงก์รีเซ็ตไม่สำเร็จ");
    } finally {
      setResetBusy(false);
    }
  }

  return (
    <main className="space-bg grid min-h-screen place-items-center p-4">
      <section className="relative z-10 grid w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-pink-50 via-white to-sky-50 p-8 sm:p-10">
          <div className="relative mb-8 flex items-center gap-4">
            <span className="grid h-20 w-20 place-items-center rounded-[1.4rem] bg-amber-300 shadow-xl shadow-amber-300/25">
              <img src="/mascot-star.svg" alt="" className="h-16 w-16" />
            </span>
            <div>
              <h1 className="text-5xl font-black leading-none text-violet-800 sm:text-6xl">สุ่มสนุก</h1>
              <p className="text-3xl font-black text-amber-500">ดาวนักคิด</p>
            </div>
          </div>
          <div className="relative">
            <p className="inline-flex items-center gap-2 rounded-full bg-violet-100 px-4 py-2 text-sm font-black text-violet-800">
              <Sparkles className="h-4 w-4" />
              ห้องเรียนพร้อมเริ่มภารกิจ
            </p>
            <h2 className="mt-5 max-w-md text-4xl font-black leading-tight text-violet-950 sm:text-5xl">
              เปิดจอครู แล้วเริ่มสุ่มชื่อได้ทันที
            </h2>
            <div className="mt-6 grid max-w-md gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-white/85 p-3 text-center shadow-sm ring-1 ring-violet-100">
                <Rocket className="mx-auto mb-1 h-6 w-6 text-sky-500" />
                <p className="text-xs font-black text-violet-900">สุ่มสนุก</p>
              </div>
              <div className="rounded-2xl bg-white/85 p-3 text-center shadow-sm ring-1 ring-violet-100">
                <Star className="mx-auto mb-1 h-6 w-6 fill-amber-400 text-amber-400" />
                <p className="text-xs font-black text-violet-900">ให้ดาวไว</p>
              </div>
              <div className="rounded-2xl bg-white/85 p-3 text-center shadow-sm ring-1 ring-violet-100">
                <ShieldCheck className="mx-auto mb-1 h-6 w-6 text-emerald-500" />
                <p className="text-xs font-black text-violet-900">ครูเท่านั้น</p>
              </div>
            </div>
            <img src="/planet.svg" alt="" className="mt-8 w-full max-w-md" />
          </div>
        </div>

        <div className="space-bg relative grid place-items-center p-8 sm:p-10">
          <div className="relative z-10 mx-auto w-full max-w-sm rounded-[2rem] bg-white/95 p-6 shadow-2xl ring-1 ring-white/30">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-xl shadow-violet-600/25">
                <Lock className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-black text-violet-950">รหัสผ่านครู</h2>
              <p className="text-sm font-semibold text-slate-500">
                {isSupabaseEnabled ? "ใส่รหัสผ่านเพื่อบันทึกคะแนนและจัดการข้อมูล" : "Demo mode: กดเข้าใช้งานได้เลย"}
              </p>
            </div>

            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="relative block">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <TextInput
                  className="min-h-14 rounded-2xl pl-10 text-center text-lg font-black tracking-[0.18em]"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  autoFocus
                />
              </label>
              {error ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-600">{error}</p> : null}
              <Button className="min-h-14 w-full rounded-2xl text-base" type="submit" disabled={saving}>
                <LogIn className="h-4 w-4" />
                เข้าสู่ระบบ
              </Button>
              <Link
                href={previewPath}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-violet-100 bg-white text-sm font-black text-violet-900 shadow-sm shadow-violet-900/5 transition hover:-translate-y-0.5 hover:bg-violet-50"
              >
                <Rocket className="h-4 w-4 text-sky-500" />
                ทดลองสุ่มก่อน ไม่บันทึกคะแนน
              </Link>
            </form>
            <div className="mt-4 border-t border-violet-100 pt-4">
              <Button type="button" variant="light" className="w-full" onClick={() => void handleResetPassword()} disabled={resetBusy}>
                <KeyRound className="h-4 w-4" />
                ลืมรหัสผ่าน? ส่งลิงก์รีเซ็ต
              </Button>
              {resetMessage ? <p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm font-bold text-violet-700">{resetMessage}</p> : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
