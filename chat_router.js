const express = require("express");
const router = express.Router();
const {render_username, format_datetime, check_user_authenticated} = require("./functions");
const pool = require("./connexion");


router.get("/", check_user_authenticated, async function(req, res){
    const username = render_username(req, res);
    const data = {username : username};
    return res.render("chat/select_chat.ejs", {data : data});
})


router.post("/salon_public", check_user_authenticated, async function(req, res){
    let connection = null;
    const room = req.body.public_room_name;

    if (room === ""){
        return res.json({error : "Le nom du salon n'est pas valide", correct : false});
    }

    try {
        connection = await pool.getConnection();
        const SQL_CHECK_PUBLIC_ROOM = "SELECT COUNT(*) AS nombre FROM public_room r WHERE r.name = ?";
        const [RES_CHECK_PUBLIC_ROOM] = await connection.query(SQL_CHECK_PUBLIC_ROOM, [room]);

        if (RES_CHECK_PUBLIC_ROOM[0].nombre === 0){
            const SQL_CREATE_PUBLIC_ROOM = "INSERT INTO public_room (name, creator_id, creation_date, last_activity) VALUES(?, ?, ?, ?)";
            const [RES_CREATE_PUBLIC_ROOM] = await connection.execute(SQL_CREATE_PUBLIC_ROOM, [room, req.user.id, new Date(), new Date()]);

            return res.json({success : "Le salon a été créé avec succès", correct : true});

        } else {
            return res.json({error : `Le nom de salon ${room} n'est pas disponible`, correct : false});
        }

    } catch (error){
        return res.status(500).json({error : `Une erreur est survenue`, correct : false});

    } finally {
        if (connection){
            connection.release();
        }
    }
})



router.post("/salon_prive", check_user_authenticated, async function(req, res){
    let connection = null;
    let errors = [];
    const room = req.body.room_name;
    const code = req.body.room_code;
    const code_confirm = req.body.room_code_confirm;

    if (room === "" | code === "" | code_confirm === ""){
        errors.push("Tous les champs sont requis");
        return res.json({ error : errors, correct : false });
    }

    try {
        connection = await create_connection();
        const SQL_CHECK_PRIVATE_ROOM = "SELECT COUNT(*) AS nombre FROM private_room r WHERE r.name = ?";
        const [RES_CHECK_PRIVATE_ROOM] = await connection.execute(SQL_CHECK_PRIVATE_ROOM, [room]);

        if (RES_CHECK_PRIVATE_ROOM[0].nombre !== 0){
            errors.push(`Le nom de salon ${room} n'est pas disponible`);
        }

        if (!validate_password(code)){
            errors.push(`Le code doit contenir entre 10 et 100 caractères dont au moins une lettre majuscule, un chiffre et l'un des symboles suivants : & ( ) \ @ - _ + { } $ £ [ ] *`);
        }

        if (code !== code_confirm){
            errors.push("Les codes ne correspondent pas");
        }

        // on hache le code
        try {
            const hash_code = await bcrypt.hash(code, 10);

            if (errors.length === 0){
                const SQL_CREATE_PRIVATE_ROOM = "INSERT INTO private_room (name, code, creator_id, creation_date, last_activity) VALUES(?, ?, ?, ?, ?)";
                const [RES_CREATE_PRIVATE_ROOM] = await connection.execute(SQL_CREATE_PRIVATE_ROOM, [room, hash_code, req.user.id, new Date(), new Date()]);

                if (RES_CREATE_PRIVATE_ROOM.affectedRows !== 1){
                    errors.push("Une erreur est survenue lors de la création du salon privé");
                }
            }

        } catch (error){
            errors.push("Une erreur est survenue");
        }
    } catch (error){
        errors.push("Une erreur est survenue");
    } finally {
        connection.end();
        if (errors.length === 0){
            return res.json({ error : "Le salon privé a été créé", correct : true });
        } else {
            return res.json({ error : errors, correct : false });
        }
    }
})


module.exports = router;