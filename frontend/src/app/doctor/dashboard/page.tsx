"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Clock, Users, FileText } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";

interface Appointment {
  id: string;
  patient: { name: string };
  datetime: string;
  status: string;
  notes?: string;
}

export default function DoctorDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/appointments/")
      .then((res) => setAppointments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const today = new Date().toDateString();
  const todayAppts = appointments.filter(
    (a) => new Date(a.datetime).toDateString() === today
  );
  const pendingCount = appointments.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">
          Good day, Dr. {user?.name?.split(" ").slice(-1)[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1 text-sm">Here&apos;s your schedule overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Today's Appointments" value={todayAppts.length} icon={Calendar} color="text-indigo-500 bg-indigo-50" />
        <StatCard label="Pending Requests" value={pendingCount} icon={Clock} color="text-amber-500 bg-amber-50" />
        <StatCard label="Total Appointments" value={appointments.length} icon={FileText} color="text-sky-500 bg-sky-50" />
        <StatCard label="Patients" value="—" icon={Users} color="text-emerald-500 bg-emerald-50" />
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-slate-700 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { href: "/doctor/appointments", label: "Manage Appointments", icon: Calendar, color: "bg-indigo-500" },
            { href: "/doctor/patients", label: "View Patients", icon: Users, color: "bg-sky-500" },
            { href: "/doctor/prescriptions", label: "Write Prescription", icon: FileText, color: "bg-emerald-500" },
          ].map(({ href, label, icon: Icon, color }) => (
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

      {/* Today's Schedule */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-700">Today&apos;s Schedule</h2>
          <Link href="/doctor/appointments" className="text-sm text-indigo-500 hover:underline">View all</Link>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400">Loading…</div>
        ) : todayAppts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500">No appointments today</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {todayAppts.map((appt) => (
              <div key={appt.id} className="flex items-center gap-4 p-4">
                <div className="p-2.5 bg-indigo-50 rounded-xl">
                  <Clock className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{appt.patient?.name}</p>
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
