const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = require('../queries');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

var blackListedTokens = []

function generateDonerAccessToken(doner_id) {
    let access_token = jwt.sign({doner_id: doner_id}, process.env.FTSECRET_KEY, { expiresIn: '3d' });
    console.log('accessToken: '+ access_token);
    if (blackListedTokens.includes(access_token))
        blackListedTokens.pop(blackListedTokens.indexOf(access_token));
    return access_token;
}

function authenticateDoner(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (token == null)
        return res.json({
            status: false,
            message: 'access token is missing in request'
        });
        jwt.verify(token, process.env.FTSECRET_KEY, (err, user) => {
            if(err) {
                console.log('err:\n');
                console.log(err.name);
                if (blackListedTokens.includes(token))
                    blackListedTokens.pop(blackListedTokens.indexOf(token));
                return res.json({
                    status: false,
                    message: err.message
                });
            }
            if (blackListedTokens.includes(token))
                return res.json({
                    status: false,
                    message: 'you have been logged out, please login again'
                });
        req.user = user.doner_id
        next()
    });
}

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

router.post('/login', cors(), (req, res) => {
    const { body } = req;
    const {
        password
    } = body;
    let { email } = body;
    if (!password) 
        return res.json({
            status: false,
            message: 'Error: please provide the password'
        });
    if (!email) 
        return res.json({
            status: false,
            message: 'Error: please provide the email'
        });
    email = email.toLowerCase();
    
    db.query("SELECT doner_id, password FROM Doners WHERE email = '"+email+"';", (error, results) => {
        if(error)
            return res.json({
                status: false,
                message: 'Error: Something went wrong while logging in the user... ('+error.message+')'
            });
        if (results.rows.length == 0)
            return res.json({
                status: false,
                message: 'User does not exists!',
                user_id: null
            });
        console.log("log::");
        console.log(results.rows);
        console.log(email);
        if (bcrypt.compareSync(password, results.rows[0]['password'])) {
            return res.json({
                status: true,
                message: 'Login successful',
                user_id: results.rows[0]['doner_id'],
                access_token: generateDonerAccessToken(results.rows[0]['doner_id'])
            });
        }else {
            return res.json({
                status: false,
                message: 'Password Failed',
                user_id: null
            });
        }
    });
});

router.get('/profile', cors(), authenticateDoner, (req, res) => {
    db.query('SELECT name, email, username FROM Doners WHERE doner_id='+req.user+';', (error, result) => {
        if (error)
            return res.json({
                status: false,
                message: 'Error: something went wrong ('+error.message+')'
            });
        return res.json({
            status: true,
            message: 'doner profile',
            doner_id: req.user,
            name: result.rows[0]['name'],
            username: result.rows[0]['username'],
            email: result.rows[0]['email'],
        });
    });
});

router.post('/logout', cors(), authenticateDoner, (req, res) => {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!blackListedTokens.includes(token))
        blackListedTokens.push(token)
    return res.json({
        status: true,
        message: 'Successfully logged out'
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
            return response.json({
                status: true,
                doners: results.rows,
                message: null,
            });
        }
    });
});

module.exports = router;
