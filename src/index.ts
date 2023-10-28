import * as express from 'express';
import * as bodyParser from 'body-parser';
import { Request, Response } from 'express';
import { connectDB } from './config/db';
import { Pool, OkPacket } from 'mysql2/promise';


const app = express();
app.use(bodyParser.json()); 

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

app.get('/', (req: Request, res: Response) => {
  res.send('Hello, world!');
});

// creates new todo
// test with: "curl -X POST -H "Content-Type: application/json" -d '{"taskName": "testname1", "taskInfo": "testinfo", "isCompleted": false, "deadline": "2023-10-23"}' "http://localhost:3000/api/todo""
app.post('/api/todo', async (req: Request, res: Response) => {
  const { taskName, taskInfo, isCompleted, deadline } = req.body;

  // Data validation
  if (!taskName || typeof taskName !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const [result] = await dbPool.query('INSERT INTO Tasks (taskName, taskInfo, isCompleted, deadline) VALUES (?, ?, ?, ?)', [taskName, taskInfo, isCompleted, deadline]);
    const okPacket = result as OkPacket; 
    return res.status(201).json({ message: 'To-Do item created', id: okPacket.insertId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }  
});

// updates existing todo
// test with: curl -X PUT -H "Content-Type: application/json" -d '{"taskName": "updatedName", "taskInfo": "updatedInfo", "isCompleted": true, "deadline": "2023-11-23"}' "http://localhost:3000/api/todo/${TaskID}"
app.put('/api/todo/:TaskID', async (req: Request, res: Response) => {
  const { TaskID } = req.params;
  const { taskName, taskInfo, isCompleted, deadline } = req.body;

  // Data validation
  if (!taskName || typeof taskName !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  try {
    const [result] = await dbPool.query(
      'UPDATE Tasks SET taskName = ?, taskInfo = ?, isCompleted = ?, deadline = ? WHERE TaskID = ?',
      [taskName, taskInfo, isCompleted, deadline, TaskID]
    );
    const okPacket = result as OkPacket;

    if (okPacket.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.status(200).json({ message: 'To-Do item updated', TaskID });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// Delete a specific todo item by TaskID
// Test with: curl -X DELETE "http://localhost:3000/api/todo/${TaskID}"
app.delete('/api/todo/:TaskID', async (req: Request, res: Response) => {
  const { TaskID } = req.params;

  try {
    const [result] = await dbPool.query('DELETE FROM Tasks WHERE TaskID = ?', [TaskID]);
    const okPacket = result as OkPacket;

    if (okPacket.affectedRows === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    return res.status(200).json({ message: 'To-Do item deleted', TaskID });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});

// TODO: remove this
// get all items (for testing purposes)
app.get('/api/todo', async (req: Request, res: Response) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM Tasks');
    return res.status(200).json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error' });
  }
});




app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
