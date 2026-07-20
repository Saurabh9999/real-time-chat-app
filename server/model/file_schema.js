const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true
  },

  fileUrl: {
    type: String, // local path now, cloud URL later
    required: true
  },

  fileType: {
    type: String, // image, video, pdf, etc.
  },

  size: {
    type: Number, // in bytes
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },

  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Conversation",
    required: true
  },

}, { timestamps: true });

module.exports = mongoose.model("File", fileSchema);