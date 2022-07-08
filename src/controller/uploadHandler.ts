require('dotenv/config');
import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { User, CharityDetails, Doners, UserRole, CharityStatus, Expense, Donation } from "../entity/User";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
require('firebase/storage');
global.XMLHttpRequest = require("xhr2");
import { blackListedTokens, storage, proof_storage } from "./userController";

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

export async function uploadReasonFile(request: Request, response: Response, next: NextFunction) {

    // jwt verification
    const authHeader = request.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null)
        return response.json({
            status: false,
            message: 'access token is missing in request'
        });

    jwt.verify(token, process.env.FTSECRET_KEY, async (err, user) => {
        if(err) {
            console.log('[+] err:\n');
            console.log(err.name);
            if (blackListedTokens.includes(token))
                blackListedTokens.splice(blackListedTokens.indexOf(token), 1);
            return response.json({
                status: false,
                message: err.message
            })
        }
    
        if (blackListedTokens.includes(token))
            return response.json({
                status: false,
                message: 'you have been logged out, please login again'
            })
        else {
            const userRepository = getRepository(User);
            userRepository.findOne({user_id: user['user_id']}).then(async (user) => {
                if(user) {
                    let account = user.userRole;
                    if(account == UserRole.CHARITY) {
                        let d = new Date();
                        let datetime_string = d.getFullYear()+(d.getMonth()<10?"0":"")+d.getMonth()+(d.getDay()<10?"0":"")+d.getDay()+(d.getHours()<10?"0":"")+d.getHours()+(d.getMinutes()<10?"0":"")+d.getMinutes()+(d.getSeconds()<10?"0":"")+d.getSeconds();
                        let reason_filename = user.name + datetime_string
                        //
                        const files = request.files as {
                            [fieldname: string]: Express.Multer.File[];
                        }
                        let proof_image;
                        if(!files) {
                            return response.json({
                                status: false,
                                message: 'please provide 1 file to upload'
                            })
                        }
                        Object.entries(files).map((value, index) => {
                            let k = value[0]
                            let v = value[1][0]
                            if(k=="proof_photo")
                                proof_image = v
                        })
                        console.log('[+] uploading reason file...')
                        let res;
                        if(proof_image) {
                            res = await uploadProofFileToFirebase(proof_image, user.username, reason_filename);
                            if(res.status && res.img_url != undefined) {
                                return response.json({
                                    status: true,
                                    img_url: res.img_url,
                                    message: 'success',
                                });
                            }else {
                                return response.json({
                                    status: false,
                                    message: res.message
                                });
                            }
                        }
                        //
                    }else {
                        return response.json({
                            status: false,
                            message: 'unauthorized access (only for charities!)'
                        })
                    }
                }else {
                    console.log('in user profile else')
                    return response.json({
                        status: false,
                        message: 'could not find user!'
                    });
                }
            });
        }
    });
}

export async function updateProfile(request: Request, response: Response, next: NextFunction) {
    const userRepository = getRepository(User);
    const donerRepository = getRepository(Doners);
    const charityRepository = getRepository(CharityDetails);

    const files = request.files as {
        [fieldname: string]: Express.Multer.File[];
    }
    let profile_image, tax_exc_cert;
    if(files)
        Object.entries(files).map((value, index) => {
            let k = value[0]
            let v = value[1][0]
            if(k=="profile_photo")
                profile_image = v
            else
                tax_exc_cert = v
        })
    const { body } = request;
    let {
        name,
        username,
        password,
        dob,
        description,
        phone1,
        phone2,
        meta_wallet_address,
        founded_in,
        total_fundings,
        total_expenditure,
        total_donations,
    } = body;
    let {email} = body;
    
    // jwt verification
    const authHeader = request.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null)
        return response.json({
            status: false,
            message: 'access token is missing in request'
        });
    jwt.verify(token, process.env.FTSECRET_KEY, async (err, user) => {
        if(err) {
            console.log('[+] err:\n');
            console.log(err.name);
            if (blackListedTokens.includes(token))
                blackListedTokens.splice(blackListedTokens.indexOf(token), 1);
            return response.json({
                status: false,
                message: err.message
            })
        }
    
        if (blackListedTokens.includes(token))
            return response.json({
                status: false,
                message: 'you have been logged out, please login again'
            })
        else {
            userRepository.findOne(user['user_id']).then(async(user) => {
                let res = null;
                if(profile_image)
                    res = await uploadFileToFirebase(profile_image, user.username, 'profile_photo');
                let backup_user = user
                let account = user.userRole
                name = (name)?name:user.name
                email = (email)?email:user.email
                username = (username)?username:user.username
                password = (password)?bcrypt.hashSync(password, bcrypt.genSaltSync(8), null):user.password
                description = (description)?description:user.description
                phone1 = (phone1)?phone1:user.phone1
                phone2 = (phone2)?phone2:user.phone2
                meta_wallet_address = (meta_wallet_address)?meta_wallet_address:user.meta_wallet_address
                profile_image = (res && res.status && res.img_url != undefined)?res.img_url:user.profile_image,
                userRepository.update(user.user_id, {
                    name: name,
                    email: email,
                    username: username,
                    password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
                    description: description,
                    phone1: phone1,
                    phone2: phone2,
                    meta_wallet_address: meta_wallet_address,
                    profile_image: profile_image
                }).then((async updatedData => {
                    if(account == UserRole.CHARITY) {
                        charityRepository.findOne({user: user}).then(async (charityDetails) => {
                            let res2 = null;
                            if(tax_exc_cert)
                                res2 = await uploadFileToFirebase(tax_exc_cert, user.username, '80G_Certificate');
                            founded_in = (founded_in)? founded_in:charityDetails.founded_in
                            total_fundings = (total_fundings)? total_fundings:charityDetails.total_fundings
                            total_expenditure = (total_expenditure)? total_expenditure:charityDetails.total_expenditure
                            tax_exc_cert = (res2 && res2.status && res2.img_url != undefined)?res2.img_url:charityDetails.tax_exc_cert
                            charityRepository.update(charityDetails.charity_id, {
                                founded_in: founded_in,
                                total_fundings: total_fundings,
                                total_expenditure: total_expenditure,
                                tax_exc_cert: tax_exc_cert
                            }).then(() => {
                                return response.json({
                                    status: true,
                                    message: 'Profile updated'
                                });
                            }, (err) => {
                                userRepository.update(user.user_id, backup_user).then(()=>{
                                    return response.json({
                                        status: false,
                                        message: 'Failed to update profile ('+err.message+')'
                                    });
                                })
                            }).catch((err)=>{
                                userRepository.update(user.user_id, backup_user).then(()=>{
                                    return response.json({
                                        status: false,
                                        message: 'Failed to update profile ('+err.message+')'
                                    });
                                })
                            });
                        }).catch(err => {
                            userRepository.update(user.user_id, backup_user).then(()=>{
                                return response.json({
                                    status:false,
                                    message: 'Failed to update profile!('+err.message+')'
                                });
                            })
                        })
                    }else if(account == UserRole.DONER) {
                        donerRepository.findOne({user: user}).then(async (doner) => {
                            dob = (dob)? dob:doner.dob
                            total_donations = (total_donations)? total_donations:doner.total_donations
                            donerRepository.update(doner.doner_id, {
                                dob: dob,
                                total_donations: total_donations
                            }).then(() => {
                                return response.json({
                                    status: true,
                                    message: 'Profile updated'
                                });
                            }, (err) => {
                                userRepository.update(user.user_id, backup_user).then(()=>{
                                    return response.json({
                                        status: false,
                                        message: 'Failed to update profile ('+err.message+')'
                                    });
                                })
                            }).catch((err)=>{
                                userRepository.update(user.user_id, backup_user).then(()=>{
                                    return response.json({
                                        status: false,
                                        message: 'Failed to update profile ('+err.message+')'
                                    });
                                })
                            });
                        }).catch(err => {
                            userRepository.update(user.user_id, backup_user).then(()=>{
                                return response.json({
                                    status:false,
                                    message: 'Failed to update profile!('+err.message+')'
                                });
                            })
                        })
                    }
                }))
            }).catch(err => {
                return response.json({
                    status: false,
                    message: 'something went wrong, try again later. ('+err.message+')'
                });
            });
        }
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
async function uploadProofFileToFirebase(file, username, filename) {
    try {
        const type = file.originalname.split(".")[1];
        const fileName = `${username}_${filename}.${type}`;
        const imageRef = proof_storage.child(fileName);
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