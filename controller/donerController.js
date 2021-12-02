const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = require('../queries');
const bcrypt = require('bcrypt');

router.post('/register', cors(), (req, res) => {
    const {body} = req;
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
    if(!name) {
        return res.json({
            status: false,
            message: 'Error: name can not be blank'
        });
    }
    if(!username) {
        return res.json({
            status: false,
            message: 'Error: username can not be blank'
        });
    }
    if(!password) {
        return res.json({
            status: false,
            message: 'Error: password can not be blank'
        });
    }
    if(!dob) {
        return res.json({
            status: false,
            message: 'Error: DOB can not be blank'
        });
    }
    if(!phone1) {
        return res.json({
            status: false,
            message: 'Error: phone number can not be blank'
        });
    }
    email = email.toLowerCase();
    db.query("SELECT * FROM check_duplicate_doner_user('"+email+"', '"+username+"');", (error, results) => {
        if(error)
            return res.json({
                status: false,
                message: 'Error: Something went wrong! ('+error.message+')'
            });
        else {
            if(results.rows[0]['email_exists'] && results.rows[0]['username_exists'])
                return res.json({
                    status: false,
                    message: 'both email and username are already used by another user, please try again with new ones!'
                });
            else if(results.rows[0]['email_exists'])
                return res.json({
                    status: false,
                    message: 'this email is already used by another user, please try again with new one!'
                });
            else if(results.rows[0]['username_exists'])
                return res.json({
                    status: false,
                    message: 'this username is already used by another user, please try again with new one!'
                });
        }
        let hashed_password = bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
        db.query("SELECT * FROM register_new_doner_user('"+email+"', '"+name+"', '"+username+"', '"+hashed_password+"', '"+dob+"', '"+phone1+"', '"+phone2+"', '"+meta_wallet_address+"');", (error, results) => {
            if(error)
                res.json({
                    status: false,
                    message: 'Error: Something went wrong while creating Doner Account! ('+error.message+')'
                });
            else {
                if(results.rows[0]['account_created'])
                    return res.json({
                        status: true,
                        message: 'new Doner Account has successfully created.'
                    });
                else
                    return res.json({
                        status: false,
                        message: 'Failed to create a new Doner Account'
                    });
            }
        });
    });
});

router.get('/', cors(), (request, response) => {
    db.query('SELECT * FROM Doners;', (error, results) => {
        if(error) {
            console.log('[+] error');
            console.log(error.message);
            return response.json({
                status: false,
                doners: null,
                message: error.message,
            });
        }else {
            console.log('[+] success');
            console.log(results.rows);
            console.log(bcrypt.hashSync("pass123", bcrypt.genSaltSync(8), null));
            return response.json({
                status: true,
                doners:results.rows,
                message: null,
            });
        }
    });
});

module.exports = router;
