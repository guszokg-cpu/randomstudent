import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function PageCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <section className={cn("soft-card rounded-2xl p-5", className)} {...props} />;
}
