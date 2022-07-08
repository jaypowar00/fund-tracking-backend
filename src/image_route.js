import * as express from "express"
// import * as multer from "multer";
const multer = require("multer");
import { uploadReasonFile, userRegister, updateTaxCertificate, updateProfilePhoto, updateProfile } from "./controller/uploadHandler";

const storage = multer.memoryStorage();

const upload = multer({storage: storage}).fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'tax_cert', maxCount: 1 }
  ])

const upload2 = multer({storage: storage}).fields([
    { name: 'proof_photo', maxCount: 1 }
  ])

export const uploadRouter = express.Router();

uploadRouter.post('/register', upload, userRegister);
uploadRouter.post('/upload-reason-file', upload2, uploadReasonFile);
uploadRouter.post('/profile', upload, updateProfile)
