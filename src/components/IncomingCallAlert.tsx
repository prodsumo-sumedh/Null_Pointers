"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSignalingSocket } from "@/lib/webrtc";
import { fetchSyncState, syncAcceptCall, syncEndCall } from "@/lib/syncClient";
import { PhoneCall, PhoneIncoming, PhoneOff } from "lucide-react";
import type { Socket } from "socket.io-client";

interface IncomingCallPayload {
  callerId: string;
  callerName: string;
  role: "doctor" | "kiosk";
  roomId: string;
  patientId?: number | string;
  patientName?: string;
}

/**
 * Web Audio API Ringtone Generator
 * Plays standard dual-frequency telephone ringtone (440Hz + 480Hz)
 * without needing external MP3/audio files.
 */
class RingtonePlayer {
  private audioCtx: AudioContext | null = null;
  private intervalId: NodeJS.Timeout | null = null;
  private isPlaying = false;

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioCtx = new AudioContextClass();

      const ringCycle = () => {
        if (!this.audioCtx || this.audioCtx.state === "closed" || !this.isPlaying) return;

        if (this.audioCtx.state === "suspended") {
          this.audioCtx.resume();
        }

        const now = this.audioCtx.currentTime;
        const osc1 = this.audioCtx.createOscillator();
        const osc2 = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();

        // 440Hz + 480Hz classic telecommunication ring tone
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, now);

        // Sound for 1.4 seconds, fade out gently
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gainNode.gain.setValueAtTime(0.15, now + 1.35);
        gainNode.gain.linearRampToValueAtTime(0, now + 1.4);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.45);
        osc2.stop(now + 1.45);
      };

      ringCycle();
      this.intervalId = setInterval(ringCycle, 3000);
    } catch (e) {
      console.warn("Could not play ringtone:", e);
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {}
      this.audioCtx = null;
    }
  }
}

export default function IncomingCallAlert() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [incomingCall, setIncomingCall] = useState<IncomingCallPayload | null>(null);
  const ringtoneRef = useRef<RingtonePlayer | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    ringtoneRef.current = new RingtonePlayer();
    return () => {
      ringtoneRef.current?.stop();
    };
  }, []);

  // 1. Cross-device HTTP Polling sync (Works 100% reliably on Vercel without socket server)
  useEffect(() => {
    // Only Doctor receives incoming calls (per rule: only Kiosk calls, Doctor picks up)
    if (user?.role !== "doctor") {
      ringtoneRef.current?.stop();
      setIncomingCall(null);
      return;
    }

    let isMounted = true;

    const pollSync = async () => {
      const state = await fetchSyncState();
      if (!isMounted || !state) return;

      const active = state.activeCall;
      if (active && active.status === "calling") {
        // If doctor is already inside the consult room for this patient, don't show popup
        const targetPath = `/consult/${active.patientId}`;
        if (pathname === targetPath) {
          ringtoneRef.current?.stop();
          setIncomingCall(null);
          return;
        }

        // Show alert and ring
        setIncomingCall({
          callerId: "kiosk-peer",
          callerName: active.callerName || "कियोस्क ऑपरेटर (सुनीता देवी)",
          role: "kiosk",
          roomId: active.roomId,
          patientId: active.patientId,
          patientName: active.patientName,
        });
        ringtoneRef.current?.start();
      } else {
        // Call ended or accepted
        setIncomingCall((curr) => {
          if (curr) {
            ringtoneRef.current?.stop();
            return null;
          }
          return null;
        });
      }
    };

    pollSync();
    const interval = setInterval(pollSync, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?.role, pathname]);

  // 2. Fallback Socket.io listener for local dev
  useEffect(() => {
    try {
      const socket = getSignalingSocket();
      socketRef.current = socket;

      const handleGlobalCall = (data: IncomingCallPayload) => {
        if (user?.role !== "doctor") return;
        const targetConsultPath = `/consult/${data.patientId || 1}`;
        if (pathname === targetConsultPath) return;

        setIncomingCall(data);
        ringtoneRef.current?.start();
      };

      const handleCallDismissed = () => {
        setIncomingCall(null);
        ringtoneRef.current?.stop();
      };

      socket.on("global-incoming-call", handleGlobalCall);
      socket.on("global-call-dismissed", handleCallDismissed);
      socket.on("global-call-answered", handleCallDismissed);
      socket.on("call-declined", handleCallDismissed);
      socket.on("call-ended", handleCallDismissed);

      return () => {
        socket.off("global-incoming-call", handleGlobalCall);
        socket.off("global-call-dismissed", handleCallDismissed);
        socket.off("global-call-answered", handleCallDismissed);
        socket.off("call-declined", handleCallDismissed);
        socket.off("call-ended", handleCallDismissed);
      };
    } catch {}
  }, [user?.role, pathname]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    ringtoneRef.current?.stop();

    // Signal accept via serverless API
    await syncAcceptCall(incomingCall.roomId);

    // Also notify socket if available
    if (socketRef.current) {
      socketRef.current.emit("call-accepted", { roomId: incomingCall.roomId });
    }

    const patientId = incomingCall.patientId || 1;
    setIncomingCall(null);
    router.push(`/consult/${patientId}`);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    ringtoneRef.current?.stop();

    await syncEndCall(incomingCall.roomId);

    if (socketRef.current) {
      socketRef.current.emit("call-declined", { roomId: incomingCall.roomId });
    }
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border-2 border-emerald-500 shadow-2xl max-w-md w-full p-6 text-center space-y-5 animate-in zoom-in-95 duration-200 mt-12 sm:mt-0">
        {/* Pulsing Ring Icon */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-600 text-white shadow-xl mx-auto">
          <span className="absolute w-24 h-24 rounded-full bg-emerald-400 animate-ping opacity-75" />
          <PhoneIncoming className="w-10 h-10 animate-bounce" />
        </div>

        <div>
          <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold inline-flex items-center gap-1.5 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            इनकमिंग टेली-परामर्श कॉल...
          </span>

          <h3 className="text-xl font-bold text-slate-900 mt-2.5">
            {incomingCall.callerName}
          </h3>

          <p className="text-xs text-slate-500 mt-0.5">
            स्वास्थ्य केंद्र कियोस्क से मरीज परामर्श हेतु वीडियो कॉल
          </p>
        </div>

        {/* Patient & Room Details Card */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-left space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">परामर्श मरीज:</span>
            <span className="font-bold text-slate-900">
              {incomingCall.patientName || `Patient #${incomingCall.patientId || 1}`}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-500 text-[11px]">
            <span>कंसल्टेशन रूम:</span>
            <span className="font-mono font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
              {incomingCall.roomId}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleDecline}
            className="min-h-[48px] rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>अस्वीकार (Decline)</span>
          </button>

          <button
            onClick={handleAccept}
            className="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>कॉल उठाएं (Pick Up Call)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
