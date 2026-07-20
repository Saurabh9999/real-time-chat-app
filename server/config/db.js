import mongoose from "mongoose"

const connectdb = () =>{ mongoose.connect(process.env.MONGO_URL,{
  dbName: "chatApp",
 })
 .then(()=>console.log("Database connected"))
 .catch((e)=>console.log(e));
 };
 
 export default connectdb;