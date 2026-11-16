export interface VernacularSymptom {
  id: string;
  dialectHindi: string;
  standardEnglish: string;
  snomedConceptId: string;
  icd11Code: string;
  defaultPriority: 'GREEN' | 'YELLOW' | 'RED';
  redFlagsHi: string;
}

export const VERNACULAR_TRIAGE_KNOWLEDGE: VernacularSymptom[] = [
  {
    id: "fever-acute",
    dialectHindi: "तेज बुखार और कंपकंपी (High Fever & Chills)",
    standardEnglish: "Acute febrile illness with rigors",
    snomedConceptId: "386661006 (Fever)",
    icd11Code: "MG26 (Pyrexia of unknown origin)",
    defaultPriority: "YELLOW",
    redFlagsHi: "यदि बुखार 3 दिन से अधिक हो या गर्दन में अकड़न हो तो तुरंत अस्पताल भेजें।"
  },
  {
    id: "cough-dyspnea",
    dialectHindi: "छाती में जकड़न व सांस फूलना (Chest Tightness & Breathlessness)",
    standardEnglish: "Dyspnea / Respiratory distress",
    snomedConceptId: "267036007 (Dyspnea)",
    icd11Code: "MD21 (Dyspnea)",
    defaultPriority: "RED",
    redFlagsHi: "SpO2 93% से कम होने पर तत्काल ऑक्सीजन व एम्बुलेंस की आवश्यकता।"
  },
  {
    id: "chest-pain",
    dialectHindi: "छाती में भारीपन और पसीना (Chest Heaviness & Sweating)",
    standardEnglish: "Angina / Ischemic chest pain",
    snomedConceptId: "29857009 (Chest pain)",
    icd11Code: "BA41 (Angina pectoris)",
    defaultPriority: "RED",
    redFlagsHi: "संभावित दिल का दौरा (Heart Attack) — तुरंत उच्च केंद्र (DH/SDH) रेफर करें।"
  },
  {
    id: "diarrhea-vomit",
    dialectHindi: "दस्त, उल्टी और निर्जलीकरण (Loose Motions, Vomiting & Dehydration)",
    standardEnglish: "Acute Gastroenteritis / Dehydration",
    snomedConceptId: "21522001 (Abdominal pain)",
    icd11Code: "1A40 (Infectious gastroenteritis)",
    defaultPriority: "YELLOW",
    redFlagsHi: "तुरंत ORS घोल शुरू कराएं। पेशाब कम आने पर आईवी ड्रिप की आवश्यकता।"
  },
  {
    id: "joint-pain",
    dialectHindi: "घुटनों व जोड़ों में पुराना दर्द (Chronic Knee & Joint Pain)",
    standardEnglish: "Osteoarthritis / Arthralgia",
    snomedConceptId: "57676002 (Arthralgia)",
    icd11Code: "FA00 (Osteoarthritis)",
    defaultPriority: "GREEN",
    redFlagsHi: "यदि जोड़ लाल और बहुत सूजा हुआ हो तो गाउट/इन्फेक्शन जांचें।"
  },
  {
    id: "headache-dizzy",
    dialectHindi: "सिरदर्द, चक्कर और उच्च रक्तचाप (Headache, Dizziness, High BP)",
    standardEnglish: "Hypertension with cefalea",
    snomedConceptId: "38341003 (Hypertensive disease)",
    icd11Code: "BA00 (Essential hypertension)",
    defaultPriority: "YELLOW",
    redFlagsHi: "यदि बीपी 160/100 से अधिक हो और धुंधला दिखे तो आपातकालीन दवा आवश्यक।"
  },
  {
    id: "weakness-anemia",
    dialectHindi: "थकान, सांस फूलना और पीलापन (Extreme Fatigue & Pallor)",
    standardEnglish: "Nutritional Anemia",
    snomedConceptId: "271737000 (Anemia)",
    icd11Code: "3A00 (Iron deficiency anemia)",
    defaultPriority: "GREEN",
    redFlagsHi: "गर्भवती महिला में हीमोग्लोबिन 7 से कम होने पर तुरंत विशेषज्ञ रेफरल।"
  }
];
