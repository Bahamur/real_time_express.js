const express = require("express");
const mysql2 = require("mysql2/promise");
const validator = require("validator");
const bcrypt = require("bcrypt");
const router = express.Router();
const {validate_password, confirm_password, check_user_not_authenticated, render_username, check_user_authenticated, dompurify, upload} = require("./functions");
const pool = require("./connexion");


router.get("/", async function(req, res){

})



// Route pour uploader un fichier
router.post('/upload', upload.single('file'), async function(req, res){
    try {
        if (!req.file){
            return res.status(400).json({correct : false, error : "Aucun fichier sélectionné"});
        }
        return res.status(200).json({correct : true, success : "Le fichier a été ajouté avec succès"});

    } catch (error){
        if (error instanceof multer.MulterError){
            if (error.code === 'LIMIT_FILE_SIZE'){
                return res.status(400).json({correct : false, error : "La taille du fichier dépasse la taille autorisée"});
            } else if (error.code === 'LIMIT_UNEXPECTED_FILE'){
                return res.status(400).json({correct : false, error : "Le type de fichier n'est pas autorisé"});
            } else {
                return res.status(400).json({correct : false, error : "Une erreur est survenue. Impossible d'ajouter le fichier"});
            }
        } else {
            return res.status(500).json({correct : false, error : "Une erreur est survenue"});
        }
    }
})





router.get("/nouveau_compte", check_user_not_authenticated, async function(req, res){
    return res.render("user/register.ejs");
})

router.post("/creer_un_compte", check_user_not_authenticated, async function(req, res){
    const errors = [];
    let connection = null;
    try {
        connection = await pool.getConnection();
        const user = req.body.user;

        // Nom d'utilisateur
        if (user.username.includes(" ")){
            errors.push("Le nom d'utilisateur ne doit pas contenir d'espace");
        }
        if (user.username.length < 5 || user.username.length > 25){
            errors.push("Le nom d'utilisateur doit contenir entre 5 et 25 caractères");
        }

        // Adresse email
        if (!validator.isEmail(user.email)){
            errors.push(`L'adresse email ${user.email} est invalide`);
        }

        // Mot de passe
        if (!validate_password(user.password)){
            errors.push(`Le mot de passe doit contenir entre 10 et 50 caractères dont au moins une lettre majuscule, un chiffre et l'un des symboles suivants : & ( ) \ @ - _ + { } $ £ [ ] *`)
        }

        // Confirmation du mot de passe
        if (!confirm_password(user.password, user.confirm_password)){
            errors.push("Les mots de passe ne correspondent pas");
        }

        // Les informations sont valides, on passe aux requêtes
        try {
            const SQL_FIND_USER = `SELECT COUNT(*) AS nombre FROM utilisateur u WHERE u.username = ?`;
            const SQL_FIND_EMAIL = `SELECT COUNT(*) AS nombre FROM utilisateur u WHERE u.email = ?`;
            const [[RES_FIND_USER], [RES_FIND_EMAIL]] = await Promise.all([
                connection.query(SQL_FIND_USER, [user.username]),
                connection.query(SQL_FIND_EMAIL, [user.email])
            ]);

            if (RES_FIND_USER[0].nombre !== 0){
                errors.push(`Le nom d'utilisateur ${user.username} n'est pas disponible`);
            }
            if (RES_FIND_EMAIL[0].nombre !== 0){
                errors.push(`L'adresse email ${user.email} n'est pas disponible`);
            }


            if (errors.length !== 0){
                return res.json({correct : false, errors : errors});
            }

            // Toujours pas d'erreur, on ajoute le nouvel utilisateur dans la base
            try {
                const hash = await bcrypt.hash(user.password, 10);
                const SQL_INSERT_USER = `INSERT INTO utilisateur (username, password, email, creation_date, account_status) 
                VALUES(?, ?, ?, ?, ?)`;
                const [RES_INSERT_USER] = await connection.execute(SQL_INSERT_USER, [user.username, hash, user.email,
                new Date(), 'A']);
                
                return res.json({correct : true, url : '/user/login', message : 'Votre compte a été créé avec succès'});

            } catch(error){
                console.log(error);
                errors.push('Une erreur est survenue lors de la création du compte');
                return res.status(500).json({correct : false, errors : errors});
            }

        } catch(error){
            console.log(error);
            errors.push('Une erreur est survenue');
            return res.status(500).json({correct : false, errors : errors});
        }

    } catch(error){
        console.log(error);
        errors.push('Une erreur est survenue');
        return res.status(500).json({correct : false, errors : errors});

    } finally {
        if (connection){
            connection.release();
        }
    }
})


router.get("/modifier_profil", check_user_authenticated, async function(req, res){
    const username = render_username(req, res);
    const data = {username : username};
    return res.render("user/edit_profile.ejs", {data : data});
})


router.post("/nouveau_nom", check_user_authenticated, async function(req, res){
    let connection = null;
    const username = req.body.username;
    if (username === ""){
        return res.json({error : "Le nouveau nom d'utilisateur n'est pas valide.", correct : false});
    }

    if (username.includes(" ")){
        return res.json({error : "Le nouveau nom d'utilisateur ne doit pas contenir d'espace.", correct : false});
    }

    try {
        connection = await pool.getConnection();
        const SQL_CHECK_NEW_USERNAME = "SELECT COUNT(*) AS nombre FROM utilisateur u WHERE u.username = ?";
        const [RES_CHECK_NEW_USERNAME] = await connection.query(SQL_CHECK_NEW_USERNAME, [username]);

        if (RES_CHECK_NEW_USERNAME[0].nombre === 0){
            try {
                const SQL_CHANGE_USERNAME = "UPDATE utilisateur u SET u.username = ? WHERE u.id = ?";
                const [RES_CHANGE_USERNAME] = await connection.execute(SQL_CHANGE_USERNAME, [username, req.user.id]);
                // Pour plus de sécurité, on déconnecte l'utilisateur
                req.logOut(function(error){
                    if (error){
                        return res.json({success : "Le nom d'utilisateur a été mis à jour.", correct : true});
                    } else {
                        return res.json({success : "Le nom d'utilisateur a été mis à jour. Vous allez être déconnecté.", correct : true});
                    }
                })

            } catch (error){
                return res.status(500).json({error : "Une erreur s'est produite. Le nom d'utilisateur n'a pas été mis à jour.", correct : false}); 
            }
            
        } else {
            return res.json({error : `Le nom d'utilisateur ${username} n'est pas disponible.`, correct : false});
        }
    } catch (error){
        return res.status(500).json({error : "Une erreur s'est produite.", correct : false}); 

    } finally {
        if (connection){
            connection.release();
        }
    }
})


router.post("/mot_de_passe", check_user_authenticated, async function(req, res){
    let connection = null;
    const current_password = req.body.currentPassword;
    const new_password = req.body.newPassword;

    try {
        connection = await pool.getConnection();
        const SQL_CHECK_PASSWORD = "SELECT u.password FROM utilisateur u WHERE u.id = ?";
        const [RES_CHECK_PASSWORD] = await connection.query(SQL_CHECK_PASSWORD, [req.user.id]);

        // on vérifie le mot de passe haché
        try {
            if (await bcrypt.compare(current_password, RES_CHECK_PASSWORD[0].password)){
                // le mot de passe est confirmé, on peut vérifier le nouveau mot de passe
                if (new_password === ""){
                    return res.json({error : "Le nouveau mot de passe n'est pas valide", correct : false});
                }

                if (!validate_password(new_password)){
                    return res.json({error : `Le nouveau mot de passe doit contenir entre 10 et 50 caractères dont au moins une lettre majuscule, un chiffre et l'un des symboles suivants : & ( ) \ @ - _ + { } $ £ [ ] *`, correct : false});
                }

                // on hache le nouveau mot de passe
                try {
                    const hash_password = await bcrypt.hash(new_password, 10);
                    const SQL_CHANGE_PASSWORD = "UPDATE utilisateur u SET u.password = ? WHERE u.id = ?";
                    const [RES_CHANGE_PASSWORD] = await connection.execute(SQL_CHANGE_PASSWORD, [hash_password, req.user.id]);

                    // Pour des raisons de sécurité, on déconnecte l'utilisateur
                    req.logOut(function(error){
                        if (error){
                            return res.json({success : "Le mot de passe a été mis à jour.", correct : true});
                        } else {
                            return res.json({success : "Le mot de passe a été mis à jour. Vous allez être déconnecté.", correct : true});
                        }
                    })

                } catch (error){
                    return res.status(500).json({error : "Une erreur est survenue", correct : false});
                }

            } else {
                return res.json({error : "Le mot de passe est incorrect", correct : false});
            }

        } catch (error){
            return res.status(500).json({error : "Une erreur est survenue", correct : false});
        }
    } catch (error){
        return res.status(500).json({error : "Une erreur est survenue", correct : false});

    } finally {
        if (connection){
            connection.release();
        }
    }
})


router.post("/email", check_user_authenticated, async function(req, res){
    let connection = null;
    const email = req.body.email;

    if (!validator.isEmail(email)){
        return res.json({error : `L'adresse email ${email} est invalide`, correct : false});
    }

    // Adresse email valide
    try {
        connection = await pool.getConnection();

        // on vérifie si l'adresse email est disponible
        const SQL_AVAILABLE_EMAIL = "SELECT COUNT(*) AS nombre FROM utilisateur u WHERE u.email = ?";
        const [RES_AVAILABLE_EMAIL] = await connection.query(SQL_AVAILABLE_EMAIL, [email]);

        if (RES_AVAILABLE_EMAIL[0].nombre === 0){
            const SQL_UPDATE_EMAIL = "UPDATE utilisateur u SET u.email = ? WHERE u.id = ?";
            const [RES_UPDATE_EMAIL] = await connection.execute(SQL_UPDATE_EMAIL, [email, req.user.id]);

            // Pour des raisons de sécurité, on déconnecte l'utilisateur
            req.logOut(function(error){
                if (error){
                    return res.json({success : "L'adresse email a été mise à jour.", correct : true});
                } else {
                    return res.json({success : "L'adresse email a été mise à jour. Vous allez être déconnecté.", correct : true});
                }
            })

        } else {
            return res.json({error : `L'adresse email ${email} n'est pas disponible`, correct : false});
        }

    } catch (error){
        return res.status(500).json({error : "Une erreur est survenue", correct : false});
    } finally {
        if (connection){
            connection.release();
        }
    }
})


router.get("/message_prive", check_user_authenticated, async function(req, res){
    const username = render_username(req, res);
    const data = {username : username};
    return res.render("user/private_message", {data : data});
})

router.post('/about_receiver', check_user_authenticated, async function(req, res){
    let connection = null;
    const receiver = req.body.receiver;
    try {
        connection = await pool.getConnection();
        const SQL_GET_RECEIVERS = `SELECT u.username FROM utilisateur u WHERE UPPER(u.username) LIKE UPPER (?)`;
        const [RES_GET_RECEIVERS] = await connection.query(SQL_GET_RECEIVERS, [`%${receiver}%`]);
        return res.json({users : RES_GET_RECEIVERS, correct : true});

    } catch (error){
        return res.status(500).json({error : 'Une erreur est survenue', correct : false});
    } finally {
        if (connection){
            connection.release();
        }
    }
    /*
    if (req.xhr){
    } else {
        return res.status(403).render('forbidden/forbidden.ejs');
    }*/
})


// Afficher les conversations les plus récentes
router.get('/mes_messages', check_user_authenticated, async function(req, res){
    let connection = null;
    try {
        const username = render_username(req, res);
        connection = await pool.getConnection();
        const SQL_GET_MESSAGES = `SELECT u.username AS sender, MAX(pm.content) AS content, pm.datetime, pm.is_read
        FROM private_message pm
        JOIN utilisateur u ON u.id = pm.sender_id
        WHERE pm.receiver_id = ?
        GROUP BY pm.sender_id`;
        const [RES_GET_MESSAGES] = await connection.query(SQL_GET_MESSAGES, [req.user.id]);
        const messages = RES_GET_MESSAGES.length === 0 ? "Vous n'avez aucun message" : RES_GET_MESSAGES;
        const data = {username : username, messages : messages, correct : true};
        return res.render('user/get_messages.ejs', {data : data});

    } catch (error){
        const data = {error : "Une erreur est survenue", correct : false};
        return res.status(500).render('user/get_messages.ejs', {data : data});
    } finally {
        if (connection){
            connection.release();
        }
    }
})


// Afficher le détail des conversations
router.get("/mes_messages/:username", async function(req, res){
    let connection = null;
    const sender = req.params.username;
    const username = render_username(req, res);
    try {
        connection = await pool.getConnection();
        const SQL_GET_MESSAGES_FROM_USER = `SELECT pm.content, pm.datetime, pm.is_read
        FROM private_message pm
        WHERE pm.receiver_id = ?
        AND pm.sender_id = (SELECT u.id FROM utilisateur u WHERE u.username = ?)
        ORDER BY pm.datetime DESC`;
        const [RES_GET_MESSAGES_FROM_USER] = await connection.query(SQL_GET_MESSAGES_FROM_USER, [req.user.id, sender]);
        const data = {content : RES_GET_MESSAGES_FROM_USER, correct : true};
        return res.render('user/get_conversations.ejs', {data : data});

    } catch (error){
        const data = {error : "Une erreur est survenue", correct : false};
        return res.status(500).render('user/get_conversations.ejs', {data : data});

    } finally {
        if (connection){
            connection.release();
        }
    }
})


router.get("/about/:username", async function(req, res){
    let connection = null;
    const chosen_user = decodeURIComponent(req.params.username);
    const username = render_username(req, res);
    try {
        connection = await pool.getConnection();
        const SQL_GET_USER = `SELECT u.username, u.creation_date, u.normal_sub, u.prior_sub, u.page_views, u.quote, u.picture FROM utilisateur u 
        WHERE u.username = ?`;
        const [RES_GET_USER] = await connection.query(SQL_GET_USER, [chosen_user]);

        if (RES_GET_USER.length === 0){
            return res.render("not_found/not_found.ejs");
        } else {
            try {
                const SQL_UPDATE_PAGE_VIEWS = `UPDATE utilisateur u SET u.page_views = u.page_views + 1 WHERE u.username = ?`;
                const [RES_UPDATE_PAGE_VIEWS] = await connection.execute(SQL_UPDATE_PAGE_VIEWS, [chosen_user]);
                const about_user = {username : chosen_user, creation_date : RES_GET_USER[0].creation_date, 
                normal_sub : RES_GET_USER[0].normal_sub, prior_sub : RES_GET_USER[0].prior_sub, quote : RES_GET_USER[0].quote, 
                picture : RES_GET_USER[0].picture};
                const data = {correct : true, about_user : about_user, username : username};
                return res.render("user/user_page.ejs", {data : data});

            } catch (error){
                const data = {correct : false, error : `Une erreur est survenue lors de l'affichage de l'utilisateur ${chosen_user}`};
                return res.status(500).render("user/user_page.ejs", {data : data});
            }
        }

    } catch (error){
        const data = {correct : false, error : `Une erreur est survenue lors de l'affichage de l'utilisateur ${chosen_user}`};
        return res.status(500).render("user/user_page.ejs", {data : data});

    } finally {
        if (connection){
            connection.release();
        }
    }
})

router.post('/about/:username', check_user_authenticated, async function(req, res){
    let connection = null;

    try {
        const subscribe_to = dompurify.sanitize(req.params.username);
        connection = await pool.getConnection();
        // Vérifier si l'utilisateur auquel on veut s'abonner existe
        const SQL_CHECK_SUBSCRIBE_TO_EXISTS = `SELECT u.id FROM utilisateur u WHERE u.username = ?`;
        const [RES_CHECK_SUBSCRIBE_TO_EXISTS] = await connection.query(SQL_CHECK_SUBSCRIBE_TO_EXISTS, [subscribe_to]);

        if (RES_CHECK_SUBSCRIBE_TO_EXISTS.length === 0){
            return res.status(500).json({correct : false, error : `L'utilisateur n'existe pas`});
        }

        // Vérifier si l'abonnement existe déjà
        const SQL_CHECK_ALREADY_SUBSCRIBED = `SELECT ns.id FROM normal_subscribing ns WHERE ns.subscriber_id = ? AND 
        ns.subscribed_to_id = ?`;
        const [RES_CHECK_ALREADY_SUBSCRIBED] = await connection.query(SQL_CHECK_ALREADY_SUBSCRIBED, [req.user.id, RES_CHECK_SUBSCRIBE_TO_EXISTS[0].id]);

        if (RES_CHECK_ALREADY_SUBSCRIBED.length !== 0){
            return res.status(500).json({correct : false, error : "Vous êtes déjà abonné à cet utilisateur"});
        }

        // l'utilisateur s'abonne à un autre utilisateur
        await connection.beginTransaction();
        const SQL_NEW_SUBSCRIBE = `INSERT INTO normal_subscribing(subscriber_id , subscribed_to_id) VALUES(?, ?)`;
        const SQL_UPDATE_SUBSCRIBERS = `UPDATE utilisateur u SET u.normal_sub = u.normal_sub + 1 WHERE u.id = ?`;
        const [[RES_NEW_SUBSCRIBE], [RES_UPDATE_SUBSCRIBERS]] = await Promise.all([
            connection.execute(SQL_NEW_SUBSCRIBE, [req.user.id, RES_CHECK_SUBSCRIBE_TO_EXISTS[0].id]),
            connection.execute(SQL_UPDATE_SUBSCRIBERS, [RES_CHECK_SUBSCRIBE_TO_EXISTS[0].id])
        ]);

        if (RES_NEW_SUBSCRIBE.length !== 0 && RES_UPDATE_SUBSCRIBERS.length !== 0){
            await connection.commit();
            return res.json({correct : true, success : `Abonnement à ${subscribe_to} réussi`});
        } else {
            await connection.rollback();
            return res.status(500).json({correct : false, error : "Une erreur est survenue. Impossible de s'abonner."})
        }

    } catch (error){
        return res.status(500).json({correct : false, error : "Une erreur est survenue. Impossible de s'abonner"});
    }
})

// Page pour le calendrier personnel de l'utilisateur


module.exports = router;