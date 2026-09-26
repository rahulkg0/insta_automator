"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { apiRequest, instagramApi } from "@/lib/api";
import { Brand, InstagramAccount } from "@/types";
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  FileImage,
  Calendar,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  User as UserIcon,
  Loader2,
  ChevronDown,
  Check,
  Plus,
} from "lucide-react";
import { InstagramIcon as Instagram } from "@/components/ui/icons";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Brands", href: "/brands", icon: Building2 },
  { name: "Create Post", href: "/create", icon: PlusCircle },
  { name: "Posts History", href: "/posts", icon: FileImage },
  { name: "Content Calendar", href: "/calendar", icon: Calendar },
  { name: "Settings", href: "/settings", icon: SettingsIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [igAccount, setIgAccount] = useState<InstagramAccount | null>(null);
  const [isBrandMenuOpen, setIsBrandMenuOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login");
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      fetchBrandsAndIgStatus();
    }
  }, [user, pathname]);

  const fetchBrandsAndIgStatus = async () => {
    try {
      const brandList = await apiRequest<Brand[]>("/api/v1/brands");
      setBrands(brandList);
      if (brandList.length > 0) {
        const storedId = typeof window !== "undefined" ? localStorage.getItem("active_brand_id") : null;
        const matched = brandList.find((b) => b.id === storedId);
        const activeBrand = matched || brandList[0];
        setSelectedBrand(activeBrand);
        if (typeof window !== "undefined") {
          localStorage.setItem("active_brand_id", activeBrand.id);
        }
        try {
          const acc = await instagramApi.getAccount(activeBrand.id);
          setIgAccount(acc);
        } catch {
          setIgAccount(null);
        }
      } else {
        setSelectedBrand(null);
        setIgAccount(null);
      }
    } catch (err) {
      console.error("Failed to load brands in layout:", err);
    }
  };

  const handleSelectBrand = async (brand: Brand) => {
    setSelectedBrand(brand);
    setIsBrandMenuOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_brand_id", brand.id);
    }
    try {
      const acc = await instagramApi.getAccount(brand.id);
      setIgAccount(acc);
    } catch {
      setIgAccount(null);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090a0f]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-3" />
          <p className="text-xs text-gray-400 font-medium">Authenticating session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#090a0f] text-gray-100">
      <aside className="w-64 bg-[#0d0e16] border-r border-white/10 flex flex-col justify-between p-4 shrink-0">
        <div>
          <div className="flex items-center gap-3 px-3 py-3 mb-6 border-b border-white/10 pb-5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-pink-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white tracking-wide leading-tight">
                Instagram AI
              </h2>
              <p className="text-[10px] uppercase font-semibold tracking-wider text-purple-400">
                Automator SaaS
              </p>
            </div>
          </div>

          {/* Interactive Brand Switcher Dropdown */}
          <div className="relative mb-6">
            <button
              type="button"
              onClick={() => setIsBrandMenuOpen(!isBrandMenuOpen)}
              className={`w-full px-3 py-2.5 rounded-xl border flex items-center justify-between transition-all ${
                isBrandMenuOpen
                  ? "bg-white/10 border-purple-500/60 shadow-lg shadow-purple-500/10"
                  : "bg-white/5 border-white/10 hover:border-purple-500/40 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <span className="text-xs font-semibold text-gray-200 truncate">
                  {selectedBrand ? selectedBrand.name : "Select Brand"}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${
                  isBrandMenuOpen ? "rotate-180 text-purple-400" : ""
                }`}
              />
            </button>

            {isBrandMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsBrandMenuOpen(false)}
                />
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#131422]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-2 space-y-1">
                  <div className="px-2 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Your Brands
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1 custom-scrollbar">
                    {brands.length === 0 ? (
                      <div className="px-3 py-2 text-xs text-gray-400 font-medium">
                        No brands found
                      </div>
                    ) : (
                      brands.map((brand) => {
                        const isSelected = selectedBrand?.id === brand.id;
                        return (
                          <button
                            key={brand.id}
                            type="button"
                            onClick={() => handleSelectBrand(brand)}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all ${
                              isSelected
                                ? "bg-gradient-to-r from-purple-600/30 to-pink-600/20 text-white border border-purple-500/30 font-semibold"
                                : "text-gray-300 hover:bg-white/5 hover:text-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              <div
                                className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                                  isSelected
                                    ? "bg-purple-500/30 border-purple-400 text-purple-300"
                                    : "bg-white/5 border-white/10 text-gray-400"
                                }`}
                              >
                                <Building2 className="w-3.5 h-3.5" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="text-xs font-medium truncate">{brand.name}</p>
                                {brand.industry && (
                                  <p className="text-[10px] text-gray-400 truncate">
                                    {brand.industry}
                                  </p>
                                )}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="border-t border-white/10 pt-1">
                    <Link
                      href="/brands"
                      onClick={() => setIsBrandMenuOpen(false)}
                      className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-colors w-full"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create New Brand</span>
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-purple-600/30 to-pink-600/20 text-white border border-purple-500/30 shadow-lg shadow-purple-500/10"
                      : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-purple-400" : "text-gray-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-white/10 pt-4 space-y-3">
          <Link
            href={selectedBrand ? `/brands/${selectedBrand.id}` : "/settings"}
            className="px-3 py-2 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-all flex items-center justify-between text-xs group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              {igAccount?.profile_picture_url ? (
                <img
                  src={igAccount.profile_picture_url}
                  alt={igAccount.username}
                  className="w-4 h-4 rounded-full object-cover shrink-0"
                />
              ) : (
                <Instagram className="w-4 h-4 text-pink-500 shrink-0" />
              )}
              <span className="text-[11px] font-semibold text-gray-300 truncate">
                {igAccount?.is_connected ? igAccount.username : "Instagram"}
              </span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                igAccount?.is_connected
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-gray-500/10 text-gray-400 border-gray-500/20"
              }`}
            >
              {igAccount?.is_connected ? "● Connected" : "Not Connected"}
            </span>
          </Link>

          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium text-white truncate">{user.full_name}</p>
                <p className="text-[10px] text-gray-400 truncate">{user.email}</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
        {children}
      </main>
    </div>
  );
}
