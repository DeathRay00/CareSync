import Link from "next/link";
import { Heart, Shield, Stethoscope } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-indigo-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-3xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-sky-500 rounded-2xl shadow-lg">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800">MedAssistant</h1>
        </div>

        <p className="text-lg text-slate-600 max-w-xl mx-auto">
          AI-powered medical portal for patients and doctors. Manage appointments,
          prescriptions, and get instant health insights.
        </p>

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-8">
          <Link
            href="/auth/login?role=patient"
            className="group p-8 bg-white rounded-2xl shadow-md border border-sky-100 hover:shadow-xl hover:border-sky-300 transition-all duration-200 text-left"
          >
            <div className="p-3 bg-sky-100 rounded-xl w-fit mb-4 group-hover:bg-sky-200 transition-colors">
              <Heart className="w-6 h-6 text-sky-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Patient Portal</h2>
            <p className="text-slate-500 text-sm">
              Book appointments, upload prescriptions, view AI-analyzed reports, and chat with your health assistant.
            </p>
            <span className="mt-4 inline-block text-sky-600 font-medium text-sm group-hover:underline">
              Sign in as Patient →
            </span>
          </Link>

          <Link
            href="/auth/login?role=doctor"
            className="group p-8 bg-white rounded-2xl shadow-md border border-indigo-100 hover:shadow-xl hover:border-indigo-300 transition-all duration-200 text-left"
          >
            <div className="p-3 bg-indigo-100 rounded-xl w-fit mb-4 group-hover:bg-indigo-200 transition-colors">
              <Stethoscope className="w-6 h-6 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Doctor Portal</h2>
            <p className="text-slate-500 text-sm">
              Manage your schedule, review patients, write digital prescriptions, and view AI medical summaries.
            </p>
            <span className="mt-4 inline-block text-indigo-600 font-medium text-sm group-hover:underline">
              Sign in as Doctor →
            </span>
          </Link>
        </div>

        <p className="text-sm text-slate-400 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-sky-500 hover:underline font-medium">
            Register here
          </Link>
        </p>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-slate-400 text-xs mt-8">
          <Shield className="w-4 h-4" />
          <span>HIPAA-inspired design — your data stays private</span>
        </div>
      </div>
    </main>
  );
}
