"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "../dashboard/layout";
import { apiRequest } from "@/lib/api";
import { Brand } from "@/types";
import {
  Sparkles,
  Building2,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
  Wand2,
  CheckCircle2,
} from "lucide-react";

export default function CreatePostPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);

  // Form Fields
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [briefPrompt, setBriefPrompt] = useState<string>("");
  const [contentType, setContentType] = useState<string>("product_promotion");
  const [postObjective, setPostObjective] = useState<string>("Generate enquiries");
  const [targetAudience, setTargetAudience] = useState<string>("");
  const [productInfo, setProductInfo] = useState<string>("");
  const [cta, setCta] = useState<string>("DM us for details");

  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoadingBrands(true);
    try {
      const data = await apiRequest<Brand[]>("/api/v1/brands");
      setBrands(data);
      if (data.length > 0) {
        const storedId = typeof window !== "undefined" ? localStorage.getItem("active_brand_id") : null;
        const matched = data.find((b) => b.id === storedId);
        setSelectedBrandId(matched ? matched.id : data[0].id);
      }
    } catch (err: any) {
      console.error("Failed to load brands:", err);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedBrandId) {
      setError("Please create and select a Brand profile first.");
      return;
    }
    if (!briefPrompt.trim()) {
      setError("Please enter what you want to post in the brief field.");
      return;
    }

    setGenerating(true);
    try {
      const resPost = await apiRequest<any>("/api/v1/posts/generate", {
        method: "POST",
        body: JSON.stringify({
          brand_id: selectedBrandId,
          brief_prompt: briefPrompt,
          content_type: contentType,
          post_objective: postObjective,
          target_audience: targetAudience || undefined,
          product_info: productInfo || undefined,
          cta: cta || undefined,
        }),
      });

      // Redirect to post review page
      router.push(`/posts/${resPost.id}`);
    } catch (err: any) {
      setError(err.message || "AI Content generation failed. Please try again.");
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            AI Content Generation Agent
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Create AI Instagram Post</h1>
          <p className="text-sm text-gray-400 mt-1">
            Describe your post brief. Our AI pipeline uses your brand guidelines to craft high-converting copy and design concepts.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleGenerate} className="glass-card rounded-3xl p-8 border border-white/10 space-y-8">
          {/* STEP 1: Select Brand Profile */}
          <div className="space-y-3">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Step 1: Select Brand Profile *
            </label>
            {loadingBrands ? (
              <div className="p-3 text-xs text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                Loading brand profiles...
              </div>
            ) : brands.length === 0 ? (
              <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs flex items-center justify-between">
                <span>No brands found. You need at least one brand profile to generate AI content.</span>
                <button
                  type="button"
                  onClick={() => router.push("/brands")}
                  className="px-3 py-1.5 rounded-xl bg-yellow-500/20 text-yellow-200 font-bold hover:bg-yellow-500/30"
                >
                  Create Brand
                </button>
              </div>
            ) : (
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.industry || "General"})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* STEP 2: Choose Post Format */}
          <div className="space-y-4 border-t border-white/10 pt-6">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Step 2: Choose Post Format & Template *
              </label>
              <span className="text-[11px] text-gray-400 font-medium">Select a format to optimize AI output</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  id: "carousel",
                  name: "Multi-Slide Carousel",
                  badge: "5-Slide Carousel",
                  desc: "Swipeable 5-slide breakdown with cover hook & step-by-step insights.",
                  color: "from-purple-500 to-pink-500",
                },
                {
                  id: "product_promotion",
                  name: "Product Promo Launch",
                  badge: "High Converting",
                  desc: "Highlight key features, special offers, pricing & strong call-to-action.",
                  color: "from-emerald-500 to-teal-500",
                },
                {
                  id: "single_image",
                  name: "Single Graphic Image",
                  badge: "Classic Post",
                  desc: "High-impact visual graphic card with bold hook title overlay.",
                  color: "from-cyan-500 to-blue-500",
                },
                {
                  id: "reels_script",
                  name: "Reels Audio Script",
                  badge: "Short-Form Reel",
                  desc: "Scene directions, spoken hooks, and audio recommendations for Reels.",
                  color: "from-amber-500 to-orange-500",
                },
                {
                  id: "educational_tip",
                  name: "Educational Infographic",
                  badge: "High Engagement",
                  desc: "Value-first educational tips, industry hacks & actionable guides.",
                  color: "from-indigo-500 to-purple-500",
                },
              ].map((fmt) => {
                const isSelected = contentType === fmt.id;
                return (
                  <div
                    key={fmt.id}
                    onClick={() => setContentType(fmt.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? "bg-purple-600/15 border-purple-500 ring-2 ring-purple-500/50 shadow-lg"
                        : "bg-black/40 border-white/10 hover:border-white/20 hover:bg-white/5"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r ${fmt.color} text-white`}>
                          {fmt.badge}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400" />}
                      </div>
                      <h4 className="font-extrabold text-white text-sm mb-1">{fmt.name}</h4>
                      <p className="text-xs text-gray-400 leading-relaxed">{fmt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Describe Post Brief */}
          <div className="space-y-3 border-t border-white/10 pt-6">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-400 flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Step 3: What do you want to post? *
            </label>
            <textarea
              required
              rows={4}
              value={briefPrompt}
              onChange={(e) => setBriefPrompt(e.target.value)}
              placeholder={
                contentType === "carousel"
                  ? 'e.g., "5 mistakes robotics startups make in 2026 and how to avoid them."'
                  : contentType === "reels_script"
                  ? 'e.g., "Behind the scenes 15-second reel showing how our AI kit is built."'
                  : 'e.g., "Create a promotional post for our Innovator Robotics Kit. Target students in grades 6-9 to generate workshop enquiries."'
              }
              className="w-full bg-black/50 border border-white/10 rounded-2xl p-4 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-all"
            />
          </div>

          {/* Additional Customizations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-white/10 pt-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Post Objective
              </label>
              <input
                type="text"
                value={postObjective}
                onChange={(e) => setPostObjective(e.target.value)}
                placeholder="e.g. Generate workshop enquiries"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Target Audience (Optional)
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Students in grades 6-9, parents"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Call To Action (CTA)
              </label>
              <input
                type="text"
                value={cta}
                onChange={(e) => setCta(e.target.value)}
                placeholder="e.g. DM us for details"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={generating || brands.length === 0}
              className="px-8 py-4 rounded-xl gradient-bg-btn text-white text-sm font-extrabold flex items-center gap-3 cursor-pointer disabled:opacity-50 shadow-xl"
            >
              {generating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Orchestrating AI Agents...
                </>
              ) : (
                <>
                  Generate AI Content & Visual Concept
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
