"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home, Database, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showStack, setShowStack] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isResettingDb, setIsResettingDb] = useState(false);
  const [diagnostics, setDiagnostics] = useState<{
    url: string;
    userAgent: string;
    isOnline: boolean;
    hasIndexedDb: boolean;
    time: string;
  } | null>(null);

  useEffect(() => {
    // Log the error prominently to console
    console.error("[Global ErrorBoundary Caught Error]:", error);

    if (typeof window !== "undefined") {
      setDiagnostics({
        url: window.location.href,
        userAgent: navigator.userAgent,
        isOnline: navigator.onLine,
        hasIndexedDb: "indexedDB" in window,
        time: new Date().toLocaleTimeString(),
      });
    }
  }, [error]);

  const handleCopyDiagnostics = () => {
    const text = `
=== AarogyaSangam Error Report ===
Time: ${diagnostics?.time || new Date().toISOString()}
Error Message: ${error.message}
Error Name: ${error.name}
Digest: ${error.digest || "N/A"}
URL: ${diagnostics?.url || "N/A"}
Online: ${diagnostics?.isOnline}
IndexedDB: ${diagnostics?.hasIndexedDb}
UserAgent: ${diagnostics?.userAgent}
Stack:
${error.stack || "No stack trace available"}
    `.trim();

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleHardResetDatabase = async () => {
    if (!confirm("क्या आप स्थानीय कैश और डेटाबेस को रीसेट करना चाहते हैं? (Reset local IndexedDB cache?)")) {
      return;
    }
    setIsResettingDb(true);
    try {
      if (typeof window !== "undefined" && window.indexedDB) {
        indexedDB.deleteDatabase("RuralTelemedDB");
      }
      localStorage.clear();
      sessionStorage.clear();
      alert("कैश साफ़ हो गया है। पृष्ठ पुनः लोड हो रहा है... (Cache cleared. Reloading...)");
      window.location.href = "/";
    } catch (e) {
      console.error("Failed to reset database:", e);
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-2xl w-full bg-white rounded-2xl border border-red-200 shadow-xl overflow-hidden">
        {/* Banner Header */}
        <div className="bg-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">एप्लिकेशन में त्रुटि आई (Application Error)</h1>
              <p className="text-xs text-red-100">
                पेज लोड होने में समस्या हुई। कृपया नीचे दी गई जानकारी जांचें।
              </p>
            </div>
          </div>
          {error.digest && (
            <span className="text-[10px] font-mono bg-red-800/80 px-2 py-1 rounded text-red-100">
              Digest: {error.digest}
            </span>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Exact Error Message */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-700 block mb-1">
              त्रुटि विवरण (Exact Error Message)
            </span>
            <p className="text-sm font-mono text-red-900 break-words font-semibold">
              {error.message || error.name || "अज्ञात त्रुटि (An unknown client error occurred)"}
            </p>
          </div>

          {/* Device & Environment Diagnostics */}
          {diagnostics && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-1.5 text-slate-700">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2">
                डिवाइस व नेटवर्क डायग्नोस्टिक्स (Diagnostics)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 font-medium">URL: </span>
                  <span className="font-mono text-slate-900 break-all">{diagnostics.url}</span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">नेटवर्क स्थिति (Network): </span>
                  <span
                    className={`font-semibold ${
                      diagnostics.isOnline ? "text-emerald-700" : "text-amber-700"
                    }`}
                  >
                    {diagnostics.isOnline ? "ऑनलाइन (Online)" : "ऑफलाइन (Offline)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">IndexedDB सपोर्ट: </span>
                  <span
                    className={`font-semibold ${
                      diagnostics.hasIndexedDb ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {diagnostics.hasIndexedDb ? "उपलब्ध (Available)" : "अनुपलब्ध (Not Available)"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 font-medium">समय (Timestamp): </span>
                  <span className="text-slate-800">{diagnostics.time}</span>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible Stack Trace */}
          {error.stack && (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowStack((prev) => !prev)}
                className="w-full px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-between transition-colors"
              >
                <span>तकनीकी विवरण / स्टैक ट्रेस (Technical Stack Trace)</span>
                {showStack ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showStack && (
                <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] max-h-56 overflow-y-auto whitespace-pre-wrap break-all">
                  {error.stack}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="flex-1 min-w-[140px] h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>पुनः प्रयास करें (Retry)</span>
            </button>

            <Link
              href="/"
              className="flex-1 min-w-[140px] h-10 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Home className="w-4 h-4" />
              <span>होम पेज (Home)</span>
            </Link>

            <button
              type="button"
              onClick={handleCopyDiagnostics}
              className="h-10 px-3.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              title="डायग्नोस्टिक रिपोर्ट कॉपी करें"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? "कॉपी हुआ!" : "रिपोर्ट कॉपी"}</span>
            </button>

            <button
              type="button"
              onClick={handleHardResetDatabase}
              disabled={isResettingDb}
              className="h-10 px-3.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
              title="IndexedDB कैश साफ़ करके रीसेट करें"
            >
              <Database className="w-4 h-4 text-red-600" />
              <span>{isResettingDb ? "रीसेट हो रहा है..." : "कैश रीसेट"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
