import express from "express";
import User from "../model/user_Schema.js";
import Otp from "../model/otp_schema.js";
import sendEmail from "../config/sendEmail.js";

const router = express.Router();

router.post("/forget-password", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user)
    res.status(404).json({ success: false, message: "user not found" });

  const otp = Math.floor(100000 + Math.random() * 999999);

  const newOtp = await Otp.create({
    email,
    otp,
  });

  const message = `your verification code for password reset is ${otp}`;
  await sendEmail(email, "Reset Password", message);
  res.status(200).json({ success: true, message: "otp is sent to your email" });
});

router.post("/reset-password", async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    // Check OTP
    const otpRecord = await Otp.findOne({ email, otp });

    if (
      !otpRecord ||
      Date.now() > otpRecord.createdAt.getTime() + 60 * 60 * 1000
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Assign the plain-text password.
    // The pre("save") hook will hash it automatically.
    user.password = newPassword;

    await user.save();

    // Remove used OTP(s)
    await Otp.deleteMany({ email });

    return res.status(200).json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

export default router;
