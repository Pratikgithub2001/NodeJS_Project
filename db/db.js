import mysql from "mysql2";
import dotenv from "dotenv";
dotenv.config();

// Create connection pool instead of single connection
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the pool connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database");
    connection.release(); // Release the connection back to the pool
  }
});

// Export promise-based pool for easier async/await usage
export default pool.promise();