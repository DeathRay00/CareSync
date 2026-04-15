"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, FileText, Upload, MessageCircle, Clock } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";

interface Appointment {
  id: string;
  doctor: { name: string };
  datetime: string;
  status: string;
}

const quickActions = [
  { href: "/patient/appointments", label: "Book Appointment", icon: Calendar, color: "bg-sky-500" },
  { href: "/patient/prescriptions", label: "My Prescriptions", icon: FileText, color: "bg-indigo-500" },
  { href: "/patient/reports", label: "Upload Report", icon: Upload, color: "bg-emerald-500" },
  { href: "/patient/chat", label: "AI Assistant", icon: MessageCircle, color: "bg-violet-500" },
];

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [prescriptionsCount, setPrescriptionsCount] = useState<number | string>("—");
  const [reportsCount, setReportsCount] = useState<number | string>("—");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/appointments/"),
      api.get("/api/prescriptions/"),
      api.get("/api/reports/")
    ])
      .then(([apptsRes, rxRes, reportsRes]) => {
        setAppointments(apptsRes.data.slice(0, 5));
        setPrescriptionsCount(rxRes.data.length);
        setReportsCount(reportsRes.data.length);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcomingCount = appointments.filter(
    (a) => a.status === "pending" || a.status === "confirmed"
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Good day, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Here&apos;s your health overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Upcoming Appointments" value={upcomingCount} icon={Calendar} color="text-sky-500 bg-sky-50" />
        <StatCard label="Prescriptions" value={prescriptionsCount} icon={FileText} color="text-indigo-500 bg-indigo-50" />
        <StatCard label="Reports Uploaded" value={reportsCount} icon={Upload} color="text-emerald-500 bg-emerald-50" />
        <StatCard label="Last AI Chat" value="New" icon={MessageCircle} color="text-violet-500 bg-violet-50" />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {quickActions.map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-3 p-5 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-shadow text-center group"
            >
              <div className={`${color} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Upcoming Appointments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-700">Upcoming Appointments</h2>
          <Link href="/patient/appointments" className="text-sm text-sky-500 hover:underline">
            View all
          </Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">
            Loading…
          </div>
        ) : appointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No appointments yet</p>
            <Link href="/patient/appointments" className="text-sky-500 hover:underline text-sm mt-2 inline-block">
              Book one now →
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {appointments.map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 p-4">
                <div className="p-2.5 bg-sky-50 rounded-xl">
                  <Clock className="w-4 h-4 text-sky-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">
                    Dr. {appt.doctor?.name}
                  </p>
                  <p className="text-xs text-slate-400">{formatDate(appt.datetime)}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(appt.status)}`}>
                  {appt.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: string | number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}
