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


async function start_watch(req, res) {
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
}

async function cancel_watch(req, res) {
    delete timerList[req.body.eventID];
    console.log("Deleted event: %s", req.body.eventID);
    //cancel_running = false;
    //await cancel_update(req, res);
    res.end();
}

async function password_email(req, res) {
    console.log(req.body);
    var email = req.body.email;
    var username = req.body.username._body.toString().replace(/\"/g, "");
    var string = req.body.string._body.toString().replace(/\"/g, "");
    await passwordEmail(username, email, string);
    res.end();
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

async function AlertContacts(timer, originalTimerID){
    console.log("In Alert Contacts.");
    console.log(timerList[timer._eventID]);
    if(timerList[timer._eventID]) {
	console.log("1 ", timer._eventID);
	if(timer._timerID == originalTimerID) {
	    console.log("2 ", timer._timerID);	    
	    let c = timer._contacts;
	    console.log("3 ", c);
	    console.log("3 ", timer._contacts.length);
		for (let i = 0; i < timer._contacts.length; i++) {
		    console.log(c[i].email);
		    if (c[i].email != undefined && c[i].email != null && c[i].email != "")
			await SendEmail(c[i].email, c[i].lname, timer._name, timer._Description, timer._Participants, timer._StartLat, timer._StartLon, timer._EndLat, timer._EndLon, timer._EventName, timer._endTime);
		    console.log(c[i].phone);
		    if (c[i].phone != 0 && c[i].phone != undefined && c[i].phone != null)
			await SendSMS(c[i].phone, timer._name);
		}
		delete timerList[timer._eventID];
	    }
	}
}

async function SendEmail(email, name, usersname, description, participants, slat, slon, elat, elon, ename, endTime)
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

async function SendSMS(phoneNum, usersname){
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

async function passwordEmail(username, email, randomString)
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

app.post('/passwordEmail/', function(req, res) {
    password_email(req, res);
});

app.post('/startwatch/', (req, res) => {
    console.log('in start watch');
    start_watch(req, res);
});

app.post('/cancelwatch/', (req,res) => {
    console.log('in cancel watch');
    cancel_watch(req, res);
});

let timerList = {};

let GetNewTimerID = (function () {
    var i = 1;
    return function () {
        return i++;
    }
})();

class Timer {
    constructor(event_data, end_time, contacts, creator_name) {
        this._timerID = GetNewTimerID();
	this._eventID = event_data.eventID;
	console.log("Started: timerID = %s, eventID = %s", this._timerID, this._eventID);
	this._endTime = end_time;
	this._contacts = contacts;
	this._name = creator_name;
	this._Description = event_data.eDesc;
	this._Participants = event_data.eParts;
	this._StartLat = event_data.sLat;
	this._StartLon = event_data.sLon;
	this._EndLat = event_data.eLat;
	this._EndLon = event_data.eLon;
	this._EventName = event_data.eventName;
    }
}

