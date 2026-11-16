"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "kiosk" | "doctor";

export interface AuthUser {
  role: UserRole;
  id: string;
  name: string;
  stationOrDept: string;
  location?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  loginAsKiosk: (data: { kioskId: string; operatorName: string; village: string }) => void;
  loginAsDoctor: (data: { doctorId: string; doctorName: string; specialty: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  loginAsKiosk: () => {},
  loginAsDoctor: () => {},
  logout: () => {},
});

const STORAGE_KEY = "aarogya_auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let safetyTimer: NodeJS.Timeout | null = null;
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          console.log("[AuthContext] Restored user session:", parsed.name, `(${parsed.role})`);
        } else {
          console.log("[AuthContext] No stored user session found.");
        }
      }
    } catch (e) {
      console.error("[AuthContext] Failed to access or parse stored user session:", e);
    } finally {
      setIsLoading(false);
    }

    // Fail-safe timeout: ensure isLoading is never permanently stuck on mobile browsers
    safetyTimer = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn("[AuthContext] Safety timeout released isLoading state.");
          return false;
        }
        return prev;
      });
    }, 1200);

    return () => {
      if (safetyTimer) clearTimeout(safetyTimer);
    };
  }, []);

  const loginAsKiosk = (data: { kioskId: string; operatorName: string; village: string }) => {
    const newUser: AuthUser = {
      role: "kiosk",
      id: data.kioskId,
      name: data.operatorName,
      stationOrDept: `${data.village} स्वास्थ्य केंद्र`,
      location: data.village,
    };
    setUser(newUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.error("[AuthContext] Failed to persist session to localStorage:", e);
    }
    router.push("/");
  };

  const loginAsDoctor = (data: { doctorId: string; doctorName: string; specialty: string }) => {
    const newUser: AuthUser = {
      role: "doctor",
      id: data.doctorId,
      name: data.doctorName,
      stationOrDept: data.specialty,
      location: "रिमोट विशेषज्ञ हब (Remote Hub)",
    };
    setUser(newUser);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.error("[AuthContext] Failed to persist session to localStorage:", e);
    }
    router.push("/doctor");
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error("[AuthContext] Failed to remove session from localStorage:", e);
    }
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, loginAsKiosk, loginAsDoctor, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
