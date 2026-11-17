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
  Building2,
  Clock,
  Search,
  Filter,
  FileText,
  Printer,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  Pill,
  Sun,
  Moon,
  Utensils,
  RefreshCw,
  Eye,
  User,
  Users,
  Video,
  PhoneCall,
  Activity,
  MapPin,
  Sparkles,
} from "lucide-react";

export default function KioskHistoryPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "dispensed" | "prescribed" | "waiting">("ALL");
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
          console.error("[KioskHistory] Error reading patients:", err);
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
          console.error("[KioskHistory] Error reading prescriptions:", err);
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
          console.error("[KioskHistory] Error reading triagePackets:", err);
          return DEFAULT_TRIAGE_PACKETS;
        }
      },
      [],
      DEFAULT_TRIAGE_PACKETS
    ) ?? DEFAULT_TRIAGE_PACKETS;

  // Map prescriptions by patientId
  const rxMap = React.useMemo(() => {
    const map = new Map<number, Prescription>();
    for (const rx of prescriptions) {
      if (rx.patientId && !map.has(rx.patientId)) {
        map.set(rx.patientId, rx);
      }
    }
    return map;
  }, [prescriptions]);

  // Map triage packets by patientId
  const triageMap = React.useMemo(() => {
    const map = new Map<number, TriagePacket>();
    for (const tp of triagePackets) {
      if (tp.patientId && !map.has(tp.patientId)) {
        map.set(tp.patientId, tp);
      }
    }
    return map;
  }, [triagePackets]);

  // Combine full history record per patient
  const patientHistory = React.useMemo(() => {
    return patients.map((patient) => {
      const rx = patient.id ? rxMap.get(patient.id) : undefined;
      const triage = patient.id ? triageMap.get(patient.id) : undefined;
      return {
        patient,
        rx,
        triage,
        status: rx
          ? rx.status === "dispensed"
            ? "dispensed"
            : "prescribed"
          : "waiting",
      };
    });
  }, [patients, rxMap, triageMap]);

  // Villages list for filter
  const villages = React.useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => {
      if (p.village) set.add(p.village);
    });
    return Array.from(set);
  }, [patients]);

  // Filtered patient list
  const filteredList = React.useMemo(() => {
    return patientHistory.filter((item) => {
      // Status filter
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false;
      }
      // Village filter
      if (selectedVillage !== "ALL" && item.patient.village !== selectedVillage) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const pName = item.patient.name.toLowerCase();
        const pVillage = item.patient.village.toLowerCase();
        const pPhone = item.patient.phone.toLowerCase();
        const pAbha = (item.patient.abhaId || "").toLowerCase();
        const diag = (item.rx?.diagnosis || "").toLowerCase();
        const complaint = (item.triage?.chiefComplaint || "").toLowerCase();
        return (
          pName.includes(q) ||
          pVillage.includes(q) ||
          pPhone.includes(q) ||
          pAbha.includes(q) ||
          diag.includes(q) ||
          complaint.includes(q)
        );
      }
      return true;
    });
  }, [patientHistory, statusFilter, selectedVillage, searchQuery]);

  // Summary Metrics
  const totalPatients = patients.length;
  const dispensedTotal = prescriptions.filter((r) => r.status === "dispensed").length;
  const prescribedTotal = prescriptions.filter((r) => r.status === "prescribed").length;
  const criticalCases = triagePackets.filter((t) => t.priority === "RED").length;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
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
              href="/"
              className="min-h-[48px] min-w-[48px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="डैशबोर्ड पर वापस जाएँ"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>स्वास्थ्य केंद्र मरीज इतिहास (Kiosk Patient History)</span>
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                  {user?.stationOrDept || "रामपुर केंद्र"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                इस स्वास्थ्य केंद्र पर पंजीकृत, ट्राइएज किए गए व उपचार प्राप्त मरीजों का पूर्ण डिजिटल रिकॉर्ड
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Link
              href="/"
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>पंजीकरण व कतार (Queue)</span>
            </Link>
            <Link
              href="/kiosk/prescriptions"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>दवा पर्चा हब (Prescriptions)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex-1 space-y-6 overflow-x-hidden">
        {/* Metric Cards Banner */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">कुल पंजीकृत मरीज</span>
            <span className="text-2xl font-black text-slate-900 mt-1 block">{totalPatients}</span>
            <span className="text-[11px] text-emerald-600 font-medium">डिजिटल स्वास्थ्य रिकॉर्ड</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">दवा वितरित (Dispensed)</span>
            <span className="text-2xl font-black text-emerald-600 mt-1 block">{dispensedTotal}</span>
            <span className="text-[11px] text-emerald-700 font-medium">सफल औषधि वितरण</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">पर्चे तैयार (Prescribed)</span>
            <span className="text-2xl font-black text-blue-600 mt-1 block">{prescribedTotal}</span>
            <span className="text-[11px] text-blue-700 font-medium">प्रिंट हेतु तैयार</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">कवर किए गाँव (Villages)</span>
            <span className="text-2xl font-black text-slate-800 mt-1 block">{villages.length}</span>
            <span className="text-[11px] text-slate-500 font-medium">क्षेत्रीय पहुंच</span>
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
              placeholder="मरीज का नाम, मोबाइल नंबर, गाँव, आभा आईडी या लक्षण से खोजें..."
              className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setStatusFilter("ALL")}
                className={`min-h-[40px] px-3 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "ALL"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                सभी ({patientHistory.length})
              </button>
              <button
                onClick={() => setStatusFilter("dispensed")}
                className={`min-h-[40px] px-3 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "dispensed"
                    ? "bg-white text-emerald-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                दवा दी गई ({dispensedTotal})
              </button>
              <button
                onClick={() => setStatusFilter("prescribed")}
                className={`min-h-[40px] px-3 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === "prescribed"
                    ? "bg-white text-blue-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                पर्चे तैयार ({prescribedTotal})
              </button>
            </div>

            {villages.length > 0 && (
              <select
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:border-emerald-600"
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

        {/* Patients History Records List */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredList.length === 0 ? (
            <div className="text-center py-20 px-4 text-slate-400 space-y-3">
              <Users className="w-12 h-12 mx-auto text-emerald-600 opacity-30" />
              <h3 className="text-sm font-bold text-slate-700">कोई मरीज इतिहास रिकॉर्ड नहीं मिला</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "ALL" || selectedVillage !== "ALL"
                  ? "दिए गए फ़िल्टर से कोई मेल नहीं मिला। कृपया अपनी खोज बदलें।"
                  : "इस स्वास्थ्य केंद्र पर कोई मरीज दर्ज नहीं है।"}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 min-h-[48px] px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors"
              >
                <User className="w-4 h-4" />
                <span>नया मरीज पंजीकृत करें</span>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredList.map((item) => (
                <div
                  key={item.patient.id}
                  className="p-4 sm:p-6 hover:bg-slate-50/60 transition-colors space-y-4"
                >
                  {/* Top Bar: Demographics & Status */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {item.patient.gender === "Female" ? "F" : "M"}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base font-bold text-slate-900 leading-tight">
                            {item.patient.name}
                          </h2>
                          <span className="text-xs text-slate-500 font-medium">
                            {item.patient.age} वर्ष • {item.patient.gender === "Female" ? "महिला" : "पुरुष"}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold border border-slate-200">
                            गाँव: {item.patient.village}
                          </span>
                          {item.patient.abhaId && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[11px] font-semibold border border-emerald-200">
                              ABHA: {item.patient.abhaId}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            पंजीकरण: {new Date(item.patient.createdAt).toLocaleDateString("hi-IN")}
                          </span>
                          <span>•</span>
                          <span>मोबाईल: {item.patient.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge & Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-center shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          item.status === "dispensed"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : item.status === "prescribed"
                            ? "bg-blue-100 text-blue-800 border border-blue-200"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {item.status === "dispensed" ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                            <span>दवा वितरित</span>
                          </>
                        ) : item.status === "prescribed" ? (
                          <>
                            <FileText className="w-3.5 h-3.5 text-blue-700" />
                            <span>पर्चा उपलब्ध</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-slate-600" />
                            <span>कतार में</span>
                          </>
                        )}
                      </span>

                      {item.rx ? (
                        <>
                          <Link
                            href={`/kiosk/prescriptions?patientId=${item.patient.id}`}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5"
                          >
                            <Eye className="w-4 h-4 text-emerald-600" />
                            <span>पर्चा व चैट</span>
                          </Link>

                          <Link
                            href={`/kiosk/prescriptions?patientId=${item.patient.id}`}
                            className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <Printer className="w-4 h-4" />
                            <span>प्रिंट रिकॉर्ड</span>
                          </Link>
                        </>
                      ) : (
                        <Link
                          href={`/triage/${item.patient.id}`}
                          className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                        >
                          <Video className="w-4 h-4" />
                          <span>परामर्श शुरू करें</span>
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Clinical Triage & Diagnosis Summary */}
                  <div className="bg-slate-50/80 rounded-xl p-3.5 border border-slate-200/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                    {/* Triage Complaint & Vitals */}
                    <div className="md:col-span-6 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">मुख्य लक्षण (Complaint):</span>
                        {item.triage?.priority && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              item.triage.priority === "RED"
                                ? "bg-rose-100 text-rose-800"
                                : item.triage.priority === "YELLOW"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.triage.priority}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-700 font-medium">
                        {item.triage?.chiefComplaint || "सामान्य स्वास्थ्य जांच"}
                      </p>
                      <div className="flex items-center gap-2.5 text-slate-500 font-semibold text-[11px] pt-0.5">
                        <span>BP: {item.triage?.bloodPressure || "120/80"}</span>
                        <span>•</span>
                        <span>SpO2: {item.triage?.spo2 ? `${item.triage.spo2}%` : "98%"}</span>
                        <span>•</span>
                        <span>Pulse: {item.triage?.pulse ? `${item.triage.pulse} bpm` : "76 bpm"}</span>
                      </div>
                    </div>

                    {/* Doctor Diagnosis */}
                    <div className="md:col-span-6 border-t md:border-t-0 md:border-l border-slate-200/80 pt-2 md:pt-0 md:pl-4 text-xs space-y-1">
                      <span className="font-bold text-slate-900 block">
                        चिकित्सकीय निदान (Doctor Diagnosis):
                      </span>
                      {item.rx ? (
                        <>
                          <p className="font-bold text-emerald-950 text-sm">{item.rx.diagnosis}</p>
                          <p className="text-[11px] text-slate-500">
                            परामर्शदाता: {item.rx.doctorName} • {item.rx.medications.length} दवाएं निर्धारित
                          </p>
                        </>
                      ) : (
                        <p className="text-slate-400 italic">
                          डॉक्टर परामर्श प्रतीक्षारत है।
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Medicines summary preview if prescribed */}
                  {item.rx && item.rx.medications.length > 0 && (
                    <div className="pt-1">
                      <span className="text-[11px] font-bold text-slate-600 block mb-1.5">
                        निर्धारित जेनेरिक दवाएं (Prescribed Medicines):
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {item.rx.medications.map((m, mIdx) => (
                          <span
                            key={mIdx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 shadow-2xs"
                          >
                            <Pill className="w-3.5 h-3.5 text-emerald-600" />
                            <strong>{m.saltName}</strong>
                            <span className="text-slate-500 text-[10px]">({m.days} दिन)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
