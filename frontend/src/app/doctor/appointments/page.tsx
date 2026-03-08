"use client";

import { useEffect, useState } from "react";
import { Calendar, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";

interface Appointment {
  id: string;
  patient: { name: string; email: string };
  datetime: string;
  status: string;
  notes?: string;
}

export default function DoctorAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/appointments/")
      .then((res) => setAppointments(res.data))
      .catch(() => toast.error("Failed to load appointments"))
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await api.patch(`/api/appointments/${id}`, { status });
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: res.data.status } : a))
      );
      toast.success(`Appointment ${status}`);
    } catch {
      toast.error("Update failed");
    }
  };

  const pending = appointments.filter((a) => a.status === "pending");
  const others = appointments.filter((a) => a.status !== "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
        <p className="text-slate-500 text-sm mt-1">Manage patient booking requests and your schedule</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : (
        <>
          {/* Pending Requests */}
          {pending.length > 0 && (
            <section>
              <h2 className="text-base font-semibold text-amber-700 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Pending Requests ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onConfirm={() => updateStatus(appt.id, "confirmed")}
                    onCancel={() => updateStatus(appt.id, "cancelled")}
                  />
                ))}
              </div>
            </section>
          )}

          {/* All other appointments */}
          <section>
            <h2 className="text-base font-semibold text-slate-700 mb-3">All Appointments</h2>
            {others.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No appointments yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {others.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appt={appt}
                    onConfirm={
                      appt.status === "pending"
                        ? () => updateStatus(appt.id, "confirmed")
                        : undefined
                    }
                    onCancel={
                      appt.status !== "cancelled" && appt.status !== "completed"
                        ? () => updateStatus(appt.id, "cancelled")
                        : undefined
                    }
                    onComplete={
                      appt.status === "confirmed"
                        ? () => updateStatus(appt.id, "completed")
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function AppointmentCard({
  appt,
  onConfirm,
  onCancel,
  onComplete,
}: {
  appt: Appointment;
  onConfirm?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl shrink-0">
            <Calendar className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">{appt.patient?.name}</p>
            <p className="text-xs text-slate-400">{appt.patient?.email}</p>
            <p className="text-sm text-slate-500 mt-1">{formatDate(appt.datetime)}</p>
            {appt.notes && (
              <p className="text-sm text-slate-500 mt-1 bg-slate-50 rounded-lg px-3 py-1.5">
                {appt.notes}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(appt.status)}`}>
            {appt.status}
          </span>
          {onConfirm && (
            <button
              onClick={onConfirm}
              className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Confirm
            </button>
          )}
          {onComplete && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 text-xs text-sky-600 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" /> Complete
            </button>
          )}
          {onCancel && (
            <button
              onClick={onCancel}
              className="flex items-center gap-1 text-xs text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
