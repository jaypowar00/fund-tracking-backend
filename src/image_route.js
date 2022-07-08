import * as express from "express"
import * as multer from "multer";
import { uploadReasonPhoto, userRegister } from "./controller/uploadHandler";

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
uploadRouter.post('/upload-reason-photo', upload2, uploadReasonPhoto);
