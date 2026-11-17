import Dexie, { type Table } from 'dexie';

export interface Patient {
  id?: number;
  name: string;
  age: number;
  gender: 'Female' | 'Male' | 'Other';
  village: string;
  phone: string;
  abhaId?: string;
  createdAt: string;
}

export interface TriagePacket {
  id?: number;
  patientId: number;
  chiefComplaint: string;
  bloodPressure: string;
  spo2: number;
  pulse: number;
  priority?: 'GREEN' | 'YELLOW' | 'RED';
  snomedCode?: string;
  icd11Code?: string;
  audioNoteBlob?: Blob | null;
  audioDurationSec?: number;
  clinicalPhotoUrl?: string;
  status: 'queued' | 'synced';
  createdAt: string;
}

export interface PrescribedMedicationItem {
  saltName: string;
  genericCode?: string;
  janAushadhiCode?: string;
  morning: number; // e.g. 1, 0.5, 0
  noon: number;
  night: number;
  withFood: boolean;
  days: number;
  instructionsHi?: string;
}

export interface Prescription {
  id?: number;
  patientId: number;
  doctorId: string;
  doctorName: string;
  diagnosis: string;
  snomedCode?: string;
  icd11Code?: string;
  medications: PrescribedMedicationItem[];
  instructionsHi?: string;
  instructionsEn?: string;
  qrVerificationId: string;
  status: 'prescribed' | 'dispensed';
  createdAt: string;
}

export interface ChatMessage {
  id?: number;
  roomId: string;
  senderRole: 'kiosk' | 'doctor' | string;
  text: string;
  status: 'queued' | 'synced';
  timestamp: string;
}

export const DEFAULT_PATIENTS: Patient[] = [
  {
    id: 1,
    name: "शांति देवी (Shanti Devi)",
    age: 52,
    gender: "Female",
    village: "रामपुर (Rampur)",
    phone: "9876543210",
    abhaId: "91-4521-8942-1049",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "रामस्वरूप मीणा (Ramswaroop Meena)",
    age: 64,
    gender: "Male",
    village: "शिवपुरी (Shivpuri)",
    phone: "9811223344",
    abhaId: "91-1234-5678-9012",
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_TRIAGE_PACKETS: TriagePacket[] = [
  {
    id: 1,
    patientId: 1,
    chiefComplaint: "4 दिन से खांसी और बुखार (Fever & Cough)",
    bloodPressure: "138/88",
    spo2: 96,
    pulse: 84,
    priority: "YELLOW",
    audioDurationSec: 35,
    status: "queued",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    patientId: 2,
    chiefComplaint: "घुटनों में दर्द और चक्कर (Knee Pain)",
    bloodPressure: "150/96",
    spo2: 95,
    pulse: 78,
    priority: "GREEN",
    status: "synced",
    createdAt: new Date().toISOString(),
  },
];

export const DEFAULT_PRESCRIPTIONS: Prescription[] = [
  {
    id: 1,
    patientId: 1,
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
    instructionsHi: "पर्याप्त गुनगुना पानी पिएं। ठंडी चीजों से परहेज रखें और 5 दिन बाद पुनः जांच कराएं।",
    instructionsEn: "Drink warm fluids, rest well. Follow up in 5 days.",
    qrVerificationId: "RX-179493-1",
    status: "dispensed",
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 2,
    patientId: 2,
    doctorId: "DOC-7842",
    doctorName: "Dr. Rajesh Sharma, MD",
    diagnosis: "संधिवात व हल्का उच्च रक्तचाप (Osteoarthritis & Mild HTN)",
    medications: [
      {
        saltName: "Diclofenac Gel (1%)",
        genericCode: "GEN-08",
        morning: 1,
        noon: 0,
        night: 1,
        withFood: false,
        days: 7,
        instructionsHi: "घुटने पर हल्के हाथ से मालिश करें।",
      },
      {
        saltName: "Amlodipine (5mg)",
        genericCode: "GEN-12",
        morning: 1,
        noon: 0,
        night: 0,
        withFood: true,
        days: 14,
        instructionsHi: "प्रतिदिन सुबह नाश्ते के बाद एक गोली लें।",
      },
    ],
    instructionsHi: "नमक का सेवन कम करें। हल्का व्यायाम करें और भारी वजन न उठाएं।",
    instructionsEn: "Reduce salt intake. Gentle knee mobility exercises.",
    qrVerificationId: "RX-179493-2",
    status: "dispensed",
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export class RuralTelemedDatabase extends Dexie {
  patients!: Table<Patient, number>;
  triagePackets!: Table<TriagePacket, number>;
  prescriptions!: Table<Prescription, number>;
  chatMessages!: Table<ChatMessage, number>;

  constructor() {
    super('RuralTelemedDB');
    this.version(2).stores({
      patients: '++id, name, age, gender, village, phone, abhaId, createdAt',
      triagePackets: '++id, patientId, priority, status, createdAt',
      prescriptions: '++id, patientId, status, createdAt',
    });
    this.version(3).stores({
      chatMessages: '++id, roomId, senderRole, text, status, timestamp',
    });
  }
}

export const db = new RuralTelemedDatabase();

let isDbInitialized = false;

export async function ensureInitialData() {
  if (isDbInitialized) return;
  try {
    if (typeof window === "undefined") return;

    if (!window.indexedDB) {
      console.warn("[Dexie] IndexedDB is not available on this device/browser context.");
      return;
    }

    if (!db.isOpen()) {
      await db.open();
    }

    const count = await db.patients.count();
    if (count === 0) {
      console.log("[Dexie] Populating initial demo patients and triage packets...");
      const p1 = await db.patients.add({
        name: "शांति देवी (Shanti Devi)",
        age: 52,
        gender: "Female",
        village: "रामपुर (Rampur)",
        phone: "9876543210",
        abhaId: "91-4521-8942-1049",
        createdAt: new Date().toISOString(),
      });

      const p2 = await db.patients.add({
        name: "रामस्वरूप मीणा (Ramswaroop Meena)",
        age: 64,
        gender: "Male",
        village: "शिवपुरी (Shivpuri)",
        phone: "9811223344",
        abhaId: "91-1234-5678-9012",
        createdAt: new Date().toISOString(),
      });

      await db.triagePackets.add({
        patientId: Number(p1),
        chiefComplaint: "4 दिन से खांसी और बुखार (Fever & Cough)",
        bloodPressure: "138/88",
        spo2: 96,
        pulse: 84,
        priority: "YELLOW",
        audioDurationSec: 35,
        status: "queued",
        createdAt: new Date().toISOString(),
      });

      await db.triagePackets.add({
        patientId: Number(p2),
        chiefComplaint: "घुटनों में दर्द और चक्कर (Knee Pain)",
        bloodPressure: "150/96",
        spo2: 95,
        pulse: 78,
        priority: "GREEN",
        status: "synced",
        createdAt: new Date().toISOString(),
      });

      for (const rx of DEFAULT_PRESCRIPTIONS) {
        await db.prescriptions.add(rx);
      }
      console.log("[Dexie] Initial demo data seeded successfully.");
    }
    isDbInitialized = true;
  } catch (e) {
    console.error("[Dexie] Could not initialize or seed demo data:", e);
  }
}

if (typeof window !== "undefined") {
  db.on("blocked", () => {
    console.warn("[Dexie] Database open blocked by another tab or session.");
  });

  db.on("versionchange", () => {
    console.warn("[Dexie] Database version changed; closing connection.");
    db.close();
  });

  ensureInitialData().catch((err) => {
    console.error("[Dexie] Top-level initialization error:", err);
  });
}
