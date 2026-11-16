"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import HealthStationDashboard from "../page";

export default function KioskPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login/kiosk");
    }
  }, [user, isLoading, router]);

  return <HealthStationDashboard />;
}
