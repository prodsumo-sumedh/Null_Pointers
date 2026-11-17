"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type Language = "en" | "hi" | "mr";

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
  speechLangCode: string;
}

export const DICTIONARY: Record<string, Record<Language, string>> = {
  // Navigation & Branding
  appName: {
    en: "AarogyaSangam",
    hi: "आरोग्य संगम",
    mr: "आरोग्य संगम",
  },
  kioskSubtitle: {
    en: "Health Station Kiosk",
    hi: "स्वास्थ्य केंद्र कियोस्क",
    mr: "आरोग्य केंद्र किऑस्क",
  },
  doctorSubtitle: {
    en: "Doctor Hub",
    hi: "डॉक्टर हब",
    mr: "डॉक्टर हब",
  },
  regAndQueue: {
    en: "Registration & Queue",
    hi: "पंजीकरण व कतार",
    mr: "नोंदणी आणि रांग",
  },
  patientQueue: {
    en: "Patient Queue",
    hi: "मरीज कतार",
    mr: "रुग्ण रांग",
  },
  startCall: {
    en: "Start Call",
    hi: "कॉल शुरू करें",
    mr: "कॉल सुरू करा",
  },
  callReceiver: {
    en: "Doctor Call",
    hi: "डॉक्टर कॉल",
    mr: "डॉक्टर कॉल",
  },
  prescriptions: {
    en: "Prescription & Print",
    hi: "दवा पर्चा व प्रिंट",
    mr: "औषध पत्रक आणि प्रिंट",
  },
  teleconsult: {
    en: "Tele-Consultation",
    hi: "टेली-परामर्श",
    mr: "टेलि-सल्लामसलत",
  },
  online: {
    en: "Online",
    hi: "ऑनलाइन",
    mr: "ऑनलाइन",
  },
  offline: {
    en: "Offline",
    hi: "ऑफ़लाइन",
    mr: "ऑफलाइन",
  },
  logout: {
    en: "Logout",
    hi: "लॉगआउट",
    mr: "लॉगआउट",
  },

  // Chat & Communication
  chat: {
    en: "Chat",
    hi: "चैट",
    mr: "चॅट",
  },
  consultationChat: {
    en: "Consultation Chat",
    hi: "परामर्श संवाद",
    mr: "सल्लामसलत संवाद",
  },
  typeMessage: {
    en: "Type a message...",
    hi: "संदेश लिखें...",
    mr: "संदेश लिहा...",
  },
  typeOfflineMessage: {
    en: "Offline message (will sync when online)...",
    hi: "ऑफ़लाइन संदेश लिखें (नेटवर्क आने पर सिंक होगा)...",
    mr: "ऑफलाइन संदेश लिहा (ऑनलाइन झाल्यावर सिंक होईल)...",
  },
  send: {
    en: "Send",
    hi: "भेजें",
    mr: "पाठवा",
  },
  voiceTyping: {
    en: "Voice Dictation",
    hi: "बोलकर लिखें",
    mr: "आवाजाने टाइप करा",
  },
  listening: {
    en: "Listening... speak now",
    hi: "सुन रहे हैं... कृपया बोलें",
    mr: "ऐकत आहे... कृपया बोला",
  },
  speechOfflineError: {
    en: "Voice dictation requires an active internet connection.",
    hi: "वॉइस टाइपिंग के लिए इंटरनेट कनेक्शन आवश्यक है।",
    mr: "व्हॉइस टायपिंगसाठी इंटरनेट कनेक्शन आवश्यक आहे.",
  },
  speechNotSupported: {
    en: "Voice dictation is not supported in this browser.",
    hi: "इस ब्राउज़र में वॉइस टाइपिंग समर्थित नहीं है।",
    mr: "या ब्राउझरमध्ये व्हॉइस टायपिंग समर्थित नाही.",
  },

  // Kiosk Dashboard & Intake
  registerPatient: {
    en: "Register Patient",
    hi: "मरीज पंजीकरण",
    mr: "रुग्ण नोंदणी",
  },
  patientName: {
    en: "Full Name",
    hi: "पूरा नाम",
    mr: "पूर्ण नाव",
  },
  age: {
    en: "Age",
    hi: "आयु (उम्र)",
    mr: "वय",
  },
  gender: {
    en: "Gender",
    hi: "लिंग",
    mr: "लिंग",
  },
  female: {
    en: "Female",
    hi: "महिला",
    mr: "महिला",
  },
  male: {
    en: "Male",
    hi: "पुरुष",
    mr: "पुरुष",
  },
  other: {
    en: "Other",
    hi: "अन्य",
    mr: "इतर",
  },
  village: {
    en: "Village / Ward",
    hi: "गाँव / वार्ड",
    mr: "गाव / प्रभाग",
  },
  mobileNumber: {
    en: "Mobile Number",
    hi: "मोबाइल नंबर",
    mr: "मोबाईल नंबर",
  },
  abhaId: {
    en: "ABHA Health ID (Optional)",
    hi: "आभा हेल्थ आईडी (वैकल्पिक)",
    mr: "आभा आरोग्य ओळख क्रमांक (ऐच्छिक)",
  },
  chiefComplaint: {
    en: "Chief Health Complaint / Symptoms",
    hi: "मुख्य स्वास्थ्य समस्या / लक्षण",
    mr: "मुख्य आरोग्य समस्या / लक्षणे",
  },
  vitals: {
    en: "Vitals (BP, SpO2, Pulse)",
    hi: "वाइटल्स (बीपी, SpO2, पल्स)",
    mr: "महत्त्वपूर्ण लक्षणे (बीपी, SpO2, नाडी)",
  },
  savePatient: {
    en: "Register & Add to Queue",
    hi: "मरीज दर्ज करें व कतार में जोड़ें",
    mr: "रुग्ण नोंदवा आणि रांगेत जोडा",
  },
  waitingPatients: {
    en: "Waiting Patients",
    hi: "प्रतीक्षारत मरीज",
    mr: "प्रतीक्षारत रुग्ण",
  },
  triageAssessment: {
    en: "Clinical Triage Assessment",
    hi: "क्लिनिकल ट्राइएज मूल्यांकन",
    mr: "क्लिनिकल ट्रायज मूल्यांकन",
  },
  riskHigh: {
    en: "Critical (High Risk)",
    hi: "गंभीर (उच्च जोखिम)",
    mr: "गंभीर (उच्च धोका)",
  },
  riskModerate: {
    en: "Moderate Risk",
    hi: "मध्यम जोखिम",
    mr: "मध्यम धोका",
  },
  riskLow: {
    en: "Normal / Low Risk",
    hi: "सामान्य / न्यूनतम जोखिम",
    mr: "सामान्य / कमी धोका",
  },
  connectWithDoctor: {
    en: "Connect with Doctor",
    hi: "डॉक्टर से परामर्श करें",
    mr: "डॉक्टरांशी संपर्क साधा",
  },
  syncStatus: {
    en: "Sync Status",
    hi: "सिंक स्थिति",
    mr: "सिंक स्थिती",
  },
  all: {
    en: "All",
    hi: "सभी",
    mr: "सर्व",
  },
  searchPlaceholder: {
    en: "Search patient name, village, or ABHA...",
    hi: "मरीज का नाम, गाँव या आभा नंबर से खोजें...",
    mr: "रुग्णाचे नाव, गाव किंवा आभा क्रमांकाने शोधा...",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "hi",
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
  speechLangCode: "hi-IN",
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("hi");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("aarogya_lang") as Language;
      if (saved && (saved === "en" || saved === "hi" || saved === "mr")) {
        setLanguageState(saved);
      }
    } catch {
      // Ignore localStorage errors in SSR / strict contexts
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem("aarogya_lang", lang);
    } catch {
      // Ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    const entry = DICTIONARY[key];
    if (entry && entry[language]) {
      return entry[language];
    }
    return fallback || entry?.["en"] || key;
  };

  const speechLangCode = language === "en" ? "en-IN" : language === "mr" ? "mr-IN" : "hi-IN";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, speechLangCode }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
