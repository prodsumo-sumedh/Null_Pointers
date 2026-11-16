"use client";

import React, { useState, useEffect } from "react";
import "@livekit/components-styles";
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { Loader2, AlertCircle, Wifi, ShieldCheck, ArrowLeft } from "lucide-react";

export interface TeleconsultationRoomProps {
  roomName: string;
  participantName: string;
  token?: string;
  serverUrl?: string;
  onDisconnect?: () => void;
  className?: string;
  title?: string;
}

export default function TeleconsultationRoom({
  roomName,
  participantName,
  token: initialToken,
  serverUrl: initialServerUrl,
  onDisconnect,
  className = "",
  title,
}: TeleconsultationRoomProps) {
  const [token, setToken] = useState<string | null>(initialToken || null);
  const [serverUrl, setServerUrl] = useState<string>(
    initialServerUrl ||
      process.env.NEXT_PUBLIC_LIVEKIT_URL ||
      "wss://pbl-km1y90o5.livekit.cloud"
  );
  const [loading, setLoading] = useState<boolean>(!initialToken);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialToken) {
      setToken(initialToken);
      if (initialServerUrl) setServerUrl(initialServerUrl);
      setLoading(false);
      return;
    }

    let isMounted = true;
    async function fetchToken() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/token?roomName=${encodeURIComponent(roomName)}&participantName=${encodeURIComponent(participantName)}`
        );
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to fetch access token (${res.status})`);
        }
        const data = await res.json();
        if (isMounted) {
          setToken(data.token);
          if (data.serverUrl) {
            let resolvedUrl = data.serverUrl;
            if (typeof window !== "undefined" && resolvedUrl.includes("localhost")) {
              resolvedUrl = resolvedUrl.replace("localhost", window.location.hostname);
            }
            setServerUrl(resolvedUrl);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("[TeleconsultationRoom] Failed to fetch LiveKit token:", err);
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Error connecting to consultation room";
          setError(message);
          setLoading(false);
        }
      }
    }

    fetchToken();
    return () => {
      isMounted = false;
    };
  }, [roomName, participantName, initialToken, initialServerUrl]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] bg-slate-900 text-white rounded-2xl p-8 border border-slate-800 shadow-xl">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-4" />
        <h3 className="text-base font-semibold">टेली-परामर्श रूम से जुड़ रहे हैं...</h3>
        <p className="text-xs text-slate-400 mt-1">Connecting to LiveKit Room: {roomName}</p>
        <span className="mt-4 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700 flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          रूरल एडेप्टिव स्ट्रीम मोड (Dynacast Enabled)
        </span>
      </div>
    );
  }

  if (error || !token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[420px] bg-slate-900 text-white rounded-2xl p-8 border border-rose-900/60 shadow-xl text-center">
        <div className="w-14 h-14 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center mb-3 text-rose-400">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-base font-semibold text-rose-200">कॉल कनेक्ट करने में समस्या</h3>
        <p className="text-xs text-slate-300 mt-1 max-w-md">
          {error || "Access token could not be obtained."}
        </p>
        <div className="mt-5 flex gap-3">
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              setToken(null);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition-all cursor-pointer"
          >
            पुनः प्रयास करें (Retry)
          </button>
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              वापस जाएं (Back)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative flex flex-col bg-slate-950 text-white rounded-2xl overflow-hidden border border-slate-800 shadow-2xl h-[650px] max-h-[85vh] ${className}`}
    >
      {/* Top Banner with Room Info and Adaptive Stream Indicator */}
      <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs shrink-0 z-10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {onDisconnect && (
            <button
              onClick={onDisconnect}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Leave Room"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-slate-100">
            {title || `Live Teleconsultation — Room #${roomName}`}
          </span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            ({participantName})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-600/40 text-[10px] font-semibold flex items-center gap-1"
            title="Dynacast and Adaptive Stream are active to tolerate 2G/low-bandwidth rural connections without dropping calls."
          >
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>एडेप्टिव स्ट्रीम (Low Bandwidth Tolerant)</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700 hidden md:inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            LiveKit Secure WebRTC
          </span>
        </div>
      </div>

      {/* LiveKit Room Provider with Adaptive Stream and Dynacast */}
      <div className="flex-1 relative w-full h-full overflow-hidden">
        <LiveKitRoom
          video={true}
          audio={true}
          token={token}
          serverUrl={serverUrl}
          connect={true}
          data-lk-theme="default"
          options={{
            adaptiveStream: true,
            dynacast: true,
          }}
          onDisconnected={onDisconnect}
          className="w-full h-full flex flex-col"
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
}
