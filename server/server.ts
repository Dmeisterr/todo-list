import express, { Request, Response } from 'express';

// Initialize the Express application
const app = express();
const port = 3000;  // You can use any port number you like

// Define a "Hello World" route
app.get('/', (req: Request, res: Response) => {
  res.send('Hello World');
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});

