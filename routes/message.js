import express from "express"
import Message from "../model/message_Shema.js"

const router = express.Router()
router.get("/message/:conversationId", async (req, res) => {
  try {
    const messages = await Message.find({
      conversationId: req.params.conversationId
    })
    .populate("sender", "_id name")
    .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router
