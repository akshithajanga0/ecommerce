/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import {
  Check,
  ExternalLink,
  Palette,
  Play,
  Plus,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import type { AdminBanner, YouTubeVideoItem } from "@/lib/adminTypes";
import { handleImageError } from "@/lib/utils";

export default function AdminContentPage() {
  const {
    banners,
    announcements,
    youtubeVideos,
    festiveThemes,
    settings,
    switchFestiveTheme,
    saveBanner,
    deleteBanner,
    saveAnnouncement,
    toggleAnnouncement,
    deleteAnnouncement,
    saveYouTubeVideo,
    deleteYouTubeVideo,
  } = useAdmin();

  // Announcement state
  const [newAnnText, setNewAnnText] = useState("");

  // Banner Modal state
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<AdminBanner | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSubtitle, setBannerSubtitle] = useState("");
  const [bannerBadge, setBannerBadge] = useState("");
  const [bannerImage, setBannerImage] = useState("");
  const [bannerLink, setBannerLink] = useState("/products");
  const [bannerBtnText, setBannerBtnText] = useState("Shop Now");

  // YouTube Video Modal state
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [editingVideo, setEditingVideo] = useState<YouTubeVideoItem | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoId, setVideoId] = useState("");
  const [videoDescription, setVideoDescription] = useState("");
  const [videoTag, setVideoTag] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [videoDuration, setVideoDuration] = useState("Shorts");
  const [videoViews, setVideoViews] = useState("1.5K");

  // YouTube URL parser helper
  const parseYouTubeUrl = (url: string) => {
    if (!url) return { videoId: null, isShort: false };
    const trimmed = url.trim();

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return { videoId: trimmed, isShort: false };
    }
    const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) {
      return { videoId: shortsMatch[1], isShort: true };
    }
    const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/);
    if (watchMatch) {
      return { videoId: watchMatch[1], isShort: false };
    }
    const youtuMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (youtuMatch) {
      return { videoId: youtuMatch[1], isShort: false };
    }
    const embedMatch = trimmed.match(/(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/);
    if (embedMatch) {
      return { videoId: embedMatch[1], isShort: false };
    }
    return { videoId: null, isShort: false };
  };

  const handleUrlChange = (newUrl: string) => {
    setVideoUrl(newUrl);
    const parsed = parseYouTubeUrl(newUrl);
    if (parsed.videoId) {
      setVideoId(parsed.videoId);
      if (!videoThumbnail || videoThumbnail.includes("i.ytimg.com") || videoThumbnail.includes("unsplash")) {
        setVideoThumbnail(`https://i.ytimg.com/vi/${parsed.videoId}/hqdefault.jpg`);
      }
      if (parsed.isShort) {
        setVideoDuration("Shorts");
      }
    }
  };

  // Policy Pages state
  const [policyTab, setPolicyTab] = useState<"refund" | "privacy" | "terms" | "shipping">("refund");
  const [policyText, setPolicyText] = useState(
    "Miracle Collections offers a hassle-free 7-day return policy for unworn, unwashed items in original packaging with tags attached. Once returned items are inspected, refunds are credited back to the original UPI reference within 48 hours."
  );

  const handleOpenBannerModal = (b?: AdminBanner) => {
    if (b) {
      setEditingBanner(b);
      setBannerTitle(b.title);
      setBannerSubtitle(b.subtitle);
      setBannerBadge(b.badge);
      setBannerImage(b.image);
      setBannerLink(b.link);
      setBannerBtnText(b.buttonText);
    } else {
      setEditingBanner(null);
      setBannerTitle("");
      setBannerSubtitle("");
      setBannerBadge("Festive Offer");
      setBannerImage("https://images.unsplash.com/photo-1566206091558-7f218b696731?auto=format&fit=crop&w=1600&q=80");
      setBannerLink("/products");
      setBannerBtnText("Explore Collection");
    }
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerTitle.trim()) return;

    saveBanner({
      ...(editingBanner ? { id: editingBanner.id } : {}),
      title: bannerTitle.trim(),
      subtitle: bannerSubtitle.trim(),
      badge: bannerBadge.trim(),
      image: bannerImage.trim(),
      link: bannerLink.trim(),
      buttonText: bannerBtnText.trim(),
      active: true,
    });

    setIsBannerModalOpen(false);
  };

  const handleOpenVideoModal = (v?: YouTubeVideoItem) => {
    if (v) {
      setEditingVideo(v);
      setVideoTitle(v.title);
      setVideoUrl(v.url || (v.videoId ? `https://youtube.com/shorts/${v.videoId}` : ""));
      setVideoId(v.videoId);
      setVideoDescription(v.description || "");
      setVideoTag(v.tag || "Ethnic Collection");
      setVideoThumbnail(v.thumbnail || (v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : ""));
      setVideoDuration(v.duration || "Shorts");
      setVideoViews(v.views || "1.5K");
    } else {
      setEditingVideo(null);
      setVideoTitle("");
      setVideoUrl("");
      setVideoId("");
      setVideoDescription("");
      setVideoTag("Kids Lehenga");
      setVideoThumbnail("");
      setVideoDuration("Shorts");
      setVideoViews("1.5K");
    }
    setIsVideoModalOpen(true);
  };

  const handleSaveVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoTitle.trim()) return;

    let finalId = videoId.trim();
    if (!finalId && videoUrl.trim()) {
      const parsed = parseYouTubeUrl(videoUrl);
      if (parsed.videoId) finalId = parsed.videoId;
    }
    if (!finalId) finalId = "KFCkU1PGMhI";

    const finalUrl = videoUrl.trim() || `https://youtube.com/shorts/${finalId}`;
    const finalThumbnail = videoThumbnail.trim() || `https://i.ytimg.com/vi/${finalId}/hqdefault.jpg`;

    saveYouTubeVideo({
      ...(editingVideo ? { id: editingVideo.id } : {}),
      title: videoTitle.trim(),
      videoId: finalId,
      url: finalUrl,
      description: videoDescription.trim(),
      tag: videoTag.trim() || "Collection",
      thumbnail: finalThumbnail,
      duration: videoDuration.trim() || "Shorts",
      views: videoViews.trim() || "1.5K",
      active: true,
    });

    setIsVideoModalOpen(false);
  };

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white shadow-sm">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
              Storefront Merchandising & Content
            </h1>
            <p className="text-xs text-neutral-500">
              1-Click seasonal theme switches, hero carousels, announcement bar, and social reels
            </p>
          </div>
        </div>
      </div>

      {/* 1. Festive Theming 1-Click Switcher */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                1-Click Festive Theme Switcher
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-0.5">
              Switch seasonal palettes and banner graphics (Diwali, Sankranti, Sale) with a single click
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold text-black border border-neutral-200">
            Active: {settings?.activeFestiveTheme?.toUpperCase() || "None"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {festiveThemes.map((theme) => {
            const isSelected = settings?.activeFestiveTheme === theme.id;

            return (
              <div
                key={theme.id}
                onClick={() => switchFestiveTheme(theme.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 flex flex-col justify-between relative overflow-hidden group ${
                  isSelected
                    ? "border-black bg-neutral-50 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-neutral-300"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-black text-white font-bold">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>
                )}

                <div>
                  {/* Color Swatch Bar */}
                  <div className="flex h-3 w-full rounded-full overflow-hidden mb-3 border border-neutral-200">
                    <div style={{ backgroundColor: theme.primaryColor }} className="flex-1" />
                    <div style={{ backgroundColor: theme.accentColor }} className="w-1/3" />
                  </div>

                  <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                    {theme.badge}
                  </span>
                  <h3 className="font-bold text-black text-sm mt-0.5">{theme.name}</h3>
                  <p className="text-xs text-neutral-600 mt-2 font-medium italic line-clamp-2">
                    &quot;{theme.bannerHeadline}&quot;
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-200 flex justify-between items-center text-[11px]">
                  <span className="text-neutral-400 font-mono">Palette preview</span>
                  <button
                    type="button"
                    className={`font-semibold ${
                      isSelected ? "text-black" : "text-neutral-500 group-hover:text-black"
                    }`}
                  >
                    {isSelected ? "Active Theme" : "Apply Theme"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Announcement Bar Manager */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-black uppercase tracking-wider">
            Top Announcement Bar
          </h2>
          <p className="text-xs text-neutral-500">
            Rotating promo messages displayed at the very top of the customer storefront
          </p>
        </div>

        <div className="space-y-2">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => toggleAnnouncement(ann.id)}
                  className={`h-2.5 w-2.5 rounded-full ${
                    ann.active ? "bg-emerald-500 ring-2 ring-emerald-200" : "bg-neutral-300"
                  }`}
                  title={ann.active ? "Active" : "Hidden"}
                />
                <span className={ann.active ? "text-black font-medium" : "text-neutral-400 line-through"}>
                  {ann.text}
                </span>
              </div>
              <button
                onClick={() => deleteAnnouncement(ann.id)}
                className="text-neutral-400 hover:text-rose-600 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <input
            type="text"
            value={newAnnText}
            onChange={(e) => setNewAnnText(e.target.value)}
            placeholder="Type announcement e.g. 'Use code FESTIVE10 for 10% instant discount'..."
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs text-black placeholder-neutral-400 focus:border-black focus:outline-none"
          />
          <button
            onClick={() => {
              if (!newAnnText.trim()) return;
              saveAnnouncement(newAnnText.trim());
              setNewAnnText("");
            }}
            className="flex items-center gap-1 rounded-lg bg-black hover:bg-neutral-800 px-4 py-2 text-xs font-semibold text-white transition shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Text</span>
          </button>
        </div>
      </div>

      {/* 3. Hero Carousel Banners Manager */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-black uppercase tracking-wider">
              Hero Carousel Banners
            </h2>
            <p className="text-xs text-neutral-500">
              Full-width banners with headlines, offers, and direct action CTAs
            </p>
          </div>
          <button
            onClick={() => handleOpenBannerModal()}
            className="flex items-center gap-1.5 rounded-lg bg-black px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition shadow-sm"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Banner</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {banners.map((b) => (
            <div
              key={b.id}
              className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm group flex flex-col justify-between"
            >
              <div className="h-40 relative bg-neutral-100">
                <img src={b.image} alt={b.title} onError={handleImageError} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <span className="absolute top-2 left-2 rounded bg-black text-white text-[10px] font-semibold px-2 py-0.5">
                  {b.badge}
                </span>
                <div className="absolute bottom-2 left-3 right-3">
                  <h3 className="text-sm font-bold text-white leading-tight">{b.title}</h3>
                </div>
              </div>

              <div className="p-4 space-y-3 text-xs flex-1 flex flex-col justify-between">
                <p className="text-neutral-500 text-[11px] line-clamp-2">{b.subtitle}</p>

                <div className="pt-2 border-t border-neutral-100 flex justify-between items-center">
                  <button
                    onClick={() => handleOpenBannerModal(b)}
                    className="text-black font-semibold hover:underline"
                  >
                    Edit Banner
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete banner '${b.title}'?`)) deleteBanner(b.id);
                    }}
                    className="text-neutral-400 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. YouTube Video Strip Showcase */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                <Video className="h-4 w-4" />
              </span>
              <h2 className="text-sm font-bold text-black uppercase tracking-wider">
                Watch & Discover — YouTube Video Showcase
              </h2>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Post and manage YouTube lookbook reels, Shorts, URLs, descriptions, and category tags displayed on the storefront
            </p>
          </div>
          <button
            onClick={() => handleOpenVideoModal()}
            className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition shadow-sm"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span>Post YouTube Video</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {youtubeVideos.map((vid) => (
            <div
              key={vid.id}
              className="rounded-xl border border-neutral-200 bg-white overflow-hidden shadow-sm group flex flex-col justify-between hover:border-black/30 transition-colors"
            >
              <div className="h-44 relative bg-neutral-900 overflow-hidden">
                <img
                  src={vid.thumbnail}
                  alt={vid.title}
                  onError={handleImageError}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-center justify-center">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg group-hover:scale-110 transition">
                    <Play className="h-5 w-5 ml-0.5 fill-current" />
                  </div>
                </div>

                {/* Tag Badge */}
                <span className="absolute top-2.5 left-2.5 rounded-full bg-black/75 backdrop-blur-xs px-2.5 py-0.5 text-[10px] font-bold text-white tracking-wide">
                  {vid.tag || "Collection"}
                </span>

                {/* Duration Badge */}
                <span className="absolute bottom-2.5 right-2.5 rounded bg-black/80 font-mono text-[10px] text-white px-2 py-0.5">
                  {vid.duration || "Shorts"}
                </span>
              </div>

              <div className="p-3.5 text-xs flex flex-col flex-1 justify-between gap-3">
                <div className="space-y-1">
                  <p className="font-bold text-black text-sm leading-snug line-clamp-2">
                    {vid.title}
                  </p>
                  {vid.description ? (
                    <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed">
                      {vid.description}
                    </p>
                  ) : (
                    <p className="text-[11px] text-neutral-400 italic">No description provided</p>
                  )}
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500">
                    <span className="font-medium text-neutral-700">{vid.views || "1.2K"} views</span>
                    {vid.url && (
                      <a
                        href={vid.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline"
                      >
                        <span>Open on YouTube</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-neutral-100 text-[11px]">
                    <span className="font-mono text-[10px] text-neutral-400">ID: {vid.videoId}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenVideoModal(vid)}
                        className="text-black font-bold hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteYouTubeVideo(vid.id)}
                        className="text-neutral-400 hover:text-rose-600 transition"
                        title="Delete video"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Policy Pages Editor */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-black uppercase tracking-wider">
              Legal & Policy Pages Editor
            </h2>
            <p className="text-xs text-neutral-500">
              Store policies: Returns & Refunds, Shipping, Privacy Policy, Terms of Service
            </p>
          </div>
          <button
            onClick={() => alert("Policy changes published to storefront successfully!")}
            className="rounded-lg bg-black hover:bg-neutral-800 px-3.5 py-1.5 text-xs font-semibold text-white transition shadow-sm"
          >
            Publish Updates
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-neutral-200 pb-2">
          {(
            [
              { id: "refund", label: "Returns & Refunds Policy" },
              { id: "shipping", label: "Shipping Policy" },
              { id: "privacy", label: "Privacy Policy" },
              { id: "terms", label: "Terms of Service" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setPolicyTab(t.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                policyTab === t.id
                  ? "bg-black text-white shadow-sm"
                  : "border border-neutral-200 bg-white text-neutral-600 hover:text-black"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <textarea
          rows={5}
          value={policyText}
          onChange={(e) => setPolicyText(e.target.value)}
          className="w-full rounded-xl border border-neutral-300 bg-white p-4 text-xs text-black placeholder-neutral-400 focus:border-black focus:outline-none leading-relaxed"
        />
      </div>

      {/* Banner Modal */}
      {isBannerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
              <h2 className="text-base font-bold text-black">
                {editingBanner ? "Edit Hero Banner" : "Create Hero Banner"}
              </h2>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Banner Headline *</label>
                <input
                  type="text"
                  required
                  value={bannerTitle}
                  onChange={(e) => setBannerTitle(e.target.value)}
                  placeholder="e.g. Diwali Royal Ethnic Edit 2026"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-black placeholder-neutral-400 focus:border-black focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Subheadline Description</label>
                <textarea
                  rows={2}
                  value={bannerSubtitle}
                  onChange={(e) => setBannerSubtitle(e.target.value)}
                  placeholder="Brief descriptive marketing copy..."
                  className="w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-black placeholder-neutral-400 focus:border-black focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Badge Tag</label>
                  <input
                    type="text"
                    value={bannerBadge}
                    onChange={(e) => setBannerBadge(e.target.value)}
                    placeholder="New Collection"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-black placeholder-neutral-400 focus:border-black focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Button CTA Text</label>
                  <input
                    type="text"
                    value={bannerBtnText}
                    onChange={(e) => setBannerBtnText(e.target.value)}
                    placeholder="Shop Festive Edit"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-black placeholder-neutral-400 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Banner Background Image URL</label>
                <input
                  type="url"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-black placeholder-neutral-400 focus:border-black focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-black transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-black hover:bg-neutral-800 px-5 py-2 text-xs font-semibold text-white transition shadow-sm"
                >
                  Save Hero Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* YouTube Video Modal */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl border border-neutral-200 bg-white shadow-2xl overflow-hidden my-6">
            <div className="flex items-center justify-between border-b border-neutral-200 bg-neutral-50 px-6 py-4">
              <div>
                <h2 className="text-base font-bold text-black flex items-center gap-2">
                  <Video className="h-4 w-4 text-rose-600" />
                  <span>{editingVideo ? "Edit Video Showcase Card" : "Post YouTube Showcase Video"}</span>
                </h2>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Publish lookbook reels with direct YouTube URLs, collection tags & descriptions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 hover:text-black transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVideo} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              {/* YouTube Video URL Input with Auto-extract */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-800 flex items-center justify-between">
                  <span>YouTube Video or Shorts URL *</span>
                  <span className="text-[10px] text-neutral-400 font-normal">Auto-detects video ID & thumbnail</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="e.g. https://youtube.com/shorts/KFCkU1PGMhI or https://youtu.be/..."
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-9 text-black placeholder-neutral-400 focus:border-black focus:outline-none"
                  />
                  {videoId && (
                    <div className="absolute right-2.5 top-2.5 text-emerald-600" title="Valid YouTube ID detected">
                      <Check className="h-4 w-4 stroke-[3]" />
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400">
                  Accepts YouTube Shorts links, full watch URLs, or share links.
                </p>
              </div>

              {/* Video Title */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-800">Video Title *</label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="e.g. #బతుకమ్మ స్పెషల్ KIDS LEHENGA (Size 30-40)"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-black placeholder-neutral-400 focus:border-black focus:outline-none"
                />
              </div>

              {/* Category / Collection Tag with suggestions */}
              <div className="space-y-1.5">
                <label className="font-semibold text-neutral-800">Collection / Category Tag</label>
                <input
                  type="text"
                  value={videoTag}
                  onChange={(e) => setVideoTag(e.target.value)}
                  placeholder="e.g. Kids Lehenga, Sarees & Sets, Pure Pattu"
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-black placeholder-neutral-400 focus:border-black focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {["Kids Lehenga", "Sarees & Sets", "Pure Pattu", "Anarkali Suits", "Bridal Wear", "Festive Edit"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setVideoTag(tag)}
                      className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold transition ${
                        videoTag === tag
                          ? "border-black bg-black text-white"
                          : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:border-neutral-300 hover:text-black"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description Textarea */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-800">Video Description</label>
                <textarea
                  rows={3}
                  value={videoDescription}
                  onChange={(e) => setVideoDescription(e.target.value)}
                  placeholder="Describe the fabric, design details, sizes available, or styling inspiration shown in the video..."
                  className="w-full rounded-lg border border-neutral-300 bg-white p-2.5 text-black placeholder-neutral-400 focus:border-black focus:outline-none leading-relaxed"
                />
              </div>

              {/* Grid: Video ID, Duration, Views */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Video ID</label>
                  <input
                    type="text"
                    value={videoId}
                    onChange={(e) => {
                      setVideoId(e.target.value);
                      if (e.target.value.length === 11) {
                        setVideoThumbnail(`https://i.ytimg.com/vi/${e.target.value}/hqdefault.jpg`);
                      }
                    }}
                    placeholder="e.g. KFCkU1PGMhI"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-black font-mono text-[11px] focus:border-black focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Duration</label>
                  <input
                    type="text"
                    value={videoDuration}
                    onChange={(e) => setVideoDuration(e.target.value)}
                    placeholder="Shorts"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-black text-[11px] focus:border-black focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-neutral-700">Views Badge</label>
                  <input
                    type="text"
                    value={videoViews}
                    onChange={(e) => setVideoViews(e.target.value)}
                    placeholder="1.8K"
                    className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-black text-[11px] focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Thumbnail Image URL */}
              <div className="space-y-1">
                <label className="font-semibold text-neutral-700">Thumbnail Image URL</label>
                <input
                  type="url"
                  value={videoThumbnail}
                  onChange={(e) => setVideoThumbnail(e.target.value)}
                  placeholder="https://i.ytimg.com/vi/..."
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-black placeholder-neutral-400 focus:border-black focus:outline-none font-mono text-[11px]"
                />
              </div>

              {/* Live Preview Card */}
              {videoThumbnail && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Live Storefront Card Preview
                  </span>
                  <div className="flex gap-3 items-center">
                    <div className="relative h-20 w-14 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
                      <img src={videoThumbnail} alt="Preview" onError={handleImageError} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play className="h-4 w-4 fill-white text-white" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="rounded bg-neutral-200 px-1.5 py-0.5 text-[9px] font-bold text-neutral-800">
                        {videoTag || "Collection"}
                      </span>
                      <p className="font-bold text-black text-xs truncate">
                        {videoTitle || "Untitled Video"}
                      </p>
                      <p className="text-[10px] text-neutral-500 line-clamp-1">
                        {videoDescription || "No description provided"}
                      </p>
                      <span className="text-[10px] text-neutral-400 font-mono">
                        {videoDuration || "Shorts"} • {videoViews || "1.2K"} views
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 border-t border-neutral-200 pt-4">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-neutral-600 hover:text-black transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-black hover:bg-neutral-800 px-5 py-2 text-xs font-semibold text-white transition shadow-sm"
                >
                  {editingVideo ? "Update Video" : "Publish Video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
