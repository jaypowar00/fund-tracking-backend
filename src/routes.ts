import { donerController } from './controller/donerController';

export const Routes = [{
        method: "get",
        route: "/doners",
        controller: donerController,
        action: "all"
    }, {
        method: "get",
        route: "/doners/profile",
        controller: donerController,
        action: "one"
    }, {
        method: "post",
        route: "/doners/register",
        controller: donerController,
        action: "register"
    }, {
        method: "post",
        route: "/doners/login",
        controller: donerController,
        action: "login"
    }, {
        method: "post",
        route: "/doners/logout",
        controller: donerController,
        action: "logout"
    }, {
        method: "delete",
        route: "/doner/delete/:id",
        controller: donerController,
        action: "remove"
    }
];