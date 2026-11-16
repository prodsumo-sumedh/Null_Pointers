"use client";

import React, { useState, useEffect, useRef, use, Suspense, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLiveQuery } from "dexie-react-hooks";
import { db, DEFAULT_PATIENTS, DEFAULT_TRIAGE_PACKETS } from "@/lib/db";
import {
  RTC_CONFIG,
  getSignalingSocket,
  getUserMediaStream,
  stopMediaStream,
  applyDegradationTier,
  getWebRTCTelemetry,
  switchCameraStream,
  parseMediaError,
  MediaErrorInfo,
} from "@/lib/webrtc";
import TeleconsultationRoom from "@/components/TeleconsultationRoom";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  PhoneCall,
  Activity,
  Signal,
  Wifi,
  WifiOff,
  FileText,
  Volume2,
  Camera,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Send,
  RefreshCw,
  User,
  SwitchCamera,
  AlertTriangle,
  Printer,
} from "lucide-react";
import type { Socket } from "socket.io-client";

type DegradationTier = "TIER_1_720P" | "TIER_2_LOW_BITRATE" | "TIER_3_AUDIO_ONLY" | "TIER_4_STORE_AND_FORWARD";

function ConsultRoomContent({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const patientIdNum = parseInt(unwrappedParams.id, 10) || 1;
  const { user } = useAuth();

  const [mounted, setMounted] = useState(false);
  const [tier, setTier] = useState<DegradationTier>("TIER_1_720P");
  const [rtt, setRtt] = useState<number>(65);
  const [bitrate, setBitrate] = useState<number>(850);
  const [packetLoss, setPacketLoss] = useState<number>(0.8);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);

  // WebRTC & Call State
  const [callState, setCallState] = useState<"IDLE" | "CALLING" | "CONNECTED" | "ENDED">("IDLE");
  const [callDuration, setCallDuration] = useState(0);
  const [isKioskOnline, setIsKioskOnline] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [useLiveKitRoom, setUseLiveKitRoom] = useState(false);

  // Camera & Permission state
  const [mediaError, setMediaError] = useState<MediaErrorInfo | null>(null);
  const [kioskCameraMode, setKioskCameraMode] = useState<"user" | "environment">("user");
  const [doctorFacingMode, setDoctorFacingMode] = useState<"user" | "environment">("user");
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  // Consultation state
  const [doctorNotes, setDoctorNotes] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [newMessage, setNewMessage] = useState("");

  // Refs for media and WebRTC
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const roomId = `consult-room-${patientIdNum}`;
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const telemetryPrevBytes = useRef(0);
  const telemetryPrevTime = useRef(Date.now());

  const fallbackPatient = DEFAULT_PATIENTS.find((p) => p.id === patientIdNum) || DEFAULT_PATIENTS[0];
  const fallbackTriageList = DEFAULT_TRIAGE_PACKETS.filter((t) => t.patientId === patientIdNum);

  useEffect(() => {
    console.log("[DoctorConsultationContent] Mounted consultation view for patient:", patientIdNum);
    setMounted(true);
  }, [patientIdNum]);

  // Safety fallback for mobile loading state
  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted((prev) => {
        if (!prev) {
          console.warn("[DoctorConsultationContent] Safety timer forced mounted=true");
          return true;
        }
        return prev;
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const patient = useLiveQuery(
    async () => {
      try {
        const item = await db.patients.get(patientIdNum);
        return item || fallbackPatient;
      } catch (err) {
        console.error("[DoctorConsultationContent] Dexie error reading patient, using fallback:", err);
        return fallbackPatient;
      }
    },
    [patientIdNum],
    fallbackPatient
  ) ?? fallbackPatient;

  const triagePackets = useLiveQuery(
    async () => {
      try {
        const list = await db.triagePackets.where("patientId").equals(patientIdNum).toArray();
        return list && list.length > 0 ? list : fallbackTriageList;
      } catch (err) {
        console.error("[DoctorConsultationContent] Dexie error reading triagePackets, using fallback:", err);
        return fallbackTriageList;
      }
    },
    [patientIdNum],
    fallbackTriageList
  ) ?? fallbackTriageList;

  const latestTriage = triagePackets[triagePackets.length - 1];

  // Call timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callState === "CONNECTED") {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else if (callState === "IDLE") {
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
  }, [callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
  }, [callState, hasRemoteVideo]);

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Initialize WebRTC Peer Connection
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

    // Handle remote track
    pc.ontrack = (event) => {
      console.log("[WebRTC Doctor] Received remote track:", event.track.kind);
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
      console.log("[WebRTC Doctor] Connection state:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setCallState("CONNECTED");
      } else if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        setHasRemoteVideo(false);
      }
    };

    return pc;
  }, [roomId]);

  // Start local camera & microphone
  const initLocalMedia = useCallback(async () => {
    try {
      setMediaError(null);
      if (!localStreamRef.current) {
        const stream = await getUserMediaStream(
          { video: { facingMode: doctorFacingMode }, audio: true },
          "डॉक्टर वीडियो (Doctor Camera)"
        );
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      }
      return localStreamRef.current;
    } catch (err) {
      console.error("[Doctor Media Error]", err);
      setMediaError(parseMediaError(err));
      return null;
    }
  }, [doctorFacingMode]);

  // End consultation call
  const handleEndCall = useCallback((notifyPeer = true) => {
    console.log("[Doctor] handleEndCall called, notifyPeer:", notifyPeer);
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
    setKioskCameraMode("user");
  }, [roomId]);

  const handleEndCallRef = useRef(handleEndCall);
  useEffect(() => {
    handleEndCallRef.current = handleEndCall;
  });

  // Initiate call to kiosk
  const initiateCall = async () => {
    try {
      setCallState("CALLING");
      await initLocalMedia();
      const socket = socketRef.current;
      if (!socket) return;

      const pc = createPeerConnection();

      // Notify kiosk of incoming call
      socket.emit("call-user", {
        roomId,
        patientId: patientIdNum,
        patientName: patient?.name || "मरीज",
        callerName: user?.name || "Dr. Rajesh Sharma, MD",
        role: "doctor",
      });

      // Create WebRTC Offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit("offer", {
        roomId,
        sdp: offer,
      });
    } catch (err) {
      console.error("[WebRTC Doctor] Error initiating call:", err);
      setCallState("IDLE");
      setMediaError(parseMediaError(err));
    }
  };

  // Toggle Doctor's camera
  const handleToggleDoctorCamera = async () => {
    const nextMode = doctorFacingMode === "user" ? "environment" : "user";
    setIsSwitchingCamera(true);
    setMediaError(null);
    try {
      const { newStream } = await switchCameraStream(pcRef.current, localStreamRef.current, nextMode);
      localStreamRef.current = newStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = newStream;
      }
      setDoctorFacingMode(nextMode);
    } catch (err) {
      console.warn("Error switching doctor camera:", err);
      setMediaError(parseMediaError(err));
    } finally {
      setIsSwitchingCamera(false);
    }
  };

  // Socket Connection and signaling setup
  useEffect(() => {
    const socket = getSignalingSocket();
    socketRef.current = socket;

    socket.emit("join-room", {
      roomId,
      role: "doctor",
      userName: user?.name || "Dr. Rajesh Sharma, MD",
    });

    socket.on("room-occupants", (occupants: Array<{ socketId: string; role: string; userName: string }>) => {
      const kiosk = occupants.some((o) => o.role === "kiosk");
      setIsKioskOnline(kiosk);
    });

    socket.on("user-joined", (peer: { socketId: string; role: string; userName: string }) => {
      console.log("[Doctor Socket] Peer joined:", peer);
      if (peer.role === "kiosk") {
        setIsKioskOnline(true);
      }
    });

    socket.on("user-left", (peer: { socketId: string; role: string }) => {
      if (peer.role === "kiosk") {
        setIsKioskOnline(false);
        setCallState("IDLE");
        setHasRemoteVideo(false);
        setKioskCameraMode("user");
      }
    });

    socket.on("call-accepted", async () => {
      console.log("[Doctor Socket] Kiosk accepted the call");
      setCallState("CONNECTED");
    });

    socket.on("call-declined", () => {
      alert("कियोस्क द्वारा कॉल अस्वीकार कर दी गई (Call Declined by Kiosk)");
      setCallState("IDLE");
    });

    // Remote SDP Offer from Kiosk (when Kiosk initiates the call)
    socket.on("offer", async ({ sdp }) => {
      console.log("[Doctor WebRTC] Received SDP offer from kiosk");
      try {
        await initLocalMedia();
        const pc = pcRef.current || createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));

        // Flush pending ICE candidates
        while (pendingCandidatesRef.current.length > 0) {
          const candidate = pendingCandidatesRef.current.shift();
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("answer", {
          roomId,
          sdp: answer,
        });
        setCallState("CONNECTED");
      } catch (err) {
        console.error("[Doctor WebRTC] Error processing offer from kiosk:", err);
      }
    });

    // Remote SDP Answer from Kiosk
    socket.on("answer", async ({ sdp }) => {
      console.log("[Doctor WebRTC] Received answer from kiosk");
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(sdp));

          // Flush pending ICE candidates
          while (pendingCandidatesRef.current.length > 0) {
            const candidate = pendingCandidatesRef.current.shift();
            if (candidate) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            }
          }
        } catch (e) {
          console.error("Error setting remote description:", e);
        }
      }
    });

    // Remote ICE Candidate
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

    // Kiosk switched camera mode (Front vs Rear/Exam)
    socket.on("camera-mode-changed", ({ mode }: { mode: "user" | "environment" }) => {
      console.log("[Doctor Socket] Kiosk switched camera to:", mode);
      setKioskCameraMode(mode);
    });

    // Live chat message from Kiosk
    socket.on("chat-message", (msg: { text: string; sender: string; time: string }) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // Call ended by peer
    socket.on("call-ended", () => {
      console.log("[Doctor Socket] Received call-ended from kiosk");
      handleEndCallRef.current(false);
    });

    // Initialize local media preview
    initLocalMedia();

    return () => {
      socket.off("room-occupants");
      socket.off("user-joined");
      socket.off("user-left");
      socket.off("call-accepted");
      socket.off("call-declined");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice-candidate");
      socket.off("camera-mode-changed");
      socket.off("chat-message");
      socket.off("call-ended");
    };
  }, [roomId, user?.name, initLocalMedia, createPeerConnection]);

  // Periodic Telemetry Gathering from WebRTC
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (callState === "CONNECTED" && pcRef.current) {
      interval = setInterval(async () => {
        if (!pcRef.current) return;
        const res = await getWebRTCTelemetry(
          pcRef.current,
          telemetryPrevBytes.current,
          telemetryPrevTime.current
        );
        telemetryPrevBytes.current = res.currentBytes;
        telemetryPrevTime.current = res.currentTimestamp;
        setRtt(res.stats.rtt);
        setBitrate(res.stats.bitrate);
        setPacketLoss(res.stats.packetLoss);
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  // Toggle Mic
  const handleToggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  };

  // Toggle Camera
  const handleToggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoDisabled(!videoTrack.enabled);
      }
    }
  };

  // Switch Degradation Tiers
  const handleSelectTier = async (newTier: DegradationTier) => {
    setTier(newTier);
    if (socketRef.current) {
      socketRef.current.emit("tier-change", { roomId, tier: newTier });
    }
    await applyDegradationTier(pcRef.current, localStreamRef.current, newTier);

    if (newTier === "TIER_1_720P") {
      setRtt(55);
      setBitrate(850);
      setPacketLoss(0.4);
      setIsVideoDisabled(false);
    } else if (newTier === "TIER_2_LOW_BITRATE") {
      setRtt(260);
      setBitrate(48);
      setPacketLoss(8.5);
      setIsVideoDisabled(false);
    } else if (newTier === "TIER_3_AUDIO_ONLY") {
      setRtt(380);
      setBitrate(16);
      setPacketLoss(18.0);
      setIsVideoDisabled(true);
    } else if (newTier === "TIER_4_STORE_AND_FORWARD") {
      setRtt(999);
      setBitrate(0);
      setPacketLoss(50.0);
      setIsVideoDisabled(true);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    const msgObj = {
      sender: user?.name || "डॉक्टर",
      text: newMessage.trim(),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setChatMessages((prev) => [...prev, msgObj]);
    if (socketRef.current) {
      socketRef.current.emit("chat-message", {
        roomId,
        ...msgObj,
      });
    }
    setNewMessage("");
  };

  if (!mounted) {
    return null;
  }

  const tierDetails = {
    TIER_1_720P: {
      pill: "bg-emerald-50 text-emerald-800 border-emerald-200",
      dot: "bg-emerald-500",
      label: "720p HD Video",
      desc: "उत्तम नेटवर्क (Broadband Connection)",
    },
    TIER_2_LOW_BITRATE: {
      pill: "bg-amber-50 text-amber-800 border-amber-200",
      dot: "bg-amber-500",
      label: "Low-Bitrate 2G Mode",
      desc: "धीमा नेटवर्क — ऑडियो प्राथमिकता",
    },
    TIER_3_AUDIO_ONLY: {
      pill: "bg-orange-50 text-orange-800 border-orange-200",
      dot: "bg-orange-500",
      label: "Audio Only (Opus)",
      desc: "वीडियो बंद — केवल आवाज चालू",
    },
    TIER_4_STORE_AND_FORWARD: {
      pill: "bg-rose-50 text-rose-800 border-rose-200",
      dot: "bg-rose-500 animate-ping",
      label: "Offline Mode (Store & Forward)",
      desc: "ऑफ़लाइन वॉयस नोट व इमेज मोड",
    },
  }[tier];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Light-Theme Header & Telemetry Strip */}
      <section className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={user?.role === "kiosk" ? "/" : "/doctor"}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  टेली-परामर्श (Tele-Consultation)
                </h1>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${tierDetails.pill}`}>
                  <span className={`w-2 h-2 rounded-full ${tierDetails.dot}`} />
                  {tierDetails.label}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    isKioskOnline
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-slate-100 text-slate-500 border-slate-200"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isKioskOnline ? "bg-emerald-500" : "bg-slate-400"}`} />
                  {isKioskOnline ? "कियोस्क ऑनलाइन" : "कियोस्क प्रतीक्षा"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {patient ? `${patient.name} (${patient.age} वर्ष, ${patient.village})` : "मरीज परामर्श"}
              </p>
            </div>
          </div>

          {/* Clean Telemetry Pills */}
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <button
              onClick={() => setUseLiveKitRoom(!useLiveKitRoom)}
              className={`px-3 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                useLiveKitRoom
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300"
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{useLiveKitRoom ? "LiveKit Active" : "LiveKit रूरल रूम"}</span>
            </button>
            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              RTT: {rtt}ms
            </span>
            <span className="bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
              Bitrate: {bitrate} kbps
            </span>
            <span className={`px-2.5 py-1 rounded-md border ${packetLoss > 20 ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-slate-100 border-slate-200"}`}>
              Loss: {packetLoss}%
            </span>
          </div>
        </div>
      </section>

      {/* Network Simulator Controls */}
      <section className="bg-slate-100/80 border-b border-slate-200 px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Layers className="w-3.5 h-3.5" />
            बैंडविड्थ एडैप्टेशन टियर (Bandwidth Adaptation):
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => handleSelectTier("TIER_1_720P")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                tier === "TIER_1_720P"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              4G / Wi-Fi (HD)
            </button>
            <button
              onClick={() => handleSelectTier("TIER_2_LOW_BITRATE")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                tier === "TIER_2_LOW_BITRATE"
                  ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              2G Mode (QVGA)
            </button>
            <button
              onClick={() => handleSelectTier("TIER_3_AUDIO_ONLY")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                tier === "TIER_3_AUDIO_ONLY"
                  ? "bg-orange-600 text-white border-orange-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              केवल आवाज (Opus Voice)
            </button>
            <button
              onClick={() => handleSelectTier("TIER_4_STORE_AND_FORWARD")}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
                tier === "TIER_4_STORE_AND_FORWARD"
                  ? "bg-rose-600 text-white border-rose-600 shadow-sm"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              }`}
            >
              ऑफ़लाइन (Store & Forward)
            </button>
          </div>
        </div>
      </section>

      {/* Main Consultation Workspace */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-4 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left Column (8 cols): Video Viewport & Vitals */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {/* Permission Denied / Hardware Warning Banner */}
          {mediaError && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
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
                        initLocalMedia();
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

          {useLiveKitRoom ? (
            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-sm animate-in fade-in zoom-in-95 duration-200">
              <TeleconsultationRoom
                roomName={String(patientIdNum)}
                participantName={user?.name || "Dr. Rajesh Sharma, MD"}
                onDisconnect={() => setUseLiveKitRoom(false)}
                title={`मरीज ${patient?.name || `#${patientIdNum}`} — LiveKit Teleconsultation`}
              />
            </div>
          ) : (
            <div className="relative bg-slate-950 rounded-2xl border border-slate-200 overflow-hidden min-h-[440px] flex flex-col justify-between shadow-sm">
            {/* Top Video Overlay */}
            <div className="p-3 bg-gradient-to-b from-black/80 to-transparent z-10 flex items-center justify-between text-white text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${callState === "CONNECTED" ? "bg-emerald-400 animate-pulse" : callState === "ENDED" ? "bg-slate-400" : "bg-amber-400"}`} />
                <span className="font-semibold">
                  {patient ? `${patient.name} (${patient.village})` : "मरीज परामर्श"}
                </span>
                <span className="text-[11px] text-slate-300">
                  {callState === "CONNECTED" ? `• कॉल चालू (${formatSeconds(callDuration)})` : callState === "CALLING" ? "• घंटी बज रही है..." : callState === "ENDED" ? "• कॉल समाप्त" : "• तैयार"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Examination Camera Active Badge */}
                {kioskCameraMode === "environment" && (
                  <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm animate-pulse">
                    <Camera className="w-3 h-3" />
                    कियोस्क जांच कैमरा (Exam Mode)
                  </span>
                )}
                <span className="text-[11px] text-slate-300">
                  रूम: #{roomId} • स्वास्थ्य केंद्र
                </span>
              </div>
            </div>

            {/* Main Video Viewport (Remote Kiosk Video) */}
            <div className="flex-1 relative flex items-center justify-center p-4 text-center text-white overflow-hidden">
              {/* Actual Remote Video Stream */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  callState === "CONNECTED" && hasRemoteVideo && tier !== "TIER_3_AUDIO_ONLY" && tier !== "TIER_4_STORE_AND_FORWARD"
                    ? "opacity-100"
                    : "opacity-0 pointer-events-none"
                }`}
              />

              {/* Rear Examination Mode Overlay Alert for Doctor */}
              {callState === "CONNECTED" && kioskCameraMode === "environment" && (
                <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-center pointer-events-none">
                  <div className="bg-amber-500/90 text-slate-950 px-4 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 backdrop-blur-sm animate-bounce">
                    <Camera className="w-4 h-4 text-slate-950" />
                    <span>कियोस्क द्वारा क्लिनिकल जांच कैमरा सक्रिय — घाव, त्वचा व चोट की लाइव जांच</span>
                  </div>
                </div>
              )}

              {/* State: Not yet connected */}
              {callState === "IDLE" && (
                <div className="flex flex-col items-center z-10 p-6 bg-slate-900/80 rounded-2xl border border-slate-800 max-w-sm">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mb-3">
                    <Video className="w-9 h-9 text-emerald-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">
                    लाइव वीडियो कॉल शुरू करें
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 mb-4">
                    {isKioskOnline
                      ? "स्वास्थ्य केंद्र कियोस्क ऑनलाइन है। कॉल शुरू करने के लिए नीचे बटन दबाएं।"
                      : "कियोस्क अभी कनेक्ट नहीं हुआ है। आप कॉल शुरू कर सकते हैं, कियोस्क आते ही जुड़ जाएगा।"}
                  </p>
                  <button
                    onClick={initiateCall}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4 animate-bounce" />
                    <span>कियोस्क पर कॉल करें (Start Call)</span>
                  </button>

                  <button
                    onClick={() => setUseLiveKitRoom(true)}
                    className="mt-2.5 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>LiveKit रूरल रूम खोलें</span>
                  </button>
                </div>
              )}

              {/* State: Calling / Ringing */}
              {callState === "CALLING" && (
                <div className="flex flex-col items-center z-10 p-6">
                  <div className="w-20 h-20 rounded-full bg-emerald-600 text-white flex items-center justify-center mb-3 animate-pulse shadow-lg">
                    <PhoneCall className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-bold text-white">कियोस्क पर कॉल जा रही है...</h3>
                  <p className="text-xs text-slate-300 mt-1 mb-4">
                    ऑपरेटर द्वारा कॉल उठाने की प्रतीक्षा की जा रही है
                  </p>
                  <button
                    onClick={() => handleEndCall(true)}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    <PhoneOff className="w-3.5 h-3.5" />
                    <span>कॉल रद्द करें (Cancel)</span>
                  </button>
                </div>
              )}

              {/* State: ENDED View */}
              {callState === "ENDED" && (
                <div className="flex flex-col items-center z-10 p-6 bg-slate-900/95 rounded-2xl border border-slate-800 max-w-md text-center animate-in fade-in zoom-in-95 duration-200">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 border border-emerald-500/30">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    टेली-परामर्श समाप्त हुआ!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 mb-2">
                    कॉल अवधि: <strong>{formatSeconds(callDuration)}</strong> • मरीज: {patient?.name || "मरीज"}
                  </p>
                  <p className="text-[11px] text-slate-400 mb-5">
                    परामर्श समाप्त हो गया है। आप नीचे दिए गए बटन से डिजिटल दवा पर्चा (Prescription) जारी कर सकते हैं।
                  </p>

                  <div className="grid grid-cols-2 gap-2.5 w-full">
                    <button
                      onClick={() => {
                        setCallState("IDLE");
                        initLocalMedia();
                      }}
                      className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>पुनः कॉल करें</span>
                    </button>

                    <Link
                      href={`/rx/${patientIdNum}`}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>प्रिस्क्रिप्शन बनाएं →</span>
                    </Link>
                  </div>
                </div>
              )}

              {/* State: Connected but Audio Only (Tier 3) */}
              {callState === "CONNECTED" && tier === "TIER_3_AUDIO_ONLY" && (
                <div className="flex flex-col items-center z-10">
                  <div className="w-24 h-24 rounded-full bg-orange-950/80 border-2 border-orange-400 flex items-center justify-center mb-3 animate-pulse">
                    <Mic className="w-10 h-10 text-orange-400" />
                  </div>
                  <h3 className="text-base font-bold text-orange-200">
                    केवल ऑडियो मोड सक्रिय (Opus VoIP)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    कम 2G नेटवर्क के कारण वीडियो बंद है, आवाज स्पष्ट रूप से जारी है
                  </p>
                </div>
              )}

              {/* State: Connected but Tier 4 Store & Forward */}
              {callState === "CONNECTED" && tier === "TIER_4_STORE_AND_FORWARD" && (
                <div className="flex flex-col items-center max-w-sm z-10">
                  <div className="w-16 h-16 rounded-xl bg-rose-950/80 border border-rose-500 flex items-center justify-center mb-2">
                    <WifiOff className="w-8 h-8 text-rose-400" />
                  </div>
                  <h3 className="text-base font-bold text-rose-200">
                    ऑफ़लाइन स्टोर-एंड-फ़ॉरवर्ड
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5 mb-3">
                    नेटवर्क उपलब्ध नहीं है। स्वास्थ्य कार्यकर्ता द्वारा रिकॉर्ड किया गया वॉयस मेमो सुनें।
                  </p>

                  <div className="w-full bg-slate-800 rounded-lg p-2.5 text-left border border-slate-700 flex items-center justify-between">
                    <span className="text-xs text-slate-200 flex items-center gap-1.5">
                      <Volume2 className="w-4 h-4 text-emerald-400" />
                      वॉयस नोट (0:35s)
                    </span>
                    <button
                      onClick={() => alert("Playing recorded voice note...")}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
                    >
                      प्ले करें
                    </button>
                  </div>
                </div>
              )}

              {/* State: Connected but waiting for remote camera feed */}
              {callState === "CONNECTED" && !hasRemoteVideo && tier !== "TIER_3_AUDIO_ONLY" && tier !== "TIER_4_STORE_AND_FORWARD" && (
                <div className="flex flex-col items-center z-10">
                  <RefreshCw className="w-10 h-10 text-emerald-400 animate-spin mb-2" />
                  <h3 className="text-base font-bold text-white">मरीज का वीडियो लोड हो रहा है...</h3>
                  <p className="text-xs text-slate-300 mt-0.5">WebRTC कनेक्शन स्थापित हो रहा है</p>
                </div>
              )}
            </div>

            {/* Picture-in-Picture Local Doctor Camera View */}
            <div className="absolute bottom-16 right-4 w-32 h-24 rounded-xl bg-slate-800 border-2 border-white/30 overflow-hidden shadow-xl z-20 group">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isVideoDisabled ? "hidden" : "block"}`}
              />
              {isVideoDisabled && (
                <div className="w-full h-full flex flex-col items-center justify-center text-[10px] text-slate-300 bg-slate-900">
                  <VideoOff className="w-5 h-5 text-rose-400 mb-1" />
                  <span>कैमरा बंद</span>
                </div>
              )}
              {/* Doctor camera switch button */}
              <button
                onClick={handleToggleDoctorCamera}
                disabled={isSwitchingCamera || isVideoDisabled}
                className="absolute top-1 right-1 p-1 rounded bg-black/60 hover:bg-black text-white text-[9px] backdrop-blur-sm z-30"
                title="Switch Camera"
              >
                <SwitchCamera className={`w-3 h-3 ${isSwitchingCamera ? "animate-spin" : ""}`} />
              </button>
              <div className="absolute bottom-1 left-1.5 px-1 py-0.2 bg-black/60 rounded text-[9px] text-white">
                आप (डॉक्टर)
              </div>
            </div>

            {/* Call Controls Bar */}
            <div className="p-3 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-3 z-10">
              <button
                onClick={handleToggleMic}
                className={`p-3 rounded-full transition-colors ${
                  isMicMuted ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              <button
                onClick={handleToggleVideo}
                className={`p-3 rounded-full transition-colors ${
                  isVideoDisabled ? "bg-rose-600 text-white" : "bg-slate-800 text-slate-200 hover:bg-slate-700"
                }`}
                title={isVideoDisabled ? "Enable Video" : "Disable Video"}
              >
                {isVideoDisabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
              </button>

              {/* End Call / Restart Call / Initiate Call Button */}
              {callState === "CONNECTED" || callState === "CALLING" ? (
                <button
                  onClick={() => handleEndCall(true)}
                  className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
                  title="कॉल समाप्त करें"
                >
                  <PhoneOff className="w-4 h-4" />
                  <span>कॉल समाप्त करें (End Call)</span>
                </button>
              ) : callState === "ENDED" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setCallState("IDLE");
                      initLocalMedia();
                    }}
                    className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>नया कॉल शुरू करें</span>
                  </button>
                  <Link
                    href={`/rx/${patientIdNum}`}
                    className="px-4 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>प्रिस्क्रिप्शन बनाएं →</span>
                  </Link>
                </div>
              ) : (
                <button
                  onClick={initiateCall}
                  className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>कॉल करें</span>
                </button>
              )}
            </div>
          </div>
          )}

          {/* Vitals Summary Strip & Prescription Link */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-slate-500">रोगी वाइटल्स:</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                BP: {latestTriage?.bloodPressure || "—"}
              </span>
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium border border-blue-200">
                SpO2: {latestTriage?.spo2 ? `${latestTriage.spo2}%` : "—"}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium border border-slate-200">
                Pulse: {latestTriage?.pulse ? `${latestTriage.pulse} bpm` : "—"}
              </span>
            </div>

            <Link
              href={`/rx/${patientIdNum}`}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>प्रिस्क्रिप्शन बनाएं (Prescription)</span>
            </Link>
          </div>
        </section>

        {/* Right Column (4 cols): Real-Time Chat & Clinical Notes */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          {/* Live Chat with Operator */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col h-[280px]">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                स्वास्थ्य केंद्र संवाद (Kiosk Chat)
              </h3>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                लाइव सॉकेट
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 my-2 pr-1">
              {chatMessages.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-xs">अभी कोई संदेश नहीं है।</p>
                  <p className="text-[11px] mt-0.5">नीचे बॉक्स में संदेश लिखकर बातचीत शुरू करें।</p>
                </div>
              ) : (
                chatMessages.map((msg, i) => (
                  <div key={i} className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                      <span className="font-semibold text-slate-700">{msg.sender}</span>
                      <span>{msg.time}</span>
                    </div>
                    <p className="text-slate-800">{msg.text}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 pt-2 border-t border-slate-100">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="संदेश लिखें..."
                className="flex-1 h-8 px-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-slate-800"
              />
              <button
                type="submit"
                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Clinical SOAP / Doctor Notes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              चिकित्सकीय सलाह व नोट्स (Clinical Notes)
            </h3>
            <textarea
              value={doctorNotes}
              onChange={(e) => setDoctorNotes(e.target.value)}
              placeholder="मरीज के लिए निर्देश व दवा सम्बन्धी सलाह..."
              className="flex-1 min-h-[120px] p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:border-slate-800 resize-none"
            />
            <button
              onClick={() => {
                alert("नोट्स सहेजे गए (Notes Saved)");
              }}
              className="mt-3 w-full h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>नोट्स सहेजें (Save Notes)</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default function AdaptiveConsultationRoom({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-700">
          <div className="flex items-center gap-3 text-sm font-semibold">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" />
            कंसल्टेशन रूम लोड हो रहा है...
          </div>
        </div>
      }
    >
      <ConsultRoomContent params={params} />
    </Suspense>
  );
}
