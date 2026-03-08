"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Heart, LayoutDashboard, Calendar, FileText,
  Upload, MessageCircle, LogOut, Menu, X
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const patientNav = [
  { href: "/patient/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patient/appointments", label: "Appointments", icon: Calendar },
  { href: "/patient/prescriptions", label: "Prescriptions", icon: FileText },
  { href: "/patient/reports", label: "Medical Reports", icon: Upload },
  { href: "/patient/chat", label: "AI Assistant", icon: MessageCircle },
];

const doctorNav = [
  { href: "/doctor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/doctor/appointments", label: "Appointments", icon: Calendar },
  { href: "/doctor/patients", label: "Patients", icon: Heart },
  { href: "/doctor/prescriptions", label: "Write Prescription", icon: FileText },
];

interface SidebarProps {
  role: "patient" | "doctor";
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = role === "patient" ? patientNav : doctorNav;
  const accentColor = role === "patient" ? "sky" : "indigo";

  const handleLogout = () => {
    logout();
    toast.success("Signed out successfully");
    router.push("/auth/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-6 py-5 border-b border-slate-100">
        <div className={`p-2 bg-${accentColor}-500 rounded-xl`}>
          <Heart className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold text-slate-800">MedAssistant</span>
      </div>

      {/* User info */}
      <div className="px-6 py-4 border-b border-slate-100">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-${accentColor}-50 text-${accentColor}-700`}>
          <div className={`w-1.5 h-1.5 rounded-full bg-${accentColor}-500`} />
          {role === "patient" ? "Patient" : "Doctor"}
        </div>
        <p className="mt-1.5 font-semibold text-slate-800 text-sm truncate">{user?.name}</p>
        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? `bg-${accentColor}-50 text-${accentColor}-700`
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-white border-r border-slate-100 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white border-b border-slate-100 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 bg-${accentColor}-500 rounded-lg`}>
            <Heart className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-slate-800">MedAssistant</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-slate-100">
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-30 flex">
          <div className="w-64 bg-white border-r border-slate-100 flex flex-col pt-14">
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
        </div>
      )}
    </>
  );
}
