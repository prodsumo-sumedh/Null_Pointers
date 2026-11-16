"use client";

import React, { useState, useEffect, useId, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import PortalSelection from "@/components/PortalSelection";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Patient, TriagePacket, DEFAULT_PATIENTS, DEFAULT_TRIAGE_PACKETS } from "@/lib/db";
import { VERNACULAR_TRIAGE_KNOWLEDGE, VernacularSymptom } from "@/lib/vernacularTriage";
import {
  UserPlus,
  Users,
  Clock,
  CheckCircle2,
  Phone,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Search,
  Filter,
  Stethoscope,
  Mic,
  MicOff,
  Volume2,
  Video,
  FileText,
  Activity,
  Plus,
  Printer
} from "lucide-react";

export default function HealthStationDashboard() {
  const formId = useId();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "Other">("Female");
  const [village, setVillage] = useState("");
  const [phone, setPhone] = useState("");
  const [abhaId, setAbhaId] = useState("");

  // Vitals & Symptoms
  const [showVitals, setShowVitals] = useState(false);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [spo2, setSpo2] = useState("");
  const [pulse, setPulse] = useState("");
  const [selectedSymptom, setSelectedSymptom] = useState<VernacularSymptom | null>(null);

  // Audio recording
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const [hasAudioNote, setHasAudioNote] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVillageFilter, setSelectedVillageFilter] = useState("ALL");

  // Quick triage modal
  const [activePatientForTriage, setActivePatientForTriage] = useState<Patient | null>(null);
  const [modalComplaint, setModalComplaint] = useState("");
  const [modalBP, setModalBP] = useState("");
  const [modalSpo2, setModalSpo2] = useState("");
  const [modalPulse, setModalPulse] = useState("");

  useEffect(() => {
    console.log("[HealthStationDashboard] Page mounted on client. User session:", user?.name || "None");
    setMounted(true);
    if (!isLoading && user?.role === "doctor") {
      router.push("/doctor");
    }
  }, [user, isLoading, router]);

  // Safety fallback: Release mounting spinner after 1.5s to prevent permanent hang on mobile
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted((prev) => {
        if (!prev) {
          console.warn("[HealthStationDashboard] Safety timer forced mounted=true");
          return true;
        }
        return prev;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Live queries from IndexedDB with defensive try/catch and fallback
  const patients =
    useLiveQuery(
      async () => {
        try {
          const list = await db.patients.reverse().toArray();
          return list && list.length > 0 ? list : DEFAULT_PATIENTS;
        } catch (err) {
          console.error("[HealthStationDashboard] Dexie error reading patients, falling back to defaults:", err);
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
          const list = await db.triagePackets.toArray();
          return list && list.length > 0 ? list : DEFAULT_TRIAGE_PACKETS;
        } catch (err) {
          console.error("[HealthStationDashboard] Dexie error reading triagePackets, falling back to defaults:", err);
          return DEFAULT_TRIAGE_PACKETS;
        }
      },
      [],
      DEFAULT_TRIAGE_PACKETS
    ) ?? DEFAULT_TRIAGE_PACKETS;

  const triageByPatientId = React.useMemo(() => {
    const map = new Map<number, TriagePacket[]>();
    for (const pkt of triagePackets) {
      const arr = map.get(pkt.patientId) || [];
      arr.push(pkt);
      map.set(pkt.patientId, arr);
    }
    return map;
  }, [triagePackets]);

  const totalPatients = patients.length;
  const queuedCount = triagePackets.filter((p) => p.status === "queued").length;
  const villagesList = Array.from(new Set(patients.map((p) => p.village).filter(Boolean)));

  const filteredPatients = patients.filter((pt) => {
    const matchesSearch =
      pt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pt.phone.includes(searchQuery) ||
      (pt.abhaId && pt.abhaId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      pt.village.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVillage =
      selectedVillageFilter === "ALL" || pt.village === selectedVillageFilter;

    return matchesSearch && matchesVillage;
  });

  const handleToggleRecordAudio = () => {
    if (isRecordingAudio) {
      setIsRecordingAudio(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setHasAudioNote(true);
    } else {
      setIsRecordingAudio(true);
      setAudioSeconds(0);
      setHasAudioNote(false);
      timerRef.current = setInterval(() => {
        setAudioSeconds((prev) => prev + 1);
      }, 1000);
    }
  };

  const handleSelectSymptom = (sym: VernacularSymptom) => {
    setSelectedSymptom(sym);
    setChiefComplaint(sym.dialectHindi.split(" (")[0]);
  };

  const handleSubmitPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !age.trim() || !village.trim()) {
      alert("कृपया नाम, उम्र और गाँव दर्ज करें (Please provide Name, Age, and Village)");
      return;
    }

    try {
      const parsedAge = parseInt(age, 10);
      const newPatient: Patient = {
        name: name.trim(),
        age: isNaN(parsedAge) ? 0 : parsedAge,
        gender,
        village: village.trim(),
        phone: phone.trim() || "N/A",
        abhaId: abhaId.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      const newPatientId = await db.patients.add(newPatient);

      if (newPatientId) {
        const parsedSpo2 = parseInt(spo2, 10);
        const parsedPulse = parseInt(pulse, 10);
        await db.triagePackets.add({
          patientId: Number(newPatientId),
          chiefComplaint: chiefComplaint.trim() || "सामान्य जांच",
          bloodPressure: bloodPressure.trim() || "—",
          spo2: isNaN(parsedSpo2) ? 0 : parsedSpo2,
          pulse: isNaN(parsedPulse) ? 0 : parsedPulse,
          priority: selectedSymptom?.defaultPriority || (!isNaN(parsedSpo2) && parsedSpo2 > 0 && parsedSpo2 < 94 ? "RED" : "GREEN"),
          snomedCode: selectedSymptom?.snomedConceptId,
          icd11Code: selectedSymptom?.icd11Code,
          audioDurationSec: hasAudioNote ? audioSeconds : undefined,
          status: "queued",
          createdAt: new Date().toISOString(),
        });
      }

      setName("");
      setAge("");
      setPhone("");
      setAbhaId("");
      setChiefComplaint("");
      setBloodPressure("");
      setSpo2("");
      setPulse("");
      setSelectedSymptom(null);
      setHasAudioNote(false);
      setAudioSeconds(0);
      setShowVitals(false);
      setSyncFeedback("मरीज सफलतापूर्वक दर्ज हुआ! (Patient Registered)");
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err) {
      console.error(err);
      alert("Error saving patient record.");
    }
  };

  const handleSaveModalTriage = async () => {
    if (!activePatientForTriage?.id) return;
    try {
      const parsedModalSpo2 = parseInt(modalSpo2, 10);
      const parsedModalPulse = parseInt(modalPulse, 10);
      await db.triagePackets.add({
        patientId: activePatientForTriage.id,
        chiefComplaint: modalComplaint.trim() || "सामान्य जांच",
        bloodPressure: modalBP.trim() || "—",
        spo2: isNaN(parsedModalSpo2) ? 0 : parsedModalSpo2,
        pulse: isNaN(parsedModalPulse) ? 0 : parsedModalPulse,
        priority: !isNaN(parsedModalSpo2) && parsedModalSpo2 > 0 && parsedModalSpo2 < 94 ? "RED" : "YELLOW",
        status: "queued",
        createdAt: new Date().toISOString(),
      });
      setActivePatientForTriage(null);
      setModalComplaint("");
      setModalBP("");
      setModalSpo2("");
      setModalPulse("");
      setSyncFeedback("वाइटल्स अपडेट हुए! (Vitals Recorded)");
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    setSyncFeedback("डेटा सिंक हो रहा है... (Syncing Records...)");

    setTimeout(async () => {
      try {
        const queuedPackets = await db.triagePackets.where("status").equals("queued").toArray();
        for (const pkt of queuedPackets) {
          if (pkt.id) {
            await db.triagePackets.update(pkt.id, { status: "synced" });
          }
        }
        setIsSyncing(false);
        setSyncFeedback(`सिंक पूरा हुआ! (${queuedPackets.length} रिकॉर्ड अपडेट हुए)`);
        setTimeout(() => setSyncFeedback(null), 4000);
      } catch {
        setIsSyncing(false);
        setSyncFeedback("Sync error");
      }
    }, 1200);
  };

  const handleSeedDemoData = async () => {
    try {
      const p1 = await db.patients.add({
        name: "शांति देवी (Shanti Devi)",
        age: 52,
        gender: "Female",
        village: "रामपुर (Rampur)",
        phone: "9876543210",
        abhaId: "91-4521-8942-1049",
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      });

      const p2 = await db.patients.add({
        name: "रामस्वरूप मीणा (Ramswaroop Meena)",
        age: 64,
        gender: "Male",
        village: "शिवपुरी (Shivpuri)",
        phone: "9811223344",
        abhaId: "91-1234-5678-9012",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      });

      await db.triagePackets.add({
        patientId: Number(p1),
        chiefComplaint: "4 दिन से खांसी और बुखार",
        bloodPressure: "138/88",
        spo2: 96,
        pulse: 84,
        priority: "YELLOW",
        audioDurationSec: 35,
        status: "queued",
        createdAt: new Date(Date.now() - 3600000 * 2.8).toISOString(),
      });

      await db.triagePackets.add({
        patientId: Number(p2),
        chiefComplaint: "घुटनों में दर्द और चक्कर",
        bloodPressure: "150/96",
        spo2: 95,
        pulse: 78,
        priority: "GREEN",
        status: "synced",
        createdAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      });

      await db.prescriptions.add({
        patientId: Number(p1),
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
        qrVerificationId: `RX-${Date.now()}-${p1}`,
        status: "prescribed",
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      });

      setSyncFeedback("डेमो डेटा लोड हुआ! (Sample Data Loaded)");
      setTimeout(() => setSyncFeedback(null), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearDatabase = async () => {
    if (confirm("क्या आप स्थानीय डेटा साफ़ करना चाहते हैं? (Clear local records?)")) {
      await db.patients.clear();
      await db.triagePackets.clear();
      await db.prescriptions.clear();
      setSyncFeedback("डेटाबेस साफ़ किया गया");
      setTimeout(() => setSyncFeedback(null), 2500);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          लोड हो रहा है... (Loading...)
        </div>
      </div>
    );
  }

  // If unauthenticated, render portal selection landing page
  if (!user) {
    return <PortalSelection />;
  }

  // If user is doctor, show redirecting state
  if (user.role === "doctor") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          डॉक्टर पोर्टल पर ले जाया जा रहा है... (Redirecting to Doctor Hub...)
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Health Station Banner */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {user.stationOrDept || "स्वास्थ्य केंद्र"} (Health Station)
            </h1>
            <p className="text-xs text-slate-500">
              ऑपरेटर: {user.name} • प्राथमिक स्वास्थ्य परामर्श व डिजिटल रजिस्ट्रेशन
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "सिंक हो रहा है..." : "डेटा सिंक करें"}</span>
              {queuedCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-800 text-white rounded-full text-[10px]">
                  {queuedCount}
                </span>
              )}
            </button>

            <button
              onClick={handleSeedDemoData}
              className="px-2.5 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200"
            >
              + डेमो डेटा
            </button>

            <button
              onClick={handleClearDatabase}
              className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-rose-600 rounded-lg"
              title="Clear Records"
            >
              रीसेट
            </button>
          </div>
        </div>

        {syncFeedback && (
          <div className="mt-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1 text-center">
            {syncFeedback}
          </div>
        )}
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1 flex flex-col gap-5">
        {/* Simplified 2-Card Metrics Row (Removed Inner-Working Technical Cards) */}
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">कुल पंजीकृत मरीज</p>
              <p className="text-xl font-bold text-slate-900">{totalPatients}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">कतार में लंबित</p>
              <p className="text-xl font-bold text-amber-600">{queuedCount}</p>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">सिंक स्थिति</p>
              <p className="text-sm font-bold text-emerald-700">
                {queuedCount === 0 ? "सभी रिकॉर्ड सुरक्षित" : `${queuedCount} रिकॉर्ड सिंक के लिए तैयार`}
              </p>
            </div>
          </div>
        </section>

        {/* 2-Column Clean Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Clean Patient Registration Form */}
          <section className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  नया मरीज पंजीकरण (Register Patient)
                </h2>
                <p className="text-xs text-slate-500">
                  मरीज की सामान्य जानकारी भरें
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPatient} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label htmlFor={`${formId}-name`} className="block text-xs font-semibold text-slate-700 mb-1">
                  मरीज का नाम (Name) <span className="text-rose-500">*</span>
                </label>
                <input
                  id={`${formId}-name`}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="उदा. शांति देवी"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              {/* Age & Gender */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${formId}-age`} className="block text-xs font-semibold text-slate-700 mb-1">
                    उम्र (Age) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`${formId}-age`}
                    type="number"
                    min="1"
                    max="120"
                    required
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="45"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    लिंग (Gender)
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["Female", "Male", "Other"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGender(g)}
                        className={`h-10 rounded-lg text-xs font-medium border transition-colors ${
                          gender === g
                            ? "bg-slate-900 text-white border-slate-900"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {g === "Female" ? "महिला" : g === "Male" ? "पुरुष" : "अन्य"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Village & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor={`${formId}-village`} className="block text-xs font-semibold text-slate-700 mb-1">
                    गाँव (Village) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={`${formId}-village`}
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    placeholder="रामपुर"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                  />
                </div>

                <div>
                  <label htmlFor={`${formId}-phone`} className="block text-xs font-semibold text-slate-700 mb-1">
                    मोबाइल नंबर (Phone)
                  </label>
                  <input
                    id={`${formId}-phone`}
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10 अंक"
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                  />
                </div>
              </div>

              {/* ABHA ID */}
              <div>
                <label htmlFor={`${formId}-abha`} className="block text-xs font-semibold text-slate-700 mb-1 flex justify-between">
                  <span>आभा आईडी (ABHA ID)</span>
                  <span className="text-[11px] text-slate-400 font-normal">वैकल्पिक</span>
                </label>
                <input
                  id={`${formId}-abha`}
                  type="text"
                  value={abhaId}
                  onChange={(e) => setAbhaId(e.target.value)}
                  placeholder="91-XXXX-XXXX-XXXX"
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              {/* Symptoms Shortcuts */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  लक्षण (Quick Symptoms):
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {VERNACULAR_TRIAGE_KNOWLEDGE.slice(0, 4).map((sym) => (
                    <button
                      key={sym.id}
                      type="button"
                      onClick={() => handleSelectSymptom(sym)}
                      className={`px-2.5 py-1 rounded-md text-xs transition-colors border ${
                        selectedSymptom?.id === sym.id
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300 font-medium"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {sym.dialectHindi.split(" (")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chief Complaint Input */}
              <div>
                <input
                  type="text"
                  value={chiefComplaint}
                  onChange={(e) => setChiefComplaint(e.target.value)}
                  placeholder="मुख्य समस्या (जैसे बुखार, खांसी, दर्द)..."
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:border-emerald-500 focus:outline-none bg-slate-50/50"
                />
              </div>

              {/* Voice Note & Optional Vitals Row */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleToggleRecordAudio}
                  className={`flex-1 h-10 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${
                    isRecordingAudio
                      ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
                      : hasAudioNote
                      ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {isRecordingAudio ? <MicOff className="w-4 h-4 text-rose-600" /> : <Mic className="w-4 h-4 text-slate-600" />}
                  <span>
                    {isRecordingAudio
                      ? `रिकॉर्डिंग चालू (${audioSeconds}s)`
                      : hasAudioNote
                      ? `वॉयस नोट सहेजा (${audioSeconds}s)`
                      : "वॉयस नोट रिकॉर्ड करें"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowVitals(!showVitals)}
                  className={`px-3 h-10 rounded-lg text-xs font-medium border transition-colors ${
                    showVitals
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {showVitals ? "वाइटल्स छुपाएं" : "+ वाइटल्स"}
                </button>
              </div>

              {/* Collapsible Vitals Strip */}
              {showVitals && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor={`${formId}-bp`} className="block text-[11px] text-slate-500 mb-0.5">BP (रक्तचाप)</label>
                    <input
                      id={`${formId}-bp`}
                      type="text"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      className="w-full h-8 px-2 text-center text-xs font-bold rounded border bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${formId}-spo2`} className="block text-[11px] text-slate-500 mb-0.5">SpO2 (%)</label>
                    <input
                      id={`${formId}-spo2`}
                      type="number"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full h-8 px-2 text-center text-xs font-bold rounded border bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor={`${formId}-pulse`} className="block text-[11px] text-slate-500 mb-0.5">Pulse (धड़कन)</label>
                    <input
                      id={`${formId}-pulse`}
                      type="number"
                      value={pulse}
                      onChange={(e) => setPulse(e.target.value)}
                      className="w-full h-8 px-2 text-center text-xs font-bold rounded border bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full h-11 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-sm transition-all flex items-center justify-center gap-2 mt-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>मरीज दर्ज करें (Save Patient)</span>
              </button>
            </form>
          </section>

          {/* Right Column: Clean Patient Queue */}
          <section className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col min-h-[560px]">
            {/* Queue Header */}
            <div className="pb-3 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  मरीज कतार (Patient Queue)
                </h2>
                <p className="text-xs text-slate-500">
                  परामर्श के लिए प्रतीक्षारत मरीज
                </p>
              </div>

              {villagesList.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedVillageFilter}
                    onChange={(e) => setSelectedVillageFilter(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-slate-200 text-xs bg-slate-50 text-slate-700"
                  >
                    <option value="ALL">सभी गाँव</option>
                    {villagesList.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="my-3 relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="नाम, फ़ोन नंबर या गाँव से खोजें..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-xs focus:border-slate-800 bg-slate-50/50"
              />
            </div>

            {/* Patients List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-[500px]">
              {filteredPatients.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">कोई मरीज दर्ज नहीं है</p>
                  <p className="text-xs mt-1">बाईं तरफ के फॉर्म से नया मरीज जोड़ें।</p>
                </div>
              ) : (
                filteredPatients.map((patient) => {
                  const pkts = patient.id ? triageByPatientId.get(patient.id) || [] : [];
                  const latestPkt = pkts[pkts.length - 1];

                  return (
                    <div
                      key={patient.id}
                      className="p-3.5 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {patient.gender === "Female" ? "F" : "M"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-slate-900">
                                {patient.name}
                              </h3>
                              <span className="text-xs text-slate-500">
                                {patient.age} वर्ष
                              </span>
                              {patient.abhaId && (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-200">
                                  ABHA
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                              <span>{patient.village}</span>
                              <span>•</span>
                              <span>{patient.phone}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status Tag */}
                        <div>
                          {latestPkt ? (
                            latestPkt.status === "synced" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                सिंक हुआ
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                कतार में
                              </span>
                            )
                          ) : (
                            <span className="text-[11px] text-slate-400">पंजीकृत</span>
                          )}
                        </div>
                      </div>

                      {/* Complaint Preview */}
                      {latestPkt && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                          <p className="line-clamp-1">
                            <span className="font-medium text-slate-700">समस्या:</span> {latestPkt.chiefComplaint}
                          </p>
                          <div className="flex gap-2 shrink-0 font-medium text-slate-500 text-[11px]">
                            <span>BP: {latestPkt.bloodPressure}</span>
                            <span>SpO2: {latestPkt.spo2}%</span>
                          </div>
                        </div>
                      )}

                      {/* Action Links Bar */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            setActivePatientForTriage(patient);
                            setModalComplaint("");
                          }}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1"
                        >
                          <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+ वाइटल्स</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/triage/${patient.id || 1}`}
                            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs flex items-center gap-1 transition-all"
                            title="Open ASHA Worker Triage and LiveKit Consultation"
                          >
                            <Video className="w-3.5 h-3.5 text-white animate-pulse" />
                            <span>लाइव ट्राइएज कॉल</span>
                          </Link>

                          <Link
                            href={`/kiosk/call?patientId=${patient.id || 1}`}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1"
                          >
                            <Video className="w-3.5 h-3.5 text-blue-600" />
                            <span>डॉक्टर कॉल</span>
                          </Link>

                          <Link
                            href={`/kiosk/prescriptions?patientId=${patient.id || 1}`}
                            className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                            <span>पर्चा प्रिंट</span>
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Modal for Quick Vitals Intake */}
      {activePatientForTriage && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 mb-3">
              <h3 className="text-sm font-bold text-slate-900">
                वाइटल्स जांच (Vitals Intake)
              </h3>
              <button
                onClick={() => setActivePatientForTriage(null)}
                className="text-slate-400 hover:text-slate-700 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 mb-3">
              मरीज: <span className="font-bold text-slate-900">{activePatientForTriage.name}</span>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  मुख्य समस्या
                </label>
                <input
                  type="text"
                  value={modalComplaint}
                  onChange={(e) => setModalComplaint(e.target.value)}
                  placeholder="जैसे बुखार, कमजोरी..."
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">BP</label>
                  <input
                    type="text"
                    value={modalBP}
                    onChange={(e) => setModalBP(e.target.value)}
                    className="w-full h-8 px-2 text-center text-xs font-bold rounded border bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">SpO2</label>
                  <input
                    type="number"
                    value={modalSpo2}
                    onChange={(e) => setModalSpo2(e.target.value)}
                    className="w-full h-8 px-2 text-center text-xs font-bold rounded border bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-0.5">Pulse</label>
                  <input
                    type="number"
                    value={modalPulse}
                    onChange={(e) => setModalPulse(e.target.value)}
                    className="w-full h-8 px-2 text-center text-xs font-bold rounded border bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setActivePatientForTriage(null)}
                className="flex-1 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium"
              >
                रद्द करें
              </button>
              <button
                type="button"
                onClick={handleSaveModalTriage}
                className="flex-1 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                सहेजें
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 text-slate-400 py-3 text-xs text-center">
        <p>आरोग्य संगम — ग्रामीण डिजिटल स्वास्थ्य सेवा (AarogyaSangam)</p>
      </footer>
    </div>
  );
}
