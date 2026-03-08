"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Sidebar } from "@/components/Sidebar";
import { Loader2 } from "lucide-react";

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const { user, token, fetchMe } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (token && !user) {
      fetchMe();
    } else if (!token) {
      router.push("/auth/login");
    } else if (user && user.role !== "patient") {
      router.push("/doctor/dashboard");
    }
  }, [token, user, fetchMe, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar role="patient" />
      <main className="flex-1 pt-14 lg:pt-0 overflow-auto">
        <div className="max-w-6xl mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
