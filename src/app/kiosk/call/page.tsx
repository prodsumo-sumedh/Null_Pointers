"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Patient, TriagePacket, DEFAULT_PATIENTS, DEFAULT_TRIAGE_PACKETS } from "@/lib/db";
import TeleconsultationRoom from "@/components/TeleconsultationRoom";
import { syncCallDoctor, syncEndCall } from "@/lib/syncClient";
import {
  PhoneOff,
  Activity,
  HeartPulse,
  Signal,
  CheckCircle2,
  FileText,
  Building2,
  ArrowLeft,
  User,
  ShieldCheck,
  RefreshCw,
  Clock,
  Printer,
} from "lucide-react";

function KioskCallContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientParamId = searchParams.get("patientId");
  const [mounted, setMounted] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number>(1);
  const [hasInitiatedCall, setHasInitiatedCall] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (patientParamId) {
      const pid = parseInt(patientParamId, 10);
      if (!isNaN(pid)) {
        setSelectedPatientId(pid);
      }
    }
  }, [patientParamId]);

  // Query patient and triage details from IndexedDB
  const patients =
    useLiveQuery(
      async () => {
        try {
          const list = await db.patients.toArray();
          return list && list.length > 0 ? list : DEFAULT_PATIENTS;
        } catch {
          return DEFAULT_PATIENTS;
        }
      },
      [],
      DEFAULT_PATIENTS
    ) ?? DEFAULT_PATIENTS;

  const currentPatient =
    patients.find((p) => p.id === selectedPatientId) ||
    DEFAULT_PATIENTS.find((p) => p.id === selectedPatientId) ||
    DEFAULT_PATIENTS[0];

  const triagePackets =
    useLiveQuery(
      async () => {
        try {
          const list = await db.triagePackets.where("patientId").equals(selectedPatientId).toArray();
          return list && list.length > 0
            ? list
            : DEFAULT_TRIAGE_PACKETS.filter((t) => t.patientId === selectedPatientId);
        } catch {
          return DEFAULT_TRIAGE_PACKETS.filter((t) => t.patientId === selectedPatientId);
        }
      },
      [selectedPatientId],
      DEFAULT_TRIAGE_PACKETS.filter((t) => t.patientId === selectedPatientId)
    ) ?? [];

  const currentTriage = triagePackets[0] || DEFAULT_TRIAGE_PACKETS[0];

  // Initiate call signal to Doctor Hub across devices
  useEffect(() => {
    if (!mounted || hasInitiatedCall || !currentPatient) return;

    setHasInitiatedCall(true);
    const caller = user?.name || "कियोस्क ऑपरेटर (सुनीता देवी)";
    console.log("[KioskCall] Signaling doctor for patient:", currentPatient.name);
    syncCallDoctor(selectedPatientId, currentPatient.name, caller);
  }, [mounted, hasInitiatedCall, selectedPatientId, currentPatient, user?.name]);

  const handleEndCall = async () => {
    await syncEndCall(`aarogya-consult-${selectedPatientId}`);
    router.push("/");
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
          टेली-कंसल्टेशन रूम तैयार हो रहा है...
        </div>
      </div>
    );
  }

  const roomName = `aarogya-consult-${selectedPatientId}`;
  const participantName = user?.name || "कियोस्क ऑपरेटर (सुनीता देवी)";

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans overflow-x-hidden">
      {/* Top Clinical Header Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 py-3 shrink-0 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleEndCall}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="वापस डैशबोर्ड जाएं"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h1 className="text-sm sm:text-base font-bold text-white">
                  टेली-कंसल्टेशन कॉल (Live Teleconsultation)
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40 text-[10px] font-bold">
                  कियोस्क → डॉक्टर
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                मरीज: <strong className="text-white">{currentPatient.name}</strong> ({currentPatient.age} वर्ष / {currentPatient.gender}) • {currentPatient.village}
              </p>
            </div>
          </div>

          {/* Patient Quick Vitals Pill */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs">
              <span className="text-slate-400">BP: <strong className="text-white">{currentTriage?.bloodPressure || "120/80"}</strong></span>
              <span className="text-slate-400">SpO2: <strong className="text-emerald-400">{currentTriage?.spo2 || 98}%</strong></span>
              <span className="text-slate-400">Pulse: <strong className="text-white">{currentTriage?.pulse || 76} bpm</strong></span>
            </div>

            <button
              onClick={handleEndCall}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <PhoneOff className="w-4 h-4" />
              <span>कॉल समाप्त करें (End Call)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Video & LiveKit Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 flex flex-col justify-center">
        <TeleconsultationRoom
          roomName={roomName}
          participantName={participantName}
          title={`परामर्श: ${currentPatient.name} (${currentPatient.village})`}
          onDisconnect={handleEndCall}
          className="flex-1"
        />

        {/* Clinical Patient Context Summary Bar Below Call */}
        <div className="mt-3 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>मुख्य शिकायत:</strong> {currentTriage?.chiefComplaint || "सामान्य स्वास्थ्य जांच"}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/kiosk/prescriptions`}
              className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>प्रिस्क्रिप्शन देखें / प्रिंट करें</span>
            </Link>
            <span className="text-slate-600">|</span>
            <span className="font-mono text-[11px] text-slate-400">Room: {roomName}</span>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function KioskCallPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      }
    >
      <KioskCallContent />
    </Suspense>
  );
}
