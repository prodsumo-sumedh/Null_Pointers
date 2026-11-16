"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSignalingSocket } from "@/lib/webrtc";
import { PhoneCall, PhoneIncoming, PhoneOff, User, Activity, AlertCircle } from "lucide-react";
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
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      this.audioCtx = new AudioContextClass();

      const ringCycle = () => {
        if (!this.audioCtx || this.audioCtx.state === "closed" || !this.isPlaying) return;

        // Resume AudioContext if browser suspended it before user interaction
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

  useEffect(() => {
    const socket = getSignalingSocket();
    socketRef.current = socket;

    // Handle global incoming call broadcast from another device
    const handleGlobalCall = (data: IncomingCallPayload) => {
      console.log("[IncomingCallAlert] Received global call alert:", data);

      // Avoid popping up if current user is the caller themselves
      if (data.role === "doctor" && user?.role === "doctor") return;
      if (data.role === "kiosk" && user?.role === "kiosk" && pathname.startsWith("/kiosk/call")) return;

      // Avoid duplicate alert if doctor is already inside /consult/[id] for this patient
      const targetConsultPath = `/consult/${data.patientId || 1}`;
      if (pathname === targetConsultPath) {
        return;
      }

      setIncomingCall(data);
      ringtoneRef.current?.start();
    };

    const handleCallDismissed = ({ roomId }: { roomId: string }) => {
      setIncomingCall((curr) => {
        if (curr && curr.roomId === roomId) {
          ringtoneRef.current?.stop();
          return null;
        }
        return curr;
      });
    };

    const handleCallAnswered = ({ roomId }: { roomId: string }) => {
      setIncomingCall((curr) => {
        if (curr && curr.roomId === roomId) {
          ringtoneRef.current?.stop();
          return null;
        }
        return curr;
      });
    };

    const handleSocketError = (err: Error) => {
      console.warn("[IncomingCallAlert] Signaling socket notice:", err.message);
    };

    socket.on("connect_error", handleSocketError);
    socket.on("global-incoming-call", handleGlobalCall);
    socket.on("global-call-dismissed", handleCallDismissed);
    socket.on("global-call-answered", handleCallAnswered);
    socket.on("call-declined", handleCallDismissed);
    socket.on("call-ended", handleCallDismissed);

    return () => {
      socket.off("connect_error", handleSocketError);
      socket.off("global-incoming-call", handleGlobalCall);
      socket.off("global-call-dismissed", handleCallDismissed);
      socket.off("global-call-answered", handleCallAnswered);
      socket.off("call-declined", handleCallDismissed);
      socket.off("call-ended", handleCallDismissed);
    };
  }, [user?.role, pathname]);

  const handleAccept = () => {
    if (!incomingCall) return;
    ringtoneRef.current?.stop();

    if (socketRef.current) {
      socketRef.current.emit("call-accepted", { roomId: incomingCall.roomId });
    }

    const patientId = incomingCall.patientId || 1;
    const dest =
      user?.role === "kiosk"
        ? `/kiosk/call?patientId=${patientId}`
        : `/consult/${patientId}`;

    setIncomingCall(null);
    router.push(dest);
  };

  const handleDecline = () => {
    if (!incomingCall) return;
    ringtoneRef.current?.stop();

    if (socketRef.current) {
      socketRef.current.emit("call-declined", { roomId: incomingCall.roomId });
    }
    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const isCallerKiosk = incomingCall.role === "kiosk";

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
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
            {isCallerKiosk
              ? "स्वास्थ्य केंद्र कियोस्क से कॉल आ रही है"
              : "रिमोट विशेषज्ञ डॉक्टर से वीडियो कॉल"}
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
            <span>सिग्नलिंग रूम:</span>
            <span className="font-mono font-medium text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
              {incomingCall.roomId}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={handleDecline}
            className="h-12 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PhoneOff className="w-4 h-4" />
            <span>अस्वीकार (Decline)</span>
          </button>

          <button
            onClick={handleAccept}
            className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>कॉल उठाएं (Accept)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
