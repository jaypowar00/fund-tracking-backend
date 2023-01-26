import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { Doners, User, UserRole } from "../entity/User";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
import Web3 from "web3";
const controller = require("../abi/fundEth.json");

let blackListedTokens = [];

export class donerController {

    private userRespository = getRepository(User);

    private generateDonerAccessToken(user_id) {
        let access_token = jwt.sign({doner_id: user_id, ac_type: 'doner'}, process.env.FTSECRET_KEY, { expiresIn: '1d' });
        console.log('[+] accessToken('+user_id+'): '+ access_token);
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
        let doners = (await this.userRespository.find({userRole: UserRole.DONER})).copyWithin(-1,-1);
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
            if (user['ac_type'] !== "doner") {
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
                    let donerData;
                    this.userRespository.findOne(user['doner_id']).then(doner => {
                        donerData = doner
                        delete donerData['password'];
                        return response.json({
                            status: true,
                            doner: donerData
                        });
                    });
                }
            }
        });
    }

    async getUserDonations(request: Request, response: Response, next: NextFunction) {
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
            let user2 = await this.userRespository.findOne(user['user_id'])
            if (!user2 || user2.userRole !== UserRole.DONER) {
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
                    this.userRespository.findOne(user['user_id']).then(async(user) => {
                        try{
                            let web3 = new Web3(process.env.INFURA_API_KEY);
                            let networkId = await web3.eth.net.getId();
                            const fundEthData = controller.networks[networkId];
                            let contract = new web3.eth.Contract(controller.abi, fundEthData.address);
                            contract.methods.getDonationsOf(user.meta_wallet_address).call().then(res => {
                                let donations = [];
                                res.map(value => {
                                    donations.push({
                                        donation_id: value["donation_id"],
                                        from_address: value["from_address"],
                                        to_address: value["to_address"],
                                        eth_in_wei: value["eth_in_wei"],
                                        date: value["date"],
                                        anonymous_state: value["anonymous_state"],
                                        doner: value["doner"],
                                        donerId: value["donerId"],
                                        charity: value["charity"],
                                        charityId: value["charityId"],
                                        donated: value["donated"],
                                    });
                                    return null;
                                });
                                donations.reverse();
                                return response.json({
                                    status: true,
                                    donations: donations
                                });
                            }).catch(err => {
                                return response.json({
                                    status: false,
                                    message: 'Something went wrong ('+err.message+')'
                                });
                            })
                        }catch(err) {
                            console.log(err)
                            return response.json({
                                status: false,
                                message: 'something went wront ('+err.message+')'
                            });
                        }
                    }).catch(err => {
                        return response.json({
                            status: false,
                            message: 'Something went wrong ('+err.message+')'
                        });
                    });
                }
            }
        });
    }
    async getDonationDetails(request: Request, response: Response, next: NextFunction) {
        const { id } = request.params;
        if(!id)
            return response.json({
                status: false,
                message: 'url parameter missing!'
            });
        try{

            let web3 = new Web3(process.env.INFURA_API_KEY);
            let networkId = await web3.eth.net.getId();
            const fundEthData = controller.networks[networkId];
            let contract = new web3.eth.Contract(controller.abi, fundEthData.address);
            contract.methods.getDonationByID(id).call().then(value => {
                let data = {
                donation_id: value["donation_id"],
                from_address: value["from_address"],
                to_address: value["to_address"],
                eth_in_wei: value["eth_in_wei"],
                date: value["date"],
                anonymous_state: value["anonymous_state"],
                doner: value["doner"],
                donerId: value["donerId"],
                charity: value["charity"],
                charityId: value["charityId"],
                donated: value["donated"]
            };
            return response.json({
                status: true,
                donation: data,
                message: 'success'
            });
        });
    }catch(err) {
        console.log(err)
        return response.json({
            status: false,
            message: 'something went wrong ('+err.message+')'
        });
    }
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
            meta_wallet_address,
            profile_image
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
        let doner1 = await this.userRespository.findOne({email: email});
        let doner2 = await this.userRespository.findOne({username: username});
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
        this.userRespository.save({
            name: name,
            email: email,
            username: username,
            password: bcrypt.hashSync(password, bcrypt.genSaltSync(8), null),
            dob: dob,
            phone1: phone1,
            phone2: phone2,
            profile_image: profile_image,
            meta_wallet_address: meta_wallet_address
        }).then((doner) => {
            return response.json({
                status: true,
                message: 'Successfully Registered',
                access_token: this.generateDonerAccessToken(doner.user_id)
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

        await this.userRespository.findOne({
            email: email
        }).then((doner) => {
            if (doner) {
                if(bcrypt.compareSync(password, doner.password)) {
                    let access_token = this.generateDonerAccessToken(doner.user_id);
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
            if (user['ac_type'] !== "doner") {
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
                    let donerData;
                    this.userRespository.findOne(user['doner_id']).then(doner => {donerData = doner});
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
                    this.userRespository.findOne(user['doner_id']).then((doner) => {
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
