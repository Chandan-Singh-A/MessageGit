const express = require('express');
const app = express();
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
})

var session = require("express-session");
app.use(session({
    secret: 'Secret Shopping',
    resave: true,
    saveUninitialized: true,
}))

app.set('view engine', 'ejs');

const mysql = require("mysql");

const con = mysql.createConnection({
    host: "localhost",
    user: "root",
    database: "chat-app",
})

con.connect(function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log("Mysql Database Connected");
    }
});

const mail=require("./mail");

app.get("/",(request,response)=>{
    if(request.session.logedin){
        response.render("homepage");
    }else{
        response.render("login");
    }
})

app.get("/login", (request, response) => {
    if(request.session.logedin){
        response.render("homepage")
    }else{
        response.render("login");
    }
})

app.post("/login",(request,response)=>{
    console.log(request.body.email, request.body.pass);
    let ob={
        email:request.body.email,
        pass:request.body.pass,
    }
    finduserlogin(ob)
    .then((result) => {
        if(result.length===0){
            console.log("Given Credentials are not good");
            response.status(300);
            response.send();
        }else{
            console.log("Verifed User");
            request.session.user=request.body.email;
            request.session.logedin=true;
            response.status(200);
            response.send();
        }
    }).catch((err) => {
        console.log(err);
    });
})

function finduserlogin(ob){
    return new Promise((resolve,reject)=>{
        console.log(`select * from user where email = '${ob.email}' and password = '${ob.pass}' and isverified = true`);
        con.query(`select * from user where email='${ob.email}' and password='${ob.pass}' and isverified=true`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                console.log("Resolve Data=",data);
                resolve(data);
            }
        })
    })
}

app.get("/signup",(request,response)=>{
    if(request.session.logedin){
        response.render("homepage")
    }else{
        response.render("signup");
    }
})

app.post("/signup",(request,response)=>{
    // console.log(request.body.email, request.body.name, request.body.pass,request.body.region);
    console.log(request.body);
    let userinfo={
        email:request.body.email,
        username:request.body.name,
        password:request.body.pass,
        isverified:false,
        id:Math.random(),
    }
    finduser(userinfo.email)
        .then((result) => {
            // console.log(result);
            if (result.length === 0) {
                createuser(userinfo)
                    .then((result) => {
                        let body = `<p><a href='http://localhost:7700/verifymail/${userinfo.id}'>click here</a> to verify</p>`;
                        mail(request.body.email, request.body.name, body, 'Message-App Verification Link');
                        response.status(200).send();
                    }).catch((err) => {
                        console.log("err here");
                        console.log(err);
                        response.status(300).send();
                    });
            } else {
                response.status(300).send();
            }
        }).catch((err) => {
            console.log(err);
        });
})

app.get("/verifymail/:token", function (request, response) {
    var id = request.params.token;
    console.log(id);
    verifyusermail(id)
        .then((result) => {
            console.log(result);
            response.redirect("/login");
        }).catch((err) => {
            console.log(err);
        });
})

function verifyusermail(id){
    return new Promise((resolve,reject)=>{
        con.query(`update user set isverified=true where id=${id};`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

function finduser(ob){
    return new Promise((resolve,reject)=>{
        con.query(`select * from user where email='${ob.email}';`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

function createuser(ob){
return new Promise((resolve,reject)=>{
    con.query(`insert into user values(
        '${ob.email}','${ob.username}','${ob.password}','${ob.isverified}','${ob.id}'
    );`,(err,data)=>{
        if(err){
            reject(err)
        }else{
            resolve(data);
        }
    })
})
}

//Group Requests

app.get("/groupspage",(request,response)=>{
    if(request.session.logedin){
        console.log("if");
        response.render("groupspage");
    }else{
        console.log("else");
        response.render("login");
    }
})

app.post("/creategroup",(request,response)=>{
    let gname=request.body.gname;
    let ob={
        gname:gname,
        id:Math.random(),
        createdby:request.session.user,
        groupchatcount:0,
        lastupdated:0,
        createdat:new Date().toISOString()
    }
    creategroup(ob,request)
    .then((result) => {
        response.status(200).send();
    }).catch((err) => {
        console.log(err);
        response.status(300).send();
    });
})

function creategroup(ob,request){
    return new Promise((resolve,reject)=>{
        con.query(`insert into groups 
        values('${ob.id}','${ob.createdat}','${ob.lastupdated}','${ob.gname}','${ob.createdby}','${ob.groupchatcount}')`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                con.query(`insert into mapped values('${ob.id}','${request.session.user}','${Math.random()}','${ob.gname}','${1}')`,(err,data)=>{
                    if(err){
                        console.log("Error In Mapped Table At create group",err);
                    }else{
                        console.log("mapped query done at create group");
                    }
                })
                resolve(data);
            }
        })
    })
}

app.get("/getgroups",(request,response)=>{
    getgroups(request)
    .then((result) => {
        response.status(200).send(result);
    }).catch((err) => {
        console.log(err);
        response.status(500).send("Internal Server Error");
    });
})

function getgroups(request){
    console.log(request.session.user);
    return new Promise((resolve,reject)=>{
        con.query(`select * from mapped where user='${request.session.user}' and isjoined=true`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

app.post("/savemessage",(request,response)=>{
    console.log(request.body.gid,request.body.message);
    let ob={
        gid:request.body.gid,
        message:request.body.message,
        id:Math.random(),
        uid:request.session.user,
        time:new Date().toISOString(),
    }
    savemessage(ob)
    .then((result) => {
        response.status(200).send()
    }).catch((err) => {
        console.log(err);
    });
})

function savemessage(ob){
    return new Promise((resolve,reject)=>{
        con.query(`insert into messages values('${ob.message}','${ob.id}','${ob.gid}','${ob.uid}','${ob.time}');`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                con.query(`update user set chatcount=chatcount+1 where email='${ob.uid}'`,(err,data)=>{
                    if(err){
                        console.log("Error While Increasing Chatcount in User");
                    }else{
                        console.log("User chat count succesfull");
                        con.query(`update groups set groupchatcount=groupchatcount+1 where groupid='${ob.gid}'`,(err,data)=>{
                            if(err){
                                console.log("Error While Increasing Gorupchatcount");
                            }else{
                                console.log("Groupchat count succesfull");
                            }
                        })
                    }
                })
                resolve(data);
            }
        })
    })
}

app.get("/getgroupmessages",(request,response)=>{
    let gid=request.query.gid;
    getgroupmessages(gid)
    .then((result) => {
        response.status(200).send(result);
    }).catch((err) => {
        console.log(err);
    });
})

function getgroupmessages(id){
    return new Promise((resolve,reject)=>{
        con.query(`select * from messages where gid='${id}'`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

app.get("/searchmember", (request, response) => {
    let name = request.query.name;
    let gid = request.query.gid;
    let filtername = [];

    searchmember(name)
        .then((userresult) => {
            console.log("userresult", userresult);
            // Use Promise.all to wait for all asynchronous operations
            const promises = userresult.map((element) => {
                return checkmemberingroup(element.email, gid)
                    .then((result) => {
                        if (result.length === 0) {
                            filtername.push(element);
                        }
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            });

            // Wait for all promises to resolve before sending the response
            Promise.all(promises)
                .then(() => {
                    response.status(200).send(filtername);
                    console.log("filtername", filtername);
                })
                .catch((err) => {
                    console.log(err);
                });
        })
        .catch((err) => {
            console.log(err);
        });
});

function searchmember(name){
    return new Promise((resolve,reject)=>{
        con.query(`select * from user where email like '${name}%'and isverified=1`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

function checkmemberingroup(user,groupid){
    console.log("check",user,groupid);
    return new Promise((resolve,reject)=>{
        con.query(`select * from mapped where user='${user}' and groupid='${groupid}'`,(err,data)=>{
            if(err){
                reject(err)
            }else{
                resolve(data)
            }
        })
    })
}

app.post("/sendreqmember",(request,response)=>{
    let gid=request.body.gid;
    let email=request.body.email;
    let gname=request.body.gname;
    console.log(gid,email);
    let ob={
        groupid:gid,
        user:email,
        id:Math.random(),
        gname:gname,
        isjoined:0,
        requests:1,
    }
    sendreqmember(ob)
    .then((result) => {
        response.status(200).send()
    }).catch((err) => {
        console.log(err);
        response.status(500).send();
    });
})

function sendreqmember(ob){
    return new Promise((resolve,reject)=>{
        con.query(`insert into mapped values('${ob.groupid}','${ob.user}','${ob.id}','${ob.gname}','${ob.isjoined}')`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

app.get("/getgroupreq",(request,response)=>{
    getgroupreq(request.session.user)
    .then((result) => {
        console.log(result);
        response.status(200).send(result);
    }).catch((err) => {
        console.log(err);
    });
})

function getgroupreq(name){
    console.log(name);
    return new Promise((resolve,reject)=>{
        con.query(`select * from mapped where user='${name}'and isjoined=0`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

app.put("/acceptreq",(request,response)=>{
    let id=request.body.id;
    acceptreq(id)
    .then((result) => {
        response.status(200).send();
    }).catch((err) => {
        console.log(err);
    });
})

function acceptreq(id){
    return new Promise((resolve,reject)=>{
        con.query(`update mapped set isjoined=true where id='${id}'`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

app.put("/rejectreq",(request,response)=>{
    let id=request.body.id;
    rejectreq(id)
    .then((result) => {
        response.status(200).send();
    }).catch((err) => {
        console.log(err);
    });
})

function rejectreq(id){
    return new Promise((resolve,reject)=>{
        con.query(`delete from mapped where id='${id}'`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

app.get("/gettopusers",(request,response)=>{
    gettopusers()
    .then((result) => {
        response.status(200).send(result);
    }).catch((err) => {
        console.log(err);
    });
})

function gettopusers(){
    return new Promise((resolve,reject)=>{
        con.query(`select * from user where chatcount!=${0} order by chatcount desc limit 5`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

app.get("/gettopgroups",(request,response)=>{
    gettopgroups()
    .then((result) => {
        response.status(200).send(result)
    }).catch((err) => {
        console.log(err);
    });
})

function gettopgroups(){
    return new Promise((resolve,reject)=>{
        con.query(`select * from groups where groupchatcount!=${0} order by groupchatcount desc limit 5`,(err,data)=>{
            if(err){
                reject(err);
            }else{
                resolve(data);
            }
        })
    })
}

app.get("/logout",function(request,response){
    request.session.logedin=false;
    response.render("login");
})

app.listen(7700, () => {
    console.log("Server is running on port:7700");
});