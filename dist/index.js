"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const db_1 = require("./config/db");
const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join('dist', 'server', 'public_html')));
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
// creates new todo
// test with: "curl -X POST -H "Content-Type: application/json" -d '{"taskName": "testname1", "taskInfo": "testinfo", "isCompleted": false, "deadline": "2023-10-23"}' "http://localhost:3000/api/todo""
app.post('/api/todo', async (req, res) => {
    const { taskName, taskInfo, isCompleted, deadline } = req.body;
    // Data validation
    if (!taskName || typeof taskName !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const [result] = await dbPool.query('INSERT INTO sys.Tasks (taskName, taskInfo, isCompleted, deadline) VALUES (?, ?, ?, ?)', [taskName, taskInfo, isCompleted, deadline]);
        const okPacket = result;
        return res.status(201).json({ message: 'To-Do item created', id: okPacket.insertId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
});
// Endpoint to create a new list
app.post('/api/lists', async (req, res) => {
    const { listName } = req.body; // Assuming that the list's name will be sent in the request body
    // Data validation
    if (!listName || typeof listName !== 'string') {
        return res.status(400).json({ error: 'Invalid list name' });
    }
    try {
        // Insert the new list into the database
        const [result] = await dbPool.query('INSERT INTO sys.Lists (listName) VALUES (?)', [listName]);
        const okPacket = result;
        // Respond with the ID of the newly created list
        return res.status(201).json({ message: 'List created', id: okPacket.insertId });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
});
// updates existing todo
// test with: curl -X PUT -H "Content-Type: application/json" -d '{"taskName": "updatedName", "taskInfo": "updatedInfo", "isCompleted": true, "deadline": "2023-11-23"}' "http://localhost:3000/api/todo/${TaskID}"
app.put('/api/todo/:TaskID', async (req, res) => {
    const { TaskID } = req.params;
    const { taskName, taskInfo, isCompleted, deadline } = req.body;
    // Data validation
    if (!taskName || typeof taskName !== 'string') {
        return res.status(400).json({ error: 'Invalid input' });
    }
    try {
        const [result] = await dbPool.query('UPDATE sys.Tasks SET taskName = ?, taskInfo = ?, isCompleted = ?, deadline = ? WHERE TaskID = ?', [taskName, taskInfo, isCompleted, deadline, TaskID]);
        const okPacket = result;
        if (okPacket.affectedRows === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        return res.status(200).json({ message: 'To-Do item updated', TaskID });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
});
// Delete a specific todo item by TaskID
// Test with: curl -X DELETE "http://localhost:3000/api/todo/${TaskID}"
app.delete('/api/todo/:TaskID', async (req, res) => {
    const { TaskID } = req.params;
    try {
        const [result] = await dbPool.query('DELETE FROM sys.Tasks WHERE TaskID = ?', [TaskID]);
        const okPacket = result;
        if (okPacket.affectedRows === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        return res.status(200).json({ message: 'To-Do item deleted', TaskID });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
});
// Get tasks for a specific list
app.get('/api/lists/:listId/tasks', async (req, res) => {
    const { listId } = req.params;
    try {
        const [tasks] = await dbPool.query('SELECT * FROM sys.Tasks WHERE listId = ?', [listId]);
        res.json(tasks);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});
// Get all lists
app.get('/api/lists', async (req, res) => {
    try {
        const [lists] = await dbPool.query('SELECT * FROM sys.Lists'); // Replace 'Lists' with your actual table name
        res.json(lists);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
