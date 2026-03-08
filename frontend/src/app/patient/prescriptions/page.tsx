"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Loader2, Pill, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Prescription {
  id: string;
  medication_details: {
    medicines?: Array<{ name: string; dosage: string; frequency: string; duration: string }>;
    instructions?: string;
    raw_text?: string;
  };
  is_uploaded_image: boolean;
  image_url?: string;
  created_at: string;
  doctor_id?: string;
}

export default function PatientPrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/prescriptions/")
      .then((res) => setPrescriptions(res.data))
      .catch(() => toast.error("Failed to load prescriptions"))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/prescriptions/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setPrescriptions((prev) => [res.data, ...prev]);
      toast.success("Prescription uploaded and extracted by AI!");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      toast.error(error?.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Prescriptions</h1>
          <p className="text-slate-500 text-sm mt-1">Your medicine history and AI-extracted prescriptions</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-sky-500 hover:bg-sky-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Handwritten Rx
          </button>
        </div>
      </div>

      {uploading && (
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-sky-500 animate-spin" />
          <p className="text-sky-700 text-sm font-medium">Gemini AI is extracting your prescription…</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No prescriptions yet</p>
          <p className="text-slate-400 text-sm mt-1">Upload a handwritten prescription image to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <FileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">
                      {rx.is_uploaded_image ? "Uploaded Prescription (AI Extracted)" : "Doctor's Prescription"}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(rx.created_at)}</p>
                  </div>
                </div>
                {rx.is_uploaded_image && (
                  <span className="text-xs bg-violet-50 text-violet-600 font-medium px-2.5 py-1 rounded-full">
                    AI Processed
                  </span>
                )}
              </div>

              {/* Medicines list */}
              {rx.medication_details?.medicines && rx.medication_details.medicines.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Medicines</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rx.medication_details.medicines.map((med, i) => (
                      <div key={i} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl">
                        <Pill className="w-4 h-4 text-sky-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{med.name}</p>
                          <p className="text-xs text-slate-500">
                            {med.dosage} · {med.frequency}
                            {med.duration ? ` · ${med.duration}` : ""}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {rx.medication_details?.instructions && (
                <div className="mt-3 flex items-start gap-2 text-sm text-slate-600 bg-emerald-50 rounded-xl p-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{rx.medication_details.instructions}</span>
                </div>
              )}

              {rx.medication_details?.raw_text && !rx.medication_details?.medicines?.length && (
                <pre className="mt-3 text-xs text-slate-600 bg-slate-50 rounded-xl p-3 whitespace-pre-wrap">
                  {rx.medication_details.raw_text}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
