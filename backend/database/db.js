const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Automatically initialize database tables
const initDb = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(100),
        title TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      ALTER TABLE conversations ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS conversation_files (
        id SERIAL PRIMARY KEY,
        conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shared_chats (
        id VARCHAR(50) PRIMARY KEY,
        conversation_id VARCHAR(50) REFERENCES conversations(id) ON DELETE CASCADE,
        share_token VARCHAR(100) UNIQUE NOT NULL,
        title TEXT,
        payload JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_data (
        id SERIAL PRIMARY KEY,
        date DATE NOT NULL,
        region VARCHAR(50) NOT NULL,
        product VARCHAR(100) NOT NULL,
        revenue NUMERIC(12, 2) NOT NULL,
        units_sold INTEGER NOT NULL,
        cost NUMERIC(12, 2) DEFAULT 0
      );
    `);
    console.log("📁 Database tables initialized successfully.");
  } catch (err) {
    console.error("❌ Error initializing database tables:", err.message);
  }
};

initDb();

module.exports = pool;