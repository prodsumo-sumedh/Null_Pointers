"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Stethoscope,
  Building2,
  Lock,
  User,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Award,
  Video
} from "lucide-react";

export default function DoctorLoginPage() {
  const { loginAsDoctor } = useAuth();

  const [doctorId, setDoctorId] = useState("DOC-7842");
  const [doctorName, setDoctorName] = useState("Dr. Rajesh Sharma, MD");
  const [specialty, setSpecialty] = useState("General & Internal Medicine");
  const [password, setPassword] = useState("••••••••");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorName.trim() || !doctorId.trim()) {
      alert("कृपया डॉक्टर का नाम और आईडी दर्ज करें।");
      return;
    }
    setIsSubmitting(true);
    loginAsDoctor({
      doctorId: doctorId.trim(),
      doctorName: doctorName.trim(),
      specialty: specialty.trim(),
    });
  };

  const handleQuickDemoLogin = () => {
    loginAsDoctor({
      doctorId: "DOC-7842",
      doctorName: "Dr. Rajesh Sharma, MD",
      specialty: "Internal Medicine Specialist",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/60 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-md mb-3">
          <Stethoscope className="w-7 h-7" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">आरोग्य संगम</h1>
          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-semibold border border-blue-200">
            विशेषज्ञ पोर्टल
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">
          रिमोट विशेषज्ञ डॉक्टर लॉगिन
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
          टेली-परामर्श, क्लिनिकल केस समीक्षा व डिजिटल ई-प्रिस्क्रिप्शन
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          {/* Quick Demo Login Pill */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full mb-6 min-h-[48px] p-3 rounded-2xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-left transition-all flex items-center justify-between group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <span>⚡ 1-क्लिक डेमो डॉक्टर लॉगिन</span>
                </p>
                <p className="text-[11px] text-blue-700">
                  Dr. Rajesh Sharma, MD • Internal Medicine
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-blue-600 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">या डॉक्टर क्रेडेंशियल दर्ज करें</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Doctor ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                डॉक्टर आईडी / ईमेल (Doctor ID / Email)
              </label>
              <div className="relative">
                <Award className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  placeholder="उदा. DOC-7842"
                  required
                  className="w-full min-h-[48px] pl-11 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Doctor Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                चिकित्सक का नाम (Doctor Full Name)
              </label>
              <div className="relative">
                <User className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="उदा. Dr. Rajesh Sharma, MD"
                  required
                  className="w-full min-h-[48px] pl-11 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Specialty */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                विशेषज्ञता / विभाग (Department & Specialty)
              </label>
              <div className="relative">
                <Stethoscope className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <select
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full min-h-[48px] pl-11 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                >
                  <option value="General & Internal Medicine">General & Internal Medicine (जनरल फिजिशियन)</option>
                  <option value="Pediatrics (शिशु रोग)">Pediatrics (शिशु रोग विशेषज्ञ)</option>
                  <option value="Cardiology (हृदय रोग)">Cardiology (हृदय रोग)</option>
                  <option value="Pulmonology (श्वसन रोग)">Pulmonology (श्वसन व दमा रोग)</option>
                  <option value="Gynecology & Obstetrics">Gynecology (महिला व प्रसूति रोग)</option>
                </select>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                पासवर्ड (Password)
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full min-h-[48px] pl-11 pr-3 rounded-xl border border-slate-200 bg-slate-50/50 text-base text-slate-900 focus:bg-white focus:border-blue-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] mt-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isSubmitting ? "लॉगिन हो रहा है..." : "डॉक्टर पोर्टल में प्रवेश करें"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch Portal Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">क्या आप स्वास्थ्य केंद्र ऑपरेटर हैं?</span>
            <Link
              href="/login/kiosk"
              className="min-h-[44px] px-2 py-1 font-semibold text-emerald-600 hover:text-emerald-500 flex items-center gap-1.5"
            >
              <Building2 className="w-4 h-4" />
              <span>कियोस्क लॉगिन →</span>
            </Link>
          </div>
        </div>

        {/* Doctor portal features notice */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <Video className="w-3.5 h-3.5 text-blue-600" />
            <span>लाइव वीडियो कंसल्टेशन • एडेप्टिव 2G/VoIP मोड • सचित्र प्रिस्क्रिप्शन</span>
          </p>
        </div>
      </div>
    </div>
  );
}
