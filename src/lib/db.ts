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

export const DEFAULT_PRESCRIPTIONS: Prescription[] = [];

export class RuralTelemedDatabase extends Dexie {
  patients!: Table<Patient, number>;
  triagePackets!: Table<TriagePacket, number>;
  prescriptions!: Table<Prescription, number>;

  constructor() {
    super('RuralTelemedDB');
    this.version(2).stores({
      patients: '++id, name, age, gender, village, phone, abhaId, createdAt',
      triagePackets: '++id, patientId, priority, status, createdAt',
      prescriptions: '++id, patientId, status, createdAt',
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
