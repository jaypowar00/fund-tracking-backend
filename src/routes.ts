import { donerController } from './controller/donerController';
import { userController } from './controller/userController';
import { adminController } from './controller/adminController';

export const Routes = [
    // Common Routes
    {
        method: "post",
        route: "/user/register",
        controller: userController,
        action: "register"
    },{
        method: "post",
        route: "/user/login",
        controller: userController,
        action: "login"
    },{
        method: "post",
        route: "/user/logout",
        controller: userController,
        action: "logout"
    },{
        method: "get",
        route: "/user/profile",
        controller: userController,
        action: "getProfile"
    },{
        method: "put",
        route: "/user/profile",
        controller: userController,
        action: "updateProfile"
    },
    //Admin Routes
    {
        method: "get",
        route: "/admin/charities",
        controller: adminController,
        action: "newCharities"
    }, {
        method: "post",
        route: "/admin/charity/verify",
        controller: adminController,
        action: "responseToCharity"
    },
    // Donor+Charity
    {
        method: "get",
        route: "/doners",
        controller: donerController,
        action: "all"
    }, {
        method: "get",
        route: "/charity",
        controller: userController,
        action: "getAllCharity"
    }, {
        method: "get",
        route: "/charity/:username",
        controller: userController,
        action: "getOneCharity"
    },
    // {
    //     method: "get",
    //     route: "/doners/profile",
    //     controller: donerController,
    //     action: "one"
    // }, {
    //     method: "post",
    //     route: "/doners/register",
    //     controller: donerController,
    //     action: "register"
    // }, {
    //     method: "post",
    //     route: "/doners/login",
    //     controller: donerController,
    //     action: "login"
    // }, {
    //     method: "post",
    //     route: "/doners/logout",
    //     controller: donerController,
    //     action: "logout"
    // }, {
    //     method: "delete",
    //     route: "/doner/delete",
    //     controller: donerController,
    //     action: "remove"
    // },
        {
            method: "get",
            route: "/charity/expenses",
            controller: userController,
            action: "getCharityExpenses"
        },
];