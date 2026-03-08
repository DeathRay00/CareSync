"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Loader2, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface Patient {
  id: string;
  name: string;
}

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default function DoctorPrescriptionsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    patient_id: "",
    instructions: "",
  });
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: "", dosage: "", frequency: "", duration: "" },
  ]);

  useEffect(() => {
    api.get("/api/users/patients")
      .then((res) => setPatients(res.data))
      .catch(() => toast.error("Failed to load patients"))
      .finally(() => setLoading(false));
  }, []);

  const addMedicine = () =>
    setMedicines((prev) => [...prev, { name: "", dosage: "", frequency: "", duration: "" }]);

  const removeMedicine = (i: number) =>
    setMedicines((prev) => prev.filter((_, idx) => idx !== i));

  const updateMedicine = (i: number, field: keyof Medicine, value: string) =>
    setMedicines((prev) =>
      prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m))
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patient_id) return toast.error("Please select a patient");
    if (medicines.some((m) => !m.name)) return toast.error("All medicine names are required");

    setSubmitting(true);
    try {
      await api.post("/api/prescriptions/", {
        patient_id: form.patient_id,
        medication_details: {
          medicines,
          instructions: form.instructions,
        },
      });
      setSuccess(true);
      setForm({ patient_id: "", instructions: "" });
      setMedicines([{ name: "", dosage: "", frequency: "", duration: "" }]);
      toast.success("Prescription sent to patient!");
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "Failed to create prescription");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Write Prescription</h1>
        <p className="text-slate-500 text-sm mt-1">Create a digital prescription for your patient</p>
      </div>

      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
          <p className="text-emerald-700 text-sm font-medium">Prescription sent successfully!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
        {/* Patient */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Patient</label>
          <select
            value={form.patient_id}
            onChange={(e) => setForm({ ...form, patient_id: e.target.value })}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm text-slate-800"
          >
            <option value="">Select patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Medicines */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-slate-700">Medicines</label>
            <button
              type="button"
              onClick={addMedicine}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
            >
              <Plus className="w-3.5 h-3.5" /> Add Medicine
            </button>
          </div>

          <div className="space-y-3">
            {medicines.map((med, i) => (
              <div key={i} className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-start p-3 bg-slate-50 rounded-xl">
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Medicine *</label>
                  <input
                    value={med.name}
                    onChange={(e) => updateMedicine(i, "name", e.target.value)}
                    placeholder="e.g. Amoxicillin"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Dosage</label>
                  <input
                    value={med.dosage}
                    onChange={(e) => updateMedicine(i, "dosage", e.target.value)}
                    placeholder="e.g. 500mg"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Frequency</label>
                  <input
                    value={med.frequency}
                    onChange={(e) => updateMedicine(i, "frequency", e.target.value)}
                    placeholder="e.g. 3x daily"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-xs text-slate-800"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 mb-1 block">Duration</label>
                    <input
                      value={med.duration}
                      onChange={(e) => updateMedicine(i, "duration", e.target.value)}
                      placeholder="e.g. 7 days"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-xs text-slate-800"
                    />
                  </div>
                  {medicines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMedicine(i)}
                      className="mt-5 p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Instructions</label>
          <textarea
            value={form.instructions}
            onChange={(e) => setForm({ ...form, instructions: e.target.value })}
            rows={3}
            placeholder="Take after meals. Avoid alcohol. Rest well…"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm text-slate-800 resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
          Send Prescription
        </button>
      </form>
    </div>
  );
}
