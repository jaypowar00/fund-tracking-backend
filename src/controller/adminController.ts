import { getRepository } from "typeorm";
import { NextFunction, Request, Response } from "express";
import { User, CharityDetails, Doners, UserRole } from "../entity/User";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";
var userControl = require("./userController");

let blackListedTokens = [];

export class adminController {

    private userRespository = getRepository(User);
    private donerRespository = getRepository(Doners);
    private charityRespository = getRepository(CharityDetails);

    async newCharities(request: Request, response: Response, next: NextFunction) {
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
                    status: false,
                    message: 'you are not logged in, please login and try again later'
                });
            else {
                this.userRespository.findOne(user.user_id).then(user => {
                    if(!user) {
                        return response.json({
                            status: false,
                            message: 'User does not exists!'
                        });
                    }
                });
                this.userRespository.find({where: {userRole: UserRole.CHARITY, charityDetails: { verified: false }}, relations: ["charityDetails"]}).then(users => {
                    let t_users = []
                    users.forEach((user, index) => {
                        let t_user = {};
                        t_user['name'] = user.name;
                        t_user['username'] = user.username;
                        t_user['user_id'] = user.user_id;
                        t_user['requested_time'] = user.joined_time;
                        t_user['public_id'] = user.public_id;
                        t_users.push(t_user);
                    });
                    return response.json({
                        status: true,
                        message: null,
                        charities: t_users
                    })
                })
            }
        });
    }
    
}
