import { NextRequest, NextResponse } from "next/server";
import { Patient, TriagePacket, Prescription, ChatMessage, DEFAULT_PATIENTS, DEFAULT_TRIAGE_PACKETS } from "@/lib/db";

// Global in-memory storage instance across serverless requests in the node process
declare global {
  // eslint-disable-next-line no-var
  var __aarogyaSyncStore: {
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
  } | undefined;
}

if (!globalThis.__aarogyaSyncStore) {
  globalThis.__aarogyaSyncStore = {
    patients: [...DEFAULT_PATIENTS],
    triagePackets: [...DEFAULT_TRIAGE_PACKETS],
    prescriptions: [],
    chatMessages: [
      {
        roomId: "global",
        senderRole: "doctor",
        text: "नमस्ते सुनीता जी, आज रामपुर केंद्र पर कोई गंभीर मरीज है क्या? (Hello Sunita ji, any critical cases today?)",
        status: "synced",
        timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      },
    ],
    activeCall: null,
  };
}

const store = globalThis.__aarogyaSyncStore;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");

  // Filter chat messages by room if specified, or return global + room
  const relevantChat = roomId
    ? store.chatMessages.filter((m) => m.roomId === roomId || m.roomId === "global")
    : store.chatMessages;

  return NextResponse.json({
    success: true,
    patients: store.patients,
    triagePackets: store.triagePackets,
    prescriptions: store.prescriptions,
    chatMessages: relevantChat,
    activeCall: store.activeCall,
    serverTime: Date.now(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "register_patient": {
        const { patient, triage } = body;
        if (patient) {
          const nextId =
            patient.id || (store.patients.length > 0 ? Math.max(...store.patients.map((p) => p.id || 0)) + 1 : 1);
          const fullPatient = { ...patient, id: nextId };
          
          // Check if patient already exists
          const existingIdx = store.patients.findIndex((p) => p.id === nextId);
          if (existingIdx >= 0) {
            store.patients[existingIdx] = fullPatient;
          } else {
            store.patients.unshift(fullPatient);
          }

          if (triage) {
            const triageId =
              triage.id ||
              (store.triagePackets.length > 0
                ? Math.max(...store.triagePackets.map((t) => t.id || 0)) + 1
                : 1);
            const fullTriage = { ...triage, id: triageId, patientId: nextId };
            const existingTriageIdx = store.triagePackets.findIndex((t) => t.id === triageId);
            if (existingTriageIdx >= 0) {
              store.triagePackets[existingTriageIdx] = fullTriage;
            } else {
              store.triagePackets.unshift(fullTriage);
            }
          }
          return NextResponse.json({ success: true, patient: fullPatient });
        }
        break;
      }

      case "call_doctor": {
        const { roomId, patientId, patientName, callerName } = body;
        store.activeCall = {
          status: "calling",
          roomId: roomId || `aarogya-consult-${patientId}`,
          patientId: Number(patientId),
          patientName: patientName || "मरीज",
          callerName: callerName || "कियोस्क ऑपरेटर",
          timestamp: Date.now(),
        };
        console.log("[Sync API] Kiosk initiated call:", store.activeCall);
        return NextResponse.json({ success: true, activeCall: store.activeCall });
      }

      case "accept_call": {
        const { roomId } = body;
        if (store.activeCall) {
          store.activeCall.status = "accepted";
          console.log("[Sync API] Doctor accepted call in room:", roomId);
        }
        return NextResponse.json({ success: true, activeCall: store.activeCall });
      }

      case "end_call": {
        console.log("[Sync API] Call ended");
        store.activeCall = null;
        return NextResponse.json({ success: true, activeCall: null });
      }

      case "send_chat": {
        const { roomId, senderRole, text, timestamp } = body;
        if (text && text.trim()) {
          const trimmedText = text.trim();
          const targetRoom = roomId || "global";
          const role = senderRole || "kiosk";
          const msgTimestamp = timestamp || new Date().toISOString();

          // Deduplicate on server: check if identical message arrived within 5 seconds
          const alreadyExists = store.chatMessages.some(
            (m) =>
              m.roomId === targetRoom &&
              m.senderRole === role &&
              m.text === trimmedText &&
              (m.timestamp === msgTimestamp ||
                Math.abs(new Date(m.timestamp).getTime() - new Date(msgTimestamp).getTime()) < 5000)
          );

          if (!alreadyExists) {
            const newMsg: ChatMessage = {
              roomId: targetRoom,
              senderRole: role,
              text: trimmedText,
              status: "synced",
              timestamp: msgTimestamp,
            };
            store.chatMessages.push(newMsg);
            // Keep chat messages array under 200 items
            if (store.chatMessages.length > 200) {
              store.chatMessages = store.chatMessages.slice(-150);
            }
            return NextResponse.json({ success: true, message: newMsg });
          } else {
            return NextResponse.json({ success: true, deduplicated: true });
          }
        }
        break;
      }

      case "dispense_prescription": {
        const { prescription } = body;
        if (prescription) {
          const rxId =
            prescription.id ||
            (store.prescriptions.length > 0
              ? Math.max(...store.prescriptions.map((p) => p.id || 0)) + 1
              : 1);
          const fullRx = { ...prescription, id: rxId, status: "dispensed" as const };
          store.prescriptions.unshift(fullRx);

          // Update triage packet to completed
          const triage = store.triagePackets.find((t) => t.patientId === prescription.patientId);
          if (triage) {
            triage.status = "synced";
          }
          return NextResponse.json({ success: true, prescription: fullRx });
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sync error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
