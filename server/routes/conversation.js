import express from "express";
import Conversation from "../model/conversation_Schema.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/", authMiddleware, async (req, res) => {
  try {
    const myId = req.user.id;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      members: { $all: [myId, userId] },
    });

    // If not, create a new conversation
    if (!conversation) {
      conversation = await Conversation.create({
        members: [myId, userId],
      });
    }

    res.status(200).json(conversation); // Send conversation
  } catch (error) {
    console.error("Conversation create error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/", authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ members: { $in: [userId] } })
  .populate("members", "_id name email publicKey profilePicture") // ✅ add profilePicture
  .populate({
    path: "lastMessage",
    populate: { path: "sender", select: "_id name profilePicture" }
  })
      .sort({ updatedAt: -1 });

    res.json(conversations);
    console.log("Fetched conversations:", conversations);
    // console.log("Conversations for user:", conversations);

    // console.log("user Id", req.user.id);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
