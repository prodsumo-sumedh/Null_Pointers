"use client";

import React, { useState, useEffect, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, ChatMessage } from "@/lib/db";
import { getSignalingSocket } from "@/lib/webrtc";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useLanguage } from "@/context/LanguageContext";
import { fetchSyncState, syncSendChat } from "@/lib/syncClient";
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
        } catch {}
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsListening(false);
      return;
    }

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
          return await db.chatMessages
            .where("roomId")
            .equals(roomId)
            .sortBy("timestamp");
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

  // 1. Cross-device HTTP Polling sync (Works 100% reliably on Vercel without socket server)
  useEffect(() => {
    let isMounted = true;

    const pollChat = async () => {
      const state = await fetchSyncState(roomId);
      if (!isMounted || !state) return;

      const serverMessages = state.chatMessages || [];
      for (const msg of serverMessages) {
        if (msg.roomId === roomId || msg.roomId === "global") {
          try {
            const existing = await db.chatMessages
              .where("roomId")
              .equals(roomId)
              .and(
                (m) =>
                  m.text === msg.text &&
                  Math.abs(new Date(m.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 3000
              )
              .first();

            if (!existing) {
              await db.chatMessages.add({
                roomId,
                senderRole: msg.senderRole,
                text: msg.text,
                status: "synced",
                timestamp: msg.timestamp,
              });
            }
          } catch {}
        }
      }
    };

    pollChat();
    const interval = setInterval(pollChat, 2000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [roomId]);

  // 2. Fallback Socket.io listener for local dev
  useEffect(() => {
    try {
      const socket = getSignalingSocket();
      socketRef.current = socket;

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
      }) => {
        if (msg.roomId && msg.roomId !== roomId) return;
        if (msg.senderRole === senderRole) return;

        const incomingTimestamp = msg.timestamp || new Date().toISOString();

        try {
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
    } catch {}
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

      // 2. Cross-device sync to serverless API
      if (networkOnline) {
        await syncSendChat(roomId, senderRole, messageContent);
      }

      // 3. Socket emission fallback for local dev
      if (networkOnline && socketRef.current) {
        socketRef.current.emit("chat-message", {
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
          <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">{title}</h4>
            <p className="text-[10px] text-slate-500 font-mono">
              Room: {roomId} • {senderRole === "doctor" ? "डॉक्टर पोर्टल" : "कियोस्क ऑपरेटर"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {queuedCount > 0 && (
            <button
              onClick={() => syncPendingMessages()}
              disabled={isSyncing || !isOnline}
              className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold flex items-center gap-1 hover:bg-amber-100 transition-colors disabled:opacity-50"
              title="कतारबद्ध संदेश सिंक करें"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{queuedCount} लंबित (Queued)</span>
            </button>
          )}

          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1 border ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-rose-50 text-rose-700 border-rose-200"
            }`}
          >
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-emerald-600" />
                <span>{t("online", "ऑनलाइन (Live)")}</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-rose-600" />
                <span>{t("offline", "ऑफलाइन (Offline Mode)")}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[180px] max-h-[380px] bg-slate-50/40">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 stroke-1 text-slate-300" />
            <p className="text-xs font-medium">अभी कोई संदेश नहीं है। (No messages yet)</p>
            <p className="text-[11px] text-slate-400 max-w-xs">
              इंटरनेट धीमा होने पर भी आप संदेश भेज सकते हैं, जो नेटवर्क वापस आने पर स्वतः सिंक हो जाएंगे।
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderRole === senderRole;
            const isQueued = msg.status === "queued";
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={msg.id || index}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-xs ${
                    isMe
                      ? "bg-emerald-600 text-white rounded-br-xs"
                      : "bg-white text-slate-900 border border-slate-200/90 rounded-bl-xs shadow-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                </div>

                <div className="flex items-center gap-1.5 px-1 text-[10px] text-slate-400 font-mono">
                  <span>{timeStr}</span>
                  {isMe && (
                    <span>
                      {isQueued ? (
                        <span
                          className="inline-flex items-center gap-0.5 text-amber-600 font-sans font-medium"
                          title="Waiting for Network to Sync"
                        >
                          <Clock className="w-3 h-3 animate-pulse" />
                          <span>नेटवर्क की प्रतीक्षा (Queued)</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-0.5 text-emerald-600"
                          title="Synced to Server"
                        >
                          <CheckCheck className="w-3 h-3" />
                          <span>भेज दिया (Sent)</span>
                        </span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Replies Strip */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        <span className="text-[10px] font-semibold text-slate-400 whitespace-nowrap pl-1">
          त्वरित:
        </span>
        {replies.map((reply, i) => (
          <button
            key={i}
            type="button"
            onClick={() => handleSendMessage(reply)}
            className="px-2.5 py-1 rounded-full bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200 whitespace-nowrap shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            {reply}
          </button>
        ))}
      </div>

      {/* Voice Recognition Error Alert Banner */}
      {speechError && (
        <div className="px-3 py-1.5 bg-rose-50 border-t border-rose-200 text-rose-700 text-[11px] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-rose-500 hover:text-rose-700 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Message Input Box with Voice Dictation */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
      >
        {/* Voice typing button with visual recording state */}
        <button
          type="button"
          onClick={toggleListening}
          className={`p-2 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 cursor-pointer ${
            isListening
              ? "bg-rose-600 text-white animate-pulse shadow-md shadow-rose-600/30 ring-2 ring-rose-400"
              : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
          }`}
          title={
            isListening
              ? "वॉइस रिकॉर्डिंग बंद करें (Stop listening)"
              : `बोलकर लिखें (${language === "hi" ? "हिंदी" : language === "mr" ? "मराठी" : "English"})`
          }
        >
          {isListening ? (
            <MicOff className="w-4 h-4 animate-bounce" />
          ) : (
            <Mic className="w-4 h-4 text-emerald-600" />
          )}
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            isListening
              ? "बोलिए, सुना जा रहा है... (Listening...)"
              : `${t("typeMessage", "संदेश लिखें")}... (${language === "hi" ? "हिंदी" : language === "mr" ? "मराठी" : "English"})`
          }
          className={`flex-1 min-h-[44px] px-3.5 rounded-xl border text-xs focus:outline-none transition-all ${
            isListening
              ? "border-rose-400 bg-rose-50/30 placeholder-rose-400"
              : "border-slate-200 bg-slate-50/50 focus:border-emerald-500 focus:bg-white"
          }`}
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-600/20 disabled:shadow-none shrink-0 cursor-pointer"
          title={t("sendMessage", "संदेश भेजें")}
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t("send", "भेजें")}</span>
        </button>
      </form>
    </div>
  );
}
