"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Patient, Prescription, PrescribedMedicationItem, ChatMessage, DEFAULT_PATIENTS } from "@/lib/db";
import {
  FileText,
  Printer,
  Search,
  Sun,
  Moon,
  Utensils,
  CheckCircle2,
  QrCode,
  HeartPulse,
  Building2,
  Calendar,
  User,
  Clock,
  ArrowLeft,
  Sparkles,
  RefreshCw,
  PhoneCall,
  Check,
  MessageSquare
} from "lucide-react";

function PrescriptionsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const patientParamId = searchParams.get("patientId");

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRxId, setSelectedRxId] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    console.log("[PrescriptionsArchive] Prescriptions archive view mounted.");
    setMounted(true);
  }, []);

  // Safety fallback for mobile browser loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted((prev) => {
        if (!prev) {
          console.warn("[PrescriptionsArchive] Safety timer forced mounted=true");
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
          console.error("[PrescriptionsArchive] Dexie error reading patients, falling back to defaults:", err);
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
          console.error("[PrescriptionsArchive] Dexie error reading prescriptions, returning empty array:", err);
          return [];
        }
      },
      [],
      []
    ) ?? [];

  const patientMap = React.useMemo(() => {
    const map = new Map<number, Patient>();
    for (const p of patients) {
      if (p.id) map.set(p.id, p);
    }
    return map;
  }, [patients]);

  const prescriptionsWithPatient = React.useMemo(() => {
    return prescriptions.map((rx) => ({
      ...rx,
      patient: patientMap.get(rx.patientId),
    }));
  }, [prescriptions, patientMap]);

  // If patientId is specified in query param, auto-select their rx
  useEffect(() => {
    if (patientParamId && prescriptionsWithPatient.length > 0) {
      const match = prescriptionsWithPatient.find(
        (rx) => rx.patientId === Number(patientParamId)
      );
      if (match?.id) {
        setSelectedRxId(match.id);
      }
    } else if (selectedRxId === null && prescriptionsWithPatient.length > 0) {
      setSelectedRxId(prescriptionsWithPatient[0].id || null);
    }
  }, [patientParamId, prescriptionsWithPatient, selectedRxId]);

  const filteredPrescriptions = prescriptionsWithPatient.filter((rx) => {
    const pName = rx.patient?.name || "";
    const village = rx.patient?.village || "";
    const diag = rx.diagnosis || "";
    const q = searchQuery.toLowerCase();
    return (
      pName.toLowerCase().includes(q) ||
      village.toLowerCase().includes(q) ||
      diag.toLowerCase().includes(q) ||
      rx.qrVerificationId.toLowerCase().includes(q)
    );
  });

  const selectedRx =
    prescriptionsWithPatient.find((rx) => rx.id === selectedRxId) ||
    filteredPrescriptions[0];

  const chatMessages =
    useLiveQuery(
      async () => {
        if (!selectedRx?.patientId || !db.chatMessages) return [];
        try {
          const pId = selectedRx.patientId;
          const targetRoomIds = [
            `consult-room-${pId}`,
            `patient-${pId}`,
            String(pId),
            `room-${pId}`,
          ];
          const list = await db.chatMessages
            .where("roomId")
            .anyOf(targetRoomIds)
            .sortBy("timestamp");
          if (list && list.length > 0) return list;

          // Fallback: check any message whose roomId contains patient id
          const all = await db.chatMessages.toArray();
          return all.filter((m) => m.roomId && m.roomId.includes(String(pId)));
        } catch (err) {
          console.error("[PrescriptionsArchive] Error reading chatMessages:", err);
          return [];
        }
      },
      [selectedRx?.patientId],
      []
    ) ?? [];

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleMarkDispensed = async (rxId?: number) => {
    if (!rxId) return;
    try {
      await db.prescriptions.update(rxId, { status: "dispensed" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeedSampleRx = async () => {
    try {
      let pId = 1;
      if (patients.length === 0) {
        pId = Number(
          await db.patients.add({
            name: "शांति देवी (Shanti Devi)",
            age: 52,
            gender: "Female",
            village: "रामपुर (Rampur)",
            phone: "9876543210",
            abhaId: "91-4521-8942-1049",
            createdAt: new Date().toISOString(),
          })
        );
      } else if (patients[0].id) {
        pId = patients[0].id;
      }

      await db.prescriptions.add({
        patientId: pId,
        doctorId: "DOC-7842",
        doctorName: "Dr. Rajesh Sharma, MD",
        diagnosis: "तीव्र ब्रोंकाइटिस व मौसमी बुखार (Acute Bronchitis)",
        medications: [
          {
            saltName: "Paracetamol (500mg)",
            genericCode: "GEN-01",
            morning: 1,
            noon: 0,
            night: 1,
            withFood: true,
            days: 5,
            instructionsHi: "भोजन के बाद गर्म पानी से लें।",
          },
          {
            saltName: "Amoxicillin (500mg)",
            genericCode: "GEN-02",
            morning: 1,
            noon: 0,
            night: 1,
            withFood: true,
            days: 5,
            instructionsHi: "सुबह व रात खाने के बाद पूरा 5 दिन का कोर्स लें।",
          },
          {
            saltName: "Cetirizine (10mg)",
            genericCode: "GEN-05",
            morning: 0,
            noon: 0,
            night: 1,
            withFood: false,
            days: 3,
            instructionsHi: "रात में सोने से पहले लें।",
          },
        ],
        instructionsHi: "पर्याप्त गुनगुना पानी पिएं। ठंडी चीजों से परहेज रखें और 5 दिन बाद जांच करवाएं।",
        instructionsEn: "Drink warm fluids, rest well.",
        qrVerificationId: `RX-${Date.now()}-${pId}`,
        status: "prescribed",
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          लोड हो रहा है...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 flex flex-col font-sans pb-10 overflow-x-hidden w-full max-w-full print:bg-white print:p-0 print:m-0">
      {/* Explicit Print Optimization Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
          html, body {
            background: white !important;
            color: black !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          header, nav, aside, button, .print\\:hidden {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Action Header (Hidden in Print) */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 print:hidden w-full">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="डैशबोर्ड पर वापस जाएं"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <span>दवा पर्चा व प्रिंट हब (Prescription & Print)</span>
              </h1>
              <p className="text-xs text-slate-500">
                डॉक्टरों द्वारा जारी अंतिम ई-प्रिस्क्रिप्शन देखें और मरीज के लिए प्रिंट करें
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handlePrint}
              disabled={!selectedRx}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Record (पर्चा व रिकॉर्ड प्रिंट करें)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start overflow-x-hidden print:block print:w-full print:max-w-none print:p-0 print:m-0">
        {/* Left Column (5 cols): Prescription List & Search (Hidden in Print) */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 print:hidden flex flex-col min-h-[580px]">
          <div className="pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-slate-900">
                प्राप्त पर्चे ({prescriptionsWithPatient.length})
              </h2>
              <span className="text-[11px] text-slate-500">डॉक्टरों द्वारा जारी</span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="मरीज का नाम या गाँव खोजें..."
                className="w-full min-h-[48px] pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-base focus:bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* List of Prescriptions */}
          <div className="space-y-2 flex-1 overflow-y-auto max-h-[500px] pr-1">
            {filteredPrescriptions.length === 0 ? (
              <div className="text-center py-16 text-slate-400 space-y-3">
                <FileText className="w-10 h-10 mx-auto opacity-30 text-emerald-600" />
                <p className="text-xs font-semibold text-slate-600">कोई दवा पर्चा उपलब्ध नहीं है</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  डॉक्टर द्वारा टेली-कंसल्टेशन के बाद जारी किया गया पर्चा यहाँ स्वतः दिखाई देगा।
                </p>
                <button
                  onClick={handleSeedSampleRx}
                  className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 inline-flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+ नमूना पर्चा लोड करें (Sample Rx)</span>
                </button>
              </div>
            ) : (
              filteredPrescriptions.map((rx) => {
                const isSelected = selectedRx?.id === rx.id;
                return (
                  <div
                    key={rx.id}
                    onClick={() => rx.id && setSelectedRxId(rx.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50/40 shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <span>{rx.patient?.name || `Patient #${rx.patientId}`}</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            ({rx.patient?.age} वर्ष, {rx.patient?.village})
                          </span>
                        </h3>
                        <p className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                          {rx.diagnosis}
                        </p>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          rx.status === "dispensed"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        }`}
                      >
                        {rx.status === "dispensed" ? "दवा दी गई" : "सत्यापित"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 pt-2 border-t border-slate-100">
                      <span>{rx.medications.length} दवाएं • {rx.doctorName}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rx.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Column (7 cols): Final Printable Prescription Card */}
        <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 print:border-none print:shadow-none print:p-0 print:col-span-12 print:w-full print:max-w-none print:m-0">
          {selectedRx ? (
            <div className="space-y-5">
              {/* Slip Header */}
              <div className="border-b-2 border-slate-900 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                      <HeartPulse className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight">
                        आरोग्य संगम • डिजिटल ई-प्रिस्क्रिप्शन
                      </h2>
                      <p className="text-xs text-slate-600 font-medium">
                        {user?.stationOrDept || "रामपुर प्राथमिक स्वास्थ्य केंद्र"} • ग्रामीण टेलीमेडिसिन सेवा
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-xs">
                    <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      ✓ डिजिटल हस्ताक्षरित
                    </span>
                    <p className="text-slate-500 text-[11px] mt-1">
                      दिनांक: {new Date(selectedRx.createdAt).toLocaleDateString("hi-IN")}
                    </p>
                  </div>
                </div>

                {/* Patient Demographics */}
                <div className="mt-4 p-3.5 bg-slate-50 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700 border border-slate-200">
                  <div>
                    <span className="text-slate-400 text-[10px] block">मरीज (Patient):</span>
                    <span className="font-bold text-slate-900">{selectedRx.patient?.name || "शांति देवी"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">उम्र व लिंग:</span>
                    <span className="font-bold text-slate-900">
                      {selectedRx.patient ? `${selectedRx.patient.age} वर्ष / ${selectedRx.patient.gender === "Female" ? "महिला" : "पुरुष"}` : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">गाँव व केंद्र:</span>
                    <span className="font-bold text-slate-900">{selectedRx.patient?.village || "रामपुर"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">आभा आईडी (ABHA):</span>
                    <span className="font-bold text-slate-900">{selectedRx.patient?.abhaId || "91-4521-8942"}</span>
                  </div>
                </div>

                {/* Diagnosis Strip */}
                <div className="mt-3 p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-200 text-xs">
                  <span className="font-bold text-emerald-950">रोग निदान (Diagnosis): </span>
                  <span className="font-semibold text-emerald-800">{selectedRx.diagnosis}</span>
                </div>
              </div>

              {/* Pictogram Dosage Schedule */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    दवा सेवन की सचित्र अनुसूची (Dosage Schedule with Pictograms)
                  </h3>
                  <span className="text-[11px] text-slate-400 print:hidden">
                    कम साक्षरता वाले मरीजों के लिए सचित्र संकेत
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedRx.medications.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{item.saltName}</h4>
                          <p className="text-[11px] text-slate-500 font-medium">
                            जेनेरिक साल्ट • औषधि केंद्र
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
                          {item.days} दिन तक
                        </span>
                      </div>

                      {/* 4 Pictogram Columns */}
                      <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 pt-2.5">
                        {/* Morning */}
                        <div className="p-2 rounded-lg bg-amber-50/80 border border-amber-200 flex flex-col items-center">
                          <Sun className="w-4 h-4 text-amber-500 mb-1" />
                          <span className="text-[11px] font-bold text-amber-900">सुबह</span>
                          <span className="text-sm font-extrabold text-slate-900 mt-0.5">
                            {item.morning === 0 ? "—" : `${item.morning} गोली`}
                          </span>
                        </div>

                        {/* Noon */}
                        <div className="p-2 rounded-lg bg-orange-50/80 border border-orange-200 flex flex-col items-center">
                          <Sun className="w-4 h-4 text-orange-500 mb-1" />
                          <span className="text-[11px] font-bold text-orange-900">दोपहर</span>
                          <span className="text-sm font-extrabold text-slate-900 mt-0.5">
                            {item.noon === 0 ? "—" : `${item.noon} गोली`}
                          </span>
                        </div>

                        {/* Night */}
                        <div className="p-2 rounded-lg bg-indigo-50/80 border border-indigo-200 flex flex-col items-center">
                          <Moon className="w-4 h-4 text-indigo-500 mb-1" />
                          <span className="text-[11px] font-bold text-indigo-900">रात</span>
                          <span className="text-sm font-extrabold text-slate-900 mt-0.5">
                            {item.night === 0 ? "—" : `${item.night} गोली`}
                          </span>
                        </div>

                        {/* Meal */}
                        <div className="p-2 rounded-lg bg-emerald-50/80 border border-emerald-200 flex flex-col items-center">
                          <Utensils className="w-4 h-4 text-emerald-600 mb-1" />
                          <span className="text-[11px] font-bold text-emerald-900">भोजन</span>
                          <span className="text-xs font-bold text-slate-900 mt-0.5">
                            {item.withFood ? "खाना खाकर" : "खाली पेट"}
                          </span>
                        </div>
                      </div>

                      {item.instructionsHi && (
                        <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-lg border border-slate-200">
                          💡 <strong>निर्देश:</strong> {item.instructionsHi}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor General Advice */}
              {selectedRx.instructionsHi && (
                <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 text-xs space-y-1">
                  <p className="font-bold text-blue-950">चिकित्सक सलाह व निर्देश (General Advice):</p>
                  <p className="text-blue-900">{selectedRx.instructionsHi}</p>
                </div>
              )}

              {/* Consultation Chat Transcript & Medical Record Log */}
              <div className="mt-5 pt-4 border-t-2 border-slate-200">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-emerald-600 print:text-slate-800 shrink-0" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      टेली-परामर्श चैट प्रतिलेख व संवाद रिकॉर्ड (Consultation Chat Transcript & Record)
                    </h3>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium print:text-slate-600">
                    {chatMessages.length > 0 ? `${chatMessages.length} संदेश दर्ज` : "सत्र रिकॉर्ड"}
                  </span>
                </div>

                {chatMessages.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 print:border-slate-300 print:bg-white print:text-slate-600">
                    इस परामर्श सत्र के दौरान कोई अतिरिक्त चैट संदेश दर्ज नहीं किया गया।
                  </div>
                ) : (
                  <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50 print:bg-white print:border-slate-300">
                    {chatMessages.map((msg, idx) => {
                      const isDoc = msg.senderRole === "doctor";
                      return (
                        <div
                          key={msg.id || idx}
                          className={`p-2.5 rounded-lg border text-xs ${
                            isDoc
                              ? "bg-blue-50/80 border-blue-200 text-slate-800"
                              : "bg-emerald-50/80 border-emerald-200 text-slate-800"
                          } print:bg-white print:border-slate-300`}
                        >
                          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1 pb-1 border-b border-slate-200/50">
                            <span className="font-bold flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isDoc ? "bg-blue-600" : "bg-emerald-600"
                                } print:bg-slate-700`}
                              />
                              {isDoc ? "विशेषज्ञ डॉक्टर (Doctor Hub)" : "आशा स्वास्थ्य केंद्र (ASHA Kiosk)"}
                            </span>
                            <span>
                              {new Date(msg.timestamp).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs font-medium text-slate-900 leading-relaxed whitespace-pre-wrap">
                            {msg.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Slip Footer: QR & Doctor Signature */}
              <div className="mt-6 pt-4 border-t-2 border-slate-200 flex items-end justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 border border-slate-300 rounded-lg p-1 flex items-center justify-center bg-slate-50 shrink-0">
                    <QrCode className="w-11 h-11 text-slate-900" />
                  </div>
                  <div className="text-[11px] text-slate-500 space-y-0.5">
                    <p className="font-bold text-slate-800">सत्यापन कोड: {selectedRx.qrVerificationId}</p>
                    <p>निकटतम जन औषधि केंद्र से कम कीमत पर जेनेरिक दवाएं प्राप्त करें</p>
                    <p className="text-[10px] text-emerald-700 font-semibold">स्वास्थ्य केंद्र द्वारा सत्यापित व मुद्रित</p>
                  </div>
                </div>

                <div className="text-right text-xs">
                  <p className="font-black text-slate-900 text-sm">{selectedRx.doctorName}</p>
                  <p className="text-[11px] text-slate-500">रिमोट विशेषज्ञ (Internal Medicine)</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">पंजीकरण संख्या: MCI-7842-DL</p>
                </div>
              </div>

              {/* Bottom Print and Handover Toolbar (Hidden in Print) */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 print:hidden">
                <button
                  onClick={() => handleMarkDispensed(selectedRx.id)}
                  className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedRx.status === "dispensed"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{selectedRx.status === "dispensed" ? "दवा सौंपी जा चुकी है" : "मरीज को दवा सौंपी"}</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="min-h-[48px] px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Record (पर्चा व रिकॉर्ड प्रिंट करें)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-24 text-slate-400 space-y-2">
              <Printer className="w-12 h-12 mx-auto opacity-30 text-emerald-600" />
              <p className="text-sm font-bold text-slate-600">कोई पर्चा चयनित नहीं है</p>
              <p className="text-xs">बाईं सूची से किसी भी मरीज के पर्चे पर क्लिक करें।</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function KioskPrescriptionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            लोड हो रहा है...
          </div>
        </div>
      }
    >
      <PrescriptionsContent />
    </Suspense>
  );
}
