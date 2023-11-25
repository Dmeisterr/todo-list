import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import { Request, Response } from 'express';
import { connectDB } from './config/db';
import { Pool, OkPacket } from 'mysql2/promise';


const app = express();
app.use(bodyParser.json());

app.use(express.static(path.join('dist', 'public_html')));

const PORT = process.env.PORT || 3000;

let dbPool: Pool;

// Connect to MySQL database
connectDB()
	.then(pool => {
		dbPool = pool;
	})
	.catch(error => {
		console.error(`Database connection error: ${error}`);
	});


// creates new todo
// test with: "curl -X POST -H "Content-Type: application/json" -d '{"taskName": "testname1", "taskInfo": "testinfo", "isCompleted": false, "deadline": "2023-10-23"}' "http://localhost:3000/api/todo""
app.post('/api/lists/:listId/tasks', async (req: Request, res: Response) => {
	const { listId } = req.params;
	var { taskName, taskInfo, isCompleted, deadline } = req.body;

	// Data validation for listId and other fields
	if (!listId || isNaN(parseInt(listId))) {
		return res.status(400).json({ error: 'Invalid list ID' });
	}

	if (!taskName || typeof taskName !== 'string') {
		return res.status(400).json({ error: 'Invalid input' });
	}

	if (deadline == '') deadline = null;

	try {
		const [result] = await dbPool.query(
			'INSERT INTO sys.Tasks (listId, taskName, taskInfo, isCompleted, deadline) VALUES (?, ?, ?, ?, ?)',
			[listId, taskName, taskInfo, isCompleted, deadline]
		);
		const okPacket = result as OkPacket;
		return res.status(201).json({ message: 'To-Do item created', id: okPacket.insertId });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Database error' });
	}
});

// create a new list
app.post('/api/lists', async (req: Request, res: Response) => {
	const { listName } = req.body;

	// Data validation
	if (!listName || typeof listName !== 'string') {
		return res.status(400).json({ error: 'Invalid list name' });
	}

	try {
		// Insert the new list into the database
		const [result] = await dbPool.query('INSERT INTO sys.Lists (listName) VALUES (?)', [listName]);
		const okPacket = result as OkPacket;

		// Respond with the ID of the newly created list
		return res.status(201).json({ message: 'List created', id: okPacket.insertId });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Database error' });
	}
});

// updates existing todo
// test with: curl -X PUT -H "Content-Type: application/json" -d '{"taskName": "updatedName", "taskInfo": "updatedInfo", "isCompleted": true, "deadline": "2023-11-23"}' "http://localhost:3000/api/todo/${taskId}"
app.put('/api/todo/:taskId', async (req: Request, res: Response) => {
	const { taskId } = req.params;
	const { taskName, taskInfo, isCompleted, deadline } = req.body;

	// Create an array to hold SQL query parameters
	let queryParams = [];
	let query = 'UPDATE sys.Tasks SET ';

	// Add different parts of the query and parameters based on what is provided in the body
	if (taskName !== undefined) {
		query += 'taskName = ?, ';
		queryParams.push(taskName);
	}
	if (taskInfo !== undefined) {
		query += 'taskInfo = ?, ';
		queryParams.push(taskInfo);
	}
	if (isCompleted !== undefined) {
		query += 'isCompleted = ?, ';
		queryParams.push(isCompleted);
	}
	if (deadline !== undefined) {
		query += 'deadline = ?, ';
		queryParams.push(deadline);
	}

	// Remove trailing comma and space, and add WHERE clause
	query = query.slice(0, -2) + ' WHERE taskId = ?';
	queryParams.push(taskId);

	// Check if any field was provided for update
	if (queryParams.length === 1) {
		return res.status(400).json({ error: 'No fields provided for update' });
	}

	try {
		const [result] = await dbPool.query(query, queryParams);
		const okPacket = result as OkPacket;

		if (okPacket.affectedRows === 0) {
			return res.status(404).json({ error: 'Item not found' });
		}

		return res.status(200).json({ message: 'To-Do item updated', taskId });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Database error' });
	}
});


// Delete a specific todo item by taskId
// Test with: curl -X DELETE "http://localhost:3000/api/todo/${taskId}"
app.delete('/api/todo/:taskId', async (req: Request, res: Response) => {
	const { taskId } = req.params;

	try {
		const [result] = await dbPool.query('DELETE FROM sys.Tasks WHERE taskId = ?', [taskId]);
		const okPacket = result as OkPacket;

		if (okPacket.affectedRows === 0) {
			return res.status(404).json({ error: 'Item not found' });
		}

		return res.status(200).json({ message: 'To-Do item deleted', taskId });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Database error' });
	}
});

// Get tasks for a specific list
app.get('/api/lists/:listId/tasks', async (req: Request, res: Response) => {
	const { listId } = req.params;
	try {
		const [tasks] = await dbPool.query('SELECT * FROM sys.Tasks WHERE listId = ?', [listId]);
		res.json(tasks);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

// Get all lists
app.get('/api/lists', async (req: Request, res: Response) => {
    try {
        const [lists] = await dbPool.query('SELECT * FROM sys.Lists ORDER BY listOrder');
        res.json(lists);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Update the order of lists
app.put('/api/lists/order', async (req: Request, res: Response) => {
    const { orderedListIds } = req.body;

    try {
        await Promise.all(orderedListIds.map((listId: any, index: any) => 
            dbPool.query('UPDATE sys.Lists SET listOrder = ? WHERE listId = ?', [index, listId])
        ));
        res.status(200).json({ message: 'List order updated' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Delete a specific list by listId
app.delete('/api/lists/:listId', async (req, res) => {
    const { listId } = req.params;

    try {
        const [result] = await dbPool.query('DELETE FROM sys.Lists WHERE listId = ?', [listId]);
        const okPacket = result as OkPacket;

        if (okPacket.affectedRows === 0) {
            return res.status(404).json({ error: 'List not found' });
        }

        return res.status(200).json({ message: 'List deleted successfully', listId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
});

// Update a specific list by listId
app.put('/api/lists/:listId', async (req, res) => {
    const { listId } = req.params;
    const { listName } = req.body;

    if (!listName || typeof listName !== 'string') {
        return res.status(400).json({ error: 'Invalid list name' });
    }

    try {
        const [result] = await dbPool.query('UPDATE sys.Lists SET listName = ? WHERE listId = ?', [listName, listId]);
        const okPacket = result as OkPacket;

        if (okPacket.affectedRows === 0) {
            return res.status(404).json({ error: 'List not found' });
        }

        return res.status(200).json({ message: 'List updated successfully', listId });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
    }
});








app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
