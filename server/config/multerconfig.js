// multerConfig.js
import multer from "multer";
import path from "path";

// Folder where uploaded files will be stored
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // you can customize this folder
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Optional: file filter to allow specific file types
const fileFilter = (req, file, cb) => {
  // Accept all files for now
  cb(null, true);
  // Example: Only images
  // if (file.mimetype.startsWith("image/")) cb(null, true);
  // else cb(new Error("Only images allowed"), false);
};

// Maximum file size (e.g., 5MB)
const limits = {
  fileSize: 5 * 1024 * 1024,
};

// Export configured multer instance
const upload = multer({ storage, fileFilter, limits });

export default upload;