var express = require('express'); // Web Framework
var app = express();
var bodyParser = require("body-parser");
var sql = require('mssql'); // MS Sql Server client
var cors = require('cors')

const http = require('http');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const mailjet = require ('node-mailjet').connect("c613e638e30ff63f07e1634d16159862", "5fdf4b65c38ec7b580056a3762356822")
const accountSid = 'AC01e136e2ce2a45426237947902e8b1cf';
const authToken = '9a4ae54ba10029d96672e7456775aaf2';
const client = require('twilio')(accountSid, authToken);

let start_queue = [];
let cancel_queue = [];
let password_queue = [];
let start_running;
let cancel_running;
let password_running;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function (request, response, next) {

    // Website you wish to allow to connect
    response.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT');

    // Request headers you wish to allow
    response.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, content-type');
    response.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

// Start server and listen on http://{aws_server}:4604/
var server = app.listen(4605, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("app listening at http://%s:%s", host, port);
});

function check_start(req, res) {
    if (!start_running && start_queue.length > 0) {
        var new_job = start_queue.shift();
        new_job(req, res);
    }
}

function check_cancel(req, res) {
    if (!cancel_running && cancel_queue.length > 0) {
        var new_job = cancel_queue.shift();
        new_job(req, res);
    }
}

function check_password(req, res) {
    if (!password_running && password_queue.length > 0) {
        var new_job = password_queue.shift();
        new_job(req, res);
    }
}

app.post('/startwatch/', function(req, res){
	console.log("In /startwatch/");
	console.log(req.body);
	var eventInfo = req.body[0];
	var contacts = req.body[1];
	var name = req.body[2];
	var enddate = new Date(eventInfo.endTime);
	var timer = new Timer(eventInfo, enddate, contacts, name)
	timerList[timer._eventID] = timer;
	Watch(timer);
	res.end();
});

app.post('/cancelwatch/', function(req,res){
        delete timerList[req.body.eventID];
	console.log("Deleted event: %s", req.body.eventID);
	res.end();
});

let timerList = {};
let GetNewTimerID = (function () {
    var i = 1;
    return function () {
        return i++;
    }
})();

class Timer {
    constructor(eventInfo, endTime, contacts, name) {
        this._timerID = GetNewTimerID();
	this._eventID = eventInfo.eventID;
	console.log("Started: timerID = %s, eventID = %s", this._timerID, this._eventID);
	this._endTime = endTime;
	this._contacts = contacts;
	this._name = name;
	this._Description = eventInfo.eDesc;
	this._Participants = eventInfo.eParts;
	this._StartLat = eventInfo.sLat;
	this._StartLon = eventInfo.sLon;
	this._EndLat = eventInfo.eLat;
	this._EndLon = eventInfo.eLon;
	this._EventName = eventInfo.eventName;
    }
}

async function Watch(timer) {
    let originalTimerID = timer._timerID;
    let endTime = timer._endTime - Date.now();
    console.log(endTime);
    if(endTime > 0)
    {
        setTimeout(AlertContacts, endTime, timer, originalTimerID);
    }
    else
    {
	console.log("time: \"" + endTime + "\" cannot be less than zero");
    }
}

function Delay(endTime) {
    return new Promise(function(resolve) {
	setTimeout(resolve, (endTime - Date.now()));
	});
}

function AlertContacts(timer, originalTimerID){
    console.log("In Alert Contacts.");
    	if(timerList[timer._eventID]) {
	    if(timer._timerID == originalTimerID) {
		let c = timer._contacts;
		for (let i = 0; i < timer._contacts.length; i++) {
		    console.log(c[i].email);
		    if (c[i].email != undefined && c[i].email != null && c[i].email != "")
			SendEmail(c[i].email, c[i].lname, timer._name, timer._Description, timer._Participants, timer._StartLat, timer._StartLon, timer._EndLat, timer._EndLon, timer._EventName, timer._endTime);
		    console.log(c[i].phone);
		    if (c[i].phone != 0 && c[i].phone != undefined && c[i].phone != null)
			SendSMS(c[i].phone, timer._name);
		}
		delete timerList[timer._eventID];
	    }
	}
}
function SendEmail(email, name, usersname, description, participants, slat, slon, elat, elon, ename, endTime)
{
    if(email != null && name != null && usersname != null)
    {
	request = mailjet
        .post("send", {'version': 'v3.1'})
        .request({
                "Messages":[
                        {
                        "From": {
                                "Email": "breadcrumbsjuniorproject2018@gmail.com",
                                "Name": "Emergency Alert"
                        },
                        "To": [
                                { //Contact fields go here
                                        "Email": email,
                                        "Name": name
                                }
                        ], //Email content:
                        "Subject": usersname + "has not checked in from their event.",
                        "TextPart": "Dear " + name + ", " + usersname + " added you as an emergency contact for an event using the Breadcrumbs app. They haven't checked in yet, please make sure they're safe.",
                        "HTMLPart": "<h3>Dear Mr./Mrs. " + name + ", </h3><br />" + usersname + " added you as an emergency contact for an event using the Breadcrumbs app. They haven't checked in yet, please make sure they're safe. <br /> <br /> Here is the information " + usersname + " provided for the event: <br /> Event Name: " + ename + "<br /> Event Description: " + description + "<br /> Event Participants: " + participants + "<br /><a href=\https://www.google.com/maps/search/?api=1&query=" + slat + "," + slon + ">Start Location</a><br /><a href=\https://www.google.com/maps/search/?api=1&query=" + elat + "," + elon + ">End Location</a>"
                        }
                ]
        })
        request
                .then((result) => {
                console.log(result.body)
                })
                .catch((err) => {
                console.log(err.statusCode)
                })
    }
    else
    {
	console.log("Bad input on Email Caller");
    }
}

function SendSMS(phoneNum, usersname){
    if(phoneNum != 0)
    {
	client.messages
	    .create({from: '+15752227862',
		     body: usersname + ' added you as an emergency contact using the Breadcrumbs app. They haven’t checked in yet, please make sure they’re safe. Reply STOP to opt out.',
		     to: phoneNum}).then(message => {
		console.log(message.sid)
	    });
    }
    else
    {
	console.log("Bad input on Email Caller");
    }
}

app.post('/passwordEmail/', function(req, res) {
    password_queue.push(function (req, res) {    
        password_running = true;
	console.log(req.body);
	var email = req.body.email;
	var username = req.body.username._body.toString().replace(/\"/g, "");
	var string = req.body.string._body.toString().replace(/\"/g, "");
        console.log("here1", username);
        console.log("here2",email);
	console.log("here2", string);
	passwordEmail(username, email, string);
        res.end();
	password_running = false;
	check_password(req, res);
    });
    check_password(req, res);
    res.end();
});

function passwordEmail(username, email, randomString)
{
	if(email != null && randomString != null && username != null)
	{
		request = mailjet
		.post("send", {'version': 'v3.1'})
		.request({
			"Messages":[
				{
				"From": {
					"Email": "breadcrumbsjuniorproject2018@gmail.com",
					"Name": "Password Reset Request"
				},
				"To": [
					{
						"Email": email,
						"Name": username
					}
				],
				"Subject": "Forgotten Password",
				"TextPart":"Dear "+  username +",  You have requested a password reset. To reset password : 1. Go to the Breadcrumbs App " + 
					"2. Click the Forgot Password button" +
					"3. Click Got a Code Button" +
					"4. Enter in this code : " + randomString + 
					"5. Enter in new passwords, and click submit",
				"HTMLPart": "<h3>Dear "+ username +", </h3>" +
					"<p>You have requested a password reset.</p>"+
					"<p>To reset password : <br />" +
					"1. Go to the Breadcrumbs App <br />"+ 
					"2. Click the Forgot Password button<br /> "+
					"3. Click Got a Code Button<br /> "+
					"4. Enter in this code :  <strong>" + randomString +"</strong> <br />" +
					"5. Enter in new passwords, and click submit</p>",
				}
				]
				})
				request
					.then((result) => { console.log(result.body)
					})
					.catch((err) => { console.log(err.statusCode)
					})
				
	}
	else
	{
		console.log("Bad Input on Email Caller");
	}
}
