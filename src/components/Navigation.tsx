"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  HeartPulse,
  Building2,
  Stethoscope,
  Video,
  FileText,
  Wifi,
  WifiOff,
  Clock,
  LogOut,
  User,
  ShieldCheck,
  ChevronDown,
  PhoneCall,
  Printer
} from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const queuedCount = useLiveQuery(
    async () => {
      try {
        return await db.triagePackets.where("status").equals("queued").count();
      } catch (err) {
        console.error("[Navigation] Dexie error reading queuedCount:", err);
        return 0;
      }
    },
    [],
    0
  ) ?? 0;

  const rxCount = useLiveQuery(
    async () => {
      try {
        return await db.prescriptions.count();
      } catch (err) {
        console.error("[Navigation] Dexie error reading rxCount:", err);
        return 0;
      }
    },
    [],
    0
  ) ?? 0;

  // Don't render full navigation on login pages to keep them focused
  const isLoginPage = pathname.startsWith("/login");

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-sm font-sans w-full max-w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-4 overflow-x-hidden">
        {/* Brand */}
        <Link
          href={mounted && user ? (user.role === "doctor" ? "/doctor" : "/") : "/"}
          className="flex items-center gap-2 group shrink-0 min-h-[48px] py-1"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm group-hover:bg-emerald-500 transition-colors shrink-0">
            <HeartPulse className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white leading-tight">आरोग्य संगम</span>
              <span className="text-emerald-400 font-semibold text-[11px] hidden xs:inline">AarogyaSangam</span>
            </div>
            <p
              suppressHydrationWarning
              className="text-[10px] text-slate-400 font-normal hidden sm:block"
            >
              {mounted && user?.role === "doctor"
                ? "विशेषज्ञ डॉक्टर हब (Doctor Hub)"
                : mounted && user?.role === "kiosk"
                ? "स्वास्थ्य केंद्र कियोस्क (Health Station)"
                : "Rural Telemedicine Network"}
            </p>
          </div>
        </Link>

        {/* Persona-Based Nav Tabs */}
        {mounted && user && !isLoginPage && (
          <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
            {user.role === "kiosk" && (
              /* Kiosk Operator 3 Dedicated Health Station Pages */
              <>
                <Link
                  href="/"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[48px] ${
                    pathname === "/" || pathname === "/kiosk"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="hidden md:inline">पंजीकरण व कतार</span>
                  <span className="md:hidden">कतार</span>
                </Link>

                <Link
                  href="/kiosk/call"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[48px] ${
                    pathname.startsWith("/kiosk/call")
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <PhoneCall className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="hidden md:inline">डॉक्टर कॉल रिसीवर</span>
                  <span className="md:hidden">कॉल</span>
                </Link>

                <Link
                  href="/kiosk/prescriptions"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[48px] ${
                    pathname.startsWith("/kiosk/prescriptions")
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Printer className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="hidden md:inline">दवा पर्चा व प्रिंट</span>
                  <span className="md:hidden">पर्चा</span>
                  {rxCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 text-[10px] font-bold">
                      {rxCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {user.role === "doctor" && (
              /* Doctor Specialist ONLY sees Doctor tools */
              <>
                <Link
                  href="/doctor"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[48px] ${
                    pathname === "/doctor"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Stethoscope className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">केस कतार (Doctor Hub)</span>
                  <span className="sm:hidden">कतार</span>
                </Link>

                <Link
                  href="/consult/1"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[48px] ${
                    pathname.startsWith("/consult")
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Video className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">टेली-परामर्श (Tele-Consult)</span>
                  <span className="sm:hidden">परामर्श</span>
                </Link>

                <Link
                  href="/rx/1"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all min-h-[48px] ${
                    pathname.startsWith("/rx")
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">प्रिस्क्रिप्शन (Prescription)</span>
                  <span className="sm:hidden">पर्चा</span>
                </Link>
              </>
            )}
          </nav>
        )}

        {/* Right Section: Connection Pill & User Profile / Login Links */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Connection Status Pill */}
          {mounted && (
            <div className="flex items-center gap-1.5">
              <div
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-colors min-h-[36px] ${
                  isOnline
                    ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                    : "bg-amber-950/80 border-amber-500/50 text-amber-200"
                }`}
              >
                {isOnline ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="hidden md:inline text-[11px]">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="hidden md:inline text-[11px]">Offline</span>
                  </>
                )}
              </div>

              {user?.role === "kiosk" && queuedCount > 0 && (
                <span
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-bold min-h-[32px]"
                  title={`${queuedCount} records waiting to sync`}
                >
                  <Clock className="w-3 h-3" />
                  {queuedCount}
                </span>
              )}
            </div>
          )}

          {/* User Session Info or Login Buttons */}
          {mounted && (
            user ? (
              <div className="flex items-center gap-2 pl-1.5 sm:pl-2 border-l border-slate-800">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-white leading-tight">{user.name}</p>
                  <p className="text-[10px] text-slate-400">{user.stationOrDept}</p>
                </div>

                <button
                  onClick={logout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-300 text-xs font-medium border border-slate-700 hover:border-rose-700 transition-colors min-h-[48px]"
                  title="लॉगआउट (Logout)"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">लॉगआउट</span>
                </button>
              </div>
            ) : !isLoginPage ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/login/kiosk"
                  className="px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors min-h-[48px]"
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span className="hidden xs:inline">स्वास्थ्य केंद्र</span>
                  <span className="xs:hidden">कियोस्क</span>
                </Link>
                <Link
                  href="/login/doctor"
                  className="px-3 py-2 rounded-xl bg-blue-700 hover:bg-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors min-h-[48px]"
                >
                  <Stethoscope className="w-4 h-4 shrink-0" />
                  <span className="hidden xs:inline">डॉक्टर पोर्टल</span>
                  <span className="xs:hidden">डॉक्टर</span>
                </Link>
              </div>
            ) : null
          )}
        </div>
      </div>
    </header>
  );
}
