"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, Star } from "lucide-react";
import { formatPrice, handleImageError } from "@/lib/utils";

interface HeroProduct {
  id: string;
  title: string;
  tagline: string;
  category: string;
  badge: string;
  price: number;
  mrp: number;
  rating: number;
  reviews: number;
  image: string;
  href: string;
}

const PREMIUM_HERO_PRODUCTS: HeroProduct[] = [
  {
    id: "hero-saree",
    title: "Royal Banarasi Zari Silk Saree",
    tagline: "Hand-loomed silk drape with matching unstitched blouse",
    category: "Heritage Weaves",
    badge: "58% OFF · Signature",
    price: 2499,
    mrp: 5999,
    rating: 4.9,
    reviews: 1420,
    image: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1000&q=85",
    href: "/products?category=clothing&subcategory=sarees",
  },
  {
    id: "hero-kurta",
    title: "Embroidered Anarkali Kurta Set",
    tagline: "Flared rayon silhouette with matching chiffon dupatta",
    category: "Festive Collection",
    badge: "Top Seller · 4.9★",
    price: 899,
    mrp: 2199,
    rating: 4.8,
    reviews: 876,
    image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1000&q=85",
    href: "/products?category=clothing&subcategory=kurta-sets",
  },
  {
    id: "hero-brogues",
    title: "Handcrafted Italian Leather Brogues",
    tagline: "Full-grain leather with cushioned ergonomic insole",
    category: "Artisanal Footwear",
    badge: "Hand-Lasted Leather",
    price: 2199,
    mrp: 4499,
    rating: 4.8,
    reviews: 512,
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=85",
    href: "/products?category=footwear&subcategory=formal-shoes",
  },
  {
    id: "hero-shirt",
    title: "Tailored Oxford Combed Cotton Shirt",
    tagline: "Crisp breathable weave with reinforced button placket",
    category: "Bespoke Menswear",
    badge: "58% OFF",
    price: 799,
    mrp: 1899,
    rating: 4.7,
    reviews: 980,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=1000&q=85",
    href: "/products?category=clothing&subcategory=shirts",
  },
  {
    id: "hero-sneakers",
    title: "Minimalist Napa Court Sneakers",
    tagline: "Supple full-grain leather with durable rubber outsole",
    category: "Urban Footwear",
    badge: "New Release",
    price: 1499,
    mrp: 3299,
    rating: 4.8,
    reviews: 640,
    image: "https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?auto=format&fit=crop&w=1000&q=85",
    href: "/products?category=footwear&subcategory=sneakers",
  },
];

export function HomeHero() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);

  // Desktop slider controls
  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? PREMIUM_HERO_PRODUCTS.length - 1 : prev - 1));
  };

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev === PREMIUM_HERO_PRODUCTS.length - 1 ? 0 : prev + 1));
  }, []);

  // Scroll mobile container to specific card index smoothly
  const scrollToMobileCard = useCallback((index: number) => {
    if (!mobileContainerRef.current) return;
    const card = mobileContainerRef.current.children[index] as HTMLElement;
    if (card) {
      card.scrollIntoView({
        behavior: "smooth",
        inline: "start",
        block: "nearest",
      });
    }
  }, []);

  // Automatic scrolling interval for both mobile horizontal cards and desktop spotlight
  useEffect(() => {
    const timer = setInterval(() => {
      if (isInteractingRef.current) return;

      setCurrentIndex((prev) => {
        const next = (prev + 1) % PREMIUM_HERO_PRODUCTS.length;
        scrollToMobileCard(next);
        return next;
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [scrollToMobileCard]);

  // Track mobile manual scroll position to sync active index and dot indicators
  const handleMobileScroll = () => {
    if (!mobileContainerRef.current) return;
    const scrollLeft = mobileContainerRef.current.scrollLeft;
    const firstChild = mobileContainerRef.current.firstElementChild as HTMLElement | null;
    if (!firstChild) return;

    const cardWidth = firstChild.offsetWidth + 12;
    const index = Math.round(scrollLeft / cardWidth);
    if (index >= 0 && index < PREMIUM_HERO_PRODUCTS.length) {
      setCurrentIndex(index);
    }
  };

  const activeProduct = PREMIUM_HERO_PRODUCTS[currentIndex];

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-3 sm:px-6">
      {/* ----------------------------------------------------------------- */}
      {/* 1. MOBILE VIEW: Auto-scrolling Horizontal Product Cards (Clean Theme) */}
      {/* ----------------------------------------------------------------- */}
      <div className="block lg:hidden">
        <div
          ref={mobileContainerRef}
          onScroll={handleMobileScroll}
          onTouchStart={() => {
            isInteractingRef.current = true;
          }}
          onTouchEnd={() => {
            setTimeout(() => {
              isInteractingRef.current = false;
            }, 3000);
          }}
          className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {PREMIUM_HERO_PRODUCTS.map((prod, index) => (
            <Link
              key={prod.id}
              href={prod.href}
              className={`group relative flex w-[84vw] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border transition-all duration-300 shadow-sm ${
                index === currentIndex
                  ? "border-neutral-400 shadow-md"
                  : "border-neutral-200"
              } bg-white text-neutral-900`}
            >
              {/* Product Visual Area */}
              <div className="relative aspect-[16/10] w-full overflow-hidden bg-neutral-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={prod.image}
                  alt={prod.title}
                  loading={index < 2 ? "eager" : "lazy"}
                  decoding="async"
                  onError={handleImageError}
                  className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />

                {/* Top Badge */}
                <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
                  <span className="rounded-md border border-neutral-200 bg-white/95 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-black backdrop-blur-xs shadow-xs">
                    {prod.badge}
                  </span>
                </div>
              </div>

              {/* Product Info Strip at Bottom */}
              <div className="p-3 bg-white border-t border-neutral-100">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    {prod.category}
                  </span>
                  <div className="flex items-center gap-1 text-[10px] text-amber-500">
                    <Star size={11} className="fill-amber-500" />
                    <span className="font-bold text-neutral-900">{prod.rating}</span>
                  </div>
                </div>

                <h3 className="mt-0.5 truncate text-sm font-black text-neutral-900 group-hover:text-black">
                  {prod.title}
                </h3>
                <p className="mt-0.5 truncate text-[11px] text-neutral-500">
                  {prod.tagline}
                </p>

                <div className="mt-2.5 flex items-center justify-between border-t border-neutral-100 pt-2">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-black text-neutral-950">
                      {formatPrice(prod.price)}
                    </span>
                    <span className="text-[11px] text-neutral-400 line-through">
                      {formatPrice(prod.mrp)}
                    </span>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-1 text-[10px] font-extrabold text-white shadow-xs group-hover:bg-black">
                    Shop Now <ArrowRight size={11} />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Mobile Dot Indicators */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {PREMIUM_HERO_PRODUCTS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                scrollToMobileCard(idx);
              }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === currentIndex ? "w-5 bg-neutral-900" : "w-1.5 bg-neutral-300"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 2. DESKTOP VIEW: Sleek, Light & Modern Spotlight (No Maroon)    */}
      {/* ------------------------------------------------------------- */}
      <div
        className="hidden lg:block"
        onMouseEnter={() => {
          isInteractingRef.current = true;
        }}
        onMouseLeave={() => {
          isInteractingRef.current = false;
        }}
      >
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200 bg-gradient-to-br from-[#FFFDF9] via-[#FAF7F2] to-[#F5EFEB] text-neutral-900 shadow-md">
          <div className="relative z-10 grid grid-cols-12 items-center gap-8 p-6 lg:p-8">
            {/* Left Content (7 Cols) */}
            <div className="col-span-7 flex flex-col justify-center">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3 py-0.5 text-xs font-semibold tracking-wide text-neutral-800 shadow-2xs">
                  <Sparkles size={12} className="text-amber-500" />
                  Curated Premium Spotlight
                </span>
                <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                  {activeProduct.badge}
                </span>
              </div>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-neutral-950 lg:text-3xl">
                {activeProduct.title}
              </h2>
              <p className="mt-1.5 max-w-lg text-xs leading-relaxed text-neutral-600 lg:text-sm">
                {activeProduct.tagline}. Handcrafted with master artisanal precision, pure breathable fabrics, and everyday comfort.
              </p>

              {/* Price & Rating */}
              <div className="mt-4 flex items-center gap-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-neutral-950">
                    {formatPrice(activeProduct.price)}
                  </span>
                  <span className="text-sm text-neutral-400 line-through">
                    {formatPrice(activeProduct.mrp)}
                  </span>
                </div>
                <div className="h-4 w-px bg-neutral-200" />
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Star size={13} className="fill-amber-500" />
                  <span className="font-bold text-neutral-900">{activeProduct.rating}</span>
                  <span className="text-neutral-500">({activeProduct.reviews} reviews)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center gap-3">
                <Link
                  href={activeProduct.href}
                  className="group inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-neutral-900 px-6 text-xs font-extrabold text-white shadow-md transition-all hover:bg-black hover:-translate-y-0.5"
                >
                  <span>Explore Product</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/products"
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-neutral-300 bg-white px-5 text-xs font-semibold text-neutral-700 transition-colors hover:border-black hover:text-black"
                >
                  View All Collections
                </Link>
              </div>

              {/* Desktop Slider Controls */}
              <div className="mt-5 flex items-center gap-3 border-t border-neutral-200/80 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Featured 0{currentIndex + 1} / 0{PREMIUM_HERO_PRODUCTS.length}
                </span>
                <div className="flex gap-1.5">
                  {PREMIUM_HERO_PRODUCTS.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentIndex ? "w-6 bg-neutral-900" : "w-2 bg-neutral-300 hover:bg-neutral-400"
                      }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    onClick={handlePrev}
                    aria-label="Previous product"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-2xs transition-colors hover:border-black hover:text-black"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={handleNext}
                    aria-label="Next product"
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-2xs transition-colors hover:border-black hover:text-black"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Product Spotlight Image (5 Cols) */}
            <div className="col-span-5">
              <div className="relative h-64 w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeProduct.image}
                  alt={activeProduct.title}
                  loading="eager"
                  decoding="async"
                  onError={handleImageError}
                  className="h-full w-full object-cover object-top transition-transform duration-700 ease-out hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                  <span className="text-xs font-bold truncate max-w-[200px]">
                    {activeProduct.title}
                  </span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">
                    Miracle Signature
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
