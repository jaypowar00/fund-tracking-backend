import { charityController } from './controller/charityController';
import { donerController } from './controller/donerController';

export const Routes = [
    // Donor Routes
    {
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
        route: "/doner/delete",
        controller: donerController,
        action: "remove"
    },

    // Charity Routes
    {
        method: "get",
        route: "/charity",
        controller: charityController,
        action: "all"
    }, {
        method: "get",
        route: "/charity/profile",
        controller: charityController,
        action: "one"
    }, {
        method: "post",
        route: "/charity/register",
        controller: charityController,
        action: "register"
    }, {
        method: "post",
        route: "/charity/login",
        controller: charityController,
        action: "login"
    }, {
        method: "post",
        route: "/charity/logout",
        controller: charityController,
        action: "logout"
    }, {
        method: "delete",
        route: "/charity/delete",
        controller: charityController,
        action: "remove"
    }
];