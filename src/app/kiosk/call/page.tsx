"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, Patient, TriagePacket, DEFAULT_PATIENTS, DEFAULT_TRIAGE_PACKETS } from "@/lib/db";
import ConsultationChat from "@/components/ConsultationChat";
import {
  RTC_CONFIG,
  getSignalingSocket,
  getUserMediaStream,
  stopMediaStream,
  getVideoInputDevices,
  switchCameraStream,
  parseMediaError,
  MediaErrorInfo,
} from "@/lib/webrtc";
import {
  PhoneCall,
  PhoneOff,
  PhoneIncoming,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Activity,
  HeartPulse,
  Signal,
  CheckCircle2,
  FileText,
  Printer,
  Sparkles,
  Volume2,
  Send,
  User,
  ShieldCheck,
  RefreshCw,
  Building2,
  ArrowRight,
  SwitchCamera,
  AlertTriangle,
  Camera,
} from "lucide-react";
import type { Socket } from "socket.io-client";

function KioskCallReceiverContent() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientParamId = searchParams.get("patientId");
  const [mounted, setMounted] = useState(false);

  // Call states: "IDLE" | "CALLING" | "RINGING" | "CONNECTED" | "ENDED"
  const [callState, setCallState] = useState<"IDLE" | "CALLING" | "RINGING" | "CONNECTED" | "ENDED">("IDLE");
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [networkTier, setNetworkTier] = useState<"HD" | "2G" | "AUDIO_ONLY">("HD");
  const [callerName, setCallerName] = useState("Dr. Rajesh Sharma, MD");
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Dual camera & Permissions state
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">("user");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [mediaError, setMediaError] = useState<MediaErrorInfo | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);

  // In-call chat
  const [messages, setMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [inputMsg, setInputMsg] = useState("");

  // WebRTC refs
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const pendingOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [isPreviewingCamera, setIsPreviewingCamera] = useState(false);

  const patients =
    useLiveQuery(
      async () => {
        try {
          const list = await db.patients.toArray();
          return list && list.length > 0 ? list : DEFAULT_PATIENTS;
        } catch (err) {
          console.error("[KioskCall] Dexie error reading patients, falling back to defaults:", err);
          return DEFAULT_PATIENTS;
        }
      },
      [],
      DEFAULT_PATIENTS
    ) ?? DEFAULT_PATIENTS;

  const triagePackets =
    useLiveQuery(
      async () => {
        try {
          const list = await db.triagePackets.toArray();
          return list && list.length > 0 ? list : DEFAULT_TRIAGE_PACKETS;
        } catch (err) {
          console.error("[KioskCall] Dexie error reading triage packets, falling back to defaults:", err);
          return DEFAULT_TRIAGE_PACKETS;
        }
      },
      [],
      DEFAULT_TRIAGE_PACKETS
    ) ?? DEFAULT_TRIAGE_PACKETS;

  useEffect(() => {
    console.log("[KioskCall] Kiosk call page mounted on client.");
    setMounted(true);
    // Enumerate connected cameras
    getVideoInputDevices()
      .then((devices) => {
        setAvailableCameras(devices);
      })
      .catch((err) => {
        console.error("[KioskCall] Failed to enumerate video input devices:", err);
      });
  }, []);

  // Safety fallback for mobile browser loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted((prev) => {
        if (!prev) {
          console.warn("[KioskCall] Safety timer forced mounted=true");
          return true;
        }
        return prev;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Set default selected patient or from query param
  useEffect(() => {
    if (patientParamId && patients.length > 0) {
      const match = patients.find((p) => p.id === Number(patientParamId));
      if (match?.id) {
        setSelectedPatientId(match.id);
        return;
      }
    }
    if (patients.length > 0 && selectedPatientId === null && patients[0].id) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId, patientParamId]);

  const fallbackPatient: Patient = {
    id: 1,
    name: "शांति देवी (Shanti Devi)",
    age: 52,
    gender: "Female",
    village: "रामपुर (Rampur)",
    phone: "9876543210",
    abhaId: "91-4521-8942-1049",
    createdAt: new Date().toISOString(),
  };

  const activePatient = (patients.length > 0 ? (patients.find((p) => p.id === selectedPatientId) || patients[0]) : null) || fallbackPatient;
  const activeTriage = (triagePackets.length > 0 ? (triagePackets.find((t) => t.patientId === activePatient?.id) || triagePackets[triagePackets.length - 1]) : null) || {
    patientId: activePatient.id || 1,
    chiefComplaint: "4 दिन से खांसी और बुखार (Fever & Cough)",
    bloodPressure: "130/85",
    spo2: 97,
    pulse: 78,
    status: "queued",
    createdAt: new Date().toISOString(),
  };

  const roomId = `consult-room-${activePatient?.id || 1}`;

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callState === "CONNECTED") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setCallDuration(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // Synchronize video element references with streams on render/state changes
  useEffect(() => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [callState, isPreviewingCamera]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [callState, hasRemoteVideo]);

  // Create PeerConnection for Kiosk
  const createPeerConnection = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Attach local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Attach remote track (Doctor's feed)
    pc.ontrack = (event) => {
      console.log("[WebRTC Kiosk] Received remote track:", event.track.kind);
      if (event.streams && event.streams[0]) {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
        setHasRemoteVideo(true);
      }
    };

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log("[WebRTC Kiosk] Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallState("CONNECTED");
      }
    };

    return pc;
  }, [roomId]);

  // Handle WebRTC Offer from Doctor
  const processOffer = useCallback(async (pc: RTCPeerConnection, offerSdp: RTCSessionDescriptionInit) => {
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offerSdp));

      // Flush pending ICE candidates
      while (pendingCandidatesRef.current.length > 0) {
        const candidate = pendingCandidatesRef.current.shift();
        if (candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        }
      }

      // Create Answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (socketRef.current) {
        socketRef.current.emit("answer", {
          roomId,
          sdp: answer,
        });
      }
    } catch (err) {
      console.error("[WebRTC Kiosk] Error handling offer:", err);
    }
  }, [roomId]);

  // End Call Handler
  const handleEndCall = useCallback((notifyPeer = true) => {
    console.log("[Kiosk] handleEndCall, notifyPeer:", notifyPeer);
    if (notifyPeer && socketRef.current) {
      socketRef.current.emit("end-call", { roomId });
    }
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {
        console.warn("Error closing pc:", e);
      }
      pcRef.current = null;
    }
    stopMediaStream(localStreamRef.current);
    localStreamRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setHasRemoteVideo(false);
    setCallState("ENDED");
  }, [roomId]);

  const handleEndCallRef = useRef(handleEndCall);
  useEffect(() => {
    handleEndCallRef.current = handleEndCall;
  });

  // Initiate Outgoing Call to Doctor
  const handleInitiateCall = async () => {
    try {
      setMediaError(null);
      setCallState("CALLING");

      // Initialize Kiosk camera & microphone (with synthetic fallback if hardware is locked)
      let stream: MediaStream;
      try {
        stream = await getUserMediaStream(
          { video: { facingMode: cameraFacingMode }, audio: true },
          "कियोस्क लाइव कैमरा (Kiosk Patient View)"
        );
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (mediaErr) {
        const parsed = parseMediaError(mediaErr);
        setMediaError(parsed);
      }

      // Setup Peer Connection
      const pc = createPeerConnection();

      // Emit call-user event
      if (socketRef.current) {
        socketRef.current.emit("call-user", {
          roomId,
          patientId: activePatient?.id || 1,
          patientName: activePatient?.name || "शांति देवी",
          callerName: user?.name || "कियोस्क ऑपरेटर",
          role: "kiosk",
        });

        // Create SDP Offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("offer", {
          roomId,
          sdp: offer,
        });
      }
    } catch (err) {
      console.error("[Kiosk] Error initiating call:", err);
      setCallState("IDLE");
    }
  };

  const handleCancelCall = () => {
    if (socketRef.current) {
      socketRef.current.emit("cancel-call", { roomId });
    }
    handleEndCall(false);
    setCallState("IDLE");
  };

  // Test Camera & Microphone Permissions directly
  const handleTestCamera = async () => {
    setMediaError(null);
    try {
      if (isPreviewingCamera && localStreamRef.current) {
        stopMediaStream(localStreamRef.current);
        localStreamRef.current = null;
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        setIsPreviewingCamera(false);
        return;
      }
      setIsPreviewingCamera(true);
      const st = await getUserMediaStream(
        { video: { facingMode: cameraFacingMode }, audio: true },
        "कियोस्क टेस्ट कैमरा"
      );
      localStreamRef.current = st;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = st;
      }
    } catch (e) {
      setMediaError(parseMediaError(e));
      setIsPreviewingCamera(false);
    }
  };

  // Socket Connection setup
  useEffect(() => {
    const socket = getSignalingSocket();
    socketRef.current = socket;

    if (socket.connected) setIsSocketConnected(true);
    socket.on("connect", () => setIsSocketConnected(true));
    socket.on("disconnect", () => setIsSocketConnected(false));

    socket.emit("join-room", {
      roomId,
      role: "kiosk",
      userName: user?.name || "कियोस्क ऑपरेटर",
    });

    // When doctor calls
    socket.on("incoming-call", (data: { callerName?: string }) => {
      console.log("[Kiosk Socket] Incoming call from doctor:", data);
      if (data.callerName) setCallerName(data.callerName);
      setCallState("RINGING");
    });

    // When doctor accepts kiosk's call
    socket.on("call-accepted", () => {
      console.log("[Kiosk Socket] Doctor accepted the call");
      setCallState("CONNECTED");
    });

    // When doctor declines call
    socket.on("call-declined", () => {
      console.log("[Kiosk Socket] Call declined by doctor");
      alert("डॉक्टर अभी व्यस्त हैं या कॉल अस्वीकार कर दी गई (Doctor is busy or call declined)");
      handleEndCallRef.current(false);
      setCallState("IDLE");
    });

    // When doctor joins the room while Kiosk is in CALLING state
    socket.on("user-joined", (peer: { socketId: string; role: string; userName: string }) => {
      console.log("[Kiosk Socket] User joined:", peer);
      if (peer.role === "doctor" && pcRef.current?.localDescription) {
        console.log("[Kiosk Socket] Doctor joined; sending offer to doctor");
        socket.emit("offer", { roomId, sdp: pcRef.current.localDescription });
      }
    });

    // When doctor sends SDP offer
    socket.on("offer", async ({ sdp }) => {
      console.log("[Kiosk Socket] Received SDP offer from doctor");
      pendingOfferRef.current = sdp;
      if (callState === "CONNECTED" && pcRef.current) {
        await processOffer(pcRef.current, sdp);
      }
    });

    // When doctor sends SDP answer (after Kiosk initiated call)
    socket.on("answer", async ({ sdp }) => {
      console.log("[Kiosk Socket] Received SDP answer from doctor");
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            if (candidate) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
          setCallState("CONNECTED");
        } catch (e) {
          console.error("[Kiosk Socket] Error setting remote description for answer:", e);
        }
      }
    });

    // When doctor sends ICE candidate
    socket.on("ice-candidate", async ({ candidate }) => {
      if (pcRef.current && pcRef.current.remoteDescription && pcRef.current.remoteDescription.type) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error("Error adding ice candidate:", e);
        }
      } else if (candidate) {
        pendingCandidatesRef.current.push(candidate);
      }
    });

    // When doctor changes degradation tier
    socket.on("tier-change", ({ tier }: { tier: string }) => {
      if (tier === "TIER_1_720P") setNetworkTier("HD");
      else if (tier === "TIER_2_LOW_BITRATE") setNetworkTier("2G");
      else setNetworkTier("AUDIO_ONLY");
    });

    // Live chat message from Doctor
    socket.on("chat-message", (msg: { text: string; sender: string; time: string }) => {
      setMessages((prev) => [...prev, msg]);
    });

    // Call ended by doctor
    socket.on("call-ended", () => {
      console.log("[Kiosk Socket] Call ended event from doctor");
      handleEndCallRef.current(false);
    });

    return () => {
      socket.off("incoming-call");
      socket.off("call-accepted");
      socket.off("call-declined");
      socket.off("user-joined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("tier-change");
      socket.off("chat-message");
      socket.off("call-ended");
    };
  }, [roomId, user?.name, callState, processOffer]);

  // Accept incoming call
  const handleAcceptCall = async () => {
    try {
      setMediaError(null);
      setCallState("CONNECTED");

      // Notify doctor
      if (socketRef.current) {
        socketRef.current.emit("call-accepted", { roomId });
      }

      // Initialize Kiosk camera & microphone
      let stream: MediaStream;
      try {
        stream = await getUserMediaStream({ video: { facingMode: cameraFacingMode }, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (mediaErr) {
        const parsed = parseMediaError(mediaErr);
        setMediaError(parsed);
        console.error("[Kiosk Media Error]", mediaErr);
        return;
      }

      // Setup Peer Connection
      const pc = createPeerConnection();

      // If doctor already sent offer, answer it
      if (pendingOfferRef.current) {
        await processOffer(pc, pendingOfferRef.current);
        pendingOfferRef.current = null;
      }

      // Default welcome message
      setMessages((prev) => [
        ...prev,
        {
          sender: callerName || "Dr. Rajesh Sharma, MD",
          text: `नमस्ते सुनीता जी, मैंने मरीज ${activePatient?.name || "शांति देवी"} का रिकॉर्ड देखा है। क्या मरीज स्क्रीन के सामने हैं?`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.error("[Kiosk] Error accepting call:", err);
    }
  };

  // Toggle Camera Facing Mode (Front / Patient Face ↔ Rear / Examination Camera)
  const handleToggleCameraFacingMode = async () => {
    const nextMode = cameraFacingMode === "user" ? "environment" : "user";
    setIsSwitchingCamera(true);
    setMediaError(null);
    try {
      const { newStream } = await switchCameraStream(pcRef.current, localStreamRef.current, nextMode);
      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      setCameraFacingMode(nextMode);

      // Notify doctor
      if (socketRef.current) {
        socketRef.current.emit("camera-mode-changed", { roomId, mode: nextMode });
      }
    } catch (err) {
      console.warn("Error switching camera facing mode:", err);
      setMediaError(parseMediaError(err));
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  const handleDeclineCall = () => {
    if (socketRef.current) {
      socketRef.current.emit("call-declined", { roomId });
    }
    setCallState("IDLE");
  };

  const handleToggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    const msgObj = {
      sender: user?.name || "कियोस्क ऑपरेटर",
      text: inputMsg.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msgObj]);
    if (socketRef.current) {
      socketRef.current.emit("chat-message", {
        roomId,
        ...msgObj,
      });
    }
    setInputMsg("");
  };

  const handleQuickIntercom = (text: string) => {
    const msgObj = {
      sender: user?.name || "कियोस्क ऑपरेटर",
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, msgObj]);
    if (socketRef.current) {
      socketRef.current.emit("chat-message", {
        roomId,
        ...msgObj,
      });
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700 font-sans">
        <div className="flex items-center gap-3 text-sm font-semibold">
          <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
          लोड हो रहा है...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Banner */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>डॉक्टर कॉल रिसीवर (Doctor Call Receiver)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                  स्वास्थ्य केंद्र
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-semibold border border-slate-200">
                  रूम: #{roomId}
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                रिमोट विशेषज्ञ डॉक्टर से वीडियो व ऑडियो परामर्श प्राप्त करें
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Patient Selector */}
            {patients.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500 font-medium">परामर्श मरीज:</span>
                <select
                  value={selectedPatientId || ""}
                  onChange={(e) => setSelectedPatientId(Number(e.target.value))}
                  disabled={callState === "CONNECTED"}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.age}y, {p.village})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Test Call Button */}
            {callState === "IDLE" && (
              <button
                onClick={() => setCallState("RINGING")}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 flex items-center gap-1.5 transition-all"
              >
                <PhoneIncoming className="w-3.5 h-3.5 text-slate-600" />
                <span>कॉल टेस्ट रिंग (Test Ring)</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 flex-1 flex flex-col justify-center">
        {/* Permission Denied / Hardware Warning Banner */}
        {mediaError && (
          <div className="max-w-3xl mx-auto w-full mb-4 bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-rose-900">
                    {mediaError.friendlyMessageHi}
                  </h4>
                  <button
                    onClick={() => setMediaError(null)}
                    className="text-xs text-rose-500 hover:text-rose-700 font-bold p-1 rounded hover:bg-rose-100"
                    title="Dismiss"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-rose-800 font-medium mt-1">
                  👉 {mediaError.instructionsHi}
                </p>
                <p className="text-[11px] text-rose-600 mt-0.5 italic">
                  {mediaError.instructionsEn}
                </p>

                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      setMediaError(null);
                      if (callState === "CONNECTED") {
                        handleAcceptCall();
                      } else {
                        getUserMediaStream({ video: { facingMode: cameraFacingMode }, audio: true })
                          .then((st) => {
                            localStreamRef.current = st;
                            if (localVideoRef.current) localVideoRef.current.srcObject = st;
                          })
                          .catch((e) => setMediaError(parseMediaError(e)));
                      }
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>पुनः अनुमति जांचें (Retry Permissions)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* State 1: IDLE (Waiting for calls) */}
        {callState === "IDLE" && (
          <div className="max-w-xl mx-auto w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
              <span className="absolute w-24 h-24 rounded-full bg-emerald-200/40 animate-ping" />
              <PhoneCall className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                कियोस्क लाइन तैयार है (Kiosk Line Ready)
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                जब भी रिमोट विशेषज्ञ डॉक्टर कंसल्टेशन शुरू करेंगे, कियोस्क स्क्रीन पर कॉल की घंटी बजेगी।
              </p>
            </div>

            {/* Selected Patient Information Card */}
            {activePatient ? (
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">वर्तमान मरीज:</span>
                  <span className="font-bold text-slate-900">{activePatient.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>गाँव: {activePatient.village} ({activePatient.age} वर्ष)</span>
                  <span>फोन: {activePatient.phone}</span>
                </div>
                {activeTriage && (
                  <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">वाइटल्स: BP: {activeTriage.bloodPressure} | SpO2: {activeTriage.spo2}%</span>
                    <span className="font-semibold text-emerald-700">तैयार</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800">
                ⚠️ अभी कोई मरीज पंजीकृत नहीं है। पहले <Link href="/" className="font-bold underline">पंजीकरण कतार</Link> में मरीज जोड़ें या + डेमो डेटा लोड करें।
              </div>
            )}

            {/* Camera Test Preview Box */}
            {isPreviewingCamera && (
              <div className="w-full h-44 rounded-xl bg-slate-900 overflow-hidden relative border-2 border-emerald-500 shadow-md">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                  ● कैमरा लाइव (Camera Working)
                </div>
              </div>
            )}

            {/* Primary Action: Call Doctor (Always Available) */}
            <button
              onClick={handleInitiateCall}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <PhoneCall className="w-5 h-5 animate-pulse" />
              <span>डॉक्टर को कॉल करें (Call Doctor Now)</span>
            </button>

            {/* Socket Status & Test Camera Action Bar */}
            <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${isSocketConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
                <span className="text-[11px] font-medium">
                  {isSocketConnected ? "सिग्नलिंग सर्वर सक्रिय है (Connected)" : "सिग्नलिंग डिस्कनेक्ट"}
                </span>
              </div>

              <button
                onClick={handleTestCamera}
                className="px-2.5 py-1 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-semibold transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600" />
                <span>{isPreviewingCamera ? "कैमरा बंद करें" : "कैमरा जांचें (Test Camera)"}</span>
              </button>
            </div>
          </div>
        )}

        {/* State: CALLING (Outgoing Call from Kiosk to Doctor) */}
        {callState === "CALLING" && (
          <div className="max-w-md mx-auto w-full bg-white rounded-3xl border-2 border-emerald-500 shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-600 text-white shadow-lg mx-auto">
              <span className="absolute w-28 h-28 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <PhoneCall className="w-12 h-12 animate-bounce" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold animate-pulse">
                डॉक्टर को कॉल की जा रही है...
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                {callerName}
              </h2>
              <p className="text-xs text-slate-500">
                विशेषज्ञ डॉक्टर द्वारा कॉल उठाने की प्रतीक्षा की जा रही है
              </p>
            </div>

            {/* Local camera preview */}
            <div className="w-48 h-36 mx-auto rounded-2xl bg-slate-900 border border-slate-200 overflow-hidden shadow-inner relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-white">
                आपका कैमरा लाइव
              </div>
            </div>

            {/* Patient Context */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                मरीज: {activePatient?.name || "शांति देवी"} ({activePatient?.village || "रामपुर"})
              </p>
              <p className="text-[11px] text-slate-500">
                शिकायत: {activeTriage?.chiefComplaint || "खांसी व बुखार की जांच"}
              </p>
            </div>

            {/* Cancel Call Button */}
            <div className="pt-2">
              <button
                onClick={handleCancelCall}
                className="w-full h-12 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>कॉल रद्द करें (Cancel Call)</span>
              </button>
            </div>
          </div>
        )}

        {/* State 2: RINGING (Incoming Call from Doctor) */}
        {callState === "RINGING" && (
          <div className="max-w-md mx-auto w-full bg-white rounded-3xl border-2 border-emerald-500 shadow-xl p-8 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="relative inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-600 text-white shadow-lg mx-auto">
              <span className="absolute w-28 h-28 rounded-full bg-emerald-400 animate-ping opacity-75" />
              <PhoneIncoming className="w-12 h-12" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold animate-pulse">
                डॉक्टर की इनकमिंग कॉल...
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">
                {callerName}
              </h2>
              <p className="text-xs text-slate-500">
                रिमोट विशेषज्ञ • Internal Medicine Specialist
              </p>
            </div>

            {/* Patient Context */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                मरीज: {activePatient?.name || "शांति देवी"} ({activePatient?.village || "रामपुर"})
              </p>
              <p className="text-[11px] text-slate-500">
                शिकायत: {activeTriage?.chiefComplaint || "खांसी व बुखार की जांच"}
              </p>
            </div>

            {/* Accept / Decline Buttons */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleDeclineCall}
                className="h-12 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-4 h-4" />
                <span>अस्वीकार करें</span>
              </button>

              <button
                onClick={handleAcceptCall}
                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 animate-bounce" />
                <span>कॉल उठाएं (Accept)</span>
              </button>
            </div>
          </div>
        )}

        {/* State 3: CONNECTED (Active Consultation Workspace) */}
        {callState === "CONNECTED" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch h-full min-h-[580px]">
            {/* Left 8 Cols: Large Video View & Vitals Bar */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              {/* Main Doctor Video Viewport */}
              <div className="relative bg-slate-950 rounded-2xl border border-slate-200 overflow-hidden flex-1 min-h-[440px] flex flex-col justify-between shadow-sm">
                {/* Header in Video */}
                <div className="p-3.5 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between text-white text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <div>
                      <p className="font-bold">{callerName} (लाइव)</p>
                      <p className="text-[10px] text-slate-300">समय: {formatSeconds(callDuration)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Clinical Rear Camera Status Pill */}
                    {cameraFacingMode === "environment" && (
                      <span className="hidden sm:inline-flex items-center gap-1 bg-amber-500/90 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm animate-pulse">
                        <Camera className="w-3 h-3" />
                        जांच कैमरा सक्रिय (Exam Mode)
                      </span>
                    )}

                    {/* Network Quality Badge */}
                    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full text-[11px] border border-white/20">
                      <Signal className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{networkTier === "HD" ? "HD 720p वीडियो" : networkTier === "2G" ? "2G लो-बैंडविड्थ" : "केवल ऑडियो"}</span>
                    </div>
                  </div>
                </div>

                {/* Central Video Viewport with Live Remote Stream */}
                <div className="flex-1 relative flex flex-col items-center justify-center text-center p-4 text-white overflow-hidden">
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                      hasRemoteVideo && networkTier !== "AUDIO_ONLY" ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                  />

                  {/* Rear Examination Mode Overlay Alert for Operator */}
                  {cameraFacingMode === "environment" && (
                    <div className="absolute top-12 left-4 right-4 z-20 flex items-center justify-center pointer-events-none">
                      <div className="bg-amber-500/90 text-slate-950 px-3.5 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-sm animate-bounce">
                        <Camera className="w-4 h-4 text-slate-950" />
                        <span>क्लिनिकल जांच कैमरा चालू: मरीज के घाव / त्वचा / आंख पर कैमरा केंद्रित करें</span>
                      </div>
                    </div>
                  )}

                  {networkTier === "AUDIO_ONLY" && (
                    <div className="flex flex-col items-center z-10">
                      <div className="w-24 h-24 rounded-full bg-orange-950/80 border-2 border-orange-400 flex items-center justify-center mb-3 animate-pulse">
                        <Mic className="w-10 h-10 text-orange-400" />
                      </div>
                      <h3 className="text-base font-bold text-orange-200">डॉक्टर से केवल ऑडियो चालू है</h3>
                      <p className="text-xs text-slate-400 mt-0.5">कम नेटवर्क गति के कारण वीडियो बंद है</p>
                    </div>
                  )}

                  {!hasRemoteVideo && networkTier !== "AUDIO_ONLY" && (
                    <div className="flex flex-col items-center z-10">
                      <div className="w-20 h-20 rounded-full bg-slate-800/80 border-2 border-emerald-500/60 flex items-center justify-center mb-3 shadow-lg">
                        <Video className="w-8 h-8 text-emerald-400" />
                      </div>
                      <h3 className="text-base font-bold">डॉक्टर से सीधा संपर्क चालू है</h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        मरीज: {activePatient?.name} • स्वास्थ्य केंद्र कियोस्क रूम
                      </p>
                    </div>
                  )}
                </div>

                {/* Picture-in-Picture (Kiosk Patient / Exam View) */}
                <div className="absolute bottom-16 right-4 w-36 h-28 rounded-xl bg-slate-800 border-2 border-white/40 overflow-hidden shadow-2xl z-20 group">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${isVideoOff ? "hidden" : "block"}`}
                  />
                  {isVideoOff && (
                    <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-300 bg-slate-900">
                      <VideoOff className="w-5 h-5 text-rose-400 mb-1" />
                      <span>कैमरा बंद</span>
                    </div>
                  )}

                  {/* Quick Camera Flip Button inside PIP overlay */}
                  <button
                    onClick={handleToggleCameraFacingMode}
                    disabled={isSwitchingCamera || isVideoOff}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/70 hover:bg-black text-white text-xs transition-colors backdrop-blur-sm shadow z-30"
                    title={cameraFacingMode === "user" ? "Switch to Rear / Exam Camera" : "Switch to Front Camera"}
                  >
                    <SwitchCamera className={`w-3.5 h-3.5 ${isSwitchingCamera ? "animate-spin text-amber-400" : "text-white"}`} />
                  </button>

                  <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 bg-black/70 backdrop-blur-sm rounded text-[9px] text-white flex items-center gap-1">
                    <span>{cameraFacingMode === "user" ? "मरीज (Front)" : "जांच (Rear)"}</span>
                  </div>
                </div>

                {/* Video Controls Bar */}
                <div className="p-3 bg-gradient-to-t from-black/90 to-transparent z-10 flex items-center justify-center gap-3 flex-wrap">
                  {/* Mic Toggle */}
                  <button
                    onClick={handleToggleMute}
                    className={`min-h-[48px] min-w-[48px] rounded-full text-white transition-all flex items-center justify-center cursor-pointer ${isMuted ? "bg-rose-600 shadow-md shadow-rose-600/30" : "bg-slate-700/80 hover:bg-slate-600"}`}
                    title={isMuted ? "Unmute Mic" : "Mute Mic"}
                  >
                    {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Video Toggle */}
                  <button
                    onClick={handleToggleVideo}
                    className={`min-h-[48px] min-w-[48px] rounded-full text-white transition-all flex items-center justify-center cursor-pointer ${isVideoOff ? "bg-rose-600 shadow-md shadow-rose-600/30" : "bg-slate-700/80 hover:bg-slate-600"}`}
                    title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
                  >
                    {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                  </button>

                  {/* Dual Camera Switch Button (Front vs Rear / Clinical Exam Camera) */}
                  <button
                    onClick={handleToggleCameraFacingMode}
                    disabled={isSwitchingCamera || isVideoOff}
                    className={`min-h-[48px] px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                      cameraFacingMode === "environment"
                        ? "bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                        : "bg-slate-700/80 hover:bg-slate-600 text-white"
                    } ${isSwitchingCamera ? "opacity-75 cursor-wait" : ""}`}
                    title="कैमरा बदलें: मरीज चेहरा ↔ घाव/क्लिनिकल जांच (Switch Front/Rear Camera)"
                  >
                    <SwitchCamera className={`w-4 h-4 ${isSwitchingCamera ? "animate-spin" : ""}`} />
                    <span>
                      {cameraFacingMode === "user" ? "जांच कैमरा (Rear)" : "मरीज (Front)"}
                    </span>
                  </button>

                  {/* End Call */}
                  <button
                    onClick={() => handleEndCall(true)}
                    className="min-h-[48px] px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/30 cursor-pointer"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>कॉल समाप्त करें</span>
                  </button>
                </div>
              </div>

              {/* Patient Live Vitals Strip for Operator */}
              <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-2 text-xs">
                <span className="font-semibold text-slate-500">मरीज लाइव वाइटल्स:</span>
                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-bold border border-slate-200">
                  BP: {activeTriage?.bloodPressure || "120/80"} mmHg
                </span>
                <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-bold border border-blue-200">
                  SpO2: {activeTriage?.spo2 || 98}%
                </span>
                <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                  Pulse: {activeTriage?.pulse || 74} bpm
                </span>
              </div>
            </div>

            {/* Right 4 Cols: Operator-Doctor Communication & Quick Actions */}
            <div className="lg:col-span-4 flex flex-col">
              <ConsultationChat
                roomId={roomId}
                senderRole="kiosk"
                senderName={user?.name || "आशा कार्यकर्ता"}
                title="डॉक्टर संवाद (Doctor Intercom)"
                className="h-[440px]"
                quickReplies={[
                  "मरीज से गहरी सांस लेने को कहा",
                  "SpO2 दुबारा मापा गया, 98% सामान्य है",
                  "📸 घाव/जांच कैमरा चालू",
                  "दवा पर्चा प्राप्त हो गया है",
                ]}
              />
            </div>
          </div>
        )}

        {/* State 4: ENDED (Call Complete & Proceed to Prescription) */}
        {callState === "ENDED" && (
          <div className="max-w-md mx-auto w-full bg-white rounded-3xl border border-slate-200 shadow-md p-8 text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                टेली-परामर्श समाप्त हुआ!
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                कॉल अवधि: {formatSeconds(callDuration)} • {callerName}
              </p>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-900 text-left space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-700" />
                <span>डिजिटल प्रिस्क्रिप्शन तैयार है</span>
              </p>
              <p className="text-emerald-800">
                डॉक्टर द्वारा मरीज <strong>{activePatient?.name}</strong> के लिए दवा पर्चा जारी किया जा चुका है। आप इसे तुरंत देख और प्रिंट कर सकते हैं।
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <Link
                href="/kiosk/prescriptions"
                className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>अंतिम दवा पर्चा देखें व प्रिंट करें (View & Print Rx)</span>
              </Link>

              <button
                onClick={() => setCallState("IDLE")}
                className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
              >
                अगले मरीज के लिए लाइन तैयार करें
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function KioskCallReceiverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            लोड हो रहा है...
          </div>
        </div>
      }
    >
      <KioskCallReceiverContent />
    </Suspense>
  );
}
