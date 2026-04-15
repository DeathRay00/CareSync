"use client";

import { useEffect, useState } from "react";
import { Users, Loader2, Mail, ChevronRight, X, Calendar, FileText, Activity, Clock, Download } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate, getStatusColor } from "@/lib/utils";

interface Patient {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface PatientDetails {
  appointments: any[];
  reports: any[];
  prescriptions: any[];
}

export default function DoctorPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [details, setDetails] = useState<PatientDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    api.get("/api/users/patients")
      .then((res) => setPatients(res.data))
      .catch(() => toast.error("Failed to load patients"))
      .finally(() => setLoading(false));
  }, []);

  const openPatientDetails = async (patient: Patient) => {
    setSelectedPatient(patient);
    setLoadingDetails(true);
    setDetails(null);
    try {
      const [appts, rx, docs] = await Promise.all([
        api.get(`/api/appointments/?patient_id=${patient.id}`),
        api.get(`/api/prescriptions/?patient_id=${patient.id}`),
        api.get(`/api/reports/?patient_id=${patient.id}`)
      ]);
      setDetails({
        appointments: appts.data,
        prescriptions: rx.data,
        reports: docs.data
      });
    } catch {
      toast.error("Failed to load patient details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const filtered = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Patient Directory</h1>
          <p className="text-slate-500 text-sm mt-1">{patients.length} registered patients</p>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search patients…"
          className="px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-sm text-slate-800 placeholder-slate-400 w-64"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No patients found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
          {filtered.map((patient) => (
            <div
              key={patient.id}
              onClick={() => openPatientDetails(patient)}
              className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {patient.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800">{patient.name}</p>
                <div className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                  <Mail className="w-3 h-3" />
                  {patient.email}
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Patient Details Modal */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex items-center justify-between z-10 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-slate-800">{selectedPatient.name}</h2>
                <div className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                  <Mail className="w-4 h-4" />
                  {selectedPatient.email}
                </div>
              </div>
              <button
                onClick={() => setSelectedPatient(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {loadingDetails ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                  <p className="text-slate-500">Loading patient history...</p>
                </div>
              ) : details ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Appointments */}
                    <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-sky-100 text-sky-600 rounded-xl">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-slate-800">Appointments</h3>
                    </div>
                    <p className="text-3xl font-bold text-sky-600">{details.appointments?.length || 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Total visits</p>
                  </div>

                  {/* Prescriptions */}
                  <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                        <FileText className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-slate-800">Prescriptions</h3>
                    </div>
                    <p className="text-3xl font-bold text-indigo-600">{details.prescriptions?.length || 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Records issued</p>
                  </div>

                  {/* Medical Reports Card */}
                  <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl">
                        <Activity className="w-5 h-5" />
                      </div>
                      <h3 className="font-semibold text-slate-800">Medical Reports</h3>
                    </div>
                    <p className="text-3xl font-bold text-emerald-600">{details.reports?.length || 0}</p>
                    <p className="text-sm text-slate-500 mt-1">Documents uploaded</p>
                  </div>
                </div>

                {/* Content Details Below Stats */}
                <div className="mt-8 space-y-8">
                  {/* Appointments List */}
                  <section>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-500" /> Recent Appointments
                    </h3>
                    {details.appointments?.length === 0 ? (
                      <p className="text-slate-500 text-sm">No appointment history found.</p>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                        {details.appointments?.map((appt: any) => (
                          <div key={appt.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Clock className="w-5 h-5 text-slate-400" />
                              <div>
                                <p className="text-sm font-medium text-slate-800">{formatDate(appt.datetime)}</p>
                                <p className="text-xs text-slate-500 mt-0.5">Dr. {appt.doctor?.name}</p>
                              </div>
                            </div>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getStatusColor(appt.status)}`}>
                              {appt.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Prescriptions List */}
                  <section>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <FileText className="w-5 h-5 text-indigo-500" /> Prescriptions
                    </h3>
                    {details.prescriptions?.length === 0 ? (
                      <p className="text-slate-500 text-sm">No prescriptions found.</p>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                        {details.prescriptions?.map((rx: any) => (
                          <div key={rx.id} className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <p className="text-sm font-medium text-slate-800">{formatDate(rx.created_at)}</p>
                            </div>
                            <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
                              {rx.raw_text?.substring(0, 150) || "No text details... "}
                              {rx.raw_text?.length > 150 && "..."}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  {/* Uploaded Reports List */}
                  <section>
                    <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-indigo-500" /> Medical Reports
                    </h3>
                    {details.reports?.length === 0 ? (
                      <p className="text-slate-500 text-sm">No uploaded reports found.</p>
                    ) : (
                      <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                        {details.reports?.map((doc: any) => (
                          <div key={doc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-3">
                              <Activity className="w-5 h-5 text-emerald-500" />
                              <div>
                                <p className="text-sm font-medium text-slate-800">{doc.original_filename || "Medical Report"}</p>
                                <p className="text-xs text-slate-500 mt-0.5">{formatDate(doc.created_at)}</p>
                              </div>
                            </div>
                            <a
                              href={doc.file_url && doc.file_url.startsWith("http") ? doc.file_url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${doc.file_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium"
                            >
                              <Download className="w-4 h-4" /> Open
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              </>
            ) : (
                <div className="text-center text-slate-500 py-8">Failed to load details.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
