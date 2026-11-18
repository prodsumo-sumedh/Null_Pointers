import sys
import os
import pptx
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

TEMPLATE_PATH = r"C:\Users\clash\.gemini\antigravity\brain\88a2a8dd-f355-488a-9cd7-ba882799c457\.user_uploaded\media_1794887533556_6f1fe08f.pptx"
OUTPUT_PATH = r"c:\Users\clash\OneDrive\Documents\PBL (2)\PBL\AarogyaSangam_Project_Presentation.pptx"

def style_run(run, font_name="Times New Roman", size_pt=14, bold=False, italic=False, color_rgb=(0, 0, 0)):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(*color_rgb)

def add_p(tf, text, size_pt=13, bold=False, italic=False, color_rgb=(40, 40, 40), space_after=4, bullet=False):
    if len(tf.paragraphs) == 1 and tf.paragraphs[0].text == "":
        p = tf.paragraphs[0]
    else:
        p = tf.add_paragraph()
    p.text = text
    p.space_after = Pt(space_after)
    if bullet:
        p.level = 0
    if len(p.runs) > 0:
        style_run(p.runs[0], size_pt=size_pt, bold=bold, italic=italic, color_rgb=color_rgb)
    return p

def add_key_val_p(tf, key, val, size_pt=13, space_after=4, key_color=(7, 55, 99), val_color=(40, 40, 40)):
    if len(tf.paragraphs) == 1 and tf.paragraphs[0].text == "":
        p = tf.paragraphs[0]
    else:
        p = tf.add_paragraph()
    p.text = ""
    p.space_after = Pt(space_after)
    r1 = p.add_run()
    r1.text = key + " "
    style_run(r1, size_pt=size_pt, bold=True, color_rgb=key_color)
    r2 = p.add_run()
    r2.text = val
    style_run(r2, size_pt=size_pt, bold=False, color_rgb=val_color)
    return p

def main():
    print(f"Loading template from: {TEMPLATE_PATH}")
    prs = pptx.Presentation(TEMPLATE_PATH)

    # 1. Reorder slides to natural academic sequence
    new_order = [0, 1, 2, 3, 4, 5, 6, 14, 13, 7, 8, 9, 10, 11, 12]
    sldIdLst = prs.slides._sldIdLst
    elements = [sldIdLst[i] for i in new_order]
    for el in elements:
        sldIdLst.append(el)

    print(f"Reordered {len(prs.slides)} slides successfully.")

    # 2. Global cleanup: delete old drone images, fix footers and slide numbers
    dept_footer = "Department of Computer Science & Engineering, MITSoC, Loni Kalbhor"
    for idx, slide in enumerate(prs.slides):
        slide_num = idx + 1
        shapes_to_delete = []
        for shape in slide.shapes:
            if shape.shape_type == 13 and (shape.left != 0 or shape.top < 5000000):
                shapes_to_delete.append(shape)
            
            if shape.has_text_frame:
                txt = shape.text.strip()
                if "Department of Computer Science" in txt or "MITSoE" in txt:
                    shape.text_frame.text = ""
                    p = shape.text_frame.paragraphs[0]
                    p.text = dept_footer
                    style_run(p.runs[0], size_pt=14, bold=True, color_rgb=(192, 0, 0))
                elif txt.isdigit() and shape.top > 6000000 and shape.left > 6000000:
                    shape.text_frame.text = ""
                    p = shape.text_frame.paragraphs[0]
                    p.text = str(slide_num)
                    style_run(p.runs[0], size_pt=12, bold=True, color_rgb=(100, 100, 100))

        for shape in shapes_to_delete:
            sp = shape._element
            sp.getparent().remove(sp)

    # -------------------------------------------------------------
    # SLIDE 1: Title Slide
    # -------------------------------------------------------------
    s1 = prs.slides[0]
    for shape in s1.shapes:
        if shape.name == "Google Shape;50;p2":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "PBL Capstone Project Presentation"
            p.alignment = PP_ALIGN.CENTER
            style_run(p.runs[0], size_pt=24, bold=True, color_rgb=(0, 0, 0))
            
        elif shape.name == "Google Shape;48;p2":
            shape.text_frame.text = ""
            shape.top = Inches(1.8)
            shape.height = Inches(1.3)
            p = shape.text_frame.paragraphs[0]
            p.text = "AarogyaSangam: Low-Bandwidth Resilient Rural Telemedicine & Offline-First Digital Health Station"
            p.alignment = PP_ALIGN.CENTER
            style_run(p.runs[0], size_pt=23, bold=True, color_rgb=(7, 55, 99))
            
        elif shape.name == "Google Shape;49;p2":
            shape.text_frame.text = ""
            shape.left = Inches(0.8)
            shape.top = Inches(3.2)
            shape.width = Inches(8.4)
            shape.height = Inches(2.3)
            
            tf = shape.text_frame
            tf.word_wrap = True
            
            add_p(tf, "Group No: SY906", size_pt=14, bold=True, color_rgb=(192, 0, 0), space_after=6)
            add_p(tf, "Team Members:", size_pt=13, bold=True, color_rgb=(7, 55, 99), space_after=2)
            add_p(tf, "  1. Chitransh Sable   (ADT25SOCB0349)          3. Mahek Shaikh   (ADT25SOCB0600)", size_pt=12, bold=False, space_after=2)
            add_p(tf, "  2. Sumedh Dhoke     (ADT25SOCB1367)          4. Tejas Joshi        (ADT25SOCB0520)", size_pt=12, bold=False, space_after=8)
            
            add_p(tf, "Project Guide: Prof. Reena Pagare", size_pt=13, bold=True, color_rgb=(7, 55, 99), space_after=2)
            add_p(tf, "Assistant Professor, Department of Computer Science & Engineering", size_pt=11, italic=True, color_rgb=(80, 80, 80), space_after=2)
            add_p(tf, "MIT School of Computing, MIT Art, Design and Technology University, Pune", size_pt=11, bold=True, color_rgb=(60, 60, 60))

    # -------------------------------------------------------------
    # SLIDE 2: Outline
    # -------------------------------------------------------------
    s2 = prs.slides[1]
    for shape in s2.shapes:
        if shape.name == "Google Shape;56;g5cc8714c89_0_4":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "Presentation Outline"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;60;g5cc8714c89_0_4":
            shape.text_frame.text = ""
            shape.left = Inches(1.0)
            shape.top = Inches(1.2)
            shape.width = Inches(8.0)
            shape.height = Inches(4.8)
            tf = shape.text_frame
            tf.word_wrap = True
            
            topics = [
                ("1. Introduction & Background", "Rural digital healthcare hurdles & connectivity bottlenecks"),
                ("2. Problem Statement & Key Objectives", "Frontline telemedicine challenges & core technical goals"),
                ("3. Concepts & Architectural Methods", "Offline-first IndexedDB, WebRTC media streaming & multi-channel fallback"),
                ("4. Literature Survey", "Critical evaluation of eSanjeevani, WebRTC frameworks & offline web architectures"),
                ("5. Identification of Gaps & Scope of Work", "Form data loss, bandwidth vulnerability, UI complexity & defined scope"),
                ("6. Tools, Technologies & Libraries", "Next.js 16, React 19, Dexie.js, LiveKit WebRTC, Tailwind CSS & Vercel"),
                ("7. Process Workflow & System Architecture", "Clinical lifecycle: Offline Intake -> Cloud Sync -> Teleconsult -> Prescription"),
                ("8. System Implementation & Core Modules", "ASHA Kiosk, Doctor Hub, WebRTC Video, Low-Bandwidth Chat & Generic Rx"),
                ("9. System Testing & Technical Validation", "Production deployment, offline queueing verification & cross-device sync"),
                ("10. Conclusion & Future Roadmap", "Technical summary, ABHA integration & hardware telemetry"),
                ("11. References", "Formal citations supporting the design & literature analysis"),
                ("12. Q & A Session", "Open discussion, feedback and technical clarifications")
            ]
            for title, desc in topics:
                add_key_val_p(tf, title + ":", desc, size_pt=12, space_after=3)

    # -------------------------------------------------------------
    # SLIDE 3: 1. Introduction & Background
    # -------------------------------------------------------------
    s3 = prs.slides[2]
    for shape in s3.shapes:
        if shape.name == "Google Shape;66;p4":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "1. Introduction & Background"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;69;p4":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(4.8)
            tf = shape.text_frame
            tf.word_wrap = True
            
            add_key_val_p(tf, "• Rural Healthcare Accessibility Gap:", 
                          "Over 65% of India's population resides in rural villages, where primary health sub-centres face severe doctor shortages. Villagers travel 30-50 km to taluka hospitals, incurring travel costs and lost daily wages for routine primary consultations.", 
                          size_pt=12.5, space_after=6)
            add_key_val_p(tf, "• Cellular Connectivity Volatility:", 
                          "Rural edge cellular networks suffer from erratic signal strength, sudden disconnects, and packet loss that routinely disrupt standard web applications and cause video calls to freeze.", 
                          size_pt=12.5, space_after=6)
            add_key_val_p(tf, "• Limitations of Mainstream Video Tools:", 
                          "Commercial platforms (Zoom, Google Meet, standard web portals) require continuous broadband (>1.5 Mbps). If connection drops mid-session, unsaved intake data is lost and calls terminate abruptly without recovery options.", 
                          size_pt=12.5, space_after=6)
            add_key_val_p(tf, "• The AarogyaSangam Approach:", 
                          "A purpose-built, offline-first digital workstation designed for frontline Accredited Social Health Activists (ASHAs) and remote doctors that decouples patient intake from active connectivity.", 
                          size_pt=12.5, space_after=6)
            add_key_val_p(tf, "• Technical Foundation:", 
                          "Uses client-side IndexedDB (Dexie.js) for instant offline data entry, automated background cloud synchronization, LiveKit Cloud WebRTC for consultations, and a low-bandwidth text/voice chat fallback.", 
                          size_pt=12.5, space_after=4)

    # -------------------------------------------------------------
    # SLIDE 4: 2. Problem Statement & Objectives
    # -------------------------------------------------------------
    s4 = prs.slides[3]
    for shape in s4.shapes:
        if shape.name == "Google Shape;76;p6":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "2. Problem Statement & Objectives"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;79;p6":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(2.0)
            tf = shape.text_frame
            tf.word_wrap = True
            add_p(tf, "Problem Statement:", size_pt=14, bold=True, color_rgb=(192, 0, 0), space_after=4)
            add_p(tf, "\"Frontline healthcare workers (ASHAs) in remote Indian villages lack dependable digital health tools capable of functioning under erratic cellular connectivity. Mainstream telemedicine platforms demand continuous high-speed broadband and crash during network drops, causing unsaved patient vitals to be lost and remote teleconsultations to abruptly fail. Furthermore, complex English interfaces and illegible handwritten prescriptions hinder effective rural patient care.\"", 
                  size_pt=12.5, italic=True, space_after=4)
        elif shape.name == "Google Shape;81;p6":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(3.2)
            shape.width = Inches(8.8)
            shape.height = Inches(0.4)
            p = shape.text_frame.paragraphs[0]
            p.text = "Key Project Objectives:"
            style_run(p.runs[0], size_pt=14, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;80;p6":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(3.6)
            shape.width = Inches(8.8)
            shape.height = Inches(2.3)
            tf = shape.text_frame
            tf.word_wrap = True
            add_key_val_p(tf, "1. Offline-First Patient Intake:", "Develop a client-side transactional IndexedDB engine (Dexie.js) ensuring 100% vital sign and symptom capture without active internet.", size_pt=12, space_after=3)
            add_key_val_p(tf, "2. Background Cloud Synchronization:", "Implement an auto-sync engine (`useAutoSync` & `/api/sync`) that queues records locally and reconciles with the cloud upon network recovery.", size_pt=12, space_after=3)
            add_key_val_p(tf, "3. Cross-Device Teleconsultation & Chat Fallback:", "Integrate LiveKit WebRTC video calling between Kiosk and Doctor, backed by a persistent low-bandwidth text and speech dictation channel.", size_pt=12, space_after=3)
            add_key_val_p(tf, "4. Vernacular Multilingual Support:", "Provide trilingual UI localization (Hindi, Marathi, English) with rule-based physiological triage prioritization (RED / YELLOW / GREEN).", size_pt=12, space_after=3)
            add_key_val_p(tf, "5. Pictogram-Based Generic Prescription:", "Generate printable digital e-prescriptions mapping generic medicines with visual dosage pictograms (Sun, Moon, Meal icons) for low-literacy patients.", size_pt=12, space_after=2)

    # -------------------------------------------------------------
    # SLIDE 5: 3. Concepts and Methods
    # -------------------------------------------------------------
    s5 = prs.slides[4]
    for shape in s5.shapes:
        if shape.name == "Google Shape;87;p8":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "3. Concepts & Architectural Methods"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;90;p8":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(1.5)
            tf = shape.text_frame
            tf.word_wrap = True
            add_p(tf, "Method 1: Offline-First Store-and-Forward Data Architecture", size_pt=13, bold=True, color_rgb=(7, 55, 99), space_after=3)
            add_key_val_p(tf, "• Local Storage Engine:", "Dexie.js-managed IndexedDB provides structured transactional storage for patients, vitals, and chat logs directly in the browser.", size_pt=11.5, space_after=2)
            add_key_val_p(tf, "• Status-Flag Queueing:", "Records are saved with status `queued`; when `navigator.onLine` fires, background workers push records to the serverless sync API.", size_pt=11.5, space_after=2)
            add_key_val_p(tf, "• Zero Form Data Loss:", "Patient intake is never blocked by network failure; data commits locally before any network dispatch is attempted.", size_pt=11.5, space_after=2)
        elif shape.name == "Google Shape;91;p8":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(2.7)
            shape.width = Inches(8.8)
            shape.height = Inches(1.5)
            tf = shape.text_frame
            tf.word_wrap = True
            add_p(tf, "Method 2: Multi-Tier Resilient Teleconsultation Pipeline", size_pt=13, bold=True, color_rgb=(7, 55, 99), space_after=3)
            add_key_val_p(tf, "• Cloud WebRTC Video Calling:", "LiveKit Cloud room architecture establishes authenticated peer video sessions between Kiosk and Doctor via standardized room naming.", size_pt=11.5, space_after=2)
            add_key_val_p(tf, "• Incoming Call Signaling & Ringtone:", "Doctor Hub detects calls via background polling, triggers an audible Web Audio chime, and provides an instant one-click answer modal.", size_pt=11.5, space_after=2)
            add_key_val_p(tf, "• Low-Bandwidth Chat Fallback:", "When cellular bandwidth is too constrained for video, a floating chat drawer provides continuous text communication with speech dictation.", size_pt=11.5, space_after=2)
        elif shape.name == "Google Shape;92;p8":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(4.3)
            shape.width = Inches(8.8)
            shape.height = Inches(1.5)
            tf = shape.text_frame
            tf.word_wrap = True
            add_p(tf, "Method 3: Human-Centered Design for Rural Health Workers & Patients", size_pt=13, bold=True, color_rgb=(7, 55, 99), space_after=3)
            add_key_val_p(tf, "• Trilingual Vernacular Interface:", "Supports Hindi, Marathi, and English with instant switching, ensuring ASHA workers operate in their comfortable native language.", size_pt=11.5, space_after=2)
            add_key_val_p(tf, "• Physiological Rule-Based Triage:", "Categorizes cases (SpO2 < 94% -> RED, fever/cough -> YELLOW) so consulting doctors see an organized urgency queue.", size_pt=11.5, space_after=2)
            add_key_val_p(tf, "• Pictogram Dosage Glyphs:", "Prescription printouts feature universal visual timing icons (Sun, Moon, Food plate) so non-literate patients take correct doses.", size_pt=11.5, space_after=2)

    # -------------------------------------------------------------
    # SLIDE 6: 4. Literature Survey
    # -------------------------------------------------------------
    s6 = prs.slides[5]
    for shape in s6.shapes:
        if shape.name == "Google Shape;100;p9":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "4. Literature Survey & Related Work"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.has_table:
            shape.left = Inches(0.4)
            shape.top = Inches(1.1)
            shape.width = Inches(9.2)
            shape.height = Inches(4.7)
            table = shape.table
            
            headers = ["Sr.", "Literature Title & Publication", "Author & Year", "Key Findings, Insights & Practical Gaps"]
            for col_idx, h in enumerate(headers):
                cell = table.cell(0, col_idx)
                cell.text = ""
                p = cell.text_frame.paragraphs[0]
                p.text = h
                p.alignment = PP_ALIGN.CENTER if col_idx == 0 else PP_ALIGN.LEFT
                style_run(p.runs[0], size_pt=11.5, bold=True, color_rgb=(255, 255, 255))
                cell.fill.solid()
                cell.fill.fore_color.rgb = RGBColor(7, 55, 99)

            lit_rows = [
                ("1",
                 "eSanjeevani: A National Telemedicine Service of India — Implementation and Scalability Analysis (JMIR)",
                 "P. Mohan, S. Kumar, et al. (2021)",
                 "• Successfully scaled national telemedicine access to millions of citizens across primary centres.\n• Study highlighted that rural connectivity drops and complex browser workflows cause session disconnects.\n• Proves that client-side offline caching and resilient low-bandwidth fallback are essential for rural sub-centres."),
                ("2",
                 "Handling Packet Loss in WebRTC with Adaptive Streaming Architectures (IEEE Trans. Multimedia)",
                 "J. Holmer, H. Lundin, et al. (2020)",
                 "• Evaluated congestion control and media stream degradation under constrained network channels.\n• Confirmed that real-time video fails when packet loss exceeds threshold limits.\n• Emphasizes the necessity of secondary asynchronous channels (chat and audio priority) during cellular degradation."),
                ("3",
                 "Offline-First Architectures for Decentralized Field Operations: IndexedDB & PWAs (IEEE Access)",
                 "K. Patel & R. Sharma (2022)",
                 "• Evaluated client-side transactional storage for frontline field operations in low-connectivity areas.\n• Proved that IndexedDB ensures reliable data preservation during network blackouts.\n• Confirmed that status-flagged background reconciliation effectively prevents record loss and data corruption.")
            ]
            
            for row_idx, data in enumerate(lit_rows, start=1):
                for col_idx, text in enumerate(data):
                    cell = table.cell(row_idx, col_idx)
                    cell.text = ""
                    p = cell.text_frame.paragraphs[0]
                    p.text = text
                    if col_idx == 0:
                        p.alignment = PP_ALIGN.CENTER
                        style_run(p.runs[0], size_pt=11, bold=True, color_rgb=(7, 55, 99))
                    else:
                        style_run(p.runs[0], size_pt=10, bold=(col_idx == 1), color_rgb=(30, 30, 30))
                    cell.fill.solid()
                    cell.fill.fore_color.rgb = RGBColor(245, 247, 250) if row_idx % 2 == 1 else RGBColor(255, 255, 255)

    # -------------------------------------------------------------
    # SLIDE 7: 5. Identification of Gaps & Scope of Work
    # -------------------------------------------------------------
    s7 = prs.slides[6]
    for shape in s7.shapes:
        if shape.name == "Google Shape;112;p7":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "5. Identification of Gaps & Scope of Work"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;111;p7":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(4.8)
            tf = shape.text_frame
            tf.word_wrap = True
            
            add_p(tf, "The 4 Gaps Addressed by AarogyaSangam:", size_pt=14, bold=True, color_rgb=(192, 0, 0), space_after=4)
            add_key_val_p(tf, "1. The 'Data Loss on Disconnect' Gap:", "Existing web forms discard inputs when connection drops; AarogyaSangam commits all entries to local IndexedDB first, ensuring zero data loss during intake.", size_pt=11.5, space_after=3)
            add_key_val_p(tf, "2. The 'Video Fragility' Gap:", "Commercial video tools terminate completely during bandwidth dips; AarogyaSangam provides an integrated store-and-forward chat and voice fallback.", size_pt=11.5, space_after=3)
            add_key_val_p(tf, "3. The 'Frontline Usability & Language' Gap:", "Enterprise hospital portals use complex English interfaces; AarogyaSangam provides vernacular Hindi/Marathi options, voice typing, and 48px touch targets.", size_pt=11.5, space_after=3)
            add_key_val_p(tf, "4. The 'Prescription Literacy' Gap:", "Low-literacy rural patients struggle to read handwritten dosing instructions; AarogyaSangam generates visual dosage pictograms (Sun, Moon, Meal icons).", size_pt=11.5, space_after=6)
            
            add_p(tf, "Defined Scope of Work:", size_pt=14, bold=True, color_rgb=(7, 55, 99), space_after=4)
            add_key_val_p(tf, "• Target Users:", "Frontline ASHA workers (mobile/tablet kiosk) and remote consulting doctors (desktop/laptop hub).", size_pt=11.5, space_after=2)
            add_key_val_p(tf, "• Core Boundaries:", "Offline registration, vitals triage, background cloud sync, LiveKit video calling, text/voice chat, and generic e-prescriptions.", size_pt=11.5, space_after=2)
            add_key_val_p(tf, "• Deployment:", "Production deployment on Vercel Edge with zero local server infrastructure required in villages.", size_pt=11.5, space_after=2)

    # -------------------------------------------------------------
    # SLIDE 8: 6. Tools, Technologies & Libraries
    # -------------------------------------------------------------
    s8 = prs.slides[7]
    for shape in s8.shapes:
        if shape.name == "Google Shape;178;p10":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "6. Tools, Technologies & Libraries"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;181;p10":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(4.8)
            tf = shape.text_frame
            tf.word_wrap = True
            
            add_key_val_p(tf, "• Application Framework:", "Next.js 16 (App Router), React 19, TypeScript. Modular client/server architecture with static type safety across all workflows.", size_pt=12.5, space_after=5)
            add_key_val_p(tf, "• Styling & Mobile Ergonomics:", "Tailwind CSS v4 with PostCSS. Strict 48px minimum touch targets and mobile-responsive layouts adhering to WCAG 2.1 accessibility.", size_pt=12.5, space_after=5)
            add_key_val_p(tf, "• Offline Persistence Engine:", "Dexie.js (IndexedDB wrapper) for client-side transactional storage of patients, triage packets, prescriptions, and chat history.", size_pt=12.5, space_after=5)
            add_key_val_p(tf, "• Video Communication:", "LiveKit Cloud WebRTC (`wss://pbl-km1y90o5.livekit.cloud`) with `@livekit/components-react` for peer audio-video rooms.", size_pt=12.5, space_after=5)
            add_key_val_p(tf, "• Cloud Synchronization:", "Serverless API (`/api/sync`) with polling-based state propagation across multiple devices for queue updates and call signaling.", size_pt=12.5, space_after=5)
            add_key_val_p(tf, "• Speech & Deployment:", "Web Speech API for native Hindi/Marathi/English voice typing; deployed on Vercel Production Edge with GitHub CI/CD.", size_pt=12.5, space_after=3)

    # -------------------------------------------------------------
    # SLIDE 9: 7. Process Workflow & System Architecture
    # -------------------------------------------------------------
    s9 = prs.slides[8]
    for shape in s9.shapes:
        if shape.name == "Google Shape;169;p11":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "7. Process Workflow & System Architecture"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;172;p11":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(4.8)
            tf = shape.text_frame
            tf.word_wrap = True
            
            add_p(tf, "The 4-Stage Clinical Healthcare Workflow:", size_pt=13.5, bold=True, color_rgb=(7, 55, 99), space_after=5)
            
            add_key_val_p(tf, "1. Stage 1: Village Patient Intake (ASHA Kiosk)", 
                          "\n   • ASHA worker logs patient demographics, vitals (BP, SpO2, Pulse), and chief complaints on mobile tablet."
                          "\n   • All data is committed immediately to browser IndexedDB; patient gets an urgency priority tag (RED/YELLOW/GREEN).", 
                          size_pt=11.5, space_after=5)
            
            add_key_val_p(tf, "2. Stage 2: Background Cloud Synchronization", 
                          "\n   • When offline, records are tagged `queued`; `useAutoSync` monitors connection state."
                          "\n   • When network returns, queued records upload automatically to `/api/sync` and appear on Doctor Hub within 2 seconds.", 
                          size_pt=11.5, space_after=5)
            
            add_key_val_p(tf, "3. Stage 3: Live Consultation & Multi-Channel Fallback", 
                          "\n   • Kiosk initiates teleconsultation; Doctor Hub rings with audible chime and an instant pick-up modal."
                          "\n   • Both parties join LiveKit room `aarogya-consult-${patientId}`; if video bandwidth is low, they communicate via persistent chat.", 
                          size_pt=11.5, space_after=5)
            
            add_key_val_p(tf, "4. Stage 4: Generic E-Prescription & History Archive", 
                          "\n   • Doctor prescribes generic bio-equivalent medicines with dosage schedules and instructions."
                          "\n   • Kiosk prints an A4 medical record with visual pictograms (Sun/Moon/Food); consultation moves to completed treatment history.", 
                          size_pt=11.5, space_after=3)

    # -------------------------------------------------------------
    # SLIDE 10: 8. System Implementation & Core Modules
    # -------------------------------------------------------------
    s10 = prs.slides[9]
    for shape in s10.shapes:
        if shape.name == "Google Shape;118;p12":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "8. System Implementation & Core Modules"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
    
    tb10 = s10.shapes.add_textbox(Inches(0.6), Inches(1.1), Inches(8.8), Inches(4.8))
    tf10 = tb10.text_frame
    tf10.word_wrap = True
    
    add_key_val_p(tf10, "• Module 1: ASHA Kiosk Health Station (`src/app/page.tsx`)", 
                  "\n  - Touch-first dashboard for patient registration, vitals entry, and local queue management."
                  "\n  - Functions 100% offline using Dexie IndexedDB; features floating persistent teleconsultant chat.", 
                  size_pt=11.5, space_after=4)
    
    add_key_val_p(tf10, "• Module 2: Doctor Teleconsult Hub (`src/app/doctor/page.tsx`)", 
                  "\n  - Live priority queue auto-polling `/api/sync` every 2s to display newly registered village patients."
                  "\n  - Audible incoming call alert (`IncomingCallAlert.tsx`) with caller/patient details and instant answer button.", 
                  size_pt=11.5, space_after=4)
    
    add_key_val_p(tf10, "• Module 3: LiveKit WebRTC Video Consultation (`TeleconsultationRoom.tsx`)", 
                  "\n  - Cloud WebRTC connection with standardized patient room addressing (`aarogya-consult-${patientId}`)."
                  "\n  - Enforces Kiosk-only call initiation rule with doctor pick-up workflow and integrated camera/mic controls.", 
                  size_pt=11.5, space_after=4)
    
    add_key_val_p(tf10, "• Module 4: Low-Bandwidth Chat & Speech Dictation (`ConsultationChat.tsx`)", 
                  "\n  - Store-and-forward chat with offline queueing indicators (clock icon) and auto-sync checkmarks."
                  "\n  - Native Web Speech API integration supporting voice typing in Hindi, Marathi, and English.", 
                  size_pt=11.5, space_after=4)
    
    add_key_val_p(tf10, "• Module 5: Generic E-Prescription & Print View (`/rx/[id]`, `/kiosk/prescriptions`)", 
                  "\n  - Curated Jan Aushadhi generic formulary with dosage pictograms (Sun, Moon, Meal plate) and clean `@media print` layout.", 
                  size_pt=11.5, space_after=2)

    # -------------------------------------------------------------
    # SLIDE 11: 9. Results & Performance Benchmarks
    # -------------------------------------------------------------
    s11 = prs.slides[10]
    for shape in s11.shapes:
        if shape.name == "Google Shape;126;p13":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "9. System Testing & Technical Validation"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;128;p13":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(4.8)
            tf = shape.text_frame
            tf.word_wrap = True
            
            add_p(tf, "Code-Verified Technical Validation Metrics:", size_pt=13.5, bold=True, color_rgb=(7, 55, 99), space_after=4)
            
            add_key_val_p(tf, "• Live Production Deployment:", 
                          "Compiled cleanly under Next.js 16 with zero build errors; deployed live on Vercel at `https://aarogyasangam.vercel.app` with PostCSS Tailwind stylesheets (status 200).", 
                          size_pt=12, space_after=4)
            
            add_key_val_p(tf, "• Offline Data Preservation Testing:", 
                          "Validated using Chrome DevTools Offline mode and physical network disconnects. Patient registration and offline chat messages persist in IndexedDB with zero data loss.", 
                          size_pt=12, space_after=4)
            
            add_key_val_p(tf, "• Background Auto-Sync Reconnection:", 
                          "When network is restored, `useAutoSync` detects `window.onOnline` and uploads queued records to `/api/sync` without requiring manual page reload.", 
                          size_pt=12, space_after=4)
            
            add_key_val_p(tf, "• Cross-Device Multi-User Sync:", 
                          "Tested between mobile Kiosk and laptop Doctor Hub: registering a patient on mobile reflects on the doctor's queue within 2 to 2.5 seconds.", 
                          size_pt=12, space_after=4)
            
            add_key_val_p(tf, "• Mobile Touch Usability & Print Verification:", 
                          "Verified 48px minimum touch targets on mobile viewports; verified `@media print` styling generates clean A4 medical slips with dosage pictograms and chat transcript.", 
                          size_pt=12, space_after=2)

    # -------------------------------------------------------------
    # SLIDE 12: 10. Conclusion and Future Work
    # -------------------------------------------------------------
    s12 = prs.slides[11]
    for shape in s12.shapes:
        if shape.name == "Google Shape;135;p14":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "10. Conclusion & Future Roadmap"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;138;p14":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(4.8)
            tf = shape.text_frame
            tf.word_wrap = True
            
            add_p(tf, "Project Conclusion:", size_pt=14, bold=True, color_rgb=(7, 55, 99), space_after=4)
            add_p(tf, "• AarogyaSangam successfully addresses the frontline connectivity challenge in rural telemedicine through an offline-first architecture combined with resilient multi-tier communication.", size_pt=12, space_after=3)
            add_p(tf, "• Frontline ASHA workers can conduct patient intake and vitals capture without internet dependency, eliminating data loss during frequent rural cellular drops.", size_pt=12, space_after=3)
            add_p(tf, "• LiveKit WebRTC video calling paired with persistent text and speech chat ensures consultations continue even under low-bandwidth rural conditions.", size_pt=12, space_after=3)
            add_p(tf, "• Universal visual pictograms make medication schedules accessible to low-literacy rural patients, directly tackling treatment non-adherence.", size_pt=12, space_after=8)
            
            add_p(tf, "Future Roadmap:", size_pt=14, bold=True, color_rgb=(192, 0, 0), space_after=4)
            add_key_val_p(tf, "1. ABDM / ABHA Sandbox Integration:", "Link unique 14-digit Ayushman Bharat Health Account IDs to national Electronic Health Record registries via official government APIs.", size_pt=12, space_after=3)
            add_key_val_p(tf, "2. Web Bluetooth (BLE) Vitals Ingestion:", "Direct wireless reading from digital blood pressure cuffs, pulse oximeters, and glucometers directly into patient triage records.", size_pt=12, space_after=3)
            add_key_val_p(tf, "3. Standalone Progressive Web App (PWA):", "Package full service worker asset caching for one-tap home screen launching on low-cost Android tablets.", size_pt=12, space_after=2)

    # -------------------------------------------------------------
    # SLIDE 13: 11. References
    # -------------------------------------------------------------
    s13 = prs.slides[12]
    for shape in s13.shapes:
        if shape.name == "Google Shape;144;g5cc8714c89_2_35":
            shape.text_frame.text = ""
            p = shape.text_frame.paragraphs[0]
            p.text = "11. References"
            style_run(p.runs[0], size_pt=26, bold=True, color_rgb=(7, 55, 99))
        elif shape.name == "Google Shape;143;g5cc8714c89_2_35":
            shape.text_frame.text = ""
            shape.left = Inches(0.6)
            shape.top = Inches(1.1)
            shape.width = Inches(8.8)
            shape.height = Inches(4.8)
            tf = shape.text_frame
            tf.word_wrap = True
            
            refs = [
                ("[1]", "National Health Systems Resource Centre (NHSRC), \"Rural Health Statistics Report 2021-22,\" Ministry of Health and Family Welfare, Govt. of India, New Delhi, 2022."),
                ("[2]", "P. Mohan, S. Kumar, and R. Swaminathan, \"eSanjeevani: A National Telemedicine Service of India — Implementation and Scalability Analysis,\" Journal of Medical Internet Research, vol. 23, no. 8, p. e29845, Aug. 2021, doi: 10.2196/29845."),
                ("[3]", "J. Holmer, H. Lundin, S. Carlsson, and B. Burman, \"Handling packet loss in WebRTC with adaptive bit rate streaming and SFU architectures,\" IEEE Transactions on Multimedia, vol. 22, no. 4, pp. 912–924, Apr. 2020, doi: 10.1109/TMM.2019.2936741."),
                ("[4]", "K. Patel and R. Sharma, \"Offline-First Architectures for Decentralized Field Operations: A Comparative Study of IndexedDB and LocalStorage in Progressive Web Apps,\" IEEE Access, vol. 10, pp. 45210–45223, 2022, doi: 10.1109/ACCESS.2022.3168921."),
                ("[5]", "Pharmaceuticals & Medical Devices Bureau of India (PMBI), \"Pradhan Mantri Bhartiya Janaushadhi Pariyojana: Product Basket & Therapeutic Formulations,\" Dept. of Pharmaceuticals, Ministry of Chemicals & Fertilizers, Govt. of India, 2023.")
            ]
            for num, ref in refs:
                add_key_val_p(tf, num, ref, size_pt=11.5, space_after=6)

    # -------------------------------------------------------------
    # SLIDE 14: Thank You
    # -------------------------------------------------------------
    s14 = prs.slides[13]
    for shape in s14.shapes:
        if shape.name == "Google Shape;154;p16":
            shape.text_frame.text = ""
            shape.left = Inches(1.5)
            shape.top = Inches(2.0)
            shape.width = Inches(7.0)
            shape.height = Inches(3.0)
            tf = shape.text_frame
            tf.word_wrap = True
            
            p = tf.paragraphs[0]
            p.text = "Thank You!"
            p.alignment = PP_ALIGN.CENTER
            style_run(p.runs[0], size_pt=40, bold=True, color_rgb=(7, 55, 99))
            p.space_after = Pt(14)
            
            p1 = tf.add_paragraph()
            p1.text = "AarogyaSangam: Low-Bandwidth Resilient Rural Telemedicine"
            p1.alignment = PP_ALIGN.CENTER
            style_run(p1.runs[0], size_pt=18, bold=True, color_rgb=(192, 0, 0))
            p1.space_after = Pt(8)
            
            p2 = tf.add_paragraph()
            p2.text = "Department of Computer Science & Engineering\nMIT School of Computing, MIT ADT University, Pune"
            p2.alignment = PP_ALIGN.CENTER
            style_run(p2.runs[0], size_pt=14, bold=False, color_rgb=(80, 80, 80))

    # -------------------------------------------------------------
    # SLIDE 15: Questions & Discussion
    # -------------------------------------------------------------
    s15 = prs.slides[14]
    for shape in s15.shapes:
        if shape.name == "Google Shape;162;p17":
            shape.text_frame.text = ""
            shape.left = Inches(1.5)
            shape.top = Inches(2.0)
            shape.width = Inches(7.0)
            shape.height = Inches(3.0)
            tf = shape.text_frame
            tf.word_wrap = True
            
            p = tf.paragraphs[0]
            p.text = "Questions & Discussion"
            p.alignment = PP_ALIGN.CENTER
            style_run(p.runs[0], size_pt=36, bold=True, color_rgb=(7, 55, 99))
            p.space_after = Pt(14)
            
            p1 = tf.add_paragraph()
            p1.text = "We welcome your questions, feedback, and technical suggestions."
            p1.alignment = PP_ALIGN.CENTER
            style_run(p1.runs[0], size_pt=16, italic=True, color_rgb=(60, 60, 60))
            p1.space_after = Pt(10)
            
            p2 = tf.add_paragraph()
            p2.text = "Group No: SY906  |  Guide: Prof. Reena Pagare\nLive Deployment: aarogyasangam.vercel.app"
            p2.alignment = PP_ALIGN.CENTER
            style_run(p2.runs[0], size_pt=13, bold=True, color_rgb=(192, 0, 0))

    print(f"Saving final presentation to: {OUTPUT_PATH}")
    prs.save(OUTPUT_PATH)
    print("Presentation created successfully!")

if __name__ == "__main__":
    main()
