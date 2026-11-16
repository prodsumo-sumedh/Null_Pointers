"use client";

import React, { useState, useEffect, use, Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Patient, Prescription, PrescribedMedicationItem, DEFAULT_PATIENTS } from "@/lib/db";
import { GENERIC_FORMULARY, GenericDrug } from "@/lib/janAushadhiFormulary";
import {
  FileText,
  Printer,
  Plus,
  Trash2,
  Search,
  Sun,
  Moon,
  Utensils,
  CheckCircle2,
  ArrowLeft,
  QrCode,
  HeartPulse,
  RefreshCw
} from "lucide-react";

function RxBuilderContent({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const patientIdNum = parseInt(unwrappedParams.id, 10) || 1;
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMedications, setSelectedMedications] = useState<PrescribedMedicationItem[]>([]);
  const [diagnosis, setDiagnosis] = useState("");
  const [doctorNotes, setDoctorNotes] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const fallbackPatient = DEFAULT_PATIENTS.find((p) => p.id === patientIdNum) || DEFAULT_PATIENTS[0];

  useEffect(() => {
    console.log("[RxBuilderContent] Prescription builder mounted for patientId:", patientIdNum);
    setMounted(true);
  }, [patientIdNum]);

  // Safety fallback for mobile browser loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted((prev) => {
        if (!prev) {
          console.warn("[RxBuilderContent] Safety timer forced mounted=true");
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
        console.error("[RxBuilderContent] Dexie error reading patient, using fallback:", err);
        return fallbackPatient;
      }
    },
    [patientIdNum],
    fallbackPatient
  ) ?? fallbackPatient;

  // Search generic drugs
  const filteredDrugs = GENERIC_FORMULARY.filter(
    (drug) =>
      drug.saltName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drug.brandAlternatives.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase())) ||
      drug.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddDrug = (drug: GenericDrug) => {
    const newItem: PrescribedMedicationItem = {
      saltName: `${drug.saltName} (${drug.strength})`,
      genericCode: drug.genericCode,
      morning: drug.defaultMorning,
      noon: drug.defaultNoon,
      night: drug.defaultNight,
      withFood: drug.defaultWithFood,
      days: drug.defaultDays,
      instructionsHi: drug.instructionsHi,
    };
    setSelectedMedications((prev) => [...prev, newItem]);
    setSearchQuery("");
  };

  const handleAddCustomDrug = (customName?: string) => {
    const medName = (customName || searchQuery).trim();
    if (!medName) return;

    const newItem: PrescribedMedicationItem = {
      saltName: medName,
      genericCode: "CUSTOM",
      morning: 1,
      noon: 0,
      night: 1,
      withFood: true,
      days: 5,
      instructionsHi: "भोजन के बाद लें।",
    };
    setSelectedMedications((prev) => [...prev, newItem]);
    setSearchQuery("");
  };

  const handleRemoveDrug = (index: number) => {
    setSelectedMedications((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateDose = (
    index: number,
    field: "morning" | "noon" | "night" | "days" | "withFood",
    value: number | boolean
  ) => {
    setSelectedMedications((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSavePrescription = async () => {
    try {
      const rx: Prescription = {
        patientId: patientIdNum,
        doctorId: user?.role === "doctor" ? user.id : "doc-01",
        doctorName: user?.role === "doctor" ? user.name : "Dr. Rajesh Sharma, MD",
        diagnosis,
        medications: selectedMedications,
        instructionsHi: doctorNotes,
        instructionsEn: "Drink plenty of fluids. Rest well.",
        qrVerificationId: `RX-${Date.now()}-${patientIdNum}`,
        status: "prescribed",
        createdAt: new Date().toISOString(),
      };
      await db.prescriptions.add(rx);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans pb-10">
      {/* Action Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={user?.role === "kiosk" ? "/" : "/doctor"}
              className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>प्रिस्क्रिप्शन (Prescription)</span>
              </h1>
              <p className="text-xs text-slate-500">
                मरीज के लिए सचित्र दवा पर्चा तैयार करें
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={handleSavePrescription}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaved ? "सहेजा गया!" : "पर्चा सहेजें"}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>प्रिंट करें (Print)</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5 cols): Drug Search & Dose Editor (Hidden in Print) */}
        <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5 print:hidden space-y-4">
          <div className="pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5 mb-1">
              <Search className="w-4 h-4 text-emerald-600" />
              <span>दवा खोजें (Search Medicine)</span>
            </h2>
            <p className="text-xs text-slate-500">
              जेनेरिक दवा या सामान्य ब्रांड नाम लिखें (जैसे Paracetamol, Dolo, Augmentin)
            </p>

            <div className="mt-2.5 flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomDrug();
                    }
                  }}
                  placeholder="दवा का नाम लिखें या खोजें..."
                  className="w-full min-h-[48px] pl-10 pr-3.5 rounded-xl border border-slate-200 text-base focus:border-slate-800 bg-slate-50/50"
                />
              </div>

              <button
                type="button"
                onClick={() => handleAddCustomDrug()}
                disabled={!searchQuery.trim()}
                className="min-h-[48px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                title="Type any medicine name and add directly to prescription"
              >
                <Plus className="w-4 h-4" />
                <span>+ जोड़ें</span>
              </button>
            </div>

            {/* Suggestions Dropdown */}
            {searchQuery.trim() && (
              <div className="mt-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg bg-white shadow-md divide-y divide-slate-100">
                {/* Always provide option to add the custom typed name */}
                <div
                  onClick={() => handleAddCustomDrug()}
                  className="p-2.5 bg-emerald-50/70 hover:bg-emerald-100 cursor-pointer text-xs text-emerald-900 transition-colors flex items-center justify-between font-medium"
                >
                  <span className="flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>सीधे जोड़ें: <strong className="font-bold underline">{searchQuery.trim()}</strong></span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-semibold">
                    नई दवा
                  </span>
                </div>

                {filteredDrugs.length > 0 &&
                  filteredDrugs.map((drug) => (
                    <div
                      key={drug.id}
                      onClick={() => handleAddDrug(drug)}
                      className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs transition-colors flex items-center justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-900">{drug.saltName} ({drug.strength})</p>
                        <p className="text-[11px] text-slate-500">
                          सामान्य ब्रांड: {drug.brandAlternatives.join(", ")}
                        </p>
                      </div>
                      <span className="p-1 rounded bg-slate-100 text-slate-700 hover:bg-emerald-600 hover:text-white transition-colors">
                        <Plus className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Diagnosis & Advice Fields */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                रोग निदान (Diagnosis)
              </label>
              <input
                type="text"
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="जैसे Acute Bronchitis, Viral Fever..."
                className="w-full min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-base bg-slate-50/50 focus:border-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                मरीज के लिए सलाह (Doctor Notes)
              </label>
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                rows={3}
                placeholder="खुराक संबंधी विशेष निर्देश या सलाह..."
                className="w-full p-3 rounded-xl border border-slate-200 text-base bg-slate-50/50 focus:border-slate-800 resize-none"
              />
            </div>
          </div>

          {/* Selected Medicines Editor */}
          <div>
            <h3 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-2">
              चयनित दवाएं ({selectedMedications.length})
            </h3>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
              {selectedMedications.map((item, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-slate-900">{item.saltName}</p>
                    <button
                      onClick={() => handleRemoveDrug(idx)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Doses */}
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">सुबह</span>
                      <select
                        value={item.morning}
                        onChange={(e) => handleUpdateDose(idx, "morning", parseFloat(e.target.value))}
                        className="w-full h-7 rounded border border-slate-200 bg-white text-xs font-bold text-center"
                      >
                        <option value={0}>0</option>
                        <option value={0.5}>½</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">दोपहर</span>
                      <select
                        value={item.noon}
                        onChange={(e) => handleUpdateDose(idx, "noon", parseFloat(e.target.value))}
                        className="w-full h-7 rounded border border-slate-200 bg-white text-xs font-bold text-center"
                      >
                        <option value={0}>0</option>
                        <option value={0.5}>½</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">रात</span>
                      <select
                        value={item.night}
                        onChange={(e) => handleUpdateDose(idx, "night", parseFloat(e.target.value))}
                        className="w-full h-7 rounded border border-slate-200 bg-white text-xs font-bold text-center"
                      >
                        <option value={0}>0</option>
                        <option value={0.5}>½</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-500 block mb-0.5">दिन</span>
                      <input
                        type="number"
                        min="1"
                        max="90"
                        value={item.days}
                        onChange={(e) => handleUpdateDose(idx, "days", parseInt(e.target.value, 10) || 1)}
                        className="w-full h-7 rounded border border-slate-200 bg-white text-xs font-bold text-center"
                      />
                    </div>
                  </div>

                  {/* Food Timing */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/80">
                    <span className="text-[11px] text-slate-600">भोजन समय:</span>
                    <button
                      type="button"
                      onClick={() => handleUpdateDose(idx, "withFood", !item.withFood)}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
                        item.withFood
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                          : "bg-amber-50 text-amber-800 border-amber-200"
                      }`}
                    >
                      {item.withFood ? "खाना खाकर (After Food)" : "खाली पेट (Before Food)"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column (7 cols): Clean Printable Prescription Slip */}
        <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-6 print:border-none print:shadow-none print:p-0 print:col-span-12">
          {/* Slip Header */}
          <div className="border-b border-slate-200 pb-4 mb-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    डिजिटल ई-प्रिस्क्रिप्शन (e-Prescription)
                  </h2>
                  <p className="text-xs text-slate-500">
                    ग्रामीण टेलीमेडिसिन सेवा • स्वास्थ्य केंद्र
                  </p>
                </div>
              </div>

              <div className="text-right text-xs">
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                  सत्यापित
                </span>
                <p className="text-slate-400 text-[11px] mt-1">
                  दिनांक: {new Date().toLocaleDateString("hi-IN")}
                </p>
              </div>
            </div>

            {/* Patient Demographic Strip */}
            <div className="mt-3.5 p-3 bg-slate-50 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-700 border border-slate-100">
              <div>
                <span className="text-slate-400 text-[11px] block">मरीज (Patient):</span>
                <span className="font-semibold text-slate-900">{patient?.name || "मरीज रिकॉर्ड नहीं मिला"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">उम्र व लिंग:</span>
                <span className="font-semibold text-slate-900">
                  {patient ? `${patient.age} वर्ष / ${patient.gender === "Female" ? "महिला" : "पुरुष"}` : "—"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">गाँव:</span>
                <span className="font-semibold text-slate-900">{patient?.village || "—"}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[11px] block">आभा (ABHA):</span>
                <span className="font-semibold text-slate-900">{patient?.abhaId || "—"}</span>
              </div>
            </div>

            <div className="mt-2.5 text-xs">
              <span className="font-semibold text-slate-600">निदान (Diagnosis): </span>
              <span className="font-bold text-slate-900">{diagnosis || "—"}</span>
            </div>
          </div>

          {/* Pictogram Schedule */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              दवा सेवन की सचित्र अनुसूची (Dosage Schedule)
            </h3>

            {selectedMedications.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-medium text-slate-600">पर्चे में अभी कोई दवा नहीं जोड़ी गई है</p>
                <p className="text-[11px] text-slate-400 mt-0.5">बाईं तरफ सर्च बॉक्स में दवा का नाम लिखें या खोजें और &quot;+ जोड़ें&quot; दबाएं।</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {selectedMedications.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-200 bg-white shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.saltName}</h4>
                      <p className="text-[11px] text-slate-400 font-medium">
                        कोड: {item.genericCode || "GEN-01"}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-semibold">
                      {item.days} दिन तक
                    </span>
                  </div>

                  {/* 4 Pictogram Columns */}
                  <div className="grid grid-cols-4 gap-2 text-center border-t border-slate-100 pt-2.5">
                    {/* Morning */}
                    <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-100 flex flex-col items-center">
                      <Sun className="w-4 h-4 text-amber-500 mb-1" />
                      <span className="text-[11px] font-medium text-amber-900">सुबह</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">
                        {item.morning === 0 ? "—" : `${item.morning} गोली`}
                      </span>
                    </div>

                    {/* Noon */}
                    <div className="p-2 rounded-lg bg-orange-50/70 border border-orange-100 flex flex-col items-center">
                      <Sun className="w-4 h-4 text-orange-500 mb-1" />
                      <span className="text-[11px] font-medium text-orange-900">दोपहर</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">
                        {item.noon === 0 ? "—" : `${item.noon} गोली`}
                      </span>
                    </div>

                    {/* Night */}
                    <div className="p-2 rounded-lg bg-indigo-50/70 border border-indigo-100 flex flex-col items-center">
                      <Moon className="w-4 h-4 text-indigo-500 mb-1" />
                      <span className="text-[11px] font-medium text-indigo-900">रात</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5">
                        {item.night === 0 ? "—" : `${item.night} गोली`}
                      </span>
                    </div>

                    {/* Meal */}
                    <div className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 flex flex-col items-center">
                      <Utensils className="w-4 h-4 text-emerald-600 mb-1" />
                      <span className="text-[11px] font-medium text-emerald-900">भोजन</span>
                      <span className="text-xs font-semibold text-slate-900 mt-0.5">
                        {item.withFood ? "खाना खाकर" : "खाली पेट"}
                      </span>
                    </div>
                  </div>

                  {item.instructionsHi && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">
                      💡 {item.instructionsHi}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

          {/* Slip Footer */}
          <div className="mt-5 pt-4 border-t border-slate-200 flex items-end justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-12 h-12 border border-slate-300 rounded p-1 flex items-center justify-center bg-slate-50">
                <QrCode className="w-9 h-9 text-slate-800" />
              </div>
              <div className="text-[11px] text-slate-500">
                <p className="font-semibold text-slate-800">सत्यापन कोड (Digital Verified)</p>
                <p>दवा केंद्र से जेनेरिक दवाएं प्राप्त करें</p>
              </div>
            </div>

            <div className="text-right text-xs">
              <p className="font-bold text-slate-900">{user?.role === "doctor" ? user.name : "Dr. Rajesh Sharma, MD"}</p>
              <p className="text-[11px] text-slate-500">{user?.role === "doctor" ? user.stationOrDept : "रिमोट विशेषज्ञ (Internal Medicine)"}</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function VisualPrescriptionBuilder({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            प्रिस्क्रिप्शन लोड हो रहा है...
          </div>
        </div>
      }
    >
      <RxBuilderContent params={params} />
    </Suspense>
  );
}
