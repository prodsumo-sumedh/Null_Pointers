"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Patient, TriagePacket, DEFAULT_PATIENTS, DEFAULT_TRIAGE_PACKETS } from "@/lib/db";
import TeleconsultationRoom from "@/components/TeleconsultationRoom";
import {
  Stethoscope,
  AlertTriangle,
  Phone,
  MapPin,
  ShieldCheck,
  Video,
  FileText,
  Clock,
  CheckCircle2,
  Volume2,
  Activity,
  Mic,
  ArrowRight,
  Building2,
  RefreshCw
} from "lucide-react";

export default function DoctorPortal() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<"ALL" | "RED" | "YELLOW" | "GREEN">("ALL");
  const [activeCallPatientId, setActiveCallPatientId] = useState<number | null>(null);

  useEffect(() => {
    console.log("[DoctorPortal] Doctor portal mounted on client.");
    setMounted(true);
  }, []);

  // Safety fallback for mobile browser loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted((prev) => {
        if (!prev) {
          console.warn("[DoctorPortal] Safety timer forced mounted=true");
          return true;
        }
        return prev;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const patients =
    useLiveQuery(
      async () => {
        try {
          const list = await db.patients.toArray();
          return list && list.length > 0 ? list : DEFAULT_PATIENTS;
        } catch (err) {
          console.error("[DoctorPortal] Dexie error reading patients, falling back to defaults:", err);
          return DEFAULT_PATIENTS;
        }
      },
      [],
      DEFAULT_PATIENTS
    ) ?? DEFAULT_PATIENTS;

  const triagePackets =
    useLiveQuery(
      async () => {
        try {
          const list = await db.triagePackets.reverse().toArray();
          return list && list.length > 0 ? list : DEFAULT_TRIAGE_PACKETS;
        } catch (err) {
          console.error("[DoctorPortal] Dexie error reading triage packets, falling back to defaults:", err);
          return DEFAULT_TRIAGE_PACKETS;
        }
      },
      [],
      DEFAULT_TRIAGE_PACKETS
    ) ?? DEFAULT_TRIAGE_PACKETS;

  const patientMap = React.useMemo(() => {
    const map = new Map<number, Patient>();
    for (const p of patients) {
      if (p.id) map.set(p.id, p);
    }
    return map;
  }, [patients]);

  const triageWithPatients = React.useMemo(() => {
    return triagePackets.map((pkt) => {
      const patient = patientMap.get(pkt.patientId);
      let priority = pkt.priority;
      if (!priority) {
        if (pkt.spo2 && pkt.spo2 < 94) priority = "RED";
        else if (pkt.chiefComplaint.toLowerCase().includes("chest") || pkt.chiefComplaint.toLowerCase().includes("छाती")) priority = "RED";
        else if (pkt.chiefComplaint.toLowerCase().includes("cough") || pkt.chiefComplaint.toLowerCase().includes("fever") || pkt.chiefComplaint.toLowerCase().includes("बुखार")) priority = "YELLOW";
        else priority = "GREEN";
      }
      return {
        ...pkt,
        priority,
        patient,
      };
    });
  }, [triagePackets, patientMap]);

  const filteredQueue = triageWithPatients.filter((item) => {
    if (priorityFilter === "ALL") return true;
    return item.priority === priorityFilter;
  });

  const selectedItem = selectedPatientId
    ? triageWithPatients.find((i) => i.patientId === selectedPatientId) || triageWithPatients[0]
    : triageWithPatients[0];

  const redCount = triageWithPatients.filter((i) => i.priority === "RED").length;
  const yellowCount = triageWithPatients.filter((i) => i.priority === "YELLOW").length;

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          लोड हो रहा है...
        </div>
      </div>
    );
  }

  // If unauthenticated:
  if (!user) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">डॉक्टर लॉगिन आवश्यक है</h2>
          <p className="text-xs text-slate-500">
            विशेषज्ञ कंसल्टेशन और केस कतार देखने के लिए कृपया डॉक्टर पोर्टल पर लॉगिन करें।
          </p>
          <div className="pt-2">
            <Link
              href="/login/doctor"
              className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>डॉक्टर लॉगिन करें →</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If logged in as Kiosk Operator:
  if (user.role === "kiosk") {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-amber-200 shadow-sm p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Building2 className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">स्वास्थ्य केंद्र ऑपरेटर खाता</h2>
          <p className="text-xs text-slate-600">
            आप वर्तमान में <strong>{user.name}</strong> ({user.stationOrDept}) के रूप में लॉगिन हैं। यह पृष्ठ केवल अधिकृत विशेषज्ञ डॉक्टरों के लिए है।
          </p>
          <div className="pt-2 space-y-2">
            <Link
              href="/"
              className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>स्वास्थ्य केंद्र डैशबोर्ड पर वापस जाएं →</span>
            </Link>
            <Link
              href="/login/doctor"
              className="w-full h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5"
            >
              <span>डॉक्टर खाते में स्विच करें</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Doctor Header */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">
                डॉक्टर पोर्टल (Doctor Hub)
              </h1>
              <p className="text-xs text-slate-500">
                {user.name} • {user.stationOrDept}
              </p>
            </div>
          </div>

          {/* Clean Priority Filter Pills */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPriorityFilter("RED")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                priorityFilter === "RED"
                  ? "bg-rose-50 text-rose-700 border-rose-300 font-bold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              आपातकालीन ({redCount})
            </button>

            <button
              onClick={() => setPriorityFilter("YELLOW")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                priorityFilter === "YELLOW"
                  ? "bg-amber-50 text-amber-700 border-amber-300 font-bold"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              मध्यम ({yellowCount})
            </button>

            <button
              onClick={() => setPriorityFilter("ALL")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
                priorityFilter === "ALL"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              सभी ({triageWithPatients.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Queue on Left, Case on Right */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Triage Incoming Queue */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col min-h-[580px]">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
            <h2 className="text-sm font-bold text-slate-900">
              प्रतीक्षारत मरीज ({filteredQueue.length})
            </h2>
            <span className="text-xs text-slate-400">स्वास्थ्य केंद्र से प्राप्त</span>
          </div>

          <div className="space-y-2 flex-1 overflow-y-auto max-h-[520px] pr-1">
            {filteredQueue.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-1 opacity-40 text-emerald-500" />
                <p className="text-xs font-medium">कोई लंबित मरीज नहीं</p>
              </div>
            ) : (
              filteredQueue.map((item) => {
                const isSelected = selectedItem?.id === item.id;
                const isRed = item.priority === "RED";
                const isYellow = item.priority === "YELLOW";

                return (
                  <div
                    key={item.id}
                    onClick={() => item.patientId && setSelectedPatientId(item.patientId)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50/50 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isRed ? "bg-rose-500" : isYellow ? "bg-amber-500" : "bg-emerald-500"
                            }`}
                          />
                          <h3 className="text-xs font-bold text-slate-900">
                            {item.patient?.name || `Patient #${item.patientId}`}
                          </h3>
                          <span className="text-[11px] text-slate-500">
                            {item.patient?.age}y ({item.patient?.gender === "Female" ? "F" : "M"})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.patient?.village}
                        </p>
                      </div>

                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase ${
                          isRed
                            ? "bg-rose-50 text-rose-700 border border-rose-200"
                            : isYellow
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 mt-1.5 line-clamp-1">
                      {item.chiefComplaint}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-100">
                      <div className="flex gap-2">
                        <span>SpO2: {item.spo2}%</span>
                        <span>BP: {item.bloodPressure}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-100/70 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">Room #{item.patientId}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.patientId) {
                            setSelectedPatientId(item.patientId);
                            setActiveCallPatientId(item.patientId);
                          }
                        }}
                        className="px-2 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Video className="w-3 h-3 text-emerald-600 animate-pulse" />
                        <span>Join Active Call</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column: Case Examination */}
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col min-h-[580px]">
          {selectedItem && selectedItem.patient ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedItem.patient.name}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs">
                      {selectedItem.patient.age} वर्ष
                    </span>
                    {selectedItem.patient.abhaId && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                        ABHA: {selectedItem.patient.abhaId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                    <span>गाँव: {selectedItem.patient.village}</span>
                    <span>फोन: {selectedItem.patient.phone}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveCallPatientId(selectedItem.patientId || 1)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                    title="Connect to LiveKit room for this patient"
                  >
                    <Video className="w-4 h-4 animate-pulse" />
                    <span>Join Active Call</span>
                  </button>

                  <span
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                      selectedItem.priority === "RED"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : selectedItem.priority === "YELLOW"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {selectedItem.priority}
                  </span>
                </div>
              </div>

              {/* Active LiveKit Video Conference Room when Doctor Joins */}
              {activeCallPatientId === selectedItem.patientId && (
                <div className="rounded-2xl border-2 border-emerald-500 overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-200">
                  <TeleconsultationRoom
                    roomName={String(selectedItem.patientId || 1)}
                    participantName={user?.name || "Dr. Rajesh Sharma, MD"}
                    onDisconnect={() => setActiveCallPatientId(null)}
                    title={`मरीज ${selectedItem.patient.name} — Live Doctor Consultation (Room #${selectedItem.patientId})`}
                  />
                </div>
              )}

              {/* Vitals Telemetry */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  वाइटल्स (Vitals):
                </p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">रक्तचाप (BP)</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedItem.bloodPressure} <span className="text-xs font-normal text-slate-400">mmHg</span>
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg border ${selectedItem.spo2 && selectedItem.spo2 < 94 ? "bg-rose-50 border-rose-200 text-rose-900" : "bg-slate-50 border-slate-200 text-slate-900"}`}>
                    <p className="text-[11px] text-slate-500">ऑक्सीजन (SpO2)</p>
                    <p className="text-base font-bold mt-0.5">
                      {selectedItem.spo2}%
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-[11px] text-slate-500">नाड़ी (Pulse)</p>
                    <p className="text-base font-bold text-slate-900 mt-0.5">
                      {selectedItem.pulse} <span className="text-xs font-normal text-slate-400">bpm</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Chief Complaint */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                <p className="text-xs font-semibold text-slate-700">
                  मुख्य शिकायत (Chief Complaint):
                </p>
                <p className="text-sm font-medium text-slate-900 bg-white p-2.5 rounded border border-slate-200">
                  {selectedItem.chiefComplaint}
                </p>
              </div>

              {/* Voice Memo */}
              <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-md bg-emerald-600 text-white">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-950">
                      स्वास्थ्य कार्यकर्ता वॉयस नोट
                    </p>
                    <p className="text-[11px] text-emerald-700">
                      मरीज की आवाज रिकॉर्डिंग
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => alert("Playing recorded voice memo...")}
                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>सुनें</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setActiveCallPatientId(selectedItem.patientId || 1)}
                  className="h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Video className="w-4 h-4 animate-pulse" />
                  <span>Join Active Call</span>
                </button>

                <Link
                  href={`/consult/${selectedItem.patientId || 1}`}
                  className="h-11 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Video className="w-4 h-4" />
                  <span>टेली-परामर्श रूम</span>
                </Link>

                <Link
                  href={`/rx/${selectedItem.patientId || 1}`}
                  className="h-11 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <FileText className="w-4 h-4" />
                  <span>प्रिस्क्रिप्शन बनाएं</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Stethoscope className="w-12 h-12 text-slate-300 mb-2 opacity-50" />
              <p className="text-sm font-medium text-slate-600">मरीज का चयन करें</p>
              <p className="text-xs">बाईं कतार से किसी भी मरीज पर क्लिक करें।</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
