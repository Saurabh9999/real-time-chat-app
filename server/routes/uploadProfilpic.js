import express from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import jwt from "jsonwebtoken";
import User from "../model/user_Schema.js";

const router = express.Router();

/* -------------------- CLOUDINARY CONFIG -------------------- */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* -------------------- MULTER CLOUDINARY STORAGE -------------------- */
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "chat-app-profiles",         // folder name in Cloudinary
    allowed_formats: ["jpg", "png", "webp"],
    transformation: [{ width: 300, height: 300, crop: "fill" }], // auto resize
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

/* -------------------- AUTH MIDDLEWARE -------------------- */
const authMiddleware = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No token" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

/* -------------------- UPLOAD ROUTE -------------------- */
router.post(
  "/upload-profile-picture",
  authMiddleware,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // ✅ Cloudinary gives you a permanent URL directly
      const imageUrl = req.file.path;

      const updatedUser = await User.findByIdAndUpdate(
        req.userId,
        { profilePicture: imageUrl },
        { new: true },
      ).select("-password -devices");

      res.json({
        message: "Profile picture updated",
        profilePicture: imageUrl,
        user: updatedUser,
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ message: "Server error" });
    }
  },
);

export default router;