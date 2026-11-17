"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ChatMessage } from "@/lib/db";
import { getSignalingSocket } from "@/lib/webrtc";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useLanguage } from "@/context/LanguageContext";
import {
  Send,
  Wifi,
  WifiOff,
  Check,
  CheckCheck,
  Clock,
  RefreshCw,
  MessageSquare,
  AlertCircle,
  Mic,
  MicOff,
} from "lucide-react";
import type { Socket } from "socket.io-client";

export interface ConsultationChatProps {
  roomId: string;
  senderRole: "kiosk" | "doctor" | string;
  senderName?: string;
  className?: string;
  title?: string;
  quickReplies?: string[];
}

export default function ConsultationChat({
  roomId,
  senderRole,
  senderName,
  className = "",
  title = "परामर्श संवाद (Consultation Chat)",
  quickReplies,
}: ConsultationChatProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Multilingual Context
  const { language, t, speechLangCode } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Hook for automatic offline-to-online synchronization
  const { isOnline, isSyncing, queuedCount, syncPendingMessages } = useAutoSync(roomId);

  // Stop voice recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
      }
      setIsListening(false);
      return;
    }

    // Check if browser is offline - Speech API requires an active internet connection
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setSpeechError(
        t("speechOfflineError", "वॉइस टाइपिंग के लिए इंटरनेट कनेक्शन आवश्यक है (Speech requires active network).")
      );
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: any;
      webkitSpeechRecognition?: any;
    };

    const SpeechRecognitionConstructor =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setSpeechError(
        t("speechNotSupported", "इस ब्राउज़र में वॉइस टाइपिंग समर्थित नहीं है (Speech API not supported).")
      );
      setTimeout(() => setSpeechError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognitionConstructor();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = speechLangCode; // e.g. 'hi-IN', 'en-IN', or 'mr-IN'

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.warn("[ConsultationChat] Speech recognition error:", event.error);
        if (event.error === "network") {
          setSpeechError(
            t("speechOfflineError", "नेटवर्क त्रुटि: वॉइस टाइपिंग के लिए इंटरनेट आवश्यक है।")
          );
        } else if (event.error === "not-allowed" || event.error === "permission-denied") {
          setSpeechError("माइक्रोफ़ोन की अनुमति अस्वीकृत है (Microphone permission blocked).");
        } else if (event.error !== "no-speech") {
          setSpeechError(`स्पीच त्रुटि: ${event.error}`);
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("[ConsultationChat] Speech start failed:", err);
      setIsListening(false);
      setSpeechError("स्पीच रिकॉग्निशन शुरू नहीं हो सकी।");
      setTimeout(() => setSpeechError(null), 4000);
    }
  };

  // Reactive live query from IndexedDB
  const messages =
    useLiveQuery(
      async () => {
        try {
          if (!db.chatMessages) return [];
          return await db.chatMessages.where("roomId").equals(roomId).sortBy("timestamp");
        } catch (err) {
          console.error("[ConsultationChat] Dexie query error:", err);
          return [];
        }
      },
      [roomId],
      []
    ) ?? [];

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Socket listener for real-time incoming messages
  useEffect(() => {
    const socket = getSignalingSocket();
    socketRef.current = socket;

    // Join room if not already joined
    socket.emit("join-room", {
      roomId,
      role: senderRole,
      userName: senderName || (senderRole === "doctor" ? "Doctor" : "Kiosk Operator"),
    });

    const handleIncomingMessage = async (msg: {
      roomId?: string;
      senderRole?: string;
      text: string;
      timestamp?: string;
      status?: "queued" | "synced";
      sender?: string;
    }) => {
      // Only process messages for this consultation room
      if (msg.roomId && msg.roomId !== roomId) return;

      // Don't duplicate messages sent by self
      if (msg.senderRole === senderRole) return;

      const incomingTimestamp = msg.timestamp || new Date().toISOString();

      try {
        // Check for existing duplicate in IndexedDB
        const existing = await db.chatMessages
          .where("roomId")
          .equals(roomId)
          .and(
            (m) =>
              m.text === msg.text &&
              Math.abs(new Date(m.timestamp).getTime() - new Date(incomingTimestamp).getTime()) < 3000
          )
          .first();

        if (!existing) {
          await db.chatMessages.add({
            roomId,
            senderRole: msg.senderRole || (senderRole === "doctor" ? "kiosk" : "doctor"),
            text: msg.text,
            status: "synced",
            timestamp: incomingTimestamp,
          });
        }
      } catch (e) {
        console.error("[ConsultationChat] Error saving incoming socket message to Dexie:", e);
      }
    };

    socket.on("chat-message", handleIncomingMessage);

    return () => {
      socket.off("chat-message", handleIncomingMessage);
    };
  }, [roomId, senderRole, senderName]);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputText).trim();
    if (!messageContent) return;

    if (!textToSend) {
      setInputText("");
    }

    const networkOnline = typeof navigator !== "undefined" ? navigator.onLine : isOnline;
    const currentTimestamp = new Date().toISOString();
    const status: "queued" | "synced" = networkOnline ? "synced" : "queued";

    try {
      // 1. Immediately store in IndexedDB (Offline-first persistence)
      await db.chatMessages.add({
        roomId,
        senderRole,
        text: messageContent,
        status,
        timestamp: currentTimestamp,
      });

      // 2. If online and socket connected, emit immediately
      if (networkOnline) {
        const socket = socketRef.current || getSignalingSocket();
        socket.emit("chat-message", {
          roomId,
          senderRole,
          text: messageContent,
          status: "synced",
          timestamp: currentTimestamp,
          sender: senderName || (senderRole === "doctor" ? "डॉक्टर (Doctor)" : "आशा कियोस्क (ASHA)"),
          time: new Date(currentTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        });
      }
    } catch (err) {
      console.error("[ConsultationChat] Error saving or sending chat message:", err);
    }
  };

  const defaultQuickReplies =
    senderRole === "doctor"
      ? [
          "कृपया कैमरा घाव पर दिखाएं (Focus on exam)",
          "ऑडियो साफ नहीं है (Audio unclear)",
          "बीपी और पल्स दोबारा नापें (Re-check vitals)",
          "पर्चा तैयार किया जा रहा है (Preparing Rx)",
        ]
      : [
          "दवा पर्चा प्राप्त हो गया है (Rx Received)",
          "आवाज आ रही है (Audio clear)",
          "मरीज सामने बैठा है (Patient is ready)",
          "नेटवर्क धीमा है (Low bandwidth)",
        ];

  const replies = quickReplies || defaultQuickReplies;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden ${className}`}
    >
      {/* Top Header with Status Indicators */}
      <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200/80 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <MessageSquare className="w-4 h-4 text-emerald-700" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800 leading-tight">{title}</h3>
            <p className="text-[10px] text-slate-500">रूम: {roomId}</p>
          </div>
        </div>

        {/* Sync & Connectivity Badges */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {isOnline ? (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
              title="Real-time WebSocket socket sync is active"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>ऑनलाइन</span>
            </span>
          ) : (
            <span
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1"
              title="Working offline. Messages will queue and auto-sync when network returns."
            >
              <WifiOff className="w-3 h-3 text-amber-600" />
              <span>ऑफ़लाइन मोड</span>
            </span>
          )}

          {queuedCount > 0 && (
            <button
              onClick={() => syncPendingMessages()}
              disabled={!isOnline || isSyncing}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 transition-all ${
                isOnline
                  ? "bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 cursor-pointer"
                  : "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed"
              }`}
              title="Click to manually push queued messages if online"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{queuedCount} वेटिंग (Queued)</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[11px] text-amber-800 flex items-center gap-1.5 shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>
            इंटरनेट उपलब्ध नहीं है। संदेश स्थानीय IndexedDB में सुरक्षित हैं और नेटवर्क आने पर अपने आप सिंक होंगे।
          </span>
        </div>
      )}

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 min-h-[180px] bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center text-slate-400 p-4">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-1.5 stroke-[1.5]" />
            <p className="text-xs font-medium text-slate-600">अभी कोई संदेश नहीं है</p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-xs">
              परामर्श के दौरान महत्वपूर्ण निर्देश या सवाल नीचे टाइप करें।
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.senderRole === senderRole;
            const isDoctor = m.senderRole === "doctor";
            const isSynced = m.status === "synced";

            return (
              <div
                key={m.id || `${m.timestamp}-${m.text}`}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-full`}
              >
                <div
                  className={`rounded-2xl px-3 py-2 text-xs max-w-[85%] sm:max-w-[75%] shadow-xs break-words ${
                    isMe
                      ? "bg-emerald-600 text-white rounded-br-xs"
                      : isDoctor
                      ? "bg-blue-50 text-slate-800 border border-blue-200 rounded-bl-xs"
                      : "bg-white text-slate-800 border border-slate-200 rounded-bl-xs"
                  }`}
                >
                  {/* Sender & Timestamp */}
                  <div
                    className={`flex items-center gap-2 mb-1 text-[10px] ${
                      isMe ? "text-emerald-100" : "text-slate-500"
                    }`}
                  >
                    <span className="font-bold">
                      {isMe
                        ? "आप (You)"
                        : isDoctor
                        ? "👨‍⚕️ डॉक्टर (Doctor)"
                        : "👩‍⚕️ आशा कार्यकर्ता (ASHA)"}
                    </span>
                    <span>
                      {new Date(m.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Message Content */}
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                </div>

                {/* Status Indicator (Sent vs Waiting for Network) */}
                <div className="mt-0.5 px-1 flex items-center gap-1">
                  {isSynced ? (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-medium"
                      title="संदेश सिंक हो गया है (Sent & Synced)"
                    >
                      <CheckCheck className="w-3 h-3 text-emerald-500" />
                      <span>Sent</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-semibold animate-pulse"
                      title="नेटवर्क आने पर स्वतः भेजा जाएगा (Waiting for Network)"
                    >
                      <Clock className="w-3 h-3 text-amber-500" />
                      <span>Waiting for Network</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Intercom Suggestions */}
      {replies.length > 0 && (
        <div className="px-3 py-1.5 bg-slate-100/70 border-t border-slate-200/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider shrink-0">
            त्वरित:
          </span>
          {replies.map((reply, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSendMessage(reply)}
              className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-200 text-slate-700 text-[11px] font-medium border border-slate-200 shrink-0 transition-colors shadow-2xs cursor-pointer min-h-[32px] flex items-center"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Voice-to-Text Status / Error Banner */}
      {isListening && (
        <div className="px-3.5 py-1.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center justify-between animate-pulse shrink-0">
          <div className="flex items-center gap-2 font-semibold">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
            <span>{t("listening", "सुन रहे हैं... कृपया बोलें")} ({speechLangCode})</span>
          </div>
          <button
            type="button"
            onClick={toggleListening}
            className="text-[11px] underline font-bold hover:text-rose-900 cursor-pointer"
          >
            रोकें (Stop)
          </button>
        </div>
      )}

      {speechError && (
        <div className="px-3.5 py-1.5 bg-amber-50 border-t border-amber-200 text-amber-900 text-xs flex items-center gap-1.5 shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{speechError}</span>
        </div>
      )}

      {/* Input Field & Submit Action */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isOnline
              ? t("typeMessage", "संदेश लिखें (Type a message)...")
              : t("typeOfflineMessage", "ऑफ़लाइन संदेश लिखें (Will sync when online)...")
          }
          className="flex-1 min-h-[48px] px-3.5 rounded-xl border border-slate-200 text-base bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all text-slate-800"
        />

        {/* Microphone Dictation Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`min-h-[48px] min-w-[48px] px-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            isListening
              ? "bg-rose-600 hover:bg-rose-500 text-white border-rose-600 animate-pulse shadow-md"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:border-slate-300"
          }`}
          title={
            isListening
              ? "माइक्रोफ़ोन बंद करें (Stop Mic)"
              : `${t("voiceTyping", "बोलकर लिखें")} (${speechLangCode})`
          }
        >
          {isListening ? (
            <MicOff className="w-4 h-4 text-white" />
          ) : (
            <Mic className="w-4 h-4 text-slate-700" />
          )}
        </button>

        {/* Submit Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="min-h-[48px] min-w-[48px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
          title={`${t("send", "भेजें")} (Send)`}
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">{t("send", "भेजें")}</span>
        </button>
      </form>
    </div>
  );
}
