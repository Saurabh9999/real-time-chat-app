import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 🔐 store encrypted message ONLY
    encryptedPayload: {
      // Receiver's copy
      cipherText: { type: String, required: true },
      nonce: { type: String, required: true },
      senderPublicKey: { type: String, required: true },

      // ✅ Sender's self-copy (for decryption after refresh)
      cipherTextForSender: { type: String, required: true },
      nonceForSender: { type: String, required: true },
    },

    file: {
      url: String,
      name: String,
      type: String,
      size: Number,
    },

    status: {
      type: String,
      enum: ["sending", "sent", "delivered"],
      default: "sent",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Message", messageSchema);