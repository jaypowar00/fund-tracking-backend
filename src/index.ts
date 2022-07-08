import "reflect-metadata";
import {createConnection} from "typeorm";
// import * as express from "express";
import express = require("express");
import {Request, Response} from "express";
import {Routes} from "./routes";
import cors = require("cors");
import { uploadRouter } from "./image_route";
require('dotenv/config');


createConnection().then(async connection => {
    
    const envDomains = process.env.FT_CORS_DOMAINS || "";
    const whitelist = envDomains.split(",").map(item => item.trim());
    const corsOptions = {
        origin: function (origin, callback) {
            if (!origin || whitelist.indexOf(origin) !== -1) {
                callback(null, true)
            } else {
                callback(new Error("Not allowed by CORS"))
            }
        },
        credentials: true,
    }
    
    const app = express();
    app.use(express.json({ limit: '50mb' }));
    app.use(cors(corsOptions))
    const PORT = process.env.PORT || 4000;
    app.use(express.urlencoded({extended: true}));
    
    Routes.forEach(route => {
        (app as any)[route.method](route.route, (req: Request, res: Response, next: Function) => {
            const result = (new (route.controller as any))[route.action](req, res, next);
            if (result instanceof Promise) {
                result.then(result => result !== null && result !== undefined ? res.send(result): undefined);
            }else if (result !== null && result !== undefined) {
                res.json(result);
            }
        });
    });
    
    app.use('/user', uploadRouter);
    
    app.listen(PORT, ()=>console.log('[+] Express server is running at port: '+ PORT));

}, (err) => {
    console.log(err)
}).catch(error => console.log(error));
