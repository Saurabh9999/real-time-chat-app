import express from "express";
import http from "http";
import { Server } from "socket.io";
import Message from "./model/message_Shema.js";
import User from "./model/user_Schema.js"
import connectdb from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors"
import jwt from "jsonwebtoken"
import userRoute from "./routes/user.js"
import messageRoute from "./routes/message.js"
import conversationRoute from "./routes/conversation.js"
import Conversation from "./model/conversation_Schema.js"
import emailRoute from "./routes/email.js"
import path from "path";
import { fileURLToPath } from "url";


dotenv.config();

const app = express()
const server = http.createServer(app)

connectdb()

// Required for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
})

io.use(async(socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));
    // console.log("incoming token",token)
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
     if (!user) {
      return next(new Error("User not found"));
    }
     socket.user = user;
    next();
  } catch (err) {
    next(new Error("Authentication failed"));
  }
});

let onlineUsers = new Set()

io.on("connection", async (socket) => {
  console.log("Connected:", socket.user.name);

  const userId = socket.user.id.toString(); // ensure string

  // ✅ Add to online users
  onlineUsers.add(userId);

  // ✅ Notify everyone
  io.emit("onlineUsers", Array.from(onlineUsers));

  // Auto join rooms
  const conversations = await Conversation.find({
    members: socket.user.id
  });

  conversations.forEach(c => {
    socket.join(c._id.toString());
  });

  socket.on("sendMessage", async ({ roomId, text }) => {
    try {
      const newMessage = await Message.create({
        sender: socket.user._id,
        text: text,
        conversationId: roomId

      });

      const populatedMessage = await Message.findById(newMessage._id)
        .populate("sender", "name email");

      io.to(roomId).emit("receiveMessage", populatedMessage);

    } catch (error) {
      console.error("Message error:", error);
    }
  });

  socket.on("joinRoom", (roomId) => {
  if (!roomId) return;

  socket.join(roomId.toString());
  // console.log("User joined room:", roomId);
  console.log(`${socket.user.name} joined room ${roomId}`);
});

// socket.on("start chat", (userId) => {
//     console.log("Start chat event received:", userId);
// });

  socket.on("typing",({roomId,senderName}) => {
    socket.to(roomId).emit("typing",{senderName})
  })

  socket.on("stopTyping",({roomId})=>{
    socket.to(roomId).emit("stopTyping");
  })

  socket.on("deleteMessage", async ({ messageId, roomId }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        console.error("Message not found");
        return;
      }

      if (message.sender.toString() !== socket.user._id.toString()) {
        console.error("Unauthorized delete attempt");
        return;
      }
      await Message.deleteOne({ _id: messageId });
      io.to(roomId).emit("messageDeleted", { messageId });
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  });

  socket.on("disconnect", () => {
    console.log("Disconnected:", socket.user.name);

    // ✅ Remove from online users
    onlineUsers.delete(userId);

    // ✅ Notify everyone
    io.emit("onlineUsers", Array.from(onlineUsers));
  
  });
});

   app.use(express.json());
   app.use(express.static(path.join(__dirname, "public")));
  app.use("/api/user",userRoute)
  app.use("/api/conversation",conversationRoute)
  app.use("/api/user",messageRoute)
  app.use("/api/user/email",emailRoute)

server.listen(3000, () => {
  console.log("Server running on port 3000");
});
