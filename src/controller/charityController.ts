import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Charity } from "../entity/Charity";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

let blackListedTokens = [];

export class charityController {

    private charityRespository = getRepository(Charity);

    private generateCharityAccessToken(charity_id) {
        let access_token = jwt.sign({charity_id: charity_id, ac_type: 'charity'}, process.env.FTSECRET_KEY, { expiresIn: '1d' });
        console.log('[+] accessToken('+charity_id+'): '+ access_token);
        if (blackListedTokens.includes(access_token))
            blackListedTokens.splice(blackListedTokens.indexOf(access_token), 1);
        return access_token;
    }

    async all(request: Request, response: Response, next: NextFunction) {
        let charities = (await this.charityRespository.find()).copyWithin(-1,-1);
        charities.forEach((charity, index) => {
            delete charity.password
        });
        return {
            status: true,
            doners: charities
        }
    }

    async one(request: Request, response: Response, next: NextFunction) {
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
            if (user.ac_type !== "charity") {
                return response.json({
                    status: false,
                    message: 'Unauthorized Access'
                });
            }else {
                if (blackListedTokens.includes(token))
                    return response.json({
                        status: false,
                        message: 'you have been logged out, please login again'
                    })
                else {
                    let charityData;
                    this.charityRespository.findOne(user.charity_id).then(charity => {
                        charityData = charity
                        delete charityData['password'];
                        return response.json({
                            status: true,
                            charity: charityData
                        });
                    });
                }
            }
        });
    }

    async register(request: Request, response: Response, next: NextFunction) {
        const {body} = request;
        const {
            name,
            username,
            password,
            founded_in,
            phone1,
            phone2,
            meta_wallet_address,
            total_fundings,
            total_expenditure
        } = body;
        let {email} = body;
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
        if(!founded_in) {
            return response.json({
                status: false,
                message: 'Error: Founded Time can not be blank'
            });
        }
        if(!phone1) {
            return response.json({
                status: false,
                message: 'Error: phone number can not be blank'
            });
        }
        email = email.toLowerCase();
        let charity1 = await this.charityRespository.findOne({email: email});
        let charity2 = await this.charityRespository.findOne({username: username});
        if(charity1)
            return {
                status: false,
                message: 'email already taken'
            };
        if(charity2)
            return {
                status: false,
                message: 'username already taken'
            };
        this.charityRespository.save({
            name: name,
            email: email,
            username: username,
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
            founded_in: founded_in,
            phone1: phone1,
            phone2: phone2,
            meta_wallet_address: meta_wallet_address,
            total_fundings: total_fundings,
            total_expenditure: total_expenditure,
            verified: false,
        }).then((charity) => {
            return response.json({
                status: true,
                message: 'Successfully Registered'
            })
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

        await this.charityRespository.findOne({
            email: email
        }).then((charity) => {
            if (charity) {
                if(bcrypt.compareSync(password, charity.password)) {
                    let access_token = this.generateCharityAccessToken(charity.charity_id);
                    return response.json({
                        status: true,
                        message: 'Login Successful',
                        access_token: access_token
                    });
                }else {
                    return response.json({
                        status: false,
                        message: 'Invalid Password'
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
            if (user.ac_type !== "charity") {
                return response.json({
                    status: false,
                    message: 'Unauthorized Access'
                });
            }else {
                if (blackListedTokens.includes(token))
                    return response.json({
                        status: true,
                        message: 'you have already been logged out'
                    });
                else {
                    let charityData;
                    this.charityRespository.findOne(user.charity_id).then(charity => {charityData = charity});
                    if (!blackListedTokens.includes(token))
                        blackListedTokens.push(token);
                    return response.json({
                        status: true,
                        message: 'Successfully logged out'
                    })
                }
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
            if (blackListedTokens.includes(token))
                return response.json({
                    status: false,
                    message: 'you have been logged out, please login again!'
                });
            else {
                this.charityRespository.findOne(user.charity_id).then((charity) => {
                    this.charityRespository.remove(charity).then((res) => {
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
        });
    }
}