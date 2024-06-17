const mongoose = require("mongoose");
require("colors");

const connectDB=async()=>{
  try{
await mongoose.connect(process.env.MONGO_URL);
console.log(`Mongodb Connected ${mongoose.connection.host}`.bgCyan.blue)
  }
  catch(error){
console.log(`Mongodb Error ${error}`.bgRed.white)
  }
}
 
module.exports = connectDB;

