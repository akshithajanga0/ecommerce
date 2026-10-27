import { ShieldCheck, CreditCard, Truck, RefreshCw, Headphones } from "lucide-react";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "100% Genuine Quality",
    subtitle: "Direct verified",
  },
  {
    icon: Truck,
    title: "Fast Delivery",
    subtitle: "Free over ₹499",
  },
  {
    icon: RefreshCw,
    title: "7-Day Easy Returns",
    subtitle: "Doorstep pickup",
  },
  {
    icon: CreditCard,
    title: "Secure Payments",
    subtitle: "UPI, Cards & COD",
  },
  {
    icon: Headphones,
    title: "Dedicated Support",
    subtitle: "Instant help",
  },
];

export function QuickBenefits() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-4 sm:px-6">
      {/* Reduced-size, sleek KPI Trust Strip matching compact presentation */}
      <div className="rounded-xl border border-neutral-200/90 bg-white p-2 shadow-2xs sm:p-2.5">
        {/* Mobile: Horizontal scrollable strip; Tablet/Desktop: Even 5-column row */}
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:grid sm:grid-cols-5 sm:gap-2">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-neutral-50/70 px-2.5 py-1.5 transition-colors hover:bg-neutral-100 sm:shrink sm:px-2 sm:py-1"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#FAF6F0] text-[#58111A]">
                <b.icon size={13} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <p className="whitespace-nowrap text-[11px] font-bold text-neutral-900 leading-tight">
                  {b.title}
                </p>
                <p className="whitespace-nowrap text-[9px] text-neutral-500 leading-tight">
                  {b.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
