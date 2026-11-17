"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useLiveQuery } from "dexie-react-hooks";
import {
  db,
  Patient,
  Prescription,
  TriagePacket,
  DEFAULT_PATIENTS,
  DEFAULT_TRIAGE_PACKETS,
} from "@/lib/db";
import {
  Stethoscope,
  Clock,
  Search,
  Filter,
  FileText,
  Printer,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Building2,
  Pill,
  Sun,
  Moon,
  Utensils,
  RefreshCw,
  Eye,
  User,
  ShieldCheck,
} from "lucide-react";

export default function DoctorConsultationHistoryPage() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "dispensed" | "prescribed">("ALL");
  const [selectedVillage, setSelectedVillage] = useState("ALL");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch Patients, Prescriptions, and Triage Packets from Dexie
  const patients =
    useLiveQuery(
      async () => {
        try {
          const list = await db.patients.toArray();
          return list && list.length > 0 ? list : DEFAULT_PATIENTS;
        } catch (err) {
          console.error("[DoctorHistory] Error reading patients:", err);
          return DEFAULT_PATIENTS;
        }
      },
      [],
      DEFAULT_PATIENTS
    ) ?? DEFAULT_PATIENTS;

  const prescriptions =
    useLiveQuery(
      async () => {
        try {
          return await db.prescriptions.reverse().toArray();
        } catch (err) {
          console.error("[DoctorHistory] Error reading prescriptions:", err);
          return [];
        }
      },
      [],
      []
    ) ?? [];

  const triagePackets =
    useLiveQuery(
      async () => {
        try {
          const list = await db.triagePackets.toArray();
          return list && list.length > 0 ? list : DEFAULT_TRIAGE_PACKETS;
        } catch (err) {
          console.error("[DoctorHistory] Error reading triagePackets:", err);
          return DEFAULT_TRIAGE_PACKETS;
        }
      },
      [],
      DEFAULT_TRIAGE_PACKETS
    ) ?? DEFAULT_TRIAGE_PACKETS;

  // Map patients by id for fast join
  const patientMap = React.useMemo(() => {
    const map = new Map<number, Patient>();
    for (const p of patients) {
      if (p.id) map.set(p.id, p);
    }
    return map;
  }, [patients]);

  // Map triage by patient id
  const triageMap = React.useMemo(() => {
    const map = new Map<number, TriagePacket>();
    for (const t of triagePackets) {
      if (t.patientId) map.set(t.patientId, t);
    }
    return map;
  }, [triagePackets]);

  // Combined consultations list
  const combinedHistory = React.useMemo(() => {
    return prescriptions.map((rx) => {
      const patient = patientMap.get(rx.patientId);
      const triage = triageMap.get(rx.patientId);
      return {
        ...rx,
        patient,
        triage,
      };
    });
  }, [prescriptions, patientMap, triageMap]);

  // Unique list of villages for filter dropdown
  const villages = React.useMemo(() => {
    const set = new Set<string>();
    combinedHistory.forEach((item) => {
      if (item.patient?.village) set.add(item.patient.village);
    });
    return Array.from(set);
  }, [combinedHistory]);

  // Filtered list
  const filteredHistory = React.useMemo(() => {
    return combinedHistory.filter((item) => {
      // Status filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      // Village filter
      if (selectedVillage !== "ALL" && item.patient?.village !== selectedVillage) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = item.patient?.name?.toLowerCase() || "";
        const pVillage = item.patient?.village?.toLowerCase() || "";
        const diag = item.diagnosis?.toLowerCase() || "";
        const medNames = item.medications
          ?.map((m) => m.saltName.toLowerCase())
          .join(" ") || "";
        const code = item.qrVerificationId?.toLowerCase() || "";
        return (
          pName.includes(q) ||
          pVillage.includes(q) ||
          diag.includes(q) ||
          medNames.includes(q) ||
          code.includes(q)
        );
      }
      return true;
    });
  }, [combinedHistory, statusFilter, selectedVillage, searchQuery]);

  // Summary Metrics
  const totalCount = combinedHistory.length;
  const dispensedCount = combinedHistory.filter((i) => i.status === "dispensed").length;
  const prescribedCount = combinedHistory.filter((i) => i.status === "prescribed").length;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          इतिहास लोड हो रहा है...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 flex flex-col font-sans pb-12 overflow-x-hidden w-full max-w-full">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/doctor"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="वापस डॉक्टर हब जाएँ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-blue-600" />
                  <span>परामर्श व केस इतिहास (Consultation History)</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                  Doctor Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                विशेषज्ञ चिकित्सकों द्वारा निष्पादित पूर्ण टेली-परामर्श, रोग निदान व जेनेरिक पर्चा रिकॉर्ड
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href="/doctor"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <User className="w-4 h-4 text-slate-600" />
              <span>सक्रिय मरीज कतार (Queue)</span>
            </Link>
            <Link
              href="/kiosk/prescriptions"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट हब (Print Hub)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6 overflow-x-hidden">
        {/* Metric Cards Banner */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">कुल परामर्श (Total Consults)</span>
              <span className="text-2xl font-black text-slate-900 mt-1 block">{totalCount}</span>
              <span className="text-[11px] text-blue-600 font-medium">टेलीमेडिसिन क्लिनिकल रिकॉर्ड</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Stethoscope className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">दवा वितरित (Dispensed at Kiosk)</span>
              <span className="text-2xl font-black text-emerald-600 mt-1 block">{dispensedCount}</span>
              <span className="text-[11px] text-emerald-700 font-medium">मरीजों को औषधि सौंपी गई</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 block">पर्चे जारी / प्रक्रिया में (Prescribed)</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{prescribedCount}</span>
              <span className="text-[11px] text-amber-700 font-medium">कियोस्क वितरण हेतु उपलब्ध</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <FileText className="w-6 h-6" />
            </div>
          </div>
        </section>

        {/* Filter and Search Bar */}
        <section className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="मरीज का नाम, गाँव, रोग निदान या दवा से खोजें..."
              className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:outline-none focus:border-blue-600"
            />
          </div>

          {/* Status & Village Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`min-h-[40px] px-3 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "ALL"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                सभी ({totalCount})
              </button>
              <button
                onClick={() => setStatusFilter("dispensed")}
                className={`min-h-[40px] px-3 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "dispensed"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                दवा दी गई ({dispensedCount})
              </button>
              <button
                onClick={() => setStatusFilter("prescribed")}
                className={`min-h-[40px] px-3 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "prescribed"
                    ? "bg-white text-amber-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                लंबित ({prescribedCount})
              </button>
            </div>

            {villages.length > 0 && (
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">सभी गाँव ({villages.length})</option>
                {villages.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

        {/* History Consultations List / Table */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 px-4 text-slate-400 space-y-3">
              <FileText className="w-12 h-12 mx-auto text-blue-500 opacity-30" />
              <h3 className="text-sm font-bold text-slate-700">कोई परामर्श इतिहास नहीं मिला</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL" || selectedVillage !== "ALL"
                  ? "दिए गए फ़िल्टर से कोई मेल नहीं मिला। कृपया अपनी खोज बदलें।"
                  : "अभी तक कोई पूर्ण परामर्श दर्ज नहीं हुआ है। डॉक्टर हब से मरीज का परामर्श शुरू करें।"}
              </p>
              <Link
                href="/doctor"
                className="inline-flex items-center gap-2 min-h-[48px] px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors"
              >
                <Stethoscope className="w-4 h-4" />
                <span>डॉक्टर हब पर जाएं</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 sm:p-6 hover:bg-slate-50/60 transition-colors space-y-4"
                >
                  {/* Row Top: Patient Demographics & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {item.patient?.gender === "Female" ? "F" : "M"}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900 leading-tight">
                            {item.patient?.name || `Patient #${item.patientId}`}
                          </h2>
                          <span className="text-xs text-slate-500 font-medium">
                            {item.patient?.age} वर्ष • {item.patient?.gender === "Female" ? "महिला" : "पुरुष"}
                          </span>
                          {item.patient?.village && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                              गाँव: {item.patient.village}
                            </span>
                          )}
                          {item.patient?.abhaId && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                              ABHA: {item.patient.abhaId}
                            </span>
                          )}
                        </div>

                        {/* Consultation Date & Doctor */}
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {new Date(item.createdAt).toLocaleDateString("hi-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            (
                            {new Date(item.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            )
                          </span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">
                            परामर्शदाता: {item.doctorName}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Pill & Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          item.status === "dispensed"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {item.status === "dispensed" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>दवा वितरित (Dispensed)</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>पर्चा जारी (Prescribed)</span>
                          </>
                        )}
                      </span>

                      <Link
                        href={`/kiosk/prescriptions?patientId=${item.patientId}`}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5"
                        title="दवा पर्चा व चैट रिकॉर्ड देखें"
                      >
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span>पर्चा व चैट</span>
                      </Link>

                      <Link
                        href={`/kiosk/prescriptions?patientId=${item.patientId}`}
                        className="min-h-[44px] px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                        title="पर्चा प्रिंट करें"
                      >
                        <Printer className="w-4 h-4" />
                        <span className="hidden sm:inline">प्रिंट</span>
                      </Link>
                    </div>
                  </div>

                  {/* Diagnosis & Vitals Strip */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    <div className="md:col-span-8 text-xs">
                      <span className="font-bold text-slate-900 block mb-0.5">
                        रोग निदान (Diagnosis):
                      </span>
                      <p className="text-sm font-bold text-blue-950">{item.diagnosis}</p>
                      {item.instructionsHi && (
                        <p className="text-xs text-slate-600 mt-1">
                          <strong>सलाह:</strong> {item.instructionsHi}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-slate-200/80 pt-2 md:pt-0 md:pl-4 text-xs">
                      <span className="text-[11px] text-slate-500 block mb-1">
                        परामर्श समय दर्ज वाइटल्स:
                      </span>
                      <div className="flex items-center gap-3 font-semibold text-slate-700">
                        <span>BP: {item.triage?.bloodPressure || "120/80"}</span>
                        <span>•</span>
                        <span>SpO2: {item.triage?.spo2 ? `${item.triage.spo2}%` : "98%"}</span>
                        <span>•</span>
                        <span>Pulse: {item.triage?.pulse ? `${item.triage.pulse} bpm` : "76 bpm"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Prescribed Generics Section */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                        <Pill className="w-4 h-4 text-blue-600" />
                        <span>निर्धारित जेनेरिक दवाएं (Prescribed Generics - {item.medications?.length || 0})</span>
                      </h3>
                      <span className="text-[11px] text-slate-500">
                        सत्यापन कोड: {item.qrVerificationId}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {item.medications?.map((med, mIdx) => (
                        <div
                          key={mIdx}
                          className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{med.saltName}</h4>
                              {med.genericCode && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  {med.genericCode}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                              {med.days} दिन
                            </span>
                          </div>

                          {/* Pictogram Dosage Summary */}
                          <div className="grid grid-cols-4 gap-1 text-center text-[10px] border-t border-slate-100 pt-2">
                            <div className="p-1 rounded bg-amber-50 text-amber-900 font-bold flex flex-col items-center">
                              <Sun className="w-3 h-3 text-amber-500 mb-0.5" />
                              <span>{med.morning ? `${med.morning}` : "—"}</span>
                            </div>
                            <div className="p-1 rounded bg-orange-50 text-orange-900 font-bold flex flex-col items-center">
                              <Sun className="w-3 h-3 text-orange-500 mb-0.5" />
                              <span>{med.noon ? `${med.noon}` : "—"}</span>
                            </div>
                            <div className="p-1 rounded bg-indigo-50 text-indigo-900 font-bold flex flex-col items-center">
                              <Moon className="w-3 h-3 text-indigo-500 mb-0.5" />
                              <span>{med.night ? `${med.night}` : "—"}</span>
                            </div>
                            <div className="p-1 rounded bg-emerald-50 text-emerald-900 font-bold flex flex-col items-center">
                              <Utensils className="w-3 h-3 text-emerald-600 mb-0.5" />
                              <span>{med.withFood ? "खाना" : "खाली"}</span>
                            </div>
                          </div>

                          {med.instructionsHi && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100 line-clamp-2">
                              {med.instructionsHi}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
