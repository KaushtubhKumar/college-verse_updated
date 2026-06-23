// server.js — standalone Socket.IO server (runs on port 3001)
// Start with: node server.js
// In dev: run alongside `npm run dev`
// In prod: deploy as separate service on Railway/Render

const { createServer } = require("http");
const { Server } = require("socket.io");

const PORT = process.env.PORT || process.env.SOCKET_PORT || 3001;

const CLIENT_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
  // Ping timeout/interval for connection health
  pingTimeout: 20000,
  pingInterval: 10000,
});

// Track online count per room
const roomUsers = new Map(); // roomId -> count

io.on("connection", (socket) => {
  console.log(`[socket] connected: ${socket.id}`);

  // Join a community room
  socket.on("join_room", ({ roomId }) => {
    socket.join(roomId);
    roomUsers.set(roomId, (roomUsers.get(roomId) || 0) + 1);

    // Tell everyone in room the updated count
    io.to(roomId).emit("room_users", { count: roomUsers.get(roomId) });
    console.log(`[socket] ${socket.id} joined ${roomId} (${roomUsers.get(roomId)} online)`);
  });

  // New question posted — broadcast to room
  // Payload: { roomId, question: { id, authorName, title, body, createdAt, answers: [] } }
  socket.on("post_question", ({ roomId, question }) => {
    // Broadcast to everyone else in the room (sender already has it optimistically)
    socket.to(roomId).emit("new_question", { question });
    console.log(`[socket] new_question in ${roomId}: "${question.title}"`);
  });

  // New answer posted — broadcast to room
  // Payload: { roomId, questionId, answer: { id, authorName, body, createdAt } }
  socket.on("post_answer", ({ roomId, questionId, answer }) => {
    socket.to(roomId).emit("new_answer", { questionId, answer });
    console.log(`[socket] new_answer in ${roomId} for question ${questionId}`);
  });

  // User typing indicator (optional but nice)
  socket.on("typing", ({ roomId, authorName }) => {
    socket.to(roomId).emit("user_typing", { authorName });
  });

  socket.on("disconnecting", () => {
    for (const roomId of socket.rooms) {
      if (roomId === socket.id) continue; // skip personal room
      const count = Math.max(0, (roomUsers.get(roomId) || 1) - 1);
      roomUsers.set(roomId, count);
      io.to(roomId).emit("room_users", { count });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[socket] disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`\n🔌 Socket.IO server running on port ${PORT}`);
  console.log(`   Accepting connections from: ${CLIENT_URL}\n`);
});
