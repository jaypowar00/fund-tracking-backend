const express = require('express');
const router = express.Router();
const cors = require('cors');
const db = require('../queries');

router.get('', cors(), (request, response) => {
    db.query('SELECT * FROM doneruser;', (error, results) => {
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
            return response.json({
                status: true,
                doners:results.rows,
                message: null,
            });
        }
    });
});

module.exports = router;
