"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Mail, RefreshCcw, ShieldCheck, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label, SelectInput, TextInput } from "@/components/ui/fields";
import { PageCard } from "@/components/ui/page-card";
import { STAR_SETTINGS } from "@/lib/star-settings";
import { useAuth } from "@/components/providers/auth-provider";
import { useData } from "@/components/providers/data-provider";
import { readClientParam } from "@/lib/url";
import { formatStars } from "@/lib/utils";

export default function SettingsPage() {
  const { user, isSupabaseEnabled, changePassword, updatePassword, sendPasswordReset } = useAuth();
  const { data, isDemoMode, resetDemoData, resetStarEvents } = useData();
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetEmail, setResetEmail] = useState(user?.email ?? "");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [starResetScope, setStarResetScope] = useState("all");
  const [starResetConfirm, setStarResetConfirm] = useState("");
  const [starResetBusy, setStarResetBusy] = useState(false);
  const [starResetMessage, setStarResetMessage] = useState("");
  const [starResetError, setStarResetError] = useState("");

  const selectedResetClassroomId = starResetScope === "all" ? null : starResetScope;
  const resetTargetEvents = selectedResetClassroomId
    ? data.starEvents.filter((event) => event.classroom_id === selectedResetClassroomId)
    : data.starEvents;
  const resetTargetStars = resetTargetEvents.reduce((sum, event) => sum + Number(event.stars), 0);
  const resetTargetClassroom = selectedResetClassroomId ? data.classrooms.find((classroom) => classroom.id === selectedResetClassroomId) : null;
  const starResetReady = starResetConfirm.trim() === "ล้างดาว" && resetTargetEvents.length > 0 && !starResetBusy;

  useEffect(() => {
    setRecoveryMode(readClientParam("mode") === "password-recovery");
  }, []);

  useEffect(() => {
    if (user?.email) setResetEmail(user.email);
  }, [user?.email]);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (!isSupabaseEnabled) {
      setPasswordError("Demo mode ยังไม่ได้เชื่อม Supabase Auth จึงเปลี่ยนรหัสผ่านจริงไม่ได้");
      return;
    }

    if (!recoveryMode && !currentPassword) {
      setPasswordError("กรุณากรอกรหัสผ่านเดิมเพื่อยืนยันตัวตน");
      return;
    }

    if (nextPassword.length < 8) {
      setPasswordError("รหัสผ่านใหม่ควรมีอย่างน้อย 8 ตัวอักษร");
      return;
    }

    if (nextPassword !== confirmPassword) {
      setPasswordError("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
      return;
    }

    setPasswordBusy(true);
    try {
      if (recoveryMode) {
        await updatePassword(nextPassword);
        setRecoveryMode(false);
      } else {
        await changePassword(currentPassword, nextPassword);
      }
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setPasswordMessage("เปลี่ยนรหัสผ่านเรียบร้อยแล้ว");
    } catch (caught) {
      setPasswordError(caught instanceof Error ? caught.message : "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handlePasswordReset() {
    setResetMessage("");
    if (!isSupabaseEnabled) {
      setResetMessage("Demo mode ยังไม่ได้เชื่อม Supabase Auth จึงส่งอีเมลรีเซ็ตไม่ได้");
      return;
    }

    if (!resetEmail.trim()) {
      setResetMessage("กรุณากรอกอีเมลที่ใช้เข้าสู่ระบบ");
      return;
    }

    setResetBusy(true);
    try {
      const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/settings?mode=password-recovery`;
      await sendPasswordReset(resetEmail.trim(), redirectTo);
      setResetMessage("ส่งลิงก์รีเซ็ตรหัสผ่านไปที่อีเมลแล้ว");
    } catch (caught) {
      setResetMessage(caught instanceof Error ? caught.message : "ส่งลิงก์รีเซ็ตไม่สำเร็จ");
    } finally {
      setResetBusy(false);
    }
  }

  async function handleStarReset() {
    setStarResetMessage("");
    setStarResetError("");

    if (starResetConfirm.trim() !== "ล้างดาว") {
      setStarResetError("กรุณาพิมพ์คำว่า ล้างดาว เพื่อยืนยัน");
      return;
    }

    if (resetTargetEvents.length === 0) {
      setStarResetError("ไม่มีประวัติดาวในขอบเขตที่เลือก");
      return;
    }

    const scopeText = resetTargetClassroom ? `ห้อง ${resetTargetClassroom.name}` : "ทุกห้องเรียน";
    if (!confirm(`ยืนยันล้างคะแนนดาวของ${scopeText} จำนวน ${resetTargetEvents.length} รายการหรือไม่? รายชื่อนักเรียนและรูปจะไม่ถูกลบ`)) return;

    setStarResetBusy(true);
    try {
      await resetStarEvents({ classroom_id: selectedResetClassroomId });
      setStarResetConfirm("");
      setStarResetMessage(`ล้างคะแนนดาวของ${scopeText}เรียบร้อยแล้ว`);
    } catch (caught) {
      setStarResetError(caught instanceof Error ? caught.message : "ล้างคะแนนดาวไม่สำเร็จ");
    } finally {
      setStarResetBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm font-bold text-violet-600">ตั้งค่า</p>
        <h1 className="text-3xl font-black text-violet-950">ตั้งค่าดาวและระบบ</h1>
      </header>

      <section className="grid gap-5 xl:grid-cols-[1fr_0.85fr]">
        <PageCard>
          <h2 className="mb-4 text-xl font-black text-violet-950">ประเภทดาวเริ่มต้น</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {STAR_SETTINGS.map((setting) => (
              <div key={setting.reason} className="soft-card rounded-2xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-violet-950">{setting.label}</p>
                    <p className="text-sm font-semibold text-slate-500">{setting.reason}</p>
                  </div>
                  <p className="text-2xl font-black text-amber-500">+{setting.stars} ⭐</p>
                </div>
              </div>
            ))}
          </div>
        </PageCard>

        <PageCard>
          <h2 className="mb-4 text-xl font-black text-violet-950">สถานะการเชื่อมต่อ</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3 rounded-2xl bg-white p-4">
              <ShieldCheck className="mt-1 h-6 w-6 text-emerald-500" />
              <div>
                <p className="font-black text-violet-950">{isSupabaseEnabled ? "เชื่อม Supabase แล้ว" : "กำลังใช้ demo mode"}</p>
                <p className="text-sm font-semibold text-slate-500">
                  {isSupabaseEnabled
                    ? "ข้อมูลจริงจะอ่านเขียนผ่าน Supabase ตาม RLS policy"
                    : "เติมค่า .env.local และรัน SQL ใน supabase/schema.sql เพื่อใช้ฐานข้อมูลจริง"}
                </p>
              </div>
            </div>
            {isDemoMode ? (
              <Button variant="warning" className="w-full" onClick={resetDemoData}>
                <RefreshCcw className="h-4 w-4" />
                รีเซ็ต demo data
              </Button>
            ) : null}
          </div>
        </PageCard>
      </section>

      <PageCard>
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-violet-100 text-violet-700">
            <KeyRound className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-violet-950">รหัสผ่านและความปลอดภัย</h2>
            <p className="text-sm font-semibold text-slate-500">
              ระบบใช้ Supabase Auth เก็บรหัสผ่านแบบ hash ไม่บันทึกรหัสผ่านที่อ่านกลับได้ในฐานข้อมูล
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <form className="rounded-2xl border border-violet-100 bg-white p-4" onSubmit={handlePasswordSubmit}>
            <h3 className="mb-3 font-black text-violet-950">{recoveryMode ? "ตั้งรหัสผ่านใหม่จากลิงก์กู้คืน" : "เปลี่ยนรหัสผ่าน"}</h3>
            <div className="grid gap-3">
              {!recoveryMode ? (
                <div>
                  <Label>รหัสผ่านเดิม</Label>
                  <TextInput type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" disabled={!isSupabaseEnabled || passwordBusy} />
                </div>
              ) : null}
              <div>
                <Label>รหัสผ่านใหม่</Label>
                <TextInput type="password" value={nextPassword} onChange={(event) => setNextPassword(event.target.value)} autoComplete="new-password" disabled={!isSupabaseEnabled || passwordBusy} />
              </div>
              <div>
                <Label>ยืนยันรหัสผ่านใหม่</Label>
                <TextInput type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" disabled={!isSupabaseEnabled || passwordBusy} />
              </div>
              {passwordError ? <p className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-600">{passwordError}</p> : null}
              {passwordMessage ? (
                <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  {passwordMessage}
                </p>
              ) : null}
              <Button type="submit" disabled={!isSupabaseEnabled || passwordBusy}>
                <KeyRound className="h-4 w-4" />
                บันทึกรหัสผ่านใหม่
              </Button>
            </div>
          </form>

          <div className="rounded-2xl border border-sky-100 bg-sky-50 p-4">
            <h3 className="mb-3 font-black text-violet-950">ลืมรหัสผ่าน</h3>
            <p className="mb-3 text-sm font-semibold text-slate-600">ส่งลิงก์รีเซ็ตไปยังอีเมล แล้วตั้งรหัสผ่านใหม่ผ่าน Supabase Auth</p>
            <Label>อีเมลผู้ใช้</Label>
            <TextInput type="email" value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="teacher@example.com" disabled={!isSupabaseEnabled || resetBusy} />
            <Button type="button" className="mt-3 w-full" variant="secondary" onClick={() => void handlePasswordReset()} disabled={!isSupabaseEnabled || resetBusy}>
              <Mail className="h-4 w-4" />
              ส่งลิงก์รีเซ็ตรหัสผ่าน
            </Button>
            {resetMessage ? <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-slate-700">{resetMessage}</p> : null}
          </div>
        </div>
      </PageCard>

      <PageCard>
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-100 text-rose-600">
            <Trash2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-violet-950">ล้างคะแนนดาว</h2>
            <p className="text-sm font-semibold text-slate-500">
              ล้างเฉพาะประวัติการให้ดาวและคะแนนสะสม รายชื่อนักเรียน ห้องเรียน กลุ่ม วิชา และรูปภาพจะยังอยู่ครบ
            </p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <div className="mb-4 flex items-start gap-3 rounded-2xl bg-white/80 p-3 text-rose-700">
              <AlertTriangle className="mt-0.5 h-5 w-5" />
              <p className="text-sm font-bold">
                การล้างดาวย้อนกลับไม่ได้ในระบบ ควรส่งออก/เก็บรายงานก่อนถ้าต้องใช้เป็นหลักฐานภายหลัง
              </p>
            </div>
            <div className="grid gap-3">
              <div>
                <Label>ขอบเขตที่ต้องการล้าง</Label>
                <SelectInput value={starResetScope} onChange={(event) => setStarResetScope(event.target.value)} disabled={starResetBusy}>
                  <option value="all">ทุกห้องเรียน</option>
                  {data.classrooms.map((classroom) => (
                    <option key={classroom.id} value={classroom.id}>
                      {classroom.name}
                    </option>
                  ))}
                </SelectInput>
              </div>
              <div>
                <Label>พิมพ์คำยืนยัน</Label>
                <TextInput
                  value={starResetConfirm}
                  onChange={(event) => setStarResetConfirm(event.target.value)}
                  placeholder="พิมพ์: ล้างดาว"
                  disabled={starResetBusy}
                />
              </div>
              <Button type="button" variant="danger" onClick={() => void handleStarReset()} disabled={!starResetReady}>
                <Trash2 className="h-4 w-4" />
                ล้างคะแนนดาว
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-white p-4">
            <p className="text-sm font-black text-amber-700">จะล้างข้อมูลดาว</p>
            <p className="mt-2 text-4xl font-black text-violet-950">{resetTargetEvents.length} รายการ</p>
            <p className="mt-1 text-sm font-bold text-slate-500">
              รวม {formatStars(resetTargetStars)} ดาว · {resetTargetClassroom ? resetTargetClassroom.name : "ทุกห้องเรียน"}
            </p>
            <div className="mt-4 rounded-2xl bg-white/80 p-3 text-sm font-bold text-slate-600">
              <p>ยังคงอยู่หลังล้าง: รายชื่อนักเรียน, เลขที่, รูปโปรไฟล์, ห้องเรียน, กลุ่ม, รายวิชา</p>
              <p className="mt-1 text-rose-600">ถูกล้าง: ประวัติการให้ดาวและคะแนนดาวสะสม</p>
            </div>
            {starResetError ? <p className="mt-3 rounded-xl bg-white p-3 text-sm font-bold text-rose-600">{starResetError}</p> : null}
            {starResetMessage ? (
              <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                {starResetMessage}
              </p>
            ) : null}
          </div>
        </div>
      </PageCard>

      <PageCard>
        <div className="flex items-start gap-3">
          <Star className="mt-1 h-6 w-6 fill-amber-400 text-amber-400" />
          <div>
            <p className="font-black text-violet-950">โครงสำหรับ setting ในอนาคตพร้อมแล้ว</p>
            <p className="text-sm font-semibold text-slate-500">
              MVP นี้ hardcode ประเภทดาวตามโจทย์ไว้ในไฟล์กลาง เพื่อให้ย้ายไปตาราง settings ภายหลังได้ง่าย
            </p>
          </div>
        </div>
      </PageCard>
    </div>
  );
}
