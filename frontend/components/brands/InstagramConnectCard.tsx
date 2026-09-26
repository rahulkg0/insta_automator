"use client";

import { useState, useEffect } from "react";
import { instagramApi } from "@/lib/api";
import { InstagramAccount } from "@/types";
import { InstagramIcon } from "@/components/ui/icons";
import { CheckCircle2, ShieldCheck, Link2, RefreshCw, Unlink, ExternalLink, Sparkles, X } from "lucide-react";

interface InstagramConnectCardProps {
  brandId: string;
  brandName: string;
}

export function InstagramConnectCard({ brandId, brandName }: InstagramConnectCardProps) {
  const [account, setAccount] = useState<InstagramAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showMockModal, setShowMockModal] = useState(false);
  const [customHandle, setCustomHandle] = useState(`@${brandName.toLowerCase().replace(/\s+/g, "")}`);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchAccountStatus = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await instagramApi.getAccount(brandId);
      setAccount(res);
    } catch (err: any) {
      if (err?.status === 404) {
        setAccount(null);
      } else {
        setErrorMsg("Failed to check Instagram connection status");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (brandId) {
      fetchAccountStatus();
    }
  }, [brandId]);

  const handleOAuthConnect = async () => {
    try {
      setActionLoading(true);
      setErrorMsg("");
      const res = await instagramApi.getAuthUrl(brandId);
      if (res.is_mock) {
        setShowMockModal(true);
      } else {
        window.location.href = res.auth_url;
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to initiate Meta OAuth authorization.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleMockConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      setErrorMsg("");
      const connectedAcc = await instagramApi.mockConnect(
        brandId,
        customHandle,
        `${brandName} Facebook Page`
      );
      setAccount(connectedAcc);
      setShowMockModal(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to connect sandbox Instagram account.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Are you sure you want to disconnect ${account?.username} from ${brandName}?`)) {
      return;
    }
    try {
      setActionLoading(true);
      await instagramApi.disconnectAccount(brandId);
      setAccount(null);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to disconnect account.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden bg-gradient-to-br from-purple-900/10 via-background to-pink-900/10">
      {/* Background Glow Effect */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-pink-500/10 to-purple-500/10 blur-2xl rounded-full pointer-events-none" />

      {loading ? (
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/5 animate-pulse flex items-center justify-center">
              <InstagramIcon className="w-6 h-6 text-white/30" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
            </div>
          </div>
          <div className="h-9 w-28 bg-white/10 rounded-xl animate-pulse" />
        </div>
      ) : account && account.is_connected ? (
        /* CONNECTED STATE */
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            <div className="relative">
              {account.profile_picture_url ? (
                <img
                  src={account.profile_picture_url}
                  alt={account.username}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-pink-500/40 p-0.5"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-amber-500 p-0.5 flex items-center justify-center">
                  <InstagramIcon className="w-8 h-8 text-white" />
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-black p-0.5 rounded-full ring-2 ring-background">
                <CheckCircle2 className="w-3.5 h-3.5 fill-emerald-500 text-black" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-lg text-white">{account.username}</h3>
                <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Connected
                </span>
              </div>
              <p className="text-xs text-white/60 mt-1 flex items-center gap-2">
                <span>{account.facebook_page_name || "Facebook Page Connected"}</span>
                <span>•</span>
                <span className="text-pink-400 font-medium">Instagram Professional</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOAuthConnect}
              disabled={actionLoading}
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
              Re-Authorize
            </button>
            <button
              onClick={handleDisconnect}
              disabled={actionLoading}
              className="px-3.5 py-2 text-xs font-medium rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-colors flex items-center gap-2"
            >
              <Unlink className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        /* NOT CONNECTED STATE */
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start md:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-500 to-amber-500 p-0.5 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-background/80 rounded-[14px] flex items-center justify-center">
                <InstagramIcon className="w-6 h-6 text-pink-400" />
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-white text-base flex items-center gap-2">
                Connect Instagram Account
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-normal">
                  Meta Official API
                </span>
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Enable 1-click publishing, automated scheduling, and post previewing directly to Instagram.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleOAuthConnect}
              disabled={actionLoading}
              className="btn-primary text-xs font-semibold py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-pink-500/20"
            >
              <Link2 className="w-4 h-4" />
              {actionLoading ? "Connecting..." : "Connect Instagram"}
            </button>
            <button
              onClick={() => setShowMockModal(true)}
              className="px-3 py-2.5 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 transition-colors flex items-center gap-1.5"
              title="Quick Sandbox Connect for local demo & testing"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Sandbox
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg("")} className="hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MOCK CONNECT SANDBOX MODAL */}
      {showMockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-panel w-full max-w-md p-6 rounded-2xl border border-white/20 bg-background/95 space-y-5 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center">
                  <InstagramIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Connect Instagram Account</h3>
                  <p className="text-xs text-white/60">Meta API & Sandbox Authorization</p>
                </div>
              </div>
              <button
                onClick={() => setShowMockModal(false)}
                className="p-1.5 text-white/60 hover:text-white rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMockConnectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/80 mb-1.5">
                  Instagram Handle / Username
                </label>
                <input
                  type="text"
                  value={customHandle}
                  onChange={(e) => setCustomHandle(e.target.value)}
                  placeholder="@mybrand"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 space-y-1.5">
                <div className="flex items-center gap-1.5 font-semibold text-purple-200">
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  Official Meta Graph API Permissions
                </div>
                <p className="text-white/60 leading-relaxed">
                  Grants access to publish feed posts, read account info, and sync media on behalf of your connected Instagram Professional account.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMockModal(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="btn-primary text-xs font-semibold py-2 px-5 rounded-xl flex items-center gap-2 shadow-lg shadow-pink-500/20"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {actionLoading ? "Authorizing..." : "Authorize & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
