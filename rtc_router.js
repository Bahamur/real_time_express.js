const express = require("express");
const mysql2 = require("mysql2/promise");
const validator = require("validator");
const bcrypt = require("bcrypt");
const router = express.Router();
const {validate_password, confirm_password, check_user_not_authenticated, render_username, check_user_authenticated, dompurify, upload} = require("./functions");
const pool = require("./connexion");

router.get('/', check_user_authenticated, async function(req, res){
    //req.app.io.sockets.to(req.sessionID).emit('P2P');
    return res.render('P2P/media.ejs');
})

module.exports = router;