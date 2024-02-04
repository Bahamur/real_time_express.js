require("dotenv").config();
const mysql2 = require("mysql2/promise");

const pool = mysql2.createPool({
    host : 'localhost',
    user : process.env.first,
    password : process.env.second,
    database : process.env.third,
    waitForConnections : true,
    connectionLimit : 100
});

module.exports = pool;