import os
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as patches

# Set environment variable for matplotlib temp cache
os.environ['MPLCONFIGDIR'] = os.path.join(os.environ.get('TEMP', '.'), 'matplotlib_cache')

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'diagrams')
os.makedirs(OUTPUT_DIR, exist_ok=True)

def draw_rounded_box(ax, x, y, width, height, title, items=[], bg_color="#F8FAFC", border_color="#0F172A", title_color="#0F172A", title_bg=None, title_size=11, item_size=9, corner_radius=0.03):
    box = patches.FancyBboxPatch(
        (x, y), width, height,
        boxstyle=f"round,pad={corner_radius},rounding_size={corner_radius}",
        facecolor=bg_color, edgecolor=border_color, linewidth=1.5, zorder=2
    )
    ax.add_patch(box)
    
    current_y = y + height - 0.04
    if title_bg:
        t_box = patches.FancyBboxPatch(
            (x + 0.01, y + height - 0.07), width - 0.02, 0.06,
            boxstyle=f"round,pad=0.01,rounding_size=0.02",
            facecolor=title_bg, edgecolor="none", zorder=3
        )
        ax.add_patch(t_box)
        ax.text(x + width / 2.0, current_y - 0.01, title, ha="center", va="center", fontsize=title_size, fontweight="bold", color=title_color, zorder=4)
        current_y -= 0.07
    else:
        ax.text(x + width / 2.0, current_y, title, ha="center", va="center", fontsize=title_size, fontweight="bold", color=title_color, zorder=4)
        current_y -= 0.05
    
    for item in items:
        ax.text(x + 0.02, current_y, item, ha="left", va="center", fontsize=item_size, color="#334155", zorder=4)
        current_y -= 0.035

def draw_arrow(ax, x1, y1, x2, y2, label="", color="#0284C7", lw=1.5, rad=0.0):
    connectionstyle = f"arc3,rad={rad}" if rad != 0.0 else "arc3"
    arrow = patches.FancyArrowPatch(
        (x1, y1), (x2, y2),
        arrowstyle="-|>", mutation_scale=14,
        color=color, linewidth=lw, connectionstyle=connectionstyle, zorder=5
    )
    ax.add_patch(arrow)
    if label:
        mid_x = (x1 + x2) / 2.0
        mid_y = (y1 + y2) / 2.0
        ax.text(mid_x, mid_y + 0.015, label, ha="center", va="center", fontsize=8, fontweight="bold", color=color,
                bbox=dict(boxstyle="round,pad=0.2", facecolor="white", edgecolor=color, lw=0.8, alpha=0.9), zorder=6)

# ==============================================================================
# DIAGRAM 1: Tripartite System Architecture
# ==============================================================================
def generate_system_architecture():
    fig, ax = plt.subplots(figsize=(14, 9), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    # Overall Title
    ax.text(0.5, 0.97, "AarogyaSangam: Tripartite System Architecture", ha="center", va="center", fontsize=16, fontweight="bold", color="#073763")
    ax.text(0.5, 0.94, "Decoupled Offline-First Client Architecture with Serverless Sync & LiveKit WebRTC Cloud", ha="center", va="center", fontsize=10, style="italic", color="#475569")

    # 1. Tier Left: Frontline ASHA Kiosk
    tier1_bg = patches.FancyBboxPatch((0.03, 0.06), 0.28, 0.84, boxstyle="round,pad=0.02,rounding_size=0.02", facecolor="#ECFDF5", edgecolor="#059669", lw=2, linestyle="--", zorder=1)
    ax.add_patch(tier1_bg)
    ax.text(0.17, 0.88, "TIER 1: FRONTLINE ASHA KIOSK", ha="center", va="center", fontsize=11, fontweight="bold", color="#065F46")
    ax.text(0.17, 0.86, "(Budget Android / Tablet Client)", ha="center", va="center", fontsize=8, style="italic", color="#047857")

    draw_rounded_box(ax, 0.05, 0.65, 0.24, 0.19, "UI & Presentation Layer", [
        "• Next.js 16 & React 19 Client UI",
        "• LanguageContext (HI / MR / EN)",
        "• WCAG 48px Touch-First Targets",
        "• Vernacular Triage Input Form",
        "• Web Speech API (Voice Dictation)"
    ], bg_color="#FFFFFF", border_color="#10B981", title_bg="#10B981", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.05, 0.38, 0.24, 0.23, "Client Storage & Media Layer", [
        "• Dexie.js (IndexedDB Engine)",
        "  - db.patients (Demographics)",
        "  - db.triagePackets (Vitals & Flags)",
        "  - db.chatMessages (Local Chats)",
        "  - db.prescriptions (Rx Slips)",
        "• MediaStream Camera & Mic Hooks",
        "• Ringtone Audio Synthesizer"
    ], bg_color="#FFFFFF", border_color="#059669", title_bg="#059669", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.05, 0.09, 0.24, 0.25, "Frontline Offline Sync Worker", [
        "• useAutoSync Hook (`window.onOnline`)",
        "• Status-Flag Queueing (`status: queued`)",
        "• Persistent Floating Teleconsult Chat",
        "• Kiosk Call Initiator (`syncCallDoctor`)",
        "• Printable A4 Slip Generator (`@media print`)"
    ], bg_color="#FFFFFF", border_color="#047857", title_bg="#047857", title_color="#FFFFFF")

    # 2. Tier Middle: Cloud Sync & Edge Media Services
    tier2_bg = patches.FancyBboxPatch((0.36, 0.06), 0.28, 0.84, boxstyle="round,pad=0.02,rounding_size=0.02", facecolor="#EFF6FF", edgecolor="#2563EB", lw=2, linestyle="--", zorder=1)
    ax.add_patch(tier2_bg)
    ax.text(0.50, 0.88, "TIER 2: SERVERLESS CLOUD & SFU", ha="center", va="center", fontsize=11, fontweight="bold", color="#1E40AF")
    ax.text(0.50, 0.86, "(Vercel Edge & LiveKit Cloud)", ha="center", va="center", fontsize=8, style="italic", color="#1D4ED8")

    draw_rounded_box(ax, 0.38, 0.58, 0.24, 0.26, "Serverless Sync API (`/api/sync`)", [
        "• Global In-Memory Synchronization State",
        "• `action: register_patient` Handler",
        "• `action: call_doctor` Signaling Relay",
        "• `action: send_chat` Cross-Device Chat",
        "• `action: dispense_prescription` Hook",
        "• 2-Second Polling State Distribution"
    ], bg_color="#FFFFFF", border_color="#3B82F6", title_bg="#3B82F6", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.38, 0.33, 0.24, 0.21, "Authentication & Tokens (`/api/token`)", [
        "• LiveKit AccessToken Minting",
        "• Standardized Consultation Rooms",
        "  (`aarogya-consult-${patientId}`)",
        "• Signed JWT Identity & Video Grants",
        "• Room Permission Verification"
    ], bg_color="#FFFFFF", border_color="#2563EB", title_bg="#2563EB", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.38, 0.09, 0.24, 0.20, "LiveKit Cloud WebRTC SFU Gateway", [
        "• `wss://pbl-km1y90o5.livekit.cloud`",
        "• Selective Forwarding Unit (SFU)",
        "• Adaptive Resolution Downscaling",
        "• Low-Bitrate Opus Audio VoIP Priority"
    ], bg_color="#FFFFFF", border_color="#1D4ED8", title_bg="#1D4ED8", title_color="#FFFFFF")

    # 3. Tier Right: Remote Doctor Teleconsult Hub
    tier3_bg = patches.FancyBboxPatch((0.69, 0.06), 0.28, 0.84, boxstyle="round,pad=0.02,rounding_size=0.02", facecolor="#F8FAFC", edgecolor="#475569", lw=2, linestyle="--", zorder=1)
    ax.add_patch(tier3_bg)
    ax.text(0.83, 0.88, "TIER 3: DOCTOR TELECONSULT HUB", ha="center", va="center", fontsize=11, fontweight="bold", color="#0F172A")
    ax.text(0.83, 0.86, "(Medical Officer Desktop / Laptop)", ha="center", va="center", fontsize=8, style="italic", color="#334155")

    draw_rounded_box(ax, 0.71, 0.65, 0.24, 0.19, "Priority Triage Queue (`/doctor`)", [
        "• Auto-Polling Queue (Every 2s)",
        "• Color-Coded Triage (RED / YEL / GRN)",
        "• Live Patient Demographic & Vitals View",
        "• Instant Pulsing 'Pick Up Call' Trigger",
        "• Direct Rx Formulation Link"
    ], bg_color="#FFFFFF", border_color="#64748B", title_bg="#64748B", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.71, 0.38, 0.24, 0.23, "Consultation & Alert Engine", [
        "• IncomingCallAlert Modal Component",
        "• Web Audio 440/480Hz Telephone Chime",
        "• LiveKit Room Receiver (`/consult/[id]`)",
        "• Doctor Clinical Notes Textarea",
        "• Direct ASHA Chat Intercom Drawer"
    ], bg_color="#FFFFFF", border_color="#475569", title_bg="#475569", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.71, 0.09, 0.24, 0.25, "Jan Aushadhi Prescription Module", [
        "• Generic Drug Formulary (`janAushadhiFormulary`)",
        "• Dosage Schedule Pictograms (Sun/Moon/Food)",
        "• E-Prescription Dispatch & Sync",
        "• Treatment Completion Trigger (`status: dispensed`)",
        "• Doctor Treatment History Archive (`/doctor/history`)"
    ], bg_color="#FFFFFF", border_color="#334155", title_bg="#334155", title_color="#FFFFFF")

    # Connective Flow Arrows
    draw_arrow(ax, 0.29, 0.71, 0.38, 0.71, label="Batch Upload (when online)", color="#059669")
    draw_arrow(ax, 0.62, 0.71, 0.71, 0.71, label="Poll Queue (every 2s)", color="#2563EB")
    draw_arrow(ax, 0.29, 0.43, 0.38, 0.43, label="Request Token", color="#059669")
    draw_arrow(ax, 0.71, 0.43, 0.62, 0.43, label="Answer Call & Token", color="#2563EB")
    draw_arrow(ax, 0.29, 0.18, 0.38, 0.18, label="WebRTC Media Stream", color="#0D9488")
    draw_arrow(ax, 0.62, 0.18, 0.71, 0.18, label="WebRTC Media Stream", color="#0D9488")

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, "system_architecture.png")
    fig.savefig(output_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)
    print(f"Generated: {output_path}")

# ==============================================================================
# DIAGRAM 2: 4-Stage Clinical Lifecycle Flowchart
# ==============================================================================
def generate_clinical_workflow():
    fig, ax = plt.subplots(figsize=(15, 8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    ax.text(0.5, 0.96, "AarogyaSangam: 4-Stage Clinical Healthcare Lifecycle", ha="center", va="center", fontsize=16, fontweight="bold", color="#073763")
    ax.text(0.5, 0.92, "Resilient End-to-End Workflow from Village Patient Onboarding to History Archival", ha="center", va="center", fontsize=10, style="italic", color="#475569")

    stages = [
        ("STAGE 1: VILLAGE INTAKE", 0.03, "#059669", "#ECFDF5", [
            "1. Patient Arrives at Kiosk",
            "2. ASHA enters Name, Age, Village",
            "3. Captures BP, SpO2, Pulse vitals",
            "4. Records complaint in vernacular",
            "5. Rule engine flags urgency:",
            "   - SpO2 < 94% -> RED (Critical)",
            "   - Fever/Cough -> YELLOW (Urgent)",
            "   - Routine -> GREEN (Normal)",
            "6. Committed to Dexie IndexedDB",
            "   [status: 'queued'] - 100% Offline"
        ]),
        ("STAGE 2: AUTO-SYNC", 0.28, "#2563EB", "#EFF6FF", [
            "1. Client monitors `navigator.onLine`",
            "2. If offline, records wait in queue",
            "3. On network recovery (`window.onOnline`):",
            "   - `useAutoSync` triggers batch upload",
            "   - Calls `/api/sync` (register_patient)",
            "4. Local Dexie updated to `status: synced`",
            "5. Doctor Hub auto-polls `/api/sync`",
            "6. Doctor's queue updates in < 2.5s",
            "7. Green alert banner appears on Hub"
        ]),
        ("STAGE 3: TELECONSULTATION", 0.53, "#D97706", "#FFFBEB", [
            "1. Kiosk clicks 'Call Doctor'",
            "2. Dispatches `call_doctor` to `/api/sync`",
            "3. Doctor Hub detects incoming call",
            "4. Web Audio telephone chime sounds",
            "5. Doctor clicks 'Pick Up Call'",
            "6. Both join LiveKit Cloud room:",
            "   `aarogya-consult-${patientId}`",
            "7. If video bandwidth is poor:",
            "   - Graceful fallback to persistent chat",
            "   - Hindi / Marathi voice dictation"
        ]),
        ("STAGE 4: PRESCRIPTION & RECORD", 0.78, "#4B5563", "#F3F4F6", [
            "1. Doctor reviews vitals on screen",
            "2. Enters clinical diagnosis",
            "3. Selects bio-equivalent generic salts",
            "   from Jan Aushadhi formulary",
            "4. System attaches dosage pictograms:",
            "   (Sun / Noon / Moon / Meal plate)",
            "5. Clicks 'Save & Dispense Rx'",
            "6. Broadcasts `dispense_prescription`",
            "7. Patient moved to History Archive",
            "8. Kiosk prints A4 prescription slip"
        ])
    ]

    for title, x, border, bg, items in stages:
        box = patches.FancyBboxPatch((x, 0.08), 0.19, 0.78, boxstyle="round,pad=0.015,rounding_size=0.02", facecolor=bg, edgecolor=border, lw=2, zorder=2)
        ax.add_patch(box)
        t_box = patches.FancyBboxPatch((x + 0.005, 0.80), 0.18, 0.05, boxstyle="round,pad=0.01,rounding_size=0.01", facecolor=border, edgecolor="none", zorder=3)
        ax.add_patch(t_box)
        ax.text(x + 0.095, 0.825, title, ha="center", va="center", fontsize=9.5, fontweight="bold", color="#FFFFFF", zorder=4)
        
        curr_y = 0.75
        for it in items:
            weight = "bold" if it.startswith(("1.", "2.", "3.", "4.", "5.", "6.", "7.", "8.")) else "normal"
            ax.text(x + 0.012, curr_y, it, ha="left", va="center", fontsize=8.2, fontweight=weight, color="#1E293B", zorder=4)
            curr_y -= 0.038

    draw_arrow(ax, 0.22, 0.45, 0.28, 0.45, label="Network Detected", color="#059669")
    draw_arrow(ax, 0.47, 0.45, 0.53, 0.45, label="Queue Synced", color="#2563EB")
    draw_arrow(ax, 0.72, 0.45, 0.78, 0.45, label="Consult Done", color="#D97706")

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, "clinical_workflow.png")
    fig.savefig(output_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)
    print(f"Generated: {output_path}")

# ==============================================================================
# DIAGRAM 3: Offline-First Synchronization Sequence
# ==============================================================================
def generate_offline_sync_sequence():
    fig, ax = plt.subplots(figsize=(14, 8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    ax.text(0.5, 0.96, "AarogyaSangam: Offline-First Store-and-Forward Sync Sequence", ha="center", va="center", fontsize=15, fontweight="bold", color="#073763")
    ax.text(0.5, 0.92, "Asynchronous Data Persistence & Multi-Device Propagation Protocol", ha="center", va="center", fontsize=9.5, style="italic", color="#475569")

    columns = [
        ("ASHA Worker", 0.08),
        ("Kiosk UI (React)", 0.24),
        ("Dexie (IndexedDB)", 0.42),
        ("AutoSync Worker", 0.58),
        ("Serverless /api/sync", 0.75),
        ("Doctor Hub", 0.92)
    ]

    for name, x in columns:
        head = patches.FancyBboxPatch((x - 0.06, 0.83), 0.12, 0.05, boxstyle="round,pad=0.01", facecolor="#0F172A", edgecolor="#0F172A", zorder=3)
        ax.add_patch(head)
        ax.text(x, 0.855, name, ha="center", va="center", fontsize=8.5, fontweight="bold", color="#FFFFFF", zorder=4)
        ax.plot([x, x], [0.10, 0.83], color="#CBD5E1", linestyle="--", lw=1.5, zorder=1)

    steps = [
        (0.78, 0.08, 0.24, "1. Enters patient vitals while offline", "#0F172A", False),
        (0.72, 0.24, 0.42, "2. Saves locally (status: 'queued')", "#059669", False),
        (0.66, 0.42, 0.24, "3. Return local ID & render Queued Badge", "#059669", True),
        (0.58, 0.24, 0.08, "4. Instant confirmation (Zero Data Loss)", "#0F172A", True),
        (0.50, 0.58, 0.58, "=== Cellular Network Returns (window.onOnline) ===", "#D97706", "divider"),
        (0.44, 0.58, 0.42, "5. Query records where status == 'queued'", "#2563EB", False),
        (0.38, 0.42, 0.58, "6. Returns pending intake packets", "#2563EB", True),
        (0.32, 0.58, 0.75, "7. POST /api/sync { action: 'register_patient' }", "#2563EB", False),
        (0.26, 0.75, 0.58, "8. HTTP 200 OK (Acknowledge Sync)", "#2563EB", True),
        (0.20, 0.58, 0.42, "9. Update local records to status: 'synced'", "#059669", False),
        (0.14, 0.92, 0.75, "10. Poll GET /api/sync (Every 2s)", "#475569", False),
        (0.08, 0.75, 0.92, "11. Dispatch new patient -> update Doctor Queue live", "#059669", True)
    ]

    for y, x1, x2, msg, col, is_ret in steps:
        if is_ret == "divider":
            ax.plot([0.05, 0.95], [y, y], color="#F59E0B", linestyle=":", lw=2, zorder=2)
            ax.text(0.5, y + 0.015, msg, ha="center", va="center", fontsize=8.5, fontweight="bold", color="#B45309",
                    bbox=dict(boxstyle="round,pad=0.2", facecolor="#FEF3C7", edgecolor="#F59E0B", lw=1), zorder=3)
        else:
            style = "<|-" if is_ret else "-|>"
            arr = patches.FancyArrowPatch((x1, y), (x2, y), arrowstyle=style, mutation_scale=11, color=col, lw=1.3, zorder=3)
            ax.add_patch(arr)
            mid_x = (x1 + x2) / 2.0
            ax.text(mid_x, y + 0.015, msg, ha="center", va="center", fontsize=7.8, fontweight="bold", color=col,
                    bbox=dict(boxstyle="round,pad=0.15", facecolor="#FFFFFF", edgecolor="#E2E8F0", lw=0.6, alpha=0.9), zorder=4)

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, "offline_sync_sequence.png")
    fig.savefig(output_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)
    print(f"Generated: {output_path}")

# ==============================================================================
# DIAGRAM 4: Multi-Tier Teleconsultation & Call Signaling Flow
# ==============================================================================
def generate_teleconsult_flow():
    fig, ax = plt.subplots(figsize=(14, 8), dpi=300)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    fig.patch.set_facecolor("#FFFFFF")

    ax.text(0.5, 0.96, "AarogyaSangam: Multi-Tier Resilient Teleconsultation & Fallback", ha="center", va="center", fontsize=15, fontweight="bold", color="#073763")
    ax.text(0.5, 0.92, "Kiosk-Initiated Calling, Doctor Chime Alert & Adaptive 2G Chat Fallback", ha="center", va="center", fontsize=9.5, style="italic", color="#475569")

    # Start
    draw_rounded_box(ax, 0.05, 0.70, 0.22, 0.14, "1. Kiosk Consultation Request", [
        "• ASHA worker clicks:",
        "  'Call Doctor' button",
        "• Dispatches `call_doctor`",
        "  to `/api/sync`"
    ], bg_color="#ECFDF5", border_color="#059669", title_bg="#059669", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.38, 0.70, 0.24, 0.14, "2. Cloud Signaling Relay", [
        "• Serverless `/api/sync` sets",
        "  `activeCall.status = 'calling'`",
        "• Standardizes Room Name:",
        "  `aarogya-consult-${patientId}`"
    ], bg_color="#EFF6FF", border_color="#2563EB", title_bg="#2563EB", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.73, 0.70, 0.22, 0.14, "3. Doctor Hub Alert", [
        "• Polling detects incoming call",
        "• Web Audio 440/480Hz chime",
        "• IncomingCallAlert modal pops",
        "• Doctor clicks 'Pick Up'"
    ], bg_color="#FFFBEB", border_color="#D97706", title_bg="#D97706", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.38, 0.44, 0.24, 0.14, "4. WebRTC Connection", [
        "• Both fetch LiveKit token",
        "• Connect to LiveKit Cloud SFU",
        "• `activeCall.status = 'active'`",
        "• Bidirectional Video & Audio"
    ], bg_color="#F0FDF4", border_color="#16A34A", title_bg="#16A34A", title_color="#FFFFFF")

    # Decision diamond
    diamond = patches.Polygon([[0.50, 0.34], [0.60, 0.26], [0.50, 0.18], [0.40, 0.26]], closed=True, facecolor="#FEF2F2", edgecolor="#DC2626", lw=1.5, zorder=2)
    ax.add_patch(diamond)
    ax.text(0.50, 0.26, "Is Bandwidth\nSufficient?", ha="center", va="center", fontsize=8.5, fontweight="bold", color="#991B1B", zorder=3)

    draw_rounded_box(ax, 0.73, 0.18, 0.22, 0.16, "5A. Full Video Consult", [
        "• 720p / 360p Adaptive Video",
        "• Op-quality Voice Audio",
        "• Real-time Clinical Notes",
        "• Camera Device Switching"
    ], bg_color="#F8FAFC", border_color="#0F172A", title_bg="#0F172A", title_color="#FFFFFF")

    draw_rounded_box(ax, 0.05, 0.18, 0.22, 0.16, "5B. 2G Low-Bandwidth Chat", [
        "• Video drops gracefully",
        "• Persistent Floating Chat",
        "• Hindi/Marathi Speech-to-Text",
        "• Zero Session Interruption"
    ], bg_color="#FEF3C7", border_color="#B45309", title_bg="#B45309", title_color="#FFFFFF")

    draw_arrow(ax, 0.27, 0.77, 0.38, 0.77, color="#059669")
    draw_arrow(ax, 0.62, 0.77, 0.73, 0.77, color="#2563EB")
    draw_arrow(ax, 0.84, 0.70, 0.62, 0.51, label="Accepts Call", color="#D97706")
    draw_arrow(ax, 0.50, 0.44, 0.50, 0.34, color="#16A34A")
    draw_arrow(ax, 0.60, 0.26, 0.73, 0.26, label="YES (3G/4G)", color="#059669")
    draw_arrow(ax, 0.40, 0.26, 0.27, 0.26, label="NO (2G/Drop)", color="#DC2626")

    plt.tight_layout()
    output_path = os.path.join(OUTPUT_DIR, "teleconsult_flow.png")
    fig.savefig(output_path, dpi=300, facecolor=fig.get_facecolor(), edgecolor="none")
    plt.close(fig)
    print(f"Generated: {output_path}")

if __name__ == "__main__":
    generate_system_architecture()
    generate_clinical_workflow()
    generate_offline_sync_sequence()
    generate_teleconsult_flow()
    print("All diagrams generated successfully!")
