import * as express from "express"
import * as multer from "multer";
import { userRegister } from "./controller/uploadHandler";

const storage = multer.memoryStorage();

const upload = multer({storage: storage}).fields([
    { name: 'profile_photo', maxCount: 1 },
    { name: 'tax_cert', maxCount: 1 }
  ])

export const uploadRouter = express.Router();
uploadRouter.post('/register', upload, userRegister);
