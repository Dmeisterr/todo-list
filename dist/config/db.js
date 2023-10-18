"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        console.log("Successfully connected to the database.");
        return connection;
    }
    catch (error) {
        console.error(`Error connecting to the database: ${error}`);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
