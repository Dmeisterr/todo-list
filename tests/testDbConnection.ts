import { pool } from '../src/config/db';
import express from 'express';

const app = express();
const port = 3000;

app.get('/test-db', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM todo_items');
    res.send(rows);
  } catch (error) {
    if (error instanceof Error) {
    res.status(500).send('Database connection failed: ' + error.message);
} else {
    res.status(500).send('Database connection failed');
}

  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

