import mongoose from "mongoose"
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name:{
        type:"String",
        required:true
    },
    email:{
        type:"String",
        required:true,
        unique:true
    },
    password:{
        type:"String",
        required:true
    },
    isOnline:{
        type:"String",
        default:false
    },
    lastSeen:{
        type:Date
    },

},
  {timeStamps:true}
);

userSchema.pre("save", async function () {
  // Only hash if password is new or modified
  if (!this.isModified("password")) return ;

  // Hash password with salt rounds = 10
  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model("User",userSchema)