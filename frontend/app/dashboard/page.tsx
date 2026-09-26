"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, instagramApi } from "@/lib/api";
import { PostResponse, Brand, InstagramAccount } from "@/types";
import {
  FileImage,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Plus,
  Sparkles,
  ArrowUpRight,
  Building2,
  Calendar,
  Send,
  Eye,
  Loader2,
  RefreshCw,
  Zap,
  ArrowRight,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/ui/icons";

export default function DashboardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [activeIgAccount, setActiveIgAccount] = useState<InstagramAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch user posts
      const pData = await apiRequest<PostResponse[]>("/api/v1/posts");
      setPosts(pData);

      // 2. Fetch user brands
      const bData = await apiRequest<Brand[]>("/api/v1/brands");
      setBrands(bData);

      // 3. Fetch Instagram account connection status
      if (bData.length > 0) {
        for (const brand of bData) {
          try {
            const acc = await instagramApi.getAccount(brand.id);
            if (acc && acc.is_connected) {
              setActiveIgAccount(acc);
              break;
            }
          } catch {
            // keep searching
          }
        }
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  // Metrics calculation
  const totalPosts = posts.length;
  const draftPosts = posts.filter((p) => p.status === "DRAFT" || p.status === "READY_FOR_REVIEW").length;
  const scheduledPosts = posts.filter((p) => p.status === "SCHEDULED").length;
  const publishedPosts = posts.filter((p) => p.status === "PUBLISHED").length;
  const failedPosts = posts.filter((p) => p.status === "PUBLISH_FAILED" || p.status === "GENERATION_FAILED").length;

  const recentPosts = posts.slice(0, 5);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="glass-card rounded-3xl p-8 border border-white/10 relative overflow-hidden bg-gradient-to-r from-purple-900/30 via-background to-pink-900/20 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Zap className="w-3.5 h-3.5" />
              Meta Instagram Automation Live
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, <span className="gradient-text">{user?.full_name}</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1 max-w-xl">
              AI content generation, Meta Graph API OAuth publishing, and calendar scheduling active across your brand profiles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/calendar"
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-2 transition-all"
            >
              <Calendar className="w-4 h-4 text-yellow-400" />
              Content Calendar
            </Link>
            <Link
              href="/create"
              className="px-5 py-2.5 rounded-xl gradient-bg-btn text-white text-xs font-bold flex items-center gap-2 transition-all shadow-lg hover:shadow-purple-500/20"
            >
              <Plus className="w-4 h-4" />
              Create AI Post
            </Link>
          </div>
        </div>
      </div>

      {/* Dynamic Metrics Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10 glass-card-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Posts</span>
            <FileImage className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin text-purple-400" /> : totalPosts}</p>
          <p className="text-[11px] text-gray-500 mt-1">Across all brand profiles</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 glass-card-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Drafts & Review</span>
            <FileText className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin text-cyan-400" /> : draftPosts}</p>
          <p className="text-[11px] text-cyan-400/80 mt-1">Ready for approval</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 glass-card-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Scheduled</span>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin text-yellow-400" /> : scheduledPosts}</p>
          <p className="text-[11px] text-yellow-400/80 mt-1">Queued on calendar</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 glass-card-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Published Live</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-400" /> : publishedPosts}</p>
          <p className="text-[11px] text-emerald-400/80 mt-1">Live on Instagram</p>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10 glass-card-hover">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Failed</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <p className="text-3xl font-black text-white">{loading ? <Loader2 className="w-6 h-6 animate-spin text-red-400" /> : failedPosts}</p>
          <p className="text-[11px] text-gray-500 mt-1">Requires retry</p>
        </div>
      </div>

      {/* Main Grid: Connected Instagram Account + Recent Content Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Connected Instagram Account Status & Recent Posts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Connected Instagram Account Card */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 bg-gradient-to-br from-black/40 via-background to-purple-900/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Instagram className="w-5 h-5 text-pink-500" />
                  Connected Instagram Account
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Meta Graph API OAuth 2.0 authorization status.
                </p>
              </div>
              <Link
                href="/settings"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                Settings & OAuth
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Verifying Meta connection...</p>
              </div>
            ) : activeIgAccount && activeIgAccount.is_connected ? (
              <div className="p-5 rounded-2xl bg-black/50 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  {activeIgAccount.profile_picture_url ? (
                    <img
                      src={activeIgAccount.profile_picture_url}
                      alt={activeIgAccount.username}
                      className="w-14 h-14 rounded-2xl object-cover ring-2 ring-pink-500/40 p-0.5"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 p-0.5 flex items-center justify-center">
                      <Instagram className="w-7 h-7 text-white" />
                    </div>
                  )}

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">{activeIgAccount.username}</h3>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        ● Live Connected
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Page: <span className="text-gray-200 font-semibold">{activeIgAccount.facebook_page_name || "Facebook Page"}</span> • Meta Professional Account
                    </p>
                  </div>
                </div>

                <Link
                  href="/settings"
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-gray-300 hover:text-white border border-white/10 transition-colors text-center shrink-0"
                >
                  Manage OAuth
                </Link>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-black/40 border border-dashed border-white/10 text-center">
                <Instagram className="w-12 h-12 text-pink-500/40 mx-auto mb-3" />
                <h3 className="text-sm font-semibold text-gray-300">No Instagram Account Connected</h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mt-1 mb-4">
                  Connect your official Meta Instagram Professional Account to enable live automated publishing.
                </p>
                <Link
                  href="/settings"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-bg-btn text-white text-xs font-bold shadow-lg"
                >
                  [ Connect Instagram ]
                </Link>
              </div>
            )}
          </div>

          {/* Recent Posts Stream */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Recent AI Content Pipeline Stream
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Latest generated posts, draft reviews, and live dispatches.
                </p>
              </div>

              <Link
                href="/posts"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
              >
                View All Posts
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-purple-400 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Loading recent posts...</p>
              </div>
            ) : recentPosts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-500">
                No recent posts yet. Click <Link href="/create" className="text-purple-400 font-semibold underline">Create AI Post</Link> to generate your first post!
              </div>
            ) : (
              <div className="space-y-3">
                {recentPosts.map((p) => {
                  const content = p.generated_content;
                  return (
                    <Link
                      key={p.id}
                      href={`/posts/${p.id}`}
                      className="p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-purple-500/30 transition-all block flex items-center justify-between gap-4 group"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                              p.status === "PUBLISHED"
                                ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                : p.status === "SCHEDULED"
                                ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                                : p.status === "APPROVED"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            }`}
                          >
                            {p.status.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono">v{p.current_version}</span>
                        </div>

                        <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                          {content?.headline || p.brief_prompt}
                        </h4>

                        <p className="text-[11px] text-gray-400 truncate">
                          "{content?.hook || p.brief_prompt}"
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] text-gray-500 hidden sm:inline">
                          {new Date(p.created_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-purple-500/20 transition-all">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Brand Profiles & Quick Actions Panel */}
        <div className="space-y-6">
          {/* Brand Profiles Summary */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                Active Brand Profiles ({brands.length})
              </h2>
              <Link
                href="/brands"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
              >
                Manage
              </Link>
            </div>

            {loading ? (
              <div className="p-4 text-center text-xs text-gray-400">Loading brands...</div>
            ) : brands.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No brand profiles created yet. <Link href="/brands" className="text-purple-400 underline font-semibold">Create one</Link>.
              </div>
            ) : (
              <div className="space-y-3">
                {brands.map((b) => (
                  <Link
                    key={b.id}
                    href={`/brands/${b.id}`}
                    className="p-3.5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs shrink-0"
                        style={{ backgroundColor: b.secondary_color || "#ec4899" }}
                      >
                        {b.name.charAt(0)}
                      </div>
                      <div className="overflow-hidden">
                        <span className="font-bold text-white block group-hover:text-purple-300 transition-colors truncate">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-gray-400 truncate block">
                          {b.industry || "Brand Profile"}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-500 group-hover:text-white shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Launch Panel */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              Quick Workflow Launch
            </h2>

            <div className="space-y-2.5 text-xs">
              <Link
                href="/create"
                className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 transition-all flex items-center justify-between font-semibold group"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Generate New AI Post</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/calendar"
                className="p-3.5 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 hover:bg-yellow-500/20 transition-all flex items-center justify-between font-semibold group"
              >
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-yellow-400" />
                  <span>Content Schedule Queue</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-yellow-400 group-hover:translate-x-1 transition-transform" />
              </Link>

              <Link
                href="/settings"
                className="p-3.5 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-300 hover:bg-pink-500/20 transition-all flex items-center justify-between font-semibold group"
              >
                <div className="flex items-center gap-2.5">
                  <Instagram className="w-4 h-4 text-pink-400" />
                  <span>Meta OAuth & Account Setup</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-pink-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
