import express from "express";
import multer from "multer";
import path from "path";
import jwt from "jsonwebtoken";
import User from "../model/user_Schema.js";

const router = express.Router();

/* -------------------- MULTER CONFIG -------------------- */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // saves to /uploads folder
  },
  filename: (req, file, cb) => {
    // filename: userId_timestamp.ext  e.g. 64abc123_1720000000000.jpg
    const ext = path.extname(file.originalname);
    cb(null, `${req.userId}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only JPG, PNG, and WEBP images are allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
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
  upload.single("profilePicture"), // field name from frontend
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Build public URL — e.g. http://localhost:3000/uploads/64abc_123.jpg
      const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

      // Update user in DB
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