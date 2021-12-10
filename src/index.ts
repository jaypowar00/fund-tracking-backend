import "reflect-metadata";
import {createConnection} from "typeorm";
import * as express from "express";
import {Request, Response} from "express";
import {Routes} from "./routes";
import * as cors from "cors";
require('dotenv/config');

createConnection().then(async connection => {

    const app = express();
    app.use(express.json());
    
    const PORT = process.env.PORT || 4000

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

    app.use(express.urlencoded({extended: true}));
    app.use(cors());
    
    app.listen(PORT, ()=>console.log('[+] Express server is running at port: '+ PORT));

}).catch(error => console.log(error));
