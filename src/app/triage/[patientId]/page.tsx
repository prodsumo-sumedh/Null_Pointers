"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Patient, TriagePacket, DEFAULT_PATIENTS, DEFAULT_TRIAGE_PACKETS } from "@/lib/db";
import TeleconsultationRoom from "@/components/TeleconsultationRoom";
import {
  Video,
  ArrowLeft,
  HeartPulse,
  Activity,
  Phone,
  ShieldCheck,
  User,
  Clock,
  Wifi,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Building2,
  FileText
} from "lucide-react";

function AshaTriageContent({ params }: { params: Promise<{ patientId: string }> }) {
  const unwrappedParams = use(params);
  const patientIdNum = parseInt(unwrappedParams.patientId, 10) || 1;
  const { user, isLoading } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);

  const fallbackPatient = DEFAULT_PATIENTS.find((p) => p.id === patientIdNum) || DEFAULT_PATIENTS[0];
  const fallbackTriageList = DEFAULT_TRIAGE_PACKETS.filter((t) => t.patientId === patientIdNum);

  useEffect(() => {
    console.log("[AshaTriageContent] Asha triage view mounted for patientId:", patientIdNum);
    setMounted(true);
  }, [patientIdNum]);

  // Safety fallback for mobile loading spinner
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted((prev) => {
        if (!prev) {
          console.warn("[AshaTriageContent] Safety timer forced mounted=true");
          return true;
        }
        return prev;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const patient = useLiveQuery(
    async () => {
      try {
        const item = await db.patients.get(patientIdNum);
        return item || fallbackPatient;
      } catch (err) {
        console.error("[AshaTriageContent] Dexie error reading patient, using fallback:", err);
        return fallbackPatient;
      }
    },
    [patientIdNum],
    fallbackPatient
  ) ?? fallbackPatient;

  const triagePackets = useLiveQuery(
    async () => {
      try {
        const list = await db.triagePackets.where("patientId").equals(patientIdNum).toArray();
        return list && list.length > 0 ? list : fallbackTriageList;
      } catch (err) {
        console.error("[AshaTriageContent] Dexie error reading triagePackets, using fallback:", err);
        return fallbackTriageList;
      }
    },
    [patientIdNum],
    fallbackTriageList
  ) ?? fallbackTriageList;

  const latestTriage = triagePackets[triagePackets.length - 1];

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700 font-sans">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          लोड हो रहा है... (Loading Triage Room...)
        </div>
      </div>
    );
  }

  const roomName = String(patientIdNum);
  const participantName = user?.name ? `${user.name} (ASHA)` : "आशा कार्यकर्ता (ASHA Worker)";

  const isCritical = latestTriage?.spo2 && latestTriage.spo2 < 94;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Header Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <span>आशा ट्राइएज व टेली-परामर्श</span>
                  <span className="text-xs text-slate-400 font-normal">| ASHA Triage & Video Room</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  रूम #{roomName}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {patient ? `${patient.name} (${patient.age} वर्ष, ${patient.village})` : `मरीज #${roomName}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              LiveKit WebRTC
            </span>
            <Link
              href={`/kiosk/prescriptions?patientId=${patientIdNum}`}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>दवा पर्चा देखें</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1 flex flex-col gap-5">
        {/* Patient Details & Offline Triage Summary Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Patient Info (Left 6 Cols) */}
            <div className="md:col-span-6 space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center">
                  {patient?.gender === "Female" ? "F" : "M"}
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 leading-tight">
                    {patient?.name || `Patient #${patientIdNum}`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    उम्र: {patient?.age || "—"} वर्ष • गाँव: {patient?.village || "—"} • फ़ोन: {patient?.phone || "—"}
                  </p>
                </div>
              </div>
              {patient?.abhaId && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  ABHA आईडी: {patient.abhaId}
                </p>
              )}
            </div>

            {/* Offline Triage Vitals (Right 6 Cols) */}
            <div className="md:col-span-6 bg-slate-50 rounded-xl p-3 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[11px] text-slate-500 block">रक्तचाप (BP)</span>
                <span className="font-bold text-slate-900">{latestTriage?.bloodPressure || "120/80"} mmHg</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">ऑक्सीजन (SpO2)</span>
                <span className={`font-bold ${isCritical ? "text-rose-600" : "text-slate-900"}`}>
                  {latestTriage?.spo2 ? `${latestTriage.spo2}%` : "98%"}
                </span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">धड़कन (Pulse)</span>
                <span className="font-bold text-slate-900">{latestTriage?.pulse ? `${latestTriage.pulse} bpm` : "76 bpm"}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-500 block">प्राथमिकता</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isCritical || latestTriage?.priority === "RED"
                      ? "bg-rose-100 text-rose-800 border border-rose-200"
                      : latestTriage?.priority === "YELLOW"
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  }`}
                >
                  {latestTriage?.priority || (isCritical ? "RED" : "NORMAL")}
                </span>
              </div>
            </div>
          </div>

          {latestTriage?.chiefComplaint && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-700 flex items-start gap-1.5">
              <span className="font-semibold text-slate-900 shrink-0">मुख्य लक्षण / समस्या:</span>
              <span className="text-slate-600">{latestTriage.chiefComplaint}</span>
            </div>
          )}
        </div>

        {/* Video Call Workspace */}
        {isCallActive ? (
          /* Active LiveKit Video Conference Room */
          <div className="space-y-3 animate-in fade-in zoom-in-95 duration-200">
            <TeleconsultationRoom
              roomName={roomName}
              participantName={participantName}
              onDisconnect={() => setIsCallActive(false)}
              title={`मरीज ${patient?.name || `#${roomName}`} — विशेषज्ञ डॉक्टर परामर्श`}
            />
          </div>
        ) : (
          /* Idle State: Ready to Connect */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center max-w-xl mx-auto w-full space-y-6 my-auto">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 mx-auto">
              <span className="absolute w-24 h-24 rounded-full bg-emerald-200/40 animate-ping" />
              <Video className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                लाइव विशेषज्ञ डॉक्टर वीडियो परामर्श
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                LiveKit WebRTC द्वारा संचालित सुरक्षित रूम। कमजोर ग्रामीण 2G/3G नेटवर्क में भी आवाज व वीडियो ड्रॉप नहीं होता (Dynacast & Adaptive Stream सक्रिय)।
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-left space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">परामर्श रूम आईडी:</span>
                <span className="font-mono font-bold text-slate-900">room-{roomName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>आशा कार्यकर्ता:</span>
                <span className="font-semibold">{participantName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>रिमोट विशेषज्ञ:</span>
                <span className="text-emerald-700 font-semibold">उपलब्ध डॉक्टर</span>
              </div>
            </div>

            {/* Task 4: Start Live Consultation Button */}
            <div className="pt-2">
              <button
                onClick={() => setIsCallActive(true)}
                className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <Video className="w-5 h-5 animate-pulse" />
                <span>Start Live Consultation (लाइव डॉक्टर परामर्श शुरू करें)</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>Adaptive stream automatically optimizes for poor rural bandwidth</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function AshaTriagePage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700 font-sans">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            ट्राइएज रूम लोड हो रहा है...
          </div>
        </div>
      }
    >
      <AshaTriageContent params={params} />
    </Suspense>
  );
}
