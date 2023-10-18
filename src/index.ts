import * as express from 'express';
import { connectDB } from './config/db';

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to MySQL database
connectDB()
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


