const http = require("http");
const { Server } = require("socket.io");
const os = require("os");

const PORT = process.env.SIGNALING_PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Rural Telemed WebRTC Signaling Server is running on port " + PORT);
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Map of socket.id -> { roomId, role, userName }
const socketMeta = new Map();

io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Auto-join global lobby so any device receives broadcast alerts
  socket.join("global-lobby");

  // Join a consultation room
  socket.on("join-room", ({ roomId, role, userName }) => {
    socket.join(roomId);
    socketMeta.set(socket.id, { roomId, role, userName });

    console.log(`[Room] ${userName || socket.id} (${role || "user"}) joined ${roomId}`);

    // Notify other peers in this room
    socket.to(roomId).emit("user-joined", {
      socketId: socket.id,
      role: role || "unknown",
      userName: userName || "User",
    });

    // Send list of current occupants in room
    const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
    const occupants = clientsInRoom
      .filter((id) => id !== socket.id)
      .map((id) => socketMeta.get(id) || { socketId: id, role: "unknown", userName: "Peer" });

    socket.emit("room-occupants", occupants);
  });

  // Call invitation (bidirectional: Doctor calling Kiosk or Kiosk calling Doctor)
  socket.on("call-user", ({ roomId, callerName, role, patientId, patientName }) => {
    console.log(`[Call] Call initiated in ${roomId} by ${callerName} (${role}) for patient: ${patientName || patientId}`);
    
    // Relay to the specific room
    socket.to(roomId).emit("incoming-call", {
      callerId: socket.id,
      callerName: callerName || (role === "kiosk" ? "कियोस्क ऑपरेटर" : "Dr. Rajesh Sharma, MD"),
      role: role || "kiosk",
      roomId,
      patientId,
      patientName,
    });

    // Broadcast globally to all other connected devices (e.g. Doctor Dashboard on laptop or Kiosk on tablet)
    socket.broadcast.emit("global-incoming-call", {
      callerId: socket.id,
      callerName: callerName || (role === "kiosk" ? "कियोस्क ऑपरेटर" : "Dr. Rajesh Sharma, MD"),
      role: role || "kiosk",
      roomId,
      patientId,
      patientName,
    });
  });

  // Call answered by peer
  socket.on("call-accepted", ({ roomId }) => {
    console.log(`[Call] Call accepted in ${roomId}`);
    socket.to(roomId).emit("call-accepted", { peerId: socket.id });
    socket.broadcast.emit("global-call-answered", { roomId, peerId: socket.id });
  });

  // Call declined
  socket.on("call-declined", ({ roomId }) => {
    console.log(`[Call] Call declined in ${roomId}`);
    socket.to(roomId).emit("call-declined", { peerId: socket.id });
    socket.broadcast.emit("global-call-dismissed", { roomId });
  });

  // Call cancelled by caller
  socket.on("cancel-call", ({ roomId }) => {
    console.log(`[Call] Call cancelled in ${roomId}`);
    socket.to(roomId).emit("call-declined", { peerId: socket.id, cancelled: true });
    socket.broadcast.emit("global-call-dismissed", { roomId });
  });

  // WebRTC SDP Offer
  socket.on("offer", ({ roomId, sdp }) => {
    console.log(`[WebRTC] Relay SDP Offer in ${roomId}`);
    socket.to(roomId).emit("offer", { sdp, senderId: socket.id });
  });

  // WebRTC SDP Answer
  socket.on("answer", ({ roomId, sdp }) => {
    console.log(`[WebRTC] Relay SDP Answer in ${roomId}`);
    socket.to(roomId).emit("answer", { sdp, senderId: socket.id });
  });

  // WebRTC ICE Candidate
  socket.on("ice-candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice-candidate", { candidate, senderId: socket.id });
  });

  // Live in-call text chat
  socket.on("chat-message", (msg) => {
    const { roomId, text, sender, time, senderRole } = msg || {};
    console.log(`[Chat] Message in ${roomId} from ${sender || senderRole}: ${text}`);
    if (roomId) {
      socket.to(roomId).emit("chat-message", msg);
    } else {
      socket.broadcast.emit("chat-message", msg);
    }
  });

  // Real-time patient registration broadcast (ASHA Kiosk -> Doctor Hub)
  socket.on("new-patient-registered", (data) => {
    console.log(`[Patient] New patient registered broadcast:`, data?.patient?.name || data?.name || data?.id);
    socket.broadcast.emit("new-patient-registered", data);
  });

  // Bandwidth Degradation Tier Sync (Doctor notifies Kiosk of current tier)
  socket.on("tier-change", ({ roomId, tier }) => {
    console.log(`[Tier] Degradation tier changed in ${roomId} to ${tier}`);
    socket.to(roomId).emit("tier-change", { tier });
  });

  // Camera Facing Mode Sync (Kiosk notifies Doctor when switching to Exam camera)
  socket.on("camera-mode-changed", ({ roomId, mode }) => {
    console.log(`[Camera] Camera mode changed in ${roomId} to ${mode}`);
    socket.to(roomId).emit("camera-mode-changed", { mode });
  });

  // End Call
  socket.on("end-call", ({ roomId }) => {
    console.log(`[Call] Call ended in ${roomId}`);
    socket.to(roomId).emit("call-ended", { senderId: socket.id });
    socket.broadcast.emit("global-call-dismissed", { roomId });
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    const meta = socketMeta.get(socket.id);
    if (meta) {
      console.log(`[Room] ${meta.userName || socket.id} left room ${meta.roomId}`);
      socket.to(meta.roomId).emit("user-left", { socketId: socket.id, role: meta.role });
      socketMeta.delete(socket.id);
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`\n⚠️  [Signaling Server] Port ${PORT} is already in use by another background process.`);
    console.warn(`   Run 'npm run clean-ports' to close lingering processes, or keep using the already running server.\n`);
    process.exit(0);
  } else {
    console.error("[Signaling Server] Error:", err);
    process.exit(1);
  }
});

server.listen(PORT, "0.0.0.0", () => {
  const nets = os.networkInterfaces();
  const lanIps = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        lanIps.push(net.address);
      }
    }
  }

  console.log(`=======================================================`);
  console.log(`  Rural Telemed WebRTC Signaling Server               `);
  console.log(`  Local:     http://localhost:${PORT}                 `);
  lanIps.forEach((ip) => {
    console.log(`  Network:   http://${ip}:${PORT}                     `);
  });
  console.log(`=======================================================`);
});
