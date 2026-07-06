import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "success" | "warning" | "danger" | "ghost" | "light";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-700/25 hover:shadow-violet-700/35",
  secondary: "bg-gradient-to-r from-sky-500 to-cyan-400 text-white shadow-lg shadow-sky-600/20 hover:shadow-sky-600/30",
  success: "bg-gradient-to-r from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30",
  warning: "bg-gradient-to-r from-amber-300 to-orange-400 text-slate-950 shadow-lg shadow-amber-400/25 hover:shadow-amber-400/35",
  danger: "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30",
  ghost: "bg-transparent text-slate-700 hover:bg-white/70",
  light: "border border-violet-100 bg-white text-violet-900 shadow-sm shadow-violet-900/5 hover:bg-violet-50"
};

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:hover:translate-y-0 disabled:opacity-55",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
