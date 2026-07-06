"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  DoorOpen,
  Home,
  LogOut,
  PlayCircle,
  Settings,
  Sparkles,
  Star,
  Users,
  UsersRound
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navSections = [
  {
    label: "ฐานบัญชาการ",
    items: [{ href: "/dashboard", label: "ภาพรวมเกม", icon: Home }]
  },
  {
    label: "ห้องเรียน",
    items: [
      { href: "/classrooms", label: "ห้องเรียนของฉัน", icon: DoorOpen },
      { href: "/students", label: "รายชื่อนักเรียน", icon: Users },
      { href: "/groups", label: "จัดกลุ่ม", icon: UsersRound },
      { href: "/subjects", label: "วิชาของฉัน", icon: BookOpen }
    ]
  },
  {
    label: "ภารกิจ",
    items: [
      { href: "/play", label: "เริ่มภารกิจสุ่ม", icon: PlayCircle },
      { href: "/leaderboard", label: "ดาวสะสม", icon: Star }
    ]
  },
  {
    label: "ตรวจสอบ",
    items: [
      { href: "/reports", label: "รายงาน", icon: BarChart3 },
      { href: "/settings", label: "ตั้งค่าเกม", icon: Settings }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut, isSupabaseEnabled } = useAuth();

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-72 flex-col overflow-hidden border-r border-white/10 bg-[#0b0b3f] p-4 text-white shadow-2xl shadow-violet-950/30 lg:flex">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(251,191,36,0.18),transparent_9rem),radial-gradient(circle_at_100%_18%,rgba(168,85,247,0.26),transparent_12rem),linear-gradient(180deg,#11135f_0%,#090a33_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-50 [background-image:radial-gradient(circle,rgba(255,255,255,.9)_0_1px,transparent_1.5px)] [background-size:54px_54px]" />

      <Link href="/dashboard" data-sound="menu" className="relative mb-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-3 text-white shadow-xl shadow-violet-950/20 backdrop-blur">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-amber-300 shadow-lg shadow-amber-300/25">
          <img src="/mascot-star.svg" alt="" className="h-11 w-11" />
        </span>
        <div>
          <p className="text-xl font-black leading-tight">สุ่มสนุก</p>
          <p className="text-sm font-black text-amber-200">ดาวนักคิด</p>
        </div>
      </Link>

      <nav className="sidebar-nav relative flex flex-1 flex-col gap-4 overflow-y-auto pr-1">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-xs font-black text-violet-200/70">{section.label}</p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-sound="menu"
                    className={cn(
                      "group flex min-h-12 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-black transition duration-200 hover:-translate-y-0.5",
                      active
                        ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-950/25 ring-1 ring-white/20"
                        : "text-violet-50/80 hover:bg-white/10 hover:text-white"
                    )}
                  >
                    <span className={cn("grid h-8 w-8 place-items-center rounded-lg transition", active ? "bg-white/20" : "bg-white/10 group-hover:bg-white/15")}>
                      <Icon className={cn("h-5 w-5", active ? "text-amber-200" : "text-violet-100/80")} />
                    </span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/10 p-3 shadow-xl shadow-violet-950/20 backdrop-blur">
        <div className="mb-3 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-violet-950 shadow-lg shadow-amber-300/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-white">{user?.email ?? "ยังไม่เข้าสู่ระบบ"}</p>
            <p className="text-xs font-semibold text-violet-100/70">{isSupabaseEnabled ? "Supabase" : "Demo mode"}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start text-violet-50 hover:bg-white/10 hover:text-white" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4" />
          ออกจากระบบ
        </Button>
      </div>
    </aside>
  );
}
