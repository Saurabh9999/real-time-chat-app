import express from "express"
import User from "../model/user_Schema.js"
import Otp from "../model/otp_schema.js"
import sendEmail from "../config/sendEmail.js"

const router = express.Router()

router.post("/forget-password",async(req,res) =>{

    const {email} = req.body
    const user = await User.findOne({email})

    if(!user)
        res.status(404).jason({success:false,message:"user not found"})

    const otp = Math.floor(100000+Math.random()*999999)

    const newOtp = await Otp.create({
        email,
        otp
    })

    const message = `your verification code for password reset is ${otp}`
    await sendEmail(email,"Reset Password",message)
    res.status(200).json({success:true,message:"otp is sent to your email"})
})

router.post("/reset-password",async (req,res) =>{
    const {email,otp,newPassword}=req.body
   const otprecord = await Otp.findOne({email,otp})

   if(!otprecord || Date.now() > otprecord.createdAt.getTime() + 60 * 60 * 1000)
     res.status(400).json({message:"Invalid or expires otp"})

    const user = await User.findOne({email})
    if(!user)
     res.status(404).json({message:"user not found"})
    user.password = newPassword
    await user.save()
    await Otp.deleteMany({email})
   res.status(200).json({success:true,message:"password reset successful"})
})

export default router;