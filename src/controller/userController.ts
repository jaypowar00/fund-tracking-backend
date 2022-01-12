import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
// import { Doners } from "../entity/Doners";
// import { Charity } from "../entity/Charity";
import { User, CharityDetails, Doners, UserRole } from "../entity/User";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

let blackListedTokens = [];

export class userController {

    private userRespository = getRepository(User);
    private donerRespository = getRepository(Doners);
    private charityRespository = getRepository(CharityDetails);

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
        let charities = (await this.userRespository.find({relations: ['charityDetails']}));
        charities.forEach((charity, index) => {
            delete charity.password
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

    // async one(request: Request, response: Response, next: NextFunction) {
    //     // jwt verification
    //     const authHeader = request.headers['authorization']
    //     const token = authHeader && authHeader.split(' ')[1]
    
    //     if (token == null)
    //         return response.json({
    //             status: false,
    //             message: 'access token is missing in request'
    //         });
    //     jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
    //         if(err) {
    //             console.log('[+] err:\n');
    //             console.log(err.name);
    //             if (blackListedTokens.includes(token))
    //                 blackListedTokens.splice(blackListedTokens.indexOf(token), 1);
    //             return response.json({
    //                 status: false,
    //                 message: err.message
    //             })
    //         }
    //         if (user.ac_type !== "doner") {
    //             return response.json({
    //                 status: false,
    //                 message: 'Unauthorized Access'
    //             });
    //         }else {
    //             if (blackListedTokens.includes(token))
    //                 return response.json({
    //                     status: false,
    //                     message: 'you have been logged out, please login again'
    //                 })
    //             else {
    //                 let donerData;
    //                 this.donerRespository.findOne(user.doner_id).then(doner => {
    //                     donerData = doner
    //                     delete donerData['password'];
    //                     return response.json({
    //                         status: true,
    //                         doner: donerData
    //                     });
    //                 });
    //             }
    //         }
    //     });
    // }

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
            // dob: dob,
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
                        return response.json({
                            status: false,
                            message: "Error: Couldn't create Charity Account ("+err.message+")"
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
                        return response.json({
                            status: false,
                            message: "Error: Couldn't create Doner Account ("+err.message+")"
                        });
                })
                return response.json({
                    status: true,
                    message: 'Successfully Registered',
                    access_token: this.generateUserAccessToken(user.user_id)
                })
            }
        }).catch((err) => {
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
                if(bcrypt.compareSync(password, user.password)) {
                    let access_token = this.generateUserAccessToken(user.user_id);
                    return response.json({
                        status: true,
                        message: 'Login Successful',
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
                this.donerRespository.findOne(user.doner_id).then(doner => {
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
            if (user.ac_type !== "doner") {
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
                    this.donerRespository.findOne(user.doner_id).then((doner) => {
                        this.donerRespository.remove(doner).then((res) => {
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

exports.blackListedTokens = blackListedTokens;
