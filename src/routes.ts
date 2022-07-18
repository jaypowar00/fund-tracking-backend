import { donerController } from './controller/donerController';
import { userController } from './controller/userController';
import { adminController } from './controller/adminController';

export const Routes = [
    // Common Routes
    {
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
    },
    // {
    //     method: "put",
    //     route: "/user/profile",
    //     controller: userController,
    //     action: "updateProfile"
    // },
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
    }, {
        method: "get",
        route: "/charity/id/:id",
        controller: userController,
        action: "getCharityById"
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
            route: "/charity/profile/expenses",
            controller: userController,
            action: "getCharityExpenses"
        },
        {
            method: "get",
            route: "/charity/profile/donations",
            controller: userController,
            action: "getCharityDonations",
        },
        {
            method: "post",
            route: "/user/upload/profile_image",
            controller: userController,
            action: "uploadProfileImage"
        },
        // {
        //     method: "post",
        //     route: "",
        //     controller: userController,
        //     action: "uploadCharityFiles"
        // },
        // Charity reason upload getway
        {
            method: "post",
            route: "/user/upload/reason_proof",
            controller: userController,
            action: "uploadReasonProof"
        },
        {
            method: "get",
            route: "/doner/donations",
            controller: donerController,
            action: "getUserDonations"
        },
        {
            method: "get",
            route: "/donations/details/:id",
            controller: donerController,
            action: "getDonationDetails"
        },
];