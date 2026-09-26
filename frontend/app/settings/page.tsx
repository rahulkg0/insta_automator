"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "../dashboard/layout";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/api";
import { Brand } from "@/types";
import { User as UserIcon, CheckCircle2, AlertCircle, Save, Loader2, Building2, ArrowRight } from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/ui/icons";
import { InstagramConnectCard } from "@/components/brands/InstagramConnectCard";
import Link from "next/link";

export default function SettingsPage() {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [loadingBrands, setLoadingBrands] = useState(true);

  useEffect(() => {
    fetchUserBrands();
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
  }, []);


  const fetchUserBrands = async () => {
    try {
      setLoadingBrands(true);
      const data = await apiRequest<Brand[]>("/api/v1/brands");
      setBrands(data);
      if (data.length > 0) {
        setSelectedBrandId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to load brands in settings:", err);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await updateProfile({ full_name: fullName });
      setMessage({ text: "Profile updated successfully.", type: "success" });
    } catch (err: any) {
      setMessage({ text: err.message || "Failed to update profile.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const selectedBrand = brands.find((b) => b.id === selectedBrandId);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-white">Account Settings & Integrations</h1>
          <p className="text-xs text-gray-400">Manage your user profile and connected Meta Instagram accounts.</p>
        </div>

        {/* User Profile Form */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="flex items-center gap-3 border-b border-white/10 pb-4">
            <UserIcon className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">User Profile</h2>
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              message.type === "success" 
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {message.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full bg-black/60 border border-white/5 rounded-xl px-4 py-2.5 text-gray-400 text-sm cursor-not-allowed"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl gradient-bg-btn text-white text-xs font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Profile Changes
            </button>
          </form>
        </div>

        {/* Social Accounts & Meta Instagram Integration */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <Instagram className="w-5 h-5 text-pink-500" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Social Accounts</h2>
            </div>
            {brands.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Manage Brand:</span>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-pink-500"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loadingBrands ? (
            <div className="p-6 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-purple-500 mx-auto mb-2" />
              <p className="text-xs text-gray-400">Loading connected accounts...</p>
            </div>
          ) : brands.length === 0 ? (
            <div className="p-8 rounded-2xl bg-black/40 border border-white/10 text-center space-y-3">
              <Building2 className="w-8 h-8 text-purple-400 mx-auto" />
              <h3 className="text-sm font-bold text-white">No Brand Profile Found</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Please create a brand profile first to link your Instagram Professional account.
              </p>
              <Link
                href="/brands"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl gradient-bg-btn text-white text-xs font-semibold"
              >
                Create Brand Profile <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            selectedBrand && (
              <InstagramConnectCard brandId={selectedBrand.id} brandName={selectedBrand.name} />
            )
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
