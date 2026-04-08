"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/stores/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { token, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (token) {
      router.replace("/workspaces");
      return;
    }
    router.replace("/login");
  }, [token, isLoading, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-sm text-zinc-500">Redirecting...</div>
    </div>
  );
}
