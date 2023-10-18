"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const db_1 = require("./config/db");
const app = express();
const PORT = process.env.PORT || 3000;
// Connect to MySQL database
(0, db_1.connectDB)()
    .then(connection => {
    // Do something with the connection (like creating tables, etc.)
})
    .catch(error => {
    console.error(`Database connection error: ${error}`);
});
app.get('/', (req, res) => {
    res.send('Hello, world!');
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
