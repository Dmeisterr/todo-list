import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import { Request, Response, NextFunction } from 'express';
import { connectDB } from './config/db';
import { Pool, OkPacket, RowDataPacket } from 'mysql2/promise';


const app = express();
app.use(cookieParser());
app.use(bodyParser.json());
app.get('/', (req: Request, res: Response) => {
	res.redirect('/index.html');
});

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

// ------------------ SESSIONS -----------------------------------------------------
interface Session {
	id: number;
	time: number;
}

let sessions: Record<string, Session> = {};


function addSession(username: string): number {
	const sid: number = Math.floor(Math.random() * 1000000000);
	const now: number = Date.now();
	sessions[username] = { id: sid, time: now };
	return sid;
}

function removeSessions(): void {
	const now: number = Date.now();
	const usernames: string[] = Object.keys(sessions);
	usernames.forEach((username) => {
		const last: number = sessions[username].time;
		if (last + 20000 < now) {
			delete sessions[username];
		}
	});
	console.log(sessions);
}

setInterval(removeSessions, 60000 * 10);

function authenticate(req: Request, res: Response, next: NextFunction): void {
	const c = req.cookies;
	console.log('auth request:');
	console.log(req.cookies);
	if (c && c.login) {
		if (sessions[c.login.username] && sessions[c.login.username].id === c.login.sessionID) {
			next();
		} else {
			res.redirect('/login.html');
		}
	} else {
		res.redirect('/login.html');
	}
}

// ------------------ USERS -----------------------------------------------------
// add a new user
app.post('/add/user', async (req: Request, res: Response) => {
	const { username, password } = req.body;

	if (!username || !password) {
		return res.status(400).json({ message: 'Username and password are required' });
	}

	try {
		const [rows] = await dbPool.execute<RowDataPacket[]>('SELECT * FROM Users WHERE username = ?', [username]);

		if (rows.length > 0) {
			return res.status(409).json({ message: 'USERNAME ALREADY TAKEN' });
		}

		const [result] = await dbPool.execute('INSERT INTO Users (username, password) VALUES (?, ?)', [username, password]);
		const insertId = (result as any).insertId;

		res.status(201).json({ message: 'USER CREATED', userId: insertId });
	} catch (error) {
		console.error('Database error:', error);
		res.status(500).json({ message: 'Internal server error' });
	}
});

// login
app.post('/account/login', async (req, res) => {
	const { username, password } = req.body;
	const query = 'SELECT * FROM Users WHERE username = ? AND password = ?';
	try {
		const [results] = await dbPool.execute(query, [username, password]);
		const rows = <RowDataPacket[]>results;
		if (rows.length === 0) {
			res.end('Could not find account');
		} else {
			let sid = addSession(username);
			let userId = rows[0].userId;
			res.cookie("login", { username: username, sessionID: sid, userId: userId }, { maxAge: 60000 * 10 });
			res.end('SUCCESS');
		}
	} catch (err) {
		console.error(err);
		res.end('Error in database query');
	}
});

// ------------------ LISTS -----------------------------------------------------
// create a new list
app.post('/api/lists', async (req: Request, res: Response) => {
	const { listName } = req.body;
	const { userId } = req.cookies.login; // Assuming the userId is stored in the "login" cookie
	console.log("userId: " + userId);

	// Data validation
	if (!listName || typeof listName !== 'string') {
		return res.status(400).json({ error: 'Invalid list name' });
	}

	try {
		// First, find the maximum listOrder value
		const [rows] = await dbPool.query('SELECT MAX(listOrder) as maxOrder FROM sys.Lists');
		const maxOrderResult = rows as RowDataPacket[];
		const maxOrder = maxOrderResult[0]?.maxOrder ?? 0; // Use nullish coalescing

		// Insert the new list with the next order value and userId
		const [result] = await dbPool.query('INSERT INTO sys.Lists (listName, listOrder, userId) VALUES (?, ?, ?)', [listName, maxOrder + 1, userId]);
		const okPacket = result as OkPacket;

		// Respond with the ID of the newly created list
		return res.status(201).json({ message: 'List created', id: okPacket.insertId });
	} catch (err) {
		console.error(err);
		return res.status(500).json({ error: 'Database error' });
	}
});

// Get all lists for the current user
app.get('/api/lists', async (req: Request, res: Response) => {
	try {
		const { userId } = req.cookies.login; // Assuming the userId is stored in the "login" cookie
		const [lists] = await dbPool.query('SELECT * FROM sys.Lists WHERE userId = ? ORDER BY listOrder', [userId]);
		res.json(lists);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

// Update the order of lists
app.put('/api/lists/order', async (req: Request, res: Response) => {
	const { orderedListIds } = req.body;
	const { userId } = req.cookies.login; // Assuming the userId is stored in the "login" cookie

	try {
		await Promise.all(orderedListIds.map((listId: any, index: any) =>
			dbPool.query('UPDATE sys.Lists SET listOrder = ? WHERE listId = ? AND userId = ?', [index, listId, userId])
		));
		res.status(200).json({ message: 'List order updated' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

// Delete a specific list by listId
app.delete('/api/lists/:listId', async (req: Request, res: Response) => {
	const { listId } = req.params;
	const { userId } = req.cookies.login; // Assuming the userId is stored in the "login" cookie

	try {
		// First, delete all tasks associated with this list
		await dbPool.query('DELETE FROM sys.Tasks WHERE listId = ?', listId);

		// Then, delete the list
		const [result] = await dbPool.query('DELETE FROM sys.Lists WHERE listId = ? AND userId = ?', [listId, userId]);
		const okPacket = result as OkPacket;

		if (okPacket.affectedRows === 0) {
			return res.status(404).json({ error: 'List not found' });
		}

		return res.status(200).json({ message: 'List and associated tasks deleted', listId });
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

// ------------------ TASKS -----------------------------------------------------
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

	// First, find the maximum taskOrder value
	const [rows] = await dbPool.query('SELECT MAX(taskOrder) as maxOrder FROM sys.Tasks WHERE listId = ?', [listId]);
	const maxOrderResult = rows as RowDataPacket[];
	const maxOrder = maxOrderResult[0]?.maxOrder ?? 0; // Use nullish coalescing

	try {
		const [result] = await dbPool.query(
			'INSERT INTO sys.Tasks (listId, taskName, taskInfo, isCompleted, deadline, taskOrder) VALUES (?, ?, ?, ?, ?, ?)',
			[listId, taskName, taskInfo, isCompleted, deadline, maxOrder + 1]
		);
		const okPacket = result as OkPacket;
		return res.status(201).json({ message: 'To-Do item created', id: okPacket.insertId });
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
		const [tasks] = await dbPool.query('SELECT * FROM sys.Tasks WHERE listId = ? ORDER BY taskOrder', [listId]);
		res.json(tasks);
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});

// Update the order of lists
app.put('/api/tasks/order', async (req: Request, res: Response) => {
	const { orderedTaskIds } = req.body;
	// const { userId } = req.cookies.login; 

	try {
		await Promise.all(orderedTaskIds.map((taskId: any, index: any) =>
			dbPool.query('UPDATE sys.Tasks SET taskOrder = ? WHERE taskId = ?', [index, taskId])
		));
		res.status(200).json({ message: 'Task order updated' });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Database error' });
	}
});


app.use('/index.html', authenticate);
app.use(express.static(path.join('dist', 'public_html')));
// app.use('*', (req, res, next) => {
// 	if (req.path === '/login.html') {
// 	  next();
// 	} else {
// 	  authenticate(req, res, next);
// 	}
//   });


app.listen(PORT, () => {
	console.log(`Server running on http://localhost:${PORT}`);
});
