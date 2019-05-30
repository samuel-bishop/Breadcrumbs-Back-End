var express = require('express'); // Web Framework
var https = require('https');
var app = express();
var bodyParser = require("body-parser");
var sql = require('mssql'); // MS Sql Server client
var cors = require('cors')
var passwordHash = require('password-hash');
var file = require('fs');
var bcrypt = require('bcrypt');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(function (req, res, next) {
    
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
var server = app.listen(4604, function () {
    var host = server.address().address;
    var port = server.address().port;
    console.log("app listening at http://%s:%s", host, port);
});


//https.createServer(app).listen(3000);

function Log(message, path) {
    var date = new Date();
    var utcdate = date.toUTCString();
    file.appendFile(path, utcdate + ': ' + message + '\n', function(err)
		   { if (err)
		     console.log('WriteFileErr: ' + err);
		   });
}

app.get('/getData/', function (req, res) {
    var auth = req.header('AuthToken');
    var sesh = req.header('SessionID');
    if (auth != undefined || auth != null || auth != '')
	var path = `logs/log${auth}.txt`;
    else var path = `logs/default.txt`;
    console.log('LogPath: ' + path);
    Log('SessionID: ' + sesh, path);
    //Log('Auth: ' + auth); 

    if (sesh == 'confirmuser') {
	validate_user(req, res, path);
    }
    else if (sesh == 'getuserid') {
	get_user_id(req, res, path);
    }
    else if (sesh == 'getauth') {
	get_auth(req, res, path);
    }
    else {
    //auth = true; //remove for prod
    verify_auth(auth, path, function(verify) {
        Log('Verified?: ' + verify, path);	
	if (verify == false ||  verify == 0 ||
	    verify == undefined || auth == undefined) {
	    //console.log('invalid auth');
	    res.end('invalid auth');
	}
	else {
	//auth = verify_auth(auth);
	    if (auth == null) {
		//console.log('invalid auth2');
		res.end('invalid auth');		
	      }
	    else {
		switch(sesh) {
		case 'getcontacts':
		    get_contacts(req, res, path);
		    break;
		case 'geteventcontacts':
		    get_event_contacts(req, res, path);
		    break;
		case 'getinactiveevents':
		    get_inactive_events(req, res, path);
		    break;
		case 'getlastinactiveevent':
		    get_last_inactive_event(req, res);
		    break;
		case 'getactiveevent':
		    get_active_event(req, res, path);
		    break;
		case 'getinactiveeventendloc':
		    get_inactive_event_end_loc(req, res, path);
		    break;
		case 'getauth':
		    get_auth(req, res, path);
		    break;
		case 'getuser':
		    get_user(req, res, path);
		    break;
		case 'getuserid':
		    get_user_id(req, res, path);
		    break;
		case 'confirmuser':
		    validate_user(req, res, path);
		    break;
		case 'getaccount':
		    get_account_info(req, res, path);
		    break;
		default:
		    res.end('invalid sessionid');
		    break;
		}
	    }
	}
    });
    }
});


app.post('/updateData/', function(req, res) {
    var auth = req.header('AuthToken');
    var sesh = req.header('SessionID');
    var body = req.body;
    if (auth != undefined || auth != null || auth != '')
        var path = `logs/log${auth}.txt`;
    else var path = `logs/default.txt`;
    console.log('LogPath: ' + path);
    
    Log('SessionID: ' + sesh, path); 
    //Log('Auth: ' + auth, path);

    if (sesh == 'createuser') {
	create_user(body, res, path);
    }
    else {
    verify_auth(auth, path, function(verify) {
	//console.log('verification');
        Log('Verified?: ' + verify, path);
        if (verify == false ||  verify == 0 ||
            verify == undefined || auth == undefined) {
	    //console.log('invalid auth');
            res.end('invalid auth');
	}
        else {
        //auth = verify_auth(auth);
            if (auth == null) {
		//console.log('invalid auth2');
		res.end('invalid auth');
	    }
        else {
		switch(sesh) {
		case 'deletecontact':
		    delete_contact(body, path);
		    break;
		case 'newcontact':
		    create_contact(body, path);
		    break;
		case 'newevent':
		    create_event(body, path);
		    break;
		case 'disableevent':
		    disable_event(body, path);
		    break;
		case 'favoriteevent':
		    favorite_event(body, path);
		    break;
		case 'updatecontact':
		    update_contact(body, path);
		    break;
		case 'createuser':
		    create_user(body, res);
		    break;
		case 'resetpassword':
		    reset_password(body, path);
		    break;
		case 'createcontactinfo':
		    create_contact_info(body, path);
		    break;
		case 'updateaccount':
		    update_account(body, path);
		    break;
		default:
		    res.end('invalid sessionid');
		    break		
		}
	    res.end();
	}
	}
    });
    }
});

function verify_auth(auth, path, callback) {
    Log('SessionID: verifyauth', path);
        sql.close();
        sql.connect(config, function () {
            var request = new sql.Request();
        request.query(`    
             
            SELECT (CASE WHEN EXISTS (SELECT UserName FROM BCUSER WHERE Auth = '${auth}')
            THEN 1
            ELSE 0 END) AS bool

        `,

        function (err, recordset) {
            if (err) Log(err, path);
	    //console.log('Auth: ' + recordset['recordset'][0]['bool']);
            callback(recordset['recordset'][0]['bool']);
        });
    });
}

function get_auth(req, res, path) {
    var username = req.header('username');
    sql.close();
    sql.connect(config, function () {
	var request = new sql.Request();
	request.query(` SELECT Auth FROM BCUser 
                        WHERE Username = '${username}' `,
	function (err, recordset) {
	    if (err) Log(err, path);	    
	    res.send(JSON.stringify(recordset));
	});
    });
}

function get_auth_w_user(username, res, path) {
    sql.close();
    sql.connect(config, function () {
        var request = new sql.Request();
        request.query(` SELECT Auth FROM BCUser
                        WHERE Username = ${username} `,
        function (err, recordset) {
        if (err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });
}

function generate_auth(username, path) {
    Log('SessionID: generateauth', path);
    //generate a random alphanumeric key 
    let key = Math.random().toString(36).replace('0.', '');
    sql.close();
    sql.connect(config, function(err) {
	if (err) throw err;
	var request = new sql.Request();
	request.query(` UPDATE BCUser
                        SET Auth = ${key}
                        WHERE UserName = ${username} `)
	    .then(function (err, recordset) {
		Log('auth generated', path);
            sql.close();
        }).catch(function (err) {
	    Log(err, path);
            sql.close();
        }).catch(function (err) {
	    Log(err, path);
            sql.close();
        });	
    });
}

//updatecontact
 //Update information for a contact
function update_contact(body, path) {
    sql.close();
    var id = body.contactid;
    var fname = body.firstName;
    var lname = body.lastName;
    var phone = body.phoneNumber;
    var email = body.emailAddress;
    Log("Update Contact Query -- Name: " + fname, path);
	
    sql.connect(config, function(err) {
	if (err) throw err;
        var request = new sql.Request();
	   
	request.query(`        
        DECLARE @event_transact varchar(20) = 'UpdateContact';
        BEGIN TRAN @event_transact;

        DECLARE @params nvarchar(4000),
                @sql nvarchar(4000);
        SET @params = 
            N'@first_name varchar(35), 
            @last_name varchar(35), 
            @phone_number varchar(15), 
            @email_address varchar(255),
            @id int';

        SET @sql =
            N'UPDATE ContactInfo
        SET ContactFirstName = @first_name,
            ContactLastName = @last_name,
            ContactPhoneNumber = @phone_number,
            ContactEmailAddress = @email_address
        WHERE ContactInfo.ContactInfoID
        IN (SELECT ContactInfo.ContactInfoID
        FROM ContactInfo
        JOIN EmergencyContact
        ON  EmergencyContact.ContactInfoID = 
            ContactInfo.ContactInfoID AND
            EmergencyContact.EmergencyContactID = @id)';
        
        EXEC sp_executesql @sql, @params,        
            @first_name = ${fname},
            @last_name = ${lname},
            @phone_number = '${phone}',
            @email_address = '${email}',
            @id = ${id};

        COMMIT TRAN @event_transact;
        `).then(function () {
	    Log("Updated contact", path);
                sql.close();
        }).catch(function (err) {
	    Log(err, path);
                sql.close();
        }).catch(function (err) {
	    Log(err, path);
	    sql.close();
        });
    });
}

//Delete a contact from the DB
function delete_contact(body, path){
        sql.close();
        var id = body.id;
        sql.connect(config, function(err) {
        if (err) throw err;
        var request = new sql.Request();
            Log("Delete Contact Query", path);
        request.query(`
        DECLARE @event_transact varchar(20) = 'DeleteContact';        
        BEGIN TRAN @event_transact;
                
        DECLARE @delete_one_sql nvarchar(4000),
                @delete_two_sql nvarchar(4000),
                @delete_three_sql nvarchar(4000),
                @params nvarchar(4000)

        SET @delete_one_sql = 
            'DELETE FROM Event_Contact
            WHERE Event_Contact.EmergencyContactID = @id' ;

        SET @delete_two_sql = 
            'DELETE FROM ContactInfo
            WHERE ContactInfo.ContactInfoID 
            IN (SELECT ContactInfo.ContactInfoID
            FROM ContactInfo
            JOIN EmergencyContact
            ON EmergencyContact.ContactInfoID = ContactInfo.ContactInfoID 
            AND EmergencyContact.EmergencyContactID = @id)';
                
        SET @delete_three_sql = 
            'DELETE FROM EmergencyContact
            WHERE EmergencyContactID = @id';


        SET @params = '@id int' ;

        EXEC sp_executesql @delete_one_sql, @params, @id = ${id}
        EXEC sp_executesql @delete_two_sql, @params, @id = ${id}
        EXEC sp_executesql @delete_three_sql, @params, @id = ${id}

        COMMIT TRAN @event_transact;
        `).then(function () {
	    Log("Deleted contacted", path);
	        sql.close();
        }).catch(function (err) {
                Log(err, path);
                sql.close();
        }).catch(function (err) {
                Log(err, path);
        });
        });
 }

//newcontact
 //Insert new contact in DB
function create_contact(body, path) {
    sql.close();
    var userid = body.userid;
	var first_name = body.firstName;
	var last_name = body.lastName;
	var phone_number = body.phoneNumber;
	var email_address = body.emailAddress;
	sql.connect(config, function(err) {
	if (err) throw err;
	var request = new sql.Request();
	
            Log("Insert Contact -- Name: " + first_name, path);
	    
	request.query(`        
        DECLARE @event_transact varchar(20) = 'NewContact';
        BEGIN TRAN @event_transact

        DECLARE @contact_params nvarchar(4000),
                @contact_sql nvarchar(4000),
                @ec_sql nvarchar(4000),
                @ec_params nvarchar(4000)

        SET @contact_params =  
            N'@first_name nvarchar(400),
              @last_name nvarchar(400),
              @phone_number nvarchar(400),
              @email_address nvarchar(400) ';

        SET @contact_sql =
            N'INSERT INTO ContactInfo
            (ContactFirstName, ContactLastName, ContactPhoneNumber, ContactEmailAddress)
            VALUES (@first_name, @last_name, @phone_number, @email_address)'

        EXEC sp_executesql @contact_sql, @contact_params,
            @first_name = ${first_name},
            @last_name =  ${last_name},
            @phone_number = '${phone_number}',
            @email_address = '${email_address}';

        SET @ec_sql =
            N'INSERT INTO EmergencyContact (UserID, ContactInfoID)
              VALUES(@user_id, (SELECT TOP 1 ContactInfoID
              FROM ContactInfo
              WHERE ContactFirstName = @first_name
              AND ContactLastName =  @last_name
              AND ContactPhoneNumber = @phone_number
              AND ContactEmailAddress = @email_address))';

        SET @ec_params =
            N'@user_id int,
              @first_name nvarchar(400),
              @last_name nvarchar(400),
              @phone_number nvarchar(400),
              @email_address nvarchar(400) ';

        EXEC sp_executesql @ec_sql, @ec_params,
            @user_id = ${userid},
            @first_name = ${first_name},
            @last_name =  ${last_name},
            @phone_number = '${phone_number}',
            @email_address = '${email_address}';
        
       COMMIT TRAN @event_transact; 
  `).then(function () {
      Log("Contact inserted", path);
        sql.close();
	}).catch(function (err) {
	    Log(err, path);    
        sql.close();
	}).catch(function (err) {
        Log(err, path);
	});
	});
}


 //Insert new event in DB
function create_event(body, path){
	sql.close();
	var userid = body.userid;
        Log('Creating event for UserID: ' + userid, path);
	var event_name = body.name;
	var event_lat = body.startLat;
	var event_long = body.startLong;	
	var event_desc = body.description;
	var event_start = body.startDate;
        var event_end = body.endDate;
	var event_end_lat = body.endLat;
	var event_end_long = body.endLong;
	var contacts_list = body.contactsList;
	var participants = body.participants;
	//console.log(body);  
	sql.connect(config, function(err) {
	    if (err) throw err;
	    Log(err, path);
	    var eventid;
	var request = new sql.Request();
	request.query(`
DECLARE @event_transact varchar(20) = 'Transaction';
BEGIN TRAN @event_transact;

	DECLARE @sql1 nvarchar(4000),
	        @sql2 nvarchar(4000),
                @sql3 nvarchar(4000),
                @sql4 nvarchar(4000),
                @sql5 nvarchar(4000),
                @params1 nvarchar(4000),
                @params2 nvarchar(4000),
                @params3 nvarchar(4000),
                @params4 nvarchar(4000),
                @params5 nvarchar(4000)


			
    SET @params1 = N'@end_lat decimal(9,6), @end_lng decimal(9, 6)' ;
    SET @sql1 = N'INSERT INTO Position (PositionLatitude, PositionLongitude) VALUES (@end_lat, @end_lat);';
        
    EXEC sp_executesql @sql1, @params1, 
    @end_lat = '${event_end_lat}',
    @end_lng = '${event_end_long}';

    DECLARE @end_position_id INT;
    SET @end_position_id = (SELECT MAX(PositionID) FROM Position);

    SET @params2 = N'@begin_lat decimal(9,6), @begin_lng decimal(9,6)';
    SET @sql2 = N'INSERT INTO Position (PositionLatitude, PositionLongitude) VALUES (@begin_lat, @begin_lng);';
        	    
    EXEC sp_executesql @sql2, @params2,
    @begin_lat = '${event_lat}',
    @begin_lng = '${event_long}';

    DECLARE @begin_position_id INT;
    SET @begin_position_id = (SELECT MAX(PositionID) FROM Position);

    SET @params3 = N'@end_pos int, @end_date datetime2'
    SET @sql3 = 
	N'INSERT INTO EndInfo (EndPositionID, EndDate, IsMostRecent)
	VALUES (@end_pos, @end_date, 1);'

    DECLARE @end_date_iso datetime2;
    SET @end_date_iso  = CONVERT(datetime2, N'${event_end}', 126);

    EXEC sp_executesql @sql3, @params3,
    @end_pos = @end_position_id,   
    @end_date = @end_date_iso;

    DECLARE @end_id INT;
    SET @end_id = (SELECT MAX(EndID) FROM EndInfo);

    SET @params4 = N'@user_id int';
    SET @sql4 =
	N'UPDATE BCEvent SET IsCurrent = 0 WHERE UserID = @user_id AND IsCurrent = 1';

    EXEC sp_executesql @sql4, @params4,
    @user_id = ${userid};


    SET @params5 = N'@user_id int, @end int, @event_name nvarchar(400), @begin_id int, @participants nvarchar(256),@start_date datetime2, @event_desc nvarchar(1024)';
    
    SET @sql5 = N'INSERT INTO BCEvent 
        (UserID, EndID, EventName, CreationPositionID, EventCreationDate, EventStartDate, 
        EventParticipants, EventDescription, IsCurrent, IsFavorite) 
	VALUES (@user_id, @end, @event_name, @begin_id, GETDATE(),  @start_date, @participants, @event_desc, 1, 0)';


    EXEC sp_executesql @sql5, @params5,
    @user_id = ${userid},
    @end = @end_id,
    @begin_id = @begin_position_id,
    @start_date = '${event_start}',
    @event_name = '${event_name}',
    @participants = '${participants}',
    @event_desc = '${event_desc}';


    DECLARE @event_id INT;
    SET @event_id = (SELECT MAX(EventID) FROM  BCEvent);

    DECLARE @contacts_list VARCHAR(200)
    SET @contacts_list  = '${contacts_list}';

    DECLARE myCursor CURSOR
    STATIC
    FOR
    SELECT CONVERT(int, value) FROM STRING_SPLIT(@contacts_list, ',');
    OPEN myCursor;
    DECLARE @id VARCHAR(10);
    FETCH NEXT FROM myCursor INTO @id;
    WHILE @@FETCH_STATUS = 0

BEGIN
        DECLARE @InsertEventContactInfo VARCHAR(200)
        SET @InsertEventContactInfo = 'INSERT INTO Event_Contact (EmergencyContactID, EventID) VALUES (' + @id + ', ' + CAST(@event_id as nvarchar) + ');'
        PRINT @InsertEventContactInfo
        EXECUTE (@InsertEventContactInfo)

        FETCH NEXT FROM myCursor INTO @id;
END
        CLOSE myCursor;
        DEALLOCATE myCursor;

COMMIT TRAN @event_transact;
`).then(function () {
    Log("Contact Created", path);
		sql.close();
	}).catch(function (err) {
		Log(err, path);
		sql.close();
	}).catch(function (err) {
		Log(err, path);
	});
	});
 }


//Pull all contacts for a user
function get_contacts(req, res, path){
    sql.close();
	sql.connect(config, function () {
        var request = new sql.Request();
        request.query(`

        DECLARE @sql nvarchar(4000),
        @params nvarchar(4000);

        SET @params = '@id int'        
                        
        SET @sql = 
        'SELECT EmergencyContactID, ContactFirstName, ContactLastName, ContactAddress1,
        ContactAddress2, ContactCity, ContactState, ContactZipCode, ContactPhoneNumber, ContactEmailAddress
        FROM EmergencyContact
        JOIN ContactInfo
        ON EmergencyContact.ContactInfoID = ContactInfo.ContactInfoID
        JOIN BCUser
        ON BCUser.UserID = EmergencyContact.UserID
        WHERE EmergencyContact.UserID = BCUser.UserID AND BCUser.UserID = @id';        
        
        EXEC sp_executesql @sql, @params,
        @id = ${req.header('userID')}

             `,
            function (err, recordset)
		 {
           	     if (err) Log(err, path);
              	     res.send(JSON.stringify(recordset)); // Result in JSON formay		  
	    	});	
	});
}


//Return contacts for a specific event
function get_event_contacts(req, res, path){
    sql.close();
    sql.connect(config, function () {
	var request = new sql.Request();
	request.query(`
        DECLARE @params nvarchar(4000),
        @sql nvarchar(4000);

        SET @params = '@id int';

        SET @sql = 
        'SELECT ContactFirstName, ContactLastName, ContactPhoneNumber, ContactEmailAddress, ContactAddress1, ContactAddress2,
        ContactCity, ContactState, ContactZipCode, BCEvent.EventID
        FROM Event_Contact
        JOIN BCEvent
        ON Event_Contact.EventID = BCEvent.EventID
        JOIN EmergencyContact
        ON Event_Contact.EmergencyContactID = EmergencyContact.EmergencyContactID
        JOIN ContactInfo
        ON ContactInfo.ContactInfoID = EmergencyContact.ContactInfoID
        WHERE BCEvent.EventID =  @id';        

        EXEC sp_executesql @sql, @params,
        @id = ${req.header('eventid')}

        `,function (err, recordset)
        {
            if (err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });
}

function get_inactive_events(req, res, path) {
	sql.close();
        sql.connect(config, function () {
        var request = new sql.Request();
        request.query(`
       DECLARE @sql nvarchar(4000),
                 @params nvarchar(4000);
    
       SET @params = '@id int'
      
       SET @sql =         
        'SELECT TOP 10 BCevent.EventID, EventName, EventStartDate, EndDate, a.PositionLatitude AS StartLat,
        a.PositionLongitude AS StartLon, b.PositionLatitude AS EndLat,
        b.PositionLongitude AS EndLon, EventDescription, EventParticipants, IsCurrent        
        FROM BCEvent
        JOIN Position a
        ON a.PositionID = BCEvent.CreationPositionID
        JOIN EndInfo
        ON EndInfo.EndID = BCEvent.EndID
        JOIN Position b
        ON b.PositionID = EndInfo.EndPositionID        
        WHERE BCEvent.UserID = @id AND BCEvent.IsCurrent = 0;'

        EXEC sp_executesql @sql, @params,
        @id = ${req.header('userID')}
        `,
        function (err, recordset) {
            if (err) Log(err, path);
            //console.log(JSON.stringify(recordset));
            res.send(JSON.stringify(recordset)); // Result in JSON format
        });
    });
}



function get_last_inactive_event(req, res, path) {
        sql.close();
        sql.connect(config, function () {
        var request = new sql.Request();
        request.query(`
        DECLARE @sql = nvarhcar(4000), 
                 @params = nvarchar(4000);

        SET @params = '@id int'
 
        SET @sql = 
        'SELECT TOP 1 ContactFirstName, ContactLastName, BCEvent.EventID, EventName, EventStartDate, 
        EventCreationDate, EndDate, PositionLongitude, PositionLatitude, IsMostRecent, IsFavorite
        FROM BCEvent
        JOIN EndInfo
        ON BCEvent.EndID = EndInfo.EndID
        JOIN Position
        ON Position.PositionID = EndInfo.EndPositionID
        JOIN BCUser
        ON BCUser.UserID = BCEvent.UserID
        JOIN ContactInfo
        ON BCUser.ContactInfoID = ContactInfo.ContactInfoID
        WHERE BCEvent.UserID = @id AND IsCurrent = 0
        ORDER BY EventCreationDate DESC';

        EXEC sp_executesql @sql, @params,
        @id = ${req.header('userID')}
        
        `,

         function (err, recordset) {
            if (err) Log(err, path);
             Log(JSON.stringify(recordset), path);
            res.send(JSON.stringify(recordset)); // Result in JSON format
        });
    });
}


function get_active_event(req, res, path) {
    sql.close();
    sql.connect(config, function () {
        var request = new sql.Request();
        request.query(`
        DECLARE @sql nvarchar(4000),
            @params nvarchar(4000);

        SET @params = '@userid int';

        SET @sql = 'SELECT  BCevent.EventID, EventName, EventStartDate, EndDate,
        a.PositionLatitude AS StartLat, a.PositionLongitude AS StartLon, 
        b.PositionLatitude AS EndLat, b.PositionLongitude AS EndLon, IsCurrent, 
        EventParticipants, EventDescription
        FROM BCEvent
            JOIN Position a
        ON a.PositionID = BCEvent.CreationPositionID
            JOIN EndInfo
        ON EndInfo.EndID = BCEvent.EndID
            JOIN Position b
        ON b.PositionID = EndInfo.EndPositionID
        WHERE BCEvent.UserID = @userid AND BCEvent.IsCurrent = 1';

        EXEC sp_executesql @sql, @params,
        @userid = ${req.header('userID')};`,

        function (err, recordset) {
            if (err) Log(err, path);
	    if (recordset['recordset'][0] != undefined) {
		Log('Active Event', path); 
		Log(recordset['recordset'][0], path);
	    }
	    else Log('No Active Event', path);
            res.send(JSON.stringify(recordset)); // Result in JSON format
            
        });
    });
}

function get_active_event_loc(body, path) {
        sql.close();
	sql.connect(config, function () {
		var request = new sql.Request();
		request.query(`
                DECLARE @sql nvarchar(4000),
                        @params nvarchar(4000);
               
                SET @params = '@userid int'
 
                SET @sql = '       
                SELECT PositionLongitude, PositionLatitude 
		FROM BCEvent
		JOIN EndInfo
			ON BCEvent.EndID = EndInfo.EndID
		JOIN Position
			ON Position.PositionID = EndInfo.EndPositionID
		WHERE BCEvent.UserID = @userid  AND BCEvent.IsCurrent = 1
		ORDER BY EventCreationDate DESC;'
               
                EXEC sp_executesql @sql, @params, 
                @userid = ${body.userID};
                `,
            function (err, recordset) {
            if (err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });
}


//Event that allows "CHECK IN" functionality -MKW
function disable_event(body, path) {  
    var eventid = body.eventID;
    console.log('disable: ' + eventid);
    Log('Disabling event: ' + eventid, path);
        sql.close();
        sql.connect(config, function(err)
        {
		if(err) Log(err, path);
                var request = new sql.Request();
                request.query(` 
                    UPDATE BCEvent
                    SET BCEvent.IsCurrent = 0
                    WHERE BCEvent.EventID = ${eventid};
        `);
   });	
}

//Favorite an event
function favorite_event(body, path) {
	var eventid = body.eventID;
	sql.close();
	sql.connect(config, function(err)
	{
		if(err) Log(err, path);
		var request = new sql.Request();
		request.query(`
			UPDATE BCEvent
			SET IsFavorite =
			CASE WHEN IsFavorite = 1 THEN 0
			ELSE 1 END
			WHERE EventID = ${eventid};
			`);
	});
}

//creates user
function create_user(body, res, path) {
    sql.close();
    var username = body.username;
    var password = body.password;
    var email = body.email;
    var firstname = body.firstname;
    var lastname = body.lastname;
    var key =  Math.random().toString(36).replace('0.', '');
	//password = passwordHash.generate(password);
    bcrypt.hash(password, 10).then(function(hash) {
    sql.connect(config, function(err){
	if (err) throw err;
	var request = new sql.Request();
	Log('Creating user: ' + username, path);
	request.query(`
	DECLARE @user_transact varchar(20) = 'NewUser';	
        BEGIN TRAN @user_transact;
        
        DECLARE @sql nvarchar(4000),
                @params nvarchar(4000),
                @sql2 nvarchar(4000), 
                @params2 nvarchar(4000);

        SET @params = '@username nvarchar(100), 
                   @password nvarchar(100),
                   @email nvarchar(255),
                   @fname nvarchar(100),
                   @lname nvarchar(100)';

        SET @sql = 'INSERT INTO dbo.BCUser(UserName, UserPassword, 
                                Email, FirstName, LastName)
	            VALUES (@username, @password, 
                            @email, @fname, @lname)';
        
        EXEC sp_executesql @sql, @params, 
             @username = '${username}',
             @password = '${hash}',
             @email = '${email}',
             @fname = '${firstname}',
             @lname = '${lastname}';
        
        SET @params2 = '@username nvarchar(100), 
                       @key nvarchar(200)';
        
        SET @sql2 = ' UPDATE dbo.BCUser
                        SET Auth = @key
                        WHERE UserName = @username ';

        EXEC sp_executesql @sql2, @params2,
            @username = '${username}',
            @key = '${key}';

	COMMIT TRAN @user_transact;
	`).then(function() {
	    res.send(JSON.stringify(get_auth_w_user(username, res)));
                sql.close();
        }).catch(function (err) {
                Log(err, path);
                sql.close();
        }).catch(function (err) {
                Log(err, path);
        });
        });
    });
}

//change password
function reset_password(body, path) {
       sql.close();
       var username = body.username;
       var password = body.nPassword;
       password = bcrypt.hash(nPassword, 10);
       Log("Password reset for ${username}", path);
       sql.connect(config, function(err) {
	   if(err) { console.log(err);
		     throw err;
		   }
       var request = new sql.Request();
       request.query(`
       DECLARE @user_transact varchar(20) = 'PasswordReset';
       BEGIN TRAN @user_transact;

       DECLARE @sql nvarchar(4000), 
                @params nvarchar(4000);

       SET @params = '@username nvarchar(100), 
                      @password nvarchar(100)';
       
       SET @sql = 'UPDATE dbo.BCUser
                   SET UserPassword = @password
                   WHERE UserName = @username';

       EXEC sp_executesql @sql, @params,
       @username = ${username},
       @password = ${password};

       COMMIT TRAN @user_transact;
       `).then(function() {
           Log("Password reset", path);
	        sql.close();
       }).catch(function(err) {
	        Log(err, path);
                sql.close();
       }).catch(function(err) {
                Log(err, path);
      });
   });
}


function get_user(req, res, path) {
    //console.log(body);
    //console.log('username: ' + body.user);
    var user = req.header('un-content');
    //Log('Getting user: ' + user, path);
    //Log('getting user', path);
    sql.close();
    sql.connect(config, function() {
	var request = new sql.Request();
	request.query(`
                       DECLARE @sql nvarchar(4000),
                               @params nvarchar(4000);
                       
                       SET @params = '@username nvarchar(4000)';
                       
                       SET @sql = 'SELECT UserID, UserName, Email, FirstName, LastName, Auth
                       FROM dbo.BCUser
                       WHERE UserName = @username'
                       
                       EXEC sp_executesql @sql, @params, 
                       @username = ${user};
            `,
            function (err, recordset) {
		if (err) Log(err, path);
		//Log(JSON.stringify(recordset), path);
		res.send(JSON.stringify(recordset));
            });
    });
}

//gets user ID
function get_user_id(req, res, path) {
    Log("In get UserID", path);
    var username = req.header('un-content');
   	sql.close();
	sql.connect(config, function() {
	var request = new sql.Request();
	request.query(`
                DECLARE @sql nvarchar(4000), 
                        @params nvarchar(4000);
           
                SET @params = '@username nvarchar(100)';

                SET @sql = 'SELECT UserID
		            FROM BCUser
		            WHERE UserName = @username';

                EXEC sp_executesql @sql, @params,
                @username = ${username};
        `,
        function (err, recordset) {
            if (err) console.log(err);
	    Log(JSON.stringify(recordset), path);
	    res.send(JSON.stringify(recordset)); // Result in JSON format$
        });
    });
}

//confirm that the password is the same
function validate_user(req, res, path) {
    var password = req.header('pw-content');
    var username = req.header('un-content');
        
    var hashedPassword = null;
    //Log('Username:' + username, path);
    Log('Username:' + username, path);
        sql.close();
	sql.connect(config, function() {
        var request = new sql.Request();
        request.query(`
                DECLARE @sql nvarchar(4000), 
                        @params nvarchar(4000);
                
                SET @params = '@username nvarchar(4000)';
                 
		SET @sql = 'SELECT UserPassword as hashPass
                FROM BCUser
                WHERE UserName = @username';

                EXEC sp_executesql @sql, @params,
                @username = ${username};                
        `, 
        function (err, result){
	sql.close();
            var confirmed = bcrypt.compareSync(password, result.recordset[0].hashPass);
	    res.send(JSON.stringify(confirmed));
        });
    });
}


//insert into contact info
function create_contact_info(body, path) {
        sql.close();
        var first_name = body.firstName;
        var last_name = body.lastName;
        var phone_number = body.phoneNumber;
        var email_address = body.emailAddress;
        var user_name = body.username;
        console.log(body);
        console.log("TESSSTT");
        sql.connect(config, function(err){
        if (err) throw err;
        var request = new sql.Request();
        console.log("Insert Query");
        request.query(`
        DECLARE @user_transact varchar(20) = 'NewUser';
        BEGIN TRAN @user_transact;

        DECLARE @sql1 nvarchar(4000),
                @params1 nvarchar(4000),
                @sql2 nvarchar(4000),
                @params2 nvarchar(4000)

        SET @params1 = '@fname nvarchar(100),
                        @lname nvarchar(100),
                        @phone nvarchar(100),
                        @email nvarchar(255)';
 
        SET @sql1 = 'INSERT INTO dbo.ContactInfo(ContactFirstName, ContactLastName, 
                            ContactPhoneNumber, ContactEmailAddress)
                     VALUES (@fname, @lname, @phone, @email)';
        
        EXEC sp_executesql @sql1, @params1,
                    @fname = ${first_name},
                    @lname = ${last_name},
                    @phone = ${phone_number},
                    @email = ${email_address}

        SET @params2 = '@user nvarchar(100)'
       
        SET @sql2 = 'UPDATE dbo.BCUser
                     SET ContactInfoID =
                     SELECT ContactInfoID
                     WHERE UserName = @user';

        EXEC sp_executesql @sql2, @params2,
             @user = ${user_name};

        COMMIT TRAN @user_transact;
        `).then(function() {    
            sql.close();
        }).catch(function (err) {
            Log(err, path);
	    res.end();
            sql.close();
        }).catch(function (err) {
	    Log(err, path);
	    res.end();
	    sql.close();
        });
        });

}


//Get account info
function get_account_info(req, res, path) {
    var userid = req.header('userID');
        sql.close();
        sql.connect(config, function () {
        var request = new sql.Request();
        request.query(
	`
            SELECT BCUser.UserName, BCUser.Email, BCUser.FirstName,
            BCUser.LastName, ContactInfo.ContactPhoneNumber
            FROM BCUser JOIN ContactInfo
            ON BCUser.UserID = ContactInfo.ContactInfoID

            WHERE BCUser.UserID = ${userid};
        `,
        function (err, recordset)
        {
            if(err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });    
}

function update_account(body, path) {
        sql.close();
        var id = body.userID;
        var fname = body.firstName;
        var lname = body.lastName;
        var phone = body.phoneNumber;
        var email = body.emailAddress;
        sql.connect(config, function(err) {
        if (err) throw err;
        var request = new sql.Request();
        Log("Update Account Query -- Name: " + fname, path);
        request.query(`
        DECLARE @event_transact varchar(20) = 'UpdateAccount';
        BEGIN TRAN @event_transact;

        DECLARE @params nvarchar(4000),
                @sql nvarchar(4000);

        SET @params =
            N'@first_name varchar(35),
            @last_name varchar(35),
            @phone_number varchar(15),
            @email_address varchar(255),
            @id int';

        SET @sql =
            N'UPDATE BCUser
            SET BCUser.FirstName =@first_name,
              BCUser.LastName = @last_name,
              BCUser.Email = @email_address
            WHERE BCUser.UserID = @id

            UPDATE ContactInfo
            SET ContactInfo.ContactFirstName = @first_name,
                ContactInfo.ContactLastName = @last_name,
                ContactInfo.ContactPhoneNumber = @phone_number,
                ContactInfo.ContactEmailAddress = @email_address
            WHERE ContactInfo.ContactInfoID = (SELECT BCUser.ContactInfoID
                FROM BCUser
                WHERE BCUser.UserID = @id)
            ';

        EXEC sp_executesql @sql, @params,
            @first_name = ${fname},
            @last_name = ${lname},
            @phone_number = '${phone}',
            @email_address = '${email}',
            @id = ${id};


        COMMIT TRAN @event_transact;
        `).then(function () {
            Log("Updated Account", path);
                sql.close();
        }).catch(function (err) {
                sql.close();
        }).catch(function (err) {
	    Log(err, path);
            sql.close();
        });
        });
}

//Forgot email function to allow random string to be stored for sending email
function forgot_password(body, path){
	sql.close();
	var email = body.email;
        console.log(email);


}
