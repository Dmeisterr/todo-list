"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const bodyParser = require("body-parser");
const db_1 = require("./config/db");
const app = express();
app.use(bodyParser.json()); // Add this line to use body-parser
const PORT = process.env.PORT || 3000;
let dbPool;
// Connect to MySQL database
(0, db_1.connectDB)()
    .then(pool => {
    dbPool = pool;
})
    .catch(error => {
    console.error(`Database connection error: ${error}`);
});
app.get('/', (req, res) => {
    res.send('Hello, world!');
});
// test with: "curl -X POST -H "Content-Type: application/json" -d '{"taskName": "testname1", "taskInfo": "testinfo", "isCompleted": false, "deadline": "10-22-2023"}' "http://localhost:3000/api/todo""
app.post('/api/todo', async (req, res) => {
    const { taskName, taskInfo, isCompleted, deadline } = req.body;
    // Data validation
    if (!taskName || typeof taskName !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const [result] = await dbPool.query('INSERT INTO Tasks (taskName, taskInfo, isCompleted, deadline) VALUES (?, ?, ?, ?)', [taskName, taskInfo, isCompleted, deadline]);
        const okPacket = result;
        return res.status(201).json({ message: 'To-Do item created', id: okPacket.insertId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
