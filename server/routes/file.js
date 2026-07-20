// app.js or routes/chat.js
import express from "express";
import upload from "../config/multerconfig.js"; // import the config

const router = express.Router();

router.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded.");

  res.json({
    filename: req.file.filename,
    originalname: req.file.originalname,
    path: req.file.path,
    url: `/uploads/${req.file.filename}`,
  });
});

export default router;