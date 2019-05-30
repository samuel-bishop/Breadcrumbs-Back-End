var express = require('express'); // Web Framework
var app = express();
var bodyParser = require("body-parser");
var sql = require('mssql'); // MS Sql Server client
var cors = require('cors')
var passwordHash = require('password-hash');

app.use(cors())
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


//Update information for a contact
app.post('/api/updatecontact/', function(req, res){
	sql.close();
    var id = req.body.contactid;
	var fname = req.body.firstName;
        var lname = req.body.lastName;
	var phone = req.body.phoneNumber;
	var email = req.body.emailAddress;
	sql.connect(config, function(err) {
	if (err) throw err;
        var request = new sql.Request();
	console.log("Update Contact Query -- Name: " + fname);
	   
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
	    console.log("Updated contact");
                sql.close();
        }).catch(function (err) {
                sql.close();
        }).catch(function (err) {
            console.log("Error:" + err);
	    sql.close();
        });
        });
});

//Delete a contact from the DB
app.post('/api/deletecontact/', function(req, res){
        sql.close();
        var id = req.body.id;
        sql.connect(config, function(err) {
        if (err) throw err;
        var request = new sql.Request();
        console.log("Delete Contact Query");
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
	    console.log("Deleted contacted");
	        sql.close();
        }).catch(function (err) {
                console.log("then error");
                console.log(err);
                sql.close();
        }).catch(function (err) {
                console.log("query error");
                console.log(err);
        });
        });
});

//Insert new contact in DB
app.post('/api/newcontact/', function(req, res){

	sql.close();
	var userid = req.body.userid;
	console.log(userid);
	var first_name = req.body.firstName;
	var last_name = req.body.lastName;
	var phone_number = req.body.phoneNumber;
	var email_address = req.body.emailAddress;
	sql.connect(config, function(err) {
	if (err) throw err;
	var request = new sql.Request();
	
        console.log("Insert Query -- Name: " + first_name);
	    
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
              VALUES(@user_id, (SELECT ContactInfoID
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
        console.log("Contacted inserted");
        sql.close();
	}).catch(function (err) {
	    console.log(err);    
        sql.close();
	}).catch(function (err) {
        console.log(err);
	});
	});
});


//Insert new event in DB
app.post('/api/newevent/', function(req, res){
	sql.close();
	var userid = req.body.userid;
	console.log(userid);
	var event_name = req.body.name;
	var event_lat = req.body.startLat;
	var event_long = req.body.startLong;	
	var event_desc = req.body.description;
	var event_start = req.body.startDate;
        var event_end = req.body.endDate;
	var event_end_lat = req.body.endLat;
	var event_end_long = req.body.endLong;
	var contacts_list = req.body.contactsList;
	var participants = req.body.participants;
	//console.log(req.body);  
	sql.connect(config, function(err) {
	if (err) throw err;
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
		console.log("Contact Created");
		sql.close();
	}).catch(function (err) {
		console.log(err);
		sql.close();
	}).catch(function (err) {
		console.log(err);
	});
	});
});


//Pull all contacts for a user
app.get('/api/contacts/:userID', function (req, res) {
    sql.close();
	console.log("Contacts, UserID: " + req.params.userID);
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
        @id = ${req.params.userID}

             `,
            function (err, recordset)
		 {
           	     if (err) console.log(err);
              	     res.send(JSON.stringify(recordset)); // Result in JSON formay		  
	    	});	
	});
});


//Return contacts for a specific event
app.get('/api/eventContacts/:eventID', function (req, res) {
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
        @id = ${req.params.eventID}

        `,function (err, recordset)
        {
            if (err) console.log(err);
            res.send(JSON.stringify(recordset));
        });
    });
});

app.get('/api/inactiveEvents/:userID', function (req, res) 
{
	sql.close();
        sql.connect(config, function () {
        var request = new sql.Request();
        request.query(`SELECT TOP 10 BCevent.EventID, EventName, EventCreationDate, EndDate, a.PositionLatitude AS StartLat, a.PositionLongitude AS StartLon, b.PositionLatitude AS EndLat, b.PositionLongitude AS EndLon, EventDescription, EventParticipants, IsCurrent
FROM BCEvent
    JOIN Position a
        ON a.PositionID = BCEvent.CreationPositionID
    JOIN EndInfo
        ON EndInfo.EndID = BCEvent.EndID
    JOIN Position b
        ON b.PositionID = EndInfo.EndPositionID
WHERE BCEvent.UserID = ${req.params.userID} AND BCEvent.IsCurrent = 0;`,
        function (err, recordset) {
            if (err) console.log(err);
            console.log(JSON.stringify(recordset));
            res.send(JSON.stringify(recordset)); // Result in JSON format
        });
    });
});

app.get('/api/lastInactiveEvent/:userID', function (req, res)
{
        console.log('In inactiveEvents');
        sql.close();
        console.log('After Close');
        sql.connect(config, function () {
        console.log('In sql.connect function');
        var request = new sql.Request();
        console.log('Created new sql.Request()');
        request.query(`SELECT TOP 1 ContactFirstName, ContactLastName, BCEvent.EventID, EventName, EventStartDate, EventCreationDate, EndDate, PositionLongitude, PositionLatitude, IsMostRe$
                        FROM BCEvent
                        JOIN EndInfo
                        ON BCEvent.EndID = EndInfo.EndID
                        JOIN Position
                        ON Position.PositionID = EndInfo.EndPositionID
                        JOIN BCUser
                        ON BCUser.UserID = BCEvent.UserID
                        JOIN ContactInfo
                        ON BCUser.ContactInfoID = ContactInfo.ContactInfoID
                        WHERE BCEvent.UserID = 1 AND IsCurrent = 0
                        ORDER BY EventCreationDate DESC;`,

         function (err, recordset) {
                   if (err) console.log(err);
                   console.log(JSON.stringify(recordset));
                   res.send(JSON.stringify(recordset)); // Result in JSON format
                });
        });
});


app.get('/api/activeEvent/:userID', function (req, res) {
sql.close();
    sql.connect(config, function () {
        var request = new sql.Request();
        request.query(`SELECT  BCevent.EventID, EventName, EventCreationDate, EndDate, a.PositionLatitude AS StartLat, a.PositionLongitude AS StartLon, b.PositionLatitude AS EndLat, b.PositionLongitude AS EndLon, IsCurrent, EventParticipants, EventDescription
FROM BCEvent
    JOIN Position a
        ON a.PositionID = BCEvent.CreationPositionID
    JOIN EndInfo
        ON EndInfo.EndID = BCEvent.EndID
    JOIN Position b
        ON b.PositionID = EndInfo.EndPositionID
WHERE BCEvent.UserID = ${req.params.userID} AND BCEvent.IsCurrent = 1;`,  
	     function (err, recordset) {
                   if (err) console.log(err);
                 {
		     console.log("\n***************FROM ACTIVE EVENT CALL:**********************\n");
		     console.log(recordset);
		     res.send(JSON.stringify(recordset)); // Result in JSON format
		 }
		});
	});
});

app.get('/api/activeEventEndLoc/:userID', function (req, res) {
sql.close();
	sql.connect(config, function () {
		var request = new sql.Request();
		request.query(`SELECT PositionLongitude, PositionLatitude 
		FROM BCEvent
		JOIN EndInfo
			ON BCEvent.EndID = EndInfo.EndID
		JOIN Position
			ON Position.PositionID = EndInfo.EndPositionID
		WHERE BCEvent.UserID = ` + req.params.userID + ` AND BCEvent.IsCurrent = 1
		ORDER BY EventCreationDate DESC;`,
			function (err, recordset) {
				if (err) console.log(err);
				res.send(JSON.stringify(recordset));
		});
	});
});


//Event that allows "CHECK IN" functionality -MKW
app.post('/api/disableEvent/', function(req, res)
{
        var eventid = req.body.eventID;
        console.log(eventid);
        sql.close();
        sql.connect(config, function(err)
        {
		if(err) console.log(err);
                var request = new sql.Request();
                request.query(`
                        UPDATE BCEvent
                        SET BCEvent.IsCurrent = 0
                        WHERE BCEvent.EventID = ${eventid};
                	`);
        });	
});



//creates user
app.post('/api/createUser/', function(req, res) {
	sql.close();
	var username = req.body.username;
    var password = req.body.password;
    var email = req.body.email;
    var firstname = req.body.firstname;
    var lastname = req.body.lastname;
	password = passwordHash.generate(password);
	sql.connect(config, function(err){
	if (err) throw err;
	var request = new sql.Request();
	console.log("Insert Query");
	request.query(`
	DECLARE @user_transact varchar(20) = 'NewUser';
	BEGIN TRAN @user_transact;
		INSERT INTO dbo.BCUser(UserName, UserPassword, Email, FirstName, LastName)
		VALUES ('${username}', '${password}', '${email}', '${firstname}', '${lastname}');
		
	COMMIT TRAN @user_transact;
	`).then(function() {
                console.log("Query rollback");
                sql.close();
        }).catch(function (err) {
                console.log("then error");
                console.log(err);
                sql.close();
        }).catch(function (err) {
                console.log("query error");
                console.log(err);
        });
        });

});

//change password
app.post('/api/resetPassword/', function(req, res) {
       sql.close();
       var username = req.body.username;
       var password = req.body.nPassword;
       password = passwordHash.generate(password);
       sql.connect(config, function(err) {
       if(err) throw err;
       var request = new sql.Request();
       request.query(`
       DECLARE @user_transact varchar(20) = 'PasswordReset';
       BEGIN TRAN @user_transact;
             UPDATE dbo.BCUser
             SET UserPassword =  '${password}'
             WHERE UserName = '${username}';

       COMMIT TRAN @user_transact;
       `).then(function() {
                sql.close();
       }).catch(function(err) {
                sql.close();
       }).catch(function(err) {
                console.log(err);
      });
   });
});


app.get('/api/getUser/:user', function(req, res) {
    var user = req.params.user;
    sql.close();
    sql.connect(config, function() {
	var request = new sql.Request();
	request.query(`SELECT UserID, UserName, Email, FirstName, LastName
FROM dbo.BCUser
WHERE UserName = '${user}'`, function (err, recordset) {
	    if (err) console.log(err);
    res.send(JSON.stringify(recordset));
        });
    });
});

//gets user ID
app.get('/api/getUserID/:user', function(req, res) {
	console.log("In get UserID");
        var username = req.params.user;
	sql.close();
	console.log(`Trying to access ${req.params.user} userid`);
        var userID = 0;
	sql.connect(config, function() {
	var request = new sql.Request();
	request.query(`SELECT UserID
		FROM BCUser
		WHERE UserName = '${username}';`,
        function (err, recordset) {
            if (err) console.log(err);
	    console.log(JSON.stringify(recordset));
	    res.send(JSON.stringify(recordset)); // Result in JSON format$
        });
        
	});
 
});

//confirm that the password is the same
app.get('/api/confirmUser/:user/:password', function(req, res) {
	var password = req.params.password;
	var username = req.params.user;
        
	var hashedPassword = null;
	console.log(username);
	sql.close();
	sql.connect(config, function() {
        var request = new sql.Request();
        request.query(`
		SELECT UserPassword as hashPass
                FROM BCUser
                WHERE UserName = '${username}';`, 
        function (err, result){
	sql.close();
        res.send(JSON.stringify(passwordHash.verify(password, result.recordset[0].hashPass)));
        });
        });

});


//insert into contact info
app.post('/api/createContactInfo/', function(req, res) {
        sql.close();
        var first_name = req.body.firstName;
        var last_name = req.body.lastName;
        var phone_number = req.body.phoneNumber;
        var email_address = req.body.emailAddress;
        var user_name = req.body.username;
        console.log(req.body);
        console.log("TESSSTT");
        sql.connect(config, function(err){
        if (err) throw err;
        var request = new sql.Request();
        console.log("Insert Query");
        request.query(`
        DECLARE @user_transact varchar(20) = 'NewUser';
        BEGIN TRAN @user_transact;
                INSERT INTO dbo.ContactInfo(ContactFirstName, ContactLastName, ContactPhoneNumber, ContactEmailAddress)
                VALUES ('${first_name}', '${last_name}', '${phone_number}', '${email_address}');
                
                SELECT ContactInfoID AS infoID
                FROM ContactInfo;
                
                UPDATE dbo.BCUser
                SET ContactInfoID = ${infoID}
                WHERE UserName = '${username}';
        COMMIT TRAN @user_transact;
        `).then(function() {
                console.log("Query rollback");
                sql.close();
        }).catch(function (err) {
                console.log("then error");
                console.log(err);
                sql.close();
        }).catch(function (err) {
                console.log("query error");
                console.log(err);
        });
        });

});


//Get account info
app.get('/api/accountInfo/:userID', function(req, res) {
        sql.close();
        console.log("Account, UserID: " + req.params.userID);
        sql.connect(config, function () {
            var request = new sql.Request();
            request.query(
                'SELECT BCUser.UserName, BCUser.Email, BCUser.FirstName, BCUser.LastName, ContactInfo.ContactPhoneNumber' +
                 'FROM BCUser JOIN ContactInfo' +
                 'ON BCUser.UserID = ContactInfo.ContactInfoID'+
                 'WHERE BCUser.UserID = ' + req.params.userID + ';',
        function (err, recordset)
        {
            if(err) console.log(err);
                console.log("Recordset (Account): "+ recordset[0]);
            res.send(JSON.stringify(recordset));
        });
    });    
});

app.post('/api/updateAccount/', function(req, res){
        sql.close();
        var id = req.body.userID;
        var fname = req.body.firstName;
        var lname = req.body.lastName;
        var phone = req.body.phoneNumber;
        var email = req.body.emailAddress;
        sql.connect(config, function(err) {
        if (err) throw err;
        var request = new sql.Request();
        console.log("Update Account Query -- Name: " + fname);
        console.log("ID : " +id);
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
            console.log("Updated Account");
                sql.close();
        }).catch(function (err) {
                sql.close();
        }).catch(function (err) {
            console.log("Error:" + err);
            sql.close();
        });
        });
});

