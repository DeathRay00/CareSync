"use client";

import { useEffect, useState } from "react";
import { Calendar, Plus, X, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";

interface Doctor {
  id: string;
  name: string;
  email: string;
}

interface Appointment {
  id: string;
  doctor: { name: string; id: string };
  datetime: string;
  status: string;
  notes?: string;
}

export default function PatientAppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ doctor_id: "", datetime: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/api/appointments/"),
      api.get("/api/users/doctors"),
    ]).then(([apptRes, docRes]) => {
      setAppointments(apptRes.data);
      setDoctors(docRes.data);
    }).catch(() => toast.error("Failed to load data"))
      .finally(() => setLoading(false));
  }, []);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post("/api/appointments/", {
        doctor_id: form.doctor_id,
        datetime: new Date(form.datetime).toISOString(),
        notes: form.notes || null,
      });
      setAppointments((prev) => [res.data, ...prev]);
      setShowForm(false);
      setForm({ doctor_id: "", datetime: "", notes: "" });
      toast.success("Appointment booked!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "Booking failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await api.delete(`/api/appointments/${id}`);
      setAppointments((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a))
      );
      toast.success("Appointment cancelled");
    } catch {
      toast.error("Failed to cancel");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Appointments</h1>
          <p className="text-slate-500 text-sm mt-1">Manage your doctor visits</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> Book Appointment
        </button>
      </div>

      {/* Booking Form */}
      {showForm && (
        <div className="bg-white border border-sky-100 rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-slate-800 mb-4">New Appointment</h2>
          <form onSubmit={handleBook} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Doctor</label>
                <select
                  value={form.doctor_id}
                  onChange={(e) => setForm({ ...form, doctor_id: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm text-slate-800"
                >
                  <option value="">Choose a doctor…</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>Dr. {d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.datetime}
                  onChange={(e) => setForm({ ...form, datetime: e.target.value })}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm text-slate-800"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Reason for visit…"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm text-slate-800 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Booking
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-500 hover:text-slate-700 text-sm px-4 py-2.5"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Appointment List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No appointments yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appt) => (
            <div key={appt.id} className="bg-white rounded-2xl border border-slate-100 p-5 flex items-start gap-4">
              <div className="p-2.5 bg-sky-50 rounded-xl shrink-0">
                <Clock className="w-5 h-5 text-sky-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-slate-800">Dr. {appt.doctor?.name}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{formatDate(appt.datetime)}</p>
                    {appt.notes && <p className="text-sm text-slate-500 mt-1">{appt.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(appt.status)}`}>
                      {appt.status}
                    </span>
                    {(appt.status === "pending" || appt.status === "confirmed") && (
                      <button
                        onClick={() => handleCancel(appt.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
