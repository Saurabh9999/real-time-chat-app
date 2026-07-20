import User from "../model/user_Schema.js";
import jwt from "jsonwebtoken";

const authMiddleware = async (req, res, next) => {
  const token = req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        message: "User deleted or inactive"
      });
    }

    req.user = user; // store full user
    next();
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};
export default authMiddleware;