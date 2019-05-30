//Helper functions
var config;
 
function Log(message, path) {
    var date = new Date();
    var utcdate = date.toUTCString();
    file.appendFile(path, utcdate + ': ' + message + '\n',
    function (err)
    { if (err)
      console.log('WriteFileErr: ' + err);
    });
}

function  generate_random_string(string_length) {
        let random_string = '';
        let random_ascii;
        let ascii_low = 65;
        let ascii_high = 90;
        for(let i = 0; i < string_length; i++) {
            random_ascii = Math.floor((Math.random()
			 * (ascii_high - ascii_low))
		         + ascii_low);
            random_string += String.fromCharCode(random_ascii);
        }
    return random_string
}


function  verify_auth(auth, path, callback) {
    Log('SessionID: verifyauth', path);
    callback(1);

    /*sql.close();
    sql.connect(config)
        .then( function () {
            console.log("create query");
            new sql.Request()
                .query(`
            SELECT (CASE WHEN EXISTS (SELECT UserName FROM BCUSER WHERE Auth = '${auth}')
            THEN 1
            ELSE 0 END) AS bool;`)
                .then( function (recordset) {
                    console.log("after query");
                    if (recordset['recordset'][0]['bool'] == 1) {
                        sql.close();
                        callback(1);
                    }
                    else {
                        sql.close();
                        callback(0);
                    }
                })
        })
    */
}

 function  generate_auth(username, path) {
    Log('SessionID: generateauth', path);
    //generate a random alphanumeric key
    let key = Math.random().toString(36).replace('0.', '');
    sql.close();
    sql.connect(config,  function (err) {
        if (err) throw err;
        var request = new sql.Request();
        request.query(` UPDATE BCUser
                        SET Auth = ${key}
                        WHERE UserName = ${username} `)
            .then( function  (err, recordset) {
                Log('auth generated', path);
            sql.close();
        }).catch( function  (err) {
            Log(err, path);
            sql.close();
        }).catch( function  (err) {
            Log(err, path);
            sql.close();
        });
    });
}

//Return contacts for a specific event
 function  get_event_contacts(req, res, path){
    sql.close();
    sql.connect(config,  function  () {
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

        `, function  (err, recordset)
        {
            if (err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });
}

 function  get_inactive_events(req, res, path) {
        sql.close();
        sql.connect(config,  function  () {
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
        WHERE BCEvent.UserID = @id AND BCEvent.IsCurrent = 0 ';

        EXEC sp_executesql @sql, @params,
        @id = ${req.header('userID')}
        `,
        //AND BCEvent.IsVisible = null;'
         function  (err, recordset) {
            if (err) Log(err, path);
            //console.log(JSON.stringify(recordset));
            res.send(JSON.stringify(recordset)); // Result in JSON format
        });
    });
}

 function  get_last_inactive_event(req, res, path) {
        sql.close();
        sql.connect(config,  function  () {
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

          function  (err, recordset) {
            if (err) Log(err, path);
             Log(JSON.stringify(recordset), path);
            res.send(JSON.stringify(recordset)); // Result in JSON format
        });
    });
}

function  get_active_event(req, res, path) {
    sql.close();
    sql.connect(config,  function  () {
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

         function  (err, recordset) {
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

function  get_active_event_loc(body, path) {
        sql.close();
        sql.connect(config,  function  () {
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
             function  (err, recordset) {
            if (err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });
}

function  get_user(req, res, path) {
    //console.log(body);
    //console.log('username: ' + body.user);
    var user = req.header('un-content');
    //Log('Getting user: ' + user, path);
    //Log('getting user', path);
    sql.close();
    sql.connect(config,  function () {
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
             function  (err, recordset) {
                if (err) Log(err, path);
                //Log(JSON.stringify(recordset), path);
                res.send(JSON.stringify(recordset));
            });
    });
}

//gets user ID
 function  get_user_id(req, res, path) {
    Log("In get UserID", path);
    var username = req.header('un-content');
        sql.close();
        sql.connect(config,  function () {
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
         function  (err, recordset) {
            if (err) console.log(err);
            Log(JSON.stringify(recordset), path);
            res.send(JSON.stringify(recordset)); // Result in JSON format$
        });
    });
}

//confirm that the password is the same
 function  validate_user(req, res, path) {
    var password = req.header('pw-content');
    var username = req.header('un-content');

    var hashedPassword = null;
    //Log('Username:' + username, path);
    Log('Username:' + username, path);
        sql.close();
        sql.connect(config,  function () {
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
         function  (err, result){
        sql.close();
            var confirmed = bcrypt.compareSync(password, result.recordset[0].hashPass);
            res.send(JSON.stringify(confirmed));
        });
    });
}

//Get account info
 function  get_account_info(req, res, path) {
    var userid = req.header('userID');
        sql.close();
        sql.connect(config,  function  () {
        var request = new sql.Request();
        request.query(
        `
            SELECT UserName, Email, FirstName, LastName
            FROM BCUser
            WHERE UserID = ${userid};
        `,
         function  (err, recordset)
        {
            if(err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });
}

function  get_username(body, res, path) {
        //console.log("GETUSERNAME", body );
        sql.close();
        var email = body.email;
        //console.log(userEmail);
        var promise1 = new Promise( function (resolve, reject) {
        sql.connect(config,  function () {
        var request = new sql.Request();
        request.query(`
                SELECT UserName
                FROM BCUser
                WHERE Email = '${email}'
        `,
         function (err, data) {
        if (err) console.log("error");
        sql.close();
        //console.log(data.recordset[0].UserName);
        var username = data.recordset[0].UserName;
        //console.log("?", username);
        res.send(JSON.stringify(username));
        });
    });
        });
}

 function  get_code(body, res, path) {
        sql.close();
        var code = body.userCode;
        var Promise1 = new Promise( function (resolve, reject) {
        sql.connect(config,  function () {
        var request = new sql.Request();
        request.query(`
                SELECT *
                FROM ForgotPassword
                WHERE string = '${code}'
        `, function (err, data) {
                if(err) {
                sql.close;
                Log(err, path);
                res.send(JSON.stringify(false));
                } else
                {
                sql.close();
                var username = data.recordset[0].UserName;
                console.log("username :",  username);
                res.send(JSON.stringify(username));
                }
        });
        });
        });

}


function  get_auth_w_user(username, res, path) {
    sql.close();
    sql.connect(config,  function  () {
        var request = new sql.Request();
        request.query(` SELECT Auth FROM BCUser
                        WHERE Username = ${username} `,
         function  (err, recordset) {
        if (err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });
}


function  get_auth(req, res, path) {
    var username = req.header('username');
    sql.close();
    sql.connect(config,  function  () {
        var request = new sql.Request();
        request.query(` SELECT Auth FROM BCUser
                        WHERE Username = '${username}' `,
         function  (err, recordset) {
            if (err) Log(err, path);
            res.send(JSON.stringify(recordset));
        });
    });
}


//Recieve message from master process
process.on('message', async (message, args) => {
    let sesh = args.req.header('SessionID');
    let auth = args.req.header('AuthToken');
    config = args.config;
    if (auth != undefined || auth != null || auth != '')
        var path = `logs/log${auth}.txt`;
    else var path = `logs/default.txt`;
    console.log('LogPath: ' + path);
    
    if (sesh == 'confirmuser') {
        validate_user(req, res, path);
    }
    else if (sesh == 'getuserid') {
        get_user_id(req, res, path);
    }
    else if (sesh == 'getauth') {
        get_auth(req, res, path);
    }
    else if(sesh == 'getcode') {
        get_code(req, res, path);
    }
    else {
        verify_auth(auth, path,  function (result) {
            let verify = result;
        Log('Verified?: ' + verify, path);
        if (verify == false ||  verify == 0 ||
            verify == undefined || auth == undefined) {
            res.end('invalid auth');
        }
        else {
            if (auth == null) {
                res.end('invalid auth');
              }
            else {
                switch(session) {
                case 'confirmuser':
                    validate_user(req, res, path);
                    break;
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
