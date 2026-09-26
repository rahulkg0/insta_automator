"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090a0f]">
      <div className="text-center">
        <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-4" />
        <p className="text-sm text-gray-400 font-medium">Loading Instagram AI Automator...</p>
      </div>
    </div>
  );
}
