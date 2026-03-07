import express from "express"
import jwt from "jsonwebtoken"
import User from "../model/user_Schema.js"
import bcrypt from "bcryptjs"
import authMiddleware from "../middleware/auth.js"

const router = express.Router()

router.post("/register", async(req,res)=>{
    const {name,email,password} = req.body
    
    const existingUser = await User.findOne({email})

    if(existingUser){
        return res.status(400).json({
        success:false,
        message:"User already exists"
        })
    }
    const user = await User.create({
        name,
        email,
        password
    })

    res.status(201).json({ success:true,message:"User registered successfully", user})
})

router.post("/login",async (req,res)=>{

  //  console.log(req.headers)
  // res.setHeader("myName","saurabh")
    const {email,password}=req.body

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

    // 🔹 Update last login time
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({id:user._id,name:user.name}, process.env.JWT_SECRET, {
        expiresIn: "7d"
    })
    // console.log("SIGN SECRET:", process.env.JWT_SECRET);

    res.json({ success:true, message: `Welcome back ${user.name}`, token, user });
})

router.get("/all",authMiddleware, async(req,res)=>{
  const users = await User.find({
    _id:{$ne:req.user.id},
  },"name _id")
  res.json(users)
})

export default router;