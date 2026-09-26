"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "../../dashboard/layout";
import { apiRequest, instagramApi } from "@/lib/api";
import { PostResponse, Brand, InstagramAccount } from "@/types";
import {
  Sparkles,
  RefreshCw,
  Edit3,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Hash,
  Layers,
  Save,
  Clock,
  Send,
  Eye,
  Building2,
  Calendar,
  X,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
} from "lucide-react";
import { InstagramIcon } from "@/components/ui/icons";

interface PostVersionItem {
  id: string;
  version_number: number;
  generated_content: any;
  created_at: string;
}

export default function PostPreviewPage() {
  const params = useParams();
  const postId = params.id as string;
  const router = useRouter();

  const [post, setPost] = useState<PostResponse | null>(null);
  const [brand, setBrand] = useState<Brand | null>(null);
  const [instagramAccount, setInstagramAccount] = useState<InstagramAccount | null>(null);
  const [versions, setVersions] = useState<PostVersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [previewMode, setPreviewMode] = useState<"ai_image" | "card">("ai_image");

  // Editing mode
  const [isEditing, setIsEditing] = useState(false);
  const [editHook, setEditHook] = useState("");
  const [editHeadline, setEditHeadline] = useState("");
  const [editBody, setEditBody] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (postId) {
      fetchPostDetails();
    }
  }, [postId]);

  const fetchPostDetails = async () => {
    setLoading(true);
    try {
      const pData = await apiRequest<PostResponse>(`/api/v1/posts/${postId}`);
      
      // Fetch brand info
      let bData: Brand | null = null;
      try {
        bData = await apiRequest<Brand>(`/api/v1/brands/${pData.brand_id}`);
        setBrand(bData);
      } catch (bErr) {
        console.error("Failed to load brand:", bErr);
      }

      // Synthesize fallback AI image URL if post has no rendered_image_url yet
      const finalImgUrl = pData.rendered_image_url || (
        `https://image.pollinations.ai/prompt/${encodeURIComponent(
          `1080x1350 professional Instagram post graphic for ${bData?.name || "brand"}. Topic: ${pData.generated_content?.headline || pData.brief_prompt}`
        )}?width=1080&height=1350&nologo=true&seed=888`
      );

      const postWithImg = { ...pData, rendered_image_url: finalImgUrl };
      setPost(postWithImg);
      populateEditState(postWithImg);

      // Fetch connected Instagram account for this brand
      try {
        const igData = await instagramApi.getAccount(pData.brand_id);
        setInstagramAccount(igData);
      } catch (igErr) {
        setInstagramAccount(null);
      }

      // Fetch versions
      const vData = await apiRequest<PostVersionItem[]>(`/api/v1/posts/${postId}/versions`);
      setVersions(vData);
    } catch (err: any) {
      console.error("Failed to load post details:", err);
      setMessage({ text: err.message || "Failed to load post.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const populateEditState = (pData: PostResponse) => {
    if (pData.generated_content) {
      setEditHook(pData.generated_content.hook || "");
      setEditHeadline(pData.generated_content.headline || "");
      setEditBody(pData.generated_content.body || "");
      setEditCaption(pData.generated_content.caption || "");
    }
    setEditImageUrl(pData.rendered_image_url || "");
  };

  const handleRegenerate = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const updatedPost = await apiRequest<PostResponse>(`/api/v1/posts/${postId}/regenerate`, {
        method: "POST",
      });
      setPost(updatedPost);
      populateEditState(updatedPost);

      // Refresh versions
      const vData = await apiRequest<PostVersionItem[]>(`/api/v1/posts/${postId}/versions`);
      setVersions(vData);
      setMessage({ text: `Generated Version ${updatedPost.current_version}!`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Regeneration failed.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRegenerateImage = async () => {
    if (!post || !brand) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const promptText = encodeURIComponent(
        `1080x1350 professional Instagram post graphic visual for ${brand.name}. Topic: ${post.generated_content?.headline || post.brief_prompt}. Design: ${post.generated_content?.visual_concept || 'Modern UI design'}`
      );
      const randomSeed = Math.floor(Math.random() * 900000) + 100000;
      const newImageUrl = `https://image.pollinations.ai/prompt/${promptText}?width=1080&height=1350&nologo=true&model=flux&seed=${randomSeed}`;

      const updatedPost = await apiRequest<PostResponse>(`/api/v1/posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify({
          rendered_image_url: newImageUrl,
        }),
      });
      setPost(updatedPost);
      setEditImageUrl(newImageUrl);
      setPreviewMode("ai_image");
      setMessage({ text: "✨ Fresh AI Graphic Image generated & saved!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to generate image.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage(null);
    try {
      const updatedPost = await apiRequest<PostResponse>(`/api/v1/posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify({
          hook: editHook,
          headline: editHeadline,
          body: editBody,
          caption: editCaption,
          rendered_image_url: editImageUrl || undefined,
        }),
      });
      setPost(updatedPost);
      setIsEditing(false);
      setMessage({ text: "Post edits saved successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to save edits.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("09:00");

  useEffect(() => {
    if (scheduleDate && scheduleTime) {
      setScheduledDateTime(`${scheduleDate}T${scheduleTime}`);
    }
  }, [scheduleDate, scheduleTime]);

  const openScheduleModal = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    const tz = d.getTimezoneOffset() * 60000;
    const isoLocal = new Date(d.getTime() - tz).toISOString();
    
    if (!scheduleDate) {
      setScheduleDate(isoLocal.slice(0, 10));
    }
    if (!scheduleTime) {
      setScheduleTime("09:00");
    }
    setScheduledDateTime(`${scheduleDate || isoLocal.slice(0, 10)}T${scheduleTime || "09:00"}`);
    setShowScheduleModal(true);
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const updatedPost = await apiRequest<PostResponse>(`/api/v1/posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify({ status: "APPROVED" }),
      });
      setPost(updatedPost);
      setMessage({ text: "Post Approved! Select 'Post Now' to publish immediately or 'Schedule Post' to pick a date.", type: "success" });
      openScheduleModal();
    } catch (err: any) {
      setMessage({ text: err.message || "Approval failed.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishNow = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const updatedPost = await apiRequest<PostResponse>(`/api/v1/posts/${postId}/publish`, {
        method: "POST",
      });
      setPost(updatedPost);
      setShowScheduleModal(false);
      setMessage({ text: "🚀 Post published live to Instagram!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Publishing failed.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledDateTime) {
      setMessage({ text: "Please select a valid date & time for scheduling.", type: "error" });
      return;
    }
    setActionLoading(true);
    setMessage(null);
    try {
      const updatedPost = await apiRequest<PostResponse>(`/api/v1/posts/${postId}`, {
        method: "PUT",
        body: JSON.stringify({
          status: "SCHEDULED",
          scheduled_at: new Date(scheduledDateTime).toISOString(),
        }),
      });
      setPost(updatedPost);
      setShowScheduleModal(false);
      setMessage({ text: `📅 Post scheduled for ${new Date(scheduledDateTime).toLocaleString()}! Added to Content Calendar.`, type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Scheduling failed.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-xs text-gray-400">Loading AI generated post preview...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!post || !post.generated_content) {
    return (
      <DashboardLayout>
        <div className="p-16 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Post content unavailable</p>
          <button
            onClick={() => router.push("/create")}
            className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-300"
          >
            Create New Post
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const content = post.generated_content;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Navigation & Header */}
        <div>
          <button
            onClick={() => router.push("/posts")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Posts
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Post Preview & Review</h1>
                <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full border ${
                  post.status === "APPROVED"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : post.status === "PUBLISHED"
                    ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                    : "bg-purple-500/10 border-purple-500/20 text-purple-400"
                }`}>
                  {post.status.replace("_", " ")}
                </span>
              </div>
              <p className="text-xs text-gray-400">Brief: "{post.brief_prompt}"</p>
            </div>

            {/* Version Picker */}
            {versions.length > 1 && (
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-xl text-xs">
                <Layers className="w-4 h-4 text-purple-400 ml-2" />
                <span className="text-gray-400 font-medium">Version:</span>
                {versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setPost({
                        ...post,
                        generated_content: v.generated_content,
                        current_version: v.version_number,
                      });
                      populateEditState({ ...post, generated_content: v.generated_content });
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      post.current_version === v.version_number
                        ? "bg-purple-600 text-white shadow"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    v{v.version_number}
                  </button>
                ))}
              </div>
            )}
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

        {/* Main Grid: Visual Graphic Preview & Copy Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Visual Card Preview (1080x1350 Instagram aspect ratio) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewMode("card")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    previewMode === "card"
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  📱 HTML Card
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode("ai_image")}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    previewMode === "ai_image"
                      ? "bg-purple-600 text-white shadow"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  AI Image
                </button>
              </div>

              <button
                type="button"
                onClick={handleRegenerateImage}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-purple-300 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Generate AI Image
              </button>
            </div>

            {previewMode === "ai_image" ? (
              <div className="relative rounded-3xl overflow-hidden border border-white/20 shadow-2xl group aspect-[4/5] bg-black/60 flex items-center justify-center">
                {post.rendered_image_url ? (
                  <img
                    src={post.rendered_image_url}
                    alt={content.headline || "AI Generated Instagram Graphic"}
                    className="w-full h-full object-cover transition-all duration-300"
                  />
                ) : (
                  <div className="p-8 text-center space-y-3">
                    <Sparkles className="w-10 h-10 text-purple-400 mx-auto animate-pulse" />
                    <p className="text-xs text-gray-300 font-semibold">No AI graphic image generated yet.</p>
                    <button
                      type="button"
                      onClick={handleRegenerateImage}
                      disabled={actionLoading}
                      className="px-4 py-2 rounded-xl gradient-bg-btn text-white text-xs font-bold shadow-lg"
                    >
                      Generate AI Image Now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative group">
                <div
                  className="w-full aspect-[4/5] rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden border border-white/20 shadow-2xl transition-all"
                  style={{
                    backgroundColor: brand?.primary_color || "#0f051d",
                    backgroundImage: `radial-gradient(circle at top right, ${brand?.secondary_color || "#ec4899"}33, transparent 60%)`,
                  }}
                >
                  {/* Brand Top Header */}
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                        style={{ backgroundColor: brand?.secondary_color || "#ec4899" }}
                      >
                        {brand?.name.charAt(0) || "A"}
                      </div>
                      <span className="text-xs font-bold text-white tracking-wide">{brand?.name}</span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white border border-white/20">
                      {content.template_type}
                    </span>
                  </div>

                  {/* Graphic Body Content - Carousel Slide vs Single Post */}
                  {content.carousel_slides && content.carousel_slides.length > 0 ? (
                    <div className="my-auto space-y-4 relative z-10 py-6">
                      <div className="inline-block px-3 py-1 rounded-lg bg-purple-500/20 backdrop-blur-md border border-purple-500/30 text-purple-200 font-black text-xs uppercase tracking-widest">
                        Slide {activeSlideIndex + 1} • {activeSlideIndex === 0 ? "Hook Cover" : activeSlideIndex === content.carousel_slides.length - 1 ? "CTA Slide" : "Insight"}
                      </div>
                      <h3 className="text-2xl font-black text-white leading-tight drop-shadow-md">
                        {content.carousel_slides[activeSlideIndex]?.title || content.headline}
                      </h3>
                      <p className="text-xs text-gray-200 leading-relaxed max-w-sm drop-shadow">
                        {content.carousel_slides[activeSlideIndex]?.body || content.body}
                      </p>
                    </div>
                  ) : (
                    <div className="my-auto space-y-4 relative z-10 py-6">
                      <div className="inline-block px-3 py-1 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-cyan-300 font-black text-xs uppercase tracking-widest">
                        {content.hook}
                      </div>
                      <h3 className="text-2xl font-black text-white leading-tight drop-shadow-md">
                        {content.headline}
                      </h3>
                      <p className="text-xs text-gray-200 leading-relaxed max-w-sm drop-shadow">
                        {content.body}
                      </p>
                    </div>
                  )}

                  {/* CTA Button Bottom */}
                  <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/30">
                      👉 {content.cta}
                    </span>
                    <span className="text-[10px] text-gray-300 font-mono font-semibold">
                      {instagramAccount?.username || (brand?.name ? `@${brand.name.toLowerCase().replace(/\s+/g, "")}` : "@mybrand")}
                    </span>
                  </div>
                </div>

                {/* Prev / Next Slide Controls overlay if Carousel */}
                {content.carousel_slides && content.carousel_slides.length > 1 && (
                  <>
                    <button
                      type="button"
                      disabled={activeSlideIndex === 0}
                      onClick={() => setActiveSlideIndex((prev) => Math.max(0, prev - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/80 transition-all shadow-xl z-20"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      disabled={activeSlideIndex === content.carousel_slides.length - 1}
                      onClick={() => setActiveSlideIndex((prev) => Math.min(content.carousel_slides!.length - 1, prev + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center disabled:opacity-30 hover:bg-black/80 transition-all shadow-xl z-20"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Dot Indicators */}
                    <div className="flex items-center justify-center gap-1.5 mt-3">
                      {content.carousel_slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlideIndex(idx)}
                          className={`h-2 rounded-full transition-all ${
                            activeSlideIndex === idx ? "w-6 bg-purple-500" : "w-2 bg-white/20 hover:bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Visual Concept Info */}
            <div className="glass-card rounded-2xl p-4 border border-white/10 text-xs text-gray-400">
              <span className="font-bold text-gray-200 block mb-1">AI Visual Concept Strategy:</span>
              <p>{content.visual_concept}</p>
            </div>
          </div>

          {/* Right Column: Copy, Caption, Hashtags, and Action Buttons */}
          <div className="lg:col-span-7 space-y-6">
            <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-6">
              {/* Connected Instagram Account Status */}
              <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {instagramAccount?.profile_picture_url ? (
                    <img
                      src={instagramAccount.profile_picture_url}
                      alt={instagramAccount.username}
                      className="w-9 h-9 rounded-xl border border-pink-500/40 object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 p-0.5 flex items-center justify-center shrink-0">
                      <InstagramIcon className="w-5 h-5 text-white" />
                    </div>
                  )}
                  <div>
                    <span className="font-bold text-white block">
                      {instagramAccount?.name || "Connected Instagram"}
                    </span>
                    <span className="text-[11px] text-purple-300 font-semibold">
                      {instagramAccount?.username || (brand?.name ? `@${brand.name.toLowerCase().replace(/\s+/g, "")}` : "@mybrand")}
                    </span>
                    {instagramAccount?.facebook_page_name && (
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        Page: {instagramAccount.facebook_page_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full border ${
                  instagramAccount?.is_connected
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {instagramAccount?.is_connected ? "● Connected" : "Not Connected"}
                </span>
              </div>

              {/* Edit Mode vs Preview Mode */}
              {isEditing ? (
                <form onSubmit={handleSaveEdits} className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-purple-400">Edit Post Copy</h3>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Scroll Hook</label>
                    <input
                      type="text"
                      value={editHook}
                      onChange={(e) => setEditHook(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Headline</label>
                    <input
                      type="text"
                      value={editHeadline}
                      onChange={(e) => setEditHeadline(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Body Text</label>
                    <textarea
                      rows={2}
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Full Caption</label>
                    <textarea
                      rows={5}
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">Rendered Image URL (For Live Instagram Publishing)</label>
                    <input
                      type="url"
                      value={editImageUrl}
                      onChange={(e) => setEditImageUrl(e.target.value)}
                      placeholder="https://image.pollinations.ai/prompt/..."
                      className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Copy Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Caption Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 border-b border-white/10 pb-2">
                      Caption
                    </h3>
                    <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                      {content.caption}
                    </div>
                  </div>

                  {/* Hashtags Section */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 border-b border-white/10 pb-2 flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5 text-purple-400" />
                      Hashtags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {content.hashtags?.map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons Section matching Prompt Spec */}
              <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRegenerate}
                    disabled={actionLoading}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-purple-400" />}
                    [ Regenerate ]
                  </button>

                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <Edit3 className="w-4 h-4 text-pink-400" />
                    [ Edit ]
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {post.status === "READY_FOR_REVIEW" && (
                    <button
                      onClick={handleApprove}
                      disabled={actionLoading}
                      className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      [ Approve ]
                    </button>
                  )}

                  {(post.status === "APPROVED" || post.status === "SCHEDULED" || post.status === "PUBLISHED") && (
                    <span className="text-[10px] font-bold uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {post.status === "PUBLISHED" ? "Published" : post.status === "SCHEDULED" ? "Scheduled" : "Approved"}
                    </span>
                  )}

                  <button
                    onClick={handlePublishNow}
                    disabled={actionLoading || post.status === "PUBLISHED"}
                    className={`px-5 py-2.5 rounded-xl text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
                      post.status === "PUBLISHED"
                        ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 cursor-default"
                        : "bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400"
                    }`}
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {post.status === "PUBLISHED" ? "Published Live" : "[ 🚀 Post Now ]"}
                  </button>

                  <button
                    onClick={openScheduleModal}
                    disabled={actionLoading}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-extrabold flex items-center gap-2 transition-all shadow-lg cursor-pointer"
                  >
                    <Calendar className="w-4 h-4" />
                    [ 📅 Schedule Post ]
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SCHEDULE POST MODAL */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <div className="glass-panel w-full max-w-md p-6 rounded-3xl border border-white/20 bg-gray-950/95 space-y-6 relative shadow-2xl my-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white text-base">Schedule Instagram Post</h3>
                    <p className="text-xs text-gray-400">Select Date & Time for Automated Publishing</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="p-2 text-gray-400 hover:text-white rounded-xl hover:bg-white/10 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScheduleSubmit} className="space-y-5">
                {/* Side-by-Side Date & Time Selector */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-purple-400 mb-1.5">
                        Select Date *
                      </label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        onClick={(e) => {
                          try {
                            (e.target as any).showPicker();
                          } catch {}
                        }}
                        required
                        style={{ colorScheme: "dark" }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/70 border border-white/20 text-white text-xs font-bold focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-purple-400">
                          Select Time *
                        </label>
                        <span className="text-[10px] text-gray-400 font-medium">Presets / Custom</span>
                      </div>
                      <div className="space-y-2">
                        <select
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/70 border border-white/20 text-white text-xs font-bold focus:outline-none focus:border-purple-500 transition-all cursor-pointer"
                        >
                          <option value="09:00">09:00 AM (Morning Best)</option>
                          <option value="10:00">10:00 AM</option>
                          <option value="11:00">11:00 AM</option>
                          <option value="12:00">12:00 PM (Noon)</option>
                          <option value="14:00">02:00 PM (Afternoon)</option>
                          <option value="16:00">04:00 PM</option>
                          <option value="17:00">05:00 PM (Peak Reach)</option>
                          <option value="18:00">06:00 PM</option>
                          <option value="19:00">07:00 PM (Evening Best)</option>
                          <option value="20:00">08:00 PM</option>
                          <option value="21:00">09:00 PM (Night Peak)</option>
                          <option value="22:00">10:00 PM</option>
                          <option value="23:00">11:00 PM</option>
                        </select>

                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          onClick={(e) => {
                            try {
                              (e.target as any).showPicker();
                            } catch {}
                          }}
                          style={{ colorScheme: "dark" }}
                          className="w-full px-3.5 py-2 rounded-xl bg-black/90 border border-purple-500/40 text-purple-200 text-xs font-mono font-bold focus:outline-none focus:border-purple-400 transition-all cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Time Presets */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase">Presets:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setHours(d.getHours() + 1);
                        const tz = d.getTimezoneOffset() * 60000;
                        const iso = new Date(d.getTime() - tz).toISOString();
                        setScheduleDate(iso.slice(0, 10));
                        setScheduleTime(iso.slice(11, 16));
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold hover:bg-purple-500/25 transition-all"
                    >
                      +1 Hour
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 1);
                        const tz = d.getTimezoneOffset() * 60000;
                        const iso = new Date(d.getTime() - tz).toISOString();
                        setScheduleDate(iso.slice(0, 10));
                        setScheduleTime("09:00");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold hover:bg-purple-500/25 transition-all"
                    >
                      Tomorrow 9 AM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + 2);
                        const tz = d.getTimezoneOffset() * 60000;
                        const iso = new Date(d.getTime() - tz).toISOString();
                        setScheduleDate(iso.slice(0, 10));
                        setScheduleTime("18:00");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-bold hover:bg-purple-500/25 transition-all"
                    >
                      In 2 Days
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Scheduled posts automatically appear on your Content Calendar and publish to Instagram.</span>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handlePublishNow}
                    disabled={actionLoading}
                    className="px-4 py-2.5 text-xs font-extrabold rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Post Now Instead
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowScheduleModal(false)}
                      className="px-4 py-2.5 text-xs font-semibold rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="px-5 py-2.5 text-xs font-extrabold rounded-xl gradient-bg-btn text-white flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                      {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
                      Confirm Schedule
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
