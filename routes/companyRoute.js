const express = require("express");
const  router=express.Router()
const {scrapController}=require("../controllers/companyController")
router.post("/scrap",scrapController)
router.get("/companies",companiesController)
router.get("/companies/:id",idController)
router.delete("/companies/:id",deleteController)
router.get("/api/companies/csv",csvController)




