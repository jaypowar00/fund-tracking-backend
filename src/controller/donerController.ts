import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Doners } from "../entity/Doners";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

let blackListedTokens = [];

export class donerController {

    private donerRespository = getRepository(Doners);

    private generateDonerAccessToken(doner_id) {
        let access_token = jwt.sign({doner_id: doner_id}, process.env.FTSECRET_KEY, { expiresIn: '3d' });
        console.log('[+] accessToken('+doner_id+'): '+ access_token);
        if (blackListedTokens.includes(access_token))
            blackListedTokens.splice(blackListedTokens.indexOf(access_token), 1);
        return access_token;
    }
    
    private authenticateDoner(req) {
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
                user: user.doner_id
            };
            console.log(res);
            console.log('lol');
            return new Promise(resolve => {
                resolve(res);
              });
        });
    }

    async all(request: Request, response: Response, next: NextFunction) {
        let doners = (await this.donerRespository.find()).copyWithin(-1,-1);
        doners.forEach((doner, index) => {
            delete doner.password
        });
        return {
            status: true,
            doners: doners
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
            if (blackListedTokens.includes(token))
                return response.json({
                    status: false,
                    message: 'you have been logged out, please login again'
                })
            else {
                let donerData;
                this.donerRespository.findOne(user.doner_id).then(doner => {
                    donerData = doner
                    delete donerData['password'];
                    return response.json({
                        status: true,
                        doner: donerData
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
            phone1,
            phone2,
            meta_wallet_address
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
        if(!dob) {
            return response.json({
                status: false,
                message: 'Error: DOB can not be blank'
            });
        }
        if(!phone1) {
            return response.json({
                status: false,
                message: 'Error: phone number can not be blank'
            });
        }
        email = email.toLowerCase();
        let doner1 = await this.donerRespository.findOne({email: email});
        let doner2 = await this.donerRespository.findOne({username: username});
        if(doner1)
            return {
                status: false,
                message: 'email already taken'
            };
        if(doner2)
            return {
                status: false,
                message: 'username already taken'
            };
        this.donerRespository.save({
            name: name,
            email: email,
            username: username,
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
            dob: dob,
            phone1: phone1,
            phone2: phone2,
            meta_wallet_address: meta_wallet_address
        }).then((doner) => {
            return {
                status: true,
                message: 'Successfully Registered'
            }
        }).catch((err) => {
            return {
                status: false,
                message: 'Error: Registration Failed! ('+err.message+')'
            }
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

        await this.donerRespository.findOne({
            email: email
        }).then((doner) => {
            if (doner) {
                if(bcrypt.compareSync(password, doner.password)) {
                    let access_token = this.generateDonerAccessToken(doner.doner_id);
                    return response.json({
                        status: true,
                        message: 'Login Successful',
                        access_token: access_token
                    });
                }else {
                    return response.json({
                        status: true,
                        message: 'Login Successful',
                        access_token: ''
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
                let donerData;
                this.donerRespository.findOne(user.doner_id).then(doner => {donerData = doner});
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
        let donerToRemove = await this.donerRespository.findOne(request.params.id);
        await this.donerRespository.remove(donerToRemove);
    }
}