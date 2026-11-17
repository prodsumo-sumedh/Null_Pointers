"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_PATIENTS, DEFAULT_TRIAGE_PACKETS } from "@/lib/db";
import TeleconsultationRoom from "@/components/TeleconsultationRoom";
import { syncEndCall } from "@/lib/syncClient";
import {
  Stethoscope,
  Activity,
  HeartPulse,
  Signal,
  CheckCircle2,
  FileText,
  Clock,
  Printer,
  Sparkles,
  ArrowLeft,
  User,
  ShieldCheck,
  RefreshCw,
  PhoneOff,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";

function ConsultRoomContent({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const patientIdNum = parseInt(unwrappedParams.id, 10) || 1;
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [doctorNotes, setDoctorNotes] = useState("");

  const fallbackPatient =
    DEFAULT_PATIENTS.find((p) => p.id === patientIdNum) || DEFAULT_PATIENTS[0];
  const fallbackTriageList = DEFAULT_TRIAGE_PACKETS.filter((t) => t.patientId === patientIdNum);

  useEffect(() => {
    setMounted(true);
  }, [patientIdNum]);

  const patient =
    useLiveQuery(
      async () => {
        try {
          const item = await db.patients.get(patientIdNum);
          return item || fallbackPatient;
        } catch {
          return fallbackPatient;
        }
      },
      [patientIdNum],
      fallbackPatient
    ) ?? fallbackPatient;

  const triagePackets =
    useLiveQuery(
      async () => {
        try {
          const list = await db.triagePackets.where("patientId").equals(patientIdNum).toArray();
          return list && list.length > 0 ? list : fallbackTriageList;
        } catch {
          return fallbackTriageList;
        }
      },
      [patientIdNum],
      fallbackTriageList
    ) ?? fallbackTriageList;

  const latestTriage = triagePackets[triagePackets.length - 1] || DEFAULT_TRIAGE_PACKETS[0];

  const handleEndCall = async () => {
    await syncEndCall(`aarogya-consult-${patientIdNum}`);
    router.push("/doctor");
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          टेली-परामर्श रूम लोड हो रहा है...
        </div>
      </div>
    );
  }

  const roomName = `aarogya-consult-${patientIdNum}`;
  const participantName = user?.name || "Dr. Rajesh Sharma, MD";

  const priorityColor =
    latestTriage?.priority === "RED"
      ? "bg-rose-500 text-white"
      : latestTriage?.priority === "YELLOW"
      ? "bg-amber-400 text-slate-900"
      : "bg-emerald-500 text-white";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans overflow-x-hidden">
      {/* Top Clinical Header Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 shrink-0 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleEndCall}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="वापस डॉक्टर हब जाएं"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-sm sm:text-base font-bold text-white">
                  विशेषज्ञ टेली-परामर्श (Specialist Consultation)
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-blue-950 text-blue-300 border border-blue-600/40 text-[10px] font-bold">
                  डॉक्टर हब
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                मरीज: <strong className="text-white">{patient.name}</strong> ({patient.age} वर्ष / {patient.gender}) • गाँव: {patient.village} • आभा: {patient.abhaId || "N/A"}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link
              href={`/rx/${patientIdNum}`}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 flex items-center gap-1.5 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>प्रिस्क्रिप्शन लिखें (Write Rx) →</span>
            </Link>

            <button
              onClick={handleEndCall}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>कॉल समाप्त (End)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Grid: Video Conference on Left, Clinical Summary on Right */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: LiveKit WebRTC Video Stream */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <TeleconsultationRoom
            roomName={roomName}
            participantName={participantName}
            title={`डॉक्टर परामर्श: ${patient.name} (#${patientIdNum})`}
            onDisconnect={handleEndCall}
            className="w-full"
          />
        </div>

        {/* Right Column: Clinical Case Summary & Quick Notes */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          {/* Triage & Vitals Card */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span>क्लिनिकल वाइटल्स व ट्रायज</span>
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${priorityColor}`}>
                {latestTriage?.priority || "YELLOW"} PRIORITY
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400">रक्तचाप (BP)</p>
                <p className="text-sm font-bold text-white mt-0.5">{latestTriage?.bloodPressure || "120/80"}</p>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400">SpO2</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">{latestTriage?.spo2 || 98}%</p>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80">
                <p className="text-[10px] text-slate-400">धड़कन (Pulse)</p>
                <p className="text-sm font-bold text-white mt-0.5">{latestTriage?.pulse || 76} bpm</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs">
              <p className="text-slate-400 text-[11px] mb-1 font-medium">मुख्य शिकायत (Chief Complaint):</p>
              <p className="text-slate-100 font-semibold leading-relaxed">
                {latestTriage?.chiefComplaint || "4 दिन से खांसी और बुखार (Fever & Cough)"}
              </p>
            </div>
          </div>

          {/* Clinical Impression & Quick Doctor Notes */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-4 shadow-xl space-y-3">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Stethoscope className="w-4 h-4 text-blue-400" />
              <span>डॉक्टर क्लिनिकल नोट्स (Clinical Impression)</span>
            </span>

            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="मरीज की स्थिति, अस्थायी निदान और उपचार योजना यहां दर्ज करें..."
              className="w-full h-28 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none font-sans"
            />

            <Link
              href={`/rx/${patientIdNum}`}
              className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>जेनेरिक दवा पर्चा तैयार करें (Issue Rx) →</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConsultPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      }
    >
      <ConsultRoomContent params={params} />
    </Suspense>
  );
}
