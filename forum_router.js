const express = require("express");
const router = express.Router();
const {render_username, format_datetime, check_user_authenticated, check_user_not_authenticated, generate_random_string, dompurify, crypto, cache} = require("./functions");
const pool = require("./connexion");

// Page principale du forum
router.get("/", async function(req, res){
    let connection = null;
    const username = render_username(req, res);
    try {
        
        connection = await pool.getConnection();
        const SQL_GET_CATEGORIES = `SELECT c.random_id, c.name, c.discussions, q.title AS question_title,
        q.description AS question_description, q.last_update FROM category c
        LEFT JOIN ( SELECT q.category_id, q.title, q.description, q.last_update FROM questions q WHERE q.last_update = 
        ( SELECT MAX(last_update) FROM questions WHERE category_id = q.category_id )) q 
        ON c.id = q.category_id ORDER BY c.name`;
        const [RES_GET_CATEGORIES] = await connection.query(SQL_GET_CATEGORIES);
        const data = {correct : true, categories : RES_GET_CATEGORIES, username : username};

        return res.render("forum/forum.ejs", {data : data});

    } catch (error){
        const data = {correct : false, error : "Une erreur est survenue lors de la récupération des données", username : username};
        return res.render("forum/forum.ejs", {data : data});

    } finally {
        if (connection){
            connection.release();
        }
    }
})




// Poster une question sur le forum
router.get("/forum_post", check_user_authenticated, async function(req, res){
    let connection = null;
    const username = render_username(req, res);

    try {
        // on vérifie si des données sont dans le cache
        const cache_name = 'forum_categories';
        const donnees_cache = cache.get(cache_name);
        if (donnees_cache){
            const data = {username : username, correct : true, categories : donnees_cache};
            return res.render("forum/forum_post.ejs", {data : data});

        } else {
            connection = await pool.getConnection();
            const SQL_GET_CATEGORIES = `SELECT 
            c.id AS category_id, 
            c.name AS category_name, 
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'sub_category_id', sc.id,
                    'sub_category_name', sc.name,
                    'sub_category_description', sc.description
                )
            ) AS sub_categories
            FROM category c 
            JOIN sub_category sc ON sc.category_id = c.id 
            GROUP BY c.id, c.name
            ORDER BY c.id;
            `
            const [RES_GET_CATEGORIES] = await connection.query(SQL_GET_CATEGORIES);

            // le cache est vide donc on le remplit et on le conserve pendant 24 heures
            cache.set(cache_name, RES_GET_CATEGORIES, 86400);

            const data = {username : username, correct : true, categories : RES_GET_CATEGORIES};
            return res.render("forum/forum_post.ejs", {data : data});
        }

    } catch (error){
        const data = {correct : false, error : `Impossible de récupérer les catégories : ${error}`};
        return res.render("forum/forum_post.ejs", {data : data});
        
    } finally {
        if (connection){
            connection.release();
        }
    }
})



// Envoi des données au forum pour la création d'un topic
router.post("/forum_post", check_user_authenticated, async function(req, res){
    let connection = null;
    const title = dompurify.sanitize(req.body.title);
    const description = dompurify.sanitize(req.body.description);
    const category = dompurify.sanitize(req.body.category);
    const sub_category = dompurify.sanitize(req.body.sub_category);
    const random = generate_random_string(20);

    if (title === "" || description === "" || category === "" || sub_category === ""){
        return res.json({error : `Veuillez remplir tous les champs puis sélectionner une catégorie`});
    }

    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        const SQL_INSERT_QUESTION = `INSERT INTO questions (random_id, title, description, creation_date, last_update, 
            user_id, category_id, sub_category_id) VALUES (?, ? , ?, ?, ?, ?, (SELECT c.id FROM category c WHERE 
            c.name = ?), (SELECT sc.id FROM sub_category sc WHERE sc.name = ?))`;
        const SQL_UPDATE_CAT_DISCUSSION = `UPDATE category c SET c.discussions = c.discussions + 1 WHERE c.name = ?`;
        const SQL_UPDATE_SUB_CAT_DISCUSSION = `UPDATE sub_category sc SET sc.discussions = sc.discussions + 1 
        WHERE sc.name = ?`;

        const [[RES_INSERT_QUESTION], [RES_UPDATE_CAT_DISCUSSION], [RES_UPDATE_SUB_CAT_DISCUSSION]] = await Promise.all([
            connection.execute(SQL_INSERT_QUESTION, [random, title, description, new Date(), new Date(), req.user.id, 
            category, sub_category]),
            connection.execute(SQL_UPDATE_CAT_DISCUSSION, [category]),
            connection.execute(SQL_UPDATE_SUB_CAT_DISCUSSION, [sub_category])
        ]);

        if (RES_INSERT_QUESTION && RES_UPDATE_CAT_DISCUSSION && RES_UPDATE_SUB_CAT_DISCUSSION){
            await connection.commit();
            return res.json({correct : true, success : `La question a été ajoutée au forum`});
        } else {
            await connection.rollback();
            return res.json({correct : false, error : `Une erreur s'est produite lors des mises à jour`});
        }

    } catch (error){
        await connection.rollback();
        return res.json({correct : false, error : `Impossible d'ajouter la question au forum car une erreur s'est produite : ${error}`});

    } finally {
        if (connection){
            connection.release();
        }
    }
})


// Récupérer la catégorie sélectionnée
router.get('/:categoryName', async function(req, res){
    let connection = null;
    const url = dompurify.sanitize(`/forum${decodeURIComponent(req.url)}`);
    const categoryName = dompurify.sanitize(decodeURIComponent(req.params.categoryName).replace(/_/g, ' '));
    const username = render_username(req, res);

    try {
        connection = await pool.getConnection();
        const SQL_CHECK_CATEGORY_NAME = "SELECT COUNT(*) AS nombre FROM category c WHERE c.name = ?";
        const [RES_CHECK_CATEGORY_NAME] = await connection.query(SQL_CHECK_CATEGORY_NAME, [categoryName]);

        if (RES_CHECK_CATEGORY_NAME[0].nombre === 0){
            return res.render("not_found/not_found.ejs");
        }

        const SQL_GET_SUB_CATEGORIES_QUESTIONS = `SELECT sc.random_id AS sub_cat_id, sc.name, sc.description, sc.discussions,
        q.random_id AS question_id, q.title, q.description, q.last_update, u.username FROM sub_category sc 
        LEFT JOIN ( SELECT random_id, title, description, last_update, sub_category_id, user_id 
        FROM ( SELECT random_id, title, description, last_update, sub_category_id, user_id, 
        ROW_NUMBER() OVER (PARTITION BY sub_category_id ORDER BY last_update DESC) AS num 
        FROM questions ) ranked_questions WHERE num <= 10 ) q ON q.sub_category_id = sc.id 
        LEFT JOIN utilisateur u ON u.id = q.user_id WHERE sc.category_id = 
        (SELECT c.id FROM category c WHERE c.name = ?) ORDER BY sc.name, q.last_update DESC`;
        const [RES_GET_SUB_CATEGORIES_QUESTIONS] = await connection.query(SQL_GET_SUB_CATEGORIES_QUESTIONS, [categoryName]);
        const data = {
            correct : true,
            sub_cat : RES_GET_SUB_CATEGORIES_QUESTIONS,
            url : url,
            username : username
        };

        return res.render("forum/forum_sub_categories.ejs", {data : data});

    } catch (error){
        const data = {correct : false, error : "Impossible d'afficher les données car une erreur s'est produite", 
        username : username};
        return res.render("forum/forum_sub_categories.ejs", {data : data});

    } finally {
        if (connection){
            connection.release();
        }
    }
})


// Récupérer la sous-catégorie sélectionnée
router.get('/:categoryName/:subCategoryName', async function(req, res){
    let connection = null;
    const categoryName = dompurify.sanitize(decodeURIComponent(req.params.categoryName).replace(/_/g, ' '));
    const subCategoryName = dompurify.sanitize(decodeURIComponent(req.params.subCategoryName).replace(/_/g, ' '));
    const username = render_username(req, res);

    try {
        connection = await pool.getConnection();
        const SQL_CHECK_CAT_NAME = "SELECT COUNT(*) AS nombre FROM category c WHERE c.name = ?";
        const SQL_CHECK_SUB_CAT_NAME = "SELECT COUNT(*) AS nombre FROM sub_category sc WHERE sc.name = ?";

        const [[RES_CHECK_CAT_NAME], [RES_CHECK_SUB_CAT_NAME]] = await Promise.all([
            connection.query(SQL_CHECK_CAT_NAME, [categoryName]),
            connection.query(SQL_CHECK_SUB_CAT_NAME, [subCategoryName])
        ]);

        if (RES_CHECK_CAT_NAME[0].nombre === 0 || RES_CHECK_SUB_CAT_NAME[0].nombre === 0){
            return res.render("not_found/not_found.ejs");
        }

        const SQL_GET_SUB_CATEGORY_QUESTIONS = `SELECT q.random_id, q.title, q.description, q.creation_date, 
        q.last_update, m.message, m.message_date, ut.username AS question_username, u.username AS message_username
        FROM questions q
        LEFT JOIN utilisateur ut ON ut.id = q.user_id
        LEFT JOIN (SELECT message, message_date, question_id, user_id
                   FROM ( SELECT message, message_date, question_id, user_id, 
                         ROW_NUMBER() OVER (PARTITION BY question_id ORDER BY message_date DESC) AS num
                         FROM forum_messages ) ranked_messages WHERE num <= 1) m ON m.question_id = q.id
                         LEFT JOIN utilisateur u ON u.id = m.user_id 
                         WHERE q.sub_category_id = (SELECT sc.id FROM sub_category sc WHERE sc.name = ?) 
                         ORDER BY q.last_update DESC LIMIT 50`;
        const [RES_GET_SUB_CATEGORY_QUESTIONS] = await connection.query(SQL_GET_SUB_CATEGORY_QUESTIONS, [subCategoryName]);
        const data = {
            questions : RES_GET_SUB_CATEGORY_QUESTIONS,
            correct : true,
            eq : RES_GET_SUB_CATEGORY_QUESTIONS.length === 0,
            sub : subCategoryName,
            username : username
        };
        return res.render("forum/forum_sub_category.ejs", {data : data});

    } catch (error){
        const data = {correct : false, error : 'Une erreur est survenue', username : username};
        return res.render("forum/forum_sub_category.ejs", {data : data});

    } finally {
        if (connection){
            connection.release();
        }
    }
})


router.get('/:categoryName/:subCategoryName/:questionID', async function(req, res){
    let connection = null;
    const categoryName = decodeURIComponent(req.params.categoryName).replace(/_/g, ' ');
    const subCategoryName = decodeURIComponent(req.params.subCategoryName).replace(/_/g, ' ');
    const questionID = decodeURIComponent(req.params.questionID);
    const username = render_username(req, res);

    const SQL_CHECK_CATEGORY_NAME = `SELECT COUNT(*) AS nombre FROM category c WHERE c.name = ?`;
    const SQL_CHECK_SUB_CAT_NAME = `SELECT COUNT(*) AS nombre FROM sub_category sc WHERE sc.name = ?`;
    const SQL_CHECK_QUESTION_ID = `SELECT COUNT(*) AS nombre FROM questions q WHERE q.random_id = ?`;

    try {
        connection = await pool.getConnection();
        const [[RES_CHECK_CATEGORY_NAME], [RES_CHECK_SUB_CAT_NAME], [RES_CHECK_QUESTION_ID]] = await Promise.all([
            connection.query(SQL_CHECK_CATEGORY_NAME, [categoryName]),
            connection.query(SQL_CHECK_SUB_CAT_NAME, [subCategoryName]),
            connection.query(SQL_CHECK_QUESTION_ID, [questionID])
        ]);

        if (RES_CHECK_CATEGORY_NAME[0].nombre === 0 || RES_CHECK_SUB_CAT_NAME[0].nombre === 0 || RES_CHECK_QUESTION_ID[0].nombre === 0){
            return res.render("not_found/not_found.ejs");
        }

        const SQL_GET_MESSAGES = `SELECT q.random_id AS question_id, q.title AS question_title, 
        q.description AS question_description, q.creation_date, q.last_update, 
        m.random_id, m.random_id, m.message, m.message_date, u.username, u.picture FROM questions q 
        LEFT JOIN forum_messages m ON m.question_id = q.id LEFT JOIN utilisateur u ON u.id = m.user_id
        WHERE q.random_id = ? ORDER BY m.message_date LIMIT 50`;
        const [RES_GET_MESSAGES] = await connection.query(SQL_GET_MESSAGES, [questionID]);

        const data = {
            messages : RES_GET_MESSAGES,
            correct : true,
            em : RES_GET_MESSAGES.length === 0,
            question_id : questionID,
            username : username,
            format_datetime : format_datetime
        };

        return res.render("forum/forum_answer.ejs", {data : data});

    } catch (error){
        console.log(error);
        const data = {correct : false, error : "Une erreur est survenue", username : username};
        return res.render("forum/forum_answer.ejs", {data : data});

    } finally {
        if (connection){
            connection.release();
        }
    }
})



module.exports = router;