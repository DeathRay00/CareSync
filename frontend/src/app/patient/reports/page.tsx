"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Report {
  id: string;
  original_filename: string;
  ai_analysis_summary: string;
  file_url: string;
  created_at: string;
}

export default function PatientReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get("/api/reports/")
      .then((res) => setReports(res.data))
      .catch(() => toast.error("Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/api/reports/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setReports((prev) => [res.data, ...prev]);
      toast.success("Report uploaded and analyzed by AI!");
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
          <h1 className="text-2xl font-bold text-slate-800">Medical Reports</h1>
          <p className="text-slate-500 text-sm mt-1">AI-powered analysis of your lab reports & scans</p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleUpload}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload Report
          </button>
        </div>
      </div>

      {uploading && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
          <p className="text-emerald-700 text-sm font-medium">
            Gemini AI is analyzing your report… This may take a moment.
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        </div>
      ) : reports.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No reports uploaded yet</p>
          <p className="text-slate-400 text-sm mt-1">Upload a PDF or image of your lab report</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="bg-white rounded-2xl border border-slate-100 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-xl">
                    <FileText className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{report.original_filename}</p>
                    <p className="text-xs text-slate-400">{formatDate(report.created_at)}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(expanded === report.id ? null : report.id)}
                  className="text-xs text-emerald-600 font-medium hover:underline shrink-0"
                >
                  {expanded === report.id ? "Hide Analysis" : "View AI Analysis"}
                </button>
              </div>

              {expanded === report.id && report.ai_analysis_summary && (
                <div className="mt-4 bg-gradient-to-br from-emerald-50 to-sky-50 rounded-xl p-4 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                      Gemini AI Analysis
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {report.ai_analysis_summary}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
