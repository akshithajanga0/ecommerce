import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5 min-w-0 shrink", className)}
      aria-label="Miracle Collections home"
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-black shadow-sm">
        <Image
          src="/logo.jpg"
          alt="Miracle Collections"
          width={36}
          height={36}
          priority
          className="h-full w-full object-cover"
        />
      </span>
      {!compact && (
        <span className="text-base sm:text-xl font-extrabold tracking-tight text-black truncate max-w-[140px] xs:max-w-none">
          Miracle Collections
        </span>
      )}
    </Link>
  );
}