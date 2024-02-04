const path = require("path");
const create_dompurify = require("dompurify");
const {JSDOM} = require("jsdom");
const window = new JSDOM('').window;
const dompurify = create_dompurify(window);
const crypto = require("crypto");
const node_cache = require("node-cache");
const cache = new node_cache();

const multer = require("multer");
// Définir le stockage avec multer
const storage = multer.diskStorage({
    destination : function(req, file, cbf){
        cbf(null, 'public/uploads/');
    },
    // Nouveau nom de fichier incluant la date actuelle
    filename : function(req, file, cbf){
        cbf(null, `${file.originalname.split('.')[0]}__${Date.now()}__.${file.originalname.split('.').pop()}`);
    }
});

// Définir les extensions autorisées
const file_filter = function(req, file, cbf){
    const allowed_extensions = [".jpg", ".jpeg", ".png", ".gif"];
    const file_extension = `.${file.originalname.split('.').pop()}`;

    if (allowed_extensions.includes(file_extension)){
        cbf(null, true);
    } else {
        cbf(null, false);
    }
}

const upload = multer({ storage : storage, fileFilter : file_filter, limits : { fileSize : 1024 * 1024 * 5 }});


// Retourner le nom de l'utilisateur s'il est connecté
function render_username(req, res){
    if (req.isAuthenticated()){
        return req.user.username;
    } else {
        return null;
    }
}

// Formatter la date et l'heure au format souhaité
function format_datetime(timezone, language){
    return new Intl.DateTimeFormat(language, {
        year : 'numeric',
        month : 'long',
        day : 'numeric',
        weekday : 'long',
        hour : 'numeric',
        minute : 'numeric',
        second : 'numeric',
        timeZone : timezone
    });
}


// Vérifier qu'un utilisateur est connecté
function check_user_authenticated(req, res, next){
    if (req.isAuthenticated()){
        return next();
    } else {
        res.redirect("/login");
    }
}

// Vérifier qu'un utilisateur n'est pas connecté
function check_user_not_authenticated(req, res, next){
    if (req.isAuthenticated()){
        return res.redirect("/");
    } else {
        next();
    }
}

// Vérifier le mot de passe
function validate_password(password){
    let reg_exp = new RegExp(/^(?=.*[A-Z])(?=.*\d)(?=.*[&()\[\]@/\*\-\+\}\{=\\_$£]).{10,50}$/);
    return reg_exp.test(password);
}

// Confirmer le mot de passe
function confirm_password(password, confirm_password){
    return password === confirm_password;
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



async function check_lambda_user_connected(username, redis_client){
    const get_user = await redis_client.get(username);
    if (get_user === null){
        return false;
    } else {
        return true;
    }
}


module.exports = {render_username, format_datetime, check_user_authenticated, check_user_not_authenticated, validate_password,
confirm_password, check_lambda_user_connected, generate_random_string, path, dompurify, upload, crypto, cache};