const mailjet = require ('node-mailjet')
    .connect("c613e638e30ff63f07e1634d16159862", "5fdf4b65c38ec7b580056a3762356822")
const request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
        "Messages":[
                {
                        "From": {
                                "Email": "breadcrumbsjuniorproject2018@gmail.com",
                                "Name": "Mailjet Pilot"
                        },
                        "To": [
                                {
                                        "Email": "matthew.kent.willoughby@gmail.com",
                                        "Name": "Matt"
                                }
                        ],
                        "Subject": "Your email flight plan!",
                        "TextPart": "Dear passenger 1, welcome to Mailjet! May the delivery force be with you!",
                        "HTMLPart": "<h3>Dear Matt, YO!</h3><br />May the delivery force be with you!"
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
