const Mailjet = require("node-mailjet");

const mailjet = new Mailjet({
    apiKey: "5ec5da8012324c9a5e206e997db89959",
    apiSecret: "fccd8b33bc24e4efa1de1395e27fc47c"
});

module.exports = function (email, name, body, subject) {
    const request = mailjet.post('send', { version: 'v3.1' }).request({
        Messages: [
            {
                From: {
                    Email: 'jatin.213029@maimt.com',
                    Name: 'Chandan Singh',
                },
                To: [{
                    Email: email,
                    Name: name,
                }
                ],
                Subject: subject,
                HTMLPart: body,
            },
        ],
    })
    request.then(function (result) {
        console.log("Result=",result.body);
    })
        .catch(function (error) {
            console.log(error);
        });
}