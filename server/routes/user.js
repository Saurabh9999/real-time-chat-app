import express from "express";
import jwt from "jsonwebtoken";
import User from "../model/user_Schema.js";
import bcrypt from "bcryptjs";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      deviceId,
      publicKey,
      encryptedPrivateKey,
      privateKeyNonce,
    } = req.body;

    let user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }

    user = new User({
      name,
      email,
      password,
      devices: [
        {
          deviceId,
          publicKey,
          encryptedPrivateKey,
          privateKeyNonce,
        },
      ],
    });

    await user.save();

    res.json({ message: "User created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, deviceId } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter both email and password",
      });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatched = await bcrypt.compare(password, user.password);

    if (!isMatched) {
      return res.status(404).json({
        success: false,
        message: "Invalid password",
      });
    }

    // 🔐 update login time
    user.lastLogin = new Date();

    const device =
      user.devices?.find((d) => d.encryptedPrivateKey) ?? user.devices?.[0];

    if (device) {
      device.lastSeen = new Date();
    }
    await user.save();

    // 🔍 find current device (IMPORTANT for E2EE system)
    // const device = user.devices?.find((d) => d.deviceId === deviceId);

    const token = jwt.sign(
      { id: user._id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    // ❌ NEVER send password to frontend
    user.password = undefined;

    res.json({
      success: true,
      message: `Welcome back ${user.name}`,
      token,

      // ✅ send clean user structure
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        isOnline: user.isOnline,
        lastSeen: user.lastSeen,
        profilePicture: user.profilePicture,

        // 🔐 IMPORTANT: needed for encryption recovery
        devices: user.devices,

        // optional: current device context
        currentDevice: device || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

router.get("/all", authMiddleware, async (req, res) => {
  const users = await User.find(
    {
      _id: { $ne: req.user.id },
    },
    "name _id",
  );
  res.json(users);
});

// GET /api/user/search?query=John
router.get("/search", async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);

    const regex = new RegExp(query, "i"); // case-insensitive search
    const users = await User.find({ name: regex }).select("_id name email");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const publicKey = user.devices?.[0]?.publicKey || null;

    res.json({
      ...user,
      publicKey, // ✅ flatten it for frontend
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/register-device", authMiddleware, async (req, res) => {
  try {
    const { deviceId, publicKey, encryptedPrivateKey, privateKeyNonce } =
      req.body;

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if device already exists — update it
    const existingDevice = user.devices.find((d) => d.deviceId === deviceId);

    if (existingDevice) {
      existingDevice.publicKey = publicKey;
      existingDevice.encryptedPrivateKey = encryptedPrivateKey;
      existingDevice.privateKeyNonce = privateKeyNonce;
      existingDevice.lastSeen = new Date();
    } else {
      // Add new device
      user.devices.push({
        deviceId,
        publicKey,
        encryptedPrivateKey,
        privateKeyNonce,
        lastSeen: new Date(),
      });
    }

    await user.save();
    res.json({ success: true, message: "Device registered" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
