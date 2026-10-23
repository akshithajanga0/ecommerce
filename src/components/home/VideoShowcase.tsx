"use client";

import { useState } from "react";
import { ExternalLink, Play, Video, X } from "lucide-react";
import { SEED_YOUTUBE_VIDEOS } from "@/data/adminSeed";
import { cn } from "@/lib/utils";

const CHANNEL_URL = "https://www.youtube.com/@MiracleCollections-b1f";

const YOUTUBE_SHORTS = [
  {
    id: "KFCkU1PGMhI",
    title: "#బతుకమ్మ స్పెషల్ *KIDS LEHENGA* (Size 30-40)",
    shortUrl: "https://youtube.com/shorts/KFCkU1PGMhI?si=uw3seWxe_DeimsGE",
    embedUrl: "https://www.youtube.com/embed/KFCkU1PGMhI?autoplay=1",
    thumbnail: "https://i.ytimg.com/vi/KFCkU1PGMhI/hqdefault.jpg",
    tag: "Kids Lehenga",
  },
  {
    id: "I8ywWl9W5tQ",
    title: "Mysore Crepe Sarees & Low Price Sets",
    shortUrl: "https://youtube.com/shorts/I8ywWl9W5tQ?si=bixjuZUf5eLlgiyL",
    embedUrl: "https://www.youtube.com/embed/I8ywWl9W5tQ?autoplay=1",
    thumbnail: "https://i.ytimg.com/vi/I8ywWl9W5tQ/hqdefault.jpg",
    tag: "Sarees & Sets",
  },
  {
    id: "5_gGNtiukSk",
    title: "Kids Pure Pattu Lehenga Collection (Size 24-28)",
    shortUrl: "https://youtube.com/shorts/5_gGNtiukSk?si=-8daXAw4LvW0IN-n",
    embedUrl: "https://www.youtube.com/embed/5_gGNtiukSk?autoplay=1",
    thumbnail: "https://i.ytimg.com/vi/5_gGNtiukSk/hqdefault.jpg",
    tag: "Pure Pattu",
  },
];

export function VideoShowcase() {
  const [activeVideo, setActiveVideo] = useState<{
    id: string;
    title: string;
    embedUrl: string;
    shortUrl: string;
  } | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
      <div className="rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8 lg:p-10">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                <Video size={18} />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Miracle Collections Studio
              </span>
            </div>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-black sm:text-3xl">
              Watch & Discover Collections
            </h2>
            <p className="mt-1 text-xs text-neutral-500 sm:text-sm">
              Watch our latest sarees, lehengas, and ethnic styles in motion
            </p>
          </div>

          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            suppressHydrationWarning
            className="inline-flex items-center gap-1.5 self-start rounded-full border border-neutral-300 bg-white px-4 py-2 text-xs font-bold text-neutral-800 transition-colors hover:border-black hover:bg-neutral-50 sm:self-auto"
          >
            <span>Visit YouTube Channel</span>
            <ExternalLink size={13} />
          </a>
        </div>

        {/* Video Shorts Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 sm:gap-6">
          {YOUTUBE_SHORTS.map((video) => (
            <div
              key={video.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-900 shadow-sm transition-all duration-300 hover:shadow-md"
            >
              {/* Thumbnail Container */}
              <div
                onClick={() => setActiveVideo(video)}
                className="relative aspect-[9/14] w-full cursor-pointer overflow-hidden bg-neutral-800"
              >
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                {/* Category Tag */}
                <div className="absolute left-3 top-3">
                  <span className="rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-xs">
                    {video.tag}
                  </span>
                </div>

                {/* Shorts Badge */}
                <div className="absolute right-3 top-3">
                  <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white shadow-xs">
                    Shorts
                  </span>
                </div>

                {/* Center Play Button */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-600/95 text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-rose-600">
                    <Play size={24} className="ml-1 fill-white" />
                  </div>
                </div>

                {/* Bottom title & channel info */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-sm font-bold leading-snug text-white line-clamp-2">
                    {video.title}
                  </p>
                  <p className="mt-1 text-[11px] font-medium text-neutral-300">
                    @MiracleCollections
                  </p>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-950 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setActiveVideo(video)}
                  suppressHydrationWarning
                  className="text-xs font-bold text-white transition-colors hover:text-rose-400"
                >
                  Watch Now
                </button>
                <a
                  href={video.shortUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  suppressHydrationWarning
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-400 transition-colors hover:text-white"
                >
                  <span>Open on YouTube</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal Player */}
      {activeVideo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fade-in"
          onClick={() => setActiveVideo(null)}
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-black shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-4 py-3 text-white">
              <span className="truncate text-xs font-bold">
                {activeVideo.title}
              </span>
              <button
                type="button"
                onClick={() => setActiveVideo(null)}
                aria-label="Close video"
                suppressHydrationWarning
                className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Video iframe */}
            <div className="relative aspect-[9/16] w-full bg-black">
              <iframe
                src={activeVideo.embedUrl}
                title={activeVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900 px-4 py-2.5">
              <span className="text-[11px] text-neutral-400">
                Miracle Collections
              </span>
              <a
                href={activeVideo.shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                suppressHydrationWarning
                className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 hover:underline"
              >
                <span>View on YouTube</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
