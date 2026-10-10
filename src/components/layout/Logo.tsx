import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2 min-w-0 shrink", className)}
      aria-label="Miracle Collections home"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-black text-white">
        <ShoppingBag size={20} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className="text-base sm:text-xl font-extrabold tracking-tight text-black truncate max-w-[140px] xs:max-w-none">
          Miracle Collections
        </span>
      )}
    </Link>
  );
}