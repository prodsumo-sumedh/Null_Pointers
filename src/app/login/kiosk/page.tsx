"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  HeartPulse,
  Lock,
  User,
  MapPin,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Sparkles
} from "lucide-react";

export default function KioskLoginPage() {
  const { loginAsKiosk } = useAuth();

  const [kioskId, setKioskId] = useState("HS-RAJ-104");
  const [operatorName, setOperatorName] = useState("सुनीता देवी (ASHA Worker)");
  const [village, setVillage] = useState("रामपुर (Rampur)");
  const [pin, setPin] = useState("1234");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!operatorName.trim() || !kioskId.trim()) {
      alert("कृपया ऑपरेटर का नाम और केंद्र कोड दर्ज करें।");
      return;
    }
    setIsSubmitting(true);
    loginAsKiosk({
      kioskId: kioskId.trim(),
      operatorName: operatorName.trim(),
      village: village.split(" (")[0],
    });
  };

  const handleQuickDemoLogin = () => {
    loginAsKiosk({
      kioskId: "HS-RAJ-104",
      operatorName: "सुनीता देवी (ASHA Worker)",
      village: "रामपुर",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/60 to-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Brand Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-md mb-3">
          <Building2 className="w-7 h-7" />
        </div>
        <div className="flex items-center justify-center gap-2 mb-1">
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">आरोग्य संगम</h1>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
            स्वास्थ्य केंद्र
          </span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">
          स्वास्थ्य केंद्र ऑपरेटर लॉगिन
        </h2>
        <p className="mt-1 text-xs text-slate-600 max-w-sm mx-auto">
          आशा कार्यकर्ता व कियोस्क ऑपरेटर पोर्टल • ऑफलाइन पंजीकरण व ट्रायज
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm rounded-2xl border border-slate-200 sm:px-10">
          {/* Quick Demo Login Pill */}
          <button
            type="button"
            onClick={handleQuickDemoLogin}
            className="w-full mb-6 p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-left transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>⚡ 1-क्लिक डेमो कियोस्क लॉगिन</span>
                </p>
                <p className="text-[11px] text-emerald-700">
                  सुनीता देवी • रामपुर प्राथमिक स्वास्थ्य केंद्र
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400">या क्रेडेंशियल दर्ज करें</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Kiosk ID */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                केंद्र आईडी / कोड (Station ID)
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={kioskId}
                  onChange={(e) => setKioskId(e.target.value)}
                  placeholder="उदा. HS-RAJ-104"
                  required
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Operator Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ऑपरेटर का नाम (Operator Name)
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={operatorName}
                  onChange={(e) => setOperatorName(e.target.value)}
                  placeholder="उदा. सुनीता देवी"
                  required
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Village Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                स्थान / गाँव (Village & Location)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <select
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                >
                  <option value="रामपुर (Rampur)">रामपुर (Rampur)</option>
                  <option value="शिवपुरी (Shivpuri)">शिवपुरी (Shivpuri)</option>
                  <option value="दौलतपुर (Daulatpur)">दौलतपुर (Daulatpur)</option>
                  <option value="किशनगढ़ (Kishangarh)">किशनगढ़ (Kishangarh)</option>
                </select>
              </div>
            </div>

            {/* PIN */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                सुरक्षा पिन (4-Digit PIN)
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  maxLength={4}
                  required
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50/50 text-xs text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 mt-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
            >
              <span>{isSubmitting ? "लॉगिन हो रहा है..." : "स्वास्थ्य केंद्र में प्रवेश करें"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Switch Portal Link */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">क्या आप विशेषज्ञ डॉक्टर हैं?</span>
            <Link
              href="/login/doctor"
              className="font-semibold text-blue-600 hover:text-blue-500 flex items-center gap-1"
            >
              <Stethoscope className="w-3.5 h-3.5" />
              <span>डॉक्टर लॉगिन →</span>
            </Link>
          </div>
        </div>

        {/* Offline notice */}
        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>ऑफ़लाइन सुरक्षित • कमजोर नेटवर्क (2G/3G) में भी सक्रिय रहता है</span>
          </p>
        </div>
      </div>
    </div>
  );
}
