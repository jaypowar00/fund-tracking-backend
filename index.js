const express = require('express');
const cors = require('cors');
const db = require('./queries');
const donerController = require('./controller/donerController');
require('dotenv/config');

const PORT = process.env.PORT || 4000

const app = express();
app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use(cors());

app.get('/', (request, response)=>{
    response.json({info: 'This is nodejs express server (go to /doners)'});
});

app.use('/doners', donerController);

app.listen(PORT, ()=>console.log('[+] Express server is running at port: '+ PORT));
