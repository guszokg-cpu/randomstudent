"use client";

import Link from "next/link";
import { BarChart3, Home, PlayCircle, Settings, Users } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard", icon: Home, label: "หน้าแรก" },
  { href: "/students", icon: Users, label: "นักเรียน" },
  { href: "/play", icon: PlayCircle, label: "ภารกิจ", primary: true },
  { href: "/reports", icon: BarChart3, label: "รายงาน" },
  { href: "/settings", icon: Settings, label: "ตั้งค่า" }
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-3 left-3 right-3 z-40 grid grid-cols-5 rounded-2xl border border-violet-100 bg-white/95 p-1 text-slate-500 shadow-2xl shadow-violet-950/15 backdrop-blur lg:hidden">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            data-sound="menu"
            className={cn(
              "flex min-h-14 flex-col items-center justify-center rounded-xl text-[11px] font-black transition",
              active
                ? "bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-700/25"
                : item.primary
                  ? "bg-violet-50 text-violet-800 hover:bg-violet-100"
                  : "hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
