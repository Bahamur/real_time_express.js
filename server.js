// configuration du serveur
// quand on appuie sur la touche w, on a un menu sous forme d'onglets carrés qui apparaissent sur la page et 
// quand on clique sur l'un deux, on se dirige vers la page de notre choix

const http = require("http");
const express = require("express");
const socketio = require("socket.io"); // pour créer le websocket
const simple_peer = require("simple-peer");
const validator = require("validator"); // pour vérifier les adresses email
const escape_html = require("escape-html");
const mysql2 = require("mysql2/promise");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cookie = require("cookie");
const redis = require("redis"); // problème à corriger -> les id des sockets ne sont pas toujours récupérés
const redis_adapter = require("socket.io-redis");
const rate_limit = require("express-rate-limit");
const {render_username, check_user_authenticated, check_user_not_authenticated, check_lambda_user_connected, dompurify, crypto} = require("./functions");
require("dotenv").config();
const pool = require("./connexion");


// faire une battle de blagues en temps réél noté par d'autres utilisateurs.
// les deux participants ont 30 secondes à leur tour pour sortir une blague 
// et les viewers ont 30 secondes pour les départager


const app = express();
const server = http.createServer(app);
const io = socketio(server);

const redis_options = {
    host : 'localhost',
    port : 6379
};

io.adapter(redis_adapter(redis_options));

const redis_client = redis.createClient();
redis_client.connect();
redis_client.on('error', function(error){
    console.log(`Une erreur est survenue dans Redis : ${error}`);
})


// limiter le nombre de connexions par adresse IP
const limit_client = rate_limit({
    windowMs : 60 * 1000, // bloquer pendant une minute
    limit : 30,
    handler : function(req, res, next){
        res.status(429).send(`Trop de tentatives de connexions. Merci de patienter`);
        // ou alors envoyer avec fetch un temps et un message d'erreur par dessus la page
    }
})

// déboguer le nombre de connexions par adresse IP
const log_connection_count = function(req, res, next){
    console.log(`Nombre de connexions pour l'adresse IP ${req.ip} : ${req.rateLimit.current}`);
    next();
}

//app.use(limit_client);
//app.use('/utilisateur', limit_client);
//app.use(log_connection_count);





/*const client = redis.createClient();
client.on('error', function(error){
    console.error(`Une erreur est survenue avec redis : ${error}`);
})*/

// Connecte redis de manière asynchrone
//connect_client(client);

// Variable globale POUR CHAQUE UTILISATEUR qui défini le nombre de connexions websockets de l'utilisateur
// a corriger
let socket_number = 0;

const secret = process.env.secret;





// passport
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");


// gestion passport-local
passport.use(new LocalStrategy(async function verify(username, password, cb){
    try {
        const connection = await create_connection();
        const SQL_USERNAME_LOGIN = "SELECT COUNT(*) AS nombre FROM utilisateur u WHERE u.username = ?";
        const [RES_USERNAME_LOGIN] = await connection.execute(SQL_USERNAME_LOGIN, [username]);

        // username incorrect
        if (RES_USERNAME_LOGIN[0].nombre === 0){
            return cb(null, false, { message : "Le nom d'utilisateur est incorrect" });
        }

        // on sélectionne les informations de l'utilisateur
        const SQL_USER_LOGIN = "SELECT u.id, u.username, u.password FROM utilisateur u WHERE u.username = ?";
        const [RES_USER_LOGIN] = await connection.execute(SQL_USER_LOGIN, [username]);

        // on vérifie le mot de passe haché
        try {
            if (await bcrypt.compare(password, RES_USER_LOGIN[0].password)){
                // le mot de passe saisi est correct
                const user = {
                    id : RES_USER_LOGIN[0].id,
                    username : RES_USER_LOGIN[0].username,
                    start_time : Date.now(),
                    random : generate_unique_random_string(16) // a voir si cela sert toujours
                };
                return cb(null, user);
            } else {
                return cb(null, false, { message : "Les informations de connexion sont invalides" });
            }

        } catch (error){
            return cb(error);
        }

    } catch (error){
        return cb(error);
    }
}))


// utiliser ejs
app.set("view engine", "ejs");

// définir les fichiers statiques
app.use(express.static("public"));

// permet de récupérer les données des formulaires
app.use(bodyParser.urlencoded({ extended : false }));
app.use(bodyParser.json());


// configuration de la session
const session_middleware = session({
    secret : "UNJUST_LIFE/**/TROJAN_HORSE_FOR_SALE[(allez_ici)]{hier+demain=today}",
    resave : true,
    saveUninitialized : false,
    cookie : {
        sameSite : "strict",
        httpOnly : true,
        maxAge : 86400000
    }
    //cookie : { secure : true } -> ne fonctionne que sur une connexion HTTPS
});
app.use(session_middleware);
app.use(passport.initialize());
app.use(passport.session());

function wrap(middleware){
    return function(socket, next){
        middleware(socket.request, {}, next);
    }
}

io.use(wrap(session_middleware));
io.use(wrap(passport.initialize()));
io.use(wrap(passport.session()));


// plutôt que d'écraser le socket.id du nouveau socket, chaque utilisateur à plusieurs sockets auquels sont envoyés tous les
// messages, donc il faut stocker dans une structure tous les sockets de chaque utilisateur et supprimer celui adéquat à la 
// déconnexion
io.use(async function(socket, next){
    if (socket.request.user){
        // on ajoute avec sAdd le socket de l'utilisateur dans le set
        console.log(socket.request.user.username);
        await redis_client.sAdd(`socket_${socket.request.user.username}`, socket.id);
        const sockets = await redis_client.sMembers(`socket_${socket.request.user.username}`);
        //await redis_client.sAdd(socket.request.user.username, socket.id);
        //const sockets = await redis_client.sMembers(socket.request.user.username);
        console.log(sockets);

        //await redis_client.set(socket.request.user.username, socket.id); // Ajouter un seul id et le remplace
        //console.log(`Socket.id de ${socket.request.user.username} ajouté dans Redis : ${await redis_client.get(socket.request.user.username)}`);

        // Ajouter un nouveau socket.id au set
        //await redis_client.sAdd(socket.request.user.username, socket.id);
        /*if (socket_number === 0){
            console.log(`Première connexion au websocket : ${socket.request.user.username}, id socket : ${socket.id}`);
            // on ajoute le socket.id dans redis
            await client.set(socket.request.user.username, socket.id);
        } else {
            const get_socket = await client.get(socket.request.user.username);
            if (get_socket !== null){
                socket.id = get_socket;
            } else {
                console.log(`Une erreur est survenue lors de récupération du socket.id dans redis`);
            }
            console.log(`Nouvelle connexion websocket avec le même utilisateur : ${socket.request.user.username}, id socket : ${socket.id}`);
        }
        socket_number++;
        console.log(`Nombre de connexions au websocket : ${socket_number}`);*/




        // agit lors de la connexion au compte, ici on créé le cookie qui contient un token qui contient l'utilisateur
        // voir extraheaders socket.io
        // res.clearCookie(cookieName);

        // Pour conserver le même id de socket pour le même utilisateur
        // IMPORTANT
        //socket.id = `123456789${socket.request.user.username}`;
        next();
    } else {
        next(new Error("Non connecté"));
    }
})


// stocker ces valeurs dans la session
passport.serializeUser(function(user, cb){
    process.nextTick(function(){
        return cb(null, { id : user.id, username : user.username, random : user.random, start_time : user.start_time});
    })
})

passport.deserializeUser(function(user, cb){
    process.nextTick(function(){
        return cb(null, user);
    })
})


// Routeur création du compte
const user_router = require("./user_router");
app.use('/utilisateur', user_router);

// Routeur forum
const forum_router = require("./forum_router");
app.use('/forum', forum_router);

// Routeur chat
const chat_router = require("./chat_router");
app.use('/chat', chat_router);

// Routeur clan
const clan_router = require('./clan_router');
app.use('/clan', clan_router);

// Routeur espace média
const rtc_router = require('./rtc_router');
app.use('/media', rtc_router);

// Routeur espace détente
const blooper_router = require('./blooper_router');
app.use('/blooper', blooper_router);


// Page d'accueil
app.get("/", async function(req, res){
    const username = render_username(req, res);
    const data = {username : username};
    return res.render("index.ejs", {data : data});
})


// page de connexion au compte
app.get("/login", check_user_not_authenticated, function(req, res){
    const username = render_username(req, res);
    const data = {username : username};
    return res.render("login.ejs", {data : data});
})

// déconnecter l'utilisateur
app.post("/logout", async function(req, res){
    let connection = null;
    try {
        connection = await pool.getConnection();
        // on supprime le set qui contient les sockets.id de l'utilisateur
        await redis_client.del(`socket_${req.user.username}`);
        // on enregistre le temps de session de l'utilisateur
        const session_time = Date.now() - req.user.start_time;
        const SQL_UPDATE_TOTAL_TIME = `UPDATE utilisateur u SET u.total_time = u.total_time + ? WHERE u.id = ?`;
        const [RES_UPDATE_TOTAL_TIME] = await connection.execute(SQL_UPDATE_TOTAL_TIME, [session_time, req.user.id]);

        req.logOut(function(error){
            if (error){
                return res.json({ error : "Une erreur est survenue pendant la déconnexion", correct : false });
            } else {
                return res.json({ error : "Déconnexion réussie. Actualisation en cours", correct : true });
            }
        })
    } catch (error){
        return res.json({ error : "Une erreur est survenue pendant la déconnexion", correct : false });
    }

})


// soumission du formulaire de connexion avec AJAX
app.post("/login", function(req, res, next){
    passport.authenticate("local", function(error, user, info){
        if (error){
            return res.status(500).json({ error : `Une erreur est survenue : ${error}`, correct : false });
        }
        if (!user){
            return res.json({ error : "Les identifiants sont incorrects", correct : false });
        }
        // les informations sont correctes
        req.logIn(user, function(error){
            if (error){
                return res.json({ error : "Une erreur est survenue", correct : false });
            } else {
                const username = user.username;
                // l'utilisateur est authentifié
                return res.json({ error : `Bonjour ${username}. Redirection vers la page d'accueil`, correct : true, log : username });
            }
        })
    }) (req, res, next);
})





// écrire une réponse au forum
app.post("/forum/new_message", check_user_authenticated, async function(req, res){
    let connection = null;
    const question_id = req.body.question_id;
    const message = escape_html(req.body.mes).trim();

    if (message === ""){
        return res.json({ error : "Le message est invalide", correct : false });
    }

    try {
        connection = await create_connection();
        const now = new Date();
        const SQL_INSERT_QUESTION_MESSAGE = "INSERT INTO questions_messages (message, message_date, question_id, user_id) VALUES(?, ?, ?, ?)";
        const [RES_INSERT_QUESTION_MESSAGE] = await connection.execute(SQL_INSERT_QUESTION_MESSAGE, [message, now, question_id, req.user.id]);
        const data = {
            message : message,
            now : now
        };

        return res.json({ error : "Le message a été envoyé", correct : true });
    } catch (error){
        return res.json({ error : "Une erreur est survenue. Votre message n'a pas été envoyé", correct : false });
    } finally {
        connection.end();
    }

})



// accéder aux règles
app.get("/rules", function(req, res){
    res.render("rules.ejs");
})




// config du websocket
const blooper_battles = {};
let current = 1;

// webRTC -> simple-peer
const users_SP = {};

io.on("connection", function(socket){
    const name = socket.request.user.username;

    /*socket.on('P2P', async function(){
        if (!users_SP[name]){
            users_SP[name] = new simple_peer({initiator : false, trickle : false, stream : null});
            socket.emit('signal', JSON.stringify(users_SP[name].signal));

            socket.on('signal', function(data){
                users_SP[name].signal(JSON.parse(data));
            })

        }
    })*/

    // stocker les utilisateurs connectés dans une table puis les enlever lors de la déconnexion
    // quand un utilisateur est connecté, on utilise socket.io pour les messages, sinon on utilise
    // des requêtes post
    // Pour gérer la connexion et la déconnexion, on envoie un cookie sécurisé au client qui contient un token
    /*if (socket.request.user){
        console.log(`${socket.request.user.username} s'est connecté, id du socket : ${socket.id}`);
    } else {
        console.log("Un utilisateur s'est connecté");
    }*/

    socket.on('join_blooper_room', function(choice){
        let blooper_battle_id = null;
        for (const battle_id in blooper_battles){
            const battle = blooper_battles[battle_id];
            if (battle.actors.length < 2 && battle.spectators.length < 28){
                blooper_battle_id = battle_id;
                break; // une room est disponible
            }
        }

        if (!blooper_battle_id){
            blooper_battle_id = `blooper_battle${current++}`;
            blooper_battles[blooper_battle_id] = { actors : [], spectators : [] };
        }

        socket.join(blooper_battle_id);

        if (choice === 'actor'){
            blooper_battles[blooper_battle_id].actors.push({socket : socket.id, name : socket.request.user.username});
            socket.emit('send_user_role', 'actor');
        } else if (choice === 'spectator') {
            blooper_battles[blooper_battle_id].spectators.push({socket : socket.id, name : socket.request.user.username});
            socket.emit('send_user_role', 'spectator');
        } else {
            // l'utilisateur a modifié le choix par un choix non valide
            const error = 'Votre rôle est invalide.';
            socket.emit('unauthorized', error);
        }
    })

    socket.on('actor_blooper', function(blooper){
        const actor_blooper = dompurify.sanitize(blooper);
        socket.emit('send_blooper_to_all', actor_blooper);
    })




    socket.on('send_private_message', async function(message){
        let connection = null;
        const receiver = dompurify.sanitize(message.receiver);
        const content = dompurify.sanitize(message.content);
        if (receiver === '' || content === ''){
            const data = {error : "Veuillez remplir tous les champs", correct : false};
            socket.emit('send_message_receipt', data);
        }
        try {
            connection = await pool.getConnection();
            const SQL_CHECK_USER = `SELECT u.id FROM utilisateur u WHERE u.username = ?`;
            const [RES_CHECK_USER] = await connection.query(SQL_CHECK_USER, [receiver]);

            if (RES_CHECK_USER.length !== 0){
                const SQL_NEW_MESSAGE = `INSERT INTO private_message (sender_id, receiver_id, content, datetime) VALUES(?, ?, ?, ?)`;
                const [RES_NEW_MESSAGE] = await connection.execute(SQL_NEW_MESSAGE, [socket.request.user.id, RES_CHECK_USER[0].id, content, new Date()]);
                const data = {success : "Votre message a été envoyé", correct : true};

                // On envoie une confirmation de message à celui qui l'envoie
                socket.emit('send_message_receipt', data);

                // On envoie le message au destinataire
                const other_data = {sender : socket.request.user.username, content : content};
                const receiverSockets = await redis_client.sMembers(`socket_${receiver}`);
                if (receiverSockets.length !== 0){
                    receiverSockets.forEach(socket => {
                        io.to(socket).emit('message', other_data);
                    })
                }

                /*const receiver_redis = await redis_client.get(receiver);
                console.log(`Le destinataire du message : ${receiver}`);
                console.log(`Le destinataire du message récupéré depuis Redis : ${receiver_redis}`);
                if (receiver_redis !== null){
                    io.to(receiver_redis).emit('message', other_data);
                }*/
            } else {
                const data = {error : "Le destinataire du message est invalide", correct : false};
                socket.emit('send_message_receipt', data);
            }
        } catch (error){
            console.log(error);
            const data = {error : "Une erreur est survenue. Le message n'a pas été envoyé.", correct : false};
            socket.emit('send_message_receipt', data);

        } finally{
            if (connection){
                connection.release();
            }
        }
    })


    // Nouveaux messages du forum
    socket.on("forum_new_message", async function(data){

        // Vérification du token
        // SEPARATION
        /*
        const headers = socket.handshake.headers;
        if (headers.cookie){
            const cookies = cookie.parse(headers.cookie);
            const token = cookies.ch;

            if (token){
                try {
                    const decoded = jwt.verify(token, secret);
                    if (decoded.random === socket.request.user.random){
                        console.log(`${socket.request.user.username} : identité confirmée`);
                    } else {
                        console.log("Vous ne pouvez effectuer cette action");
                    }
                } catch (error){
                    console.log(`Une erreur est survenue : ${error}`);
                }
            }

            // socket.emit("own_message")
            // socket.emit("other_member_message")
        }*/
        // SEPARATION
        

        let connection = null;
        const message = dompurify.sanitize(data.message);
        const random_id = dompurify.sanitize(data.question);
        const random = generate_random_string(20);
        const user = socket.request.user.id;

        try {
            if (!connection){
                connection = await pool.getConnection();
            }
            const SQL_GET_ID = `SELECT q.id FROM questions q WHERE q.random_id = ?`;
            const [RES_GET_ID] = await connection.query(SQL_GET_ID, [random_id]);
            const SQL_INSERT_MESSAGE = `INSERT INTO forum_messages (random_id, message, message_date, question_id, user_id) 
            VALUES(?, ?, ?, ?, ?)`;
            const [RES_INSERT_MESSAGE] = await connection.execute(SQL_INSERT_MESSAGE, [random, message, new Date(),
            RES_GET_ID[0].id, user]);
            const data = {correct : true, username : socket.request.user.username, message : message};
            io.emit("forum_insert_message", data);

        } catch (error){
            const data = {correct : false, error : `Le message n'a pas été sauvegardé car une erreur s'est produite : ${error}`};
            io.emit("forum_insert_message", data);

        } finally {
            if (connection){
                connection.release();
            }
        }
    })


    // réception et analyse des messages privés
    socket.on("check_private_message", async function(message){
        let errors = [];
        let res = {
            errors : errors,
            correct : false
        };
        let connection = null;
        const receiver = message.receiver;
        const text = message.text;

        try {
            connection = await create_connection();
            const SQL_CHECK_RECEIVER = "SELECT COUNT(*) AS nombre FROM utilisateur u WHERE u.username = ?";
            const [RES_CHECK_RECEIVER] = await connection.execute(SQL_CHECK_RECEIVER, [receiver]);

            if (RES_CHECK_RECEIVER[0].nombre === 1){
                if (text.trim() === ""){
                    errors.push("Le message est invalide");
                } else {
                    //io.to(receiver).emit("message", text);
                }

            } else if (RES_CHECK_RECEIVER[0].nombre === 0){
                errors.push(`Le nom d'utilisateur ${receiver} n'existe pas`);
            }

        } catch (error){
            errors.push("Une erreur est survenue");
        }

    })

    // quand un socket est déconnecté
    socket.on('disconnect', async function(){
        if (socket.request.user){
            await redis_client.sRem(`socket_${socket.request.user.username}`, socket.id);
            console.log(`Sockets de ${socket.request.user.username}`);
            console.log(await redis_client.sMembers(`socket_${socket.request.user.username}`));
        }
    })

})

// lancer le serveur
const PORT = 3000;
server.listen(PORT, function(){
    console.log(`Le serveur écoute sur le port ${PORT}`);
})



// fonctions
function validate_password(password){
    let reg_exp = new RegExp(/^(?=.*[A-Z])(?=.*\d)(?=.*[&()\[\]@/\*\-\+\}\{=\\_$£]).{10,50}$/);
    return reg_exp.test(password);
}

function confirm_password(password, confirm_password){
    return password === confirm_password;
}



// Se connecter à la base de données
async function create_connection(){
    return await mysql2.createConnection({
        host : "localhost",
        user : "root",
        password : "L33TSUPAH4X0R_WOLALA",
        database : "forum"
    });
}


// Générer une chaîne aléatoire pour les random_id
function generate_random_string(length){
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let random_string = '';

    for (let i = 0; i < length; i++){
        const random_index = crypto.randomInt(chars.length);
        random_string += chars.charAt(random_index);
    }

    return random_string;
}


// Mettre à jour directement le random_id des tables
async function update_random_id(SQL, id, end_id, size){
    let connection = null;
    try {
        connection = await create_connection();
        for (let i = id; i <= end_id; i++){
            const random = generate_random_string(size);
            const [RES_UPDATE_RANDOM_ID] = await connection.execute(SQL, [random, i]);
        }
    } catch (error){
        console.log(`Une erreur est survenue pendant la mise à jour des random ID : ${error}`);
    } finally {
        if (connection){
            await connection.end();
        }
    }
}






/**En France : timeZone : Europe/Paris, lang : fr-FR*/
function format_date(date, timeZone, lang){
    const options = {
        year : "numeric",
        month : "long",
        day : "numeric",
        weekday : "long",
        hour : "numeric",
        minute : "numeric",
        second : "numeric",
        timeZone : timeZone
    };

    const new_date = new Intl.DateTimeFormat(lang, options);
    return new_date.format(date);
}


// générer un id aléatoire
function generate_unique_random_string(number){
    const random_bytes = crypto.randomBytes(number).toString("hex");
    const timestamp = Date.now(); // horodatage en ms
    const unique_string = `${random_bytes}-${timestamp}`;
    return unique_string;
}



/*async function connect_redis_client(redis){
    return await redis.createClient()
    .on('error', function(error){
        console.log(`Une erreur est survenue dans Redis : ${error}`);
    })
    .connect();
}*/







// SIGNER UN TOKEN
/*
try {
    jwt.sign({random : req.user.random}, secret, {expiresIn : Date.now() + 3600000}, function(error, token){
        if (error){
            const data = {correct : false, error : `Une erreur est survenue`};
            return res.render("forum/forum_answer.ejs", {data : data});
        } else {
            const cookie_name = 'ch';
            const data = {
                messages : RES_GET_MESSAGES,
                correct : true,
                em : RES_GET_MESSAGES.length === 0,
                question_id : questionID,
                username : username,
                format_datetime : format_datetime
            };
            // création du cookie
            res.cookie(cookie_name, token, {
                secure : false,
                httpOnly : true,
                sameSite : 'strict',
                maxAge : 3600000
            });
            return res.render("forum/forum_answer.ejs", {data : data});
        }
    })
}
*/