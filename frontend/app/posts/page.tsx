"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../dashboard/layout";
import { apiRequest } from "@/lib/api";
import { PostResponse } from "@/types";
import {
  FileImage,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function PostsHistoryPage() {
  const [posts, setPosts] = useState<PostResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<PostResponse[]>("/api/v1/posts");
      setPosts(data);
    } catch (err: any) {
      console.error("Failed to load posts:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <FileImage className="w-3.5 h-3.5" />
              Content Generation History
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Post History</h1>
            <p className="text-sm text-gray-400 mt-1">
              Review drafts, AI generated posts, version history, and publication status.
            </p>
          </div>

          <Link
            href="/create"
            className="px-5 py-3 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            Create AI Post
          </Link>
        </div>

        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-xs text-gray-400">Loading post history...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 border border-white/10 text-center">
            <Sparkles className="w-12 h-12 text-purple-400/40 mx-auto mb-3" />
            <h2 className="text-sm font-bold text-gray-200">No Generated Posts Found</h2>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto mb-6">
              Create your first post prompt brief. The AI agent pipeline will generate copy, hashtags, and graphic concepts.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-bg-btn text-white text-xs font-semibold"
            >
              <PlusCircle className="w-4 h-4" />
              Create First AI Post
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="glass-card rounded-2xl p-5 border border-white/10 glass-card-hover block flex flex-col md:flex-row md:items-center justify-between gap-4 group"
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                      post.status === "APPROVED"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : post.status === "PUBLISHED"
                        ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                        : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                    }`}>
                      {post.status.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">v{post.current_version}</span>
                  </div>

                  <h3 className="text-base font-extrabold text-white group-hover:text-purple-300 transition-colors truncate">
                    {post.generated_content?.headline || post.brief_prompt}
                  </h3>

                  <p className="text-xs text-gray-400 truncate max-w-2xl">
                    Hook: "{post.generated_content?.hook || "N/A"}" — {post.brief_prompt}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                  <span className="text-[11px] text-gray-500">
                    {new Date(post.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-purple-500/20 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
