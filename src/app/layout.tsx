import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";
import Navigation from "@/components/Navigation";
import IncomingCallAlert from "@/components/IncomingCallAlert";
import { AuthProvider } from "@/context/AuthContext";
import ErrorBoundary from "@/components/ErrorBoundary";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f172a",
};

export const metadata: Metadata = {
  title: "AarogyaSangam | Rural-First Telemedicine & ASHA Kiosk",
  description: "Offline-first assisted telemedicine platform for rural community health operators and remote specialists",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased overflow-x-hidden`}
    >
      <body className="min-h-full flex flex-col bg-slate-100 text-slate-900 overflow-x-hidden w-full max-w-full">
        <AuthProvider>
          <Suspense fallback={<div className="bg-slate-900 h-14 w-full" />}>
            <Navigation />
            <IncomingCallAlert />
          </Suspense>
          <div className="flex-1 flex flex-col w-full max-w-full overflow-x-hidden">
            <ErrorBoundary fallbackMessage="एप्लिकेशन पेज लोड करने में त्रुटि (Page Render Error)">
              {children}
            </ErrorBoundary>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
