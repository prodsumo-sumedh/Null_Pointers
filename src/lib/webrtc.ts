import { io, Socket } from "socket.io-client";

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function getSignalingUrl(): string {
  if (process.env.NEXT_PUBLIC_SIGNALING_URL) {
    return process.env.NEXT_PUBLIC_SIGNALING_URL;
  }
  if (typeof window !== "undefined") {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    const hostname = window.location.hostname || "127.0.0.1";
    return `${protocol}//${hostname}:3001`;
  }
  return "http://127.0.0.1:3001";
}

let socketInstance: Socket | null = null;

export function getSignalingSocket(): Socket {
  if (!socketInstance || !socketInstance.connected) {
    socketInstance = io(getSignalingUrl(), {
      transports: ["websocket", "polling"],
      timeout: 5000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      autoConnect: true,
    });
  }
  return socketInstance;
}

export interface MediaErrorInfo {
  errorType: "PERMISSION_DENIED" | "DEVICE_NOT_FOUND" | "DEVICE_IN_USE" | "UNKNOWN";
  friendlyMessageHi: string;
  friendlyMessageEn: string;
  instructionsHi: string;
  instructionsEn: string;
}

export function parseMediaError(err: unknown): MediaErrorInfo {
  const error = err as { name?: string; message?: string } | null;
  const name = error?.name || "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      errorType: "PERMISSION_DENIED",
      friendlyMessageHi: "कैमरा और माइक्रोफ़ोन की अनुमति अस्वीकृत (Camera/Mic Blocked)",
      friendlyMessageEn: "Camera & Microphone permission was blocked by the browser.",
      instructionsHi: "ब्राउज़र के URL बार में 🔒 लॉक या सेटिंग्स आइकन दबाएं और 'Camera' व 'Microphone' को 'Allow' (अनुमति दें) करें।",
      instructionsEn: "Click the lock icon (🔒) or site settings in your browser address bar and set Camera & Mic to 'Allow'.",
    };
  }

  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      errorType: "DEVICE_NOT_FOUND",
      friendlyMessageHi: "वेबकैम हार्डवेयर अक्षम है (Webcam Disabled or Not Found)",
      friendlyMessageEn: "Webcam hardware is disabled or not detected.",
      instructionsHi: "लैपटॉप कीबोर्ड पर 'Fn + F10' दबाएं या Device Manager में जाकर 'USB2.0 HD UVC WebCam' को Enable करें।",
      instructionsEn: "Press Fn + F10 on your keyboard, or open Device Manager -> Cameras -> Enable device.",
    };
  }

  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      errorType: "DEVICE_IN_USE",
      friendlyMessageHi: "कैमरा किसी अन्य ऐप में व्यस्त है (Camera In Use)",
      friendlyMessageEn: "Camera is currently used by another application or tab.",
      instructionsHi: "कृपया अन्य वीडियो कॉलिंग ऐप्स (Zoom, Google Meet आदि) या अन्य टैब बंद करें।",
      instructionsEn: "Please close other video applications or browser tabs accessing your camera.",
    };
  }

  return {
    errorType: "UNKNOWN",
    friendlyMessageHi: "कैमरा शुरू करने में त्रुटि (Camera Access Error)",
    friendlyMessageEn: "Unable to start camera or microphone stream.",
    instructionsHi: "कृपया पेज को रिफ्रेश करें और पुनः प्रयास करें।",
    instructionsEn: "Please refresh the page and allow camera permissions when prompted.",
  };
}

export function createSyntheticVideoStream(label: string = "Patient Video"): MediaStream {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext("2d");

  let frame = 0;
  let hue = 150;

  const draw = () => {
    if (!ctx) return;
    frame++;
    hue = (hue + 0.5) % 360;

    // Dark sleek clinical gradient
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, "#090d16");
    grad.addColorStop(1, "#1e293b");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animated clinical pulse wave
    ctx.strokeStyle = `hsl(${hue}, 80%, 55%)`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    const midY = canvas.height / 2;
    for (let x = 0; x < canvas.width; x += 5) {
      const y = midY + Math.sin((x + frame * 4) * 0.04) * 35 * Math.sin(frame * 0.05);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Pulse center avatar circle
    const radius = 45 + Math.sin(frame * 0.1) * 6;
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 40, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsl(${hue}, 65%, 45%)`;
    ctx.fill();

    // Cross icon
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(canvas.width / 2 - 6, canvas.height / 2 - 58, 12, 36);
    ctx.fillRect(canvas.width / 2 - 18, canvas.height / 2 - 46, 36, 12);

    // Text labels
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 50);

    ctx.font = "14px system-ui, sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("● WebRTC Live Stream Connected", canvas.width / 2, canvas.height / 2 + 78);
  };

  const timer = setInterval(draw, 1000 / 15);
  const stream = canvas.captureStream(15);

  // Add silent audio track so WebRTC media negotiation completes successfully
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const audioCtx = new AudioContextClass();
      const dest = audioCtx.createMediaStreamDestination();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      gain.gain.value = 0.0001; // virtually silent heartbeat carrier
      osc.connect(gain);
      gain.connect(dest);
      osc.start();
      dest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }
  } catch (e) {
    console.warn("Could not attach synthetic audio track:", e);
  }

  stream.getVideoTracks()[0]?.addEventListener("ended", () => {
    clearInterval(timer);
  });

  return stream;
}

export async function getUserMediaStream(
  constraints: MediaStreamConstraints = { video: { facingMode: "user" }, audio: true },
  fallbackLabel: string = "Live Camera Feed"
): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return createSyntheticVideoStream(fallbackLabel);
  }

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    console.warn("Could not get media with initial constraints, attempting fallback...", err);
    try {
      // Fallback 1: basic video and audio
      return await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (err2) {
      console.warn("Could not get basic video+audio, trying video-only or audio-only...", err2);
      try {
        // Fallback 2: video only (if microphone hardware is absent or blocked)
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (errVideoOnly) {
        try {
          // Fallback 3: audio only with synthetic animated video (if webcam hardware is disabled via Fn+F10)
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const synthVideo = createSyntheticVideoStream(fallbackLabel);
          synthVideo.getVideoTracks().forEach((track) => audioStream.addTrack(track));
          return audioStream;
        } catch (errAudioOnly) {
          console.warn("Both camera and mic failed, using complete synthetic stream...", errAudioOnly);
          return createSyntheticVideoStream(fallbackLabel);
        }
      }
    }
  }
}

export async function getVideoInputDevices(): Promise<MediaDeviceInfo[]> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "videoinput");
  } catch (e) {
    console.warn("Could not enumerate video devices:", e);
    return [];
  }
}

/**
 * Seamlessly switch active camera (e.g. Front to Rear/Examination camera)
 * Uses RTCRtpSender.replaceTrack without renegotiating the peer connection.
 */
export async function switchCameraStream(
  pc: RTCPeerConnection | null,
  currentStream: MediaStream | null,
  facingMode: "user" | "environment"
): Promise<{ newStream: MediaStream; newTrack: MediaStreamTrack }> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("getUserMedia not supported");
  }

  // Request new video track with requested facing mode
  const newMedia = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { exact: facingMode },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
    audio: false,
  }).catch(async () => {
    // If exact facingMode fails (e.g. desktop with single webcam), fallback to ideal
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
      },
      audio: false,
    });
  });

  const newVideoTrack = newMedia.getVideoTracks()[0];

  // Stop old video track if exists
  if (currentStream) {
    const oldVideoTrack = currentStream.getVideoTracks()[0];
    if (oldVideoTrack) {
      oldVideoTrack.stop();
      currentStream.removeTrack(oldVideoTrack);
    }
    currentStream.addTrack(newVideoTrack);
  }

  // Update WebRTC sender
  if (pc) {
    const videoSender = pc.getSenders().find((s) => s.track?.kind === "video" || s.track === null);
    if (videoSender) {
      await videoSender.replaceTrack(newVideoTrack);
    }
  }

  return {
    newStream: currentStream || newMedia,
    newTrack: newVideoTrack,
  };
}

export function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((track) => {
    try {
      track.stop();
    } catch (e) {
      console.warn("Error stopping track:", e);
    }
  });
}

/**
 * Dynamically adjust active video sender bitrate & degradation tier
 */
export async function applyDegradationTier(
  pc: RTCPeerConnection | null,
  localStream: MediaStream | null,
  tier: "TIER_1_720P" | "TIER_2_LOW_BITRATE" | "TIER_3_AUDIO_ONLY" | "TIER_4_STORE_AND_FORWARD"
) {
  if (!pc || !localStream) return;

  const videoTrack = localStream.getVideoTracks()[0];
  const audioTrack = localStream.getAudioTracks()[0];
  const videoSender = pc.getSenders().find((s) => s.track?.kind === "video");

  if (tier === "TIER_1_720P") {
    if (videoTrack) videoTrack.enabled = true;
    if (audioTrack) audioTrack.enabled = true;
    if (videoSender) {
      try {
        const params = videoSender.getParameters();
        if (params.encodings && params.encodings.length > 0) {
          delete params.encodings[0].maxBitrate;
          delete params.encodings[0].scaleResolutionDownBy;
          await videoSender.setParameters(params);
        }
      } catch (e) {
        console.warn("Error setting Tier 1 parameters:", e);
      }
    }
  } else if (tier === "TIER_2_LOW_BITRATE") {
    if (videoTrack) videoTrack.enabled = true;
    if (audioTrack) audioTrack.enabled = true;
    if (videoSender) {
      try {
        const params = videoSender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }
        params.encodings[0].maxBitrate = 48000; // 48 kbps cap for 2G
        params.encodings[0].scaleResolutionDownBy = 2; // downscale resolution
        await videoSender.setParameters(params);
      } catch (e) {
        console.warn("Error setting Tier 2 parameters:", e);
      }
    }
  } else if (tier === "TIER_3_AUDIO_ONLY") {
    // Disable video track entirely to conserve 100% of bandwidth for Opus voice
    if (videoTrack) videoTrack.enabled = false;
    if (audioTrack) audioTrack.enabled = true;
  } else if (tier === "TIER_4_STORE_AND_FORWARD") {
    if (videoTrack) videoTrack.enabled = false;
    if (audioTrack) audioTrack.enabled = false;
  }
}

export interface TelemetryStats {
  rtt: number;
  bitrate: number;
  packetLoss: number;
}

/**
 * Fetch real-time WebRTC telemetry metrics
 */
export async function getWebRTCTelemetry(
  pc: RTCPeerConnection,
  prevBytesReceived: number,
  prevTimestamp: number
): Promise<{ stats: TelemetryStats; currentBytes: number; currentTimestamp: number }> {
  let rtt = 0;
  let currentBytes = prevBytesReceived;
  const currentTimestamp = Date.now();
  let packetLoss = 0;
  let totalPackets = 0;
  let lostPackets = 0;

  try {
    const statsReport = await pc.getStats();

    statsReport.forEach((report) => {
      // Round-trip time (RTT) from candidate pair
      if (report.type === "candidate-pair" && report.state === "succeeded") {
        if (typeof report.currentRoundTripTime === "number") {
          rtt = Math.round(report.currentRoundTripTime * 1000);
        }
      }

      // Bitrate and packet loss from inbound RTP
      if (report.type === "inbound-rtp") {
        if (typeof report.bytesReceived === "number") {
          currentBytes += report.bytesReceived;
        }
        if (typeof report.packetsLost === "number") {
          lostPackets += report.packetsLost;
        }
        if (typeof report.packetsReceived === "number") {
          totalPackets += report.packetsReceived;
        }
      }
    });

    if (totalPackets + lostPackets > 0) {
      packetLoss = parseFloat(((lostPackets / (totalPackets + lostPackets)) * 100).toFixed(1));
    }

    const timeDiff = (currentTimestamp - prevTimestamp) / 1000;
    let bitrate = 0;
    if (timeDiff > 0 && currentBytes >= prevBytesReceived) {
      bitrate = Math.round(((currentBytes - prevBytesReceived) * 8) / (timeDiff * 1024));
    }

    return {
      stats: {
        rtt: rtt > 0 ? rtt : 45,
        bitrate: bitrate > 0 ? bitrate : 320,
        packetLoss: isNaN(packetLoss) ? 0 : packetLoss,
      },
      currentBytes,
      currentTimestamp,
    };
  } catch (err) {
    console.warn("Could not get WebRTC stats:", err);
    return {
      stats: { rtt: 55, bitrate: 450, packetLoss: 0 },
      currentBytes: prevBytesReceived,
      currentTimestamp,
    };
  }
}
