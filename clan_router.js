const express = require("express");
const router = express.Router();
const {render_username, format_datetime, check_user_authenticated} = require("./functions");
const pool = require("./connexion");


router.get("/", check_user_authenticated, async function(req, res){
    const username = render_username(req, res);
    let connection = null;

    try {
        connection = await pool.getConnection();
        // Récupération des clans les plus récents + celui de l'utilisateur s'il en a créé un
        const SQL_GET_CLANS = `SELECT name, capacity, creation_date, username
        FROM (
        SELECT c.name, c.capacity, c.creation_date, u.username, 0 AS order_priority
        FROM clan c
        JOIN utilisateur u ON u.id = c.creator_id
        WHERE c.creator_id = ?
        UNION
        SELECT cc.name, cc.capacity, cc.creation_date, uu.username, 1 AS order_priority
        FROM clan cc
        JOIN utilisateur uu ON uu.id = cc.creator_id
        WHERE cc.creator_id != ?
        ) AS subquery
        ORDER BY order_priority, creation_date DESC
        LIMIT 100`;
        const [RES_GET_CLANS] = await connection.query(SQL_GET_CLANS, [req.user.id, req.user.id]);
        const data = {clans : RES_GET_CLANS, username : username, correct : true, format_datetime : format_datetime};
        return res.render("clan/clan.ejs", {data : data});

    } catch (error){
        const data = {error : "Une erreur est survenue lors de la récupération des données", username : username, correct : false};
        return res.status(500).render("clan/clan.ejs", {data : data});

    } finally {
        if (connection){
            connection.release();
        }
    }
})

router.post("/new_clan", check_user_authenticated, async function(req, res){
    let connection = null;
    const clan = req.body.clan;

    if (clan === ""){
        return res.json({error : "Le nom du clan n'est pas valide"});
    }

    try {
        connection = await pool.getConnection();
        const SQL_CHECK_CLAN = `SELECT COUNT(*) AS nombre FROM clan c WHERE c.name = ?`;
        const SQL_CHECK_USER_CLAN = `SELECT COUNT(*) AS nombre FROM clan c WHERE c.creator_id = ?`;
        const [[RES_CHECK_CLAN], [RES_CHECK_USER_CLAN]] = await Promise.all([
            connection.query(SQL_CHECK_CLAN, [clan]),
            connection.query(SQL_CHECK_USER_CLAN, [req.user.id])
        ]);

        if (RES_CHECK_USER_CLAN[0].nombre !== 0){
            return res.json({error : "Vous ne pouvez pas créer plus d'un clan par compte", correct : false});
        }

        if (RES_CHECK_CLAN[0].nombre === 0){
            // Ajout du clan dans la base
            const SQL_INSERT_CLAN = `INSERT INTO clan (name, creator_id) VALUES(?, ?)`;
            const [RES_INSERT_CLAN] = await connection.execute(SQL_INSERT_CLAN, [clan, req.user.id]);

            return res.json({success : "Le clan a été créé avec succès", correct : true});

        } else {
            return res.json({error : `Le nom de clan ${clan} n'est pas disponible`, correct : false});
        }

    } catch (error){
        return res.status(500).json({error : "Une erreur est survenue", correct : false});

    } finally {
        if (connection){
            connection.release();
        }
    }
})

module.exports = router;