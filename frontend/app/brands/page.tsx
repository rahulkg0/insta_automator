"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import DashboardLayout from "../dashboard/layout";
import { apiRequest } from "@/lib/api";
import { Brand } from "@/types";
import {
  Building2,
  Plus,
  Sparkles,
  ArrowRight,
  Palette,
  Layers,
  FileText,
  Loader2,
  X,
  AlertCircle,
} from "lucide-react";

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Brand Form State
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [brandTone, setBrandTone] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#9333ea");
  const [secondaryColor, setSecondaryColor] = useState("#ec4899");
  const [accentColor, setAccentColor] = useState("#06b6d4");

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    setLoading(true);
    try {
      const data = await apiRequest<Brand[]>("/api/v1/brands");
      setBrands(data);
    } catch (err: any) {
      console.error("Failed to fetch brands:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const newBrand = await apiRequest<Brand>("/api/v1/brands", {
        method: "POST",
        body: JSON.stringify({
          name,
          industry,
          target_audience: targetAudience,
          brand_tone: brandTone,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
          accent_color: accentColor,
        }),
      });
      setBrands([newBrand, ...brands]);
      setShowModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message || "Failed to create brand profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName("");
    setIndustry("");
    setTargetAudience("");
    setBrandTone("");
    setPrimaryColor("#9333ea");
    setSecondaryColor("#ec4899");
    setAccentColor("#06b6d4");
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Building2 className="w-3.5 h-3.5" />
              Multi-Brand Architecture
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Brand Profiles</h1>
            <p className="text-sm text-gray-400 mt-1">
              Create and manage isolated brand guidelines, color systems, and visual assets.
            </p>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="px-5 py-3 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Brand Profile
          </button>
        </div>

        {/* Brands Grid */}
        {loading ? (
          <div className="p-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
            <p className="text-xs text-gray-400">Loading brand profiles...</p>
          </div>
        ) : brands.length === 0 ? (
          <div className="glass-card rounded-3xl p-12 border border-white/10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-white mb-1">No Brand Profiles Yet</h2>
            <p className="text-xs text-gray-400 max-w-md mx-auto mb-6">
              Create your first brand profile or upload brand guideline PDFs to let AI automatically configure colors, typography, and rules.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl gradient-bg-btn text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create Your First Brand
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {brands.map((brand) => (
              <Link
                key={brand.id}
                href={`/brands/${brand.id}`}
                className="glass-card rounded-3xl p-6 border border-white/10 glass-card-hover block relative group overflow-hidden"
              >
                {/* Brand Color Bar */}
                <div className="flex items-center gap-1.5 mb-5">
                  <div
                    className="h-3 rounded-full flex-1"
                    style={{ backgroundColor: brand.primary_color }}
                    title={`Primary: ${brand.primary_color}`}
                  />
                  <div
                    className="h-3 rounded-full w-12"
                    style={{ backgroundColor: brand.secondary_color }}
                    title={`Secondary: ${brand.secondary_color}`}
                  />
                  <div
                    className="h-3 rounded-full w-8"
                    style={{ backgroundColor: brand.accent_color }}
                    title={`Accent: ${brand.accent_color}`}
                  />
                </div>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-white group-hover:text-purple-300 transition-colors">
                      {brand.name}
                    </h3>
                    <p className="text-xs text-purple-400 font-semibold">{brand.industry || "General Industry"}</p>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:bg-purple-500/20 group-hover:border-purple-500/30 transition-all">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="space-y-2 mt-4 pt-4 border-t border-white/5 text-xs text-gray-400">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Brand Tone</span>
                    <span className="text-gray-300 font-semibold truncate max-w-[160px]">
                      {brand.brand_tone || "Not defined"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Typography</span>
                    <span className="text-gray-300 font-semibold">
                      {brand.heading_font} / {brand.body_font}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Create Brand Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-card rounded-3xl p-8 border border-white/10 max-w-xl w-full max-h-[90vh] overflow-y-auto custom-scrollbar relative shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-extrabold text-white">Create Brand Profile</h2>
                  <p className="text-xs text-gray-400">Define brand identity and visual style rules.</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreateBrand} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Aitronix Robotics"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                      Industry
                    </label>
                    <input
                      type="text"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Robotics & EdTech"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                      Brand Tone
                    </label>
                    <input
                      type="text"
                      value={brandTone}
                      onChange={(e) => setBrandTone(e.target.value)}
                      placeholder="e.g. Professional & Innovative"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                    Target Audience
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Students in grades 6-9, parents, and schools"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Color Palette Selectors */}
                <div className="border-t border-white/10 pt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-3 flex items-center gap-2">
                    <Palette className="w-4 h-4 text-purple-400" />
                    Visual Palette (HEX Colors)
                  </label>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="block text-[11px] text-gray-400 mb-1">Primary Color</span>
                      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2">
                        <input
                          type="color"
                          value={primaryColor}
                          onChange={(e) => setPrimaryColor(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-mono text-gray-200 uppercase">{primaryColor}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] text-gray-400 mb-1">Secondary</span>
                      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2">
                        <input
                          type="color"
                          value={secondaryColor}
                          onChange={(e) => setSecondaryColor(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-mono text-gray-200 uppercase">{secondaryColor}</span>
                      </div>
                    </div>

                    <div>
                      <span className="block text-[11px] text-gray-400 mb-1">Accent</span>
                      <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl p-2">
                        <input
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-7 h-7 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-xs font-mono text-gray-200 uppercase">{accentColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 text-xs font-semibold hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2.5 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Save Brand Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
