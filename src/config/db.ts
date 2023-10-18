import * as mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();
type Connection = mysql.Connection;

export const connectDB = async (): Promise<Connection> => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log("Successfully connected to the database.");
    return connection;
  } catch (error) {
    console.error(`Error connecting to the database: ${error}`);
    process.exit(1);
  }
};


