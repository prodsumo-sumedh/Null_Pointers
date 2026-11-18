import { Patient, TriagePacket, Prescription, ChatMessage, db } from "@/lib/db";

export interface SyncServerState {
  patients: Patient[];
  triagePackets: TriagePacket[];
  prescriptions: Prescription[];
  chatMessages: ChatMessage[];
  activeCall: {
    status: "idle" | "calling" | "accepted" | "ended";
    roomId: string;
    patientId: number;
    patientName: string;
    callerName: string;
    timestamp: number;
  } | null;
  serverTime: number;
}

/**
 * Fetch latest global state from serverless sync API
 */
export async function fetchSyncState(roomId?: string): Promise<SyncServerState | null> {
  try {
    const url = roomId ? `/api/sync?roomId=${encodeURIComponent(roomId)}` : "/api/sync";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.warn("[SyncClient] Could not fetch sync state:", err);
    return null;
  }
}

/**
 * Register a new patient and broadcast to all devices
 */
export async function syncRegisterPatient(patient: Patient, triage?: TriagePacket) {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "register_patient",
        patient,
        triage,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[SyncClient] Failed to sync patient registration:", err);
    return null;
  }
}

/**
 * Kiosk initiates call to doctor
 */
export async function syncCallDoctor(patientId: number, patientName: string, callerName: string) {
  try {
    const roomId = `aarogya-consult-${patientId}`;
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "call_doctor",
        roomId,
        patientId,
        patientName,
        callerName,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[SyncClient] Failed to call doctor:", err);
    return null;
  }
}

/**
 * Doctor accepts incoming call
 */
export async function syncAcceptCall(roomId: string) {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "accept_call",
        roomId,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[SyncClient] Failed to accept call:", err);
    return null;
  }
}

/**
 * Either party ends the call
 */
export async function syncEndCall(roomId?: string) {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "end_call",
        roomId,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[SyncClient] Failed to end call:", err);
    return null;
  }
}

/**
 * Send real-time chat message across devices
 */
export async function syncSendChat(roomId: string, senderRole: string, text: string, timestamp?: string) {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send_chat",
        roomId,
        senderRole,
        text,
        timestamp,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[SyncClient] Failed to send chat message:", err);
    return null;
  }
}

/**
 * Doctor dispenses prescription and completes patient treatment
 */
export async function syncDispensePrescription(prescription: Prescription) {
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "dispense_prescription",
        prescription,
      }),
    });
    return await res.json();
  } catch (err) {
    console.warn("[SyncClient] Failed to dispense prescription:", err);
    return null;
  }
}

/**
 * Sync server state into local IndexedDB (Dexie)
 */
export async function syncServerDataToDexie(state: SyncServerState) {
  try {
    if (!db.isOpen()) {
      await db.open();
    }

    // 1. Sync patients
    for (const p of state.patients) {
      if (p.id) {
        const existing = await db.patients.get(p.id);
        if (!existing) {
          await db.patients.put(p);
        }
      }
    }

    // 2. Sync triage packets
    for (const t of state.triagePackets) {
      if (t.id) {
        const existing = await db.triagePackets.get(t.id);
        if (!existing) {
          await db.triagePackets.put(t);
        }
      }
    }

    // 3. Sync prescriptions
    for (const rx of state.prescriptions) {
      if (rx.id) {
        const existing = await db.prescriptions.get(rx.id);
        if (!existing) {
          await db.prescriptions.put(rx);
        }
      }
    }

    // 4. Sync chat messages with strict deduplication
    for (const msg of state.chatMessages) {
      const existing = await db.chatMessages
        .where("roomId")
        .equals(msg.roomId)
        .and(
          (m) =>
            m.senderRole === msg.senderRole &&
            m.text.trim() === msg.text.trim() &&
            (m.timestamp === msg.timestamp ||
              Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 10000)
        )
        .first();

      if (!existing) {
        await db.chatMessages.add({
          roomId: msg.roomId,
          senderRole: msg.senderRole,
          text: msg.text,
          status: "synced",
          timestamp: msg.timestamp,
        });
      } else if (existing.id && existing.status === "queued") {
        await db.chatMessages.update(existing.id, { status: "synced" });
      }
    }
  } catch (err) {
    console.warn("[SyncClient] Error syncing server data to Dexie:", err);
  }
}
