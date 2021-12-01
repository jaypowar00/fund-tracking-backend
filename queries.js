require('dotenv/config');
const Pool = require('pg').Pool
const pool = new Pool({
    user: process.env.FTDB_USER || 'postgres',
    host: process.env.FTDB_HOST || 'localhost',
    database: process.env.FTDB_DATABASE || 'fundtracking',
    password: process.env.FTDB_PASSWORD || 'super',
    port: process.env.FTDB_PORT || 5432,
    ssl: {
        rejectUnauthorized: false
    }
});
    // query usage example using pool:
    // pool.query('SELECT * FROM Dummy;', (error, results) => {
    //     if(error) {
    //         console.log(error.message);
    //     }else {
    //         console.log(results.rows);
    //     }
    // });

module.exports = pool;
