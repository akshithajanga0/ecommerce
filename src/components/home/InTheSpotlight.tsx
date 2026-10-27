"use client";

import { useRef, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { formatPrice, handleImageError } from "@/lib/utils";

interface SpotlightItem {
  id: string;
  brand: string;
  title: string;
  subtitle: string;
  price: number;
  image: string;
  href: string;
}

const SPOTLIGHT_ITEMS: SpotlightItem[] = [
  {
    id: "spotlight-saree",
    brand: "MIRACLE",
    title: "Royal Banarasi Silk Saree",
    subtitle: "Pure Katan Silk · Handwoven Zari Pallu",
    price: 2499,
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=85",
    href: "/products?category=clothing&subcategory=sarees",
  },
  {
    id: "spotlight-kurta",
    brand: "MIRACLE",
    title: "Embroidered Anarkali Set",
    subtitle: "Flared Rayon · Matching Chiffon Dupatta",
    price: 899,
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=900&q=85",
    href: "/products?category=clothing&subcategory=kurta-sets",
  },
  {
    id: "spotlight-brogues",
    brand: "MIRACLE",
    title: "Handcrafted Italian Brogues",
    subtitle: "Full-Grain Leather · Ergonomic Soles",
    price: 2199,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=900&q=85",
    href: "/products?category=footwear&subcategory=formal-shoes",
  },
  {
    id: "spotlight-shirt",
    brand: "MIRACLE",
    title: "Tailored Oxford Cotton Shirt",
    subtitle: "100% Combed Cotton · Breathable Fit",
    price: 799,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=900&q=85",
    href: "/products?category=clothing&subcategory=shirts",
  },
];

export function InTheSpotlight() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);

  // Manual scroll controls
  const handleScroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.firstElementChild
      ? (scrollRef.current.firstElementChild as HTMLElement).offsetWidth + 16
      : 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -cardWidth : cardWidth,
      behavior: "smooth",
    });
  };

  // Auto-scrolling interval for spotlight cards
  useEffect(() => {
    const timer = setInterval(() => {
      if (isInteractingRef.current || !scrollRef.current) return;
      const container = scrollRef.current;
      const cardWidth = container.firstElementChild
        ? (container.firstElementChild as HTMLElement).offsetWidth + 16
        : 320;

      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (container.scrollLeft >= maxScrollLeft - 10) {
        container.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        container.scrollBy({ left: cardWidth, behavior: "smooth" });
      }
    }, 4500);

    return () => clearInterval(timer);
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
      {/* Header (Matching exact screenshot title style) */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl lg:text-3xl">
          In The Spotlight
        </h2>

        {/* Desktop Navigation Chevrons */}
        <div className="hidden items-center gap-1.5 sm:flex">
          <button
            onClick={() => handleScroll("left")}
            aria-label="Scroll left"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-2xs transition-colors hover:border-black hover:text-black"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => handleScroll("right")}
            aria-label="Scroll right"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-700 shadow-2xs transition-colors hover:border-black hover:text-black"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 
        Horizontal Scrolling Spotlight Track:
        - Mobile: Snap-scroll with card peeking on the right (per screenshot).
        - Desktop: Spacious horizontal track with manual & automatic scroll.
      */}
      <div
        ref={scrollRef}
        onMouseEnter={() => {
          isInteractingRef.current = true;
        }}
        onMouseLeave={() => {
          isInteractingRef.current = false;
        }}
        onTouchStart={() => {
          isInteractingRef.current = true;
        }}
        onTouchEnd={() => {
          setTimeout(() => {
            isInteractingRef.current = false;
          }, 3000);
        }}
        className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0"
      >
        {SPOTLIGHT_ITEMS.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="group relative flex w-[84vw] xs:w-[80vw] sm:w-[440px] md:w-[480px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-900 shadow-md transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-xl"
          >
            {/* Visual Area with Overlay */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.title}
                loading="lazy"
                decoding="async"
                onError={handleImageError}
                className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              />
              {/* Dark subtle vignette to make top text highly readable */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/60" />

              {/* Top Banner Content (Exact match to MIVI card in screenshot) */}
              <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5 sm:p-4 text-white">
                <div>
                  <span className="text-base sm:text-lg font-black tracking-wider text-white drop-shadow-md">
                    {item.brand}
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-white drop-shadow-sm">
                      {item.title}
                    </p>
                    <p className="text-[10px] sm:text-xs font-semibold text-neutral-200">
                      {item.subtitle}
                    </p>
                  </div>
                  <span className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-300 backdrop-blur-xs">
                    AD
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Golden Ribbon (Exact match to "Just ₹15,999*" strip in screenshot) */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#FDE047] via-[#FACC15] to-[#EAB308] px-4 py-2.5 text-neutral-950 font-black shadow-inner">
              <span className="text-sm sm:text-base font-extrabold tracking-tight">
                Just {formatPrice(item.price)}*
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-bold transition-transform group-hover:translate-x-1">
                <span>Shop Now</span>
                <ArrowRight size={13} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
