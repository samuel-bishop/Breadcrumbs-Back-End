var express = require('express'); // Web Framework
var httpProxy = require('http-proxy');
var proxy = httpProxy.createProxyServer();
var https = require('https');
var app = express();
var bodyParser = require("body-parser");
var sql = require('mssql'); // MS Sql Server client
var cors = require('cors')
var passwordHash = require('password-hash');
var file = require('fs');
var bcrypt = require('bcrypt');
var fs = require("fs");
var worker = require('worker_threads');

const process = require('child_process');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use( function  (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// Connection string parameters.
var config = {
    user: 'bcadmin',
    password: 'bcjp2018!?',
    server: 'breadcrumbs-db.cstdyx8knb63.us-west-2.rds.amazonaws.com',
    host: '1433',
    database: 'BreadcrumbsDB'
};

// Start server and listen on http://{aws_server}:4604/
app.listen('4600', function () {
    console.log('Server started at port 4600');
});

app.get('/getData/', function (req, res) {
    let new_process = process.fork('./get_data.js');
    let args = { req: req, res: res};
    //new_process.stdin(args)
});

app.post('/updateData/', function (req, res) {
    let new_process = process.forc('./update_data.js');

    new_process.send('message', req, res);
});

