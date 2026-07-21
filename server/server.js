import express from "express";
import "dotenv/config";
import dns from "dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import http from "http";
import { Server } from "socket.io";
import Message from "./model/message_Shema.js";
import User from "./model/user_Schema.js";
import connectdb from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import jwt from "jsonwebtoken";
import userRoute from "./routes/user.js";
import messageRoute from "./routes/message.js";
import conversationRoute from "./routes/conversation.js";
import Conversation from "./model/conversation_Schema.js";
import emailRoute from "./routes/email.js";
import getPublicKey from "./routes/getPublicKey.js";
import uploadProfilePictureRoute from "./routes/uploadProfilpic.js";
import registerDeviceRoute from "./routes/user.js";
import path from "path";
import { fileURLToPath } from "url";


const app = express();
const server = http.createServer(app);

connectdb();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* -------------------- MIDDLEWARE -------------------- */
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

/* -------------------- SOCKET -------------------- */
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

/* -------------------- AUTH -------------------- */
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) return next(new Error("User not found"));

    socket.user = user;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

/* -------------------- ONLINE USERS -------------------- */
let onlineUsers = new Map();

/* -------------------- SOCKET EVENTS -------------------- */
io.on("connection", async (socket) => {
  const userId = socket.user._id.toString();

  console.log("Connected:", socket.user.name);

  /* -------------------- ONLINE -------------------- */
  onlineUsers.set(userId, {
    id: userId,
    name: socket.user.name,
    isOnline: true,
    lastSeen: new Date(),
  });

  await User.findByIdAndUpdate(socket.user._id, {
    isOnline: true,
  });

  io.emit("onlineUsers", Array.from(onlineUsers.values()));

  /* -------------------- AUTO JOIN ROOMS -------------------- */
  const conversations = await Conversation.find({
    members: { $in: [socket.user._id] },
  });

  conversations.forEach((c) => {
    socket.join(c._id.toString());
  });

  /* -------------------- SEND MESSAGE -------------------- */
  socket.on("sendMessage", async ({ roomId, encryptedPayload }) => {
    try {
      console.log("ROOM:", roomId);
      console.log("PAYLOAD:", encryptedPayload);
      console.log("🔑 senderPublicKey (FROM CLIENT):");
      console.log(encryptedPayload.senderPublicKey);

      console.log("🔐 nonce:");
      console.log(encryptedPayload.nonce);

      console.log("💬 cipherText:");
      console.log(encryptedPayload.cipherText);

      const senderPublicKey = socket.user.devices?.[0]?.publicKey;

      if (!senderPublicKey) {
        console.error("Missing senderPublicKey — aborting");
        return;
      }

      const safePayload = {
        cipherText: encryptedPayload.cipherText,
        nonce: encryptedPayload.nonce,
        senderPublicKey, // server-owned truth

        cipherTextForSender: encryptedPayload.cipherTextForSender,
        nonceForSender: encryptedPayload.nonceForSender,
      };

      console.log("BACKEND KEY:", socket.user.devices?.[0]?.publicKey);
      console.log("FRONTEND KEY:", encryptedPayload.senderPublicKey);
      console.log(
        "MATCH:",
        socket.user.devices?.[0]?.publicKey ===
          encryptedPayload.senderPublicKey,
      );

      const newMessage = await Message.create({
        sender: socket.user._id,
        conversationId: roomId,
        encryptedPayload: safePayload, // ✅ FIXED (was payload)
      });

      const populatedMessage = await newMessage.populate(
        "sender",
        "_id name email publicKey",
      );

      const updatedConversation = await Conversation.findByIdAndUpdate(
        roomId,
        {
          lastMessage: newMessage._id,
          updatedAt: Date.now(),
        },
        { new: true },
      )
        .populate("members", "name email publicKey")
        .populate({
          path: "lastMessage",
          populate: {
            path: "sender",
            select: "_id name email publicKey", // ❌ FIXED typo
          },
        });

      io.to(roomId).emit("receiveMessage", {
        conversation: updatedConversation,
        encryptedPayload,
        sender: populatedMessage.sender,
        createdAt: populatedMessage.createdAt,
        _id: populatedMessage._id,
      });
    } catch (err) {
      console.error("SendMessage error:", err);
    }
  });

  /* -------------------- JOIN ROOM -------------------- */
  socket.on("joinRoom", (roomId) => {
    if (!roomId) return;

    socket.join(roomId.toString());
    console.log(`${socket.user.name} joined room ${roomId}`);
  });

  /* -------------------- TYPING -------------------- */
  socket.on("typing", ({ roomId }) => {
    if (!roomId) return;

    socket.to(roomId).emit("typing", {
      userId: socket.user._id,
      senderName: socket.user.name,
    });
  });

  socket.on("getUserPublicKey", async (userId, callback) => {
    try {
      const user = await User.findById(userId).select("name devices");

      if (!user || !user.devices || user.devices.length === 0) {
        return callback({ error: "Public key not found" });
      }

      // 👉 just take first device (simple working fix)
      const publicKey = user.devices[0].publicKey;

      callback({
        userId: user._id,
        name: user.name,
        publicKey,
      });
    } catch (err) {
      console.error("PublicKey error:", err);
      callback({ error: "Server error" });
    }
  });

  socket.on("stopTyping", ({ roomId }) => {
    if (!roomId) return;

    socket.to(roomId).emit("stopTyping", {
      userId: socket.user._id,
    });
  });

  /* -------------------- DELETE MESSAGE -------------------- */
  socket.on("deleteMessage", async ({ messageId, roomId }) => {
    try {
      const message = await Message.findById(messageId);

      if (!message) return;

      if (message.sender.toString() !== socket.user._id.toString()) {
        return;
      }

      await Message.deleteOne({ _id: messageId });

      io.to(roomId).emit("messageDeleted", { messageId });
    } catch (err) {
      console.error("Delete error:", err);
    }
  });

  /* -------------------- DISCONNECT -------------------- */
  socket.on("disconnect", async () => {
    console.log("Disconnected:", socket.user.name);

    onlineUsers.set(userId, {
      id: userId,
      name: socket.user.name,
      isOnline: false,
      lastSeen: new Date(), // ✅ FIXED
    });

    await User.findByIdAndUpdate(socket.user._id, {
      isOnline: false,
      lastSeen: new Date(), // ✅ FIXED
    });

    io.emit("onlineUsers", Array.from(onlineUsers.values()));
  });
});

/* -------------------- ROUTES -------------------- */
app.use("/api/user", userRoute);
app.use("/api/conversation", conversationRoute);
app.use("/api/user", messageRoute);
app.use("/api/user/email", emailRoute);
app.get("/api/user", getPublicKey);
app.use("/api/user", uploadProfilePictureRoute);
app.use("/api/user", registerDeviceRoute);

/* -------------------- START SERVER -------------------- */
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
