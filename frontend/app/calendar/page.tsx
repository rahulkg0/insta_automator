"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../dashboard/layout";
import { apiRequest } from "@/lib/api";
import { PostResponse, Brand } from "@/types";
import {
  Calendar as CalendarIcon,
  Clock,
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle2,
  Grid,
  List,
  Plus,
  ArrowRight,
} from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";

export default function CalendarPage() {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [brands, setBrands] = useState<Record<string, Brand>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"feed" | "grid">("feed");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const allPosts = await apiRequest<PostResponse[]>("/api/v1/posts");
      setPosts(allPosts);

      // Fetch brands for display mapping
      const brandList = await apiRequest<Brand[]>("/api/v1/brands");
      const bMap: Record<string, Brand> = {};
      brandList.forEach((b) => {
        bMap[b.id] = b;
      });
      setBrands(bMap);
    } catch (err: any) {
      console.error("Failed to load calendar posts:", err);
      setMessage({ text: err.message || "Failed to load calendar data.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishNow = async (postId: string) => {
    setPublishingId(postId);
    setMessage(null);
    try {
      const updatedPost = await apiRequest<PostResponse>(`/api/v1/posts/${postId}/publish`, {
        method: "POST",
      });
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
      setMessage({ text: "🚀 Post published live to Instagram!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Publishing failed.", type: "error" });
    } finally {
      setPublishingId(null);
    }
  };

  // Filter posts that are scheduled, published, or approved
  const scheduledPosts = posts.filter(
    (p) => p.status === "SCHEDULED" || p.status === "APPROVED" || p.status === "PUBLISHED"
  );

  const upcomingScheduled = scheduledPosts.filter((p) => p.status === "SCHEDULED" || p.status === "APPROVED");
  const publishedPosts = scheduledPosts.filter((p) => p.status === "PUBLISHED");

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <CalendarIcon className="w-3.5 h-3.5" />
              Automated Content Dispatch
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Content Calendar</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Manage, schedule, and trigger Instagram posts across your brands.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-white/5 border border-white/10 p-1 rounded-xl text-xs">
              <button
                onClick={() => setActiveTab("feed")}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === "feed" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Schedule List
              </button>
              <button
                onClick={() => setActiveTab("grid")}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === "grid" ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Calendar Grid
              </button>
            </div>

            <Link
              href="/create"
              className="px-4 py-2 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg"
            >
              <Plus className="w-4 h-4" />
              New Post
            </Link>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {message && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center gap-3 ${
              message.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Scheduled Posts</span>
              <Clock className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-3xl font-black text-white">{upcomingScheduled.length}</p>
            <p className="text-[11px] text-yellow-400/80 mt-1">Ready for automated dispatch</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Published Posts</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-3xl font-black text-white">{publishedPosts.length}</p>
            <p className="text-[11px] text-emerald-400/80 mt-1">Live on Instagram feed</p>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between text-gray-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Approved</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-3xl font-black text-white">{scheduledPosts.length}</p>
            <p className="text-[11px] text-purple-400 mt-1">Across all brand channels</p>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center glass-card rounded-3xl border border-white/10">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-xs text-gray-400 font-medium">Loading content calendar schedule...</p>
          </div>
        ) : scheduledPosts.length === 0 ? (
          <div className="p-12 rounded-3xl glass-card border border-white/10 text-center">
            <CalendarIcon className="w-12 h-12 text-yellow-400/40 mx-auto mb-3" />
            <h2 className="text-base font-bold text-white">No Scheduled Posts Found</h2>
            <p className="text-xs text-gray-400 mt-1 mb-5 max-w-md mx-auto">
              Approve or schedule a post to see it automatically mapped on your Instagram Content Calendar.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-bg-btn text-white text-xs font-bold shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              Create & Schedule Post
            </Link>
          </div>
        ) : activeTab === "feed" ? (
          /* SCHEDULE LIST FEED VIEW */
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Scheduled & Approved Queue ({scheduledPosts.length})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scheduledPosts.map((p) => {
                const brand = brands[p.brand_id];
                const content = p.generated_content;
                const dateStr = p.scheduled_at
                  ? new Date(p.scheduled_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })
                  : p.published_at
                  ? `Published on ${new Date(p.published_at).toLocaleDateString()}`
                  : "Scheduled (Date pending)";

                return (
                  <div
                    key={p.id}
                    className="glass-card rounded-2xl p-5 border border-white/10 hover:border-purple-500/30 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                          style={{ backgroundColor: brand?.secondary_color || "#ec4899" }}
                        >
                          {brand?.name?.charAt(0) || "B"}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">{brand?.name || "Brand"}</h3>
                          <span className="text-[11px] text-purple-300 font-medium block">
                            {content?.hook || p.brief_prompt}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                          p.status === "PUBLISHED"
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                            : p.status === "SCHEDULED"
                            ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    {/* Content Preview Snippet */}
                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1 text-xs">
                      <p className="font-semibold text-gray-200 line-clamp-1">{content?.headline}</p>
                      <p className="text-gray-400 line-clamp-2 text-[11px]">{content?.caption}</p>
                    </div>

                    {/* Time & Action Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                      <div className="flex items-center gap-1.5 text-gray-400 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-yellow-400" />
                        <span>{dateStr}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/posts/${p.id}`}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white font-semibold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>

                        {p.status !== "PUBLISHED" && (
                          <button
                            onClick={() => handlePublishNow(p.id)}
                            disabled={publishingId === p.id}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center gap-1.5 transition-colors"
                          >
                            {publishingId === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            Post Now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* MONTHLY GRID VIEW */
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-purple-400" />
                Monthly Schedule Overview
              </h2>
              <span className="text-xs text-gray-400 font-mono">Current Month</span>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-gray-400 py-2 border-b border-white/10">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            <div className="grid grid-cols-7 gap-2 min-h-[360px]">
              {Array.from({ length: 31 }).map((_, idx) => {
                const dayNum = idx + 1;
                // find posts scheduled on this day (or current month)
                const dayPosts = scheduledPosts.filter((p) => {
                  const d = p.scheduled_at ? new Date(p.scheduled_at) : p.published_at ? new Date(p.published_at) : null;
                  return d && d.getDate() === dayNum;
                });

                return (
                  <div
                    key={dayNum}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all ${
                      dayPosts.length > 0
                        ? "bg-purple-900/20 border-purple-500/30 text-white"
                        : "bg-black/20 border-white/5 text-gray-500 hover:border-white/10"
                    }`}
                  >
                    <span className="text-xs font-bold text-right block">{dayNum}</span>
                    {dayPosts.length > 0 && (
                      <div className="space-y-1 mt-2">
                        {dayPosts.map((dp) => (
                          <Link
                            key={dp.id}
                            href={`/posts/${dp.id}`}
                            className="block p-1.5 rounded bg-purple-600/40 text-[10px] font-semibold text-white truncate hover:bg-purple-500 transition-colors"
                            title={dp.generated_content?.headline || dp.brief_prompt}
                          >
                            📷 {dp.generated_content?.hook || "Instagram Post"}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
