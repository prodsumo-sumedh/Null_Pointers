"use client";

import React from "react";
import Link from "next/link";
import {
  Building2,
  Stethoscope,
  HeartPulse,
  WifiOff,
  Video,
  FileText,
  Users,
  Activity,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function PortalSelection() {
  const { loginAsKiosk, loginAsDoctor } = useAuth();

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex flex-col justify-between font-sans">
      {/* Hero Welcome */}
      <main className="max-w-5xl mx-auto px-4 py-12 flex-1 flex flex-col justify-center items-center w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold mb-4">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
            <span>ग्रामीण-प्रथम डिजिटल स्वास्थ्य प्लेटफॉर्म (Rural-First Telemedicine)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            आरोग्य संगम पोर्टल चयन
          </h1>
          <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
            यह प्रणाली स्वास्थ्य केंद्र ऑपरेटरों और दूरस्थ विशेषज्ञ डॉक्टरों के लिए अलग-अलग वर्कस्पेस प्रदान करती है। कृपया अपनी भूमिका के अनुसार लॉगिन पोर्टल चुनें:
          </p>
        </div>

        {/* Dual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {/* Card 1: Health Station Kiosk */}
          <div className="bg-white rounded-2xl border-2 border-emerald-500/30 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all p-6 sm:p-8 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
                  <Building2 className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                  आशा / कियोस्क ऑपरेटर
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">
                स्वास्थ्य केंद्र (Health Station)
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                ग्रामीण प्राथमिक स्वास्थ्य केंद्र व सामुदायिक कार्यकर्ता पोर्टल
              </p>

              <div className="space-y-2.5 text-xs text-slate-700 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ऑफलाइन मरीज बैच पंजीकरण व आभा आईडी</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>पॉइंट-ऑफ-केयर वाइटल्स (BP, SpO2, पल्स)</span>
                </div>
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>2G / बिना इंटरनेट में भी सुरक्षित स्थानीय सिंक</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                href="/login/kiosk"
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span>स्वास्थ्य केंद्र लॉगिन (Kiosk Login)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() =>
                  loginAsKiosk({
                    kioskId: "HS-RAJ-104",
                    operatorName: "सुनीता देवी (ASHA Worker)",
                    village: "रामपुर",
                  })
                }
                className="w-full h-9 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-medium text-xs border border-emerald-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>त्वरित डेमो कियोस्क प्रवेश (1-Click Demo)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Doctor Portal */}
          <div className="bg-white rounded-2xl border-2 border-blue-500/30 hover:border-blue-500 shadow-sm hover:shadow-md transition-all p-6 sm:p-8 flex flex-col justify-between group">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
                  <Stethoscope className="w-7 h-7" />
                </div>
                <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-200">
                  रिमोट विशेषज्ञ
                </span>
              </div>

              <h2 className="text-xl font-bold text-slate-900 mb-1">
                डॉक्टर पोर्टल (Doctor Hub)
              </h2>
              <p className="text-xs text-slate-500 mb-5">
                विशेषज्ञ चिकित्सक कंसल्टेशन व क्लिनिकल ट्रायज वर्कस्पेस
              </p>

              <div className="space-y-2.5 text-xs text-slate-700 pb-6 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>प्राथमिकता ट्रायज कतार (RED / YELLOW / GREEN)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>एडेप्टिव टेली-परामर्श (720p / 2G / VoIP ऑडियो)</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>सचित्र जेनेरिक ई-प्रिस्क्रिप्शन व क्यूआर कार्ड</span>
                </div>
              </div>
            </div>

            <div className="pt-6 space-y-2.5">
              <Link
                href="/login/doctor"
                className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <span>डॉक्टर पोर्टल लॉगिन (Doctor Login)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                type="button"
                onClick={() =>
                  loginAsDoctor({
                    doctorId: "DOC-7842",
                    doctorName: "Dr. Rajesh Sharma, MD",
                    specialty: "Internal Medicine Specialist",
                  })
                }
                className="w-full h-9 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 font-medium text-xs border border-blue-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>त्वरित डेमो डॉक्टर प्रवेश (1-Click Demo)</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 px-6 text-center text-xs text-slate-400">
        <p>AarogyaSangam • Low-Bandwidth Assisted Rural Telemedicine Platform</p>
      </footer>
    </div>
  );
}
