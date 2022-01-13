require('dotenv/config');
import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { User, CharityDetails, Doners, UserRole, CharityStatus, Expense, Donation } from "../entity/User";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
require('firebase/storage');
global.XMLHttpRequest = require("xhr2");
import { blackListedTokens, storage } from "./userController";

function generateUserAccessToken(user_id) {
    let access_token = jwt.sign({user_id: user_id}, process.env.FTSECRET_KEY, { expiresIn: '3d' });
    console.log('[+] accessToken('+user_id+'): '+ access_token);
    if (blackListedTokens.includes(access_token))
        blackListedTokens.splice(blackListedTokens.indexOf(access_token), 1);
    return access_token;
}

export async function userRegister(request: Request, response: Response, next: NextFunction) {
    const userRepository = getRepository(User);
    const donerRepository = getRepository(Doners);
    const charityRepository = getRepository(CharityDetails);

    const files = request.files as {
        [fieldname: string]: Express.Multer.File[];
    }
    let profile_image, tax_exc_cert;
    Object.entries(files).map((value, index) => {
        let k = value[0]
        let v = value[1][0]
        if(k=="profile_photo")
            profile_image = v
        else
            tax_exc_cert = v
    })
    const {body} = request;
    const {
        name,
        username,
        password,
        dob,
        description,
        phone1,
        phone2,
        meta_wallet_address,
        account_type,
        founded_in,
        total_fundings,
        total_expenditure,
        total_donations,
    } = body;
    let {email} = body;
    if(!account_type) {
        return response.json({
            status: false,
            message: 'Error: please specify account type'
        });
    }
    if(!email) {
        return response.json({
            status: false,
            message: 'Error: name can not be blank'
        });
    }
    if(!name) {
        return response.json({
            status: false,
            message: 'Error: name can not be blank'
        });
    }
    if(!username) {
        return response.json({
            status: false,
            message: 'Error: username can not be blank'
        });
    }
    if(!password) {
        return response.json({
            status: false,
            message: 'Error: password can not be blank'
        });
    }
    if(!phone1 && account_type!="admin") {
        return response.json({
            status: false,
            message: 'Error: phone number can not be blank'
        });
    }
    if(!meta_wallet_address && account_type!="admin") {
        return response.json({
            status: false,
            message: 'Error: meta wallet address can not be blank'
        });
    }
    email = email.toLowerCase();
    let user1 = await userRepository.findOne({email: email});
    let user2 = await userRepository.findOne({username: username});
    if(user1)
        return {
            status: false,
            message: 'email already taken'
        };
    if(user2)
        return {
            status: false,
            message: 'username already taken'
        };
    console.log('[+] registering user')
    let res;
    if(profile_image)
        res = await uploadFileToFirebase(profile_image, username, 'profile_photo');
    userRepository.save({
        name: name,
        email: email,
        username: username,
        password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
        description: description,
        phone1: phone1,
        phone2: phone2,
        profile_image: (res.status && res.img_url != undefined)?res.img_url:"",
        meta_wallet_address: meta_wallet_address,
        userRole: (account_type == 'charity') ? UserRole.CHARITY : (account_type == 'admin') ? UserRole.ADMIN : UserRole.DONER,
    }).then(async(user) => {
        if(account_type == UserRole.CHARITY) {
            console.log('[+] registering charity')
            let res2;
            if(profile_image)
                res2 = await uploadFileToFirebase(tax_exc_cert, username, '80G_Certificate');
            charityRepository.save({
                user: user,
                founded_in: founded_in,
                total_fundings: total_fundings,
                total_expenditure: total_expenditure,
                tax_exc_cert: (res2.status && res2.img_url != undefined)?res2.img_url:""
            }).then((charity)=>{
                return response.json({
                    status: true,
                    message: 'Successfully Registered',
                    access_token: generateUserAccessToken(user.user_id)
                })
            }, (err) => {
                    userRepository.delete(user.user_id);
                    return response.json({
                        status: false,
                        message: "Error: Couldn't create Charity Account ("+err.message+")"
                    });
            }).catch(err => {
                userRepository.delete(user.user_id);
                return response.json({
                    status: false,
                    message: "Error: Something Went wrong, try again later ("+err.message+")"
                });
            })
        }else {
            console.log('[+] registering doner')
            donerRepository.save({
                user: user,
                dob: dob,
                total_donations: total_donations
            }).then((doner)=>{
                return response.json({
                    status: true,
                    message: 'Successfully Registered',
                    access_token: generateUserAccessToken(user.user_id)
                })
            }, (err) => {
                userRepository.delete(user.user_id);
                return response.json({
                    status: false,
                    message: "Error: Couldn't create Doner Account ("+err.message+")"
                });
            }).catch(err => {
                userRepository.delete(user.user_id);
                return response.json({
                    status: false,
                    message: "Error: Something went wrong, try again later ("+err.message+")"
                });
            })
            return response.json({
                status: true,
                message: 'Successfully Registered',
                access_token: generateUserAccessToken(user.user_id)
            })
        }
    }, (err => {
        return response.json({
            status: false,
            message: 'Error: Something went wrong during user registration, try again later. ('+err.message+')'
        });
    })).catch((err) => {
        return response.json({
            status: false,
            message: 'Error: Registration Failed! ('+err.message+')'
        })
    });
}

async function uploadFileToFirebase(file, username, filename) {
    try {
        const type = file.originalname.split(".")[1];
        const fileName = `${username}_${filename}.${type}`;
        const imageRef = storage.child(fileName);
        const snapshot = await imageRef.put(file.buffer, {contentType: file.mimetype});
        const downloadURL = await snapshot.ref.getDownloadURL();

        return {status: true, img_url: downloadURL, filename: filename};

     }  catch (error) {
        console.log (error)
        return {
            status: false,
            message: 'Error: something went wrong! ('+error.message+')',
            filename: filename
        };
    }
}