require('dotenv/config');
import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { User, CharityDetails, Doners, UserRole, CharityStatus, Expense, Donation } from "../entity/User";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import firebase from "firebase/compat/app";
require('firebase/compat/storage');
global.XMLHttpRequest = require("xhr2");
import { firebaseConfig } from '../config';

export const fire_app: firebase.app.App = firebase.initializeApp(firebaseConfig);
export const storage = fire_app.storage(process.env.STORAGE_BUCKET).ref(process.env.STORAGE_BUCKET_PATH);
export const proof_storage = fire_app.storage(process.env.STORAGE_BUCKET).ref(process.env.STORAGE_BUCKET_PATH_PROOF);

export let blackListedTokens = [];

export class userController {
    private userRespository = getRepository(User);
    private donerRespository = getRepository(Doners);
    private charityRespository = getRepository(CharityDetails);
    private expensesRespository = getRepository(Expense);
    private donationsRespository = getRepository(Donation);

    private generateUserAccessToken(user_id) {
        let access_token = jwt.sign({user_id: user_id}, process.env.FTSECRET_KEY, { expiresIn: '3d' });
        console.log('[+] accessToken('+user_id+'): '+ access_token);
        if (blackListedTokens.includes(access_token))
            blackListedTokens.splice(blackListedTokens.indexOf(access_token), 1);
        return access_token;
    }
    
    private authenticateUser(req) {
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
    
        if (token == null)
            return {
                status: false,
                message: 'access token is missing in request'
            }
        jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
            if(err) {
                console.log('[+] err:\n');
                console.log(err.name);
                if (blackListedTokens.includes(token))
                    blackListedTokens.splice(blackListedTokens.indexOf(token), 1);
                return {
                    status: false,
                    message: err.message
                }
            }
            if (blackListedTokens.includes(token))
                return {
                    status: false,
                    message: 'you have been logged out, please login again'
                }
            let res = {
                status: true,
                user: user.user_id
            };
            console.log(res);
            console.log('lol');
            return new Promise(resolve => {
                resolve(res);
              });
        });
    }

    async getAllCharity(request: Request, response: Response, next: NextFunction) {

        let charities = (await this.userRespository.find({where: {userRole: UserRole.CHARITY, charityDetails: { verified: CharityStatus.VERIFIED }} ,relations: ['charityDetails']}));
        charities.forEach((charity, index) => {
            delete charity.password
            delete charity.meta_wallet_address
            delete charity.phone1
            delete charity.phone2
            delete charity.userRole

            charity["founded_in"] = charity.charityDetails.founded_in
            charity["total_fundings"] = charity.charityDetails.total_fundings
            charity["total_expenditure"] = charity.charityDetails.total_expenditure
            
            delete charity.charityDetails
        });
        return {
            status: true,
            charities: charities
        }
    }
    async getOneCharity(request: Request, response: Response, next: NextFunction) {

        let charity = (await this.userRespository.findOne({where: {username: request.params.username}, relations: ['charityDetails']}));
        delete charity.password
        return {
            status: true,
            charity: charity
        }
    }
    async getCharityById(request: Request, response: Response, next: NextFunction) {

        let charity = (await this.userRespository.findOne({where: {user_id: request.params.id}, relations: ['charityDetails']}));
        delete charity.password
        return {
            status: true,
            charity: charity
        }
    }

    async getCharityDonations(request: Request, response: Response, next: NextFunction) {
        // jwt verification
        const authHeader = request.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
    
        if (token == null)
            return response.json({
                status: false,
                message: 'access token is missing in request'
            });
        jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
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
                this.userRespository.findOne(user['user_id']).then((user) => {
                    if(user.userRole != UserRole.CHARITY)
                        return response.json({
                            status: false,
                            message: 'Unauthorized Access. (this feature is only accessible by Chrities)'
                        });
                    this.donationsRespository.find({where: {charity: {user: {user_id: user.user_id}}}, relations: ['charity', 'doner', 'charity.user', 'doner.user']}).then((donations) => {
                        donations.forEach((donation, index)=>{
                            console.log(index)
                            console.log(donation.charity.user.name)
                            console.log(donation.charity.user.username)
                            console.log(donation.doner.user.name)
                            console.log(donation.doner.user.username)
                            donation['charity_name'] = donation.charity.user.name
                            donation['charity_username'] = donation.charity.user.username
                            donation['user_profile_image'] = donation.doner.user.profile_image
                            donation['user_name'] = donation.doner.user.name
                            donation['user_username'] = donation.doner.user.username
                            delete donation.charity
                            delete donation.doner
                        })
                        return response.json({
                            status: true,
                            donations: donations
                        });
                    }, (err) => {
                        return response.json({
                            status: false,
                            donations: [],
                            message: 'Error: Failed to retrieve donations. ('+err.message+')'
                        });
                    }).catch(err => {
                        return response.json({
                            status: false,
                            donations: [],
                            message: 'Error: Something went wrong. ('+err.message+')'
                        });
                    })
                }).catch(err => {
                    return response.json({
                        status: false,
                        message: 'something went wrong, try again later. ('+err.message+')'
                    });
                });
            }
        });
    }

    async getCharityExpenses(request: Request, response: Response, next: NextFunction) {
        // jwt verification
        const authHeader = request.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
    
        if (token == null)
            return response.json({
                status: false,
                message: 'access token is missing in request'
            });
        jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
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
                this.userRespository.findOne(user['user_id']).then((user) => {
                    if(user.userRole != UserRole.CHARITY)
                        return response.json({
                            status: false,
                            message: 'Unauthorized Access. (this feature is only accessible by Chrities)'
                        });
                    this.expensesRespository.find({where: {charity: {user: {user_id: user['user_id']}}}, relations: ['charity']}).then((expenses) => {
                        expenses.forEach((expense, index)=>{
                            delete expense.charity
                        })
                        return response.json({
                            status: true,
                            expenses: expenses
                        });
                    }, (err) => {
                        return response.json({
                            status: false,
                            expenses: [],
                            message: 'Error: Failed to retrieve expenses. ('+err.message+')'
                        });
                    }).catch(err => {
                        return response.json({
                            status: false,
                            expenses: [],
                            message: 'Error: Something went wrong. ('+err.message+')'
                        });
                    })
                }).catch(err => {
                    return response.json({
                        status: false,
                        message: 'something went wrong, try again later. ('+err.message+')'
                    });
                });
            }
        });
    }

    async getProfile(request: Request, response: Response, next: NextFunction) {
        // jwt verification
        const authHeader = request.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
    
        if (token == null)
            return response.json({
                status: false,
                message: 'access token is missing in request'
            });
        jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
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
                this.userRespository.findOne({user_id: user['user_id']}).then((user) => {
                    if(user) {
                        console.log('in user profile')
                        let account = user.userRole;
                        delete user.password;
                        delete user.userRole;
                        if(account == UserRole.CHARITY) {
                            this.charityRespository.findOne({user: user}).then((charity) => {
                                delete user.doner;
                                delete user.charityDetails;
                                user['charity_id'] = charity.charity_id;
                                user['founded_in'] = charity.founded_in;
                                user['tax_exc_cert'] = charity.tax_exc_cert;
                                user['total_expenditure'] = charity.total_expenditure;
                                user['total_fundings'] = charity.total_fundings;
                                user['verified'] = charity.verified;
                                return response.json({
                                    status: true,
                                    account_type: account,
                                    user: user,
                                });
                            }, (err) => {
                                return response.json({
                                    status: false,
                                    message: 'Something went wrong while fetching charity data. ('+err.message+')'
                                });
                            }).catch(err => {
                                return response.json({
                                    status: false,
                                    message: 'Error: Something went wrong while fetching charity data. ('+err.message+')'
                                });
                            })
                        }else if(account == UserRole.DONER) {
                            this.donerRespository.findOne({user: user}).then((doner) => {
                                delete user.charityDetails;
                                delete user.doner;
                                user['dob'] = doner.dob;
                                user['user_id'] = doner.doner_id;
                                user['total_donations'] = doner.total_donations;
                                return response.json({
                                    status: true,
                                    account_type: account,
                                    user: user,
                                });
                            }, (err)=>{
                                return response.json({
                                    status: false,
                                    message: 'Something went wrong while fetching Doner data. ('+err.message+')'
                                });
                            }).catch(err=> {
                                return response.json({
                                    status: false,
                                    message: 'Error: Something went wrong while fetching Doner data. ('+err.message+')'
                                });
                            })
                        }else {
                            delete user.charityDetails;
                            delete user.doner;
                            delete user.meta_wallet_address;
                            delete user.phone1;
                            delete user.phone2;
                            delete user.userRole;
                            return response.json({
                                status: true,
                                account_type: account,
                                user: user,
                            });
                        }
                    }else {
                        console.log('in user profile else')
                        return response.json({
                            status: false,
                            message: 'could not find user!'
                        });
                    }

                }, (err) => {
                    return response.json({
                        status: false,
                        message: 'Error while fetching user profile. ('+err.message+')'
                    });
                }).catch(err => {
                    return response.json({
                        status: false,
                        message: 'something went wrong, try again later. ('+err.message+')'
                    });
                });
            }
        });
    }

    async updateProfile(request: Request, response: Response, next: NextFunction) {
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
            profile_image,
            founded_in,
            total_fundings,
            total_expenditure,
            tax_exc_cert,
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
        jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
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
                this.userRespository.findOne(user['user_id']).then((user) => {
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
                    profile_image = (profile_image)?profile_image:user.profile_image
                    this.userRespository.update(user.user_id, {
                        name: name,
                        email: email,
                        username: username,
                        password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
                        description: description,
                        phone1: phone1,
                        phone2: phone2,
                        meta_wallet_address: meta_wallet_address,
                        profile_image: profile_image
                    }).then((updatedData => {
                        if(account == UserRole.CHARITY) {
                            founded_in = (founded_in)? founded_in:user.charityDetails.founded_in
                            total_fundings = (total_fundings)? total_fundings:user.charityDetails.total_fundings
                            total_expenditure = (total_expenditure)? total_expenditure:user.charityDetails.total_expenditure
                            tax_exc_cert = (tax_exc_cert)? tax_exc_cert:user.charityDetails.tax_exc_cert
                            this.charityRespository.update(user.charityDetails.charity_id, {
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
                                this.userRespository.update(user.user_id, backup_user).then(()=>{
                                    return response.json({
                                        status: false,
                                        message: 'Failed to update profile ('+err.message+')'
                                    });
                                })
                            }).catch((err)=>{
                                this.userRespository.update(user.user_id, backup_user).then(()=>{
                                    return response.json({
                                        status: false,
                                        message: 'Failed to update profile ('+err.message+')'
                                    });
                                })
                            });
                        }else if(account == UserRole.DONER) {
                            this.donerRespository.findOne({user: user}).then((doner)=>{
                                dob = (dob)? dob:doner.dob
                                total_donations = (total_donations)? total_donations:doner.total_donations
                                this.donerRespository.update(doner.doner_id, {
                                    dob: dob,
                                    total_donations: total_donations
                                }).then(() => {
                                    return response.json({
                                        status: true,
                                        message: 'Profile updated'
                                    });
                                }, (err) => {
                                    this.userRespository.update(user.user_id, backup_user).then(()=>{
                                        return response.json({
                                            status: false,
                                            message: 'Failed to update profile ('+err.message+')'
                                        });
                                    })
                                }).catch((err)=>{
                                    this.userRespository.update(user.user_id, backup_user).then(()=>{
                                        return response.json({
                                            status: false,
                                            message: 'Failed to update profile ('+err.message+')'
                                        });
                                    })
                                });  
                            }).catch(err => {
                                this.userRespository.update(user.user_id, backup_user).then(()=>{
                                    return response.json({
                                        status: false,
                                        message: 'Failed to update Doner Profile Attributes ('+err.message+')'
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

    async register(request: Request, response: Response, next: NextFunction) {
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
            profile_image,
            account_type,
            founded_in,
            total_fundings,
            total_expenditure,
            tax_exc_cert,
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
        let user1 = await this.userRespository.findOne({email: email});
        let user2 = await this.userRespository.findOne({username: username});
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
        this.userRespository.save({
            name: name,
            email: email,
            username: username,
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
            description: description,
            phone1: phone1,
            phone2: phone2,
            profile_image: profile_image,
            meta_wallet_address: meta_wallet_address,
            userRole: (account_type == 'charity') ? UserRole.CHARITY : (account_type == 'admin') ? UserRole.ADMIN : UserRole.DONER,
        }).then((user) => {
            if(account_type == 'charity') {
                console.log('[+] registering charity')
                this.charityRespository.save({
                    user: user,
                    founded_in: founded_in,
                    total_fundings: total_fundings,
                    total_expenditure: total_expenditure,
                    tax_exc_cert: tax_exc_cert
                }).then((charity)=>{
                    return response.json({
                        status: true,
                        message: 'Successfully Registered',
                        access_token: this.generateUserAccessToken(user.user_id)
                    })
                }, (err) => {
                        this.userRespository.delete(user.user_id);
                        return response.json({
                            status: false,
                            message: "Error: Couldn't create Charity Account ("+err.message+")"
                        });
                }).catch(err => {
                    this.userRespository.delete(user.user_id);
                    return response.json({
                        status: false,
                        message: "Error: Something Went wrong, try again later ("+err.message+")"
                    });
                })
            }else {
                console.log('[+] registering doner')
                this.donerRespository.save({
                    user: user,
                    dob: dob,
                    total_donations: total_donations
                }).then((doner)=>{
                    return response.json({
                        status: true,
                        message: 'Successfully Registered',
                        access_token: this.generateUserAccessToken(user.user_id)
                    })
                }, (err) => {
                    this.userRespository.delete(user.user_id);
                    return response.json({
                        status: false,
                        message: "Error: Couldn't create Doner Account ("+err.message+")"
                    });
                }).catch(err => {
                    this.userRespository.delete(user.user_id);
                    return response.json({
                        status: false,
                        message: "Error: Something went wrong, try again later ("+err.message+")"
                    });
                })
                return response.json({
                    status: true,
                    message: 'Successfully Registered',
                    access_token: this.generateUserAccessToken(user.user_id)
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

    async login(request: Request, response: Response, next: NextFunction) {
        const {body} = request;
        const {
            password
        } = body;
        let { email } = body;
        if (!password) 
            return {
                status: false,
                message: 'Error: please provide the password'
            };
        if (!email) 
            return {
                status: false,
                message: 'Error: please provide the email'
            };
        email = email.toLowerCase();

        await this.userRespository.findOne({
            email: email
        }).then((user) => {
            if (user) {
                console.log('-----')
                console.log(password)
                console.log(user.password)
                if(bcrypt.compareSync(password, user.password)) {
                    let access_token = this.generateUserAccessToken(user.user_id);
                    return response.json({
                        status: true,
                        message: 'Login Successful',
                        account_type: user.userRole,
                        access_token: access_token
                    });
                }else {
                    return response.json({
                        status: true,
                        message: 'Login Failed (Wrong Password)',
                        access_token: null
                    });
                }
            }else {
                return response.json({
                    status: false,
                    message: 'User not registered!'
                });
            }
        }).catch(err => {
            return response.json({
                status: false,
                message: 'Error: Something went wrong while logging in ('+err.message+')'
            });
        });
    }

    async logout(request: Request, response: Response, next: NextFunction) {
        // jwt verification
        const authHeader = request.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
    
        if (token == null)
            return response.json({
                status: false,
                message: 'access token is missing in request'
            })
        jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
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
                    status: true,
                    message: 'you have already been logged out'
                });
            else {
                this.userRespository.findOne(user['user_id']).then(doner => {
                    if(!user) {
                        return response.json({
                            status: false,
                            message: 'User does not exists!'
                        });
                    }
                });
                if (!blackListedTokens.includes(token))
                    blackListedTokens.push(token);
                return response.json({
                    status: true,
                    message: 'Successfully logged out'
                })
            }
        });
    }

    async remove(request: Request, response: Response, next: NextFunction) {
        
        const authHeader = request.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
    
        if (token == null)
            return response.json({
                status: false,
                message: 'access token is missing in request'
            })
        jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
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
            if (user['ac_type'] !== "doner") {
                return response.json({
                    status: false,
                    message: 'Unauthorized Access'
                });
            }else {
                if (blackListedTokens.includes(token))
                    return response.json({
                        status: false,
                        message: 'you have been logged out, please login again!'
                    });
                else {
                    this.userRespository.findOne(user['user_id']).then((doner) => {
                        this.userRespository.remove(doner).then((res) => {
                            return response.json({
                                status: true,
                                message: 'Account Deleted Successfully'
                            })
                        }).catch((err) => {
                            return response.json({
                                status: false,
                                message: 'Account Could not be deleted! ('+err.message+')'
                            });
                        });
                    });
                }
            }
        });
    }
}
