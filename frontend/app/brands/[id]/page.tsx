"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "../../dashboard/layout";
import { apiRequest } from "@/lib/api";
import { Brand } from "@/types";
import {
  Building2,
  FileText,
  Upload,
  Palette,
  Type,
  ShieldAlert,
  Hash,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { InstagramConnectCard } from "@/components/brands/InstagramConnectCard";


interface BrandAssetResponse {
  id: string;
  brand_id: string;
  user_id: string;
  asset_type: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  meta_info?: any;
  created_at: string;
}

export default function BrandDetailPage() {
  const params = useParams();
  const brandId = params.id as string;
  const router = useRouter();

  const [brand, setBrand] = useState<Brand | null>(null);
  const [assets, setAssets] = useState<BrandAssetResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "guidelines" | "assets">("profile");

  // Editable Brand Form
  const [formData, setFormData] = useState<Partial<Brand>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Guideline PDF Upload State
  const [guidelineFile, setGuidelineFile] = useState<File | null>(null);
  const [extracting, setExtracting] = useState(false);

  // Asset Upload State
  const [assetFile, setAssetFile] = useState<File | null>(null);
  const [assetType, setAssetType] = useState<string>("logo_primary");
  const [uploadingAsset, setUploadingAsset] = useState(false);

  useEffect(() => {
    if (brandId) {
      fetchBrandData();
    }
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const err = urlParams.get("error");
      const igStatus = urlParams.get("instagram");
      if (err) {
        setMessage({ text: decodeURIComponent(err), type: "error" });
      } else if (igStatus === "connected") {
        setMessage({ text: "Instagram account connected successfully!", type: "success" });
      }
    }
  }, [brandId]);


  const fetchBrandData = async () => {
    setLoading(true);
    try {
      const bData = await apiRequest<Brand>(`/api/v1/brands/${brandId}`);
      setBrand(bData);
      setFormData(bData);
      const aData = await apiRequest<BrandAssetResponse[]>(`/api/v1/brands/${brandId}/assets`);
      setAssets(aData);
    } catch (err: any) {
      console.error("Failed to load brand details:", err);
      setMessage({ text: err.message || "Brand not found.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const updated = await apiRequest<Brand>(`/api/v1/brands/${brandId}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
      setBrand(updated);
      setFormData(updated);
      setMessage({ text: "Brand profile updated successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update brand profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleExtractGuidelines = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guidelineFile) return;
    setExtracting(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", guidelineFile);

      const updatedBrand = await apiRequest<Brand>(`/api/v1/brands/${brandId}/extract-guidelines`, {
        method: "POST",
        body,
      });
      setBrand(updatedBrand);
      setFormData(updatedBrand);
      setMessage({
        text: "AI successfully extracted brand rules & visual guidelines from document!",
        type: "success",
      });
      setGuidelineFile(null);
      // Refresh assets to include guideline PDF
      const aData = await apiRequest<BrandAssetResponse[]>(`/api/v1/brands/${brandId}/assets`);
      setAssets(aData);
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to extract guidelines from file.", type: "error" });
    } finally {
      setExtracting(false);
    }
  };

  const handleUploadAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetFile) return;
    setUploadingAsset(true);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", assetFile);
      body.append("asset_type", assetType);

      const newAsset = await apiRequest<BrandAssetResponse>(`/api/v1/brands/${brandId}/assets`, {
        method: "POST",
        body,
      });
      setAssets([newAsset, ...assets]);
      setAssetFile(null);
      setMessage({ text: "Brand asset uploaded successfully!", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to upload asset.", type: "error" });
    } finally {
      setUploadingAsset(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this brand asset?")) return;
    try {
      await apiRequest(`/api/v1/assets/${assetId}`, { method: "DELETE" });
      setAssets(assets.filter((a) => a.id !== assetId));
    } catch (err: any) {
      alert("Failed to delete asset: " + err.message);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-xs text-gray-400">Loading brand profile details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!brand) {
    return (
      <DashboardLayout>
        <div className="p-16 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-white">Brand not found</p>
          <button
            onClick={() => router.push("/brands")}
            className="mt-4 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-gray-300"
          >
            Back to Brands
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-6xl mx-auto">
        {/* Navigation & Header */}
        <div>
          <button
            onClick={() => router.push("/brands")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-purple-400 hover:text-purple-300 mb-3 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Brand Profiles
          </button>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-lg"
                style={{ backgroundColor: brand.primary_color }}
              >
                {brand.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-3xl font-extrabold text-white tracking-tight">{brand.name}</h1>
                <p className="text-xs text-gray-400 mt-0.5">{brand.industry || "General Industry Profile"}</p>
              </div>
            </div>

            {/* Color Swatch Badges */}
            <div className="flex items-center gap-3 px-4 py-2 rounded-2xl glass-card border border-white/10">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: brand.primary_color }} />
                <span className="text-[11px] font-mono text-gray-300">{brand.primary_color}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: brand.secondary_color }} />
                <span className="text-[11px] font-mono text-gray-300">{brand.secondary_color}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: brand.accent_color }} />
                <span className="text-[11px] font-mono text-gray-300">{brand.accent_color}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Instagram Professional Account Connection */}
        <InstagramConnectCard brandId={brandId} brandName={brand.name} />

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

        {/* Interactive Tabs */}
        <div className="flex border-b border-white/10 gap-2">
          <button
            onClick={() => setActiveTab("profile")}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "profile"
                ? "border-purple-500 text-purple-400 bg-purple-500/10"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Brand Rules & Identity
          </button>
          <button
            onClick={() => setActiveTab("guidelines")}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
              activeTab === "guidelines"
                ? "border-purple-500 text-purple-400 bg-purple-500/10"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI Guidelines PDF Parser
          </button>
          <button
            onClick={() => setActiveTab("assets")}
            className={`px-5 py-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
              activeTab === "assets"
                ? "border-purple-500 text-purple-400 bg-purple-500/10"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            Asset Gallery ({assets.length})
          </button>
        </div>

        {/* Tab 1: Profile & Rules Form */}
        {activeTab === "profile" && (
          <form onSubmit={handleSaveProfile} className="glass-card rounded-3xl p-8 border border-white/10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Industry
                </label>
                <input
                  type="text"
                  value={formData.industry || ""}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Target Audience
                </label>
                <textarea
                  rows={3}
                  value={formData.target_audience || ""}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Brand Tone & Voice
                </label>
                <textarea
                  rows={3}
                  value={formData.brand_tone || ""}
                  onChange={(e) => setFormData({ ...formData, brand_tone: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Visual Style
                </label>
                <textarea
                  rows={3}
                  value={formData.visual_style || ""}
                  onChange={(e) => setFormData({ ...formData, visual_style: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Typography & Fonts */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <Type className="w-4 h-4 text-purple-400" />
                Typography System
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Heading Font
                  </label>
                  <input
                    type="text"
                    value={formData.heading_font || "Inter-Bold"}
                    onChange={(e) => setFormData({ ...formData, heading_font: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Body Font
                  </label>
                  <input
                    type="text"
                    value={formData.body_font || "Inter"}
                    onChange={(e) => setFormData({ ...formData, body_font: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Rules & Guidelines */}
            <div className="border-t border-white/10 pt-6">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-purple-400" />
                Content & Logo Constraints
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Content Do's & Don'ts
                  </label>
                  <textarea
                    rows={4}
                    value={formData.content_rules || ""}
                    onChange={(e) => setFormData({ ...formData, content_rules: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Logo Placement Rules
                  </label>
                  <textarea
                    rows={4}
                    value={formData.logo_rules || ""}
                    onChange={(e) => setFormData({ ...formData, logo_rules: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Hashtag Strategy & Rules
                  </label>
                  <textarea
                    rows={4}
                    value={formData.hashtag_rules || ""}
                    onChange={(e) => setFormData({ ...formData, hashtag_rules: e.target.value })}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-lg"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Brand Guidelines
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: AI Brand Guideline Extractor */}
        {activeTab === "guidelines" && (
          <div className="glass-card rounded-3xl p-8 border border-white/10 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-400" />
                Upload Brand Guideline PDF
              </h2>
              <p className="text-xs text-gray-400 mt-1 max-w-xl">
                Upload your brand guideline document (PDF). AI will extract visual colors, typography rules, logo spacing constraints, tone, and content rules into structured format.
              </p>
            </div>

            <form onSubmit={handleExtractGuidelines} className="space-y-6">
              <div className="p-8 rounded-2xl bg-black/40 border border-dashed border-white/20 text-center hover:border-purple-500/50 transition-colors">
                <Upload className="w-10 h-10 text-purple-400/60 mx-auto mb-3" />
                <p className="text-xs font-semibold text-gray-200 mb-2">
                  Select brand guideline document (PDF/TXT)
                </p>
                <input
                  type="file"
                  accept=".pdf,.txt,.doc,.docx"
                  onChange={(e) => setGuidelineFile(e.target.files?.[0] || null)}
                  className="block mx-auto text-xs text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600/20 file:text-purple-300 hover:file:bg-purple-600/30 cursor-pointer"
                />
              </div>

              {guidelineFile && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between">
                  <span>Selected file: <strong>{guidelineFile.name}</strong> ({(guidelineFile.size / 1024).toFixed(1)} KB)</span>
                  <button
                    type="submit"
                    disabled={extracting}
                    className="px-5 py-2.5 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Extract Guidelines with AI
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* Tab 3: Asset Gallery */}
        {activeTab === "assets" && (
          <div className="space-y-6">
            {/* Upload New Asset Form */}
            <form onSubmit={handleUploadAsset} className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Upload className="w-4 h-4 text-purple-400" />
                Upload New Asset (Logo, Products, Fonts)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Asset Category</label>
                  <select
                    value={assetType}
                    onChange={(e) => setAssetType(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="logo_primary">Primary Logo</option>
                    <option value="logo_secondary">Secondary Logo</option>
                    <option value="product_image">Product Image / Photo</option>
                    <option value="guideline_pdf">Brand Guideline PDF</option>
                    <option value="font">Custom Font File</option>
                    <option value="background">Background Image</option>
                    <option value="other">Other Asset</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Choose File</label>
                  <div className="flex gap-3">
                    <input
                      type="file"
                      required
                      onChange={(e) => setAssetFile(e.target.files?.[0] || null)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600/20 file:text-purple-300"
                    />
                    <button
                      type="submit"
                      disabled={uploadingAsset || !assetFile}
                      className="px-5 py-2.5 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {uploadingAsset ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload File
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Assets Grid */}
            {assets.length === 0 ? (
              <div className="glass-card rounded-3xl p-12 border border-white/10 text-center">
                <ImageIcon className="w-10 h-10 text-purple-400/40 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-gray-300">No Assets Uploaded Yet</h3>
                <p className="text-xs text-gray-500 mt-1">Upload primary logos, product photos, and background graphic assets.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {assets.map((asset) => (
                  <div key={asset.id} className="glass-card rounded-2xl p-3 border border-white/10 relative group">
                    <div className="aspect-square rounded-xl bg-black/50 border border-white/5 flex items-center justify-center overflow-hidden mb-2 relative">
                      {asset.mime_type.startsWith("image/") ? (
                        <img src={asset.file_url} alt={asset.filename} className="w-full h-full object-contain p-2" />
                      ) : (
                        <FileText className="w-8 h-8 text-purple-400" />
                      )}

                      {/* Delete button hover overlay */}
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-600/80 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        title="Delete asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block truncate">
                        {asset.asset_type.replace("_", " ")}
                      </span>
                      <p className="text-xs font-semibold text-gray-200 truncate" title={asset.filename}>
                        {asset.filename}
                      </p>
                      <a
                        href={asset.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-gray-500 hover:text-gray-300 flex items-center gap-1"
                      >
                        View File <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
