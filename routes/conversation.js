import express from "express"
import Conversation from "../model/conversation_Schema.js"
import authMiddleware from "../middleware/auth.js";

const router = express.Router()

router.post("/", authMiddleware, async (req, res) => {
  const myId = req.user.id;
  const { userId } = req.body;

  let conversation = await Conversation.findOne({
    members: { $all: [myId, userId] }
  });

  if (!conversation) {
    conversation = await Conversation.create({
      members: [myId, userId]
    });
  }

  res.json(conversation); // send room id
  // console.log(conversation)e
});

export default router;