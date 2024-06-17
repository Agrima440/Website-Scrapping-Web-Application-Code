const mongoose=require('mongoose');


const companySchema = new mongoose.Schema({
  name: String,
  description: String,
  logo: String,
  facebook: String,
  linkedin: String,
  twitter: String,
  instagram: String,
  address: String,
  phone: String,
  email: String,
  screenshot: String
},{timestamps:true});

const companyModel= mongoose.model('company',companySchema);
module.exports= companyModel;
